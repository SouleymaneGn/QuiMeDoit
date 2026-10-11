import { Injectable } from '@angular/core';
import { Observable, from, map, of } from 'rxjs';
import { SharedStatementData, StatementShare } from '../../models/statement-share.model';
import { StatementShareRepository } from '../statement-share.repository';
import { SupabaseService } from '../../services/supabase.service';

interface StatementShareRow {
  token: string;
  customer_id: string;
  created_at: string;
  expires_at: string;
}

function toShare(row: StatementShareRow): StatementShare {
  return {
    token: row.token,
    customerId: row.customer_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at
  };
}

const SHARE_COLUMNS = 'token, customer_id, created_at, expires_at';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class SupabaseStatementShareRepository extends StatementShareRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  getActiveForCustomer(customerId: string): Observable<StatementShare | undefined> {
    return from(
      this.supabaseService.client
        .from('statement_shares')
        .select(SHARE_COLUMNS)
        .eq('customer_id', customerId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data ? toShare(data as StatementShareRow) : undefined;
      })
    );
  }

  create(customerId: string): Observable<StatementShare> {
    // owner_id est rempli par défaut avec auth.uid() côté base.
    return from(
      this.supabaseService.client
        .from('statement_shares')
        .insert({ customer_id: customerId })
        .select(SHARE_COLUMNS)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return toShare(data as StatementShareRow);
      })
    );
  }

  revokeForCustomer(customerId: string): Observable<void> {
    return from(
      this.supabaseService.client
        .from('statement_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('customer_id', customerId)
        .is('revoked_at', null)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  getPublic(token: string): Observable<SharedStatementData | undefined> {
    // Un jeton mal formé ferait échouer le cast uuid côté base : on répond directement « introuvable ».
    if (!UUID_PATTERN.test(token)) {
      return of(undefined);
    }
    return from(this.supabaseService.client.rpc('get_shared_statement', { p_token: token })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data) {
          return undefined;
        }
        const result = data as SharedStatementData;
        return {
          ...result,
          customerPhone: result.customerPhone ?? undefined,
          transactions: result.transactions.map(t => ({ ...t, amount: Number(t.amount) }))
        };
      })
    );
  }
}
