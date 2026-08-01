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
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
