-- Trama beta: webhook síncrono e captura de entrada. Aplicar após trama.sql.
create table if not exists public.automation_webhooks (
  flow_id uuid primary key,
  user_id uuid not null references public.automation_workspaces(user_id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default false,
  window_start timestamptz not null default now(),
  call_count integer not null default 0 check(call_count >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists automation_webhooks_user_idx on public.automation_webhooks(user_id);
alter table public.automation_webhooks enable row level security;
revoke all on public.automation_webhooks from public,anon,authenticated,service_role;

-- Verifica a autorização canônica do proprietário sem depender do JWT do remetente externo.
-- Apenas helpers privados chamam esta função; o contexto original é sempre restaurado.
create or replace function trama_private.hook_owner_allowed(p_owner uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_sub text := current_setting('request.jwt.claim.sub',true);
  v_claims text := current_setting('request.jwt.claims',true); v_ok boolean;
begin
  if not exists(select 1 from auth.users u where u.id=p_owner and coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false)=false) then return false; end if;
  perform set_config('request.jwt.claim.sub',p_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p_owner,'is_anonymous',false,'role','authenticated')::text,true);
  v_ok := public.has_tool('automation');
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return v_ok;
exception when others then
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  raise;
end $$;
revoke all on function trama_private.hook_owner_allowed(uuid) from public,anon,authenticated,service_role;

create or replace function trama_private.sync_hook(p_flow_id uuid,p_token_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=trama_private.lock_owner(); v_flow jsonb; v_version jsonb; v_enabled boolean;
begin
  select d->'data' into v_flow from public.automation_workspaces w,
    lateral jsonb_array_elements(w.state->'documents') d
    where w.user_id=v_uid and d->>'collection'='flows' and d->>'id'=p_flow_id::text;
  if v_flow is null then raise exception 'Fluxo não encontrado.' using errcode='P0404'; end if;
  if p_token_hash is distinct from encode(sha256(convert_to(v_flow->>'webhook_token','UTF8')),'hex') then
    raise exception 'Token inválido.' using errcode='22023';
  end if;
  select v into v_version from jsonb_array_elements(coalesce(v_flow->'versions','[]')) v where v->>'id'=v_flow->>'published_version_id';
  v_enabled:=coalesce((v_flow->>'active')::boolean,false) and v_version is not null
    and exists(select 1 from jsonb_array_elements(coalesce(v_version->'snapshot'->'steps',v_version->'steps','[]')) s where s->>'app'='webhook');
  insert into public.automation_webhooks(flow_id,user_id,token_hash,enabled) values(p_flow_id,v_uid,p_token_hash,v_enabled)
    on conflict(flow_id) do update set token_hash=excluded.token_hash,enabled=excluded.enabled,updated_at=clock_timestamp()
    where automation_webhooks.user_id=v_uid;
  if not found then raise exception 'Fluxo indisponível.' using errcode='42501'; end if;
  return v_enabled;
end $$;
revoke all on function trama_private.sync_hook(uuid,text) from public,anon,authenticated,service_role;
grant execute on function trama_private.sync_hook(uuid,text) to authenticated;
create or replace function public.sync_trama_webhook(p_flow_id uuid,p_token_hash text) returns boolean
language sql security invoker set search_path='' as $$ select trama_private.sync_hook(p_flow_id,p_token_hash); $$;
revoke all on function public.sync_trama_webhook(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.sync_trama_webhook(uuid,text) to authenticated;

create or replace function trama_private.begin_hook(p_flow_id uuid,p_token_hash text,p_test boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_hook public.automation_webhooks; v_lease jsonb; v_flow jsonb; v_version jsonb;
  v_sub text:=current_setting('request.jwt.claim.sub',true); v_claims text:=current_setting('request.jwt.claims',true);
begin
  select * into v_hook from public.automation_webhooks where flow_id=p_flow_id and token_hash=p_token_hash;
  if not found or not trama_private.hook_owner_allowed(v_hook.user_id) then raise exception 'Webhook não encontrado.' using errcode='P0404'; end if;
  perform set_config('request.jwt.claim.sub',v_hook.user_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_hook.user_id,'is_anonymous',false,'role','authenticated')::text,true);
  v_lease:=trama_private.acquire_workspace();
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  select * into v_hook from public.automation_webhooks where flow_id=p_flow_id and token_hash=p_token_hash for update;
  if not found then raise exception 'Webhook não encontrado.' using errcode='P0404'; end if;
  select d->'data' into v_flow from jsonb_array_elements(v_lease->'state'->'documents') d
    where d->>'collection'='flows' and d->>'id'=p_flow_id::text;
  if v_flow is null or p_token_hash is distinct from encode(sha256(convert_to(v_flow->>'webhook_token','UTF8')),'hex') then
    raise exception 'Webhook não encontrado.' using errcode='P0404';
  end if;
  select v into v_version from jsonb_array_elements(coalesce(v_flow->'versions','[]')) v where v->>'id'=v_flow->>'published_version_id';
  if not coalesce(p_test,false) and (not v_hook.enabled or not coalesce((v_flow->>'active')::boolean,false)
    or v_version is null or not exists(select 1 from jsonb_array_elements(coalesce(v_version->'snapshot'->'steps',v_version->'steps','[]')) s where s->>'app'='webhook')) then
    raise exception 'Salve uma versão e ative o fluxo para receber chamadas.' using errcode='P0409';
  end if;
  if v_hook.window_start<=clock_timestamp()-interval '1 minute' then
    update public.automation_webhooks set window_start=clock_timestamp(),call_count=1 where flow_id=p_flow_id;
  elsif v_hook.call_count>=60 then raise exception 'Limite de chamadas atingido.' using errcode='P0429';
  else update public.automation_webhooks set call_count=call_count+1 where flow_id=p_flow_id;
  end if;
  return v_lease||jsonb_build_object('user_id',v_hook.user_id,'flow_id',p_flow_id);
exception when others then
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  raise;
end $$;

create or replace function trama_private.commit_hook(p_flow_id uuid,p_token_hash text,p_revision integer,p_lease_token uuid,p_state jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_revision integer;
  v_sub text:=current_setting('request.jwt.claim.sub',true); v_claims text:=current_setting('request.jwt.claims',true);
begin
  select user_id into v_owner from public.automation_webhooks where flow_id=p_flow_id and token_hash=p_token_hash;
  if v_owner is null or not trama_private.hook_owner_allowed(v_owner) then raise exception 'Webhook não encontrado.' using errcode='P0404'; end if;
  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'is_anonymous',false,'role','authenticated')::text,true);
  v_revision:=trama_private.commit_workspace(p_revision,p_lease_token,p_state);
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  return v_revision;
exception when others then
  perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
  perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
  raise;
end $$;

create or replace function trama_private.release_hook(p_flow_id uuid,p_lease_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update public.automation_workspaces w set lease_token=null,lease_expires_at=null
    from public.automation_webhooks h where h.flow_id=p_flow_id and w.user_id=h.user_id and w.lease_token=p_lease_token;
  return found;
end $$;

revoke all on function trama_private.begin_hook(uuid,text,boolean),trama_private.commit_hook(uuid,text,integer,uuid,jsonb),trama_private.release_hook(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function trama_private.begin_hook(uuid,text,boolean),trama_private.commit_hook(uuid,text,integer,uuid,jsonb),trama_private.release_hook(uuid,uuid) to service_role;
create or replace function public.begin_trama_webhook(p_flow_id uuid,p_token_hash text,p_test boolean default false) returns jsonb
language sql security invoker set search_path='' as $$ select trama_private.begin_hook(p_flow_id,p_token_hash,p_test); $$;
create or replace function public.commit_trama_webhook(p_flow_id uuid,p_token_hash text,p_revision integer,p_lease_token uuid,p_state jsonb) returns integer
language sql security invoker set search_path='' as $$ select trama_private.commit_hook(p_flow_id,p_token_hash,p_revision,p_lease_token,p_state); $$;
create or replace function public.release_trama_webhook(p_flow_id uuid,p_lease_token uuid) returns boolean
language sql security invoker set search_path='' as $$ select trama_private.release_hook(p_flow_id,p_lease_token); $$;
revoke all on function public.begin_trama_webhook(uuid,text,boolean),public.commit_trama_webhook(uuid,text,integer,uuid,jsonb),public.release_trama_webhook(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.begin_trama_webhook(uuid,text,boolean),public.commit_trama_webhook(uuid,text,integer,uuid,jsonb),public.release_trama_webhook(uuid,uuid) to service_role;

create or replace function trama_private.clean_hooks() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from public.automation_webhooks h where h.user_id=new.user_id and not exists(
    select 1 from jsonb_array_elements(new.state->'documents') d where d->>'collection'='flows' and d->>'id'=h.flow_id::text
  );
  return new;
end $$;
revoke all on function trama_private.clean_hooks() from public,anon,authenticated,service_role;
drop trigger if exists trama_clean_hooks on public.automation_workspaces;
create trigger trama_clean_hooks after update of state on public.automation_workspaces for each row execute function trama_private.clean_hooks();

update public.lab_tools set name='Trama',available=true where slug='automation';
notify pgrst,'reload schema';
