import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { Customer, CustomerInput } from '../../models/customer.model';
import { CustomerRepository } from '../customer.repository';
import { SupabaseService } from '../../services/supabase.service';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    createdAt: row.created_at
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseCustomerRepository extends CustomerRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  getAll(): Observable<Customer[]> {
    return from(
      this.supabaseService.client.from('customers').select('*').order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as CustomerRow[]).map(toCustomer);
      })
    );
  }

  getById(id: string): Observable<Customer | undefined> {
    return from(
      this.supabaseService.client.from('customers').select('*').eq('id', id).maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ? toCustomer(data as CustomerRow) : undefined;
      })
    );
  }

  create(input: CustomerInput): Observable<Customer> {
    return from(
      this.supabaseService.getUser().then(async ({ data: userData }) => {
        const ownerId = userData.user!.id;
        const { data, error } = await this.supabaseService.client
          .from('customers')
          .insert({ owner_id: ownerId, name: input.name, phone: input.phone ?? null })
          .select()
          .single();
        if (error) throw error;
        return toCustomer(data as CustomerRow);
      })
    );
  }

  update(id: string, patch: Partial<CustomerInput>): Observable<Customer> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row['name'] = patch.name;
    if (patch.phone !== undefined) row['phone'] = patch.phone ?? null;

    return from(
      this.supabaseService.client.from('customers').update(row).eq('id', id).select().single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toCustomer(data as CustomerRow);
      })
    );
  }
}
