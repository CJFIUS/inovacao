import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

class LimiteDeErro extends React.Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(erro) {
    return { erro };
  }
  componentDidCatch(erro, info) {
    console.error("Hub CJ INOVA crashou:", erro, info);
  }
  render() {
    if (this.state.erro) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6f7f9", fontFamily: "system-ui, sans-serif", padding: 24 }}>
          <div style={{ maxWidth: 480, background: "white", border: "1px solid #e8eaee", borderRadius: 14, padding: "28px 26px", textAlign: "center" }}>
            <h1 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: "#111d30" }}>O Hub travou ao carregar</h1>
            <p style={{ fontSize: 12.5, color: "#6d6e71", lineHeight: 1.55, marginBottom: 16, wordBreak: "break-word" }}>{String(this.state.erro?.message || this.state.erro)}</p>
            <button onClick={() => window.location.reload()}
              style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "#009edb", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </React.StrictMode>
);
