import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { PaymentMethod, Transaction, TransactionInput, TransactionType } from '../../models/transaction.model';
import { TransactionRepository } from '../transaction.repository';
import { SupabaseService } from '../../services/supabase.service';

interface TransactionRow {
  id: string;
  customer_id: string;
  type: TransactionType;
  label: string;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  paid_by: string | null;
  photo_path: string | null;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    label: row.label,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at ?? null,
    cancelReason: row.cancel_reason ?? null,
    paidBy: row.paid_by ?? null,
    photoPath: row.photo_path ?? null
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseTransactionRepository extends TransactionRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  getAll(): Observable<Transaction[]> {
    return from(
      this.supabaseService.client.from('transactions').select('*').order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as TransactionRow[]).map(toTransaction);
      })
    );
  }

  getByCustomerId(customerId: string): Observable<Transaction[]> {
    return from(
      this.supabaseService.client
        .from('transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as TransactionRow[]).map(toTransaction);
      })
    );
  }

  getByDateRange(from_: Date, to: Date): Observable<Transaction[]> {
    return from(
      this.supabaseService.client
        .from('transactions')
        .select('*')
        .gte('created_at', from_.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as TransactionRow[]).map(toTransaction);
      })
    );
  }

  create(input: TransactionInput): Observable<Transaction> {
    return from(
      this.supabaseService.getUser().then(async ({ data: userData }) => {
        const ownerId = userData.user!.id;
        const { data, error } = await this.supabaseService.client
          .from('transactions')
          .insert({
            owner_id: ownerId,
            customer_id: input.customerId,
            type: input.type,
            label: input.label,
            amount: input.amount,
            payment_method: input.paymentMethod,
            // Colonne envoyée seulement si renseignée : les dettes n'en dépendent pas.
            ...(input.paidBy?.trim() ? { paid_by: input.paidBy.trim() } : {}),
            ...(input.photoPath ? { photo_path: input.photoPath } : {}),
            ...(input.createdAt ? { created_at: input.createdAt } : {})
          })
          .select()
          .single();
        if (error) throw error;
        return toTransaction(data as TransactionRow);
      })
    );
  }

  update(id: string, patch: Partial<TransactionInput>): Observable<Transaction> {
    const row: Record<string, unknown> = {};
    if (patch.customerId !== undefined) row['customer_id'] = patch.customerId;
    if (patch.type !== undefined) row['type'] = patch.type;
    if (patch.label !== undefined) row['label'] = patch.label;
    if (patch.amount !== undefined) row['amount'] = patch.amount;
    if (patch.paymentMethod !== undefined) row['payment_method'] = patch.paymentMethod;
    if ('paidBy' in patch) row['paid_by'] = patch.paidBy?.trim() || null;
    if ('photoPath' in patch) row['photo_path'] = patch.photoPath || null;

    return from(
      this.supabaseService.client.from('transactions').update(row).eq('id', id).select().single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toTransaction(data as TransactionRow);
      })
    );
  }

  cancel(id: string, reason: string): Observable<Transaction> {
    return from(
      this.supabaseService.client
        .from('transactions')
        .update({ cancelled_at: new Date().toISOString(), cancel_reason: reason.trim() })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toTransaction(data as TransactionRow);
      })
    );
  }
}
