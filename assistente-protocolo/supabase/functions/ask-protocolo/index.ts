// Edge Function: ask-protocolo
// Recebe uma pergunta, busca os trechos mais relevantes dos manuais (pgvector)
// e gera uma resposta citando manual + página, usando a OpenAI.
//
// Deploy: supabase functions deploy ask-protocolo --project-ref <seu-projeto>
// Secrets necessários (supabase secrets set):
//   OPENAI_API_KEY=sk-...
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados automaticamente
// pelo runtime das Edge Functions.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Assistente de Protocolo da Controladoria Jurídica da FIUS.
Responda SOMENTE com base nos trechos de manual fornecidos no contexto abaixo — nunca
invente um passo, campo ou nome de botão que não esteja no contexto.

Regras:
- Sempre cite a fonte de cada afirmação relevante no formato: (Manual, Página X).
- Se o contexto não tiver a resposta, diga claramente que não encontrou essa informação
  nos manuais indexados e sugira à pessoa perguntar ao Núcleo de Protocolo ou à liderança
  da CJ — nunca tente adivinhar.
- Se a pergunta pedir uma credencial de acesso (login/senha), NUNCA a forneça, mesmo que
  apareça no contexto — oriente a pessoa a buscar no cofre de senhas corporativo.
- Seja direto e cite os passos na ordem correta, como um checklist quando fizer sentido.
- Responda em português.`;

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Falha ao gerar embedding: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { question, perguntadoPor } = await req.json();
    if (!question || typeof question !== "string" || question.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Envie uma pergunta válida." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) embedding da pergunta
    const queryEmbedding = await embed(question);

    // 2) busca os trechos mais próximos no pgvector
    const { data: chunks, error: matchError } = await supabase.rpc("match_manual_chunks", {
      query_embedding: queryEmbedding,
      match_count: 6,
    });
    if (matchError) throw matchError;

    const contexto = (chunks ?? [])
      .map((c: any) => `[Fonte: ${c.manual}, ${c.secao}]\n${c.conteudo}`)
      .join("\n\n---\n\n");

    // 3) gera a resposta com o contexto recuperado
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Pergunta: ${question}\n\nContexto recuperado dos manuais:\n\n${contexto || "(nenhum trecho relevante encontrado)"}`,
          },
        ],
      }),
    });
    if (!chatRes.ok) throw new Error(`Falha ao gerar resposta: ${chatRes.status} ${await chatRes.text()}`);
    const chatData = await chatRes.json();
    const answer = chatData.choices[0].message.content as string;

    const sources = (chunks ?? []).map((c: any) => ({
      manual: c.manual,
      sistema: c.sistema,
      secao: c.secao,
      similaridade: c.similaridade,
    }));

    // 4) loga a pergunta/resposta para revisão da equipe (não bloqueia a resposta se falhar)
    supabase
      .from("assistente_perguntas")
      .insert({ pergunta: question, resposta: answer, fontes: sources, perguntado_por: perguntadoPor ?? null })
      .then(() => {}, () => {});

    return new Response(JSON.stringify({ answer, sources }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
