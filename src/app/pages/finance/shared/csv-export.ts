/**
 * Writes a CSV the browser downloads, with a UTF-8 byte-order mark so Excel
 * renders Arabic instead of mojibake — without it every Arabic column opens as
 * question marks, which is the whole point of the export.
 */
export function downloadCsv(
  filename: string,
  header: (string | number)[],
  rows: (string | number)[][]
): void {
  const escape = (cell: string | number) => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');

  const blob = new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
