import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import postgres from 'postgres';

const inventory = process.argv.includes('--inventory');

// Isolated cluster: this script never reads DATABASE_URL or application secrets.
const parent = resolve(tmpdir());
const cluster = mkdtempSync(join(parent, 'itams-financial-test-'));
const binary = (name) =>
  process.env.POSTGRES_BIN
    ? join(
        process.env.POSTGRES_BIN,
        process.platform === 'win32' ? `${name}.exe` : name
      )
    : name;
const server = createServer();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
await new Promise((done) => server.close(done));
let started = false,
  client;
try {
  execFileSync(
    binary('initdb'),
    [
      '-D',
      cluster,
      '-U',
      'financial_test',
      '--auth=trust',
      '--no-locale',
      '--encoding=UTF8',
    ],
    { stdio: 'ignore', windowsHide: true }
  );
  execFileSync(
    binary('pg_ctl'),
    [
      '-D',
      cluster,
      '-l',
      join(cluster, 'server.log'),
      '-o',
      `-h 127.0.0.1 -p ${port}`,
      '-w',
      'start',
    ],
    { stdio: 'ignore', windowsHide: true }
  );
  started = true;
  const url = `postgresql://financial_test@127.0.0.1:${port}/postgres`;
  client = postgres(url, { max: 1, onnotice: () => {} });
  const directory = join(process.cwd(), 'src', 'db', 'migrations');
  const journal = JSON.parse(
    readFileSync(join(directory, 'meta', '_journal.json'), 'utf8')
  );
  for (let run = 1; run <= 2; run++) {
    for (const entry of journal.entries)
      await client.unsafe(
        readFileSync(join(directory, `${entry.tag}.sql`), 'utf8')
      );
    console.log(
      `Migration pass ${run}: ${journal.entries.length} migrations applied successfully.`
    );
  }
  await client.end();
  client = null;
  const code = await new Promise((done, reject) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/vitest/vitest.mjs',
        'run',
        '--pool=forks',
        '--maxWorkers=1',
        inventory
          ? 'src/test/inventory/mobile-inventory-database.integration.test.ts'
          : 'src/test/financials/per-head-database.integration.test.ts',
      ],
      {
        stdio: 'inherit',
        windowsHide: true,
        env: {
          ...process.env,
          ...(inventory
            ? { INVENTORY_TEST_DATABASE_URL: url }
            : { FINANCIAL_TEST_DATABASE_URL: url }),
        },
      }
    );
    child.on('error', reject);
    child.on('exit', done);
  });
  process.exitCode = code ?? 1;
  if (!inventory && code === 0 && process.argv.includes('--ui')) {
    const uiCode = await new Promise((done, reject) => {
      const child = spawn(process.execPath, ['scripts/smoke-per-head-ui.mjs'], {
        stdio: 'inherit',
        windowsHide: true,
        env: {
          ...process.env,
          ...(inventory
            ? { INVENTORY_TEST_DATABASE_URL: url }
            : { FINANCIAL_TEST_DATABASE_URL: url }),
        },
      });
      child.on('error', reject);
      child.on('exit', done);
    });
    process.exitCode = uiCode ?? 1;
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Database verification failed.'
  );
  process.exitCode = 1;
} finally {
  if (client) await client.end();
  if (started)
    execFileSync(
      binary('pg_ctl'),
      ['-D', cluster, '-m', 'fast', '-w', 'stop'],
      { stdio: 'ignore', windowsHide: true }
    );
  // Verify the resolved target before a recursive cleanup on Windows.
  if (
    dirname(resolve(cluster)) !== parent ||
    !resolve(cluster).startsWith(join(parent, 'itams-financial-test-'))
  )
    throw new Error('Refusing to clean an unexpected database path.');
  rmSync(cluster, { recursive: true, force: true });
}
