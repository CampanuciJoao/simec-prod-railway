// Ficheiro: backend-simec/services/uploads/fileStorageService.js

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function buildRelativeUploadDir(folder) {
  return path.join('uploads', folder);
}

export function buildAbsoluteUploadDir(folder) {
  return path.resolve(buildRelativeUploadDir(folder));
}

export function ensureUploadDir(folder) {
  const absoluteDir = buildAbsoluteUploadDir(folder);
  fs.mkdirSync(absoluteDir, { recursive: true });
  return absoluteDir;
}

export function generateStoredFilename(originalname = '') {
  const ext = path.extname(String(originalname || '')).toLowerCase();
  return `${uuidv4()}${ext}`;
}

export function normalizeStoredPath(folder, filename) {
  return path.join('uploads', folder, filename).replace(/\\/g, '/');
}

export function deleteStoredFile(storedPath) {
  if (!storedPath || typeof storedPath !== 'string') {
    return false;
  }

  const absolutePath = path.resolve(storedPath);

  if (!fs.existsSync(absolutePath)) {
    return false;
  }

  fs.unlinkSync(absolutePath);
  return true;
}