import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
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
  selector: 'app-new-supplier-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, PhoneInputComponent],
  templateUrl: './new-supplier-modal.component.html'
})
export class NewSupplierModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Supplier>();

  readonly name = signal('');
  readonly phone = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly canSubmit = computed(() => !!this.name().trim() && isAcceptablePhone(this.phone()));

  constructor(private readonly supplierService: SupplierService) {}

  onNameChange(value: string | number): void {
    this.name.set(String(value));
  }

  onPhoneChange(value: string | number): void {
    this.phone.set(String(value));
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.supplierService
      .create({ name: toTitleCase(this.name()), phone: this.phone().trim() || undefined })
      .subscribe({
        next: supplier => {
          this.submitting.set(false);
          this.reset();
          this.created.emit(supplier);
          this.close.emit();
        },
        error: err => {
          this.submitting.set(false);
          this.errorMessage.set("Erreur lors de l'enregistrement. Réessayez.");
          console.error('Échec de la création du fournisseur', err);
        }
      });
  }

  onClose(): void {
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.name.set('');
    this.phone.set('');
    this.errorMessage.set('');
  }
}
