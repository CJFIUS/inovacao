# Assistente de Protocolo — CJ FIUS

Chatbot interno (RAG) treinado nos manuais de protocolo da Controladoria Jurídica —
e-CAC, e-PAT, TJMA, PJE, e-SAJ, Eproc, SEEU, SEI e E-ambiente. Responde "como faço X"
citando o manual e a página exatos, e diz claramente quando não sabe em vez de inventar
um passo.

Ferramenta separada do Hub CJ Inova, mas reaproveita o mesmo projeto Supabase (login de
equipe, Postgres com pgvector).

## Arquitetura

```
docs/manuais/*.md        → base de conhecimento (fonte da verdade, editável)
scripts/ingest.mjs        → lê os .md, gera embeddings (OpenAI) e grava no Supabase
supabase/migration_*.sql  → tabelas manual_chunks (pgvector) + função de busca
supabase/functions/       → Edge Function que responde as perguntas do chat
src/                       → front-end (React + Vite), chat com login de equipe
```

Fluxo de uma pergunta: `App.jsx` → `supabase.functions.invoke("ask-protocolo")` →
a Edge Function gera o embedding da pergunta → busca os 6 trechos mais parecidos em
`manual_chunks` → monta um prompt com esses trechos → chama a OpenAI para responder →
devolve resposta + fontes citadas.

## Configuração (uma vez)

1. **Rodar a migração do banco.** No SQL Editor do mesmo projeto Supabase do Hub CJ
   Inova, colar e rodar `supabase/migration_assistente_protocolo.sql`.

2. **Criar uma chave da OpenAI** em platform.openai.com (Billing + API key). Guardar
   em local seguro — nunca commitar no repositório.

3. **Configurar o secret da Edge Function:**
   ```bash
   supabase login
   supabase link --project-ref <ref-do-projeto>
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

4. **Publicar a Edge Function:**
   ```bash
   supabase functions deploy ask-protocolo
   ```

5. **Ingerir os manuais** (gera os embeddings e popula `manual_chunks`):
   ```bash
   cd assistente-protocolo
   npm install
   OPENAI_API_KEY=sk-... \
   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
   npm run ingest
   ```
   A `SUPABASE_SERVICE_ROLE_KEY` fica em **Project Settings → API** no painel do
   Supabase. Nunca a coloque no front-end nem a commite — ela ignora o RLS.

6. **Rodar localmente:**
   ```bash
   npm run dev
   ```
   Login: mesmo nome/senha de equipe já usados no Hub CJ Inova.

## Manter a base de conhecimento atualizada

- Editar os arquivos em `docs/manuais/*.md` (um por sistema/manual). Cada arquivo tem um
  cabeçalho `manual:` / `sistema:` e seções `## Página X — Título`, que viram os trechos
  citados nas respostas.
- **Nunca colar login/senha real nesses arquivos** — se um manual original tiver
  credenciais, substitua por uma nota apontando para o cofre de senhas corporativo
  (é o que já foi feito ao importar os manuais de SEI/E-ambiente e SEEU).
- Depois de editar, rodar `npm run ingest` de novo — o script apaga e recria os trechos
  do(s) manual(is) alterado(s), então é seguro rodar quantas vezes for preciso.
- Para adicionar um novo manual (por exemplo, um novo sistema estadual), criar um novo
  `.md` em `docs/manuais/` seguindo o mesmo formato e rodar a ingestão.

## Revisão de qualidade

Toda pergunta/resposta fica registrada em `assistente_perguntas` (ver migração). Vale
revisar periodicamente:
- Perguntas onde o assistente respondeu "não encontrei essa informação" → sinaliza um
  manual que precisa ser adicionado ou uma seção que falta na base.
- Respostas com fontes de baixa similaridade → sinaliza pergunta fora do escopo dos
  manuais indexados hoje.

## Deploy do front-end

Este projeto é independente do build do Hub (`vite.config.js` usa
`base: "/assistente-protocolo/"`). Publicar como um site estático próprio (Vercel,
Netlify, GitHub Pages em outro path, etc.) — `npm run build` gera a pasta `dist/`.

## Segurança

- A chave da OpenAI e a `service_role` key do Supabase **nunca** vão para o front-end —
  só existem no ambiente da Edge Function e na máquina de quem roda a ingestão.
- A tabela `manual_chunks` só permite leitura por usuários autenticados (RLS); escrita
  só é possível com a `service_role` key, usada exclusivamente pelo script de ingestão.
