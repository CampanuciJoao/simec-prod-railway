import {
  uploadAnexoEquipamento,
  deleteAnexoEquipamento,
} from './equipamentosApi';

import {
  uploadAnexoContrato,
  deleteAnexoContrato,
} from './contratosApi';

import {
  uploadAnexoSeguro,
  deleteAnexoSeguro,
} from './segurosApi';

import {
  uploadAnexoManutencao,
  deleteAnexoManutencao,
} from './manutencoesApi';

import {
  uploadAnexoUnidade,
  deleteAnexoUnidade,
} from './unidadesApi';

const ANEXOS_API_BY_RESOURCE = {
  equipamentos: {
    upload: uploadAnexoEquipamento,
    remove: deleteAnexoEquipamento,
  },
  contratos: {
    upload: uploadAnexoContrato,
    remove: deleteAnexoContrato,
  },
  seguros: {
    upload: uploadAnexoSeguro,
    remove: deleteAnexoSeguro,
  },
  manutencoes: {
    upload: uploadAnexoManutencao,
    remove: deleteAnexoManutencao,
  },
  unidades: {
    upload: uploadAnexoUnidade,
    remove: deleteAnexoUnidade,
  },
};

export function getAnexosApi(resource) {
  const api = ANEXOS_API_BY_RESOURCE[resource];

  if (!api) {
    throw new Error(`API de anexos não configurada para o recurso "${resource}".`);
  }

  return api;
}

export function uploadAnexoByResource(resource, resourceId, formData) {
  const api = getAnexosApi(resource);
  return api.upload(resourceId, formData);
}

export function deleteAnexoByResource(resource, resourceId, anexoId) {
  const api = getAnexosApi(resource);
  return api.remove(resourceId, anexoId);
}