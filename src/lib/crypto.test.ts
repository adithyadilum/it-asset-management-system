import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// We need to control ENCRYPTION_SECRET for these tests. The `crypto` module
// caches the key, so we reset the module between tests.
// ---------------------------------------------------------------------------

const VALID_SECRET_BASE64 = Buffer.from(
  'aaaabbbbccccddddaaaabbbbccccdddd' // exactly 32 bytes
).toString('base64');

describe('crypto module', () => {
  let encrypt: typeof import('@/lib/crypto').encrypt;
  let decrypt: typeof import('@/lib/crypto').decrypt;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      serverEnv: { ENCRYPTION_SECRET: VALID_SECRET_BASE64 },
    }));
    const mod = await import('@/lib/crypto');
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  afterEach(() => {
    vi.doUnmock('@/lib/env');
  });

  it('encrypt returns a string in the format iv:authTag:ciphertext', () => {
    const encrypted = encrypt('hello world');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV should be base64
    expect(parts[0].length).toBeGreaterThan(0);
    // AuthTag should be base64
    expect(parts[1].length).toBeGreaterThan(0);
    // Ciphertext should be hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('roundtrip: encrypt then decrypt returns original plaintext', () => {
    const plaintext = 'The quick brown fox jumps over the lazy dog';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('works with empty string', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('works with special characters and unicode', () => {
    const plaintext = '🔑 API Key: sk-test_12345! @#$%^&*()';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypt produces different ciphertexts for same plaintext (random IV)', () => {
    const encrypted1 = encrypt('same text');
    const encrypted2 = encrypt('same text');
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('decrypt throws for tampered ciphertext', () => {
    const encrypted = encrypt('sensitive data');
    const parts = encrypted.split(':');
    // Tamper with the ciphertext
    parts[2] = 'deadbeef' + parts[2].slice(8);
    const tampered = parts.join(':');
    expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
  });

  it('decrypt throws for invalid format (missing parts)', () => {
    expect(() => decrypt('onlyonepart')).toThrow('Failed to decrypt data');
    expect(() => decrypt('two:parts')).toThrow('Failed to decrypt data');
  });

  it('decrypt throws for completely invalid data', () => {
    expect(() => decrypt('aaa:bbb:ccc')).toThrow('Failed to decrypt data');
  });
});

describe('crypto module - missing key', () => {
  it('throws when ENCRYPTION_SECRET is unset', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      serverEnv: { ENCRYPTION_SECRET: undefined },
    }));

    const mod = await import('@/lib/crypto');
    expect(() => mod.encrypt('test')).toThrow('ENCRYPTION_SECRET not set');
  });

  it('throws when ENCRYPTION_SECRET is not 32 bytes', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      serverEnv: {
        ENCRYPTION_SECRET: Buffer.from('tooshort').toString('base64'),
      },
    }));

    const mod = await import('@/lib/crypto');
    expect(() => mod.encrypt('test')).toThrow('must be exactly 32 bytes');
  });
});
