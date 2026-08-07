import { Observable } from 'rxjs';
import { Transaction, TransactionInput } from '../models/transaction.model';

export abstract class TransactionRepository {
  abstract getAll(): Observable<Transaction[]>;
  abstract getByCustomerId(customerId: string): Observable<Transaction[]>;
  abstract getByDateRange(from: Date, to: Date): Observable<Transaction[]>;
  abstract create(input: TransactionInput): Observable<Transaction>;
  abstract update(id: string, patch: Partial<TransactionInput>): Observable<Transaction>;
  abstract delete(id: string): Observable<void>;
}
