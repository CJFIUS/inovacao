/* ══════════════════════════════════════════════════════════════
   Automação de emissão de GRU — Custas Judiciais (Justiça do Trabalho)
   https://gru.jt.jus.br/gru

   LIMITE CONFIRMADO: ao clicar em "Revisão e Pagamento", o site exige
   resolver um CAPTCHA visual (com cronômetro de segurança) antes de
   prosseguir. Este script preenche TUDO até ali e clica em "Revisão e
   Pagamento" — a partir daí, PARA DE PROPÓSITO e espera uma pessoa
   resolver o CAPTCHA e confirmar manualmente. Não existe, e não deve
   existir, nenhuma tentativa de resolver o CAPTCHA automaticamente
   (OCR, serviço de resolução de CAPTCHA, etc.) — isso seria burlar um
   controle de segurança do tribunal, o que está fora do escopo deste
   projeto por definição.

   STATUS: mapeado e escrito até o clique em "Revisão e Pagamento".
   NÃO TESTADO contra a página real: este ambiente de desenvolvimento
   tem o acesso de rede a gru.jt.jus.br bloqueado, então os seletores
   abaixo foram escritos a partir de prints da tela (rótulos e textos
   visíveis), não do HTML/DOM real. Rode em modo visível primeiro (ver
   instruções abaixo) e ajuste o que quebrar.

   Como rodar:
     npm install --no-save playwright && npx playwright install chromium
     node automacao/emitir-gru-jt.mjs --headed   (para ver o navegador)

   Este script é standalone (não roda dentro do Hub React) porque
   depende de um navegador real via Playwright — o app do Hub roda no
   navegador do usuário e não pode controlar outra aba por segurança.
══════════════════════════════════════════════════════════════ */

import { chromium } from "playwright";
import { calcularCustas } from "../src/guias/custasTrabalhistas.js";
import { buscarUnidadeGestora } from "../src/guias/dadosReferencia.js";

const URL_GRU_JT = "https://gru.jt.jus.br/gru";

/**
 * @param {object} dados
 * @param {string} dados.tribunal        ex: "TRT15"
 * @param {string} dados.cnpjOuCpf       ex: "01.340.384/0001-54"
 * @param {string} dados.numeroProcesso  ex: "0010912-28.2025.5.15.0102"
 * @param {number} dados.baseDeCalculo   valor da causa/condenação, para calcularCustas()
 * @param {{headed?: boolean}} opcoes
 */
export async function emitirGuiaCustasJT(dados, opcoes = {}) {
  const unidadeGestora = buscarUnidadeGestora(dados.tribunal);
  if (!unidadeGestora) throw new Error(`Tribunal "${dados.tribunal}" não está na tabela de Unidades Gestoras.`);

  const calculo = calcularCustas(dados.baseDeCalculo);
  console.log(`[emitir-gru-jt] Valor calculado (a digitar em "Valor Principal"): R$ ${calculo.valor.toFixed(2)}`);
  console.log("[emitir-gru-jt] ⚠ Este valor NÃO foi conferido contra o processo — confirme antes de emitir de verdade.");

  const browser = await chromium.launch({ headless: !opcoes.headed });
  const page = await browser.newPage();

  try {
    await page.goto(URL_GRU_JT, { waitUntil: "networkidle" });

    // ---- Bloco 1: Identificação do Serviço ----
    await selecionarComTexto(page, "Selecione a Unidade Gestora", unidadeGestora.nome);
    await selecionarComTexto(page, "Qual categoria de serviço deseja pagar?", "Judicial");
    await selecionarComTexto(page, "Selecione o serviço que deseja pagar", "Custas Judiciais");

    // ---- Bloco 2: Identificação da Guia de Recolhimento ----
    await preencherPorRotulo(page, "CPF ou CNPJ", dados.cnpjOuCpf);
    await preencherPorRotulo(page, "PJe - Processo Judicial", dados.numeroProcesso);
    // Aguarda a validação ao vivo contra o PJe (ícone "Processo Judicial validado").
    await page.getByText("Processo Judicial validado", { exact: false }).waitFor({ timeout: 15000 });

    // Competência: deixa o valor padrão (mês/ano atual) pré-preenchido pelo site,
    // a não ser que dados.competencia seja explicitamente informado.
    if (dados.competencia) {
      await preencherPorRotulo(page, "Competência", dados.competencia);
    }

    // ---- Bloco 3: Valores do Pagamento ----
    await preencherPorRotulo(page, "Valor Principal", calculo.valor.toFixed(2).replace(".", ","));

    if (!opcoes.headed) {
      throw new Error(
        "O próximo passo (botão 'Revisão e Pagamento') dispara um CAPTCHA visual, " +
        "que exige uma pessoa. Rode com --headed para preencher o formulário e " +
        "deixar o CAPTCHA pronto para alguém resolver."
      );
    }

    // ---- Clique em "Revisão e Pagamento" — e PARADA INTENCIONAL aqui ----
    await page.getByRole("button", { name: /revisão e pagamento/i }).click();

    console.log("\n[emitir-gru-jt] Formulário preenchido e validado. O site vai pedir um CAPTCHA agora.");
    console.log("[emitir-gru-jt] >>> Resolva o CAPTCHA manualmente na janela do navegador e confirme o pagamento. <<<");
    console.log("[emitir-gru-jt] Este script NÃO tenta resolver o CAPTCHA — isso é proposital.");
    console.log(`[emitir-gru-jt] Valor calculado que deve aparecer em "Valor Principal": R$ ${calculo.valor.toFixed(2)}. Confira antes de confirmar.`);
    console.log("[emitir-gru-jt] Feche a janela do navegador quando terminar para encerrar o script.\n");

    await page.waitForEvent("close", { timeout: 0 });
  } finally {
    if (!opcoes.headed) await browser.close();
  }
}

/** Seleciona uma opção num combobox customizado, localizado pelo texto do
 *  rótulo visível acima/ao lado dele. Ajuste se a página usar outro padrão
 *  de componente (ex: <select> nativo — nesse caso trocar por page.selectOption). */
async function selecionarComTexto(page, rotulo, opcaoTexto) {
  const campo = page.getByLabel(rotulo, { exact: false })
    .or(page.locator(`text=${rotulo}`).locator("xpath=following::*[@role='combobox' or self::input][1]"));
  await campo.first().click();
  await page.getByRole("option", { name: opcaoTexto, exact: false }).first().click();
}

async function preencherPorRotulo(page, rotulo, valor) {
  const campo = page.getByLabel(rotulo, { exact: false })
    .or(page.getByPlaceholder(rotulo, { exact: false }));
  await campo.first().fill(String(valor));
}

// Execução via CLI: node automacao/emitir-gru-jt.mjs --headed
if (import.meta.url === `file://${process.argv[1]}`) {
  const headed = process.argv.includes("--headed");
  emitirGuiaCustasJT({
    tribunal: "TRT15",
    cnpjOuCpf: "01.340.384/0001-54",
    numeroProcesso: "0010912-28.2025.5.15.0102",
    baseDeCalculo: 15000,
  }, { headed }).catch(err => {
    console.error("[emitir-gru-jt] Falhou:", err.message);
    process.exit(1);
  });
}
