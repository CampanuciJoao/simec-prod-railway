import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// GEHC_TOKEN_SECRET deve ser definido no Railway como variável independente (32+ chars).
// NÃO reutiliza JWT_SECRET — rotacionar JWT não pode quebrar tokens GEHC já criptografados no banco.
function deriveKey() {
  const secret = process.env.GEHC_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'GEHC_TOKEN_SECRET não configurado. Defina esta variável no Railway antes de usar a integração GEHC. ' +
      'Ela deve ser independente do JWT_SECRET para que rotações de JWT não corrompam tokens armazenados.'
    );
  }
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
