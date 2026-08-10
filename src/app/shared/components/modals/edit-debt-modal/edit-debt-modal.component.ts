import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { TransactionService } from '../../../../core/services/transaction.service';
import { Transaction } from '../../../../core/models/transaction.model';

@Component({
  selector: 'app-edit-debt-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent],
  templateUrl: './edit-debt-modal.component.html'
})
export class EditDebtModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() debt: Transaction | null = null;
  @Input() customerName = '';
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Transaction>();

  readonly label = signal('');
  readonly amount = signal<number | ''>('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly canSubmit = computed(() => !!this.label().trim() && Number(this.amount()) > 0);

  constructor(private readonly transactionService: TransactionService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.debt) {
      this.label.set(this.debt.label);
      this.amount.set(this.debt.amount);
      this.errorMessage.set('');
    }
  }

  onLabelChange(value: string | number): void {
    this.label.set(String(value));
  }

  onAmountChange(value: string | number): void {
    this.amount.set(value === '' ? '' : Number(value));
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting() || !this.debt) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.transactionService
      .update(this.debt.id, {
        label: this.label().trim(),
        amount: Number(this.amount())
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
          console.error('Échec de la mise à jour de la dette', err);
        }
      });
  }

  onClose(): void {
    this.errorMessage.set('');
    this.close.emit();
  }
}
