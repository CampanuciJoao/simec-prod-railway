import { detectarReferenciasCruzadas } from '../services/gehc/gehcCrossRefDetector.js';

// Casos reais dos PDFs do João
const exemplos = [
  {
    nome: 'PDF 17341434 (artefato bobina, hand-over case)',
    texto: 'Time local ja esta atuando no case 17232723. Realizado handover com FE Ciro.',
  },
  {
    nome: 'PDF 17373363 (ruido bobinas, split WO)',
    texto: 'OLE abriu um SPLIT para o campo WO-18945191.',
  },
  {
    nome: 'PDF 17412936 (compressor offline, chain)',
    texto: 'Existe ainda aberto outro chamado anterior para monitorar esta ocorrência, # WO18624085 @ 17070838',
  },
  {
    nome: 'PM Job Combination',
    texto: 'PM realizada em Job Combination com o case: 13330228. Testes de acordo com o Manual Técnico.',
  },
  {
    nome: 'Multiplas refs num mesmo texto',
    texto: 'Cliente contactou no case 17232723. Time aberto WO-18987793 e tambem WO 18988555. SR17341434 estava resolvido.',
  },
];

for (const ex of exemplos) {
  console.log(`\n=== ${ex.nome} ===`);
  console.log(`Texto: ${ex.texto}`);
  const refs = detectarReferenciasCruzadas([ex.texto]);
  console.log(`Refs detectadas (${refs.length}):`);
  for (const r of refs) {
    console.log(`  - ${r.tipo}/${r.numero}  (match: "${r.match}")`);
  }
}
