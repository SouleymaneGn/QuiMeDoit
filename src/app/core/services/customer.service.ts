import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Customer, CustomerInput } from '../models/customer.model';
import { CustomerRepository } from '../repositories/customer.repository';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly customersSignal = signal<Customer[]>([]);
  private readonly loadedSignal = signal(false);

  readonly customers = this.customersSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  readonly searchTerm = signal('');

  readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.customersSignal();
    }
    return this.customersSignal().filter(
      c => c.name.toLowerCase().includes(term) || (c.phone ?? '').toLowerCase().includes(term)
    );
  });

  constructor(
    private readonly repository: CustomerRepository,
    private readonly supabaseService: SupabaseService
  ) {
    // Recharge (ou vide) les données à chaque changement de session : connexion,
    // déconnexion, ou changement de compte sans rechargement complet de la page.
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.loadAll();
      } else {
        this.customersSignal.set([]);
        this.loadedSignal.set(false);
        this.searchTerm.set('');
      }
    });
  }

  loadAll(): void {
    this.repository.getAll().subscribe(customers => {
      this.customersSignal.set(customers);
      this.loadedSignal.set(true);
    });
  }

  getById(id: string): Customer | undefined {
    return this.customersSignal().find(c => c.id === id);
  }

  create(input: CustomerInput): Observable<Customer> {
    return this.repository.create(input).pipe(
      tap(customer => this.customersSignal.update(list => [...list, customer]))
    );
  }

  update(id: string, patch: Partial<CustomerInput>): Observable<Customer> {
    return this.repository.update(id, patch).pipe(
      tap(updated =>
        this.customersSignal.update(list => list.map(c => (c.id === id ? updated : c)))
      )
    );
  }
}
