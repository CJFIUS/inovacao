"""
Consulta à API pública do Comunica PJe (Diário de Justiça Eletrônico Nacional)
================================================================================

Objetivo: buscar comunicações processuais por nome de parte, tribunal e período,
replicando o que a página https://comunica.pje.jus.br/consulta faz no navegador.

IMPORTANTE:
- Este script assume que o endpoint GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
  aceita os mesmos parâmetros de query que a URL do site público usa. Isso NÃO está
  documentado oficialmente (a doc oficial do CNJ só cobre o endpoint de ENVIO de
  comunicações pelos tribunais, que exige autenticação institucional). Por isso o
  script testa várias variações de parâmetros e imprime o resultado de cada uma,
  para você identificar qual formato realmente funciona.
- Rode isso no seu computador (fora do ambiente do Claude), pois aqui a rede está
  bloqueada para esse domínio.
- Precisa da lib "requests": pip install requests

Uso:
    python consulta_comunica_pje.py
"""

import requests
import json
from datetime import date

BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://comunica.pje.jus.br/",
}

# Parâmetros da consulta - ajuste aqui conforme a necessidade
SIGLA_TRIBUNAL = "TRT3"
DATA_INICIO = "2026-01-01"
DATA_FIM = "2026-07-23"
NOME_PARTE = "NATALIA DALPIAN LOPES"   # tente separado da razão social também
# NOME_PARTE = "LL AGRO"               # descomente para testar a pessoa jurídica


def tentar_consulta(params: dict, descricao: str):
    """Faz uma requisição GET com os parâmetros dados e imprime o resultado."""
    print(f"\n{'=' * 70}")
    print(f"Tentativa: {descricao}")
    print(f"Params: {json.dumps(params, ensure_ascii=False)}")
    print(f"{'=' * 70}")

    try:
        resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=15)
        print(f"Status: {resp.status_code}")
        print(f"URL final: {resp.url}")

        content_type = resp.headers.get("content-type", "")
        if "json" in content_type:
            data = resp.json()
            # A API costuma paginar; tenta achar a lista de itens em chaves comuns
            if isinstance(data, dict):
                total = data.get("count") or data.get("total")
                items = data.get("items") or data.get("content") or data.get("data")
                print(f"Total reportado: {total}")
                if items:
                    print(f"Itens retornados: {len(items)}")
                    print(json.dumps(items[:3], ensure_ascii=False, indent=2))
                else:
                    print("Resposta JSON sem lista reconhecida:")
                    print(json.dumps(data, ensure_ascii=False, indent=2)[:1500])
            else:
                print(json.dumps(data, ensure_ascii=False, indent=2)[:1500])
        else:
            print("Resposta não-JSON (primeiros 500 caracteres):")
            print(resp.text[:500])

    except requests.exceptions.RequestException as e:
        print(f"Erro na requisição: {e}")


if __name__ == "__main__":
    # Variação 1: nomes de parâmetros iguais aos da URL do site público
    tentar_consulta(
        {
            "siglaTribunal": SIGLA_TRIBUNAL,
            "dataDisponibilizacaoInicio": DATA_INICIO,
            "dataDisponibilizacaoFim": DATA_FIM,
            "nomeParte": NOME_PARTE,
        },
        "Nomes de parâmetro literais da URL do site",
    )

    # Variação 2: com paginação explícita
    tentar_consulta(
        {
            "siglaTribunal": SIGLA_TRIBUNAL,
            "dataDisponibilizacaoInicio": DATA_INICIO,
            "dataDisponibilizacaoFim": DATA_FIM,
            "nomeParte": NOME_PARTE,
            "pagina": 1,
            "itensPorPagina": 20,
        },
        "Com paginação (pagina/itensPorPagina)",
    )

    # Variação 3: paginação em inglês/outro padrão comum em APIs do PJe
    tentar_consulta(
        {
            "siglaTribunal": SIGLA_TRIBUNAL,
            "dataDisponibilizacaoInicio": DATA_INICIO,
            "dataDisponibilizacaoFim": DATA_FIM,
            "nomeParte": NOME_PARTE,
            "page": 0,
            "size": 20,
        },
        "Com paginação (page/size)",
    )

    # Variação 4: buscando apenas a razão social separadamente
    tentar_consulta(
        {
            "siglaTribunal": SIGLA_TRIBUNAL,
            "dataDisponibilizacaoInicio": DATA_INICIO,
            "dataDisponibilizacaoFim": DATA_FIM,
            "nomeParte": "LL AGRO",
        },
        "Buscando 'LL AGRO' isoladamente",
    )

    print("\n\nSe TODAS as tentativas acima retornarem 403/404/erro de bloqueio,")
    print("o endpoint provavelmente exige um token de sessão gerado via navegador")
    print("(cookie ou header específico que o site injeta via JavaScript), e não")
    print("é acessível via requisição direta simples. Nesse caso, o caminho viável")
    print("é abrir a URL manualmente no navegador ou usar Selenium/Playwright para")
    print("simular a navegação real.")
