import { Injectable, inject } from '@angular/core';
import { CustomerStatement, StatementPeriod } from '../models/customer-statement.model';
import { computeBalance } from '../utils/balance.util';
import { CustomerService } from './customer.service';
import { ProfileService } from './profile.service';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class CustomerStatementService {
  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);
  private readonly profileService = inject(ProfileService);

  /**
   * Construit la situation de facture d'un client (lignes du plus récent au plus ancien).
   * Avec une période, les opérations antérieures sont reportées en « solde antérieur »
   * et celles postérieures sont ignorées : le solde final est celui à la date d'arrêt.
   */
  build(customerId: string, period: StatementPeriod = { from: null, to: null }): CustomerStatement | null {
    const customer = this.customerService.getById(customerId);
    if (!customer) {
      return null;
    }

    const from = period.from ? startOfDay(period.from).getTime() : null;
    const to = period.to ? endOfDay(period.to).getTime() : null;

    const all = this.transactionService.transactionsForCustomer(customerId);
    const before = from === null ? [] : all.filter(t => new Date(t.createdAt).getTime() < from);
    const transactions = all.filter(t => {
      const time = new Date(t.createdAt).getTime();
      return (from === null || time >= from) && (to === null || time <= to);
    });

    let totalDebts = 0;
    let totalPayments = 0;
    let paymentsCount = 0;
    for (const t of transactions) {
      if (t.type === 'DEBT') {
        totalDebts += t.amount;
      } else {
        totalPayments += t.amount;
        paymentsCount++;
      }
    }

    const openingBalance = computeBalance(before);

    return {
      customerName: customer.name,
      customerPhone: customer.phone,
      asOf: period.to ? startOfDay(period.to) : new Date(),
      periodStart: period.from ? startOfDay(period.from) : null,
      currency: this.profileService.profile()?.currency ?? 'CFA',
      lines: transactions.map(t => ({
        date: t.createdAt,
        label: t.label,
        amount: t.amount,
        type: t.type
      })),
      openingBalance,
      totalDebts,
      totalPayments,
      balance: openingBalance + computeBalance(transactions),
      paymentsCount
    };
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
