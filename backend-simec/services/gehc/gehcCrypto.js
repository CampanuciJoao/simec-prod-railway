import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// Deriva chave AES-256 (32 bytes) a partir do JWT_SECRET já presente no Railway.
// Se quiser isolamento total, defina GEHC_TOKEN_SECRET no Railway com 32+ chars.
function deriveKey() {
  const secret = process.env.GEHC_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET ou GEHC_TOKEN_SECRET não configurado — não é possível criptografar tokens GE.');
  return createHash('sha256').update(secret).digest(); // 32 bytes
}

// Formato armazenado: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
export function encryptToken(plaintext) {
  const key = deriveKey();
  const iv  = randomBytes(12); // 96 bits — ideal para GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(stored) {
  if (!stored) return null;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // valor antigo não-criptografado — retorna como está
  const [ivHex, tagHex, dataHex] = parts;
  const key     = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
