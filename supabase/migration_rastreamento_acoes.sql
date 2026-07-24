-- ============================================================
-- Migração: Painel de Rastreamento e Controle de Novas Ações Judiciais
-- Rode isto no SQL Editor do Supabase DEPOIS de já ter rodado schema.sql
-- e migration_senha_unica.sql
-- ============================================================

-- ---------- CLIENTES MONITORADOS (CNPJs acompanhados pela Controladoria) ----------
create table public.clientes_monitorados (
  cnpj text primary key check (cnpj ~ '^[0-9]{14}$'),
  razao_social text not null default '',
  apelido text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultima_busca_em timestamptz
);
alter table public.clientes_monitorados enable row level security;
create policy "clientes_monitorados: authenticated can read" on public.clientes_monitorados for select using (auth.role() = 'authenticated');
create policy "clientes_monitorados: authenticated can insert" on public.clientes_monitorados for insert with check (auth.role() = 'authenticated');
create policy "clientes_monitorados: authenticated can update" on public.clientes_monitorados for update using (auth.role() = 'authenticated');
create policy "clientes_monitorados: authenticated can delete" on public.clientes_monitorados for delete using (auth.role() = 'authenticated');

-- ---------- PROCESSOS MONITORADOS (consolidação do que cada busca localizou) ----------
create table public.processos_monitorados (
  id bigint generated always as identity primary key,
  cnpj text not null references public.clientes_monitorados(cnpj) on delete cascade,
  numero_processo text not null,
  tribunal text not null default '',
  orgao_julgador text not null default '',
  classe text not null default '',
  assunto text not null default '',
  polo text not null default '',
  parte_contraria text not null default '',
  data_distribuicao date,
  situacao text not null default '',
  -- 'novo' = acabou de ser localizado, ainda sem triagem (é o que dispara o alerta no painel).
  -- 'em_analise' / 'tratado' / 'descartado' = o que a Controladoria decidiu depois de olhar.
  -- Um processo já existente (mesmo cnpj + numero_processo) nunca volta a ficar 'novo' —
  -- é assim que o painel diferencia "já conhecido" de "nova ação encontrada".
  status text not null default 'novo' check (status in ('novo','em_analise','tratado','descartado')),
  fonte text not null default 'Busca manual',
  encontrado_em timestamptz not null default now(),
  tratado_em timestamptz,
  observacoes text not null default '',
  unique (cnpj, numero_processo)
);
create index processos_monitorados_cnpj_idx on public.processos_monitorados (cnpj);
create index processos_monitorados_status_idx on public.processos_monitorados (status);
alter table public.processos_monitorados enable row level security;
create policy "processos_monitorados: authenticated can read" on public.processos_monitorados for select using (auth.role() = 'authenticated');
create policy "processos_monitorados: authenticated can insert" on public.processos_monitorados for insert with check (auth.role() = 'authenticated');
create policy "processos_monitorados: authenticated can update" on public.processos_monitorados for update using (auth.role() = 'authenticated');
create policy "processos_monitorados: authenticated can delete" on public.processos_monitorados for delete using (auth.role() = 'authenticated');

-- ---------- HISTÓRICO DE BUSCAS (rastreabilidade de toda consulta feita) ----------
create table public.buscas_historico (
  id bigint generated always as identity primary key,
  cnpj text not null references public.clientes_monitorados(cnpj) on delete cascade,
  executada_em timestamptz not null default now(),
  tribunal text not null default 'Todos',
  status text not null default 'sucesso' check (status in ('sucesso','erro','sem_resultado')),
  processos_encontrados int not null default 0,
  processos_novos int not null default 0,
  mensagem text not null default ''
);
create index buscas_historico_cnpj_idx on public.buscas_historico (cnpj);
alter table public.buscas_historico enable row level security;
create policy "buscas_historico: authenticated can read" on public.buscas_historico for select using (auth.role() = 'authenticated');
create policy "buscas_historico: authenticated can insert" on public.buscas_historico for insert with check (auth.role() = 'authenticated');

-- ---------- Cadastro de exemplo (opcional) ----------
-- CNPJ citado como exemplo no pedido do painel — descomente para cadastrá-lo já monitorado:
-- insert into public.clientes_monitorados (cnpj, apelido) values ('01340384000154', 'Cliente exemplo');

-- ---------- Busca automática nos Tribunais (opcional) ----------
-- A Edge Function em supabase/functions/buscar-processos/ é o ponto de extensão para
-- automatizar a consulta (hoje o painel funciona no modo manual: "Registrar resultado
-- de busca"). Para ativar a busca automática, contrate um provedor de pesquisa
-- processual por CNPJ (ex: Escavador, Judit.io) e configure os secrets da função:
--   supabase functions deploy buscar-processos
--   supabase secrets set PROVEDOR_API_URL=... PROVEDOR_API_KEY=...
