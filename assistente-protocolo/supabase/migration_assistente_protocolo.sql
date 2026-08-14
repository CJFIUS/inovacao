-- ============================================================
-- Assistente de Protocolo (RAG) — schema Supabase
-- Rode este script no SQL Editor do MESMO projeto Supabase já usado
-- pelo Hub CJ Inova (reaproveita autenticação e infraestrutura).
-- ============================================================

-- pgvector já vem habilitado por padrão nos projetos Supabase; caso não esteja:
create extension if not exists vector;

-- ---------- CHUNKS DOS MANUAIS ----------
-- Cada linha é um trecho (chunk) de um manual, com seu embedding e a
-- referência de página/seção usada para citar a fonte na resposta.
create table public.manual_chunks (
  id bigint generated always as identity primary key,
  manual text not null,          -- ex.: "Manual de Protocolos — e-CAC (RFB) e e-PAT (SEFAZ/SP)"
  sistema text not null,         -- ex.: "e-CAC, e-PAT"
  secao text not null,           -- ex.: "Página 24-25 — Classificação Documentos Comprobatórios"
  conteudo text not null,
  embedding vector(1536),        -- dimensão do text-embedding-3-small (OpenAI)
  atualizado_em timestamptz not null default now()
);

alter table public.manual_chunks enable row level security;
create policy "manual_chunks: authenticated can read" on public.manual_chunks
  for select using (auth.role() = 'authenticated');
-- Não há política de insert/update para usuários comuns: a ingestão roda com a
-- service_role key (script offline), nunca pela chave anônima do app.

-- Índice para busca por similaridade (ivfflat, cosine distance).
-- Rodar depois de já ter alguns milhares de linhas ingeridas para o índice ser efetivo;
-- em uma base pequena como esta, a busca exata (sem índice) já é rápida o suficiente.
create index on public.manual_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ---------- FUNÇÃO DE BUSCA POR SIMILARIDADE ----------
-- Chamada pela Edge Function via supabase.rpc('match_manual_chunks', ...)
create or replace function public.match_manual_chunks(
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id bigint,
  manual text,
  sistema text,
  secao text,
  conteudo text,
  similaridade float
)
language sql stable
as $$
  select
    id, manual, sistema, secao, conteudo,
    1 - (embedding <=> query_embedding) as similaridade
  from public.manual_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- LOG DE PERGUNTAS (opcional, mas recomendado) ----------
-- Guarda o histórico de perguntas/respostas para revisão da equipe e
-- para identificar lacunas na base de conhecimento (perguntas sem boa resposta).
create table public.assistente_perguntas (
  id bigint generated always as identity primary key,
  pergunta text not null,
  resposta text not null,
  fontes jsonb not null default '[]',
  perguntado_por text,
  criado_em timestamptz not null default now()
);
alter table public.assistente_perguntas enable row level security;
create policy "assistente_perguntas: authenticated can read" on public.assistente_perguntas
  for select using (auth.role() = 'authenticated');
create policy "assistente_perguntas: authenticated can insert" on public.assistente_perguntas
  for insert with check (auth.role() = 'authenticated');
