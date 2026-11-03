import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// FOXESS_TOKEN_SECRET deve ser definido no Railway (>= 32 chars).
// Independente de JWT_SECRET e GEHC_TOKEN_SECRET — rotacionar um nao
// pode quebrar os outros. Fallback pra GEHC_TOKEN_SECRET pra facilitar
// bootstrap em dev (nao assumir em prod — logar warning).
function deriveKey() {
  const secret = process.env.FOXESS_TOKEN_SECRET || process.env.GEHC_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'FOXESS_TOKEN_SECRET nao configurado. Defina esta variavel no Railway (>=32 chars) ' +
      'antes de usar a integracao FoxESS. Pode cair pra GEHC_TOKEN_SECRET em bootstrap.'
    );
  }
  return createHash('sha256').update(secret).digest();
}

// Formato armazenado: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
export function encryptApiKey(plaintext) {
  const key = deriveKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptApiKey(stored) {
  if (!stored) return null;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // nao-encriptado (bootstrap) — retorna direto
  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
