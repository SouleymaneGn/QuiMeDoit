import { NgClass } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { NewCustomerModalComponent } from '../../shared/components/modals/new-customer-modal/new-customer-modal.component';
import { PaginationComponent } from '../../shared/components/ui/pagination/pagination.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ProfileService } from '../../core/services/profile.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-customers',
  imports: [
    NgClass,
    PageBreadcrumbComponent,
    ButtonComponent,
    InputFieldComponent,
    NewCustomerModalComponent,
    PaginationComponent,
    SkeletonComponent
  ],
  templateUrl: './customers.component.html'
})
export class CustomersComponent {
  readonly showNewCustomerModal = signal(false);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly rows = computed(() =>
    this.customerService.filteredCustomers().map(c => ({
      ...c,
      balance: this.transactionService.balanceForCustomer(c.id)
    }))
  );

  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.rows().slice(start, start + this.pageSize);
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

  onPageChange(page: number): void {
    this.page.set(page);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  openCustomer(id: string): void {
    this.router.navigate(['/app/customers', id]);
  }
}
