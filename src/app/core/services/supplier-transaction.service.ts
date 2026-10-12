import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SupplierTransaction, SupplierTransactionInput } from '../models/supplier-transaction.model';
import { SupplierTransactionRepository } from '../repositories/supplier-transaction.repository';
import { computeSignedBalance, isCancelled } from '../utils/balance.util';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SupplierTransactionService {
  private readonly transactionsSignal = signal<SupplierTransaction[]>([]);
  private readonly loadedSignal = signal(false);

  readonly transactions = this.transactionsSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  /** Opérations non annulées : base de toutes les listes et de tous les totaux. */
  readonly activeTransactions = computed(() => this.transactionsSignal().filter(t => !isCancelled(t)));

  /** Reste à payer par fournisseur (somme PURCHASE − somme PAYMENT). Négatif = avance chez le fournisseur. */
  readonly balancesBySupplier = computed<Map<string, number>>(() => {
    const bySupplier = new Map<string, SupplierTransaction[]>();
    for (const t of this.transactionsSignal()) {
      const list = bySupplier.get(t.supplierId) ?? [];
      list.push(t);
      bySupplier.set(t.supplierId, list);
    }
    const balances = new Map<string, number>();
    for (const [supplierId, txns] of bySupplier) {
      balances.set(supplierId, computeSignedBalance(txns, 'PURCHASE'));
    }
    return balances;
  });

  /** Total dû à l'ensemble des fournisseurs (les avances ne viennent pas en déduction). */
  readonly totalToPay = computed(() => {
    let total = 0;
    for (const balance of this.balancesBySupplier().values()) {
      if (balance > 0) total += balance;
    }
    return total;
  });

  /** Nombre de fournisseurs à qui je dois encore de l'argent. */
  readonly suppliersToPayCount = computed(() => {
    let count = 0;
    for (const balance of this.balancesBySupplier().values()) {
      if (balance > 0) count++;
    }
    return count;
  });

  readonly recentActivity = computed(() => {
    return [...this.activeTransactions()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  constructor(
    private readonly repository: SupplierTransactionRepository,
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

  balanceForSupplier(supplierId: string): number {
    return this.balancesBySupplier().get(supplierId) ?? 0;
  }

  /** Historique complet d'un fournisseur, opérations annulées comprises (affichées barrées). */
  historyForSupplier(supplierId: string): SupplierTransaction[] {
    return this.transactionsSignal()
      .filter(t => t.supplierId === supplierId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  transactionsForSupplier(supplierId: string): SupplierTransaction[] {
    return this.recentActivity().filter(t => t.supplierId === supplierId);
  }

  create(input: SupplierTransactionInput): Observable<SupplierTransaction> {
    return this.repository.create(input).pipe(
      tap(transaction => this.transactionsSignal.update(list => [...list, transaction]))
    );
  }

  update(id: string, patch: Partial<SupplierTransactionInput>): Observable<SupplierTransaction> {
    return this.repository.update(id, patch).pipe(
      tap(updated => this.transactionsSignal.update(list => list.map(t => (t.id === id ? updated : t))))
    );
  }

  /** Annule (jamais de suppression) : l'opération reste en base avec son motif. */
  cancel(id: string, reason: string): Observable<SupplierTransaction> {
    return this.repository.cancel(id, reason).pipe(
      tap(cancelled => this.transactionsSignal.update(list => list.map(t => (t.id === id ? cancelled : t))))
    );
  }
}
