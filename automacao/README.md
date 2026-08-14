# Automação de emissão de GRU-JT (custas processuais)

Script standalone (fora do app React do Hub) que usa [Playwright](https://playwright.dev)
para preencher o formulário público de emissão de GRU em `gru.jt.jus.br/gru`,
reaproveitando o motor de cálculo de `src/guias/custasTrabalhistas.js`.

## Status

Mapeado até o clique no botão **"Revisão e Pagamento"**. A partir dali, o
site exige resolver um **CAPTCHA visual** (com cronômetro) antes de seguir
para a confirmação do pagamento.

**Isso é um limite definitivo do escopo, não um problema a contornar**:
resolver CAPTCHA programaticamente estaria burlando um controle de
segurança do tribunal — está fora de cogitação por definição do projeto.
Então a automação real para GRU-JT custas é: **preencher e validar tudo
automaticamente, calcular o valor, chegar até o CAPTCHA — e aí um humano
resolve o CAPTCHA e confirma o pagamento.** Ainda é um ganho grande (zero
digitação manual, zero cálculo manual), só não é 100% sem toque humano —
e não tem como ser, dado esse controle do site.

**Nunca rodado contra a página real.** Foi escrito a partir de prints da
tela, não do HTML/DOM. Rode em modo visível (`--headed`) e ajuste os
seletores que não baterem — o mais provável de precisar ajuste são os
comboboxes de "Unidade Gestora" / "categoria de serviço" / "serviço", que
são componentes customizados (não `<select>` nativo).

## Como rodar

```bash
npm install --no-save playwright
npx playwright install chromium
node automacao/emitir-gru-jt.mjs --headed
```

(Rode a partir da raiz do repositório — o script importa `src/guias/...`.)

Sem `--headed`, o navegador roda invisível (headless) — só use assim depois
de validar que o fluxo funciona de ponta a ponta em modo visível.

## Por que não roda dentro do Hub (app React)?

O Hub roda no navegador do usuário — uma página web não pode abrir e
controlar outra aba/site por conta própria (isso é uma proteção de
segurança do navegador, não uma limitação nossa). Este script roda por
fora, via Node.js, controlando um navegador real. No futuro, se fizer
sentido, dá para expor isso como uma função de backend (ex: Supabase Edge
Function ou um servidor próprio) que o Hub chama por um botão — mas isso é
uma etapa de infraestrutura adicional, não faz parte deste MVP.

## Regra de uso

Só automatiza o que o próprio formulário público permite preencher sem
login e sem CAPTCHA — que é tudo até "Revisão e Pagamento". Dali em diante,
o CAPTCHA é intransponível por decisão de projeto: não existe (e não deve
existir) nenhuma tentativa de resolvê-lo automaticamente (OCR, serviço
terceiro de resolução de CAPTCHA etc.).
