import { LowerCasePipe, NgClass } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { NewCustomerModalComponent } from '../../shared/components/modals/new-customer-modal/new-customer-modal.component';
import { NewDebtModalComponent } from '../../shared/components/modals/new-debt-modal/new-debt-modal.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { PaginationComponent } from '../../shared/components/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { isOverCreditLimit } from '../../core/utils/credit-limit.util';
import { balanceLabel } from '../../core/utils/balance.util';
import { phoneStatus } from '../../core/utils/phone.util';
import { reminderMessage, whatsappUrl } from '../../core/utils/whatsapp.util';

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

type BalanceFilter = 'all' | 'to-collect' | 'to-refund' | 'settled' | 'over-limit' | 'no-phone';

/** Tri : nom (A→Z), montant dû (le plus élevé d'abord), ancienneté (le plus silencieux d'abord). */
type SortKey = 'name' | 'amount' | 'oldest';

interface QuickActionTarget {
  id: string;
  name: string;
}

function sinceLabel(days: number | null): string {
  if (days === null) return 'Aucune';
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days} jours`;
}

@Component({
  selector: 'app-customers',
  imports: [
    NgClass,
    LowerCasePipe,
    PageBreadcrumbComponent,
    ButtonComponent,
    BadgeComponent,
    InputFieldComponent,
    NewCustomerModalComponent,
    NewDebtModalComponent,
    NewPaymentModalComponent,
    PaginationComponent,
    SkeletonComponent
  ],
  templateUrl: './customers.component.html'
})
export class CustomersComponent {
  readonly showNewCustomerModal = signal(false);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;
  readonly balanceFilter = signal<BalanceFilter>('all');
  readonly sortKey = signal<SortKey>('name');

  readonly sortOptions: { value: SortKey; label: string }[] = [
    { value: 'name', label: 'Nom' },
    { value: 'amount', label: 'Montant dû' },
    { value: 'oldest', label: 'Ancienneté' }
  ];

  // Actions rapides
  readonly debtTarget = signal<QuickActionTarget | null>(null);
  readonly paymentTarget = signal<QuickActionTarget | null>(null);

  readonly rows = computed(() => {
    const now = Date.now();
    const lastActivity = this.transactionService.lastActivityByCustomer();
    return this.customerService.filteredCustomers().map(c => {
      const balance = this.transactionService.balanceForCustomer(c.id);
      const last = lastActivity.get(c.id);
      const days = last ? Math.max(0, Math.floor((now - new Date(last).getTime()) / DAY_MS)) : null;
      const phone = phoneStatus(c.phone);
      return {
        ...c,
        balance,
        display: balanceLabel(balance),
        overLimit: isOverCreditLimit(balance, c.creditLimit),
        phoneInvalid: phone === 'invalid',
        hasPhone: phone !== 'empty',
        days,
        sinceLabel: sinceLabel(days),
        /** Retard notable : dette en cours et plus de 30 jours sans opération. */
        stale: balance > 0 && days !== null && days > 30,
        whatsappLink: phone === 'valid' ? this.whatsappLink(c.phone!, c.name, balance) : null,
        callLink: phone === 'valid' ? `tel:${c.phone!.replace(/\s/g, '')}` : null
      };
    });
  });

  readonly toCollectCount = computed(() => this.rows().filter(r => r.balance > 0).length);
  readonly toRefundCount = computed(() => this.rows().filter(r => r.balance < 0).length);
  readonly settledCount = computed(() => this.rows().filter(r => r.balance === 0).length);
  readonly overLimitCount = computed(() => this.rows().filter(r => r.overLimit).length);
  readonly noPhoneCount = computed(() => this.rows().filter(r => !r.hasPhone).length);

  readonly filteredRows = computed(() => {
    const filter = this.balanceFilter();
    const rows = this.rows().filter(r => {
      switch (filter) {
        case 'to-collect':
          return r.balance > 0;
        case 'to-refund':
          return r.balance < 0;
        case 'settled':
          return r.balance === 0;
        case 'over-limit':
          return r.overLimit;
        case 'no-phone':
          return !r.hasPhone;
        default:
          return true;
      }
    });
    switch (this.sortKey()) {
      case 'amount':
        return [...rows].sort((a, b) => b.balance - a.balance);
      case 'oldest':
        // Sans opération = tout en bas.
        return [...rows].sort((a, b) => (b.days ?? -1) - (a.days ?? -1));
      default:
        return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
  });

  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  constructor(
    readonly customerService: CustomerService,
    private readonly transactionService: TransactionService,
    private readonly profileService: ProfileService,
    private readonly router: Router
  ) {}

  onSearchChange(value: string | number): void {
    this.customerService.searchTerm.set(String(value));
    this.page.set(1);
  }

  onFilterChange(filter: BalanceFilter): void {
    this.balanceFilter.set(filter);
    this.page.set(1);
  }

  onSortChange(sort: SortKey): void {
    this.sortKey.set(sort);
    this.page.set(1);
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  openCustomer(id: string): void {
    this.router.navigate(['/app/customers', id]);
  }

  openDebt(target: QuickActionTarget, event: Event): void {
    event.stopPropagation();
    this.debtTarget.set(target);
  }

  openPayment(target: QuickActionTarget, event: Event): void {
    event.stopPropagation();
    this.paymentTarget.set(target);
  }

  /** Liens WhatsApp / appel : on n'ouvre pas la fiche en même temps. */
  stop(event: Event): void {
    event.stopPropagation();
  }

  /** Débiteur : message de rappel des Paramètres. Sinon : simple salutation. */
  private whatsappLink(phone: string, name: string, balance: number): string {
    const profile = this.profileService.profile();
    const message =
      balance > 0
        ? reminderMessage(profile?.reminderTemplate, name, this.formatAmount(balance), profile?.businessName ?? '')
        : `Bonjour ${name.trim().split(/\s+/)[0]},`;
    return whatsappUrl(phone, message);
  }
}
