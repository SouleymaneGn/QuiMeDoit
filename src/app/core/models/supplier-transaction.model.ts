import { PaymentMethod } from './transaction.model';

/** PURCHASE = achat à crédit (augmente ce que je dois), PAYMENT = règlement au fournisseur. */
export type SupplierTransactionType = 'PURCHASE' | 'PAYMENT';

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: SupplierTransactionType;
  label: string;
  amount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  /** Photo justificative d'un achat (facture, bon) : chemin dans le stockage. */
  photoPath?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
}

export type SupplierTransactionInput = Omit<
  SupplierTransaction,
  'id' | 'createdAt' | 'cancelledAt' | 'cancelReason'
>;
