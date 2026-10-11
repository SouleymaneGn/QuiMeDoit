import { TransactionType } from './transaction.model';

/** Lien public vers le relevé d'un client. */
export interface StatementShare {
  token: string;
  customerId: string;
  createdAt: string;
  expiresAt: string;
}

export interface SharedStatementTransaction {
  type: TransactionType;
  label: string;
  amount: number;
  createdAt: string;
}

/** Données renvoyées pour un lien public valide (lecture seule, sans compte). */
export interface SharedStatementData {
  businessName: string;
  currency: string;
  customerName: string;
  customerPhone?: string;
  expiresAt: string;
  transactions: SharedStatementTransaction[];
}
