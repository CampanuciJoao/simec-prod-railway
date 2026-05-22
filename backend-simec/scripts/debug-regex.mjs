const text = `Engenheiro: John Mauricio Puerto Castillo
Problema descrito pelo Cliente: A mesa
Causa do problema: Correia da mesa desajustada
Testes realizados: ok`;

// Sem lookahead — só pegar tudo entre label e fim
const r1 = text.match(/Causa do problema\s*:?\s*([\s\S]*?)(?=\s*(?:Testes realizados)|$)/i);
console.log('R1 (simples):', JSON.stringify(r1?.[1]));

// Com array de tokens
const tokens = ['Testes realizados', 'HORAS DE TRABALHO'];
const lookahead = `(?=\s*(?:${tokens.join('|')})|$)`;
const r2 = text.match(new RegExp(`Causa do problema\s*:?\s*([\s\S]*?)${lookahead}`, 'i'));
console.log('R2 (com lookahead):', JSON.stringify(r2?.[1]));

// Adicionando o próprio label na lista (bug suspeito)
const tokensCom = ['Testes realizados', 'Causa do problema'];
const lookahead2 = `(?=\s*(?:${tokensCom.join('|')})|$)`;
const r3 = text.match(new RegExp(`Causa do problema\s*:?\s*([\s\S]*?)${lookahead2}`, 'i'));
console.log('R3 (label incluido):', JSON.stringify(r3?.[1]));
