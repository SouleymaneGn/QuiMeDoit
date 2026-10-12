import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { Supplier, SupplierInput } from '../../models/supplier.model';
import { SupplierRepository } from '../supplier.repository';
import { SupabaseService } from '../../services/supabase.service';

interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    createdAt: row.created_at
  };
}

// owner_id n'est pas envoyé : la colonne vaut auth.uid() par défaut, et RLS
// refuse toute valeur différente.
@Injectable({ providedIn: 'root' })
export class SupabaseSupplierRepository extends SupplierRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  getAll(): Observable<Supplier[]> {
    return from(
      this.supabaseService.client.from('suppliers').select('*').order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as SupplierRow[]).map(toSupplier);
      })
    );
  }

  getById(id: string): Observable<Supplier | undefined> {
    return from(
      this.supabaseService.client.from('suppliers').select('*').eq('id', id).maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ? toSupplier(data as SupplierRow) : undefined;
      })
    );
  }

  create(input: SupplierInput): Observable<Supplier> {
    return from(
      this.supabaseService.client
        .from('suppliers')
        .insert({ name: input.name, phone: input.phone ?? null })
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toSupplier(data as SupplierRow);
      })
    );
  }

  update(id: string, patch: Partial<SupplierInput>): Observable<Supplier> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row['name'] = patch.name;
    if (patch.phone !== undefined) row['phone'] = patch.phone ?? null;

    return from(
      this.supabaseService.client.from('suppliers').update(row).eq('id', id).select().single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toSupplier(data as SupplierRow);
      })
    );
  }
}
