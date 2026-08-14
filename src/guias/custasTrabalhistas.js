/* ══════════════════════════════════════════════════════════════
   Motor de cálculo e conferência — Custas processuais (GRU-JT)
   Regra: CLT art. 789 (redação da Lei nº 10.537/2002) — custas de
   2% sobre o valor da causa, observado o piso mínimo legal.

   ⚠️ ATENÇÃO: os parâmetros abaixo refletem a redação histórica da
   norma. Este ambiente não tem acesso à internet para confirmar se
   houve atualização normativa/tabela do TST mais recente — confirme
   PARAMETROS_CUSTAS com a fonte oficial antes de usar em produção,
   e trate qualquer guia gerada por este motor como uma PROPOSTA a
   validar, nunca como cálculo definitivo.
══════════════════════════════════════════════════════════════ */

export const PARAMETROS_CUSTAS = {
  percentual: 0.02, // 2% sobre o valor da causa/condenação
  valorMinimo: 10.64, // piso mínimo legal (CLT art. 789, §1º)
  fonteNormativa: "CLT art. 789 (Lei 10.537/2002) — confirmar vigência",
};

const arredondar = (v) => Math.round(v * 100) / 100;

/** Calcula o valor de custas a partir da base de cálculo (valor da causa
 *  ou valor liquidado/homologado, conforme a fase processual). */
export function calcularCustas(baseDeCalculo, parametros = PARAMETROS_CUSTAS) {
  if (typeof baseDeCalculo !== "number" || !isFinite(baseDeCalculo) || baseDeCalculo < 0) {
    throw new Error("Base de cálculo inválida.");
  }
  const bruto = baseDeCalculo * parametros.percentual;
  const valor = Math.max(bruto, parametros.valorMinimo);
  return {
    baseDeCalculo: arredondar(baseDeCalculo),
    percentualAplicado: parametros.percentual,
    valorMinimoAplicado: bruto < parametros.valorMinimo,
    valor: arredondar(valor),
    fonteNormativa: parametros.fonteNormativa,
  };
}

const TOLERANCIA_MINIMA = 0.01;

/** Confere o valor calculado contra o valor encontrado no processo
 *  (sentença, cálculo, guia anterior, sistema do tribunal etc.).
 *  Nunca decide sozinha em caso de divergência — apenas evidencia. */
export function conferirValores({ valorEncontrado, valorCalculado, origemValorEncontrado }) {
  if (valorEncontrado == null) {
    return {
      status: "sem_referencia",
      valorEncontrado: null,
      valorCalculado: arredondar(valorCalculado),
      valorAUsar: arredondar(valorCalculado),
      diferenca: null,
      nivelConfianca: "média",
      mensagem: "Não havia valor de referência no processo para conferência cruzada — valor calculado pelo motor de custas, ainda sujeito à validação humana.",
    };
  }

  const diferenca = arredondar(valorEncontrado - valorCalculado);
  const tolerancia = Math.max(TOLERANCIA_MINIMA, arredondar(valorCalculado * 0.001));
  const divergente = Math.abs(diferenca) > tolerancia;

  if (!divergente) {
    return {
      status: "conferido",
      valorEncontrado: arredondar(valorEncontrado),
      valorCalculado: arredondar(valorCalculado),
      valorAUsar: arredondar(valorCalculado),
      diferenca,
      nivelConfianca: "alta",
      mensagem: `Valor do processo (${origemValorEncontrado || "fonte não informada"}) confere com o valor calculado, dentro da tolerância de arredondamento.`,
    };
  }

  return {
    status: "divergente",
    valorEncontrado: arredondar(valorEncontrado),
    valorCalculado: arredondar(valorCalculado),
    valorAUsar: null, // bloqueia emissão automática — decisão fica com o humano
    diferenca,
    nivelConfianca: "baixa",
    mensagem: "Divergência entre o valor identificado no processo e o valor recalculado pelo sistema. Emissão bloqueada até validação humana.",
    possiveisMotivos: possiveisMotivosDivergencia(diferenca),
    acaoRecomendada: "Validar manualmente a base de cálculo (valor da causa x valor liquidado) e a data de referência antes de emitir a guia.",
  };
}

function possiveisMotivosDivergencia(diferenca) {
  const motivos = [];
  if (diferenca > 0) {
    motivos.push("Valor do processo pode incluir correção monetária/juros não considerados no cálculo automático.");
    motivos.push("Base de cálculo do processo pode ser o valor liquidado/homologado, diferente do valor da causa usado aqui.");
  } else {
    motivos.push("Valor do processo pode estar desatualizado em relação à fase processual atual.");
    motivos.push("Possível aplicação do piso mínimo legal em um dos dois cálculos e não no outro.");
  }
  motivos.push("Possível erro de digitação no valor de origem — conferir documento fonte.");
  return motivos;
}
