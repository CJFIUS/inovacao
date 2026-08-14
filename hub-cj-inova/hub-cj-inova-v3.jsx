import { useState, useMemo, useEffect, useRef } from "react";
import {
  Home, Flame, Lightbulb, Rocket, Bot, MessageSquareText, GraduationCap,
  FolderOpen, BarChart3, Settings, Search, Plus, Copy, Check, Star,
  Heart, MessageCircle, ChevronRight, X, ArrowRight, Link2,
  FileText, Video, Presentation, ExternalLink, TrendingUp, Sparkles,
  Command, Clock, Users, Zap, LogOut, ShieldCheck, Calendar
} from "lucide-react";
import { supabase } from "../src/supabaseClient.js";

/* ══════════════════════════════════════════════════════════════
   CJ INOVA · Design System v2
   Marca: brandbook FIUS · Assinatura: o colchete do isotipo
   ("tudo acontece dentro do elemento gráfico")
   Tipo: Rubik (substituta web da Effra) · números tabulares
══════════════════════════════════════════════════════════════ */
const T = {
  azul: "#009edb", azulEscuro: "#004561", navy: "#21305a", chumbo: "#111d30",
  cinza: "#6d6e71", cinzaClaro: "#9aa1a9", bg: "#f6f7f9", surface: "#ffffff",
  linha: "#e8eaee", linhaSoft: "#f0f1f4",
  amarelo: "#efc517", verde: "#8ebf22", vermelho: "#bb274b", roxo: "#75398e", laranja: "#ea5627",
  azulTint: "#eaf7fd",
};

/* ───────── DADOS: dores, ideias, projetos, agentes e posts vêm do Supabase (ver supabase/schema.sql) ───────── */
const dorFromDb = (d) => ({ id: d.id, titulo: d.titulo, area: d.area, intensidade: d.intensidade, frequencia: d.frequencia, alcance: d.alcance, status: d.status });
const ideiaFromDb = (i) => ({ id: i.id, dorId: i.dor_id, nucleo: i.nucleo, titulo: i.titulo, autores: i.autores, prioridade: i.prioridade, notas: i.notas });
const projetoFromDb = (p) => ({ id: p.id, dorId: p.dor_id, nucleo: p.nucleo, titulo: p.titulo, equipe: p.equipe, prioridade: p.prioridade, previsao: p.previsao, fase: p.fase });
const agenteFromDb = (a) => ({ id: a.id, nome: a.nome, nucleo: a.nucleo, objetivo: a.objetivo, criadoPor: a.criado_por, equipe: a.equipe, link: a.link || "" });
const postFromDb = (p) => ({ id: p.id, autor: p.autor_nome || "Alguém da equipe", likesCount: p.likes_count, criadoEm: p.criado_em });

/* Sem prompts registrados ainda — a biblioteca começa vazia até o time cadastrar o primeiro. */
const SEED_PROMPTS = [];
/* Sem treinamentos publicados ainda. */
const SEED_TREINAMENTOS = [];
/* Sem documentos indexados ainda. */
const SEED_DOCS = [];
/* Sem trilha de atividade real ainda — não há log de auditoria por trás do Hub. */
const ATIVIDADES = [];

const AREAS = ["Todas", "Publicações", "Apoio", "Geral", "Relatório", "Protocolo", "Cadastro"];
const scoreDor = (d) => d.intensidade * d.frequencia;
const heatColor = (s) => s >= 20 ? T.vermelho : s >= 12 ? T.laranja : T.verde;
const corAutor = { Isa: T.azul, Bruna: T.roxo, Clara: T.verde, Lilian: T.laranja, Isabella: T.azul };

const NAV = [
  { grupo: "Visão geral", itens: [{ id: "home", nome: "Painel Geral", icone: Home }] },
  { grupo: "Fluxo da dor", itens: [
    { id: "dores", nome: "Radar de Dores", icone: Flame },
    { id: "ideias", nome: "Banco de Ideias", icone: Lightbulb },
    { id: "projetos", nome: "Projetos", icone: Rocket },
  ]},
  { grupo: "Acervo de IA", itens: [
    { id: "prompts", nome: "Biblioteca de Prompts", icone: Sparkles },
    { id: "gpts", nome: "GPTs & Skills", icone: Bot },
  ]},
  { grupo: "Conhecimento", itens: [
    { id: "treinamentos", nome: "Treinamentos", icone: GraduationCap },
    { id: "docs", nome: "Documentos", icone: FolderOpen },
  ]},
  { grupo: "Time & gestão", itens: [
    { id: "comunidade", nome: "Comunidade", icone: MessageSquareText },
    { id: "indicadores", nome: "Indicadores", icone: BarChart3 },
    { id: "admin", nome: "Administração", icone: Settings },
  ]},
  { grupo: "Ferramentas", itens: [
    { id: "calculadora-prazos", nome: "Calculadora de Prazos", icone: Calendar, href: "./calculadora.html" },
  ]},
];

/* ══════════════════ APP (portão de autenticação) ══════════════════ */
export default function HubCJInova() {
  const [sessao, setSessao] = useState(undefined); // undefined = carregando · null = deslogado
  const [perfil, setPerfil] = useState(null);
  const [erroPerfil, setErroPerfil] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => assinatura.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessao) { setPerfil(null); setErroPerfil(null); return; }
    let vivo = true;
    setErroPerfil(null);
    supabase.from("profiles").select("*").eq("id", sessao.user.id).single()
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { setErroPerfil(error.message); return; }
        setPerfil(data);
      })
      .catch((e) => { if (vivo) setErroPerfil(String(e?.message || e)); });
    return () => { vivo = false; };
  }, [sessao, tentativa]);

  if (sessao === undefined) return <TelaCarregando />;
  if (sessao === null) return <TelaLogin />;
  if (erroPerfil) {
    return (
      <TelaErro
        mensagem={erroPerfil}
        onTentarDeNovo={() => setTentativa(t => t + 1)}
        onSair={() => supabase.auth.signOut()}
      />
    );
  }
  if (!perfil) return <TelaCarregando />;

  return <HubAutenticado sessao={sessao} perfil={perfil} />;
}

function TelaCarregando() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: 14, alignItems: "center", justifyContent: "center", background: T.bg, color: T.cinza, fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif", fontSize: 13 }}>
      <LogoFIUS size={30} cor={T.azul} />
      <div>Carregando…</div>
    </div>
  );
}

function TelaErro({ mensagem, onTentarDeNovo, onSair }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif" }}>
      <div className="card" style={{ width: "min(420px, 92vw)", padding: "28px 26px", textAlign: "center" }}>
        <LogoFIUS size={28} cor={T.vermelho} />
        <h1 style={{ fontSize: 16, fontWeight: 800, marginTop: 14, marginBottom: 8 }}>Não deu para carregar seu perfil</h1>
        <p style={{ fontSize: 12.5, color: T.cinza, lineHeight: 1.55, marginBottom: 18 }}>{mensagem}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onSair} className="press" style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${T.linha}`, background: T.surface, fontSize: 13, fontWeight: 700, cursor: "pointer", color: T.chumbo }}>Sair</button>
          <button onClick={onTentarDeNovo} className="press" style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: T.azul, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Tentar de novo</button>
        </div>
      </div>
    </div>
  );
}

/* Login único da equipe: um e-mail fixo por trás das cenas, a "senha da equipe"
   cadastrada no Supabase (Authentication > Users) é a única credencial visível. */
const EMAIL_EQUIPE = "equipe@cjinova.local";

function TelaLogin() {
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const enviar = async (e) => {
    e.preventDefault();
    setMensagem(null); setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: EMAIL_EQUIPE, password: senha });
    if (error) setMensagem(error.message.includes("Invalid login") ? "Senha incorreta." : error.message);
    setCarregando(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif" }}>
      <div className="card" style={{ width: "min(360px, 92vw)", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <LogoFIUS size={30} cor={T.azul} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>CJ INOVA</div>
            <div style={{ fontSize: 9.5, color: T.cinzaClaro, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>Controladoria Jurídica</div>
          </div>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Entrar no Hub</h1>
        <p style={{ fontSize: 12.5, color: T.cinza, marginBottom: 20, lineHeight: 1.5 }}>
          Peça a senha da equipe para quem administra o Hub.
        </p>
        <form onSubmit={enviar} style={{ display: "grid", gap: 12 }}>
          <div>
            <Rotulo>Senha da equipe</Rotulo>
            <input autoFocus required type="password" value={senha} onChange={e => setSenha(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.linha}`, fontSize: 13 }} />
          </div>
          {mensagem && <div style={{ fontSize: 12, lineHeight: 1.5, color: T.vermelho }}>{mensagem}</div>}
          <button disabled={carregando} type="submit" className="press"
            style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: T.azul, color: "white", fontWeight: 700, fontSize: 13.5, cursor: carregando ? "wait" : "pointer" }}>
            {carregando ? "Aguarde…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════ APP AUTENTICADO ══════════════════ */
function HubAutenticado({ sessao, perfil }) {
  const [tela, setTela] = useState("home");
  const [dores, setDores] = useState([]);
  const [ideias, setIdeias] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [posts, setPosts] = useState([]);
  const [curtidasMinhas, setCurtidasMinhas] = useState({});
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [prompts] = useState(SEED_PROMPTS);
  const [favoritos, setFavoritos] = useState([]);
  const [copiado, setCopiado] = useState(null);
  const [dorSelecionada, setDorSelecionada] = useState(null);
  const [agenteSelecionado, setAgenteSelecionado] = useState(null);
  const [modalDor, setModalDor] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [toast, setToast] = useState(null);

  // Acesso é por senha única de equipe — todo mundo que entra tem o mesmo nível de acesso.
  const podeEditar = true;
  const ehAdmin = true;

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [rDores, rIdeias, rProjetos, rAgentes, rPosts, rCurtidas] = await Promise.all([
        supabase.from("dores").select("*").order("id"),
        supabase.from("ideias").select("*").order("id"),
        supabase.from("projetos").select("*").order("id"),
        supabase.from("agentes").select("*").order("id"),
        supabase.from("posts").select("*").order("criado_em", { ascending: false }),
        supabase.from("curtidas").select("post_id").eq("usuario_id", sessao.user.id),
      ]);
      if (!vivo) return;
      setDores((rDores.data || []).map(dorFromDb));
      setIdeias((rIdeias.data || []).map(ideiaFromDb));
      setProjetos((rProjetos.data || []).map(projetoFromDb));
      setAgentes((rAgentes.data || []).map(agenteFromDb));
      setPosts((rPosts.data || []).map(postFromDb));
      setCurtidasMinhas(Object.fromEntries((rCurtidas.data || []).map(c => [c.post_id, true])));
      setCarregandoDados(false);
    })();
    return () => { vivo = false; };
  }, [sessao.user.id]);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaleta(p => !p); }
      if (e.key === "Escape") { setPaleta(false); setDorSelecionada(null); setModalDor(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const notificar = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };
  const ideiasDe = (id) => ideias.filter(i => i.dorId === id);
  const projetosDe = (id) => projetos.filter(p => p.dorId === id);
  const copiarPrompt = (p) => {
    try { navigator.clipboard?.writeText(p.texto); } catch (e) {}
    setCopiado(p.id); setTimeout(() => setCopiado(null), 1500);
    notificar("Prompt copiado para a área de transferência");
  };
  const toggleFav = (id) => setFavoritos(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const registrarDor = async (nova) => {
    const { error } = await supabase.from("dores").insert({
      id: nova.id, titulo: nova.titulo, area: nova.area, intensidade: nova.intensidade,
      frequencia: nova.frequencia, alcance: nova.alcance, status: nova.status,
    });
    if (error) { notificar("Não deu para registrar: " + error.message); return; }
    setDores(d => [...d, nova]);
    setModalDor(false);
    notificar(`${nova.id} registrada no radar`);
  };

  const salvarLinkAgente = async (id, link) => {
    const { error } = await supabase.from("agentes").update({ link }).eq("id", id);
    if (error) { notificar("Não deu para salvar o link: " + error.message); return; }
    setAgentes(a => a.map(g => g.id === id ? { ...g, link } : g));
    setAgenteSelecionado(g => g && g.id === id ? { ...g, link } : g);
    notificar("Link do agente atualizado para todo o time");
  };

  const publicarPost = async (texto, autorNome) => {
    const { data, error } = await supabase.from("posts").insert({ autor_id: sessao.user.id, autor_nome: autorNome, texto }).select("*").single();
    if (error) { notificar("Não deu para publicar: " + error.message); return; }
    setPosts(p => [postFromDb(data), ...p]);
    notificar("Post publicado na comunidade");
  };

  const toggleLike = async (postId) => {
    const curtido = curtidasMinhas[postId];
    if (curtido) {
      const { error } = await supabase.from("curtidas").delete().eq("post_id", postId).eq("usuario_id", sessao.user.id);
      if (error) return;
      setCurtidasMinhas(c => { const n = { ...c }; delete n[postId]; return n; });
      setPosts(p => p.map(x => x.id === postId ? { ...x, likesCount: Math.max(0, x.likesCount - 1) } : x));
    } else {
      const { error } = await supabase.from("curtidas").insert({ post_id: postId, usuario_id: sessao.user.id });
      if (error) return;
      setCurtidasMinhas(c => ({ ...c, [postId]: true }));
      setPosts(p => p.map(x => x.id === postId ? { ...x, likesCount: x.likesCount + 1 } : x));
    }
  };

  const sair = () => supabase.auth.signOut();

  const props = {
    dores, ideias, projetos, prompts, agentes, posts, publicarPost, favoritos, toggleFav,
    copiado, copiarPrompt, curtidasMinhas, toggleLike, ideiasDe, projetosDe,
    setDorSelecionada, setAgenteSelecionado, setModalDor, setTela, notificar, podeEditar, ehAdmin, perfil,
  };

  return (
    <div style={{ fontFamily: "'Rubik','Segoe UI',system-ui,sans-serif", background: T.bg, minHeight: "100vh", display: "flex", color: T.chumbo }}>
      <EstilosGlobais />
      <Sidebar tela={tela} setTela={setTela} onSair={sair} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar abrirPaleta={() => setPaleta(true)} setModalDor={setModalDor} />
        <main key={tela} className="pagina" style={{ flex: 1, padding: "26px 34px 48px", maxWidth: 1180, width: "100%", margin: "0 auto" }}>
          {carregandoDados ? <TelaCarregando /> : <>
            {tela === "home" && <TelaHome {...props} />}
            {tela === "dores" && <TelaDores {...props} />}
            {tela === "ideias" && <TelaIdeias {...props} />}
            {tela === "projetos" && <TelaProjetos {...props} />}
            {tela === "prompts" && <TelaPrompts {...props} />}
            {tela === "gpts" && <TelaGPTs {...props} />}
            {tela === "treinamentos" && <TelaTreinamentos />}
            {tela === "docs" && <TelaDocs />}
            {tela === "comunidade" && <TelaComunidade {...props} />}
            {tela === "indicadores" && <TelaIndicadores {...props} />}
            {tela === "admin" && <TelaAdmin />}
          </>}
        </main>
      </div>

      {paleta && <Paleta fechar={() => setPaleta(false)} setTela={setTela} dores={dores} ideias={ideias} projetos={projetos} prompts={prompts} />}
      {dorSelecionada && <DrawerDor dor={dorSelecionada} ideias={ideiasDe(dorSelecionada.id)} projetos={projetosDe(dorSelecionada.id)} onClose={() => setDorSelecionada(null)} />}
      {agenteSelecionado && <DrawerAgente agente={agenteSelecionado} podeEditar={podeEditar} onSalvarLink={salvarLinkAgente} onClose={() => setAgenteSelecionado(null)} />}
      {modalDor && <ModalNovaDor onSalvar={registrarDor} onClose={() => setModalDor(false)} proximo={`DOR-0${36 + dores.length - 5}`} />}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function EstilosGlobais() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; }
      button, input, select, textarea { font-family: inherit; }
      .num { font-variant-numeric: tabular-nums; letter-spacing: -.02em; }

      @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      @keyframes slideDrawer { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes veil { from { opacity: 0; } to { opacity: 1; } }
      @keyframes growX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes pop { 0% { transform: scale(1); } 45% { transform: scale(1.35); } 100% { transform: scale(1); } }
      @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
      @keyframes pulseDot { 0%,100% { box-shadow: 0 0 0 0 rgba(0,158,219,.35);} 60% { box-shadow: 0 0 0 7px rgba(0,158,219,0);} }

      .pagina { animation: fadeUp .32s cubic-bezier(.2,.7,.3,1) both; }
      .stagger > * { animation: fadeUp .4s cubic-bezier(.2,.7,.3,1) both; }
      .stagger > *:nth-child(1){animation-delay:.02s} .stagger > *:nth-child(2){animation-delay:.06s}
      .stagger > *:nth-child(3){animation-delay:.10s} .stagger > *:nth-child(4){animation-delay:.14s}
      .stagger > *:nth-child(5){animation-delay:.18s} .stagger > *:nth-child(6){animation-delay:.22s}
      .stagger > *:nth-child(7){animation-delay:.26s}

      .card { background: ${T.surface}; border: 1px solid ${T.linha}; border-radius: 14px; box-shadow: 0 1px 2px rgba(17,29,48,.04); }
      .lift { transition: transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .18s, border-color .18s; }
      .lift:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(17,29,48,.09); border-color: #d8dce2; }
      .press:active { transform: scale(.985); }

      .bar-fill { transform-origin: left; animation: growX .9s cubic-bezier(.2,.7,.3,1) .15s both; }
      .heart-pop { animation: pop .35s ease; }

      /* Assinatura FIUS: o isotipo real (F/U entrelaçados) como acento tipográfico */
      .bracket { position: relative; padding-left: 17px; }
      .bracket::before { content:""; position:absolute; left:0; top:1px; bottom:1px; width:12px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 50'%3E%3Cpath d='M2 2H29V11H11V48H2V2Z' fill='%23009edb'/%3E%3Cpath d='M40 2V48H13V39H31V2H40Z' fill='%23009edb'/%3E%3C/svg%3E") no-repeat center / contain; }
      .bracket-fechado { position: relative; padding-right: 17px; }
      .bracket-fechado::after { content:""; position:absolute; right:0; top:1px; bottom:1px; width:12px; transform: scaleX(-1);
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 50'%3E%3Cpath d='M2 2H29V11H11V48H2V2Z' fill='%23009edb'/%3E%3Cpath d='M40 2V48H13V39H31V2H40Z' fill='%23009edb'/%3E%3C/svg%3E") no-repeat center / contain; }

      .nav-btn { transition: background .14s, color .14s; border-radius: 10px; position: relative; }
      .nav-btn:hover { background: ${T.linhaSoft}; }
      .nav-ativo { background: ${T.azulTint} !important; color: ${T.azulEscuro} !important; font-weight: 600; }
      .nav-ativo::before { content:""; position:absolute; left:-12px; top:8px; bottom:8px; width:6px;
        border-left:3px solid ${T.azul}; border-top:3px solid ${T.azul}; border-bottom:3px solid ${T.azul}; }

      input:focus, textarea:focus { outline: none; border-color: ${T.azul} !important; box-shadow: 0 0 0 3px rgba(0,158,219,.14); }
      button:focus-visible { outline: 2px solid ${T.azul}; outline-offset: 2px; }

      .chip { transition: all .13s; cursor: pointer; user-select: none; }
      .chip:hover { border-color: ${T.azul} !important; color: ${T.azulEscuro} !important; }

      .linha-doc { transition: background .13s; }
      .linha-doc:hover { background: ${T.linhaSoft}; }
      .linha-doc .acao-doc { opacity: 0; transition: opacity .15s; }
      .linha-doc:hover .acao-doc { opacity: 1; }

      ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-thumb { background: #d3d7dd; border-radius: 4px; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
    `}</style>
  );
}

/* ══════════════════ ESTRUTURA ══════════════════ */
function Sidebar({ tela, setTela, onSair }) {
  return (
    <aside style={{ width: 248, background: T.surface, borderRight: `1px solid ${T.linha}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
      <div style={{ padding: "20px 22px 16px", display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <LogoFIUS size={28} cor={T.azul} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-.02em" }}>CJ INOVA</div>
          <div style={{ fontSize: 9.5, color: T.cinzaClaro, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" }}>Controladoria Jurídica</div>
        </div>
      </div>
      <nav style={{ padding: "6px 16px", flex: 1, overflowY: "auto" }}>
        {NAV.map(g => (
          <div key={g.grupo} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".1em", textTransform: "uppercase", padding: "8px 12px 5px" }}>{g.grupo}</div>
            {g.itens.map(m => {
              const Ic = m.icone; const ativo = tela === m.id;
              if (m.href) {
                return (
                  <a key={m.id} href={m.href} target="_blank" rel="noopener noreferrer" className="nav-btn press"
                    style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 12px", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 500, textAlign: "left", background: "transparent", color: T.cinza, marginBottom: 1, textDecoration: "none", boxSizing: "border-box" }}>
                    <Ic size={17} color={T.cinzaClaro} strokeWidth={2} />
                    {m.nome}
                    <ExternalLink size={12} color={T.cinzaClaro} style={{ marginLeft: "auto" }} />
                  </a>
                );
              }
              return (
                <button key={m.id} onClick={() => setTela(m.id)} className={`nav-btn press ${ativo ? "nav-ativo" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 12px", border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 500, textAlign: "left", background: "transparent", color: T.cinza, marginBottom: 1 }}>
                  <Ic size={17} color={ativo ? T.azul : T.cinzaClaro} strokeWidth={ativo ? 2.2 : 2} />
                  {m.nome}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.linha}`, display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <LogoFIUS size={16} cor="white" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Equipe CJ INOVA</div>
          <div style={{ fontSize: 10.5, color: T.cinzaClaro }}>Acesso compartilhado</div>
        </div>
        <button onClick={onSair} className="press" title="Sair" style={{ background: T.linhaSoft, border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: T.cinza, flexShrink: 0 }}>
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}

function Topbar({ abrirPaleta, setModalDor }) {
  return (
    <header style={{ height: 58, background: "rgba(255,255,255,.85)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.linha}`, display: "flex", alignItems: "center", gap: 14, padding: "0 34px", position: "sticky", top: 0, zIndex: 40 }}>
      <button onClick={abrirPaleta} className="press" style={{ flex: "0 1 420px", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.linha}`, background: T.bg, cursor: "pointer", color: T.cinzaClaro, fontSize: 13 }}>
        <Search size={15} />
        <span style={{ flex: 1, textAlign: "left" }}>Buscar em todo o Hub…</span>
        <kbd style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: T.cinza, background: T.surface, border: `1px solid ${T.linha}`, borderRadius: 5, padding: "2px 6px" }}><Command size={10} />K</kbd>
      </button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: T.cinzaClaro, display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} /> qui, 09 jul 2026</span>
      <button onClick={() => setModalDor(true)} className="press lift" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: T.azul, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        <Plus size={15} strokeWidth={2.6} /> Registrar dor
      </button>
    </header>
  );
}

/* ══════════════════ COMPONENTES DA BIBLIOTECA ══════════════════ */
function Cabecalho({ eyebrow, titulo, sub, extra }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.azul, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 5 }}>{eyebrow}</div>
        <h1 className="bracket" style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.02em" }}>{titulo}</h1>
        {sub && <p style={{ fontSize: 13.5, color: T.cinza, marginTop: 6, maxWidth: 620, lineHeight: 1.55 }}>{sub}</p>}
      </div>
      {extra}
    </div>
  );
}

function LogoFIUS({ size = 28, cor = T.azul }) {
  const altura = Math.round(size * 50 / 42);
  return (
    <svg width={size} height={altura} viewBox="0 0 42 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 2H29V11H11V48H2V2Z" fill={cor} />
      <path d="M40 2V48H13V39H31V2H40Z" fill={cor} />
    </svg>
  );
}

function Badge({ texto, cor, solido }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3.5px 10px", borderRadius: 20, background: solido ? cor : cor + "1c", color: solido ? "white" : cor, whiteSpace: "nowrap" }}>{texto}</span>;
}

function Avatar({ nome, tam = 34 }) {
  const chave = nome.split(" ")[0] === "Isabella" ? "Isa" : nome.split(" ")[0];
  return <div style={{ width: tam, height: tam, borderRadius: "50%", background: corAutor[chave] || T.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: tam * .38, fontWeight: 700, flexShrink: 0 }}>{nome[0]}</div>;
}

function Chip({ ativo, onClick, children }) {
  return (
    <button onClick={onClick} className="chip press" style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, border: ativo ? `1px solid ${T.azul}` : `1px solid ${T.linha}`, background: ativo ? T.azul : T.surface, color: ativo ? "white" : T.cinza }}>{children}</button>
  );
}

function CampoBusca({ valor, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: "1 1 240px" }}>
      <Search size={15} style={{ position: "absolute", left: 13, top: 12, color: T.cinzaClaro }} />
      <input value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "10.5px 14px 10.5px 38px", borderRadius: 10, border: `1px solid ${T.linha}`, background: T.surface, fontSize: 13, transition: "border-color .15s, box-shadow .15s" }} />
    </div>
  );
}

function Vazio({ titulo, sub, acao }) {
  return (
    <div className="card" style={{ padding: "44px 24px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><LogoFIUS size={30} cor={T.linha} /></div>
      <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 12.5, color: T.cinza, marginBottom: acao ? 16 : 0 }}>{sub}</div>
      {acao}
    </div>
  );
}

function Barra({ pct, cor, alt = 7 }) {
  return (
    <div style={{ height: alt, background: T.linhaSoft, borderRadius: alt / 2, overflow: "hidden" }}>
      <div className="bar-fill" style={{ width: `${pct}%`, height: "100%", background: cor, borderRadius: alt / 2 }} />
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", bottom: 26, left: "50%", zIndex: 200, animation: "toastIn .3s cubic-bezier(.2,.7,.3,1) both", transform: "translateX(-50%)", background: T.chumbo, color: "white", borderRadius: 12, padding: "12px 18px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 9, boxShadow: "0 12px 32px rgba(17,29,48,.3)" }}>
      <Check size={15} color={T.verde} strokeWidth={3} /> {msg}
    </div>
  );
}

/* ══════════════════ ⌘K PALETA DE COMANDOS ══════════════════ */
function Paleta({ fechar, setTela, dores, ideias, projetos, prompts }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const resultados = useMemo(() => {
    const termo = q.toLowerCase();
    const navs = NAV.flatMap(g => g.itens).filter(m => m.nome.toLowerCase().includes(termo)).map(m => ({ tipo: "Ir para", nome: m.nome, tela: m.id }));
    if (termo.length < 2) return navs.slice(0, 6);
    return [
      ...navs,
      ...dores.filter(d => (d.titulo + d.id).toLowerCase().includes(termo)).map(x => ({ tipo: "Dor", nome: `${x.id} · ${x.titulo}`, tela: "dores" })),
      ...ideias.filter(i => (i.titulo + i.id).toLowerCase().includes(termo)).map(x => ({ tipo: "Ideia", nome: `${x.id} · ${x.titulo}`, tela: "ideias" })),
      ...projetos.filter(p => (p.titulo + p.id).toLowerCase().includes(termo)).map(x => ({ tipo: "Projeto", nome: `${x.id} · ${x.titulo}`, tela: "projetos" })),
      ...prompts.filter(p => (p.titulo + p.tags.join(" ")).toLowerCase().includes(termo)).map(x => ({ tipo: "Prompt", nome: x.titulo, tela: "prompts" })),
      ...SEED_DOCS.filter(d => d.nome.toLowerCase().includes(termo)).map(x => ({ tipo: "Documento", nome: x.nome, tela: "docs" })),
    ].slice(0, 9);
  }, [q, dores, ideias, projetos, prompts]);

  return (
    <div onClick={fechar} style={{ position: "fixed", inset: 0, background: "rgba(17,29,48,.4)", zIndex: 150, display: "flex", justifyContent: "center", paddingTop: "12vh", animation: "veil .18s ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(580px, 92%)", height: "fit-content", background: T.surface, borderRadius: 16, boxShadow: "0 24px 64px rgba(17,29,48,.28)", overflow: "hidden", animation: "fadeUp .22s cubic-bezier(.2,.7,.3,1) both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "15px 18px", borderBottom: `1px solid ${T.linha}` }}>
          <Search size={17} color={T.cinzaClaro} />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar dores, ideias, prompts, documentos ou navegar…"
            style={{ flex: 1, border: "none", fontSize: 14.5, background: "transparent", boxShadow: "none" }} />
          <kbd style={{ fontSize: 10.5, fontWeight: 700, color: T.cinzaClaro, border: `1px solid ${T.linha}`, borderRadius: 5, padding: "2px 7px" }}>esc</kbd>
        </div>
        <div style={{ padding: 8, maxHeight: 340, overflowY: "auto" }}>
          {resultados.length === 0 && <div style={{ padding: 20, fontSize: 13, color: T.cinza, textAlign: "center" }}>Nada encontrado para “{q}”. Tente outro termo.</div>}
          {resultados.map((r, i) => (
            <button key={i} onClick={() => { setTela(r.tela); fechar(); }} className="nav-btn press"
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, textAlign: "left", color: T.chumbo }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.azulEscuro, background: T.azulTint, padding: "3px 8px", borderRadius: 6, minWidth: 74, textAlign: "center" }}>{r.tipo}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nome}</span>
              <ChevronRight size={14} color={T.cinzaClaro} style={{ marginLeft: "auto", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ HOME ══════════════════ */
function TelaHome({ dores, ideias, projetos, prompts, agentes, posts, setTela, ideiasDe }) {
  const semIdeia = dores.filter(d => ideiasDe(d.id).length === 0).length;
  const ideiasVinculadas = ideias.filter(i => i.dorId).length;
  const projetosVinculados = projetos.filter(p => p.dorId).length;
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-.02em" }}>{saudacao}, equipe 👋</h1>
        <p style={{ fontSize: 13.5, color: T.cinza, marginTop: 4 }}>
          {semIdeia > 0
            ? <>Há <strong style={{ color: T.vermelho }}>{semIdeia} {semIdeia === 1 ? "dor" : "dores"} sem ideia</strong> no radar esperando resposta. Vamos juntos?</>
            : "Todas as dores do radar têm pelo menos uma ideia ancorada. Excelente sinal."}
        </p>
      </div>

      {/* Funil vivo: a espinha dorsal do CJ INOVA */}
      <div className="card" style={{ padding: "22px 26px", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>Fluxo da dor · trimestre atual</div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
          <EtapaFunil n={dores.length} label="Dores no radar" cor={T.azul} onClick={() => setTela("dores")} />
          <ConectorFunil vinculados={ideiasVinculadas} total={ideias.length} label="vinculadas a uma dor" />
          <EtapaFunil n={ideias.length} label="Ideias no banco" cor={T.amarelo} onClick={() => setTela("ideias")} />
          <ConectorFunil vinculados={projetosVinculados} total={projetos.length} label="vinculados a uma dor" />
          <EtapaFunil n={projetos.length} label="Projetos em curso" cor={T.verde} onClick={() => setTela("projetos")} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, alignItems: "start" }}>
        <div>
          <SubTitulo acao={<LinkVer onClick={() => setTela("projetos")} />}>Projetos em andamento</SubTitulo>
          <div className="stagger" style={{ display: "grid", gap: 12 }}>
            {projetos.map(p => <CardProjeto key={p.id} p={p} horizontal />)}
          </div>

          <SubTitulo acao={<LinkVer onClick={() => setTela("comunidade")} />}>Últimas da comunidade</SubTitulo>
          {posts.length === 0 ? (
            <div className="card" style={{ padding: "20px 22px", fontSize: 12.5, color: T.cinza }}>Nenhum post ainda — seja a primeira pessoa a compartilhar algo com o time.</div>
          ) : (
          <div className="card" style={{ padding: "4px 22px" }}>
            {posts.slice(0, 2).map((post, i) => (
              <div key={post.id} style={{ padding: "15px 0", borderBottom: i === 0 && posts.length > 1 ? `1px solid ${T.linhaSoft}` : "none", display: "flex", gap: 13 }}>
                <Avatar nome={post.autor} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{post.autor} <span style={{ fontWeight: 400, color: T.cinzaClaro }}>· {tempoRelativo(post.criadoEm)}</span></div>
                  <p style={{ fontSize: 13, marginTop: 4, lineHeight: 1.55, color: "#2a3442" }}>{post.texto}</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <div>
          <SubTitulo>Atalhos</SubTitulo>
          <div className="stagger" style={{ display: "grid", gap: 8, marginBottom: 22 }}>
            <Atalho icone={Sparkles} label="Copiar um prompt do acervo" onClick={() => setTela("prompts")} n={prompts.length} />
            <Atalho icone={Bot} label="Abrir um GPT da CJ" onClick={() => setTela("gpts")} n={agentes.length} />
            <Atalho icone={FolderOpen} label="Achar um POP ou modelo" onClick={() => setTela("docs")} n={SEED_DOCS.length} />
            <Atalho icone={GraduationCap} label="Assistir um treinamento" onClick={() => setTela("treinamentos")} n={SEED_TREINAMENTOS.length} />
          </div>

          <SubTitulo>Atividade recente</SubTitulo>
          {ATIVIDADES.length === 0 ? (
            <div className="card" style={{ padding: "18px 20px", fontSize: 12.5, color: T.cinza }}>Sem atividade registrada ainda.</div>
          ) : (
          <div className="card" style={{ padding: "18px 20px" }}>
            {ATIVIDADES.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < ATIVIDADES.length - 1 ? 16 : 0, position: "relative" }}>
                {i < ATIVIDADES.length - 1 && <div style={{ position: "absolute", left: 4.5, top: 14, bottom: 0, width: 1.5, background: T.linhaSoft }} />}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.azul, marginTop: 3, flexShrink: 0, animation: i === 0 ? "pulseDot 2.4s infinite" : "none" }} />
                <div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45 }}><strong>{a.quem}</strong> {a.acao} <span style={{ color: T.azulEscuro, fontWeight: 600 }}>{a.alvo}</span></div>
                  <div style={{ fontSize: 11, color: T.cinzaClaro, marginTop: 2 }}>{a.quando}</div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EtapaFunil({ n, label, cor, onClick }) {
  return (
    <button onClick={onClick} className="press" style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "0 10px" }}>
      <div className="num" style={{ fontSize: 38, fontWeight: 800, color: cor, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: T.cinza, fontWeight: 600, marginTop: 6 }}>{label}</div>
    </button>
  );
}

function ConectorFunil({ vinculados, total, label }) {
  const pct = total ? Math.round((vinculados / total) * 100) : 0;
  return (
    <div style={{ flex: 1, minWidth: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 6px" }}>
      <span className="num" style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, whiteSpace: "nowrap" }}>{vinculados} de {total} {label}</span>
      <div style={{ width: "100%", position: "relative" }}>
        <Barra pct={pct} cor={T.azul} alt={4} />
      </div>
    </div>
  );
}

function SubTitulo({ children, acao }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 12px" }}>
      <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: T.cinza }}>{children}</h2>{acao}
    </div>
  );
}

function LinkVer({ onClick }) {
  return <button onClick={onClick} className="press" style={{ background: "none", border: "none", color: T.azul, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>Ver tudo <ChevronRight size={14} /></button>;
}

function Atalho({ icone: Ic, label, onClick, n }) {
  return (
    <button onClick={onClick} className="card lift press" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer", textAlign: "left" }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: T.azulTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic size={17} color={T.azul} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>
      <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: T.cinzaClaro }}>{n}</span>
      <ChevronRight size={15} color={T.cinzaClaro} />
    </button>
  );
}

function CardProjeto({ p, horizontal }) {
  const corFase = p.fase === "Em Teste" ? T.verde : T.azul;
  const corPrioridade = p.prioridade === "Alta" ? T.laranja : p.prioridade === "Média" ? T.azul : T.cinza;
  return (
    <div className="card lift" style={{ padding: horizontal ? "15px 18px" : 16, display: horizontal ? "flex" : "block", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
          <span className="num" style={{ fontSize: 10.5, fontWeight: 700, color: T.azulEscuro }}>{p.id}</span>
          <span style={{ fontSize: 10.5, color: T.cinzaClaro }}>{p.nucleo}</span>
          {p.dorId && <span style={{ fontSize: 10.5, color: T.cinzaClaro, display: "flex", alignItems: "center", gap: 3 }}><Link2 size={10} /> {p.dorId}</span>}
          <Badge texto={p.fase} cor={corFase} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: horizontal ? 0 : 8 }}>{p.titulo}</div>
        {!horizontal && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 11.5, color: T.cinza }}>{p.equipe}</span>
            <Badge texto={p.prioridade} cor={corPrioridade} />
          </div>
        )}
        {!horizontal && <div className="num" style={{ fontSize: 11, color: T.cinzaClaro, marginTop: 6 }}>Previsão: <strong style={{ color: T.chumbo, fontWeight: 700 }}>{p.previsao}</strong></div>}
      </div>
      {horizontal && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 11.5, color: T.cinza, maxWidth: 150, textAlign: "right" }}>{p.equipe}</span>
          <Badge texto={p.prioridade} cor={corPrioridade} />
          <div style={{ textAlign: "right", minWidth: 64 }}>
            <div className="num" style={{ fontSize: 12.5, fontWeight: 800, color: T.chumbo }}>{p.previsao}</div>
            <div style={{ fontSize: 9.5, color: T.cinzaClaro, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>previsão</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ RADAR DE DORES ══════════════════ */
function TelaDores({ dores, ideiasDe, projetosDe, setDorSelecionada, setModalDor }) {
  const [busca, setBusca] = useState("");
  const [area, setArea] = useState("Todas");
  const filtradas = dores
    .filter(d => area === "Todas" || d.area === area)
    .filter(d => (d.titulo + d.id).toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => scoreDor(b) - scoreDor(a));

  return (
    <div>
      <Cabecalho eyebrow="Fluxo da dor" titulo="Radar de Dores"
        sub="A dor é a moeda do CJ INOVA. O calor (intensidade × frequência) define quem sobe no radar — não opinião, dado." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar dor ou código (DOR-014)" />
            {AREAS.map(a => <Chip key={a} ativo={area === a} onClick={() => setArea(a)}>{a}</Chip>)}
          </div>

          {filtradas.length === 0 ? (
            <Vazio titulo="Nenhuma dor aqui" sub="Ajuste os filtros — ou registre a primeira dor desta área."
              acao={<button onClick={() => setModalDor(true)} className="press" style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: T.azul, color: "white", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Registrar dor</button>} />
          ) : (
            <div className="stagger" style={{ display: "grid", gap: 10 }}>
              {filtradas.map(d => {
                const s = scoreDor(d), nI = ideiasDe(d.id).length, nP = projetosDe(d.id).length;
                return (
                  <div key={d.id} onClick={() => setDorSelecionada(d)} className="card lift press" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                    <div className="num" style={{ minWidth: 52, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: heatColor(s), lineHeight: 1 }}>{s}</div>
                      <div style={{ fontSize: 9.5, color: T.cinzaClaro, fontWeight: 700, letterSpacing: ".06em", marginTop: 3 }}>CALOR</div>
                    </div>
                    <div style={{ width: 1, alignSelf: "stretch", background: T.linhaSoft }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="num" style={{ fontSize: 10.5, fontWeight: 700, color: T.azulEscuro }}>{d.id}</span>
                        <Badge texto={d.status} cor={d.status === "Priorizada" ? T.laranja : d.status === "Em exploração" ? T.azul : T.cinza} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{d.titulo}</div>
                      <div style={{ fontSize: 11.5, color: T.cinza }}>{d.area} · {d.alcance}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <FluxoNum n={nI} label="ideias" cor={T.amarelo} />
                      <ArrowRight size={12} color={T.linha} />
                      <FluxoNum n={nP} label="proj." cor={T.verde} />
                      <ChevronRight size={16} color={T.cinzaClaro} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quadrante intensidade × frequência */}
        <div className="card" style={{ padding: 18, position: "sticky", top: 78 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>Mapa de calor</div>
          <svg viewBox="0 0 240 220" style={{ width: "100%" }}>
            <rect x="34" y="8" width="196" height="180" fill={T.bg} rx="10" />
            <line x1="132" y1="8" x2="132" y2="188" stroke={T.linha} strokeWidth="1" strokeDasharray="3 4" />
            <line x1="34" y1="98" x2="230" y2="98" stroke={T.linha} strokeWidth="1" strokeDasharray="3 4" />
            {dores.map(d => {
              const cx = 34 + ((d.frequencia - .5) / 5) * 196;
              const cy = 188 - ((d.intensidade - .5) / 5) * 180;
              return (
                <g key={d.id} style={{ cursor: "pointer" }} onClick={() => setDorSelecionada(d)}>
                  <circle cx={cx} cy={cy} r="9" fill={heatColor(scoreDor(d))} opacity=".22" />
                  <circle cx={cx} cy={cy} r="5" fill={heatColor(scoreDor(d))} />
                  <title>{d.id} · {d.titulo}</title>
                </g>
              );
            })}
            <text x="132" y="212" textAnchor="middle" fontSize="9.5" fill={T.cinzaClaro} fontWeight="600">FREQUÊNCIA →</text>
            <text x="14" y="98" textAnchor="middle" fontSize="9.5" fill={T.cinzaClaro} fontWeight="600" transform="rotate(-90 14 98)">INTENSIDADE →</text>
          </svg>
          <div style={{ fontSize: 11.5, color: T.cinza, lineHeight: 1.5, marginTop: 10 }}>
            O quadrante superior direito é a zona crítica: dói muito e dói sempre. Clique num ponto para abrir a dor.
          </div>
        </div>
      </div>
    </div>
  );
}

function FluxoNum({ n, label, cor }) {
  return (
    <div className="num" style={{ textAlign: "center", opacity: n === 0 ? .35 : 1, minWidth: 34 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: n === 0 ? T.cinzaClaro : cor }}>{n}</div>
      <div style={{ color: T.cinzaClaro, fontSize: 10 }}>{label}</div>
    </div>
  );
}

/* ══════════════════ DRAWER DA DOR ══════════════════ */
function DrawerDor({ dor, ideias, projetos, onClose }) {
  const s = scoreDor(dor);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,29,48,.42)", display: "flex", justifyContent: "flex-end", zIndex: 100, animation: "veil .18s ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(500px,100%)", background: T.bg, height: "100%", overflowY: "auto", animation: "slideDrawer .28s cubic-bezier(.2,.7,.3,1) both", boxShadow: "-16px 0 48px rgba(17,29,48,.18)" }}>
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.linha}`, padding: "22px 26px", position: "sticky", top: 0, zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: T.azulEscuro }}>{dor.id}</span>
              <Badge texto={`calor ${s}`} cor={heatColor(s)} solido />
              <Badge texto={dor.status} cor={T.cinza} />
            </div>
            <button onClick={onClose} className="press" style={{ background: T.linhaSoft, border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: T.cinza }}><X size={16} /></button>
          </div>
          <h2 className="bracket" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>{dor.titulo}</h2>
          <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: T.cinza, flexWrap: "wrap" }}>
            <span>📍 {dor.area}</span><span>👥 {dor.alcance}</span>
            <span className="num">Intensidade {dor.intensidade}/5 · Frequência {dor.frequencia}/5</span>
          </div>
        </div>

        <div style={{ padding: "22px 26px" }}>
          <SecaoFluxo icone={<Lightbulb size={15} color={T.amarelo} />} titulo="Ideias ancoradas" vazio="Nenhuma ideia ainda — esta dor está esperando resposta.">
            {ideias.map(i => <CardFluxo key={i.id} codigo={i.id} titulo={i.titulo} meta={i.autores} direita={<Badge texto={i.prioridade} cor={i.prioridade === "Alta" ? T.laranja : i.prioridade === "Média" ? T.azul : T.cinza} />} cor={T.amarelo} />)}
          </SecaoFluxo>
          <div style={{ textAlign: "center", margin: "6px 0" }}><ArrowRight size={16} color={T.linha} style={{ transform: "rotate(90deg)" }} /></div>
          <SecaoFluxo icone={<Rocket size={15} color={T.verde} />} titulo="Projetos que nasceram daqui" vazio="Nenhuma ideia virou projeto ainda.">
            {projetos.map(p => <CardFluxo key={p.id} codigo={p.id} titulo={p.titulo} meta={`${p.equipe} · ${p.fase}`} direita={<Badge texto={p.previsao} cor={T.cinza} />} cor={T.verde} />)}
          </SecaoFluxo>
          <div className="card" style={{ marginTop: 20, padding: 15, fontSize: 12, color: T.cinza, display: "flex", gap: 10, lineHeight: 1.55, border: `1px dashed ${T.linha}` }}>
            <Link2 size={14} color={T.azul} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>O rastro <strong style={{ color: T.chumbo }}>{dor.id}</strong> acompanha cada ideia e projeto — a prova de que o trabalho começou numa dor real.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecaoFluxo({ icone, titulo, children, vazio }) {
  const itens = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        {icone}<h3 style={{ fontSize: 12.5, fontWeight: 800 }}>{titulo}</h3>
        <span className="num" style={{ fontSize: 11.5, color: T.cinzaClaro }}>({itens.length})</span>
      </div>
      {itens.length === 0
        ? <div className="card" style={{ padding: 14, fontSize: 12, color: T.cinza, fontStyle: "italic" }}>{vazio}</div>
        : <div style={{ display: "grid", gap: 8 }}>{itens}</div>}
    </div>
  );
}

function CardFluxo({ codigo, titulo, meta, direita, cor }) {
  return (
    <div className="card" style={{ padding: "12px 14px", borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, alignItems: "center" }}>
        <span className="num" style={{ fontSize: 10.5, fontWeight: 700, color: T.azulEscuro }}>{codigo}</span>
        {direita}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{titulo}</div>
      <div style={{ fontSize: 11.5, color: T.cinza, marginTop: 2 }}>{meta}</div>
    </div>
  );
}

/* ══════════════════ MODAL NOVA DOR ══════════════════ */
function ModalNovaDor({ onSalvar, onClose, proximo }) {
  const [f, setF] = useState({ titulo: "", area: "Publicações", intensidade: 3, frequencia: 3, alcance: "" });
  const calor = f.intensidade * f.frequencia;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,29,48,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: 18, animation: "veil .18s ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 18, width: "min(480px,100%)", overflow: "hidden", animation: "fadeUp .24s cubic-bezier(.2,.7,.3,1) both", boxShadow: "0 24px 64px rgba(17,29,48,.25)" }}>
        <div style={{ padding: "20px 26px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 className="bracket" style={{ fontSize: 17, fontWeight: 800 }}>Registrar uma dor</h2>
            <div className="num" style={{ fontSize: 11.5, color: T.cinzaClaro, marginTop: 4 }}>Será registrada como {proximo}</div>
          </div>
          <button onClick={onClose} className="press" style={{ background: T.linhaSoft, border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: T.cinza }}><X size={16} /></button>
        </div>
        <div style={{ padding: "18px 26px 24px", display: "grid", gap: 15 }}>
          <p style={{ fontSize: 12.5, color: T.cinza, lineHeight: 1.5 }}>Descreva o incômodo real do dia a dia. A solução vem depois — aqui só mora o problema.</p>
          <div>
            <Rotulo>Qual é a dor?</Rotulo>
            <textarea value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} rows={2} placeholder="Ex: Refaço a mesma conferência toda semana"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 11, border: `1px solid ${T.linha}`, fontSize: 13.5, background: T.surface, resize: "none", lineHeight: 1.5, transition: "border-color .15s, box-shadow .15s" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Rotulo>Área</Rotulo>
              <select value={f.area} onChange={e => setF({ ...f, area: e.target.value })}
                style={{ width: "100%", padding: "10.5px 12px", borderRadius: 11, border: `1px solid ${T.linha}`, fontSize: 13, background: T.surface }}>
                {AREAS.filter(a => a !== "Todas").map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <Rotulo>Quem sente?</Rotulo>
              <input value={f.alcance} onChange={e => setF({ ...f, alcance: e.target.value })} placeholder="Ex: 4 analistas"
                style={{ width: "100%", padding: "10.5px 14px", borderRadius: 11, border: `1px solid ${T.linha}`, fontSize: 13, background: T.surface, transition: "border-color .15s, box-shadow .15s" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <Faixa label={`Intensidade · ${f.intensidade}/5`} v={f.intensidade} on={v => setF({ ...f, intensidade: v })} />
            <Faixa label={`Frequência · ${f.frequencia}/5`} v={f.frequencia} on={v => setF({ ...f, frequencia: v })} />
          </div>
          <div style={{ padding: "12px 14px", borderRadius: 11, background: heatColor(calor) + "14", fontSize: 12.5, display: "flex", alignItems: "center", gap: 9 }}>
            <TrendingUp size={15} color={heatColor(calor)} />
            <span>Calor: <strong className="num" style={{ color: heatColor(calor), fontSize: 14 }}>{calor}</strong> — quanto maior, mais alto no radar.</span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} className="press" style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${T.linha}`, background: T.surface, fontSize: 13, fontWeight: 700, cursor: "pointer", color: T.chumbo }}>Cancelar</button>
            <button disabled={!f.titulo.trim()} className="press"
              onClick={() => onSalvar({ id: proximo, titulo: f.titulo.trim(), area: f.area, intensidade: f.intensidade, frequencia: f.frequencia, alcance: f.alcance || "A definir", status: "Registrada" })}
              style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: f.titulo.trim() ? T.azul : T.linha, color: "white", fontSize: 13, fontWeight: 700, cursor: f.titulo.trim() ? "pointer" : "not-allowed", transition: "background .15s" }}>
              Salvar no radar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rotulo({ children }) { return <label style={{ fontSize: 11.5, fontWeight: 700, display: "block", marginBottom: 6, color: T.chumbo }}>{children}</label>; }
function Faixa({ label, v, on }) {
  return (
    <div style={{ flex: 1 }}>
      <Rotulo>{label}</Rotulo>
      <input type="range" min={1} max={5} value={v} onChange={e => on(Number(e.target.value))} style={{ width: "100%", accentColor: T.azul }} />
    </div>
  );
}

/* ══════════════════ BANCO DE IDEIAS ══════════════════ */
function TelaIdeias({ ideias, dores, setTela }) {
  const dorDe = (id) => dores.find(d => d.id === id);
  const corPrioridade = (p) => p === "Alta" ? T.laranja : p === "Média" ? T.azul : T.cinza;
  return (
    <div>
      <Cabecalho eyebrow="Fluxo da dor" titulo="Banco de Ideias"
        sub="Ideias mapeadas pelo time para futura avaliação e priorização. Quando uma ideia já responde a uma dor do radar, o rastro DOR-XXX aparece no card." />
      <div className="stagger" style={{ display: "grid", gap: 12 }}>
        {ideias.map(i => {
          const dor = i.dorId ? dorDe(i.dorId) : null;
          return (
            <div key={i.id} className="card lift" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                    <span className="num" style={{ fontSize: 10.5, fontWeight: 700, color: T.azulEscuro }}>{i.id}</span>
                    {dor ? (
                      <button onClick={() => setTela("dores")} className="press" style={{ background: T.azulTint, border: "none", color: T.azulEscuro, fontSize: 10.5, cursor: "pointer", fontWeight: 700, padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <Link2 size={10} /> {i.dorId}
                      </button>
                    ) : (
                      <Badge texto="Backlog" cor={T.cinza} />
                    )}
                    <span style={{ fontSize: 10.5, color: T.cinzaClaro }}>{i.nucleo}</span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{i.titulo}</div>
                  {dor && <div style={{ fontSize: 12, color: T.cinza, marginTop: 3, fontStyle: "italic" }}>responde a: “{dor.titulo}”</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <Badge texto={i.prioridade} cor={corPrioridade(i.prioridade)} />
                  <span style={{ fontSize: 12, color: T.cinza, maxWidth: 170, textAlign: "right" }}>{i.autores}</span>
                </div>
              </div>
              {i.notas && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.linhaSoft}`, fontSize: 12, color: T.cinza, display: "flex", alignItems: "center", gap: 6 }}>
                  <Zap size={13} color={T.amarelo} /> {i.notas}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════ PROJETOS ══════════════════ */
function TelaProjetos({ projetos }) {
  const fases = [
    { nome: "Em Desenvolvimento", cor: T.azul }, { nome: "Em Teste", cor: T.verde },
  ];
  return (
    <div>
      <Cabecalho eyebrow="Fluxo da dor" titulo="Projetos"
        sub="Do papel para a operação. Todo card exibe o rastro completo PRJ ← IDE ← DOR." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
        {fases.map(fase => {
          const doFase = projetos.filter(p => p.fase === fase.nome);
          return (
            <div key={fase.nome} style={{ background: T.linhaSoft + "88", borderRadius: 14, padding: "12px 12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "2px 6px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: fase.cor }} />
                <h3 style={{ fontSize: 12.5, fontWeight: 800 }}>{fase.nome}</h3>
                <span className="num" style={{ fontSize: 11, color: T.cinzaClaro, fontWeight: 700, marginLeft: "auto", background: T.surface, borderRadius: 10, padding: "1px 8px" }}>{doFase.length}</span>
              </div>
              <div className="stagger" style={{ display: "grid", gap: 9 }}>
                {doFase.map(p => <CardProjeto key={p.id} p={p} />)}
                {doFase.length === 0 && (
                  <div style={{ padding: "20px 14px", fontSize: 12, color: T.cinzaClaro, textAlign: "center", border: `1.5px dashed ${T.linha}`, borderRadius: 12 }}>
                    Nenhum projeto nesta fase
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════ BIBLIOTECA DE PROMPTS ══════════════════ */
function TelaPrompts({ prompts, favoritos, toggleFav, copiado, copiarPrompt }) {
  const [busca, setBusca] = useState("");
  const [ferr, setFerr] = useState("Todas");
  const [soFav, setSoFav] = useState(false);
  const ferramentas = ["Todas", "Claude", "ChatGPT", "Copilot"];
  const lista = prompts
    .filter(p => ferr === "Todas" || p.ferramenta === ferr)
    .filter(p => !soFav || favoritos.includes(p.id))
    .filter(p => (p.titulo + p.tags.join(" ")).toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <Cabecalho eyebrow="Acervo de IA" titulo="Biblioteca de Prompts"
        sub="Prompts testados pela equipe, prontos para copiar, adaptar e avaliar. Conhecimento que não mora mais no bloco de notas de cada um." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar por título ou tag" />
        {ferramentas.map(fr => <Chip key={fr} ativo={ferr === fr} onClick={() => setFerr(fr)}>{fr}</Chip>)}
        <Chip ativo={soFav} onClick={() => setSoFav(!soFav)}>★ Favoritos</Chip>
      </div>

      {lista.length === 0 ? (
        <Vazio titulo="Nenhum prompt encontrado" sub={soFav ? "Você ainda não favoritou prompts com esses filtros." : "Tente outro termo ou ferramenta."} />
      ) : (
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
          {lista.map(p => {
            const fav = favoritos.includes(p.id);
            const corFerr = p.ferramenta === "Claude" ? T.laranja : p.ferramenta === "ChatGPT" ? T.verde : T.azul;
            return (
              <div key={p.id} className="card lift" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                  <Badge texto={p.ferramenta} cor={corFerr} />
                  <button onClick={() => toggleFav(p.id)} className="press" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} aria-label="Favoritar">
                    <Star size={16} className={fav ? "heart-pop" : ""} color={fav ? T.amarelo : T.linha} fill={fav ? T.amarelo : "none"} />
                  </button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 7, lineHeight: 1.35 }}>{p.titulo}</div>
                <div style={{ fontSize: 11.5, color: T.cinza, background: T.bg, borderRadius: 10, padding: "10px 12px", lineHeight: 1.55, flex: 1, marginBottom: 10, maxHeight: 88, overflow: "hidden", position: "relative", fontFamily: "ui-monospace, Menlo, monospace" }}>
                  {p.texto}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 30, background: `linear-gradient(transparent, ${T.bg})` }} />
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
                  {p.tags.map(t => <span key={t} style={{ fontSize: 10.5, color: T.azulEscuro, background: T.azulTint, padding: "2.5px 9px", borderRadius: 6, fontWeight: 700 }}>#{t}</span>)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="num" style={{ fontSize: 11.5, color: T.cinza }}>★ {p.avaliacao} · {p.usos} usos · {p.autor}</span>
                  <button onClick={() => copiarPrompt(p)} className="press"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "none", background: copiado === p.id ? T.verde : T.azul, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background .2s", minWidth: 96, justifyContent: "center" }}>
                    {copiado === p.id ? <><Check size={13} strokeWidth={3} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ GPTs & SKILLS ══════════════════ */
function TelaGPTs({ agentes, setAgenteSelecionado }) {
  const [busca, setBusca] = useState("");
  const [nucleo, setNucleo] = useState("Todos");
  const nucleos = ["Todos", ...new Set(agentes.map(g => g.nucleo))];
  const lista = agentes
    .filter(g => nucleo === "Todos" || g.nucleo === nucleo)
    .filter(g => g.nome.toLowerCase().includes(busca.toLowerCase()));
  return (
    <div>
      <Cabecalho eyebrow="Acervo de IA" titulo="GPTs & Skills"
        sub="Os agentes de IA já em uso pela Controladoria Jurídica, por núcleo — quem criou, quem ajudou a construir." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar agente" />
        {nucleos.map(n => <Chip key={n} ativo={nucleo === n} onClick={() => setNucleo(n)}>{n}</Chip>)}
      </div>
      {lista.length === 0 ? (
        <Vazio titulo="Nenhum agente encontrado" sub="Tente outro termo ou mude o núcleo." />
      ) : (
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {lista.map(g => (
            <div key={g.id} className="card lift" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: T.chumbo, display: "flex", alignItems: "center", justifyContent: "center" }}><LogoFIUS size={19} cor={T.azul} /></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge texto={g.nucleo} cor={T.cinza} />
                  <Badge texto="Em Uso" cor={T.verde} />
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 5, lineHeight: 1.3 }}>{g.nome}</div>
              <div style={{ fontSize: 12.5, color: T.cinza, lineHeight: 1.55, marginBottom: 16, flex: 1 }}>{g.objetivo}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.cinza }}>
                  <Avatar nome={g.criadoPor.split(",")[0].split(" e ")[0]} tam={24} /> {g.criadoPor}
                </div>
                <button onClick={() => setAgenteSelecionado(g)} className="press lift" style={{ display: "flex", alignItems: "center", gap: 5, background: T.surface, border: `1px solid ${T.linha}`, borderRadius: 9, padding: "7px 13px", fontSize: 12, fontWeight: 700, color: T.azulEscuro, cursor: "pointer" }}>
                  Abrir <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DrawerAgente({ agente, podeEditar, onSalvarLink, onClose }) {
  const [rascunhoLink, setRascunhoLink] = useState(agente.link || "");
  const linkValido = /^https?:\/\/.+/i.test(rascunhoLink.trim());
  const salvar = () => { if (linkValido) onSalvarLink(agente.id, rascunhoLink.trim()); };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,29,48,.42)", display: "flex", justifyContent: "flex-end", zIndex: 100, animation: "veil .18s ease both" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(460px,100%)", background: T.bg, height: "100%", overflowY: "auto", animation: "slideDrawer .28s cubic-bezier(.2,.7,.3,1) both", boxShadow: "-16px 0 48px rgba(17,29,48,.18)" }}>
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.linha}`, padding: "22px 26px", position: "sticky", top: 0, zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.chumbo, display: "flex", alignItems: "center", justifyContent: "center" }}><LogoFIUS size={20} cor={T.azul} /></div>
            <button onClick={onClose} className="press" style={{ background: T.linhaSoft, border: "none", borderRadius: 8, padding: 7, cursor: "pointer", color: T.cinza }}><X size={16} /></button>
          </div>
          <h2 className="bracket" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>{agente.nome}</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Badge texto={agente.nucleo} cor={T.cinza} />
            <Badge texto="Em Uso" cor={T.verde} />
          </div>
        </div>
        <div style={{ padding: "22px 26px", display: "grid", gap: 16 }}>
          {agente.link && (
            <a href={agente.link} target="_blank" rel="noopener noreferrer" className="press lift"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: T.azul, color: "white", borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Abrir agente <ExternalLink size={14} />
            </a>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>O que faz</div>
            <div className="card" style={{ padding: 14, fontSize: 13, lineHeight: 1.55 }}>{agente.objetivo}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>Quem criou</div>
            <div className="card" style={{ padding: 14, fontSize: 13 }}>{agente.criadoPor}</div>
          </div>
          {agente.equipe && agente.equipe !== agente.criadoPor && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>Quem ajudou a construir</div>
              <div className="card" style={{ padding: 14, fontSize: 13 }}>{agente.equipe}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.cinzaClaro, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>Link de redirecionamento</div>
            {podeEditar ? (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={rascunhoLink} onChange={e => setRascunhoLink(e.target.value)}
                    placeholder="https://espaider…, https://kurier…, iManage…"
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.linha}`, fontSize: 13, background: T.surface }} />
                  <button onClick={salvar} disabled={!linkValido || rascunhoLink.trim() === (agente.link || "")} className="press"
                    style={{ padding: "10px 16px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, color: "white", cursor: linkValido ? "pointer" : "not-allowed", background: linkValido && rascunhoLink.trim() !== (agente.link || "") ? T.azul : T.linha }}>
                    Salvar
                  </button>
                </div>
                <div style={{ fontSize: 11, color: T.cinzaClaro, marginTop: 6 }}>
                  {agente.link
                    ? "Salvo para todo o time."
                    : "Ainda sem link cadastrado. Cole a URL real do agente (Espaider, Kurier, iManage etc.) para habilitar o botão \"Abrir agente\"."}
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: 14, fontSize: 12.5, color: T.cinza }}>
                {agente.link ? agente.link : "Ainda sem link cadastrado."} <br />
                <span style={{ color: T.cinzaClaro }}>Só quem é Editor(a) ou Administradora pode alterar este link.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ TREINAMENTOS ══════════════════ */
function TelaTreinamentos() {
  const meta = { video: { ic: Video, rot: "Vídeo" }, pdf: { ic: FileText, rot: "Leitura" }, apresentacao: { ic: Presentation, rot: "Slides" } };
  return (
    <div>
      <Cabecalho eyebrow="Conhecimento" titulo="Treinamentos"
        sub="Da base de IA aos POPs — tudo com instrutor, formato e duração definidos." />
      {SEED_TREINAMENTOS.length === 0 ? (
        <Vazio titulo="Nenhum treinamento publicado ainda" sub="Quando o time gravar ou subir o primeiro material, ele aparece aqui." />
      ) : (
      <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 }}>
        {SEED_TREINAMENTOS.map(t => {
          const M = meta[t.formato] || meta.pdf; const Ic = M.ic;
          const corCat = t.categoria === "IA" ? T.roxo : t.categoria === "Competências" ? T.laranja : t.categoria === "Ferramentas" ? T.azul : T.navy;
          return (
            <div key={t.id} className="card lift" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 72, background: `linear-gradient(120deg, ${corCat}18, ${corCat}08)`, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${T.linhaSoft}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(17,29,48,.08)" }}>
                  <Ic size={19} color={corCat} />
                </div>
              </div>
              <div style={{ padding: "14px 17px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <Badge texto={t.categoria} cor={corCat} />
                  <Badge texto={M.rot} cor={T.cinza} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 5, lineHeight: 1.35 }}>{t.titulo}</div>
                <div style={{ fontSize: 12, color: T.cinza, lineHeight: 1.5, flex: 1 }}>{t.desc}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 11.5, color: T.cinza }}>
                  <Avatar nome={t.instrutor} tam={22} /> {t.instrutor}
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {t.duracao}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

/* ══════════════════ DOCUMENTOS ══════════════════ */
function TelaDocs() {
  const [busca, setBusca] = useState("");
  const [pasta, setPasta] = useState("Todas");
  const pastas = ["Todas", ...new Set(SEED_DOCS.map(d => d.pasta))];
  const lista = SEED_DOCS.filter(d => (pasta === "Todas" || d.pasta === pasta) && d.nome.toLowerCase().includes(busca.toLowerCase()));
  const corTipo = { PDF: T.vermelho, DOCX: T.azul, PPTX: T.laranja };
  return (
    <div>
      <Cabecalho eyebrow="Conhecimento" titulo="Biblioteca de Documentos"
        sub="POPs, modelos e manuais num índice único e pesquisável — a resposta direta à DOR-008." />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar documento" />
        {pastas.map(p => <Chip key={p} ativo={pasta === p} onClick={() => setPasta(p)}>{p}</Chip>)}
      </div>
      {lista.length === 0 ? (
        <Vazio titulo="Nenhum documento encontrado" sub="Tente outro termo ou mude a pasta." />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {lista.map((d, i) => (
            <div key={d.id} className="linha-doc" style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: i < lista.length - 1 ? `1px solid ${T.linhaSoft}` : "none", cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: (corTipo[d.tipo] || T.cinza) + "16", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={17} color={corTipo[d.tipo] || T.cinza} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.nome}</div>
                <div style={{ fontSize: 11.5, color: T.cinzaClaro }}>{d.pasta} · atualizado {d.atualizado} · {d.autor}</div>
              </div>
              <Badge texto={d.tipo} cor={corTipo[d.tipo] || T.cinza} />
              <span className="acao-doc" style={{ fontSize: 12, fontWeight: 700, color: T.azul, display: "flex", alignItems: "center", gap: 4 }}>Abrir <ChevronRight size={14} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ COMUNIDADE ══════════════════ */
function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

function TelaComunidade({ posts, publicarPost, curtidasMinhas, toggleLike }) {
  const [meuNome, setMeuNome] = useState(() => { try { return localStorage.getItem("cjinova_nome") || ""; } catch { return ""; } });
  const [rascunho, setRascunho] = useState("");
  const enviar = () => {
    const texto = rascunho.trim();
    const nome = meuNome.trim();
    if (!texto || !nome) return;
    try { localStorage.setItem("cjinova_nome", nome); } catch {}
    publicarPost(texto, nome);
    setRascunho("");
  };
  return (
    <div>
      <Cabecalho eyebrow="Time & gestão" titulo="Comunidade"
        sub="Dicas, boas práticas e novidades do time. Vamos juntos? 💙" />
      <div style={{ maxWidth: 640 }}>
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16, display: "grid", gap: 10 }}>
          <input value={meuNome} onChange={e => setMeuNome(e.target.value)}
            placeholder="Seu nome"
            style={{ width: 160, fontSize: 12.5, color: T.chumbo, background: T.bg, border: `1px solid ${T.linha}`, borderRadius: 10, padding: "7px 12px" }} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input value={rascunho} onChange={e => setRascunho(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") enviar(); }}
              placeholder="Compartilhe uma dica, automação ou novidade…"
              style={{ flex: 1, fontSize: 13, color: T.chumbo, background: T.bg, border: `1px solid ${T.linha}`, borderRadius: 20, padding: "10px 16px", transition: "border-color .15s, box-shadow .15s" }} />
            <button onClick={enviar} disabled={!rascunho.trim() || !meuNome.trim()} className="press" style={{ background: rascunho.trim() && meuNome.trim() ? T.azul : T.linha, color: "white", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: rascunho.trim() && meuNome.trim() ? "pointer" : "not-allowed" }}>Publicar</button>
          </div>
        </div>
        {posts.length === 0 ? (
          <Vazio titulo="Nenhum post ainda" sub="Seja a primeira pessoa a compartilhar algo com o time." />
        ) : (
        <div className="stagger" style={{ display: "grid", gap: 13 }}>
          {posts.map(post => {
            const curtido = curtidasMinhas[post.id];
            return (
              <div key={post.id} className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 11 }}>
                  <Avatar nome={post.autor} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{post.autor}</div>
                    <div style={{ fontSize: 11, color: T.cinzaClaro }}>{tempoRelativo(post.criadoEm)}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 13, color: "#2a3442" }}>{post.texto}</p>
                <div style={{ display: "flex", gap: 16, fontSize: 12, paddingTop: 11, borderTop: `1px solid ${T.linhaSoft}` }}>
                  <button onClick={() => toggleLike(post.id)} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: curtido ? T.vermelho : T.cinza, fontWeight: 700, fontSize: 12 }}>
                    <Heart size={15} className={curtido ? "heart-pop" : ""} fill={curtido ? T.vermelho : "none"} /> {post.likesCount}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════ INDICADORES ══════════════════ */
function TelaIndicadores({ dores, ideias, projetos, prompts }) {
  const doresComProjeto = new Set(projetos.filter(p => p.dorId).map(p => p.dorId)).size;
  const conversao = dores.length ? Math.round((doresComProjeto / dores.length) * 100) : 0;
  const metricas = [
    { label: "Dores registradas", valor: dores.length, meta: 12, cor: T.azul },
    { label: "Ideias no banco", valor: ideias.length, meta: 10, cor: T.amarelo },
    { label: "Projetos em curso", valor: projetos.length, meta: 5, cor: T.verde },
    { label: "Prompts no acervo", valor: prompts.length, meta: 15, cor: T.roxo },
    { label: "Treinamentos publicados", valor: SEED_TREINAMENTOS.length, meta: 8, cor: T.laranja },
    { label: "Documentos indexados", valor: SEED_DOCS.length, meta: 20, cor: T.azulEscuro },
  ];
  const R = 42, C = 2 * Math.PI * R;
  return (
    <div>
      <Cabecalho eyebrow="Time & gestão" titulo="Indicadores"
        sub="Métricas do trimestre. O número que mais importa: quantas dores viraram resposta." />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <svg viewBox="0 0 110 110" style={{ width: 150 }}>
            <circle cx="55" cy="55" r={R} fill="none" stroke={T.linhaSoft} strokeWidth="11" />
            <circle cx="55" cy="55" r={R} fill="none" stroke={T.azul} strokeWidth="11" strokeLinecap="round"
              strokeDasharray={`${C * conversao / 100} ${C}`} transform="rotate(-90 55 55)"
              style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.7,.3,1)" }} />
            <text x="55" y="52" textAnchor="middle" fontSize="22" fontWeight="800" fill={T.chumbo} className="num">{conversao}%</text>
            <text x="55" y="68" textAnchor="middle" fontSize="8" fontWeight="700" fill={T.cinzaClaro}>DOR → PROJETO</text>
          </svg>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 8 }}>Taxa de conversão</div>
          <div style={{ fontSize: 12, color: T.cinza, marginTop: 4, lineHeight: 1.5 }}>{doresComProjeto} de {dores.length} dores do radar já têm projeto vinculado.</div>
        </div>
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {metricas.map(m => (
            <div key={m.label} className="card lift" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.label}</span>
                <span className="num" style={{ fontSize: 19, fontWeight: 800, color: m.cor }}>{m.valor}<span style={{ fontSize: 11, color: T.cinzaClaro, fontWeight: 600 }}>/{m.meta}</span></span>
              </div>
              <Barra pct={Math.min(100, (m.valor / m.meta) * 100)} cor={m.cor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ ADMINISTRAÇÃO ══════════════════ */
/* Pessoas reais citadas na planilha (quem deu ideia / quem ajudou a construir os agentes). */
function TelaAdmin() {
  return (
    <div>
      <Cabecalho eyebrow="Time & gestão" titulo="Administração"
        sub="O Hub é protegido por uma senha única de equipe — quem tiver a senha tem acesso completo." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div>
          <SubTitulo>Senha da equipe</SubTitulo>
          <div className="card" style={{ padding: 18, fontSize: 12.5, color: T.cinza, lineHeight: 1.6 }}>
            <p style={{ marginBottom: 10 }}>Para trocar a senha que libera o acesso ao Hub:</p>
            <ol style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
              <li>Abra o painel do Supabase do projeto</li>
              <li>Vá em <strong style={{ color: T.chumbo }}>Authentication → Users</strong></li>
              <li>Encontre o usuário <strong className="num" style={{ color: T.chumbo }}>{EMAIL_EQUIPE}</strong></li>
              <li>Clique em "..." → <strong style={{ color: T.chumbo }}>Reset password</strong></li>
            </ol>
          </div>
        </div>
        <div>
          <SubTitulo>Trilha de auditoria</SubTitulo>
          <Vazio titulo="Sem trilha de auditoria ainda" sub="Como o acesso é compartilhado (não há login por pessoa), não é possível registrar quem fez cada ação." />
        </div>
      </div>
    </div>
  );
}
