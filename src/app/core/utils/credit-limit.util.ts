/** Un plafond n'est actif que s'il est strictement positif. */
export function hasCreditLimit(creditLimit: number | null | undefined): creditLimit is number {
  return typeof creditLimit === 'number' && creditLimit > 0;
}

/** Vrai si la dette (solde positif) dépasse strictement le plafond du client. */
export function isOverCreditLimit(balance: number, creditLimit: number | null | undefined): boolean {
  return hasCreditLimit(creditLimit) && balance > creditLimit;
}
