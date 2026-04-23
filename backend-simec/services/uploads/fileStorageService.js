import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import r2 from './r2Client.js';

const BUCKET = process.env.R2_BUCKET_NAME;

export function generateStoredFilename(originalname = '') {
  const ext = path.extname(String(originalname || '')).toLowerCase();
  return `${uuidv4()}${ext}`;
}

export function normalizeStoredPath(folder, filename) {
  return `uploads/${folder}/${filename}`;
}

export async function uploadToR2(key, buffer, mimetype) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );
}

export async function getFromR2(key) {
  return r2.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export function deleteStoredFile(key) {
  if (!key || typeof key !== 'string') return;
  r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch((err) =>
    console.error('[R2_DELETE_ERROR]', key, err)
  );
}
