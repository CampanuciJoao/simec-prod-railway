// Ficheiro: backend-simec/services/uploads/uploadValidationService.js

import path from 'path';
import { getUploadResourceConfig } from './uploadFieldRegistry.js';

export function createHttpError(status, message, code = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function assertUploadResourceExists(resource) {
  const config = getUploadResourceConfig(resource);

  if (!config) {
    throw createHttpError(
      500,
      `Recurso de upload "${resource}" não está configurado.`,
      'UPLOAD_RESOURCE_NOT_CONFIGURED'
    );
  }

  return config;
}

export function getSafeExtension(filename = '') {
  const ext = path.extname(String(filename || '')).toLowerCase();
  return ext || '';
}

export function isMimeAllowed(file, allowedMimeTypes = []) {
  const mime = String(file?.mimetype || '').toLowerCase();
  return allowedMimeTypes.includes(mime);
}

export function assertMimeAllowed(file, config) {
  if (!isMimeAllowed(file, config.allowedMimeTypes)) {
    throw createHttpError(
      400,
      `Tipo de arquivo não permitido: ${file?.mimetype || 'desconhecido'}.`,
      'INVALID_FILE_TYPE'
    );
  }
}

export function assertFilesProvided(files = []) {
  if (!Array.isArray(files) || files.length === 0) {
    throw createHttpError(
      400,
      'Nenhum arquivo foi enviado. Use o campo multipart "file".',
      'FILES_REQUIRED'
    );
  }
}

export function assertFileCount(files = [], config) {
  if (files.length > config.maxCount) {
    throw createHttpError(
      400,
      `Quantidade máxima de arquivos excedida. Limite: ${config.maxCount}.`,
      'MAX_FILE_COUNT_EXCEEDED'
    );
  }
}

export function assertAllFilesValid(files = [], config) {
  assertFilesProvided(files);
  assertFileCount(files, config);

  for (const file of files) {
    assertMimeAllowed(file, config);
  }
}