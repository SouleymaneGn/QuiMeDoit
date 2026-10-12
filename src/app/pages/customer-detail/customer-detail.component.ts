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
import { CancelOperationDialogComponent } from '../../shared/components/modals/cancel-operation-dialog/cancel-operation-dialog.component';
import { EditPaymentModalComponent } from '../../shared/components/modals/edit-payment-modal/edit-payment-modal.component';
import {
  CustomerMoneyOperationType,
  CustomerOperationModalComponent
} from '../../shared/components/modals/customer-operation-modal/customer-operation-modal.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';
import { StatementPreviewModalComponent } from '../../shared/components/modals/statement-preview-modal/statement-preview-modal.component';
import { Transaction, TransactionType } from '../../core/models/transaction.model';
import { TRANSACTION_TYPE_BADGE, TRANSACTION_TYPE_LABELS } from '../../core/utils/operation.util';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { hasCreditLimit, isOverCreditLimit } from '../../core/utils/credit-limit.util';
import { balanceLabel, isCancelled } from '../../core/utils/balance.util';

@Component({
  selector: 'app-customer-detail',
  imports: [
    NgClass,
    DatePipe,
    RouterLink,
    PageBreadcrumbComponent,
    ButtonComponent,
    BadgeComponent,
    AlertComponent,
    NewDebtModalComponent,
    NewPaymentModalComponent,
    EditCustomerModalComponent,
    EditDebtModalComponent,
    CancelOperationDialogComponent,
    EditPaymentModalComponent,
    CustomerOperationModalComponent,
    StatementPreviewModalComponent
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

  readonly showEditPaymentModal = signal(false);
  readonly editingPayment = signal<Transaction | null>(null);

  readonly showMoneyOperationModal = signal(false);
  readonly moneyOperationType = signal<CustomerMoneyOperationType>('DEPOSIT');
  readonly editingMoneyOperation = signal<Transaction | null>(null);

  readonly cancellingOperation = signal<Transaction | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  readonly cancelSummary = computed(() => {
    const op = this.cancellingOperation();
    return op ? `${this.typeLabel(op.type)} · ${op.label} · ${this.formatAmount(op.amount)}` : '';
  });

  readonly showStatementModal = signal(false);

  readonly customerId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' }
  );

  readonly customer = computed(() => this.customerService.getById(this.customerId()));
  readonly balance = computed(() => this.transactionService.balanceForCustomer(this.customerId()));
  readonly balanceDisplay = computed(() => balanceLabel(this.balance()));
  /** Historique complet : les opérations annulées restent visibles, barrées. */
  readonly history = computed(() => this.transactionService.historyForCustomer(this.customerId()));
  readonly hasActiveOperations = computed(() => this.history().some(t => !isCancelled(t)));

  readonly creditLimit = computed(() => {
    const limit = this.customer()?.creditLimit;
    return hasCreditLimit(limit) ? limit : null;
  });
  readonly overCreditLimit = computed(() => isOverCreditLimit(this.balance(), this.creditLimit()));
  readonly availableCredit = computed(() => (this.creditLimit() ?? 0) - Math.max(0, this.balance()));
  readonly overCreditLimitMessage = computed(() => {
    const limit = this.creditLimit() ?? 0;
    return (
      `Ce client doit ${this.formatAmount(this.balance() - limit)} de plus que son plafond de ` +
      `${this.formatAmount(limit)}. Pensez à encaisser avant de lui accorder une nouvelle dette.`
    );
  });

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  typeLabel(type: TransactionType): string {
    return TRANSACTION_TYPE_LABELS[type];
  }

  typeBadge(type: TransactionType) {
    return TRANSACTION_TYPE_BADGE[type];
  }

  isCancelled(item: Transaction): boolean {
    return isCancelled(item);
  }

  openMoneyOperation(type: CustomerMoneyOperationType): void {
    this.editingMoneyOperation.set(null);
    this.moneyOperationType.set(type);
    this.showMoneyOperationModal.set(true);
  }

  closeMoneyOperationModal(): void {
    this.showMoneyOperationModal.set(false);
    this.editingMoneyOperation.set(null);
  }

  /** Chaque type a sa fenêtre de modification. */
  openEdit(item: Transaction): void {
    if (item.type === 'DEBT') {
      this.editingDebt.set(item);
      this.showEditDebtModal.set(true);
    } else if (item.type === 'PAYMENT') {
      this.editingPayment.set(item);
      this.showEditPaymentModal.set(true);
    } else {
      this.editingMoneyOperation.set(item);
      this.showMoneyOperationModal.set(true);
    }
  }

  openCancel(item: Transaction): void {
    this.cancelError.set('');
    this.cancellingOperation.set(item);
  }

  closeCancel(): void {
    this.cancellingOperation.set(null);
  }

  confirmCancel(reason: string): void {
    const operation = this.cancellingOperation();
    if (!operation || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set('');
    this.transactionService.cancel(operation.id, reason).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancellingOperation.set(null);
      },
      error: err => {
        this.cancelling.set(false);
        this.cancelError.set("L'annulation a échoué. Réessayez.");
        console.error("Échec de l'annulation de l'opération", err);
      }
    });
  }
}
