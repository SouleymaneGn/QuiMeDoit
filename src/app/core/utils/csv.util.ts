/**
 * Export CSV pour Excel / LibreOffice en français : séparateur « ; »,
 * BOM UTF-8 pour que les accents s'affichent correctement.
 */
const SEPARATOR = ';';

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers, ...rows].map(row => row.map(escapeCell).join(SEPARATOR)).join('\r\n');
}

/** Déclenche le téléchargement du fichier dans le navigateur (aucun envoi au serveur). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
