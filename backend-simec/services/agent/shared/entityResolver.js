// services/agent/entityResolver.js
import prisma from '../../prismaService.js';

function normalizarTexto(texto = '') {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function expandirSinonimosEquipamento(texto = '') {
  const t = normalizarTexto(texto);
  const sinonimos = new Set();

  if (t) {
    sinonimos.add(t);
  }

  if (/\b(rm|rnm|ressonancia magnetica|ressonancia)\b/.test(t)) {
    sinonimos.add('ressonancia');
    sinonimos.add('ressonancia magnetica');
    sinonimos.add('rm');
    sinonimos.add('rnm');
  }

  if (/\b(tc|ct|tomografia|tomografo|tomografia computadorizada)\b/.test(t)) {
    sinonimos.add('tomografia');
    sinonimos.add('tomografo');
    sinonimos.add('tc');
    sinonimos.add('ct');
    sinonimos.add('tomografia computadorizada');
  }

  if (/\b(rx|raio x|raio-x|radiografia)\b/.test(t)) {
    sinonimos.add('raio x');
    sinonimos.add('raio-x');
    sinonimos.add('radiografia');
    sinonimos.add('rx');
  }

  if (/\b(us|uss|ultrassom|ultrasonografia|ultra)\b/.test(t)) {
    sinonimos.add('ultrassom');
    sinonimos.add('ultrasonografia');
    sinonimos.add('us');
    sinonimos.add('uss');
    sinonimos.add('ultra');
  }

  if (/\b(dr|radiografia digital)\b/.test(t)) {
    sinonimos.add('dr');
    sinonimos.add('radiografia digital');
  }

  if (/\b(mamografia|mamografo|mammo)\b/.test(t)) {
    sinonimos.add('mamografia');
    sinonimos.add('mamografo');
    sinonimos.add('mammo');
  }

  if (/\b(act revolution)\b/.test(t)) {
    sinonimos.add('act revolution');
    sinonimos.add('tomografia');
    sinonimos.add('tomografia computadorizada');
  }

  if (/\b(aquilion ct)\b/.test(t)) {
    sinonimos.add('aquilion ct');
    sinonimos.add('ct');
    sinonimos.add('tomografia');
    sinonimos.add('tomografia computadorizada');
  }

  return Array.from(sinonimos);
}

export async function resolverEntidades(estado, tenantId) {
  if (!tenantId) {
    throw new Error('TENANT_ID_OBRIGATORIO_PARA_RESOLVER_ENTIDADES');
  }

  const novo = { ...estado };

  delete novo.ambiguidadeEquipamento;

  if (novo.unidadeTexto && !novo.unidadeId) {
    const unidadeTextoNormalizado = normalizarTexto(novo.unidadeTexto);

    const unidade = await prisma.unidade.findFirst({
      where: {
        tenantId,
        OR: [
          {
            nomeSistema: {
              contains: unidadeTextoNormalizado,
              mode: 'insensitive',
            },
          },
          {
            nomeFantasia: {
              contains: unidadeTextoNormalizado,
              mode: 'insensitive',
            },
          },
          {
            cidade: {
              contains: unidadeTextoNormalizado,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        nomeSistema: true,
      },
    });

    if (unidade) {
      novo.unidadeId = unidade.id;
      novo.unidadeNome = unidade.nomeSistema;
    }
  }

  if (novo.equipamentoTexto && !novo.equipamentoId) {
    const sinonimos = expandirSinonimosEquipamento(novo.equipamentoTexto);

    const whereBase = {
      tenantId,
      OR: sinonimos.flatMap((s) => [
        { tag: { contains: s, mode: 'insensitive' } },
        { modelo: { contains: s, mode: 'insensitive' } },
        { tipo: { contains: s, mode: 'insensitive' } },
        { fabricante: { contains: s, mode: 'insensitive' } },
      ]),
    };

    const where = novo.unidadeId
      ? {
          ...whereBase,
          unidadeId: novo.unidadeId,
        }
      : whereBase;

    const equipamentos = await prisma.equipamento.findMany({
      where,
      take: 10,
      select: {
        id: true,
        modelo: true,
        tag: true,
        tipo: true,
        unidade: {
          select: {
            nomeSistema: true,
          },
        },
      },
    });

    if (equipamentos.length === 1) {
      const equipamento = equipamentos[0];

      novo.equipamentoId = equipamento.id;
      novo.equipamentoNome = equipamento.modelo;
      novo.modelo = equipamento.modelo;
      novo.tag = equipamento.tag || null;
      novo.tipoEquipamento = equipamento.tipo || null;

      if (!novo.unidadeNome && equipamento.unidade?.nomeSistema) {
        novo.unidadeNome = equipamento.unidade.nomeSistema;
      }
    } else if (equipamentos.length > 1) {
      novo.ambiguidadeEquipamento = equipamentos.map((e) => ({
        id: e.id,
        modelo: e.modelo,
        tag: e.tag,
        tipoEquipamento: e.tipo || null,
        unidade: e.unidade?.nomeSistema || novo.unidadeNome || null,
      }));
    }
  }

  return novo;
}
