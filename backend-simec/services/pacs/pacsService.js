import { z } from 'zod';
import prisma from '../prismaService.js';
import { registrarLog } from '../logService.js';
import { decryptJson, encryptJson } from './credentialCrypto.js';
import { createPacsClient } from '../integrations/pacs/pacsClient.js';
import { agregarEstudosPorEquipamento } from './pacsAggregationService.js';
import { emitirEventoTestePacs } from './pacsRealtimeService.js';
import { calcularScoreEquipamento } from '../risk/equipamentoRiskScoreService.js';

const pacsConnectionSchema = z.object({
  nome: z.string().trim().min(1, 'Nome da conexao e obrigatorio.'),
  tipoAdapter: z.string().trim().default('dicomweb_qido'),
  baseUrl: z.string().trim().url('Base URL invalida.'),
  ativo: z.boolean().optional().default(true),
  credenciais: z.object({
    apiKey: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
  }).optional().default({}),
});

function buildSanitizedConnection(connection) {
  return {
    id: connection.id,
    tenantId: connection.tenantId,
    nome: connection.nome,
    tipoAdapter: connection.tipoAdapter,
    baseUrl: connection.baseUrl,
    ativo: connection.ativo,
    status: connection.status,
    ultimoTeste: connection.ultimoTeste,
    ultimoErro: connection.ultimoErro,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    credenciais: {
      apiKeyConfigured: Boolean(decryptJson(connection.credenciais)?.apiKey),
      usernameConfigured: Boolean(decryptJson(connection.credenciais)?.username),
      passwordConfigured: Boolean(decryptJson(connection.credenciais)?.password),
    },
  };
}

async function getConnectionOrThrow(tenantId, id) {
  const connection = await prisma.pacsConnection.findFirst({
    where: {
      id,
      tenantId,
    },
  });

  if (!connection) {
    const error = new Error('Conexao PACS nao encontrada.');
    error.status = 404;
    throw error;
  }

  return connection;
}

function buildClient(connection) {
  return createPacsClient({
    tenantId: connection.tenantId,
    connectionId: connection.id,
    baseUrl: connection.baseUrl,
    credentials: decryptJson(connection.credenciais),
    timeout: 10000,
  });
}

export async function listarPacsConnections(tenantId) {
  const connections = await prisma.pacsConnection.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return connections.map(buildSanitizedConnection);
}

export async function criarPacsConnection({ tenantId, payload, autor }) {
  const parsed = pacsConnectionSchema.parse(payload);
  const created = await prisma.pacsConnection.create({
    data: {
      tenantId,
      nome: parsed.nome,
      tipoAdapter: parsed.tipoAdapter,
      baseUrl: parsed.baseUrl,
      ativo: parsed.ativo,
      credenciais: encryptJson(parsed.credenciais),
    },
  });

  await registrarLog({
    tenantId,
    usuarioId: autor.id,
    acao: 'CRIACAO',
    entidade: 'PacsConnection',
    entidadeId: created.id,
    detalhes: `Conexao PACS "${created.nome}" criada.`,
  });

  return buildSanitizedConnection(created);
}

export async function atualizarPacsConnection({ tenantId, id, payload, autor }) {
  const current = await getConnectionOrThrow(tenantId, id);
  const parsed = pacsConnectionSchema.partial().parse(payload);
  const credentials =
    parsed.credenciais === undefined
      ? current.credenciais
      : encryptJson({
          ...decryptJson(current.credenciais),
          ...parsed.credenciais,
        });

  const updated = await prisma.pacsConnection.update({
    where: { id },
    data: {
      ...(parsed.nome !== undefined ? { nome: parsed.nome } : {}),
      ...(parsed.tipoAdapter !== undefined ? { tipoAdapter: parsed.tipoAdapter } : {}),
      ...(parsed.baseUrl !== undefined ? { baseUrl: parsed.baseUrl } : {}),
      ...(parsed.ativo !== undefined ? { ativo: parsed.ativo } : {}),
      credenciais: credentials,
      status: parsed.ativo === false ? 'desabilitado' : current.status,
    },
  });

  await registrarLog({
    tenantId,
    usuarioId: autor.id,
    acao: 'EDICAO',
    entidade: 'PacsConnection',
    entidadeId: updated.id,
    detalhes: `Conexao PACS "${updated.nome}" atualizada.`,
  });

  return buildSanitizedConnection(updated);
}

export async function obterPacsHealth(tenantId) {
  const [connections, lastRuns] = await Promise.all([
    prisma.pacsConnection.findMany({
      where: { tenantId },
      select: { id: true, nome: true, status: true, ativo: true, ultimoErro: true, ultimoTeste: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.pacsIngestionRun.findMany({
      where: { tenantId },
      orderBy: { iniciadoEm: 'desc' },
      take: 10,
      select: {
        id: true,
        connectionId: true,
        status: true,
        estudosLidos: true,
        estudosAgregados: true,
        iniciadoEm: true,
        concluidoEm: true,
        erroResumo: true,
      },
    }),
  ]);

  return {
    totalConnections: connections.length,
    activeConnections: connections.filter((item) => item.ativo).length,
    connections,
    lastRuns,
  };
}

export async function listarPacsRuns(tenantId) {
  return prisma.pacsIngestionRun.findMany({
    where: { tenantId },
    orderBy: { iniciadoEm: 'desc' },
    take: 100,
    include: {
      connection: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });
}

export async function listarPacsFeaturesPorEquipamento(tenantId, equipamentoId) {
  return prisma.pacsEquipmentFeatureDaily.findMany({
    where: {
      tenantId,
      equipamentoId,
    },
    orderBy: {
      data: 'desc',
    },
    take: 30,
  });
}

export async function obterPredicaoPacsPorEquipamento(tenantId, equipamentoId) {
  const [latestFeature, riskSnapshot] = await Promise.all([
    prisma.pacsEquipmentFeatureDaily.findFirst({
      where: {
        tenantId,
        equipamentoId,
      },
      orderBy: {
        data: 'desc',
      },
    }),
    calcularScoreEquipamento({
      tenantId,
      equipamentoId,
    }).catch(() => null),
  ]);

  if (!latestFeature) {
    return {
      feature: null,
      riskSnapshot: riskSnapshot
        ? {
            score: riskSnapshot.score,
            nivel: riskSnapshot.nivel,
            resumo: riskSnapshot.resumo,
          }
        : null,
    };
  }

  return {
    feature: latestFeature,
    riskSnapshot: riskSnapshot
      ? {
          score: riskSnapshot.score,
          nivel: riskSnapshot.nivel,
          resumo: riskSnapshot.resumo,
        }
      : null,
  };
}

export async function processarColetaPacsTenant({ tenantId, connectionId = null }) {
  const connections = await prisma.pacsConnection.findMany({
    where: {
      tenantId,
      ativo: true,
      ...(connectionId ? { id: connectionId } : {}),
    },
  });

  const summary = {
    tenantId,
    totalConnections: connections.length,
    runs: [],
  };

  for (const connection of connections) {
    const startedAt = new Date();
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 6 * 60 * 60 * 1000);
    const run = await prisma.pacsIngestionRun.create({
      data: {
        tenantId,
        connectionId: connection.id,
        status: 'rodando',
        janelaInicio: windowStart,
        janelaFim: windowEnd,
      },
    });

    try {
      const client = buildClient(connection);
      const studies = await client.fetchStudies({
        from: windowStart,
        to: windowEnd,
        highVolume: true,
      });

      const aggregated = await agregarEstudosPorEquipamento({
        tenantId,
        studies,
      });

      for (const item of aggregated.items) {
        await prisma.pacsEquipmentFeatureDaily.upsert({
          where: {
            tenantId_equipamentoId_data: {
              tenantId,
              equipamentoId: item.equipamentoId,
              data: item.data,
            },
          },
          create: item,
          update: item,
        });
      }

      await prisma.pacsIngestionRun.update({
        where: { id: run.id },
        data: {
          status: aggregated.unresolved.length ? 'parcial' : 'concluido',
          estudosLidos: studies.length,
          estudosAgregados: aggregated.items.reduce(
            (sum, item) => sum + Number(item.volumeEstudos || 0),
            0
          ),
          metadataJson: JSON.stringify({
            equipamentoNaoResolvido: aggregated.unresolved,
          }),
          latenciaMs: Date.now() - startedAt.getTime(),
          concluidoEm: new Date(),
        },
      });

      await prisma.pacsConnection.update({
        where: { id: connection.id },
        data: {
          status: 'ok',
          ultimoTeste: new Date(),
          ultimoErro: null,
        },
      });

      summary.runs.push({
        connectionId: connection.id,
        studies: studies.length,
        aggregated: aggregated.items.length,
      });
    } catch (error) {
      await prisma.pacsIngestionRun.update({
        where: { id: run.id },
        data: {
          status: 'erro',
          erroResumo: error.message,
          latenciaMs: Date.now() - startedAt.getTime(),
          concluidoEm: new Date(),
        },
      });

      await prisma.pacsConnection.update({
        where: { id: connection.id },
        data: {
          status: 'erro',
          ultimoTeste: new Date(),
          ultimoErro: error.message,
        },
      });

      summary.runs.push({
        connectionId: connection.id,
        error: error.message,
      });
    }
  }

  return summary;
}

export async function processarPurgePacsTenant({ tenantId }) {
  const runLimit = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const featureLimit = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);

  const [runs, features] = await Promise.all([
    prisma.pacsIngestionRun.deleteMany({
      where: {
        tenantId,
        iniciadoEm: {
          lt: runLimit,
        },
      },
    }),
    prisma.pacsEquipmentFeatureDaily.deleteMany({
      where: {
        tenantId,
        data: {
          lt: featureLimit,
        },
      },
    }),
  ]);

  return {
    tenantId,
    removedRuns: runs.count,
    removedFeatures: features.count,
  };
}

export async function processarTesteConexaoPacs({
  tenantId,
  connectionId,
  userId,
}) {
  const connection = await getConnectionOrThrow(tenantId, connectionId);

  emitirEventoTestePacs({
    tenantId,
    userId,
    connectionId,
    status: 'running',
    message: 'Teste de conexao iniciado.',
  });

  try {
    const client = buildClient(connection);
    await client.testConnection();

    await prisma.pacsConnection.update({
      where: { id: connection.id },
      data: {
        status: 'ok',
        ultimoTeste: new Date(),
        ultimoErro: null,
      },
    });

    emitirEventoTestePacs({
      tenantId,
      userId,
      connectionId,
      status: 'success',
      message: 'Conexao validada com sucesso.',
      finishedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      connectionId,
    };
  } catch (error) {
    await prisma.pacsConnection.update({
      where: { id: connection.id },
      data: {
        status: 'erro',
        ultimoTeste: new Date(),
        ultimoErro: error.message,
      },
    });

    emitirEventoTestePacs({
      tenantId,
      userId,
      connectionId,
      status: 'error',
      message: error.message,
      finishedAt: new Date().toISOString(),
    });

    throw error;
  }
}
