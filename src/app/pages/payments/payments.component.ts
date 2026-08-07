import { DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { EditPaymentModalComponent } from '../../shared/components/modals/edit-payment-modal/edit-payment-modal.component';
import { ConfirmDialogComponent } from '../../shared/components/modals/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';
import { Transaction } from '../../core/models/transaction.model';

type PaymentRow = Transaction & { customerName: string };

const PAGE_SIZE = 10;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

interface DatePickerChangeEvent {
  selectedDates: Date[];
}

@Component({
  selector: 'app-payments',
  imports: [
    DatePipe,
    PageBreadcrumbComponent,
    ButtonComponent,
    DatePickerComponent,
    NewPaymentModalComponent,
    EditPaymentModalComponent,
    ConfirmDialogComponent,
    PaginationComponent,
    SkeletonComponent
  ],
  templateUrl: './payments.component.html'
})
export class PaymentsComponent {
  readonly showNewPaymentModal = signal(false);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly rangeStart = signal(startOfMonth(new Date()));
  readonly rangeEnd = signal(endOfDay(new Date()));
  readonly defaultRange = [this.rangeStart(), this.rangeEnd()];

  readonly payments = computed(() => {
    const from = this.rangeStart().getTime();
    const to = this.rangeEnd().getTime();
    return this.transactionService
      .transactions()
      .filter(t => {
        if (t.type !== 'PAYMENT') return false;
        const createdAt = new Date(t.createdAt).getTime();
        return createdAt >= from && createdAt <= to;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(t => ({
        ...t,
        customerName: this.customerService.getById(t.customerId)?.name ?? 'Client'
      }));
  });

  readonly totalReceived = computed(() =>
    this.profileService.formatAmount(this.payments().reduce((sum, p) => sum + p.amount, 0))
  );

  readonly pagedPayments = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.payments().slice(start, start + this.pageSize);
  });

  readonly isLoading = computed(() => !this.transactionService.loaded());

  readonly showEditModal = signal(false);
  readonly editingPayment = signal<PaymentRow | null>(null);

  readonly showDeleteConfirm = signal(false);
  readonly deletingPayment = signal<PaymentRow | null>(null);
  readonly deleting = signal(false);

  constructor(
    private readonly customerService: CustomerService,
    private readonly transactionService: TransactionService,
    private readonly profileService: ProfileService
  ) {}

  onRangeChange(event: DatePickerChangeEvent): void {
    if (event.selectedDates.length < 2) return;
    const [start, end] = event.selectedDates;
    this.rangeStart.set(new Date(start));
    this.rangeEnd.set(endOfDay(end));
    this.page.set(1);
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case 'CASH':
        return 'Espèces';
      case 'ORANGE_MONEY':
        return 'Orange Money';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      default:
        return method;
    }
  }

  openEdit(payment: PaymentRow): void {
    this.editingPayment.set(payment);
    this.showEditModal.set(true);
  }

  openDeleteConfirm(payment: PaymentRow): void {
    this.deletingPayment.set(payment);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingPayment.set(null);
  }

  confirmDelete(): void {
    const payment = this.deletingPayment();
    if (!payment || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.transactionService.delete(payment.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
        this.deletingPayment.set(null);
      },
      error: err => {
        this.deleting.set(false);
        console.error('Échec de la suppression du paiement', err);
      }
    });
  }
}
