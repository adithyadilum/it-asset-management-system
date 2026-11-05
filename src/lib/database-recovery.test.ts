import { describe, expect, it, vi } from 'vitest';
import { isDatabaseConnectionError, readDatabase } from './database-recovery';
import { ServiceUnavailableError } from './service-availability';
describe('database read recovery', () => {
  it('retries a disconnected read once on the next connection', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
      .mockResolvedValueOnce({ id: 1 });
    expect(await readDatabase(read)).toEqual({ id: 1 });
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('returns a safe outage error after bounded retries', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cause = Object.assign(
      new Error('Connection terminated unexpectedly'),
      { code: 'ECONNRESET' }
    );
    const read = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Failed query: select secret where user=private@example.com',
          { cause }
        )
      );
    let failure: unknown;
    try {
      await readDatabase(read);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ServiceUnavailableError);
    expect(String(failure)).not.toContain('private@example.com');
    expect(failure).not.toHaveProperty('cause');
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('does not retry SQL errors or turn bugs into availability failures', async () => {
    const error = Object.assign(new Error('Syntax error'), { code: '42601' });
    const read = vi.fn().mockRejectedValue(error);
    await expect(readDatabase(read)).rejects.toBe(error);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('handles nested and cyclic error causes', () => {
    const error: { cause?: unknown; code: string } = { code: 'ECONNRESET' };
    error.cause = error;
    expect(isDatabaseConnectionError(error)).toBe(true);
    expect(isDatabaseConnectionError({ cause: { code: '23505' } })).toBe(false);
  });
});
