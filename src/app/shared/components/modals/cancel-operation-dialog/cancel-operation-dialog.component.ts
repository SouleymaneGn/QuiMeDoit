import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';

/**
 * Remplace la suppression : l'opération est annulée avec un motif obligatoire,
 * reste visible (barrée) dans l'historique et ne compte plus dans les soldes.
 */
@Component({
  selector: 'app-cancel-operation-dialog',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent],
  templateUrl: './cancel-operation-dialog.component.html'
})
export class CancelOperationDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() title = 'Annuler cette opération ?';
  /** Rappel de l'opération concernée, ex. « Paiement reçu · Mamadou Diallo · 200 000 GNF ». */
  @Input() summary = '';
  @Input() busy = false;
  @Input() errorMessage = '';

  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly reason = signal('');
  readonly canConfirm = computed(() => this.reason().trim().length >= 3);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.reason.set('');
    }
  }

  onReasonChange(value: string | number): void {
    this.reason.set(String(value));
  }

  submit(): void {
    if (this.canConfirm() && !this.busy) {
      this.confirm.emit(this.reason().trim());
    }
  }
}
