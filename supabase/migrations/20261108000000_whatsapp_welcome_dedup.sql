-- ==============================================================================
-- LAB Caramelo · Deduplicação Atômica de Boas-Vindas no WhatsApp (UAZAPI)
-- Previne envio de mensagens duplicadas por retries de webhook ou múltiplos eventos de grupo
-- ==============================================================================

begin;

create table if not exists public.whatsapp_welcome_locks (
  lock_key text primary key,
  phone text not null,
  group_jid text not null,
  template_id text,
  created_at timestamptz default timezone('utc'::text, now()),
  expires_at timestamptz default (timezone('utc'::text, now()) + interval '2 hours')
);

alter table public.whatsapp_welcome_locks enable row level security;

create or replace function public.acquire_welcome_lock(
  p_phone text,
  p_group_jid text,
  p_ttl_minutes int default 120
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := 'welcome:' || p_phone || ':' || p_group_jid;
begin
  -- Limpa locks expirados
  delete from public.whatsapp_welcome_locks where expires_at < timezone('utc'::text, now());

  -- Tenta inserir o lock com chave única
  insert into public.whatsapp_welcome_locks (lock_key, phone, group_jid, expires_at)
  values (v_key, p_phone, p_group_jid, timezone('utc'::text, now()) + (p_ttl_minutes || ' minutes')::interval)
  on conflict (lock_key) do nothing;

  -- Retorna true se inseriu agora, false se já existia lock ativo
  return found;
end;
$$;

grant execute on function public.acquire_welcome_lock(text, text, int) to service_role, authenticated, anon;

commit;
