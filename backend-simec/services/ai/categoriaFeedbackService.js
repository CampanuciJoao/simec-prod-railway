// Feedback supervisionado de categorização da IA — bridge entre o usuário
// corrigindo manualmente e o LLM aprendendo via few-shot.
//
// 2 modelos:
//   - IaCategoriaLabel (tenant-scoped): auditoria de quem corrigiu o quê
//   - IaCategoriaLicao (cross-tenant): texto despersonalizado da correção
//
// Quando o admin clica "Corrigir categoria" numa OS, criamos AMBOS:
//   1. Label privada com referencia ao PDF/autor/comentário do tenant
//   2. Lição cross-tenant com texto despersonalizado (sem IDs, sem nomes,
//      sem números de OS, sem expressões identificáveis) — vira few-shot
//      no prompt do LLM para próximos PDFs de QUALQUER tenant.
//
// Próximo cliente que entrar já chega com o aprendizado coletivo dos
// anteriores, sem nunca ver dado deles.

import crypto from 'node:crypto';

import prisma from '../prismaService.js';
import { TAXONOMIA_CAUSAS_EXPORT } from '../gehc/gehcPdfLlmExtractor.js';
import { detectarPadroesSuspeitos } from './licaoAnonimizacaoAuditor.js';

// SHA-256 de labelId — proveniencia nao-reversivel. Usado pra responder
// "quais licoes vieram de labels do tenant X" recalculando o hash dos
// labels dele em tempo de incidente. Salt pro hash nao ser brute-forcable.
const LICAO_HASH_SALT = process.env.IA_LICAO_HASH_SALT || 'simec-ia-licao-v1';

function hashLabelId(labelId) {
  return crypto
    .createHash('sha256')
    .update(`${LICAO_HASH_SALT}:${labelId}`)
    .digest('hex');
}

// Regras de scrubbing — aplicadas em ordem. Determinísticas (sem LLM)
// para evitar custo e ter previsibilidade. Pensa "nunca deixar passar
// algo identificável" — falha-segura prefere apagar demais que de menos.
const REGRAS_SCRUB = [
  // Numeros de OS/WO/Case: 8-12 digitos puros ou alfanumericos longos
  [/\b\d{6,}\b/g, '[ID]'],
  [/\b[A-Z]{1,3}-?\d{4,}\b/g, '[ID]'],
  // Numeros de serie: padrao "XXXX-YYYYYY" ou "Serial: ..."
  [/\b[Ss]erial[:\s]*[A-Z0-9-]+\b/g, '[SERIAL]'],
  // Datas absolutas (24/05/2025, 2025-05-24, etc) — preserva contexto
  // temporal relativo sendo conservador.
  [/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATA]'],
  [/\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g, '[DATA]'],
  // Emails
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]'],
  // Telefones BR — opcionais aqui mas conservador
  [/\b\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}\b/g, '[TELEFONE]'],
  // CNPJ/CPF
  [/\b\d{2}\.\d{3}\.\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ]'],
  [/\b\d{3}\.\d{3}\.\d{3}-?\d{2}\b/g, '[CPF]'],
];

// Lista de nomes próprios brasileiros muito comuns — não exaustivo, mas
// pega os casos óbvios. Para o que escapar, há a regra de "Sr./Sra./
// Engenheiro [Nome]" que captura títulos seguidos de Nome próprio.
const REGRA_NOMES_PROPRIOS = [
  // Títulos seguidos de nome capitalizado: "Sr. João", "Engenheiro Carlos"
  /\b(Sr\.?|Sra\.?|Engenheiro|Eng\.?|T[eé]cnico|T[eé]c\.?|Dr\.?|Dra\.?|Bi[oó]m[eé]dica|Biomed\.?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*)/g,
  '$1 [NOME]',
];

/**
 * Despersonaliza um texto técnico removendo identificadores que poderiam
 * vincular a um cliente/equipamento/pessoa específico. Mantém o conteúdo
 * técnico relevante (componentes, sintomas, ações).
 */
export function despersonalizar(texto) {
  if (!texto || typeof texto !== 'string') return '';
  let saida = texto.trim();
  for (const [pattern, replacement] of REGRAS_SCRUB) {
    saida = saida.replace(pattern, replacement);
  }
  saida = saida.replace(REGRA_NOMES_PROPRIOS[0], REGRA_NOMES_PROPRIOS[1]);
  // Colapsa whitespace duplicado deixado pelo scrubbing
  saida = saida.replace(/\s+/g, ' ').trim();
  return saida;
}

/**
 * Monta o texto que vira a "memória técnica" da lição cross-tenant a
 * partir dos campos do PDF. Inclui só o que o LLM precisa para fazer
 * matching no futuro: causa-raw, problema analisado e ações tomadas.
 * Tudo despersonalizado.
 */
function montarTextoLicao(pdfExtraido) {
  const partes = [];
  if (pdfExtraido.rootCauseRaw) partes.push(`Causa raw: ${pdfExtraido.rootCauseRaw}`);
  if (pdfExtraido.problemAnalyzed) partes.push(`Problema: ${pdfExtraido.problemAnalyzed.slice(0, 400)}`);
  if (pdfExtraido.actionsTaken) partes.push(`Acoes: ${pdfExtraido.actionsTaken.slice(0, 400)}`);
  const texto = partes.join(' | ');
  return despersonalizar(texto);
}

/**
 * Registra a correção do admin: cria a Label (privada) + Lição
 * (cross-tenant despersonalizada). Idempotente — se a mesma OS for
 * corrigida 2x, atualiza a lição.
 */
export async function registrarCorrecaoCategoria({
  tenantId,
  usuarioId,
  pdfExtraidoId,
  categoriaCorreta,
  comentario,
}) {
  if (!tenantId || !pdfExtraidoId || !categoriaCorreta) {
    return { ok: false, message: 'Parâmetros obrigatórios faltando.' };
  }

  if (!TAXONOMIA_CAUSAS_EXPORT.includes(categoriaCorreta)) {
    return {
      ok: false,
      message: `Categoria "${categoriaCorreta}" não está na taxonomia válida.`,
    };
  }

  // PDF precisa pertencer ao tenant — defesa cross-tenant.
  const pdf = await prisma.gehcPdfExtraido.findFirst({
    where: { id: pdfExtraidoId, tenantId },
    include: {
      pdfDocumento: { select: { ordemServico: { select: { serviceTypeCode: true } } } },
    },
  });
  if (!pdf) {
    return { ok: false, message: 'PDF extraído não encontrado para este tenant.' };
  }

  const serviceTypeCode = pdf.pdfDocumento?.ordemServico?.serviceTypeCode || null;
  const textoLicao = montarTextoLicao(pdf);

  // Cria a lição cross-tenant primeiro. Se texto despersonalizado idêntico
  // já existir com mesma categoria, reusa em vez de duplicar.
  let licao = null;
  let auditoriaSync = null;
  if (textoLicao) {
    licao = await prisma.iaCategoriaLicao.findFirst({
      where: { textoDespersonalizado: textoLicao, categoriaCorreta },
    });
    if (!licao) {
      // Auditor adversarial — segunda passada apos despersonalizar().
      // Se flagrar padroes suspeitos, a licao eh criada em QUARENTENA:
      // status='QUARENTENA' + ativa=false. Nao alimenta few-shot ate
      // revisao manual no painel SuperAdmin.
      auditoriaSync = detectarPadroesSuspeitos(textoLicao);

      licao = await prisma.iaCategoriaLicao.create({
        data: {
          textoDespersonalizado: textoLicao,
          categoriaCorreta,
          serviceTypeCode,
          status: auditoriaSync.suspeita ? 'QUARENTENA' : 'APROVADA',
          ativa: !auditoriaSync.suspeita,
          ultimaAuditoriaEm: new Date(),
        },
      });

      // Grava trilha de auditoria — sempre, mesmo se passou limpo
      await prisma.iaLicaoAuditoria.create({
        data: {
          licaoId: licao.id,
          resultado: auditoriaSync.suspeita ? 'suspeita' : 'limpa',
          padroes: auditoriaSync.padroes,
          trecho: auditoriaSync.trecho,
          origem: 'sincrono',
        },
      });

      if (auditoriaSync.suspeita) {
        console.warn(
          `[LICAO_QUARENTENA] id=${licao.id} padroes=${auditoriaSync.padroes.join(',')}`
        );
      }
    }
  }

  // Cria/atualiza a Label do tenant
  const labelExistente = await prisma.iaCategoriaLabel.findFirst({
    where: { tenantId, pdfExtraidoId },
  });

  const label = labelExistente
    ? await prisma.iaCategoriaLabel.update({
        where: { id: labelExistente.id },
        data: {
          categoriaCorreta,
          comentario: comentario || null,
          autorId: usuarioId,
          licaoId: licao?.id || null,
        },
      })
    : await prisma.iaCategoriaLabel.create({
        data: {
          tenantId,
          pdfExtraidoId,
          categoriaOriginal: pdf.rootCauseCategory || null,
          categoriaCorreta,
          comentario: comentario || null,
          autorId: usuarioId,
          licaoId: licao?.id || null,
        },
      });

  // Reflete a correção no proprio PDF extraido para que o painel da IA
  // mostre a categoria corrigida imediatamente (sem esperar reprocessar).
  await prisma.gehcPdfExtraido.update({
    where: { id: pdfExtraidoId },
    data: { rootCauseCategory: categoriaCorreta },
  });

  // Preenche labelHash na licao (proveniencia nao-reversivel). So preenche
  // se a licao foi criada AGORA (label nova) — licao reusada ja tem hash
  // de outro label. Hash multiplo poderia virar coluna separada se um
  // dia precisarmos rastrear N origens.
  if (licao && !licao.labelHash && label) {
    await prisma.iaCategoriaLicao.update({
      where: { id: licao.id },
      data: { labelHash: hashLabelId(label.id) },
    });
  }

  return { ok: true, label, licao, auditoria: auditoriaSync };
}

/**
 * Busca lições cross-tenant relevantes para injetar como few-shot no
 * prompt do LLM. Retorna as N mais aplicadas para o tipo de OS (PM ou
 * corretiva), priorizando consenso (mais aplicações = mais confiança).
 *
 * Cross-tenant por design: lição de qualquer cliente alimenta a próxima
 * extração de qualquer cliente. Texto já está despersonalizado.
 */
export async function buscarLicoesParaFewShot({ serviceTypeCode, limite = 5 }) {
  // Sem serviceTypeCode (PDF sem OS pai): busca lições mais aplicadas em
  // geral, sem filtro por tipo.
  // Filtra ativa=true E status='APROVADA' (defesa em profundidade — uma
  // licao em QUARENTENA nao deve alimentar few-shot mesmo se ativa por bug).
  const where = { ativa: true, status: 'APROVADA' };
  if (serviceTypeCode) {
    where.OR = [
      { serviceTypeCode },
      { serviceTypeCode: null }, // lições antigas sem código também valem
    ];
  }

  return prisma.iaCategoriaLicao.findMany({
    where,
    take: limite,
    orderBy: [
      { vezesAplicada: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      textoDespersonalizado: true,
      categoriaCorreta: true,
    },
  });
}

/**
 * Incrementa o contador `vezesAplicada` de um conjunto de lições.
 * Chamado pelo extrator após cada uso de few-shot — métrica de impacto.
 */
export async function incrementarUsoLicoes(licaoIds) {
  if (!licaoIds?.length) return;
  await prisma.iaCategoriaLicao.updateMany({
    where: { id: { in: licaoIds } },
    data: { vezesAplicada: { increment: 1 } },
  });
}
