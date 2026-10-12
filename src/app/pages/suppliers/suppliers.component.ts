import { NgClass } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { PaginationComponent } from '../../shared/components/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { NewSupplierModalComponent } from '../../shared/components/modals/new-supplier-modal/new-supplier-modal.component';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SupplierService } from '../../core/services/supplier.service';
import { SupplierTransactionService } from '../../core/services/supplier-transaction.service';
import { ProfileService } from '../../core/services/profile.service';

const PAGE_SIZE = 10;

/**
 * - presentation : pas d'abonnement payant et aucune donnée → on présente la fonctionnalité.
 * - read-only    : abonnement expiré mais des fournisseurs existent → consultation seule.
 * - full         : abonné (ou ADMIN/EMPLOYEE).
 * Pas de guard dédié : un non-abonné doit voir la page, pas être redirigé.
 */
type SuppliersAccessMode = 'loading' | 'presentation' | 'read-only' | 'full';

type BalanceFilter = 'all' | 'to-pay';

@Component({
  selector: 'app-suppliers',
  imports: [
    NgClass,
    RouterLink,
    PageBreadcrumbComponent,
    AlertComponent,
    ButtonComponent,
    InputFieldComponent,
    PaginationComponent,
    SkeletonComponent,
    NewSupplierModalComponent
  ],
  templateUrl: './suppliers.component.html'
})
export class SuppliersComponent {
  readonly showNewSupplierModal = signal(false);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;
  readonly balanceFilter = signal<BalanceFilter>('all');

  readonly accessMode = computed<SuppliersAccessMode>(() => {
    if (this.subscriptionService.hasPaidAccess()) {
      return 'full';
    }
    if (!this.supplierService.loaded()) {
      return 'loading';
    }
    return this.supplierService.suppliers().length > 0 ? 'read-only' : 'presentation';
  });

  readonly canWrite = computed(() => this.accessMode() === 'full');

  readonly isLoading = computed(
    () => !this.supplierService.loaded() || !this.supplierTransactionService.loaded()
  );

  readonly totalToPay = computed(() => this.formatAmount(this.supplierTransactionService.totalToPay()));

  readonly rows = computed(() =>
    this.supplierService.filteredSuppliers().map(s => ({
      ...s,
      balance: this.supplierTransactionService.balanceForSupplier(s.id)
    }))
  );

  readonly toPayCount = computed(() => this.rows().filter(r => r.balance > 0).length);

  readonly filteredRows = computed(() =>
    this.balanceFilter() === 'to-pay' ? this.rows().filter(r => r.balance > 0) : this.rows()
  );

  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  constructor(
    private readonly subscriptionService: SubscriptionService,
    readonly supplierService: SupplierService,
    private readonly supplierTransactionService: SupplierTransactionService,
    private readonly profileService: ProfileService,
    private readonly router: Router
  ) {}

  onSearchChange(value: string | number): void {
    this.supplierService.searchTerm.set(String(value));
    this.page.set(1);
  }

  onFilterChange(filter: BalanceFilter): void {
    this.balanceFilter.set(filter);
    this.page.set(1);
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  openSupplier(id: string): void {
    this.router.navigate(['/app/suppliers', id]);
  }
}
