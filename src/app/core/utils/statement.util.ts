/** Libellé et montant (toujours positif) à afficher pour le solde d'une situation de facture. */
export interface BalanceSummary {
  label: string;
  amount: number;
  /** Fin de phrase du NB du PDF, suivie du montant en gras. */
  notePrefix: string;
}

export function summarizeBalance(balance: number): BalanceSummary {
  if (balance > 0) {
    return { label: 'Solde restant à payer', amount: balance, notePrefix: 'Le solde calculé est donc ' };
  }
  if (balance < 0) {
    return { label: 'Avance du client', amount: -balance, notePrefix: 'Le client dispose donc d’une avance de ' };
  }
  return { label: 'Compte soldé', amount: 0, notePrefix: 'Le solde calculé est donc ' };
}
