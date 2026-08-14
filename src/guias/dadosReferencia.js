/* ══════════════════════════════════════════════════════════════
   Dados de referência — Guias Trabalhistas (GRU-JT)
   Fonte: "Unidades_Gestoras_GRU.pdf" (tabela oficial de códigos de
   Unidade Gestora usada em https://gru.jt.jus.br/gru) e planilha
   interna "CNPJS_guias_trabalhistas.xlsx".

   Estes dados são estáticos e raramente mudam, mas devem ser
   revisados periodicamente contra a fonte oficial — não há
   verificação automática de vigência aqui.
══════════════════════════════════════════════════════════════ */

export const UNIDADES_GESTORAS_GRU_JT = [
  { tribunal: "TST", nome: "Tribunal Superior do Trabalho", codigo: "080001" },
  { tribunal: "TRT1", nome: "Tribunal Regional do Trabalho da 1ª Região", codigo: "080009" },
  { tribunal: "TRT2", nome: "Tribunal Regional do Trabalho da 2ª Região", codigo: "080010" },
  { tribunal: "TRT3", nome: "Tribunal Regional do Trabalho da 3ª Região", codigo: "080008" },
  { tribunal: "TRT4", nome: "Tribunal Regional do Trabalho da 4ª Região", codigo: "080014" },
  { tribunal: "TRT5", nome: "Tribunal Regional do Trabalho da 5ª Região", codigo: "080007" },
  { tribunal: "TRT6", nome: "Tribunal Regional do Trabalho da 6ª Região", codigo: "080006" },
  { tribunal: "TRT7", nome: "Tribunal Regional do Trabalho da 7ª Região", codigo: "080004" },
  { tribunal: "TRT8", nome: "Tribunal Regional do Trabalho da 8ª Região", codigo: "080003" },
  { tribunal: "TRT9", nome: "Tribunal Regional do Trabalho da 9ª Região", codigo: "080012" },
  { tribunal: "TRT10", nome: "Tribunal Regional do Trabalho da 10ª Região", codigo: "080016" },
  { tribunal: "TRT11", nome: "Tribunal Regional do Trabalho da 11ª Região", codigo: "080002" },
  { tribunal: "TRT12", nome: "Tribunal Regional do Trabalho da 12ª Região", codigo: "080013" },
  { tribunal: "TRT13", nome: "Tribunal Regional do Trabalho da 13ª Região", codigo: "080005" },
  { tribunal: "TRT14", nome: "Tribunal Regional do Trabalho da 14ª Região", codigo: "080015" },
  { tribunal: "TRT15", nome: "Tribunal Regional do Trabalho da 15ª Região", codigo: "080011" },
  { tribunal: "TRT16", nome: "Tribunal Regional do Trabalho da 16ª Região", codigo: "080018" },
  { tribunal: "TRT17", nome: "Tribunal Regional do Trabalho da 17ª Região", codigo: "080019" },
  { tribunal: "TRT18", nome: "Tribunal Regional do Trabalho da 18ª Região", codigo: "080020" },
  { tribunal: "TRT19", nome: "Tribunal Regional do Trabalho da 19ª Região", codigo: "080022" },
  { tribunal: "TRT20", nome: "Tribunal Regional do Trabalho da 20ª Região", codigo: "080023" },
  { tribunal: "TRT21", nome: "Tribunal Regional do Trabalho da 21ª Região", codigo: "080021" },
  { tribunal: "TRT22", nome: "Tribunal Regional do Trabalho da 22ª Região", codigo: "080024" },
  { tribunal: "TRT23", nome: "Tribunal Regional do Trabalho da 23ª Região", codigo: "080025" },
  { tribunal: "TRT24", nome: "Tribunal Regional do Trabalho da 24ª Região", codigo: "080026" },
];

export function buscarUnidadeGestora(tribunal) {
  return UNIDADES_GESTORAS_GRU_JT.find(u => u.tribunal === tribunal) || null;
}

/* CNPJs padrão de clientes recorrentes (planilha interna) — usados para
   pré-preencher o campo "pagador" da guia quando o cliente já é conhecido. */
export const CLIENTES_CNPJ = [
  { cliente: "Samsung", cnpj: "00.280.273/0002-18" },
  { cliente: "Kion", cnpj: "42.365.296/0010-85" },
  { cliente: "Vibracoustic", cnpj: "03.249.921/0005-04" },
  { cliente: "A.Schulman", cnpj: "02.376.055/0008-00" },
];

/* Links oficiais de emissão, por tipo de guia (ver proposta em
   docs/propostas/agente-guias-pagamento-judiciais.md). */
export const LINKS_EMISSAO = {
  gru_custas_jt: "https://gru.jt.jus.br/gru",
  gru_tesouro_trf: "https://pagtesouro.tesouro.gov.br/portal-gru/#/emissao-gru",
  custas_stf: "https://portal.stf.jus.br/recolhimentoDeCustas/recolhimentoDeCustas.asp",
};
