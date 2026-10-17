import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Transaction, TransactionInput } from '../models/transaction.model';
import { TransactionRepository } from '../repositories/transaction.repository';
import { computeBalance, isCancelled } from '../utils/balance.util';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly transactionsSignal = signal<Transaction[]>([]);
  private readonly loadedSignal = signal(false);

  readonly transactions = this.transactionsSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  /** Opérations non annulées : base de toutes les listes et de tous les totaux. */
  readonly activeTransactions = computed(() => this.transactionsSignal().filter(t => !isCancelled(t)));

  /** Solde courant par client (DEBT − PAYMENT, annulations exclues). */
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

  /** Somme due aux clients ayant payé plus que leur dette (solde négatif). */
  readonly totalToRefund = computed(() => {
    let total = 0;
    for (const balance of this.balancesByCustomer().values()) {
      if (balance < 0) total += Math.abs(balance);
    }
    return total;
  });

  /** Nombre de clients ayant une dette en cours (solde positif). */
  readonly debtorsCount = computed(() => {
    let count = 0;
    for (const balance of this.balancesByCustomer().values()) {
      if (balance > 0) count++;
    }
    return count;
  });

  /** Nombre de clients à rembourser (solde négatif). */
  readonly creditorsCount = computed(() => {
    let count = 0;
    for (const balance of this.balancesByCustomer().values()) {
      if (balance < 0) count++;
    }
    return count;
  });

  /** Date (ISO) de la dernière opération non annulée de chaque client. */
  readonly lastActivityByCustomer = computed<Map<string, string>>(() => {
    const last = new Map<string, string>();
    for (const t of this.activeTransactions()) {
      const current = last.get(t.customerId);
      // Comparaison en dates : Supabase (+00:00) et le navigateur (Z) n'écrivent pas l'ISO pareil.
      if (!current || new Date(t.createdAt).getTime() > new Date(current).getTime()) {
        last.set(t.customerId, t.createdAt);
      }
    }
    return last;
  });

  readonly recentActivity = computed(() => {
    return [...this.activeTransactions()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  constructor(
    private readonly repository: TransactionRepository,
    private readonly supabaseService: SupabaseService
  ) {
    // Recharge (ou vide) les données à chaque changement de session : connexion,
    // déconnexion, ou changement de compte sans rechargement complet de la page.
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.loadAll();
      } else {
        this.transactionsSignal.set([]);
        this.loadedSignal.set(false);
      }
    });
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

  /** Historique complet d'un client, opérations annulées comprises (affichées barrées). */
  historyForCustomer(customerId: string): Transaction[] {
    return this.transactionsSignal()
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  transactionsForCustomer(customerId: string): Transaction[] {
    return this.recentActivity().filter(t => t.customerId === customerId);
  }

  create(input: TransactionInput): Observable<Transaction> {
    return this.repository.create(input).pipe(
      tap(transaction => this.transactionsSignal.update(list => [...list, transaction]))
    );
  }

  update(id: string, patch: Partial<TransactionInput>): Observable<Transaction> {
    return this.repository.update(id, patch).pipe(
      tap(updated => this.transactionsSignal.update(list => list.map(t => (t.id === id ? updated : t))))
    );
  }

  /** Annule (jamais de suppression) : l'opération reste en base avec son motif. */
  cancel(id: string, reason: string): Observable<Transaction> {
    return this.repository.cancel(id, reason).pipe(
      tap(cancelled => this.transactionsSignal.update(list => list.map(t => (t.id === id ? cancelled : t))))
    );
  }
}
