import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ClientPickerStepComponent, ClientReadyEvent } from '../client-picker-step/client-picker-step.component';
import { TransactionService } from '../../../../core/services/transaction.service';

@Component({
  selector: 'app-new-debt-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, ClientPickerStepComponent],
  templateUrl: './new-debt-modal.component.html'
})
export class NewDebtModalComponent {
  @Input() isOpen = false;
  @Input() presetCustomerId?: string;
  @Input() presetCustomerName?: string;
  @Output() close = new EventEmitter<void>();

  readonly selectedClient = signal<ClientReadyEvent | null>(null);
  readonly label = signal('');
  readonly amount = signal<number | ''>('');
  readonly submitting = signal(false);

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

  submit(): void {
    const client = this.effectiveClient();
    if (!client || !this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.transactionService
      .create({
        customerId: client.id,
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
    this.selectedClient.set(null);
    this.label.set('');
    this.amount.set('');
  }
}
