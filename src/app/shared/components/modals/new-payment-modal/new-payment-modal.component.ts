import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent, Option } from '../../form/select/select.component';
import { ClientPickerStepComponent, ClientReadyEvent } from '../client-picker-step/client-picker-step.component';
import { TransactionService } from '../../../../core/services/transaction.service';
import { PaymentMethod } from '../../../../core/models/transaction.model';

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' }
];

@Component({
  selector: 'app-new-payment-modal',
  imports: [
    ModalComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent,
    SelectComponent,
    ClientPickerStepComponent
  ],
  templateUrl: './new-payment-modal.component.html'
})
export class NewPaymentModalComponent {
  @Input() isOpen = false;
  @Input() presetCustomerId?: string;
  @Input() presetCustomerName?: string;
  @Output() close = new EventEmitter<void>();

  readonly selectedClient = signal<ClientReadyEvent | null>(null);
  readonly label = signal('Règlement');
  readonly amount = signal<number | ''>('');
  readonly paymentMethod = signal<PaymentMethod>('CASH');
  readonly submitting = signal(false);

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  readonly effectiveClient = computed<ClientReadyEvent | null>(() =>
    this.presetCustomerId
      ? { id: this.presetCustomerId, name: this.presetCustomerName ?? '' }
      : this.selectedClient()
  );

  readonly canSubmit = computed(
    () => !!this.effectiveClient() && !!this.label().trim() && Number(this.amount()) > 0
  );

  constructor(private readonly transactionService: TransactionService) {}

  onClientReady(client: ClientReadyEvent): void {
    this.selectedClient.set(client);
  }

  changeClient(): void {
    this.selectedClient.set(null);
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
    const client = this.effectiveClient();
    if (!client || !this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.transactionService
      .create({
        customerId: client.id,
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
    this.selectedClient.set(null);
    this.label.set('Règlement');
    this.amount.set('');
    this.paymentMethod.set('CASH');
  }
}
