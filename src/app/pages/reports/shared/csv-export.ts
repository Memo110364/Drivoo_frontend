/**
 * Downloads a table as CSV. Excel reads this directly, and the leading BOM is
 * what stops it mangling Arabic labels into mojibake.
 */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]): void {
  const escape = (cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
