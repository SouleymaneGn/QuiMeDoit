import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, of, take } from 'rxjs';
import { Supplier, SupplierInput } from '../../models/supplier.model';
import { SupplierRepository } from '../supplier.repository';

@Injectable({ providedIn: 'root' })
export class JsonSupplierRepository extends SupplierRepository {
  private readonly suppliers$ = new BehaviorSubject<Supplier[] | null>(null);
  private loaded = false;

  constructor(private readonly http: HttpClient) {
    super();
  }

  private ensureLoaded(): Observable<Supplier[]> {
    if (!this.loaded) {
      this.loaded = true;
      this.http
        .get<Supplier[]>('assets/mock/suppliers.json')
        .subscribe(data => this.suppliers$.next(data));
    }
    return this.suppliers$.pipe(
      filter((list): list is Supplier[] => list !== null),
      take(1)
    );
  }

  getAll(): Observable<Supplier[]> {
    return this.ensureLoaded();
  }

  getById(id: string): Observable<Supplier | undefined> {
    return this.ensureLoaded().pipe(map(list => list.find(s => s.id === id)));
  }

  create(input: SupplierInput): Observable<Supplier> {
    const current = this.suppliers$.value ?? [];
    const supplier: Supplier = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.suppliers$.next([...current, supplier]);
    return of(supplier);
  }

  update(id: string, patch: Partial<SupplierInput>): Observable<Supplier> {
    const current = this.suppliers$.value ?? [];
    const updatedList = current.map(s => (s.id === id ? { ...s, ...patch } : s));
    this.suppliers$.next(updatedList);
    const updated = updatedList.find(s => s.id === id);
    if (!updated) {
      throw new Error(`Supplier ${id} introuvable`);
    }
    return of(updated);
  }
}
