import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

const API_KEY_HASH_ITERATIONS = 100_000;
const API_KEY_HASH_LENGTH = 32;
const API_KEY_HASH_DIGEST = 'sha256';
const API_KEY_HASH_SALT = 'eitams-api-key-hash-v1';

export async function hashApiKey(plainTextKey: string): Promise<string> {
  const derivedKey = await pbkdf2Async(
    plainTextKey,
    API_KEY_HASH_SALT,
    API_KEY_HASH_ITERATIONS,
    API_KEY_HASH_LENGTH,
    API_KEY_HASH_DIGEST
  );

  return derivedKey.toString('hex');
}
