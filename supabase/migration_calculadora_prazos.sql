-- ============================================================
-- Migração: Calculadora de Prazos Processuais (página pública)
-- Rode isto no SQL Editor do Supabase DEPOIS de já ter rodado schema.sql
-- ============================================================

-- Contatos deixados voluntariamente por quem usa a calculadora pública
-- (a calculadora em si NÃO exige cadastro nem login — isto é opcional,
-- só para o time do FIUS poder avisar a pessoa se o prazo estiver perto
-- de vencer).
create table public.calculadora_prazos_contatos (
  id bigint generated always as identity primary key,
  nome text,
  email text,
  whatsapp text,
  data_inicio date not null,
  contar_do_proximo_dia_util boolean not null default true,
  tipo_contagem text not null check (tipo_contagem in ('uteis', 'corridos')),
  quantidade_dias int not null check (quantidade_dias > 0),
  considerar_recesso boolean not null default true,
  considerar_forenses boolean not null default true,
  data_final date not null,
  criado_em timestamptz not null default now()
);

alter table public.calculadora_prazos_contatos enable row level security;

-- Qualquer visitante (sem login) pode registrar seu contato.
create policy "calculadora_prazos_contatos: anyone can insert"
  on public.calculadora_prazos_contatos for insert
  to anon, authenticated
  with check (true);

-- Só quem tem a senha da equipe (autenticado no Hub) consegue ver os contatos.
create policy "calculadora_prazos_contatos: authenticated can read"
  on public.calculadora_prazos_contatos for select
  using (auth.role() = 'authenticated');
