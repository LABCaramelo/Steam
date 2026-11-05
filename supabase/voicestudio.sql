-- Voice Studio: aplicar após lab-access.sql e lab-tools.sql.
-- Cadastra a ferramenta no catálogo do LAB (slug: voicestudio, appid: 17).
begin;

insert into public.lab_tools (slug, appid, name, available)
values ('voicestudio', 17, 'Voice Studio', false)
on conflict (slug) do update set appid = excluded.appid, name = excluded.name, available = excluded.available;

commit;
