import { useMemo, useState } from "react";
import { Calendar, Info, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { calcularPrazo, chaveData, formatarData, nomeDiaSemana } from "./prazos.js";

const T = {
  azul: "#009edb", azulEscuro: "#004561", navy: "#21305a", chumbo: "#111d30",
  cinza: "#6d6e71", cinzaClaro: "#9aa1a9", bg: "#f6f7f9", surface: "#ffffff",
  linha: "#e8eaee", linhaSoft: "#f0f1f4",
  verde: "#8ebf22", vermelho: "#bb274b", laranja: "#ea5627", azulTint: "#eaf7fd",
};

function LogoFIUS({ size = 30, cor = T.azul }) {
  const altura = Math.round((size * 50) / 42);
  return (
    <svg width={size} height={altura} viewBox="0 0 42 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 2H29V11H11V48H2V2Z" fill={cor} />
      <path d="M40 2V48H13V39H31V2H40Z" fill={cor} />
    </svg>
  );
}

function hojeInputValue() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDataInput(valor) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function parseFeriadosExtras(texto) {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const [nome, dataStr] = linha.includes("-") && /\d{2}\/\d{2}\/\d{4}/.test(linha)
        ? [linha.split(/\d{2}\/\d{2}\/\d{4}/)[0].replace(/-\s*$/, "").trim(), linha.match(/\d{2}\/\d{2}\/\d{4}/)[0]]
        : [null, linha];
      const m = dataStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return null;
      const [, dia, mes, ano] = m;
      return { data: new Date(Number(ano), Number(mes) - 1, Number(dia)), nome: nome || "Feriado local" };
    })
    .filter(Boolean);
}

export default function CalculadoraPrazos() {
  const [dataInicio, setDataInicio] = useState(hojeInputValue());
  const [contarDoProximoDiaUtil, setContarDoProximoDiaUtil] = useState(true);
  const [tipoContagem, setTipoContagem] = useState("uteis");
  const [quantidadeDias, setQuantidadeDias] = useState(15);
  const [considerarRecesso, setConsiderarRecesso] = useState(true);
  const [considerarForenses, setConsiderarForenses] = useState(true);
  const [feriadosExtrasTexto, setFeriadosExtrasTexto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [contatoSalvo, setContatoSalvo] = useState(false);
  const [erroContato, setErroContato] = useState(null);

  const diasRestantes = useMemo(() => {
    if (!resultado) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diff = Math.round((resultado.dataFinal - hoje) / 86400000);
    return diff;
  }, [resultado]);

  function calcular(e) {
    e.preventDefault();
    setContatoSalvo(false);
    if (!dataInicio) { setErro("Informe a data de início do prazo."); return; }
    if (!quantidadeDias || quantidadeDias <= 0) { setErro("Informe uma quantidade de dias válida."); return; }
    setErro(null);
    const r = calcularPrazo({
      dataInicio: parseDataInput(dataInicio),
      contarDoProximoDiaUtil,
      tipoContagem,
      quantidadeDias: Number(quantidadeDias),
      considerarRecesso,
      considerarForenses,
      feriadosExtras: parseFeriadosExtras(feriadosExtrasTexto),
    });
    setResultado(r);
  }

  async function salvarContato(e) {
    e.preventDefault();
    if (!resultado) return;
    if (!email && !whatsapp) return;
    setSalvandoContato(true);
    setErroContato(null);
    try {
      const { error } = await supabase.from("calculadora_prazos_contatos").insert({
        nome: nome || null,
        email: email || null,
        whatsapp: whatsapp || null,
        data_inicio: dataInicio,
        contar_do_proximo_dia_util: contarDoProximoDiaUtil,
        tipo_contagem: tipoContagem,
        quantidade_dias: Number(quantidadeDias),
        considerar_recesso: considerarRecesso,
        considerar_forenses: considerarForenses,
        data_final: chaveData(resultado.dataFinal),
      });
      if (error) throw error;
      setContatoSalvo(true);
    } catch (err) {
      console.error("Falha ao salvar contato da calculadora:", err);
      setErroContato("Não foi possível salvar seu contato agora. Tente novamente em instantes.");
    } finally {
      setSalvandoContato(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "Rubik, system-ui, sans-serif", color: T.chumbo, padding: "40px 16px 64px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
          <LogoFIUS size={32} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-.02em" }}>CJ FIUS</div>
            <div style={{ fontSize: 10.5, color: T.cinzaClaro, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>Controladoria Jurídica</div>
          </div>
        </header>

        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 8 }}>Calculadora de Prazos Processuais</h1>
        <p style={{ fontSize: 13.5, color: T.cinza, lineHeight: 1.6, marginBottom: 22, maxWidth: 560 }}>
          Informe a data do ato que disparou o prazo (intimação, citação ou publicação) e a quantidade de dias.
          A calculadora aplica as regras do CPC — contagem a partir do 1º dia útil seguinte, exclusão de fins de semana,
          feriados e recesso forense.
        </p>

        <div style={{ background: T.azulTint, border: `1px solid ${T.azul}33`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, marginBottom: 24, fontSize: 12.5, color: T.azulEscuro, lineHeight: 1.55 }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Ferramenta de apoio, não substitui a conferência do prazo pelo(a) responsável. Feriados estaduais/municipais e regras específicas do tribunal não entram automaticamente — use o campo de feriados adicionais.</span>
        </div>

        <form onSubmit={calcular} style={{ background: T.surface, border: `1px solid ${T.linha}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <Campo label="Data de início do prazo (intimação, citação ou publicação)">
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required style={inputStyle} />
          </Campo>

          <label style={checkboxRow}>
            <input type="checkbox" checked={contarDoProximoDiaUtil} onChange={(e) => setContarDoProximoDiaUtil(e.target.checked)} />
            Contar a partir do 1º dia útil seguinte (regra padrão do CPC, art. 224)
          </label>

          <Campo label="Tipo de contagem">
            <select value={tipoContagem} onChange={(e) => setTipoContagem(e.target.value)} style={inputStyle}>
              <option value="uteis">Dias úteis — regra geral do CPC</option>
              <option value="corridos">Dias corridos — ex.: Juizados Especiais (Lei 9.099/95)</option>
            </select>
          </Campo>

          <Campo label="Quantidade de dias do prazo">
            <input type="number" min={1} value={quantidadeDias} onChange={(e) => setQuantidadeDias(e.target.value)} required style={inputStyle} />
          </Campo>

          <label style={checkboxRow}>
            <input type="checkbox" checked={considerarRecesso} onChange={(e) => setConsiderarRecesso(e.target.checked)} />
            Suspender durante o recesso forense (20/dez a 20/jan — Lei 11.416/2006, art. 62)
          </label>

          <label style={checkboxRow}>
            <input type="checkbox" checked={considerarForenses} onChange={(e) => setConsiderarForenses(e.target.checked)} />
            Considerar Carnaval e Corpus Christi como sem expediente forense (confirme no tribunal)
          </label>

          <Campo label="Feriados adicionais (estaduais/municipais) — opcional, um por linha, formato DD/MM/AAAA">
            <textarea
              value={feriadosExtrasTexto}
              onChange={(e) => setFeriadosExtrasTexto(e.target.value)}
              placeholder={"Aniversário da cidade - 25/03/2026"}
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Campo>

          {erro && <div style={{ color: T.vermelho, fontSize: 12.5, fontWeight: 600 }}>{erro}</div>}

          <button type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 18px", borderRadius: 10, border: "none", background: T.azul, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            <Calendar size={16} /> Calcular prazo
          </button>
        </form>

        {resultado && (
          <div style={{ marginTop: 22, background: T.surface, border: `1px solid ${T.linha}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.azul, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>Prazo final</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 4 }}>{formatarData(resultado.dataFinal)}</div>
            <div style={{ fontSize: 13.5, color: T.cinza, textTransform: "capitalize", marginBottom: 14 }}>{nomeDiaSemana(resultado.dataFinal)}</div>

            {diasRestantes !== null && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, padding: "5px 12px", borderRadius: 20, marginBottom: 14, background: diasRestantes < 0 ? T.vermelho + "1c" : diasRestantes <= 3 ? T.laranja + "1c" : T.verde + "1c", color: diasRestantes < 0 ? T.vermelho : diasRestantes <= 3 ? T.laranja : T.verde }}>
                {diasRestantes < 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                {diasRestantes < 0 ? `Prazo vencido há ${Math.abs(diasRestantes)} dia(s)` : diasRestantes === 0 ? "Vence hoje" : `Faltam ${diasRestantes} dia(s)`}
              </div>
            )}

            <div style={{ fontSize: 12.5, color: T.cinza, lineHeight: 1.7, borderTop: `1px solid ${T.linhaSoft}`, paddingTop: 14 }}>
              <div>Contagem começou em <strong>{formatarData(resultado.termoInicial)}</strong>.</div>
              {resultado.prorrogado && <div>O prazo caiu em dia não útil e foi prorrogado para o próximo dia útil.</div>}
              {resultado.diasPulados.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, color: T.chumbo }}>{resultado.diasPulados.length} dia(s) não útil(eis) desconsiderado(s) na contagem</summary>
                  <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                    {resultado.diasPulados.map((d, i) => (
                      <li key={i}>{formatarData(d.data)} — {d.motivo}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <form onSubmit={salvarContato} style={{ marginTop: 20, borderTop: `1px solid ${T.linhaSoft}`, paddingTop: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Quer receber esse prazo por e-mail ou WhatsApp? (opcional)</div>
              <div style={{ fontSize: 11.5, color: T.cinzaClaro, marginBottom: 12 }}>Deixe seu contato e a equipe do CJ FIUS pode te avisar se o prazo estiver perto de vencer.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} style={inputStyle} />
                <input type="tel" placeholder="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} style={inputStyle} />
              </div>
              <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} />
              {contatoSalvo ? (
                <div style={{ color: T.verde, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={15} /> Contato salvo, obrigado!</div>
              ) : (
                <>
                  <button type="submit" disabled={salvandoContato || (!email && !whatsapp)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: `1px solid ${T.linha}`, background: T.linhaSoft, color: T.chumbo, fontSize: 12.5, fontWeight: 700, cursor: salvandoContato ? "default" : "pointer", opacity: salvandoContato ? 0.6 : 1 }}>
                    <Send size={14} /> {salvandoContato ? "Salvando…" : "Salvar contato"}
                  </button>
                  {erroContato && <div style={{ color: T.vermelho, fontSize: 12, fontWeight: 600, marginTop: 8 }}>{erroContato}</div>}
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6, color: T.chumbo }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${T.linha}`,
  background: T.bg,
  fontSize: 13.5,
  color: T.chumbo,
  boxSizing: "border-box",
};

const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  fontSize: 12.5,
  color: T.cinza,
  fontWeight: 500,
  lineHeight: 1.5,
  cursor: "pointer",
};
