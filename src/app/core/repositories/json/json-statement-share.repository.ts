import { Injectable } from '@angular/core';
import { Observable, combineLatest, map, of } from 'rxjs';
import { SharedStatementData, StatementShare } from '../../models/statement-share.model';
import { StatementShareRepository } from '../statement-share.repository';
import { CustomerRepository } from '../customer.repository';
import { ProfileRepository } from '../profile.repository';
import { TransactionRepository } from '../transaction.repository';

const SHARE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

interface MockShare extends StatementShare {
  revoked: boolean;
}

/** Version mock : les liens ne vivent qu'en mémoire, le temps de la session. */
@Injectable({ providedIn: 'root' })
export class JsonStatementShareRepository extends StatementShareRepository {
  private shares: MockShare[] = [];

  constructor(
    private readonly customers: CustomerRepository,
    private readonly transactions: TransactionRepository,
    private readonly profiles: ProfileRepository
  ) {
    super();
  }

  getActiveForCustomer(customerId: string): Observable<StatementShare | undefined> {
    return of(this.shares.find(s => s.customerId === customerId && isActive(s)));
  }

  create(customerId: string): Observable<StatementShare> {
    const now = Date.now();
    const share: MockShare = {
      token: crypto.randomUUID(),
      customerId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SHARE_DURATION_MS).toISOString(),
      revoked: false
    };
    this.shares = [share, ...this.shares];
    return of(share);
  }

  revokeForCustomer(customerId: string): Observable<void> {
    this.shares = this.shares.map(s => (s.customerId === customerId ? { ...s, revoked: true } : s));
    return of(undefined);
  }

  getPublic(token: string): Observable<SharedStatementData | undefined> {
    const share = this.shares.find(s => s.token === token && isActive(s));
    if (!share) {
      return of(undefined);
    }
    return combineLatest([
      this.customers.getById(share.customerId),
      this.transactions.getByCustomerId(share.customerId),
      this.profiles.get()
    ]).pipe(
      map(([customer, transactions, profile]) =>
        customer
          ? {
              businessName: profile.businessName,
              currency: profile.currency,
              customerName: customer.name,
              customerPhone: customer.phone,
              expiresAt: share.expiresAt,
              transactions: transactions.map(t => ({
                type: t.type,
                label: t.label,
                amount: t.amount,
                createdAt: t.createdAt
              }))
            }
          : undefined
      )
    );
  }
}

function isActive(share: MockShare): boolean {
  return !share.revoked && new Date(share.expiresAt).getTime() > Date.now();
}
