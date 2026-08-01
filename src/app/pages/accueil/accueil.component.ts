import { Component, computed, signal } from '@angular/core';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { NewDebtModalComponent } from '../../shared/components/modals/new-debt-modal/new-debt-modal.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { ProfileService } from '../../core/services/profile.service';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';

@Component({
  selector: 'app-accueil',
  imports: [ButtonComponent, BadgeComponent, NewDebtModalComponent, NewPaymentModalComponent],
  templateUrl: './accueil.component.html'
})
export class AccueilComponent {
  readonly showNewDebtModal = signal(false);
  readonly showNewPaymentModal = signal(false);

  readonly firstName = computed(() => {
    const name = this.profileService.profile()?.ownerName ?? '';
    return name.split(' ')[0] || name;
  });

  readonly totalToCollect = computed(() =>
    this.profileService.formatAmount(this.transactionService.totalToCollect())
  );
  readonly debtorsCount = computed(() => this.transactionService.debtorsCount());

  readonly recentActivity = computed(() =>
    this.transactionService
      .recentActivity()
      .slice(0, 8)
      .map(t => ({
        ...t,
        customerName: this.customerService.getById(t.customerId)?.name ?? 'Client'
      }))
  );

  constructor(
    private readonly profileService: ProfileService,
    private readonly customerService: CustomerService,
    private readonly transactionService: TransactionService
  ) {}

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }
}
