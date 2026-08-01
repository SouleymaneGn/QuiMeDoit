const GNF_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0
});

export function formatCurrency(amount: number, currency = 'GNF'): string {
  return `${GNF_FORMATTER.format(amount)} ${currency}`;
}
