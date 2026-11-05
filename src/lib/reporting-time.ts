// Sri Lanka has no daylight-saving transitions. Date-only input is local midnight.
export const REPORTING_TIMEZONE = 'Asia/Colombo';
const OFFSET = 330 * 60_000;
export const DAY_MS = 86_400_000;
export function reportDate(value: string): number {
  return Date.parse(`${value}T00:00:00+05:30`);
}
export function localDate(value: number | Date): string {
  return new Date(Number(value) + OFFSET).toISOString().slice(0, 10);
}
export function monthStart(value: number): number {
  const date = new Date(value + OFFSET);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) - OFFSET;
}
export function addMonths(value: number, months: number): number {
  const date = new Date(value + OFFSET);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime() - OFFSET;
}
export function monthKey(value: number): string {
  return localDate(value).slice(0, 7);
}
export function monthDifference(from: number, to: number): number {
  const a = new Date(from + OFFSET),
    b = new Date(to + OFFSET);
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    b.getUTCMonth() -
    a.getUTCMonth()
  );
}
