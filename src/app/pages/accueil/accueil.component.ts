import { NgClass } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { NewDebtModalComponent } from '../../shared/components/modals/new-debt-modal/new-debt-modal.component';
import { NewPaymentModalComponent } from '../../shared/components/modals/new-payment-modal/new-payment-modal.component';
import { ProfileService } from '../../core/services/profile.service';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierTransactionService } from '../../core/services/supplier-transaction.service';
import { isOverCreditLimit } from '../../core/utils/credit-limit.util';
import { INCOMING_TYPES, TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_TEXT_CLASS } from '../../core/utils/operation.util';
import { phoneStatus } from '../../core/utils/phone.util';
import { periodRange } from '../../core/utils/report.util';
import { reminderMessage, whatsappUrl } from '../../core/utils/whatsapp.util';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Nombre de clients proposés dans « À relancer ». */
const REMIND_COUNT = 5;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

@Component({
  selector: 'app-accueil',
  imports: [NgClass, RouterLink, ButtonComponent, SkeletonComponent, NewDebtModalComponent, NewPaymentModalComponent],
  templateUrl: './accueil.component.html'
})
export class AccueilComponent {
  readonly showNewDebtModal = signal(false);
  readonly showNewPaymentModal = signal(false);

  /** displayName saisi à l'inscription — jamais l'email, peu lisible en salutation. */
  private readonly displayName = signal('');

  readonly isLoading = computed(() => !this.transactionService.loaded());

  /** Prénom du profil en priorité, puis celui de l'inscription ; vide → « Bonjour » seul. */
  readonly firstName = computed(() => {
    const name = this.profileService.profile()?.ownerName?.trim() || this.displayName();
    return name.split(' ')[0];
  });

  readonly totalToCollect = computed(() =>
    this.profileService.formatAmount(this.transactionService.totalToCollect())
  );
  readonly totalToRefund = computed(() =>
    this.profileService.formatAmount(this.transactionService.totalToRefund())
  );

  readonly debtorsCount = computed(() => this.transactionService.debtorsCount());
  readonly creditorsCount = computed(() => this.transactionService.creditorsCount());

  /** Réservé aux abonnés, et seulement s'ils suivent déjà au moins un fournisseur. */
  readonly showSuppliersLine = computed(
    () =>
      this.subscriptionService.hasPaidAccess() &&
      this.supplierTransactionService.loaded() &&
      this.supplierService.suppliers().length > 0
  );
  readonly totalToPaySuppliers = computed(() =>
    this.profileService.formatAmount(this.supplierTransactionService.totalToPay())
  );

  readonly overLimitCount = computed(
    () =>
      this.customerService
        .customers()
        .filter(c => isOverCreditLimit(this.transactionService.balanceForCustomer(c.id), c.creditLimit)).length
  );

  /**
   * À récupérer − avances des clients − dû aux fournisseurs (abonnés).
   * Négatif : le commerçant doit globalement plus qu'on ne lui doit.
   */
  readonly netPosition = computed(
    () =>
      this.transactionService.totalToCollect() -
      this.transactionService.totalToRefund() -
      (this.showSuppliersLine() ? Math.max(0, this.supplierTransactionService.totalToPay()) : 0)
  );

  /** Les points d'attention ne s'affichent que s'ils sont non nuls : un jour normal, seul « À récupérer » reste. */
  readonly hasAttentionLines = computed(
    () => this.overLimitCount() > 0 || this.creditorsCount() > 0 || this.showSuppliersLine()
  );

  // — Encaissé (paiements + dépôts, hors annulations) —
  readonly collectedToday = computed(() => this.formatAmount(this.incomingSince(startOfDay(new Date()))));
  readonly collectedThisWeek = computed(() =>
    this.formatAmount(this.incomingSince(periodRange('week', new Date()).start.getTime()))
  );

  /**
   * « À relancer » : les débiteurs qui pèsent le plus, montant × ancienneté de la
   * dernière opération (un client silencieux depuis longtemps remonte).
   */
  readonly toRemind = computed(() => {
    const now = Date.now();
    const lastActivity = this.transactionService.lastActivityByCustomer();
    return this.customerService
      .customers()
      .map(c => {
        const balance = this.transactionService.balanceForCustomer(c.id);
        const last = lastActivity.get(c.id);
        const days = last ? Math.max(0, Math.floor((now - new Date(last).getTime()) / DAY_MS)) : 0;
        return { customer: c, balance, days, score: balance * Math.max(1, days) };
      })
      .filter(r => r.balance > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, REMIND_COUNT)
      .map(r => ({
        id: r.customer.id,
        name: r.customer.name,
        amount: this.formatAmount(r.balance),
        sinceLabel: r.days === 0 ? "aujourd'hui" : r.days === 1 ? 'hier' : `il y a ${r.days} jours`,
        whatsappLink: phoneStatus(r.customer.phone) === 'valid' ? this.reminderLink(r.customer.phone!, r.customer.name, r.balance) : null
      }));
  });

  readonly recentActivity = computed(() =>
    this.transactionService
      .recentActivity()
      .slice(0, 8)
      .map(t => ({
        ...t,
        customerName: this.customerService.getById(t.customerId)?.name ?? 'Client',
        typeLabel: TRANSACTION_TYPE_LABELS[t.type],
        typeClass: TRANSACTION_TYPE_TEXT_CLASS[t.type]
      }))
  );

  constructor(
    private readonly profileService: ProfileService,
    private readonly customerService: CustomerService,
    private readonly transactionService: TransactionService,
    private readonly supabaseService: SupabaseService,
    private readonly subscriptionService: SubscriptionService,
    private readonly supplierService: SupplierService,
    private readonly supplierTransactionService: SupplierTransactionService,
    private readonly router: Router
  ) {
    this.loadUser();
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  /** « aujourd'hui », « hier », sinon jj/mm. */
  relativeDay(isoDate: string): string {
    const date = new Date(isoDate);
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS);
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return 'hier';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  private incomingSince(fromTime: number): number {
    return this.transactionService
      .activeTransactions()
      .filter(t => INCOMING_TYPES.includes(t.type) && new Date(t.createdAt).getTime() >= fromTime)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private reminderLink(phone: string, customerName: string, balance: number): string {
    const profile = this.profileService.profile();
    const message = reminderMessage(
      profile?.reminderTemplate,
      customerName,
      this.formatAmount(balance),
      profile?.businessName ?? ''
    );
    return whatsappUrl(phone, message);
  }

  openCustomer(customerId: string): void {
    this.router.navigate(['/app/customers', customerId]);
  }

  private async loadUser(): Promise<void> {
    const { data } = await this.supabaseService.getUser();
    const displayName = data.user?.user_metadata?.['displayName'] as string | undefined;
    this.displayName.set(displayName?.trim() ?? '');
  }
}
