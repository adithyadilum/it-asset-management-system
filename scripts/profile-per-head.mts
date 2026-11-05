/** Read-only report timings; source snapshots stay in ignored local test artifacts. */
import 'dotenv/config';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadPerHeadDataset } from '../src/lib/data/per-head-costs-repo';
import { calculatePerHeadCosts } from '../src/lib/per-head-costs';
import {
  localDate,
  monthStart,
  addMonths,
  reportDate,
} from '../src/lib/reporting-time';

const to = localDate(Date.now()),
  from = localDate(addMonths(monthStart(reportDate(to)), -5));
const rows = [];
if (process.argv.includes('--compare')) {
  const options = {
    from: '2026-06-01',
    to: '2026-11-06',
    asOf: '2026-11-06T12:00:00+05:30',
  };
  const reports = [];
  for (const file of ['before', 'after']) {
    const data = JSON.parse(
      await readFile(`test-results/per-head-performance/${file}.json`, 'utf8')
    );
    const report = calculatePerHeadCosts(data, options);
    // Row order from SQL may differ; compare all detail lines and allocations.
    for (const values of Object.values(report.details))
      values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    for (const values of Object.values(report.currentAssets))
      values.sort((a, b) => a.assetId.localeCompare(b.assetId));
    for (const values of Object.values(report.personTrend))
      values.sort((a, b) => a.month.localeCompare(b.month));
    reports.push(report);
  }
  assert.deepEqual(reports[1], reports[0]);
  process.stdout.write(
    'Snapshot comparison passed: every person, source detail, current value, monthly amount and reconciliation total is unchanged.\n',
    () => process.exit(0)
  );
} else {
  for (let run = 1; run <= 3; run++) {
    const started = performance.now();
    const data = await loadPerHeadDataset();
    const fetched = performance.now();
    const report = calculatePerHeadCosts(data, {
      from,
      to,
      asOf: new Date().toISOString(),
      detailPersonId: null,
    });
    const calculated = performance.now();
    rows.push({
      run,
      databaseMs: Math.round(fetched - started),
      calculationMs: Math.round(calculated - fetched),
      people: report.people.length,
      assets: data.assets.length,
      exceptions: report.exceptions.length,
    });
    if (run === 1) {
      await mkdir('test-results/per-head-performance', { recursive: true });
      await writeFile(
        `test-results/per-head-performance/${process.argv.includes('--after') ? 'after' : 'before'}.json`,
        JSON.stringify(data)
      );
    }
  }
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n', () =>
    process.exit(0)
  );
}
