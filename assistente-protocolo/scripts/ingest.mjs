// Script de ingestão dos manuais em docs/manuais/*.md para o Supabase (pgvector).
//
// Roda localmente (nunca em produção/no navegador) porque usa a service_role key,
// que dá acesso total ao banco — não deve nunca ir para o front-end.
//
// Uso:
//   OPENAI_API_KEY=sk-... \
//   SUPABASE_URL=https://SEU-PROJETO.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/ingest.mjs
//
// Reingestão: o script apaga e recria os chunks de cada manual antes de inserir,
// então pode ser rodado de novo sempre que um manual mudar (é idempotente por manual).

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "..", "docs", "manuais");

const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Faltou a variável de ambiente ${name}.`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Extrai o front-matter (--- manual: ... / sistema: ... ---) do topo do arquivo.
function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Arquivo sem front-matter (--- manual: ... / sistema: ... ---).");
  const [, front, body] = match;
  const meta = {};
  for (const line of front.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key) meta[key.trim()] = rest.join(":").trim();
  }
  return { meta, body };
}

// Divide o corpo em chunks por seção "## Página ... — Título".
function splitIntoChunks(body) {
  const parts = body.split(/\n(?=## )/g).map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => {
    const [headingLine, ...rest] = part.split("\n");
    const secao = headingLine.replace(/^##\s*/, "").trim();
    const conteudo = rest.join("\n").trim();
    return { secao, conteudo: `${secao}\n\n${conteudo}` };
  });
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Embedding falhou: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function main() {
  const files = readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error(`Nenhum .md encontrado em ${DOCS_DIR}`);
    process.exit(1);
  }

  let totalChunks = 0;
  for (const file of files) {
    const raw = readFileSync(join(DOCS_DIR, file), "utf-8");
    const { meta, body } = parseFrontMatter(raw);
    const chunks = splitIntoChunks(body);
    console.log(`\n${file} → ${meta.manual} (${chunks.length} trechos)`);

    // Remove os chunks antigos desse manual antes de reinserir (reingestão idempotente).
    const { error: delError } = await supabase.from("manual_chunks").delete().eq("manual", meta.manual);
    if (delError) throw delError;

    for (const chunk of chunks) {
      const embedding = await embed(chunk.conteudo);
      const { error } = await supabase.from("manual_chunks").insert({
        manual: meta.manual,
        sistema: meta.sistema,
        secao: chunk.secao,
        conteudo: chunk.conteudo,
        embedding,
      });
      if (error) throw error;
      totalChunks += 1;
      process.stdout.write(".");
    }
  }

  console.log(`\n\nIngestão concluída: ${totalChunks} trechos indexados em ${files.length} manuais.`);
}

main().catch((err) => {
  console.error("\nErro na ingestão:", err);
  process.exit(1);
});
