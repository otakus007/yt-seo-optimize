import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function key(): Buffer {
  const k = process.env.TOKEN_KEY;
  if (!k || k.length !== 64) throw new Error('TOKEN_KEY must be 32 bytes hex (openssl rand -hex 32)');
  return Buffer.from(k, 'hex');
}

/** AES-256-GCM. Output = base64(iv(12) | tag(16) | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

export function decrypt(b64: string): string {
  const buf = Buffer.from(b64, 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}
