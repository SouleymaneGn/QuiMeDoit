import { Transaction } from '../models/transaction.model';

export function computeBalance(transactions: Transaction[]): number {
  return transactions.reduce((balance, t) => {
    return t.type === 'DEBT' ? balance + t.amount : balance - t.amount;
  }, 0);
}
