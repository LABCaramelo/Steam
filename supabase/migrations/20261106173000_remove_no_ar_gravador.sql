-- Remoção definitiva da ferramenta No Ar (slug gravador, appid 9)
delete from public.user_tools where tool_slug = 'gravador';
delete from public.user_activity_log where tool_slug = 'gravador';
delete from public.lab_tools where slug = 'gravador' or appid = 9;
