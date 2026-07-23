"""
Monitor de comunicações do PJe (Diário de Justiça Eletrônico Nacional) por nome de parte
===========================================================================================

Consulta periodicamente a API pública do Comunica PJe (comunicaapi.pje.jus.br) em busca
de novas comunicações processuais envolvendo os termos configurados (nome de parte, razão
social etc.) e envia um alerta por e-mail apenas quando aparece algo que ainda não tinha
sido visto em execuções anteriores (deduplicação via arquivo de estado local).

IMPORTANTE:
- O endpoint usado (GET /api/v1/comunicacao) não é oficialmente documentado para consulta
  por nome de parte; o formato dos parâmetros pode mudar sem aviso. O script tenta
  algumas variações conhecidas e usa a primeira que responder com JSON válido.
- Este script consulta apenas COMUNICAÇÕES (intimações/citações já publicadas), não faz
  varredura de distribuição de novos processos — o Comunica PJe não expõe isso
  publicamente.
- Precisa rodar num ambiente com acesso de rede liberado para domínios .jus.br
  (não funciona dentro de sandboxes que bloqueiam essa rede, como o Claude Code).
- Configure os termos de busca e as credenciais de e-mail em um config.json próprio
  (veja config.example.json neste mesmo diretório). NÃO versione o config.json real.

Como agendar (rode a partir da própria máquina/servidor, fora deste ambiente):

    # cron (Linux/Mac) - executa a cada 3 horas
    0 */3 * * * cd /caminho/scripts/pje_monitor && /usr/bin/python3 monitor_comunica_pje.py >> monitor.log 2>&1

    # Agendador de Tarefas (Windows) - criar uma tarefa que rode:
    #   python C:\caminho\scripts\pje_monitor\monitor_comunica_pje.py

Uso:
    pip install requests
    python monitor_comunica_pje.py --config config.json
"""

import argparse
import hashlib
import json
import logging
import smtplib
from datetime import date, timedelta
from email.mime.text import MIMEText
from pathlib import Path

import requests

BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://comunica.pje.jus.br/",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("monitor_pje")


def carregar_config(caminho: str) -> dict:
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def carregar_estado(caminho: Path) -> dict:
    if caminho.exists():
        with open(caminho, encoding="utf-8") as f:
            return json.load(f)
    return {}


def salvar_estado(caminho: Path, estado: dict) -> None:
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)


def id_do_item(item: dict) -> str:
    """Gera um identificador estável para um item, mesmo se a API não trouxer 'id'."""
    if isinstance(item, dict) and item.get("id") is not None:
        return str(item["id"])
    bruto = json.dumps(item, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(bruto.encode("utf-8")).hexdigest()


def extrair_itens(data) -> list:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for chave in ("items", "content", "data", "resultado", "results"):
            if isinstance(data.get(chave), list):
                return data[chave]
    return []


def buscar_comunicacoes(termo: str, tribunal: str, dias_janela: int) -> list:
    """Tenta variações conhecidas de parâmetros até obter uma resposta JSON válida (200)."""
    hoje = date.today()
    inicio = (hoje - timedelta(days=dias_janela)).isoformat()
    fim = hoje.isoformat()

    variacoes = [
        {"siglaTribunal": tribunal, "dataDisponibilizacaoInicio": inicio,
         "dataDisponibilizacaoFim": fim, "nomeParte": termo,
         "pagina": 1, "itensPorPagina": 50},
        {"siglaTribunal": tribunal, "dataDisponibilizacaoInicio": inicio,
         "dataDisponibilizacaoFim": fim, "nomeParte": termo,
         "page": 0, "size": 50},
        {"siglaTribunal": tribunal, "dataDisponibilizacaoInicio": inicio,
         "dataDisponibilizacaoFim": fim, "nomeParte": termo},
    ]

    for params in variacoes:
        try:
            resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=20)
        except requests.exceptions.RequestException as e:
            log.warning("Falha de rede para %s/%s: %s", tribunal, termo, e)
            continue

        if resp.status_code != 200:
            log.debug("Params %s retornaram status %s", params, resp.status_code)
            continue

        if "json" not in resp.headers.get("content-type", ""):
            continue

        try:
            data = resp.json()
        except ValueError:
            continue

        return extrair_itens(data)

    log.error("Nenhuma variação de parâmetros funcionou para %s / %s", tribunal, termo)
    return []


def formatar_item(item: dict) -> str:
    if not isinstance(item, dict):
        return json.dumps(item, ensure_ascii=False)
    partes = []
    for chave in ("numeroProcesso", "numero_processo", "nomeOrgao", "siglaTribunal",
                  "tipoComunicacao", "texto", "dataDisponibilizacao"):
        if item.get(chave):
            partes.append(f"{chave}: {item[chave]}")
    return "\n".join(partes) if partes else json.dumps(item, ensure_ascii=False, indent=2)


def enviar_email(config: dict, assunto: str, corpo: str) -> None:
    email_cfg = config["email"]
    msg = MIMEText(corpo, "plain", "utf-8")
    msg["Subject"] = assunto
    msg["From"] = email_cfg["remetente"]
    msg["To"] = ", ".join(email_cfg["destinatarios"])

    with smtplib.SMTP(email_cfg["smtp_host"], email_cfg["smtp_port"]) as smtp:
        smtp.starttls()
        smtp.login(email_cfg["smtp_usuario"], email_cfg["smtp_senha"])
        smtp.sendmail(email_cfg["remetente"], email_cfg["destinatarios"], msg.as_string())


def executar(config: dict, estado_path: Path) -> None:
    estado = carregar_estado(estado_path)
    novidades = []

    for alvo in config["monitorar"]:
        termo = alvo["termo"]
        tribunais = alvo.get("tribunais", ["TRT3"])
        chave_estado = alvo.get("chave", termo)
        vistos = set(estado.get(chave_estado, []))

        for tribunal in tribunais:
            log.info("Consultando '%s' em %s...", termo, tribunal)
            itens = buscar_comunicacoes(termo, tribunal, config.get("dias_janela", 10))
            log.info("%d item(ns) retornado(s) para '%s' / %s", len(itens), termo, tribunal)

            for item in itens:
                iid = id_do_item(item)
                if iid not in vistos:
                    novidades.append((termo, tribunal, item))
                    vistos.add(iid)

        estado[chave_estado] = sorted(vistos)

    salvar_estado(estado_path, estado)

    if not novidades:
        log.info("Nenhuma novidade encontrada nesta execução.")
        return

    log.info("%d novidade(s) encontrada(s).", len(novidades))
    linhas = [f"Encontradas {len(novidades)} nova(s) comunicação(ões):\n"]
    for termo, tribunal, item in novidades:
        linhas.append(f"--- {termo} ({tribunal}) ---")
        linhas.append(formatar_item(item))
        linhas.append("")
    corpo = "\n".join(linhas)

    if "email" in config:
        enviar_email(config, f"[Monitor PJe] {len(novidades)} nova(s) comunicação(ões)", corpo)
        log.info("Alerta enviado por e-mail.")
    else:
        log.warning("Config sem seção 'email' — apenas registrando as novidades no log:\n%s", corpo)


def main():
    parser = argparse.ArgumentParser(description="Monitor de comunicações do PJe por nome de parte")
    parser.add_argument("--config", default="config.json", help="Caminho do arquivo de configuração")
    parser.add_argument("--estado", default="estado_monitor.json", help="Arquivo de estado (itens já vistos)")
    args = parser.parse_args()

    config = carregar_config(args.config)
    executar(config, Path(args.estado))


if __name__ == "__main__":
    main()
