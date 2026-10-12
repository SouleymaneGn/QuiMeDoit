import { Observable } from 'rxjs';
import { Supplier, SupplierInput } from '../models/supplier.model';

export abstract class SupplierRepository {
  abstract getAll(): Observable<Supplier[]>;
  abstract getById(id: string): Observable<Supplier | undefined>;
  abstract create(input: SupplierInput): Observable<Supplier>;
  abstract update(id: string, patch: Partial<SupplierInput>): Observable<Supplier>;
}
