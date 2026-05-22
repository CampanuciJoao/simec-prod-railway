const text = `Engenheiro: John
Causa do problema: Correia da mesa desajustada
Testes realizados: ok`;

const tokens = ['Testes realizados', 'HORAS DE TRABALHO'];
const lookahead = `(?=\s*(?:${tokens.join('|')})|$)`;
console.log('Lookahead string:', lookahead);
const pattern = `Causa do problema\s*:?\s*([\s\S]*?)${lookahead}`;
console.log('Pattern string:', pattern);
const re = new RegExp(pattern, 'i');
console.log('Compiled regex:', re);
console.log('Match:', text.match(re));

// Tenta sem caracter especial
const tokensSimples = ['TestesXXX'];
const r4 = text.match(new RegExp(`Causa do problema\s*:?\s*([\s\S]*?)(?=\s*(?:${tokensSimples.join('|')})|$)`, 'i'));
console.log('R4 (sem match no lookahead, cai no $):', JSON.stringify(r4?.[1]));
