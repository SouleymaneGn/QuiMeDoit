import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent, Option } from '../../form/select/select.component';
import { AlertComponent } from '../../ui/alert/alert.component';
import { TransactionService } from '../../../../core/services/transaction.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { PaymentMethod, Transaction } from '../../../../core/models/transaction.model';

/** Argent confié par le client (hors dettes et paiements). */
export type CustomerMoneyOperationType = 'DEPOSIT' | 'WITHDRAWAL';

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' }
];

const DEFAULT_LABELS: Record<CustomerMoneyOperationType, string> = {
  DEPOSIT: 'Dépôt',
  WITHDRAWAL: 'Retrait'
};

/**
 * Dépôt (le client confie de l'argent) ou retrait (il le reprend), en création
 * ou en modification (si `operation` est fourni, son type l'emporte sur `type`).
 */
@Component({
  selector: 'app-customer-operation-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, SelectComponent, AlertComponent],
  templateUrl: './customer-operation-modal.component.html'
})
export class CustomerOperationModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() type: CustomerMoneyOperationType = 'DEPOSIT';
  @Input() customerId = '';
  @Input() customerName = '';
  /** Opération à modifier ; absent = création. */
  @Input() operation: Transaction | null = null;
  @Output() close = new EventEmitter<void>();

  readonly effectiveType = signal<CustomerMoneyOperationType>('DEPOSIT');
  readonly isEdit = signal(false);
  readonly label = signal('');
  readonly amount = signal<number | ''>('');
  readonly paymentMethod = signal<PaymentMethod>('CASH');
  readonly paidBy = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  private readonly originalAmount = signal(0);
  private readonly currentCustomerId = signal('');

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

  readonly title = computed(() => {
    const deposit = this.effectiveType() === 'DEPOSIT';
    if (this.isEdit()) {
      return deposit ? 'Modifier le dépôt' : 'Modifier le retrait';
    }
    return deposit ? 'Dépôt du client' : 'Retrait du client';
  });

  readonly canSubmit = computed(() => !!this.label().trim() && Number(this.amount()) > 0);

  /** Argent du client disponible chez le commerçant (solde négatif = avance). */
  private readonly availableDeposit = computed(() => {
    const balance = this.transactionService.balanceForCustomer(this.currentCustomerId());
    // En modification d'un retrait, son montant actuel est « rendu » avant de comparer.
    const editing = this.isEdit() && this.effectiveType() === 'WITHDRAWAL' ? this.originalAmount() : 0;
    return Math.max(0, -(balance - editing));
  });

  /** Avertissement non bloquant : un retrait supérieur au dépôt crée une dette. */
  readonly withdrawalWarning = computed(() => {
    if (this.effectiveType() !== 'WITHDRAWAL') return '';
    const amount = Number(this.amount());
    const available = this.availableDeposit();
    if (!(amount > available)) return '';
    const debt = this.profileService.formatAmount(amount - available);
    return available > 0
      ? `Le client n'a que ${this.profileService.formatAmount(available)} en dépôt : ${debt} seront comptés comme une dette.`
      : `Le client n'a pas d'argent en dépôt : ce retrait sera compté comme une dette de ${debt}.`;
  });

  constructor(
    private readonly transactionService: TransactionService,
    private readonly profileService: ProfileService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen'] || !this.isOpen) {
      return;
    }
    this.errorMessage.set('');
    this.currentCustomerId.set(this.operation?.customerId ?? this.customerId);
    if (this.operation) {
      const type: CustomerMoneyOperationType = this.operation.type === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT';
      this.isEdit.set(true);
      this.effectiveType.set(type);
      this.label.set(this.operation.label);
      this.amount.set(this.operation.amount);
      this.originalAmount.set(this.operation.amount);
      this.paymentMethod.set(this.operation.paymentMethod);
      this.paidBy.set(this.operation.paidBy ?? '');
    } else {
      this.isEdit.set(false);
      this.effectiveType.set(this.type);
      this.label.set(DEFAULT_LABELS[this.type]);
      this.amount.set('');
      this.originalAmount.set(0);
      this.paymentMethod.set('CASH');
      this.paidBy.set('');
    }
  }

  onLabelChange(value: string | number): void {
    this.label.set(String(value));
  }

  onAmountChange(value: string | number): void {
    this.amount.set(value === '' ? '' : Number(value));
  }

  onPaidByChange(value: string | number): void {
    this.paidBy.set(String(value));
  }

  onPaymentMethodChange(value: string): void {
    this.paymentMethod.set(value as PaymentMethod);
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    // « Déposé par » n'existe que pour les dépôts, et n'est envoyé que s'il change.
    const paidBy = this.effectiveType() === 'DEPOSIT' ? this.paidBy().trim() : '';
    const paidByChanged = paidBy !== (this.operation?.paidBy ?? '');
    const fields = {
      label: this.label().trim(),
      amount: Number(this.amount()),
      paymentMethod: this.paymentMethod(),
      ...(paidByChanged ? { paidBy: paidBy || null } : {})
    };
    const request$ = this.operation
      ? this.transactionService.update(this.operation.id, fields)
      : this.transactionService.create({ ...fields, customerId: this.customerId, type: this.effectiveType() });

    this.submitting.set(true);
    this.errorMessage.set('');
    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.close.emit();
      },
      error: err => {
        this.submitting.set(false);
        this.errorMessage.set("Erreur lors de l'enregistrement. Réessayez.");
        console.error("Échec de l'enregistrement du dépôt / retrait", err);
      }
    });
  }

  onClose(): void {
    this.errorMessage.set('');
    this.close.emit();
  }
}
