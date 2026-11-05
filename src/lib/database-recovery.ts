import { ServiceUnavailableError } from '@/lib/service-availability';

function errorChain(error: unknown): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();
  while (error && typeof error === 'object' && !seen.has(error)) {
    seen.add(error);
    chain.push(error as Record<string, unknown>);
    error = (error as { cause?: unknown }).cause;
  }
  return chain;
}

export function isDatabaseConnectionError(error: unknown): boolean {
  return errorChain(error).some(
    ({ code, message }) =>
      (typeof code === 'string' &&
        (/^08\w{3}$/.test(code) ||
          [
            'ECONNRESET',
            'ECONNREFUSED',
            'EPIPE',
            'ETIMEDOUT',
            'ENETUNREACH',
            'EHOSTUNREACH',
            'ENOTFOUND',
            'EAI_AGAIN',
            '57P01',
            '57P02',
            '57P03',
            '53300',
            '55P03',
          ].includes(code))) ||
      (typeof message === 'string' &&
        /^(Connection (?:terminated|closed)|Client has encountered a connection error|timeout exceeded when trying to connect|Connection terminated due to connection timeout|Query read timeout|All attempts to open a WebSocket to connect to the database failed|WebSocket (?:is not open|was closed))/i.test(
          message
        ))
  );
}

export function isServiceUnavailable(error: unknown): boolean {
  return (
    error instanceof ServiceUnavailableError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'SERVICE_UNAVAILABLE') ||
    isDatabaseConnectionError(error)
  );
}

let lastWarningAt = -Infinity;
export function warnDatabaseUnavailable(error: unknown): void {
  if (Date.now() - lastWarningAt < 30_000) return;
  lastWarningAt = Date.now();
  const code = errorChain(error).find((e) => typeof e.code === 'string')?.code;
  // Never log a Drizzle error object: its message includes SQL and parameters.
  console.warn('[DB] Connection unavailable; requests can retry.', {
    code: code ?? 'CONNECTION_CLOSED',
  });
}

/** Only pass a read here. Transactions/writes must never be replayed implicitly. */
export async function readDatabase<T>(read: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (!isDatabaseConnectionError(error)) throw error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      warnDatabaseUnavailable(error);
      // No raw cause: development error payloads must not include SQL/PII either.
      throw new ServiceUnavailableError();
    }
  }
}
