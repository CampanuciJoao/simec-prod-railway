import multer from 'multer';
import { assertUploadResourceExists, assertMimeAllowed } from './uploadValidationService.js';

export function createUploadInstance(resource) {
  const config = assertUploadResourceExists(resource);

  return multer({
    storage: multer.memoryStorage(),
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
