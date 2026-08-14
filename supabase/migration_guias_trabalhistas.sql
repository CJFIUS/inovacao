-- ============================================================
-- Migração: Guias Trabalhistas (MVP do agente de conferência de
-- guias de pagamento judiciais) — trilha de auditoria
-- Rode isto no SQL Editor do Supabase DEPOIS de já ter rodado
-- schema.sql e migration_senha_unica.sql
-- ============================================================

create table public.guias_trabalhistas (
  id bigint generated always as identity primary key,
  numero_processo text not null,
  tribunal text not null,
  cliente text,
  cnpj text,
  base_de_calculo numeric(14,2) not null,
  valor_calculado numeric(14,2) not null,
  valor_encontrado numeric(14,2),
  origem_valor_encontrado text,
  valor_a_usar numeric(14,2),
  status_conferencia text not null check (status_conferencia in ('sem_referencia','conferido','divergente')),
  nivel_confianca text not null,
  divergencia_detalhe jsonb,
  validado_por text,
  status_validacao text not null default 'Aguardando validação' check (status_validacao in ('Aguardando validação','Aprovada','Rejeitada')),
  data_validacao timestamptz,
  registrado_por text,
  criado_em timestamptz not null default now()
);

alter table public.guias_trabalhistas enable row level security;

-- Mesmo modelo de acesso do restante do Hub: senha única da equipe,
-- qualquer pessoa autenticada lê e edita (ver migration_senha_unica.sql).
create policy "guias_trabalhistas: authenticated can read" on public.guias_trabalhistas for select using (auth.role() = 'authenticated');
create policy "guias_trabalhistas: authenticated can insert" on public.guias_trabalhistas for insert with check (auth.role() = 'authenticated');
create policy "guias_trabalhistas: authenticated can update" on public.guias_trabalhistas for update using (auth.role() = 'authenticated');
create policy "guias_trabalhistas: authenticated can delete" on public.guias_trabalhistas for delete using (auth.role() = 'authenticated');
