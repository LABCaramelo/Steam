-- Migration: Voice Studio tool integration
begin;

insert into public.lab_tools (slug, appid, name, available)
values ('voicestudio', 17, 'Voice Studio', false)
on conflict (slug) do update set appid = excluded.appid, name = excluded.name, available = excluded.available;

commit;
