const AMOUNT_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0
});

export function formatCurrency(amount: number, currency = 'CFA'): string {
  return `${AMOUNT_FORMATTER.format(amount)} ${currency}`;
}

/**
 * Montant sans devise, avec des espaces ordinaires comme séparateurs de milliers :
 * les polices standard de jsPDF n'affichent pas les espaces insécables d'Intl (U+202F / U+00A0).
 */
export function formatAmountPlain(amount: number): string {
  return AMOUNT_FORMATTER.format(amount).replace(/[  ]/g, ' ').replace(/−/g, '-');
}
