import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, of, take } from 'rxjs';
import { SupplierTransaction, SupplierTransactionInput } from '../../models/supplier-transaction.model';
import { SupplierTransactionRepository } from '../supplier-transaction.repository';

@Injectable({ providedIn: 'root' })
export class JsonSupplierTransactionRepository extends SupplierTransactionRepository {
  private readonly transactions$ = new BehaviorSubject<SupplierTransaction[] | null>(null);
  private loaded = false;

  constructor(private readonly http: HttpClient) {
    super();
  }

  private ensureLoaded(): Observable<SupplierTransaction[]> {
    if (!this.loaded) {
      this.loaded = true;
      this.http
        .get<SupplierTransaction[]>('assets/mock/supplier-transactions.json')
        .subscribe(data => this.transactions$.next(data));
    }
    return this.transactions$.pipe(
      filter((list): list is SupplierTransaction[] => list !== null),
      take(1)
    );
  }

  getAll(): Observable<SupplierTransaction[]> {
    return this.ensureLoaded();
  }

  getBySupplierId(supplierId: string): Observable<SupplierTransaction[]> {
    return this.ensureLoaded().pipe(map(list => list.filter(t => t.supplierId === supplierId)));
  }

  create(input: SupplierTransactionInput): Observable<SupplierTransaction> {
    const current = this.transactions$.value ?? [];
    const transaction: SupplierTransaction = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.transactions$.next([...current, transaction]);
    return of(transaction);
  }

  update(id: string, patch: Partial<SupplierTransactionInput>): Observable<SupplierTransaction> {
    const current = this.transactions$.value ?? [];
    const updatedList = current.map(t => (t.id === id ? { ...t, ...patch } : t));
    this.transactions$.next(updatedList);
    const updated = updatedList.find(t => t.id === id);
    if (!updated) {
      throw new Error(`SupplierTransaction ${id} introuvable`);
    }
    return of(updated);
  }

  cancel(id: string, reason: string): Observable<SupplierTransaction> {
    const current = this.transactions$.value ?? [];
    const cancelled = current.find(t => t.id === id);
    if (!cancelled) {
      throw new Error(`SupplierTransaction ${id} introuvable`);
    }
    const updated = { ...cancelled, cancelledAt: new Date().toISOString(), cancelReason: reason.trim() };
    this.transactions$.next(current.map(t => (t.id === id ? updated : t)));
    return of(updated);
  }
}
