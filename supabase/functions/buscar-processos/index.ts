// Edge Function: buscar-processos
//
// Ponte entre o Painel de Rastreamento de Ações (CJ INOVA) e um provedor
// externo de pesquisa processual por CNPJ (ex: Escavador, Judit.io, ou a
// API pública DataJud do CNJ, dependendo do que a Controladoria contratar).
//
// Sem essa função configurada, o painel continua funcionando 100% no modo
// manual: quem consulta o Tribunal registra o resultado em "Registrar
// resultado de busca" e o painel cuida de diferenciar processo novo de
// processo já conhecido. Esta função é só o ponto de extensão para quando
// existir um provedor automatizado.
//
// Deploy:
//   supabase functions deploy buscar-processos
// Secrets necessários:
//   supabase secrets set PROVEDOR_API_URL=https://... PROVEDOR_API_KEY=...
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão no runtime)
//
// Ajuste `buscarNoProvedor` abaixo para o contrato real do provedor
// escolhido — o formato usado neste arquivo é só um exemplo.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let cnpj;
  try {
    ({ cnpj } = await req.json());
  } catch {
    return json({ ok: false, erro: "Corpo da requisição inválido." }, 400);
  }
  if (!/^[0-9]{14}$/.test(cnpj || "")) {
    return json({ ok: false, erro: "CNPJ inválido — envie só os 14 dígitos." }, 400);
  }

  const provedorUrl = Deno.env.get("PROVEDOR_API_URL");
  const provedorChave = Deno.env.get("PROVEDOR_API_KEY");
  if (!provedorUrl || !provedorChave) {
    return json({
      ok: false,
      configurado: false,
      erro: "Nenhum provedor de pesquisa processual configurado nesta função. Use \"Registrar resultado de busca\" para lançar manualmente o que foi encontrado no Tribunal, ou configure PROVEDOR_API_URL/PROVEDOR_API_KEY nos secrets desta função.",
    }, 501);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  try {
    const encontrados = await buscarNoProvedor(provedorUrl, provedorChave, cnpj);

    const { data: existentes, error: erroExistentes } = await supabase
      .from("processos_monitorados")
      .select("numero_processo")
      .eq("cnpj", cnpj);
    if (erroExistentes) throw erroExistentes;

    const conhecidos = new Set((existentes || []).map((p) => p.numero_processo));
    const novos = encontrados.filter((p) => p.numeroProcesso && !conhecidos.has(p.numeroProcesso));

    if (novos.length > 0) {
      const { error: erroInsert } = await supabase.from("processos_monitorados").insert(
        novos.map((p) => ({
          cnpj,
          numero_processo: p.numeroProcesso,
          tribunal: p.tribunal || "",
          orgao_julgador: p.orgaoJulgador || "",
          classe: p.classe || "",
          assunto: p.assunto || "",
          polo: p.polo || "",
          parte_contraria: p.parteContraria || "",
          data_distribuicao: p.dataDistribuicao || null,
          situacao: p.situacao || "",
          status: "novo",
          fonte: "Busca automática",
        })),
      );
      if (erroInsert) throw erroInsert;
    }

    await supabase.from("buscas_historico").insert({
      cnpj,
      tribunal: "Todos (automático)",
      status: encontrados.length > 0 ? "sucesso" : "sem_resultado",
      processos_encontrados: encontrados.length,
      processos_novos: novos.length,
      mensagem: "Busca automática via provedor externo.",
    });
    await supabase.from("clientes_monitorados").update({ ultima_busca_em: new Date().toISOString() }).eq("cnpj", cnpj);

    return json({ ok: true, encontrados: encontrados.length, novos: novos.length });
  } catch (e) {
    await supabase.from("buscas_historico").insert({
      cnpj,
      tribunal: "Todos (automático)",
      status: "erro",
      mensagem: String(e?.message || e),
    });
    return json({ ok: false, erro: String(e?.message || e) }, 500);
  }
});

// Ponto de extensão: ajuste esta função ao contrato real do provedor
// contratado (Escavador, Judit.io, DataJud etc.). Deve devolver uma lista
// de processos normalizados no formato usado acima (numeroProcesso,
// tribunal, orgaoJulgador, classe, assunto, polo, parteContraria,
// dataDistribuicao, situacao).
async function buscarNoProvedor(url, chave, cnpj) {
  const resp = await fetch(`${url}?cnpj=${cnpj}`, {
    headers: { Authorization: `Bearer ${chave}` },
  });
  if (!resp.ok) throw new Error(`Provedor retornou HTTP ${resp.status}`);
  const dados = await resp.json();
  return Array.isArray(dados?.processos) ? dados.processos : [];
}
