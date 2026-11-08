-- Migration: Película — Estúdio de Cinema & Mídia Generativa IA (Inspirado no Open-Generative-AI)
begin;

insert into public.lab_tools (slug, appid, name, available)
values ('pelicula', 22, 'Película', true)
on conflict (slug) do update set appid = excluded.appid, name = excluded.name, available = excluded.available;

commit;
