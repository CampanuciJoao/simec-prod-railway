// Ficheiro: backend-simec/services/uploads/uploadConfig.js

import multer from 'multer';
import {
  assertUploadResourceExists,
  assertMimeAllowed,
} from './uploadValidationService.js';
import {
  ensureUploadDir,
  generateStoredFilename,
} from './fileStorageService.js';

export function createUploadInstance(resource) {
  const config = assertUploadResourceExists(resource);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const absoluteDir = ensureUploadDir(config.folder);
        cb(null, absoluteDir);
      } catch (error) {
        cb(error);
      }
    },

    filename: (req, file, cb) => {
      try {
        const filename = generateStoredFilename(file.originalname);
        cb(null, filename);
      } catch (error) {
        cb(error);
      }
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: config.maxFileSize,
      files: config.maxCount,
    },
    fileFilter: (req, file, cb) => {
      try {
        assertMimeAllowed(file, config);
        cb(null, true);
      } catch (error) {
        cb(error);
      }
    },
  });
}