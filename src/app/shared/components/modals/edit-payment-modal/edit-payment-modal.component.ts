import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent, Option } from '../../form/select/select.component';
import { TransactionService } from '../../../../core/services/transaction.service';
import { PaymentMethod, Transaction } from '../../../../core/models/transaction.model';

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' }
];

@Component({
  selector: 'app-edit-payment-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, SelectComponent],
  templateUrl: './edit-payment-modal.component.html'
})
export class EditPaymentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() payment: Transaction | null = null;
  @Input() customerName = '';
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Transaction>();

  readonly label = signal('');
  readonly amount = signal<number | ''>('');
  readonly paymentMethod = signal<PaymentMethod>('CASH');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  readonly canSubmit = computed(() => !!this.label().trim() && Number(this.amount()) > 0);

  constructor(private readonly transactionService: TransactionService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.payment) {
      this.label.set(this.payment.label);
      this.amount.set(this.payment.amount);
      this.paymentMethod.set(this.payment.paymentMethod);
      this.errorMessage.set('');
    }
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
    if (!this.canSubmit() || this.submitting() || !this.payment) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.transactionService
      .update(this.payment.id, {
        label: this.label().trim(),
        amount: Number(this.amount()),
        paymentMethod: this.paymentMethod()
      })
      .subscribe({
        next: updated => {
          this.submitting.set(false);
          this.saved.emit(updated);
          this.close.emit();
        },
        error: err => {
          this.submitting.set(false);
          this.errorMessage.set('Erreur lors de la mise à jour. Réessayez.');
          console.error('Échec de la mise à jour du paiement', err);
        }
      });
  }

  onClose(): void {
    this.errorMessage.set('');
    this.close.emit();
  }
}
