import crypto from 'crypto';

function getSecret() {
  const secret =
    process.env.PACS_CREDENTIALS_SECRET || process.env.JWT_SECRET || '';

  if (!secret) {
    throw new Error('PACS_CREDENTIALS_SECRET_OR_JWT_SECRET_NOT_CONFIGURED');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptJson(value) {
  const payload = JSON.stringify(value || {});
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getSecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(payload, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  });
}

export function decryptJson(value) {
  if (!value) return {};

  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getSecret(),
    Buffer.from(parsed.iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}
