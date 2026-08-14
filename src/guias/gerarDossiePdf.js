import { jsPDF } from "jspdf";

/* ══════════════════════════════════════════════════════════════
   Gera o "dossiê de preenchimento" da guia — não é a guia oficial
   (o site do tribunal é quem emite o documento com validade formal).
   É o resumo completo, com origem de cada dado, cálculo e resultado
   da conferência, pronto para: (a) conferência humana, e (b) copiar
   os campos ao preencher a guia real em gru.jt.jus.br.
══════════════════════════════════════════════════════════════ */

const linha = (doc, y) => { doc.setDrawColor(220); doc.line(15, y, 195, y); };

export function gerarDossiePdf(dossie) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(15); doc.setFont(undefined, "bold");
  doc.text("Dossiê de Conferência — Guia GRU Custas Trabalhistas", 15, y);
  y += 6;
  doc.setFontSize(9); doc.setFont(undefined, "normal"); doc.setTextColor(110);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · CJ Inova — Hub`, 15, y);
  doc.setTextColor(0);
  y += 8; linha(doc, y); y += 8;

  const campo = (rotulo, valor) => {
    doc.setFont(undefined, "bold"); doc.setFontSize(10);
    doc.text(rotulo, 15, y);
    doc.setFont(undefined, "normal");
    doc.text(String(valor ?? "—"), 75, y);
    y += 7;
  };

  doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.text("1. Identificação do processo", 15, y); y += 8;
  campo("Nº do processo:", dossie.numeroProcesso);
  campo("Tribunal:", dossie.tribunal);
  campo("Partes:", dossie.partes);
  campo("Cliente/pagador:", `${dossie.cliente || "—"}${dossie.cnpj ? " · " + dossie.cnpj : ""}`);
  y += 3; linha(doc, y); y += 8;

  doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.text("2. Dados para a guia (GRU-JT)", 15, y); y += 8;
  campo("Unidade Gestora:", dossie.unidadeGestora ? `${dossie.unidadeGestora.nome} (${dossie.unidadeGestora.codigo})` : "—");
  campo("Código de recolhimento:", dossie.codigoRecolhimento || "18720-7 (custas processuais — confirmar na guia)");
  campo("Vencimento:", dossie.vencimento || "—");
  y += 3; linha(doc, y); y += 8;

  doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.text("3. Cálculo e conferência", 15, y); y += 8;
  campo("Base de cálculo:", `R$ ${Number(dossie.calculo.baseDeCalculo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  campo("Percentual aplicado:", `${(dossie.calculo.percentualAplicado * 100).toFixed(0)}%`);
  campo("Piso mínimo aplicado:", dossie.calculo.valorMinimoAplicado ? "Sim" : "Não");
  campo("Valor calculado pelo sistema:", `R$ ${Number(dossie.conferencia.valorCalculado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  campo("Valor encontrado no processo:", dossie.conferencia.valorEncontrado != null ? `R$ ${Number(dossie.conferencia.valorEncontrado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Não informado");
  campo("Valor a constar na guia:", dossie.conferencia.valorAUsar != null ? `R$ ${Number(dossie.conferencia.valorAUsar).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "PENDENTE DE VALIDAÇÃO");
  campo("Nível de confiança:", dossie.conferencia.nivelConfianca);
  y += 2;
  doc.setFont(undefined, "italic"); doc.setFontSize(9);
  const msg = doc.splitTextToSize(dossie.conferencia.mensagem, 175);
  doc.text(msg, 15, y); y += msg.length * 5 + 4;

  if (dossie.conferencia.status === "divergente") {
    doc.setFont(undefined, "bold"); doc.setTextColor(180, 39, 75);
    doc.text("⚠ DIVERGÊNCIA — não emitir sem validação humana", 15, y); y += 6;
    doc.setFont(undefined, "normal"); doc.setFontSize(9);
    (dossie.conferencia.possiveisMotivos || []).forEach(m => {
      const t = doc.splitTextToSize(`• ${m}`, 175);
      doc.text(t, 18, y); y += t.length * 5;
    });
    doc.setTextColor(0);
    y += 3;
  }

  y += 3; linha(doc, y); y += 8;
  doc.setFontSize(11); doc.setFont(undefined, "bold"); doc.text("4. Validação humana", 15, y); y += 8;
  doc.setFontSize(10); doc.setFont(undefined, "normal");
  campo("Validado por:", dossie.validadoPor || "___________________________");
  campo("Status:", dossie.status || "Aguardando validação");
  campo("Data da validação:", dossie.dataValidacao || "___/___/______");

  y += 6;
  doc.setFontSize(8); doc.setTextColor(140);
  const rodape = doc.splitTextToSize(
    "Este documento é um dossiê de apoio interno, não a guia oficial. A guia com validade formal deve ser emitida no portal oficial " +
    "(gru.jt.jus.br) usando os dados aqui conferidos. Todos os valores devem ser revalidados por um responsável antes do pagamento.",
    175
  );
  doc.text(rodape, 15, y);

  doc.save(`dossie-guia-${(dossie.numeroProcesso || "processo").replace(/[^\d]/g, "")}.pdf`);
}
