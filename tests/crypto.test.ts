/** @jest-environment node */
import { decrypt, encrypt } from '../src/lib/crypto';

describe('token crypto', () => {
  beforeAll(() => { process.env.TOKEN_KEY = 'a'.repeat(64); });
  it('round-trips and never stores plaintext', () => {
    const enc = encrypt('1//refresh-token');
    expect(enc).not.toContain('refresh');
    expect(decrypt(enc)).toBe('1//refresh-token');
    expect(encrypt('x')).not.toBe(encrypt('x')); // random IV
  });
  it('rejects tampering', () => {
    const enc = Buffer.from(encrypt('secret'), 'base64');
    enc[enc.length - 1] ^= 1;
    expect(() => decrypt(enc.toString('base64'))).toThrow();
  });
});
