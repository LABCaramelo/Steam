-- Migration: Stories Maker tool integration (despublicado por padrão para publicação manual via admin)
begin;

insert into public.lab_tools (slug, appid, name, available)
values ('stories', 14, 'Stories Maker', false)
on conflict (slug) do update set appid = excluded.appid, name = excluded.name, available = excluded.available;

commit;
