// Ficheiro: backend-simec/services/uploads/anexoPolicyService.js

import prisma from '../prismaService.js';
import { createHttpError } from './uploadValidationService.js';
import { getUploadResourceConfig } from './uploadFieldRegistry.js';

const RESOURCE_POLICIES = {
  equipamentos: {
    relationField: 'equipamentoId',
    entityName: 'Equipamento',
    findById: async ({ tenantId, entityId }) =>
      prisma.equipamento.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, modelo: true, tag: true },
      }),
    describe: (entity) =>
      `${entity.modelo || 'Equipamento'}${entity.tag ? ` (${entity.tag})` : ''}`,
  },

  contratos: {
    relationField: 'contratoId',
    entityName: 'Contrato',
    findById: async ({ tenantId, entityId }) =>
      prisma.contrato.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, numeroContrato: true },
      }),
    describe: (entity) => `Contrato ${entity.numeroContrato || entity.id}`,
  },

  seguros: {
    relationField: 'seguroId',
    entityName: 'Seguro',
    findById: async ({ tenantId, entityId }) =>
      prisma.seguro.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, apoliceNumero: true },
      }),
    describe: (entity) => `Seguro ${entity.apoliceNumero || entity.id}`,
  },

  unidades: {
    relationField: 'unidadeId',
    entityName: 'Unidade',
    findById: async ({ tenantId, entityId }) =>
      prisma.unidade.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, nomeSistema: true },
      }),
    describe: (entity) => entity.nomeSistema || entity.id,
  },

  manutencoes: {
    relationField: 'manutencaoId',
    entityName: 'Manutenção',
    findById: async ({ tenantId, entityId }) =>
      prisma.manutencao.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, numeroOS: true },
      }),
    describe: (entity) => `OS ${entity.numeroOS || entity.id}`,
  },
};

export function getResourcePolicy(resource) {
  const policy = RESOURCE_POLICIES[resource];
  const config = getUploadResourceConfig(resource);

  if (!policy || !config) {
    throw createHttpError(
      500,
      `Política de upload não configurada para "${resource}".`,
      'UPLOAD_POLICY_NOT_CONFIGURED'
    );
  }

  return {
    ...policy,
    config,
  };
}

export async function assertEntityBelongsToTenant({
  resource,
  tenantId,
  entityId,
}) {
  if (!tenantId) {
    throw createHttpError(
      401,
      'Tenant não identificado para operação de upload.',
      'TENANT_REQUIRED'
    );
  }

  if (!entityId || typeof entityId !== 'string') {
    throw createHttpError(
      400,
      'ID da entidade é obrigatório para operação de upload.',
      'ENTITY_ID_REQUIRED'
    );
  }

  const policy = getResourcePolicy(resource);

  const entity = await policy.findById({
    tenantId,
    entityId,
  });

  if (!entity) {
    throw createHttpError(
      404,
      `${policy.entityName} não encontrado(a).`,
      'UPLOAD_OWNER_NOT_FOUND'
    );
  }

  return {
    entity,
    relationField: policy.relationField,
    entityName: policy.entityName,
    entityLabel: policy.describe(entity),
    config: policy.config,
  };
}