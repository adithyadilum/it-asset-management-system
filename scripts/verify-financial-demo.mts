/** Read-only verification of the exhibition history through the real report loader. */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { loadPerHeadDataset } from '../src/lib/data/per-head-costs-repo';
import { calculatePerHeadCosts } from '../src/lib/per-head-costs';
import {
  addMonths,
  localDate,
  monthStart,
  reportDate,
} from '../src/lib/reporting-time';

const to =
  process.argv.find((arg) => arg.startsWith('--as-of='))?.slice(8) ??
  localDate(Date.now());
const from = localDate(addMonths(monthStart(reportDate(to)), -18));
const data = await loadPerHeadDataset();
const report = calculatePerHeadCosts(data, {
  from,
  to,
  asOf: `${to}T23:59:59+05:30`,
});
assert.equal(
  report.exceptions.length,
  0,
  JSON.stringify(report.exceptions.map((e) => e.message))
);
assert.equal(
  Math.round(report.summary.sourceCost * 100),
  Math.round((report.summary.allocatedCost + report.summary.overheadCost) * 100)
);
assert.equal(report.trend.length, 19);
assert(
  report.trend.every((point) => point.total > 0),
  'Every reporting month must have source expenses.'
);
assert(
  report.summary.unusedSoftwareCost > 0,
  'Unused seats must contribute overhead.'
);
for (const component of [
  'directDepreciation',
  'sharedDepreciation',
  'software',
  'repairs',
] as const) {
  assert(
    report.people.some((person) => person[component] > 0),
    `Missing ${component} example.`
  );
}
for (const point of report.trend) {
  const people = Object.values(report.personTrend).reduce(
    (sum, months) =>
      sum + (months.find((m) => m.month === point.month)?.amount ?? 0),
    0
  );
  assert.equal(Math.round(people * 100), Math.round(point.allocated * 100));
}
process.stdout.write(
  JSON.stringify(
    {
      from,
      to,
      people: report.summary.peopleCount,
      equipment: data.assets.filter((a) => a.pillar !== 'Software').length,
      monthlyPoints: report.trend.length,
      summary: report.summary,
      monthlyCosts: report.trend,
      exceptions: report.exceptions.length,
    },
    null,
    2
  ) + '\n',
  () => process.exit(0)
);
