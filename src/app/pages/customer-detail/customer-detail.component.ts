import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { NewDebtModalComponent } from '../../shared/components/modals/new-debt-modal/new-debt-modal.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { EditCustomerModalComponent } from '../../shared/components/modals/edit-customer-modal/edit-customer-modal.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-customer-detail',
  imports: [
    NgClass,
    DatePipe,
    RouterLink,
    PageBreadcrumbComponent,
    ButtonComponent,
    BadgeComponent,
    NewDebtModalComponent,
    NewPaymentModalComponent,
    EditCustomerModalComponent
  ],
  templateUrl: './customer-detail.component.html'
})
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);
  private readonly profileService = inject(ProfileService);

  readonly showNewDebtModal = signal(false);
  readonly showNewPaymentModal = signal(false);
  readonly showEditModal = signal(false);

  readonly customerId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' }
  );

  readonly customer = computed(() => this.customerService.getById(this.customerId()));
  readonly balance = computed(() => this.transactionService.balanceForCustomer(this.customerId()));
  readonly history = computed(() => this.transactionService.transactionsForCustomer(this.customerId()));

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }
}
