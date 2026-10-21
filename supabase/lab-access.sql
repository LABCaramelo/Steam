-- Acesso ao LAB pelo grupo oficial do WhatsApp (api/lab-access.ts).
-- Rode uma vez no SQL Editor do Supabase (projeto fzhzpzxsttflgtassyex).
--
-- Só o servidor lê e grava esta tabela, com a service role: a RLS fica ligada, sem nenhuma
-- política, então o navegador (anon/authenticated) não consegue ler o código nem se liberar.

create table if not exists public.lab_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- WhatsApp confirmado por código (dígitos como o WhatsApp registra, ex.: 553185869015).
  whatsapp text unique,
  jid text,
  lid text,
  verified_at timestamptz,
  -- Última vez que a pessoa foi encontrada no grupo; nulo quando não está.
  member_at timestamptz,
  -- Código pendente (hash), para qual número foi enviado e limites de reenvio.
  code_hash text,
  code_whatsapp text,
  code_jid text,
  code_lid text,
  code_expires_at timestamptz,
  code_attempts integer not null default 0,
  code_sent_at timestamptz,
  sends integer not null default 0,
  sends_window_start timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists lab_access_code_whatsapp_idx on public.lab_access (code_whatsapp, code_sent_at);

alter table public.lab_access enable row level security;
revoke all on table public.lab_access from anon, authenticated;
grant all on table public.lab_access to service_role;
