/**
 * DEBT    : dette du client (augmente ce qu'il me doit).
 * PAYMENT : paiement reçu du client.
 */
export type TransactionType = 'DEBT' | 'PAYMENT';

export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MOBILE_MONEY';

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  label: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  /** Qui a apporté l'argent, s'il ne s'agit pas du client lui-même (paiements). */
  paidBy?: string | null;
  /** Photo justificative (carnet, reçu, facture) : chemin dans le stockage, jamais l'image elle-même. */
  photoPath?: string | null;
  /** Opération annulée : visible dans l'historique, exclue des soldes. */
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

/** `createdAt` facultatif : date choisie par l'utilisateur (dette antidatée), sinon maintenant. */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'cancelledAt' | 'cancelReason'> & {
  createdAt?: string;
};
