// Servico de aceite de termos legais (LGPD).
// Gerencia: registrar aceite, verificar pendencias, invalidar quando muda
// versao do documento.

import prisma from '../prismaService.js';
import { listarDocumentosVigentes } from './documentosLegaisService.js';

// Documentos cujo aceite eh obrigatorio antes de usar o sistema.
// Politica de Privacidade e Termos de Uso sao mandatorios; outros futuros
// podem ser opcionais.
const DOCUMENTOS_OBRIGATORIOS = ['politica_privacidade', 'termos_uso'];

export async function registrarAceite({ usuarioId, documento, versao, ip, userAgent }) {
  if (!usuarioId || !documento || !versao) {
    throw new Error('usuarioId, documento e versao sao obrigatorios');
  }

  // upsert idempotente: se ja aceitou esta versao, nao duplica
  return prisma.aceiteTermo.upsert({
    where: {
      usuarioId_documento_versao: { usuarioId, documento, versao },
    },
    create: {
      usuarioId,
      documento,
      versao,
      ip:        ip ? String(ip).slice(0, 100) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
    },
    update: {}, // ja existe — nao mexe (preserva timestamp original)
  });
}

// Devolve a lista de documentos pendentes de aceite para o usuario.
// Considera as versoes vigentes em docs/lgpd/.
export async function listarPendencias(usuarioId) {
  if (!usuarioId) return [];

  const vigentes = listarDocumentosVigentes().filter((d) =>
    DOCUMENTOS_OBRIGATORIOS.includes(d.documento)
  );

  if (vigentes.length === 0) return [];

  const aceites = await prisma.aceiteTermo.findMany({
    where: {
      usuarioId,
      OR: vigentes.map((v) => ({ documento: v.documento, versao: v.versao })),
    },
    select: { documento: true, versao: true },
  });

  const aceitosSet = new Set(aceites.map((a) => `${a.documento}:${a.versao}`));

  return vigentes
    .filter((v) => !aceitosSet.has(`${v.documento}:${v.versao}`))
    .map((v) => ({
      documento: v.documento,
      versao: v.versao,
      vigenteDesde: v.vigenteDesde,
    }));
}

export async function listarHistoricoAceites(usuarioId) {
  return prisma.aceiteTermo.findMany({
    where: { usuarioId },
    orderBy: { aceitoEm: 'desc' },
    select: { documento: true, versao: true, aceitoEm: true, ip: true },
  });
}
