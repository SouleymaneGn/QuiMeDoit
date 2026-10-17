import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, of, take } from 'rxjs';
import { Transaction, TransactionInput } from '../../models/transaction.model';
import { TransactionRepository } from '../transaction.repository';

@Injectable({ providedIn: 'root' })
export class JsonTransactionRepository extends TransactionRepository {
  private readonly transactions$ = new BehaviorSubject<Transaction[] | null>(null);
  private loaded = false;

  constructor(private readonly http: HttpClient) {
    super();
  }

  private ensureLoaded(): Observable<Transaction[]> {
    if (!this.loaded) {
      this.loaded = true;
      this.http
        .get<Transaction[]>('assets/mock/transactions.json')
        .subscribe(data => this.transactions$.next(data));
    }
    return this.transactions$.pipe(
      filter((list): list is Transaction[] => list !== null),
      take(1)
    );
  }

  getAll(): Observable<Transaction[]> {
    return this.ensureLoaded();
  }

  getByCustomerId(customerId: string): Observable<Transaction[]> {
    return this.ensureLoaded().pipe(
      map(list => list.filter(t => t.customerId === customerId))
    );
  }

  getByDateRange(from: Date, to: Date): Observable<Transaction[]> {
    return this.ensureLoaded().pipe(
      map(list =>
        list.filter(t => {
          const createdAt = new Date(t.createdAt).getTime();
          return createdAt >= from.getTime() && createdAt <= to.getTime();
        })
      )
    );
  }

  create(input: TransactionInput): Observable<Transaction> {
    const current = this.transactions$.value ?? [];
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: input.createdAt ?? new Date().toISOString()
    };
    this.transactions$.next([...current, transaction]);
    return of(transaction);
  }

  update(id: string, patch: Partial<TransactionInput>): Observable<Transaction> {
    const current = this.transactions$.value ?? [];
    const updatedList = current.map(t => (t.id === id ? { ...t, ...patch } : t));
    this.transactions$.next(updatedList);
    const updated = updatedList.find(t => t.id === id);
    if (!updated) {
      throw new Error(`Transaction ${id} introuvable`);
    }
    return of(updated);
  }

  cancel(id: string, reason: string): Observable<Transaction> {
    const current = this.transactions$.value ?? [];
    const cancelled = current.find(t => t.id === id);
    if (!cancelled) {
      throw new Error(`Transaction ${id} introuvable`);
    }
    const updated = { ...cancelled, cancelledAt: new Date().toISOString(), cancelReason: reason.trim() };
    this.transactions$.next(current.map(t => (t.id === id ? updated : t)));
    return of(updated);
  }
}
