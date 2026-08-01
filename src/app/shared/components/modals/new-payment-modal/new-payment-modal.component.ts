import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent, Option } from '../../form/select/select.component';
import { CustomerService } from '../../../../core/services/customer.service';
import { TransactionService } from '../../../../core/services/transaction.service';
import { PaymentMethod } from '../../../../core/models/transaction.model';

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' }
];

@Component({
  selector: 'app-new-payment-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, SelectComponent],
  templateUrl: './new-payment-modal.component.html'
})
export class NewPaymentModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  readonly customerId = signal('');
  readonly label = signal('Règlement');
  readonly amount = signal<number | ''>('');
  readonly paymentMethod = signal<PaymentMethod>('CASH');
  readonly submitting = signal(false);

  readonly customerOptions = computed<Option[]>(() =>
    this.customerService.customers().map(c => ({ value: c.id, label: c.name }))
  );

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

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

  onPaymentMethodChange(value: string): void {
    this.paymentMethod.set(value as PaymentMethod);
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.transactionService
      .create({
        customerId: this.customerId(),
        type: 'PAYMENT',
        label: this.label().trim(),
        amount: Number(this.amount()),
        paymentMethod: this.paymentMethod()
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
    this.label.set('Règlement');
    this.amount.set('');
    this.paymentMethod.set('CASH');
  }
}
