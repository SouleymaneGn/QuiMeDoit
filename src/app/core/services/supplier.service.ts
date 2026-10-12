import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Supplier, SupplierInput } from '../models/supplier.model';
import { SupplierRepository } from '../repositories/supplier.repository';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly suppliersSignal = signal<Supplier[]>([]);
  private readonly loadedSignal = signal(false);

  readonly suppliers = this.suppliersSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  readonly searchTerm = signal('');

  readonly filteredSuppliers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.suppliersSignal();
    }
    return this.suppliersSignal().filter(
      s => s.name.toLowerCase().includes(term) || (s.phone ?? '').toLowerCase().includes(term)
    );
  });

  constructor(
    private readonly repository: SupplierRepository,
    private readonly supabaseService: SupabaseService
  ) {
    // Recharge (ou vide) les données à chaque changement de session : connexion,
    // déconnexion, ou changement de compte sans rechargement complet de la page.
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.loadAll();
      } else {
        this.suppliersSignal.set([]);
        this.loadedSignal.set(false);
        this.searchTerm.set('');
      }
    });
  }

  loadAll(): void {
    this.repository.getAll().subscribe(suppliers => {
      this.suppliersSignal.set(suppliers);
      this.loadedSignal.set(true);
    });
  }

  getById(id: string): Supplier | undefined {
    return this.suppliersSignal().find(s => s.id === id);
  }

  create(input: SupplierInput): Observable<Supplier> {
    return this.repository.create(input).pipe(
      tap(supplier => this.suppliersSignal.update(list => [...list, supplier]))
    );
  }

  update(id: string, patch: Partial<SupplierInput>): Observable<Supplier> {
    return this.repository.update(id, patch).pipe(
      tap(updated => this.suppliersSignal.update(list => list.map(s => (s.id === id ? updated : s))))
    );
  }
}
