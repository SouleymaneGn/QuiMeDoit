import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent, Option } from '../../form/select/select.component';
import { CustomerService } from '../../../../core/services/customer.service';
import { TransactionService } from '../../../../core/services/transaction.service';

@Component({
  selector: 'app-new-debt-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, SelectComponent],
  templateUrl: './new-debt-modal.component.html'
})
export class NewDebtModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  readonly customerId = signal('');
  readonly label = signal('');
  readonly amount = signal<number | ''>('');
  readonly submitting = signal(false);

  readonly customerOptions = computed<Option[]>(() =>
    this.customerService.customers().map(c => ({ value: c.id, label: c.name }))
  );

  readonly canSubmit = computed(
    () => !!this.customerId() && !!this.label().trim() && Number(this.amount()) > 0
  );

  constructor(
    private readonly customerService: CustomerService,
    private readonly transactionService: TransactionService
  ) {}

  onCustomerChange(value: string): void {
    this.customerId.set(value);
  }

  onLabelChange(value: string | number): void {
    this.label.set(String(value));
  }

  onAmountChange(value: string | number): void {
    this.amount.set(value === '' ? '' : Number(value));
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.transactionService
      .create({
        customerId: this.customerId(),
        type: 'DEBT',
        label: this.label().trim(),
        amount: Number(this.amount()),
        paymentMethod: 'CASH'
      })
      .subscribe(() => {
        this.submitting.set(false);
        this.reset();
        this.close.emit();
      });
  }

  onClose(): void {
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.customerId.set('');
    this.label.set('');
    this.amount.set('');
  }
}
