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
import { EditDebtModalComponent } from '../../shared/components/modals/edit-debt-modal/edit-debt-modal.component';
import { ConfirmDialogComponent } from '../../shared/components/modals/confirm-dialog/confirm-dialog.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';
import { Transaction } from '../../core/models/transaction.model';

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
    EditCustomerModalComponent,
    EditDebtModalComponent,
    ConfirmDialogComponent
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

  readonly showEditDebtModal = signal(false);
  readonly editingDebt = signal<Transaction | null>(null);

  readonly showDeleteConfirm = signal(false);
  readonly deletingDebt = signal<Transaction | null>(null);
  readonly deleting = signal(false);

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

  openEditDebt(debt: Transaction): void {
    this.editingDebt.set(debt);
    this.showEditDebtModal.set(true);
  }

  openDeleteConfirm(debt: Transaction): void {
    this.deletingDebt.set(debt);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingDebt.set(null);
  }

  confirmDelete(): void {
    const debt = this.deletingDebt();
    if (!debt || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.transactionService.delete(debt.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
        this.deletingDebt.set(null);
      },
      error: err => {
        this.deleting.set(false);
        console.error('Échec de la suppression de la dette', err);
      }
    });
  }
}
