export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Follow server pagination rather than requesting an oversized, clamped page. */
export async function collectLedgerPages<T>(
  fetchPage: (
    page: number
  ) => Promise<{ data: T[]; meta: { totalPages: number } }>
): Promise<{ data: T[] }> {
  const first = await fetchPage(1);
  const data = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page++) {
    data.push(...(await fetchPage(page)).data);
  }
  return { data };
}
