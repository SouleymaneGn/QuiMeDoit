import { Observable } from 'rxjs';
import { Customer, CustomerInput } from '../models/customer.model';

export abstract class CustomerRepository {
  abstract getAll(): Observable<Customer[]>;
  abstract getById(id: string): Observable<Customer | undefined>;
  abstract create(input: CustomerInput): Observable<Customer>;
  abstract update(id: string, patch: Partial<CustomerInput>): Observable<Customer>;
}
