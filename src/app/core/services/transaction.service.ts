import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Transaction, TransactionInput } from '../models/transaction.model';
import { TransactionRepository } from '../repositories/transaction.repository';
import { computeBalance } from '../utils/balance.util';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly transactionsSignal = signal<Transaction[]>([]);
  private readonly loadedSignal = signal(false);

  readonly transactions = this.transactionsSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  /** Solde courant par client (somme DEBT − somme PAYMENT). */
  readonly balancesByCustomer = computed<Map<string, number>>(() => {
    const byCustomer = new Map<string, Transaction[]>();
    for (const t of this.transactionsSignal()) {
      const list = byCustomer.get(t.customerId) ?? [];
      list.push(t);
      byCustomer.set(t.customerId, list);
    }
    const balances = new Map<string, number>();
    for (const [customerId, txns] of byCustomer) {
      balances.set(customerId, computeBalance(txns));
    }
    return balances;
  });

  readonly totalToCollect = computed(() => {
    let total = 0;
    for (const balance of this.balancesByCustomer().values()) {
      if (balance > 0) total += balance;
    }
    return total;
  });

  readonly debtorsCount = computed(() => {
    let count = 0;
    for (const balance of this.balancesByCustomer().values()) {
      if (balance > 0) count++;
    }
    return count;
  });

  readonly recentActivity = computed(() => {
    return [...this.transactionsSignal()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  constructor(private readonly repository: TransactionRepository) {
    this.loadAll();
  }

  loadAll(): void {
    this.repository.getAll().subscribe(transactions => {
      this.transactionsSignal.set(transactions);
      this.loadedSignal.set(true);
    });
  }

  balanceForCustomer(customerId: string): number {
    return this.balancesByCustomer().get(customerId) ?? 0;
  }

  transactionsForCustomer(customerId: string): Transaction[] {
    return this.recentActivity().filter(t => t.customerId === customerId);
  }

  create(input: TransactionInput): Observable<Transaction> {
    return this.repository.create(input).pipe(
      tap(transaction => this.transactionsSignal.update(list => [...list, transaction]))
    );
  }
}
