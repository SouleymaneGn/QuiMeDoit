import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { PhoneInputComponent } from '../../form/group-input/phone-input/phone-input.component';
import { CustomerService } from '../../../../core/services/customer.service';
import { Customer } from '../../../../core/models/customer.model';

@Component({
  selector: 'app-edit-customer-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, PhoneInputComponent],
  templateUrl: './edit-customer-modal.component.html'
})
export class EditCustomerModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() customer: Customer | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Customer>();

  readonly name = signal('');
  readonly phone = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly canSubmit = computed(() => !!this.name().trim());

  constructor(private readonly customerService: CustomerService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.customer) {
      this.name.set(this.customer.name);
      this.phone.set(this.customer.phone ?? '');
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
    if (!this.canSubmit() || this.submitting() || !this.customer) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.customerService
      .update(this.customer.id, {
        name: this.name().trim(),
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
          console.error('Échec de la mise à jour du client', err);
        }
      });
  }

  onClose(): void {
    this.errorMessage.set('');
    this.close.emit();
  }
}
