import { createHash, pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

const LEGACY_HASH_ITERATIONS = 100_000;
const LEGACY_HASH_LENGTH = 32;
const LEGACY_HASH_DIGEST = 'sha256';
const LEGACY_HASH_SALT = 'eitams-api-key-hash-v1';

/**
 * Hashes an API key for storage and lookup.
 *
 * A single SHA-256 pass is the right primitive here. Key stretching (PBKDF2,
 * scrypt, argon2) exists to make brute force expensive against *low-entropy*
 * secrets such as user-chosen passwords. These keys are generated server-side
 * as `randomBytes(32)` — 256 bits — so an offline attacker holding the
 * `key_hash` column cannot brute force them regardless of hash cost. The
 * previous 100,000-iteration PBKDF2 therefore bought no security while adding
 * roughly 50-100 ms of blocking CPU to every external API request, and made
 * invalid keys as expensive to reject as valid ones.
 *
 * Produces 64 hex characters, matching the existing `varchar(64)` column.
 */
export function hashApiKey(plainTextKey: string): string {
  return createHash('sha256').update(plainTextKey).digest('hex');
}

/**
 * The superseded PBKDF2 scheme.
 *
 * Stored hashes cannot be recomputed from the database, so keys issued before
 * the change are still verified with this and rewritten to the current scheme
 * on first successful use. Once no legacy keys remain in circulation, set
 * `API_KEY_LEGACY_HASH_FALLBACK=false` to stop paying this cost on failed
 * lookups, then delete this function.
 */
export async function hashApiKeyLegacy(plainTextKey: string): Promise<string> {
  const derivedKey = await pbkdf2Async(
    plainTextKey,
    LEGACY_HASH_SALT,
    LEGACY_HASH_ITERATIONS,
    LEGACY_HASH_LENGTH,
    LEGACY_HASH_DIGEST
  );

  return derivedKey.toString('hex');
}
