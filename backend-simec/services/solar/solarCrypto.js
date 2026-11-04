// Crypto da camada Solar generica. Reusa o secret FOXESS_TOKEN_SECRET
// (ou SOLAR_TOKEN_SECRET se definido, com fallback pra FoxESS pra evitar
// quebrar instalacoes existentes). AES-256-GCM.
//
// Credenciais sao sempre JSON serializado antes de criptografar, pra
// suportar providers com multiplos campos (ex: Sungrow = { apiKey,
// accessKey, rsaKey }). Mesmo FoxESS, que so tem 1 campo, e serializado
// como { apiKey: "..." } pra padronizar.
//
// Compatibilidade retroativa com migration 20261104000001: entradas
// gravadas antes do refactor vem com prefixo 'LEGACY_V1:' seguido do
// apiKeyCrypt antigo (que era string pura, nao JSON). O decrypt detecta
// e retorna no formato novo { apiKey }.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function deriveKey() {
  const secret = process.env.SOLAR_TOKEN_SECRET
              || process.env.FOXESS_TOKEN_SECRET
              || process.env.GEHC_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'SOLAR_TOKEN_SECRET (ou FOXESS_TOKEN_SECRET) nao configurado. ' +
      'Defina essa variavel no Railway (>=32 chars) antes de usar a integracao Solar.'
    );
  }
  return createHash('sha256').update(secret).digest();
}

function encryptString(plaintext) {
  const key = deriveKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptString(stored) {
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // nao-encriptado (bootstrap/legacy)
  const [ivHex, tagHex, dataHex] = parts;
  const key = deriveKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Serializa + criptografa credencial (objeto JS) pra gravar no banco.
 * Aceita qualquer shape — cada adapter define o que precisa.
 */
export function encryptCredential(obj) {
  if (obj == null || typeof obj !== 'object') {
    throw new Error('encryptCredential: credential precisa ser objeto');
  }
  return encryptString(JSON.stringify(obj));
}

/**
 * Descriptografa + desserializa credencial. Trata o caso LEGACY_V1
 * (dados do FoxESS pre-refactor) retornando como { apiKey: <string> }.
 */
export function decryptCredential(stored) {
  if (!stored) return null;
  // Formato legado da migration do FoxESS: 'LEGACY_V1:<iv>:<tag>:<cipher>'
  if (stored.startsWith('LEGACY_V1:')) {
    const raw = decryptString(stored.slice('LEGACY_V1:'.length));
    return { apiKey: raw };
  }
  const json = decryptString(stored);
  try {
    return JSON.parse(json);
  } catch {
    // Fallback: valor sem JSON — trata como { apiKey }.
    return { apiKey: json };
  }
}
