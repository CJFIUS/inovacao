// Feriados nacionais e forenses do Brasil, calculados por ano.
// Móveis calculados a partir da Páscoa (algoritmo de Meeus/Jones/Butcher).

function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDias(data, n) {
  const d = new Date(data);
  d.setDate(d.getDate() + n);
  return d;
}

// tipo "nacional": feriado por lei federal (afeta todo mundo, inclusive comércio)
// tipo "forense": sem expediente forense na prática, mas não é feriado nacional por lei
// (varia por tribunal — por isso fica com opção de ligar/desligar na calculadora)
export function feriadosDoAno(ano) {
  const pasc = pascoa(ano);
  const feriados = [
    { data: new Date(ano, 0, 1), nome: "Confraternização Universal", tipo: "nacional" },
    { data: new Date(ano, 3, 21), nome: "Tiradentes", tipo: "nacional" },
    { data: new Date(ano, 4, 1), nome: "Dia do Trabalho", tipo: "nacional" },
    { data: new Date(ano, 8, 7), nome: "Independência do Brasil", tipo: "nacional" },
    { data: new Date(ano, 9, 12), nome: "Nossa Senhora Aparecida", tipo: "nacional" },
    { data: new Date(ano, 9, 2), nome: "Finados", tipo: "nacional" },
    { data: new Date(ano, 10, 15), nome: "Proclamação da República", tipo: "nacional" },
    { data: new Date(ano, 11, 25), nome: "Natal", tipo: "nacional" },
    { data: addDias(pasc, -2), nome: "Sexta-feira Santa", tipo: "nacional" },
    { data: addDias(pasc, -48), nome: "Carnaval (segunda-feira)", tipo: "forense" },
    { data: addDias(pasc, -47), nome: "Carnaval (terça-feira)", tipo: "forense" },
    { data: addDias(pasc, 60), nome: "Corpus Christi", tipo: "forense" },
  ];
  if (ano >= 2024) {
    feriados.push({ data: new Date(ano, 10, 20), nome: "Dia Nacional de Zumbi e da Consciência Negra", tipo: "nacional" });
  }
  return feriados;
}
