/**
 * DEBT       : dette du client (augmente ce qu'il me doit).
 * PAYMENT    : paiement reçu du client.
 * DEPOSIT    : argent confié par le client (avance, épargne).
 * WITHDRAWAL : le client reprend de l'argent déposé.
 */
export type TransactionType = 'DEBT' | 'PAYMENT' | 'DEPOSIT' | 'WITHDRAWAL';

export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MOBILE_MONEY';

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  label: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  /** Qui a apporté l'argent, s'il ne s'agit pas du client lui-même (paiements et dépôts). */
  paidBy?: string | null;
  /** Opération annulée : visible dans l'historique, exclue des soldes. */
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'cancelledAt' | 'cancelReason'>;
