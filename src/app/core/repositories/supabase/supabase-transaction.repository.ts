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
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    label: row.label,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    createdAt: row.created_at
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
            payment_method: input.paymentMethod
          })
          .select()
          .single();
        if (error) throw error;
        return toTransaction(data as TransactionRow);
      })
    );
  }
}
