const AMOUNT_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0
});

export function formatCurrency(amount: number, currency = 'CFA'): string {
  return `${AMOUNT_FORMATTER.format(amount)} ${currency}`;
}
