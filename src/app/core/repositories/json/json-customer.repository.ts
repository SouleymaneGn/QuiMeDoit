import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, of, take } from 'rxjs';
import { Customer, CustomerInput } from '../../models/customer.model';
import { CustomerRepository } from '../customer.repository';

@Injectable({ providedIn: 'root' })
export class JsonCustomerRepository extends CustomerRepository {
  private readonly customers$ = new BehaviorSubject<Customer[] | null>(null);
  private loaded = false;

  constructor(private readonly http: HttpClient) {
    super();
  }

  private ensureLoaded(): Observable<Customer[]> {
    if (!this.loaded) {
      this.loaded = true;
      this.http
        .get<Customer[]>('assets/mock/customers.json')
        .subscribe(data => this.customers$.next(data));
    }
    return this.customers$.pipe(
      filter((list): list is Customer[] => list !== null),
      take(1)
    );
  }

  getAll(): Observable<Customer[]> {
    return this.ensureLoaded();
  }

  getById(id: string): Observable<Customer | undefined> {
    return this.ensureLoaded().pipe(map(list => list.find(c => c.id === id)));
  }

  create(input: CustomerInput): Observable<Customer> {
    const current = this.customers$.value ?? [];
    const customer: Customer = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.customers$.next([...current, customer]);
    return of(customer);
  }

  update(id: string, patch: Partial<CustomerInput>): Observable<Customer> {
    const current = this.customers$.value ?? [];
    const updatedList = current.map(c => (c.id === id ? { ...c, ...patch } : c));
    this.customers$.next(updatedList);
    const updated = updatedList.find(c => c.id === id);
    if (!updated) {
      throw new Error(`Customer ${id} introuvable`);
    }
    return of(updated);
  }
}
