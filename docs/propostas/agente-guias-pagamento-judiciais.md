# Agente de Elaboração e Conferência de Guias de Pagamento Judiciais — Análise de Viabilidade e Proposta de MVP

Data: 2026-08-14
Escopo observado nos materiais enviados: processos trabalhistas (defesa de reclamadas — Samsung, Kion, Vibracoustic, A.Schulman etc.), guias GDPJ (depósito judicial/recursal), GRU de custas (Justiça do Trabalho e Tesouro/TRF3), GPS/INSS via SISCONDJ-JT e DARF/IR via sistema Veri (MTE).

---

## 1. O que os documentos enviados já revelam sobre o processo real

Isso muda a análise: **não existe uma única "guia judicial"**, existem pelo menos 5 famílias de guia, cada uma com fonte, sistema emissor e lógica de cálculo próprios:

| Tipo de guia | Quando é devida | Onde é emitida | Observação |
|---|---|---|---|
| **GDPJ** (depósito judicial/recursal e honorários) | Garantia de execução, depósito recursal | Portal de cada TRT (ex.: TRT15, TRT2) **ou** portal do Banco do Brasil (demais tribunais) | Não há padronização entre tribunais — cada TRT tem seu próprio formulário |
| **GRU custas processuais (JT)** | Custas de recurso, ação, etc. na Justiça do Trabalho | `https://gru.jt.jus.br/gru`, usando código da **Unidade Gestora** (tabela por TRT, 24 regiões) | A tabela de Unidades Gestoras que você enviou é exatamente o parâmetro de preenchimento |
| **GRU — Tesouro/TRF3** (Justiça Federal comum) | Custas em processos na Justiça Federal | `https://pagtesouro.tesouro.gov.br/portal-gru/#/emissao-gru` | Fluxo "intuitivo" descrito no seu doc: comparar com guia já emitida para replicar códigos |
| **Custas STF** (Recurso Extraordinário) | RE em trâmite no STF | Portal STF (`recolhimentoDeCustas`) | Aceita boleto e PIX |
| **GPS/INSS** (cota do reclamante/reclamada/terceiros) | Reconhecimento de vínculo, condenação com natureza salarial | SISCONDJ-JT, no site do próprio tribunal do processo | Emissão vinculada ao processo, não é um cálculo "livre" |
| **DARF/IR** | Retenção de IR sobre valores pagos | Sistema **Veri** (MTE) — `eprocesso.sit.trabalho.gov.br`, via token | Autenticação por token — fora do alcance de automação sem credencial dedicada |

Essa segmentação por tipo de guia deve ser o primeiro nó de decisão do agente (etapa 4 do fluxo que você propôs), porque **cada ramo tem uma fonte, um cálculo e uma exigência de autenticação diferentes**.

---

## 2. Viabilidade por fonte de dado

Regra que você já estabeleceu (e que eu mantenho como restrição de design, não como sugestão): **nada de burlar login, CAPTCHA ou termos de uso.** Classificação honesta do que dá para automatizar hoje:

### 2.1. Fontes com automação viável (sem violar controles)

- **PJe / consulta processual pública** (PJe Consulta, e-SAJ, Projudi, TST Push): a maioria dos tribunais oferece consulta pública de andamentos e, em muitos casos, um **DataJud (CNJ)** — API pública oficial do CNJ que devolve metadados processuais estruturados (classe, órgão julgador, partes, movimentos, valores quando informados). Isso é hoje a fonte mais robusta e *juridicamente segura* para automação, porque é uma API pública documentada e sem CAPTCHA.
- **GRU-JT (`gru.jt.jus.br`)**: verificar se existe endpoint de geração de guia por parâmetros (número do processo, UG, código de recolhimento) sem autenticação — muitos sistemas de GRU aceitam geração via URL/form simples. Se sim, dá para automatizar via *automação tradicional* (requisição HTTP + preenchimento de formulário), sem burlar nada.
- **Portal Tesouro GRU (TRF3)**: mesma lógica — formulário público, sem login pessoal, apenas dados do pagador/processo.
- **Tabela de Unidades Gestoras**: é dado estático (mudou raramente) — pode virar uma base de referência interna, atualizada periodicamente, em vez de scraping a cada guia.
- **Documentos do próprio processo (sentença, cálculo, despacho)**: se já estão no seu sistema (PJe, Espaider, ou upload manual), a extração é 100% viável via OCR/IA sobre PDF, **sem depender de terceiros**.

### 2.2. Fontes que exigem autenticação/credencial própria (automatizáveis, mas com risco jurídico diferente)

- **PJe de cada TRT** (consulta autenticada, mais completa que a pública): exige certificado digital ou usuário/senha do escritório. É automatizável **licitamente** desde que use a própria credencial do usuário (não é "burlar" — é logar como o próprio usuário faria), mas aumenta a complexidade (2FA, certificado A1/A3, variação de UI entre 24 TRTs).
- **SISCONDJ-JT**: emissão de GPS vinculada ao processo — provavelmente exige login. Mesmo raciocínio.
- **Sistema Veri/DARF (MTE)**: autenticação por **token individual** — este é o caso mais sensível. Recomendo tratar como **não automatizável no MVP**: o token é pessoal, e a automação aqui teria que gerenciar credenciais sensíveis de terceiros (Receita/MTE) sem ganho proporcional ao risco.

### 2.3. Fontes sem automação viável — identificar e propor alternativa

- **Portais de TRT sem API/formulário público para GDPJ** (a maioria): a alternativa realista é o agente **pré-preencher os campos e mostrar exatamente o que copiar/colar**, ou usar RPA de navegador *autenticado com a própria credencial do usuário* — nunca headless anônimo tentando contornar CAPTCHA.
- **Bancos (BB) para depósito judicial de tribunais sem portal próprio**: idem — extração de dados + instrução de preenchimento, não automação ponta a ponta.

**Conclusão da viabilidade:** dá para automatizar de ponta a ponta uma fatia real (GRU-JT, GRU-TRF3, custas STF), e para os demais (GDPJ por TRT, SISCONDJ, DARF) o MVP deve **gerar o "pacote de preenchimento"** (todos os dados calculados e prontos) mesmo que o clique final seja humano — que já é um ganho enorme de tempo e de conferência.

---

## 3. Divisão de responsabilidades: automação tradicional × IA × integração × humano

| Etapa | Melhor abordagem | Por quê |
|---|---|---|
| Consulta ao processo (número, partes, tribunal, vara) | **Integração/API** (DataJud/CNJ, PJe autenticado) | Dado estruturado, existe fonte oficial |
| Leitura de sentença/decisão/cálculo (PDF) | **IA (LLM com extração estruturada + OCR)** | Texto não padronizado, exige interpretação jurídica |
| Identificar tipo de guia aplicável | **IA + regras determinísticas (árvore de decisão)** | Precisa entender contexto do processo, mas a decisão final deve ser auditável — não "caixa preta" |
| Localizar código da Unidade Gestora / código de recolhimento | **Automação tradicional** (lookup em tabela) | Dado estático, não precisa de IA |
| Cálculo de valores (custas, juros, correção, INSS, IR) | **Automação tradicional (motor de regras)**, IA só para *extrair* os parâmetros do cálculo do documento | Cálculo tem que ser determinístico e auditável — IA não deve "fazer conta", deve alimentar a fórmula |
| Conferência (valor do processo × valor calculado) | **Automação tradicional + IA para explicar divergência** | Comparação numérica é determinística; a explicação da causa provável da diferença é onde a IA ajuda |
| Preenchimento da guia | **Automação tradicional (RPA/form-fill ou API)** | Uma vez os dados validados, preencher é mecânico |
| Geração do PDF | **Automação tradicional** (renderização de template ou automação do site oficial) | — |
| Validação final | **100% humano, sempre** | Ponto que você já definiu como inegociável — e corretamente: é a salvaguarda contra erro de cálculo, de leitura de documento ou de fonte desatualizada |

Princípio de design que eu recomendo deixar explícito no sistema: **a IA nunca decide o valor final sozinha — ela propõe e evidencia; o motor de regras calcula; o humano aprova.** Isso é o que permite responder "por que esse valor?" a qualquer momento (rastreabilidade), essencial num contexto de responsabilidade profissional.

---

## 4. Arquitetura proposta para o MVP

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. ENTRADA                                                          │
│  Nº do processo + Tribunal + Tipo de guia (ou "detectar automatic.") │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. COLETA DE DADOS (automação tradicional + integração)             │
│  • DataJud/CNJ API → metadados do processo                           │
│  • PJe autenticado (quando necessário) → andamentos, valores          │
│  • Upload/leitura de sentença, cálculo, despacho (PDF)                │
│  • Base interna: Unidades Gestoras, CNPJs de clientes, tabela de UG   │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. EXTRAÇÃO ESTRUTURADA (IA)                                        │
│  LLM lê sentença/cálculo/decisão → extrai:                           │
│  valor principal, encargos, base de cálculo INSS/IR, prazos,         │
│  parte devedora, natureza da verba — tudo com citação da página/     │
│  trecho de origem (evidência)                                        │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. CLASSIFICAÇÃO DA GUIA (IA + árvore de regras)                    │
│  GDPJ | GRU custas JT | GRU Tesouro/TRF3 | Custas STF | GPS | DARF    │
│  → decide também *quais campos* aquele tipo de guia exige             │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. MOTOR DE CÁLCULO/CONFERÊNCIA (determinístico, auditável)         │
│  • Recalcula valor com base nos parâmetros extraídos                 │
│  • Compara: valor no processo × valor calculado × valor de tabela     │
│  • Gera relatório: valor encontrado / calculado / a usar / divergência│
│    / motivo provável / nível de confiança                            │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
                    ┌────────────┴────────────┐
                    │  Divergência relevante?  │
                    └────┬─────────────────┬───┘
                     SIM │                 │ NÃO
                         ▼                 ▼
        ┌───────────────────────┐  ┌──────────────────────────┐
        │ BLOQUEIA emissão auto. │  │ 6. PREENCHIMENTO DA GUIA  │
        │ Exibe divergência,     │  │ (form-fill/API do órgão   │
        │ pede decisão humana    │  │  ou template interno)     │
        └───────────┬───────────┘  └─────────────┬──────────────┘
                    │                              ▼
                    │               ┌──────────────────────────┐
                    │               │ 7. GERAÇÃO DO PDF         │
                    │               └─────────────┬──────────────┘
                    ▼                              ▼
        ┌─────────────────────────────────────────────────────┐
        │  8. TELA DE VALIDAÇÃO HUMANA (sempre, sem exceção)   │
        │  Resumo: dados, origem de cada dado, cálculo,        │
        │  divergências, PDF gerado → Aprovar / Corrigir        │
        └───────────────────────┬───────────────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  9. DOWNLOAD DA GUIA     │
                    │  (PDF final + log de     │
                    │   auditoria da conferência)│
                    └─────────────────────────┘
```

### Componentes técnicos sugeridos

- **Entrada/orquestração**: aproveitar o Hub CJ Inova existente (React + Vite + Supabase) como front-end e camada de autenticação/usuários — não é necessário novo stack.
- **Banco de regras e tabelas de referência**: Supabase (Postgres) para armazenar Unidades Gestoras, códigos de recolhimento, CNPJs de clientes, histórico de guias emitidas — dados que hoje estão em PDF/Excel soltos.
- **Extração de documentos**: pipeline de OCR (para PDFs escaneados) + LLM com *structured output* (schema fixo: valor, base de cálculo, parte, data), sempre retornando a página/trecho de origem.
- **Motor de cálculo**: módulo determinístico separado do LLM — funções puras por tipo de guia (custas, INSS, IR, correção monetária), testável e versionável independentemente do modelo de IA.
- **Camada de integração**: API DataJud/CNJ (pública) como primeira fonte; conectores específicos por tribunal (PJe) como segunda fase, com gestão segura de credenciais (vault, nunca hardcoded).
- **RPA de preenchimento**: apenas para os fluxos sem API (GRU-JT, GRU-Tesouro) — Playwright já está disponível no ambiente para prototipar isso.
- **Geração de PDF**: para os casos de automação total, capturar o PDF gerado pelo próprio site oficial (não recriar o layout — isso preserva a validade formal da guia); para os casos "pacote de preenchimento", gerar um PDF interno resumo (não é a guia oficial, é o dossiê para preenchimento manual assistido).
- **Auditoria**: cada guia gerada deve manter log imutável de: fontes consultadas, valores extraídos, cálculo aplicado, divergências, decisão do humano validador, timestamp.

---

## 5. Principais riscos e limitações

1. **Heterogeneidade entre os 24 TRTs**: cada um pode ter portal, layout e regras de GDPJ diferentes — o MVP não deve prometer cobertura total, deve começar por 2–3 tribunais (ex.: TRT2, TRT15, já mapeados nos seus documentos) e expandir.
2. **Autenticação e credenciais sensíveis**: PJe, SISCONDJ e Veri exigem login/token pessoal — arquitetura precisa de um cofre de credenciais (não é trivial, tem exigência de segurança da informação e LGPD, já que trata dados de clientes/processos).
3. **Responsabilidade profissional**: erro em guia de pagamento judicial pode gerar prejuízo real ao cliente (multa, preclusão) — reforça por que a validação humana é inegociável e por que o sistema deve **sempre mostrar a divergência em vez de arredondar/decidir sozinho**.
4. **Mudança de regras/tabelas**: tabela de Unidades Gestoras, alíquotas de INSS, valores de custas mudam por normativo — a base de referência interna precisa de processo de atualização periódica (não é "programar uma vez e esquecer").
5. **Qualidade dos documentos de origem**: sentenças/cálculos escaneados com baixa qualidade prejudicam a extração por IA — pode ser necessário fallback para digitação manual assistida.
6. **Falsos positivos de "sem divergência"**: o motor de cálculo precisa ser conservador — na dúvida, sinalizar como divergência a validar, nunca aprovar automaticamente.
7. **Escopo do DataJud/CNJ**: nem todo processo tem todos os campos preenchidos na API pública (depende de cada tribunal alimentar corretamente) — a cobertura real precisa ser validada empiricamente antes de prometer automação completa da etapa 1.

---

## 6. Roadmap sugerido

**Fase 0 — Validação de dados (2–3 semanas)**
- Testar a API DataJud/CNJ com processos reais do escritório: qual % dos campos necessários realmente vem preenchido.
- Confirmar se `gru.jt.jus.br` e o portal Tesouro/TRF3 aceitam geração via parâmetros simples (sem login) — isso define o que é "automação total" desde já.
- Levantar a tabela completa de Unidades Gestoras (você já tem a base) e códigos de recolhimento por tipo de guia.

**Fase 1 — MVP restrito a GRU (custas JT + TRF3) (4–6 semanas)**
- Fluxo completo: entrada do processo → extração de dados (via DataJud + upload de documento) → cálculo de custas → conferência → preenchimento → PDF (capturado do site oficial) → validação humana → download.
- Esse é o caminho de maior automação viável e menor risco (sem login pessoal envolvido).

**Fase 2 — Extração de sentença/cálculo com IA (paralelo à Fase 1)**
- Pipeline de OCR + LLM para leitura de sentença/decisão, com extração estruturada e citação de origem.
- Motor de cálculo determinístico para valor principal + juros/correção.

**Fase 3 — GDPJ para 2–3 TRTs prioritários (6–8 semanas)**
- RPA autenticado (credencial do próprio usuário) para os tribunais mais recorrentes na carteira do escritório (TRT2, TRT15, conforme seus documentos).
- Onde não houver automação viável, entregar o "pacote de preenchimento assistido".

**Fase 4 — GPS/INSS e avaliação do DARF (posterior)**
- Priorizar depois de validar volume/frequência real desses tipos de guia.
- DARF via sistema Veri: manter como fluxo manual assistido (dados calculados, preenchimento humano), dado o uso de token pessoal.

**Fase 5 — Expansão e auditoria**
- Ampliar cobertura de tribunais.
- Painel de auditoria/qualidade: taxa de divergência detectada, tempo economizado, taxa de correção humana pós-validação (para calibrar a confiança do sistema ao longo do tempo).

---

## 7. Resumo executivo

- **É viável construir um MVP real**, mas não um MVP único — é um MVP por *tipo de guia*, começando pelas fontes sem exigência de login pessoal (GRU-JT e GRU-Tesouro/TRF3), que são as de maior automação segura e menor risco jurídico.
- **IA deve ficar restrita a leitura/interpretação de documentos e explicação de divergências** — o cálculo em si deve ser determinístico, testável e auditável.
- **Validação humana final é inegociável em todas as fases**, inclusive nos fluxos "100% automatizados" — o ganho do sistema é eliminar trabalho manual repetitivo e aumentar a confiabilidade da conferência, não eliminar o advogado do processo de decisão.
- Os dados que você já reuniu (Unidades Gestoras, CNPJs padrão, fluxos por tipo de guia) são exatamente a base de conhecimento inicial do motor de regras — o próximo passo prático é validar as duas hipóteses técnicas mais críticas: cobertura real do DataJud/CNJ e possibilidade de geração de GRU sem login.
