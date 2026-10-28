-- Liberação da Trama em versão Beta na Loja do LAB
update public.lab_tools
set name = 'Trama',
    available = true
where slug = 'automation';

notify pgrst, 'reload schema';
