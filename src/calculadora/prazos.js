import { feriadosDoAno } from "./feriados.js";

const DIAS_SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

export function addDias(data, n) {
  const d = new Date(data);
  d.setDate(d.getDate() + n);
  return d;
}

export function chaveData(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatarData(d) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function nomeDiaSemana(d) {
  return DIAS_SEMANA[d.getDay()];
}

function ehFimDeSemana(d) {
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

// Recesso forense: 20/dez a 20/jan (Lei 11.416/2006, art. 62; CPC art. 220) — suspende os prazos.
function ehRecesso(d) {
  const mes = d.getMonth();
  const dia = d.getDate();
  return (mes === 11 && dia >= 20) || (mes === 0 && dia <= 20);
}

function construirFeriados({ anoInicio, anoFim, considerarForenses, feriadosExtras }) {
  const mapa = new Map();
  for (let ano = anoInicio; ano <= anoFim; ano++) {
    for (const f of feriadosDoAno(ano)) {
      if (f.tipo === "forense" && !considerarForenses) continue;
      mapa.set(chaveData(f.data), f.nome);
    }
  }
  for (const extra of feriadosExtras || []) {
    if (extra?.data instanceof Date && !isNaN(extra.data)) {
      mapa.set(chaveData(extra.data), extra.nome || "Feriado local");
    }
  }
  return mapa;
}

function motivoDiaNaoUtil(d, { feriados, considerarRecesso }) {
  if (ehFimDeSemana(d)) return nomeDiaSemana(d) === "sábado" ? "Sábado" : "Domingo";
  if (considerarRecesso && ehRecesso(d)) return "Recesso forense";
  if (feriados.has(chaveData(d))) return feriados.get(chaveData(d));
  return null;
}

function proximoDiaUtil(d, ctx) {
  let atual = new Date(d);
  while (motivoDiaNaoUtil(atual, ctx)) atual = addDias(atual, 1);
  return atual;
}

/**
 * Calcula o termo final de um prazo processual.
 *
 * @param {Object} p
 * @param {Date} p.dataInicio - data do ato que dispara o prazo (intimação/citação/publicação).
 * @param {boolean} p.contarDoProximoDiaUtil - se o início da contagem pula para o 1º dia útil seguinte (art. 224, CPC).
 * @param {"uteis"|"corridos"} p.tipoContagem - dias úteis (regra geral do CPC) ou corridos (ex.: Juizados Especiais, Lei 9.099/95).
 * @param {number} p.quantidadeDias - quantidade de dias do prazo.
 * @param {boolean} p.considerarRecesso - suspende a contagem durante o recesso forense (20/dez a 20/jan).
 * @param {boolean} p.considerarForenses - trata Carnaval e Corpus Christi como sem expediente forense.
 * @param {{data:Date,nome:string}[]} p.feriadosExtras - feriados estaduais/municipais informados manualmente.
 */
export function calcularPrazo({
  dataInicio,
  contarDoProximoDiaUtil,
  tipoContagem,
  quantidadeDias,
  considerarRecesso,
  considerarForenses,
  feriadosExtras,
}) {
  const anoInicio = dataInicio.getFullYear() - 1;
  const anoFim = dataInicio.getFullYear() + 3;
  const feriados = construirFeriados({ anoInicio, anoFim, considerarForenses, feriadosExtras });
  const ctx = { feriados, considerarRecesso };

  let termoInicial = addDias(dataInicio, 1);
  if (contarDoProximoDiaUtil) termoInicial = proximoDiaUtil(termoInicial, ctx);

  const diasPulados = [];
  let dataFinal;
  let prorrogado = false;

  if (tipoContagem === "corridos") {
    dataFinal = addDias(termoInicial, quantidadeDias - 1);
    const motivo = motivoDiaNaoUtil(dataFinal, ctx);
    if (motivo) {
      prorrogado = true;
      dataFinal = proximoDiaUtil(dataFinal, ctx);
    }
  } else {
    let atual = new Date(termoInicial);
    let motivoAtual = motivoDiaNaoUtil(atual, ctx);
    while (motivoAtual) {
      diasPulados.push({ data: new Date(atual), motivo: motivoAtual });
      atual = addDias(atual, 1);
      motivoAtual = motivoDiaNaoUtil(atual, ctx);
    }
    let contados = 1;
    while (contados < quantidadeDias) {
      atual = addDias(atual, 1);
      const motivo = motivoDiaNaoUtil(atual, ctx);
      if (motivo) {
        diasPulados.push({ data: new Date(atual), motivo });
        continue;
      }
      contados++;
    }
    dataFinal = atual;
  }

  return { termoInicial, dataFinal, diasPulados, prorrogado };
}
