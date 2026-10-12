import { Injectable, inject } from '@angular/core';
import { CustomerStatement, StatementPeriod } from '../models/customer-statement.model';
import { buildStatement } from '../utils/statement.util';
import { CustomerService } from './customer.service';
import { ProfileService } from './profile.service';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class CustomerStatementService {
  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);
  private readonly profileService = inject(ProfileService);

  /** Construit le relevé de compte d’un client (lignes du plus récent au plus ancien), cf. buildStatement. */
  build(customerId: string, period: StatementPeriod = { from: null, to: null }): CustomerStatement | null {
    const customer = this.customerService.getById(customerId);
    if (!customer) {
      return null;
    }
    const statement = buildStatement(
      customer,
      this.transactionService.transactionsForCustomer(customerId),
      this.profileService.profile()?.currency ?? 'CFA',
      period
    );
    return { ...statement, stampImage: this.profileService.profile()?.stampImage ?? null };
  }
}
