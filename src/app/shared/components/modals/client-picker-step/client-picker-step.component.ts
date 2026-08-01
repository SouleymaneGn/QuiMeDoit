import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { CustomerService } from '../../../../core/services/customer.service';
import { TransactionService } from '../../../../core/services/transaction.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { Customer } from '../../../../core/models/customer.model';

export interface ClientReadyEvent {
  id: string;
  name: string;
}

@Component({
  selector: 'app-client-picker-step',
  imports: [ButtonComponent, LabelComponent, InputFieldComponent],
  templateUrl: './client-picker-step.component.html'
})
export class ClientPickerStepComponent {
  @Output() clientReady = new EventEmitter<ClientReadyEvent>();

  private readonly customerService = inject(CustomerService);
  private readonly transactionService = inject(TransactionService);
  private readonly profileService = inject(ProfileService);

  readonly query = signal('');
  readonly creatingName = signal<string | null>(null);
  readonly newPhone = signal('');
  readonly submitting = signal(false);

  readonly results = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return [];
    }
    return this.customerService
      .customers()
      .filter(
        c => c.name.toLowerCase().includes(term) || (c.phone ?? '').toLowerCase().includes(term)
      )
      .slice(0, 6);
  });

  onQueryChange(value: string | number): void {
    this.query.set(String(value));
  }

  onNewNameChange(value: string | number): void {
    this.creatingName.set(String(value));
  }

  onNewPhoneChange(value: string | number): void {
    this.newPhone.set(String(value));
  }

  balanceFor(customerId: string): number {
    return this.transactionService.balanceForCustomer(customerId);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  selectExisting(customer: Customer): void {
    this.clientReady.emit({ id: customer.id, name: customer.name });
  }

  startNewClient(): void {
    this.creatingName.set(this.query().trim());
  }

  backToSearch(): void {
    this.creatingName.set(null);
    this.newPhone.set('');
  }

  confirmNewClient(): void {
    const name = (this.creatingName() ?? '').trim();
    if (!name || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.customerService
      .create({ name, phone: this.newPhone().trim() || undefined })
      .subscribe(customer => {
        this.submitting.set(false);
        this.clientReady.emit({ id: customer.id, name: customer.name });
      });
  }
}
