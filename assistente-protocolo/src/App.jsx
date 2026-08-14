import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient.js";

const T = {
  azul: "#009edb", azulEscuro: "#004561", navy: "#21305a", chumbo: "#111d30",
  cinza: "#6d6e71", cinzaClaro: "#9aa1a9", bg: "#f6f7f9", surface: "#ffffff",
  linha: "#e8eaee", linhaSoft: "#f0f1f4", vermelho: "#bb274b",
};

const NOMES_EQUIPE = ["Isabella", "Bruna", "Clara", "Lilian", "Beatris", "Rebeca", "Júlia", "Jackeline", "Eve", "Daniela", "Raíssa"];
const EMAIL_EQUIPE = "equipe@cjinova.local"; // mesma conta de equipe já usada no Hub CJ Inova

const SUGESTOES = [
  "Como protocolo um documento comprobatório no e-PAT?",
  "Como faço a distribuição de carta precatória no TJMA?",
  "Qual o passo a passo para protocolar no Eproc?",
  "Como conto o prazo de uma intimação recebida por e-mail do SEI?",
];

export default function App() {
  const [sessao, setSessao] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: assinatura } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => assinatura.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <TelaCarregando />;
  if (sessao === null) return <TelaLogin />;
  return <Chat />;
}

function TelaCarregando() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, color: T.cinza, fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif", fontSize: 13 }}>
      Carregando…
    </div>
  );
}

function TelaLogin() {
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    if (!nome) { setMensagem("Escolha quem você é."); return; }
    setMensagem(null); setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: EMAIL_EQUIPE, password: senha });
    if (error) {
      setMensagem(error.message.includes("Invalid login") ? "Senha incorreta." : error.message);
    } else {
      try { localStorage.setItem("assistente_protocolo_nome", nome); } catch {}
    }
    setCarregando(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif" }}>
      <EstilosGlobais />
      <div style={{ width: "min(380px, 92vw)", padding: "32px 28px", background: T.surface, border: `1px solid ${T.linha}`, borderRadius: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.azul, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Controladoria Jurídica</div>
        <h1 style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Assistente de Protocolo</h1>
        <p style={{ fontSize: 12.5, color: T.cinza, marginBottom: 20, lineHeight: 1.55 }}>
          Tira dúvidas sobre e-CAC, e-PAT, TJMA, PJE, e-SAJ, Eproc, SEEU, SEI e E-ambiente com base nos manuais internos. Use a mesma senha de equipe do Hub CJ Inova.
        </p>
        <form onSubmit={enviar} style={{ display: "grid", gap: 12 }}>
          <div>
            <Rotulo>Quem é você?</Rotulo>
            <select autoFocus required value={nome} onChange={(e) => setNome(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.linha}`, fontSize: 13, background: T.surface }}>
              <option value="" disabled>Selecione seu nome</option>
              {NOMES_EQUIPE.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Rotulo>Senha da equipe</Rotulo>
            <input required type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.linha}`, fontSize: 13 }} />
          </div>
          {mensagem && <div style={{ fontSize: 12, lineHeight: 1.5, color: T.vermelho }}>{mensagem}</div>}
          <button disabled={carregando} type="submit"
            style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: T.azul, color: "white", fontWeight: 700, fontSize: 13.5, cursor: carregando ? "wait" : "pointer" }}>
            {carregando ? "Aguarde…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Rotulo({ children }) {
  return <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.cinza, marginBottom: 5 }}>{children}</label>;
}

function Chat() {
  const [meuNome] = useState(() => { try { return localStorage.getItem("assistente_protocolo_nome") || ""; } catch { return ""; } });
  const [mensagens, setMensagens] = useState([]); // { autor: 'eu'|'assistente', texto, fontes?, erro? }
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef(null);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens, enviando]);

  const perguntar = async (texto) => {
    const q = texto.trim();
    if (!q || enviando) return;
    setMensagens((m) => [...m, { autor: "eu", texto: q }]);
    setPergunta("");
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ask-protocolo", {
        body: { question: q, perguntadoPor: meuNome || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMensagens((m) => [...m, { autor: "assistente", texto: data.answer, fontes: data.sources || [] }]);
    } catch (err) {
      setMensagens((m) => [...m, { autor: "assistente", erro: true, texto: `Não consegui responder agora: ${err.message || err}. Tente de novo em instantes ou avise a liderança da CJ se persistir.` }]);
    } finally {
      setEnviando(false);
    }
  };

  const sair = () => supabase.auth.signOut();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif", color: T.chumbo }}>
      <EstilosGlobais />
      <header style={{ borderBottom: `1px solid ${T.linha}`, background: T.surface, padding: "14px 22px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: T.azul, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>AP</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Assistente de Protocolo</div>
          <div style={{ fontSize: 11, color: T.cinzaClaro }}>e-CAC · e-PAT · TJMA · PJE · e-SAJ · Eproc · SEEU · SEI · E-ambiente</div>
        </div>
        <span style={{ fontSize: 12, color: T.cinza }}>{meuNome}</span>
        <button onClick={sair} style={{ fontSize: 12, color: T.cinza, background: T.linhaSoft, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>Sair</button>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {mensagens.length === 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.linha}`, borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 6 }}>Pergunte como faria a uma pessoa experiente do time</div>
              <p style={{ fontSize: 13, color: T.cinza, lineHeight: 1.6, marginBottom: 14 }}>
                As respostas citam o manual e a página exatos. Se a informação não estiver na base indexada, o assistente avisa em vez de inventar um passo.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGESTOES.map((s) => (
                  <button key={s} onClick={() => perguntar(s)} style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: 20, border: `1px solid ${T.linha}`, background: T.bg, cursor: "pointer", color: T.azulEscuro }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((m, i) => <Bolha key={i} m={m} />)}

          {enviando && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: T.cinzaClaro, padding: "0 4px" }}>
              <span className="pulso" /> consultando os manuais…
            </div>
          )}
          <div ref={fimRef} />
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${T.linha}`, background: T.surface, padding: "14px 20px" }}>
        <form
          onSubmit={(e) => { e.preventDefault(); perguntar(pergunta); }}
          style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 10 }}
        >
          <input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Digite sua dúvida sobre protocolo…"
            style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.linha}`, fontSize: 13.5 }}
          />
          <button disabled={enviando} type="submit"
            style={{ padding: "0 20px", borderRadius: 12, border: "none", background: T.azul, color: "white", fontWeight: 700, fontSize: 13.5, cursor: enviando ? "wait" : "pointer" }}>
            Enviar
          </button>
        </form>
      </footer>
    </div>
  );
}

function Bolha({ m }) {
  const souEu = m.autor === "eu";
  return (
    <div style={{ display: "flex", justifyContent: souEu ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "85%",
        background: souEu ? T.azul : T.surface,
        color: souEu ? "white" : T.chumbo,
        border: souEu ? "none" : `1px solid ${m.erro ? T.vermelho : T.linha}`,
        borderRadius: 14,
        padding: "12px 16px",
        fontSize: 13.5,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}>
        {m.texto}
        {!souEu && m.fontes && m.fontes.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.linhaSoft}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {m.fontes.map((f, i) => (
              <span key={i} title={`similaridade ${(f.similaridade * 100).toFixed(0)}%`}
                style={{ fontSize: 10.5, fontWeight: 600, color: T.azulEscuro, background: "#eaf7fd", padding: "3px 9px", borderRadius: 20 }}>
                {f.manual} · {f.secao.split("—")[0].trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EstilosGlobais() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; }
      input:focus { outline: none; border-color: ${T.azul} !important; box-shadow: 0 0 0 3px rgba(0,158,219,.14); }
      button:focus-visible { outline: 2px solid ${T.azul}; outline-offset: 2px; }
      ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-thumb { background: #d3d7dd; border-radius: 4px; }
      .pulso { width: 8px; height: 8px; border-radius: 50%; background: ${T.azul}; display: inline-block; animation: pulso 1s infinite ease-in-out; }
      @keyframes pulso { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
    `}</style>
  );
}
