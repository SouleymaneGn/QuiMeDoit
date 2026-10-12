import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { PhoneInputComponent } from '../../form/group-input/phone-input/phone-input.component';
import { SupplierService } from '../../../../core/services/supplier.service';
import { isAcceptablePhone } from '../../../../core/utils/phone.util';
import { toTitleCase } from '../../../../core/utils/text.util';
import { Supplier } from '../../../../core/models/supplier.model';

@Component({
  selector: 'app-edit-supplier-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, PhoneInputComponent],
  templateUrl: './edit-supplier-modal.component.html'
})
export class EditSupplierModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() supplier: Supplier | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Supplier>();

  readonly name = signal('');
  readonly phone = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly canSubmit = computed(() => !!this.name().trim() && isAcceptablePhone(this.phone()));

  constructor(private readonly supplierService: SupplierService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.supplier) {
      this.name.set(this.supplier.name);
      this.phone.set(this.supplier.phone ?? '');
      this.errorMessage.set('');
    }
  }

  onNameChange(value: string | number): void {
    this.name.set(String(value));
  }

  onPhoneChange(value: string | number): void {
    this.phone.set(String(value));
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting() || !this.supplier) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.supplierService
      .update(this.supplier.id, {
        name: toTitleCase(this.name()),
        phone: this.phone().trim()
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
          console.error('Échec de la mise à jour du fournisseur', err);
        }
      });
  }

  onClose(): void {
    this.errorMessage.set('');
    this.close.emit();
  }
}
