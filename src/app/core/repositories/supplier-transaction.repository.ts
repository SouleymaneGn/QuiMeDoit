import { Observable } from 'rxjs';
import { SupplierTransaction, SupplierTransactionInput } from '../models/supplier-transaction.model';

export abstract class SupplierTransactionRepository {
  abstract getAll(): Observable<SupplierTransaction[]>;
  abstract getBySupplierId(supplierId: string): Observable<SupplierTransaction[]>;
  abstract create(input: SupplierTransactionInput): Observable<SupplierTransaction>;
  abstract update(id: string, patch: Partial<SupplierTransactionInput>): Observable<SupplierTransaction>;
  /** Annule l'opération (motif obligatoire) : elle n'est jamais supprimée. */
  abstract cancel(id: string, reason: string): Observable<SupplierTransaction>;
}
