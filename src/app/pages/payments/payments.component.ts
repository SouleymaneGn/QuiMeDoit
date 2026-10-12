import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, computed, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { EditPaymentModalComponent } from '../../shared/components/modals/edit-payment-modal/edit-payment-modal.component';
import { CustomerOperationModalComponent } from '../../shared/components/modals/customer-operation-modal/customer-operation-modal.component';
import { SupplierOperationModalComponent } from '../../shared/components/modals/supplier-operation-modal/supplier-operation-modal.component';
import { CancelOperationDialogComponent } from '../../shared/components/modals/cancel-operation-dialog/cancel-operation-dialog.component';
import { PaginationComponent } from '../../shared/components/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierTransactionService } from '../../core/services/supplier-transaction.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ProfileService } from '../../core/services/profile.service';
import { PaymentMethod, Transaction } from '../../core/models/transaction.model';
import { SupplierTransaction } from '../../core/models/supplier-transaction.model';
import { isCancelled } from '../../core/utils/balance.util';
import { phoneStatus } from '../../core/utils/phone.util';
import { receiptMessage, whatsappUrl } from '../../core/utils/whatsapp.util';
import {
  OperationBadgeColor,
  TRANSACTION_TYPE_BADGE,
  TRANSACTION_TYPE_LABELS,
  paymentMethodLabel
} from '../../core/utils/operation.util';

type MoneyTab = 'in' | 'out';

/** Raccourcis de période ; « custom » = plage choisie dans le calendrier. */
type RangePreset = 'today' | '7d' | 'month' | '30d' | 'custom';

type MethodFilter = '' | PaymentMethod;

/** Ligne commune aux mouvements clients et fournisseurs. */
interface MoneyRow {
  id: string;
  partyName: string;
  partyLink: string[];
  typeLabel: string;
  typeBadge: OperationBadgeColor;
  label: string;
  paymentMethod: string;
  paidBy: string | null;
  createdAt: string;
  amount: number;
  cancelled: boolean;
  cancelReason: string | null;
  /** Lien WhatsApp du reçu (entrées clients non annulées, numéro valide), sinon null. */
  receiptLink: string | null;
  customerOperation?: Transaction;
  supplierOperation?: SupplierTransaction;
}

const PAGE_SIZE = 10;

function daysAgo(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function presetRange(preset: Exclude<RangePreset, 'custom'>): [Date, Date] {
  const now = new Date();
  switch (preset) {
    case 'today':
      return [daysAgo(now, 0), endOfDay(now)];
    case '7d':
      return [daysAgo(now, 6), endOfDay(now)];
    case 'month':
      return [new Date(now.getFullYear(), now.getMonth(), 1), endOfDay(now)];
    case '30d':
      return [daysAgo(now, 30), endOfDay(now)];
  }
}

interface DatePickerChangeEvent {
  selectedDates: Date[];
}

/**
 * Entrées : paiements et dépôts des clients.
 * Sorties : retraits des clients et règlements aux fournisseurs.
 * Les opérations annulées restent listées (barrées) mais ne comptent pas dans les totaux.
 */
@Component({
  selector: 'app-payments',
  imports: [
    DatePipe,
    NgClass,
    RouterLink,
    PageBreadcrumbComponent,
    ButtonComponent,
    BadgeComponent,
    DatePickerComponent,
    NewPaymentModalComponent,
    EditPaymentModalComponent,
    CustomerOperationModalComponent,
    SupplierOperationModalComponent,
    CancelOperationDialogComponent,
    PaginationComponent,
    SkeletonComponent
  ],
  templateUrl: './payments.component.html'
})
export class PaymentsComponent {
  readonly showNewPaymentModal = signal(false);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;
  readonly tab = signal<MoneyTab>('in');

  readonly rangePresets: { value: Exclude<RangePreset, 'custom'>; label: string }[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: '7d', label: '7 jours' },
    { value: 'month', label: 'Ce mois' },
    { value: '30d', label: '30 jours' }
  ];
  readonly preset = signal<RangePreset>('30d');
  readonly rangeStart = signal(presetRange('30d')[0]);
  readonly rangeEnd = signal(presetRange('30d')[1]);
  /** Plage affichée dans le calendrier (suit aussi les raccourcis). */
  readonly pickerRange = computed(() => [this.rangeStart(), this.rangeEnd()]);

  readonly methodFilters: { value: MethodFilter; label: string }[] = [
    { value: '', label: 'Tous les modes' },
    { value: 'CASH', label: 'Espèces' },
    { value: 'ORANGE_MONEY', label: 'Orange Money' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' }
  ];
  readonly methodFilter = signal<MethodFilter>('');

  private readonly canManageSuppliers = computed(() => this.subscriptionService.hasPaidAccess());

  private matches(iso: string, method: string): boolean {
    const time = new Date(iso).getTime();
    const filter = this.methodFilter();
    return (
      time >= this.rangeStart().getTime() && time <= this.rangeEnd().getTime() && (!filter || method === filter)
    );
  }

  private readonly customerRows = computed<MoneyRow[]>(() =>
    this.transactionService
      .transactions()
      .filter(t => t.type !== 'DEBT' && this.matches(t.createdAt, t.paymentMethod))
      .map(t => {
        const customer = this.customerService.getById(t.customerId);
        const cancelled = isCancelled(t);
        return {
          id: t.id,
          partyName: customer?.name ?? 'Client',
          partyLink: ['/app/customers', t.customerId],
          typeLabel: TRANSACTION_TYPE_LABELS[t.type],
          typeBadge: TRANSACTION_TYPE_BADGE[t.type],
          label: t.label,
          paymentMethod: t.paymentMethod,
          paidBy: t.paidBy ?? null,
          createdAt: t.createdAt,
          amount: t.amount,
          cancelled,
          cancelReason: t.cancelReason ?? null,
          receiptLink:
            !cancelled && (t.type === 'PAYMENT' || t.type === 'DEPOSIT') && phoneStatus(customer?.phone) === 'valid'
              ? this.receiptLink(t, customer!.name, customer!.phone!)
              : null,
          customerOperation: t
        };
      })
  );

  private readonly supplierRows = computed<MoneyRow[]>(() =>
    this.supplierTransactionService
      .transactions()
      .filter(t => t.type === 'PAYMENT' && this.matches(t.createdAt, t.paymentMethod))
      .map(t => ({
        id: t.id,
        partyName: this.supplierService.getById(t.supplierId)?.name ?? 'Fournisseur',
        partyLink: ['/app/suppliers', t.supplierId],
        typeLabel: 'Règlement fournisseur',
        typeBadge: 'warning' as const,
        label: t.label,
        paymentMethod: t.paymentMethod,
        paidBy: null,
        createdAt: t.createdAt,
        amount: t.amount,
        cancelled: isCancelled(t),
        cancelReason: t.cancelReason ?? null,
        receiptLink: null,
        supplierOperation: t
      }))
  );

  private readonly incoming = computed(() =>
    this.customerRows().filter(r => r.customerOperation!.type === 'PAYMENT' || r.customerOperation!.type === 'DEPOSIT')
  );

  private readonly outgoing = computed(() => [
    ...this.customerRows().filter(r => r.customerOperation!.type === 'WITHDRAWAL'),
    ...this.supplierRows()
  ]);

  readonly rows = computed(() =>
    [...(this.tab() === 'in' ? this.incoming() : this.outgoing())].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );

  private sumActive(rows: MoneyRow[]): number {
    return rows.filter(r => !r.cancelled).reduce((sum, r) => sum + r.amount, 0);
  }

  readonly totalIn = computed(() => this.formatAmount(this.sumActive(this.incoming())));
  readonly totalOut = computed(() => this.formatAmount(this.sumActive(this.outgoing())));

  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.rows().slice(start, start + this.pageSize);
  });

  readonly isLoading = computed(() => !this.transactionService.loaded());

  // Modification : chaque type a sa fenêtre.
  readonly editingPayment = signal<Transaction | null>(null);
  readonly editingMoneyOperation = signal<Transaction | null>(null);
  readonly editingSupplierOperation = signal<SupplierTransaction | null>(null);
  readonly editingPartyName = signal('');

  // Annulation
  readonly cancellingRow = signal<MoneyRow | null>(null);
  readonly cancelling = signal(false);
  readonly cancelError = signal('');
  readonly cancelSummary = computed(() => {
    const row = this.cancellingRow();
    return row ? `${row.typeLabel} · ${row.partyName} · ${this.formatAmount(row.amount)}` : '';
  });

  constructor(
    private readonly customerService: CustomerService,
    private readonly transactionService: TransactionService,
    private readonly supplierService: SupplierService,
    private readonly supplierTransactionService: SupplierTransactionService,
    private readonly subscriptionService: SubscriptionService,
    private readonly profileService: ProfileService
  ) {}

  setTab(tab: MoneyTab): void {
    this.tab.set(tab);
    this.page.set(1);
  }

  onRangeChange(event: DatePickerChangeEvent): void {
    if (event.selectedDates.length < 2) return;
    const [start, end] = event.selectedDates;
    this.rangeStart.set(new Date(start));
    this.rangeEnd.set(endOfDay(end));
    this.preset.set('custom');
    this.page.set(1);
  }

  selectPreset(preset: Exclude<RangePreset, 'custom'>): void {
    const [start, end] = presetRange(preset);
    this.preset.set(preset);
    this.rangeStart.set(start);
    this.rangeEnd.set(end);
    this.page.set(1);
  }

  setMethodFilter(filter: MethodFilter): void {
    this.methodFilter.set(filter);
    this.page.set(1);
  }

  /** Reçu WhatsApp : montant, date, mode, « payé par » et solde actuel du client. */
  private receiptLink(t: Transaction, customerName: string, phone: string): string {
    const balance = this.transactionService.balanceForCustomer(t.customerId);
    const message = receiptMessage({
      customerName,
      kind: t.type === 'DEPOSIT' ? 'DEPOSIT' : 'PAYMENT',
      formattedAmount: this.formatAmount(t.amount),
      date: t.createdAt,
      paymentMethod: paymentMethodLabel(t.paymentMethod),
      paidBy: t.paidBy,
      businessName: this.profileService.profile()?.businessName ?? '',
      balance,
      formattedBalance: this.formatAmount(Math.abs(balance))
    });
    return whatsappUrl(phone, message);
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  paymentMethodLabel(method: string): string {
    return paymentMethodLabel(method);
  }

  /** Les règlements fournisseurs ne se modifient / n'annulent qu'avec l'abonnement. */
  canAct(row: MoneyRow): boolean {
    return !row.cancelled && (!!row.customerOperation || this.canManageSuppliers());
  }

  openEdit(row: MoneyRow): void {
    this.editingPartyName.set(row.partyName);
    if (row.supplierOperation) {
      this.editingSupplierOperation.set(row.supplierOperation);
    } else if (row.customerOperation?.type === 'PAYMENT') {
      this.editingPayment.set(row.customerOperation);
    } else if (row.customerOperation) {
      this.editingMoneyOperation.set(row.customerOperation);
    }
  }

  openCancel(row: MoneyRow): void {
    this.cancelError.set('');
    this.cancellingRow.set(row);
  }

  closeCancel(): void {
    this.cancellingRow.set(null);
  }

  confirmCancel(reason: string): void {
    const row = this.cancellingRow();
    if (!row || this.cancelling()) {
      return;
    }
    const request$: Observable<unknown> = row.supplierOperation
      ? this.supplierTransactionService.cancel(row.id, reason)
      : this.transactionService.cancel(row.id, reason);

    this.cancelling.set(true);
    this.cancelError.set('');
    request$.subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancellingRow.set(null);
      },
      error: err => {
        this.cancelling.set(false);
        this.cancelError.set("L'annulation a échoué. Réessayez.");
        console.error("Échec de l'annulation de l'opération", err);
      }
    });
  }
}
