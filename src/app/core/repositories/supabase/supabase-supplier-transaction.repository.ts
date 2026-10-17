import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { PaymentMethod } from '../../models/transaction.model';
import {
  SupplierTransaction,
  SupplierTransactionInput,
  SupplierTransactionType
} from '../../models/supplier-transaction.model';
import { SupplierTransactionRepository } from '../supplier-transaction.repository';
import { SupabaseService } from '../../services/supabase.service';

interface SupplierTransactionRow {
  id: string;
  supplier_id: string;
  type: SupplierTransactionType;
  label: string;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  photo_path: string | null;
}

function toSupplierTransaction(row: SupplierTransactionRow): SupplierTransaction {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    type: row.type,
    label: row.label,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at ?? null,
    cancelReason: row.cancel_reason ?? null,
    photoPath: row.photo_path ?? null
  };
}

// owner_id n'est pas envoyé : la colonne vaut auth.uid() par défaut, et RLS
// refuse toute valeur différente.
@Injectable({ providedIn: 'root' })
export class SupabaseSupplierTransactionRepository extends SupplierTransactionRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  getAll(): Observable<SupplierTransaction[]> {
    return from(
      this.supabaseService.client
        .from('supplier_transactions')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as SupplierTransactionRow[]).map(toSupplierTransaction);
      })
    );
  }

  getBySupplierId(supplierId: string): Observable<SupplierTransaction[]> {
    return from(
      this.supabaseService.client
        .from('supplier_transactions')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as SupplierTransactionRow[]).map(toSupplierTransaction);
      })
    );
  }

  create(input: SupplierTransactionInput): Observable<SupplierTransaction> {
    return from(
      this.supabaseService.client
        .from('supplier_transactions')
        .insert({
          supplier_id: input.supplierId,
          type: input.type,
          label: input.label,
          amount: input.amount,
          payment_method: input.paymentMethod,
          ...(input.photoPath ? { photo_path: input.photoPath } : {})
        })
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toSupplierTransaction(data as SupplierTransactionRow);
      })
    );
  }

  update(id: string, patch: Partial<SupplierTransactionInput>): Observable<SupplierTransaction> {
    const row: Record<string, unknown> = {};
    if (patch.supplierId !== undefined) row['supplier_id'] = patch.supplierId;
    if (patch.type !== undefined) row['type'] = patch.type;
    if (patch.label !== undefined) row['label'] = patch.label;
    if (patch.amount !== undefined) row['amount'] = patch.amount;
    if (patch.paymentMethod !== undefined) row['payment_method'] = patch.paymentMethod;
    if ('photoPath' in patch) row['photo_path'] = patch.photoPath || null;

    return from(
      this.supabaseService.client.from('supplier_transactions').update(row).eq('id', id).select().single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toSupplierTransaction(data as SupplierTransactionRow);
      })
    );
  }

  cancel(id: string, reason: string): Observable<SupplierTransaction> {
    return from(
      this.supabaseService.client
        .from('supplier_transactions')
        .update({ cancelled_at: new Date().toISOString(), cancel_reason: reason.trim() })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toSupplierTransaction(data as SupplierTransactionRow);
      })
    );
  }
}
