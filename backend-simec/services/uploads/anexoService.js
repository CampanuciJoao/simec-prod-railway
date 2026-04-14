// Ficheiro: backend-simec/services/uploads/anexoService.js

import { registrarLog } from '../logService.js';
import {
  assertAllFilesValid,
  createHttpError,
} from './uploadValidationService.js';
import {
  normalizeStoredPath,
  deleteStoredFile,
} from './fileStorageService.js';
import { assertEntityBelongsToTenant } from './anexoPolicyService.js';
import {
  createManyAnexos,
  listAnexosByOwner,
  findAnexoById,
  deleteAnexoById,
} from './anexoRepository.js';

function normalizarFiles(files) {
  if (!Array.isArray(files)) return [];

  return files.filter(
    (file) =>
      file &&
      typeof file === 'object' &&
      file.originalname &&
      file.mimetype &&
      file.filename
  );
}

export async function adicionarAnexos({
  resource,
  tenantId,
  usuarioId,
  entityId,
  files = [],
}) {
  const owner = await assertEntityBelongsToTenant({
    resource,
    tenantId,
    entityId,
  });

  const arquivosValidos = normalizarFiles(files);

  assertAllFilesValid(arquivosValidos, owner.config);

  const anexosData = arquivosValidos.map((file) => ({
    tenantId,
    [owner.relationField]: entityId,
    nomeOriginal: file.originalname,
    path: normalizeStoredPath(owner.config.folder, file.filename),
    tipoMime: file.mimetype,
  }));

  await createManyAnexos(anexosData);

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'UPLOAD',
    entidade: owner.entityName,
    entidadeId: entityId,
    detalhes: `${arquivosValidos.length} anexo(s) enviado(s) para ${owner.entityLabel}.`,
  });

  const anexos = await listAnexosByOwner({
    tenantId,
    relationField: owner.relationField,
    entityId,
  });

  return {
    message: 'Anexo(s) enviado(s) com sucesso.',
    anexos,
  };
}

export async function removerAnexo({
  resource,
  tenantId,
  usuarioId,
  entityId,
  anexoId,
}) {
  const owner = await assertEntityBelongsToTenant({
    resource,
    tenantId,
    entityId,
  });

  const anexo = await findAnexoById({
    tenantId,
    anexoId,
  });

  if (!anexo || anexo[owner.relationField] !== entityId) {
    throw createHttpError(404, 'Anexo não encontrado.', 'ANEXO_NOT_FOUND');
  }

  // 🔥 CORREÇÃO AQUI
  await deleteAnexoById({
    tenantId,
    anexoId,
  });

  // Remoção física desacoplada
  try {
    deleteStoredFile(anexo.path);
  } catch (error) {
    console.error(
      `[ANEXO_FILE_DELETE_ERROR] anexoId=${anexoId} path=${anexo.path}`,
      error
    );
  }

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EXCLUSÃO',
    entidade: owner.entityName,
    entidadeId: entityId,
    detalhes: `Anexo "${anexo.nomeOriginal}" removido de ${owner.entityLabel}.`,
  });

  return {
    message: 'Anexo removido com sucesso.',
  };
}