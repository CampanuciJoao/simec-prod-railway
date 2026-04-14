// Ficheiro: backend-simec/middleware/uploadMiddleware.js

import multer from 'multer';
import { createUploadInstance } from '../services/uploads/uploadConfig.js';
import { getUploadResourceConfig } from '../services/uploads/uploadFieldRegistry.js';
import { createHttpError } from '../services/uploads/uploadValidationService.js';

function traduzirMulterError(err, config) {
  if (!(err instanceof multer.MulterError)) {
    return err;
  }

  const error = createHttpError(
    400,
    'Erro ao processar upload.',
    err.code || 'UPLOAD_ERROR'
  );

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      error.message = `Arquivo excede o tamanho máximo permitido (${Math.round(
        config.maxFileSize / (1024 * 1024)
      )} MB).`;
      return error;

    case 'LIMIT_FILE_COUNT':
      error.message = `Quantidade máxima de arquivos excedida. Limite: ${config.maxCount}.`;
      return error;

    case 'LIMIT_UNEXPECTED_FILE':
      error.message = `Campo multipart inválido. Use o campo "${config.fieldName}".`;
      return error;

    default:
      return error;
  }
}

export function uploadFor(resource) {
  const config = getUploadResourceConfig(resource);

  if (!config) {
    throw createHttpError(
      500,
      `Upload resource inválido: ${resource}`,
      'UPLOAD_RESOURCE_INVALID'
    );
  }

  const uploader = createUploadInstance(resource).array(
    config.fieldName,
    config.maxCount
  );

  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (!err) {
        return next();
      }

      const normalizedError = traduzirMulterError(err, config);
      return next(normalizedError);
    });
  };
}