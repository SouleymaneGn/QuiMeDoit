import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { PhoneInputComponent } from '../../form/group-input/phone-input/phone-input.component';
import { CustomerService } from '../../../../core/services/customer.service';
import { Customer } from '../../../../core/models/customer.model';

@Component({
  selector: 'app-new-customer-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, PhoneInputComponent],
  templateUrl: './new-customer-modal.component.html'
})
export class NewCustomerModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<Customer>();

  readonly name = signal('');
  readonly phone = signal('');
  readonly submitting = signal(false);

  readonly canSubmit = computed(() => !!this.name().trim());

  constructor(private readonly customerService: CustomerService) {}

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
    this.customerService
      .create({ name: this.name().trim(), phone: this.phone().trim() || undefined })
      .subscribe(customer => {
        this.submitting.set(false);
        this.reset();
        this.created.emit(customer);
        this.close.emit();
      });
  }

  onClose(): void {
    this.reset();
    this.close.emit();
  }

  private reset(): void {
    this.name.set('');
    this.phone.set('');
  }
}
