import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { AlertComponent } from '../../ui/alert/alert.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { TextAreaComponent } from '../../form/input/text-area.component';
import { PhotoAttachmentComponent } from '../../form/photo-attachment/photo-attachment.component';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';
import { ClientPickerStepComponent, ClientReadyEvent } from '../client-picker-step/client-picker-step.component';
import { TransactionService } from '../../../../core/services/transaction.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { DebtPhotoService } from '../../../../core/services/debt-photo.service';
import { hasCreditLimit, isOverCreditLimit } from '../../../../core/utils/credit-limit.util';

interface DatePickerChangeEvent {
  selectedDates: Date[];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

@Component({
  selector: 'app-new-debt-modal',
  imports: [
    ModalComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent,
    TextAreaComponent,
    PhotoAttachmentComponent,
    DatePickerComponent,
    ClientPickerStepComponent,
    AlertComponent
  ],
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
  readonly date = signal(new Date());
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  // — Photo (carnet, reçu, facture) —
  /** Photo à envoyer (case cochée + photo choisie), sinon null. */
  readonly photoFile = signal<File | null>(null);
  readonly photoZoomOpen = signal(false);

  readonly currency = computed(() => this.profileService.profile()?.currency ?? 'CFA');

  readonly effectiveClient = computed<ClientReadyEvent | null>(() =>
    this.presetCustomerId
      ? { id: this.presetCustomerId, name: this.presetCustomerName ?? '' }
      : this.selectedClient()
  );

  readonly canSubmit = computed(
    () => !!this.effectiveClient() && !!this.label().trim() && Number(this.amount()) > 0
  );

  /** La photo n'est envoyée que si la case est cochée et qu'une photo a été choisie. */
  private readonly willUploadPhoto = computed(() => !!this.photoFile());

  readonly submitLabel = computed(() => {
    if (this.submitting()) {
      return this.willUploadPhoto() ? 'Envoi de la photo...' : 'Enregistrement...';
    }
    return this.creditLimitWarning() ? 'Enregistrer quand même' : 'Enregistrer la dette';
  });

  /** Message d'alerte si cette dette fait (ou laisse) le client au-delà de son plafond. Non bloquant. */
  readonly creditLimitWarning = computed(() => {
    const client = this.effectiveClient();
    const creditLimit = client ? this.customerService.getById(client.id)?.creditLimit : null;
    if (!client || !hasCreditLimit(creditLimit)) {
      return '';
    }
    const newBalance = this.transactionService.balanceForCustomer(client.id) + (Number(this.amount()) || 0);
    if (!isOverCreditLimit(newBalance, creditLimit)) {
      return '';
    }
    const format = (amount: number) => this.profileService.formatAmount(amount);
    return `Dette après enregistrement : ${format(newBalance)}, soit ${format(newBalance - creditLimit)} au-dessus du plafond de ${format(creditLimit)}.`;
  });

  constructor(
    private readonly transactionService: TransactionService,
    private readonly customerService: CustomerService,
    private readonly profileService: ProfileService,
    private readonly debtPhotoService: DebtPhotoService
  ) {}

  onClientReady(client: ClientReadyEvent): void {
    this.selectedClient.set(client);
  }

  changeClient(): void {
    this.selectedClient.set(null);
  }

  onLabelChange(value: string): void {
    this.label.set(value);
  }

  onAmountChange(value: string | number): void {
    this.amount.set(value === '' ? '' : Number(value));
  }

  onDateChange(event: DatePickerChangeEvent): void {
    if (event.selectedDates.length) {
      this.date.set(event.selectedDates[0]);
    }
  }

  submit(): void {
    const client = this.effectiveClient();
    if (!client || !this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    // Photo d'abord : si l'envoi échoue, la dette n'est pas créée.
    const photoPath$: Observable<string | null> = this.willUploadPhoto()
      ? this.debtPhotoService.upload(this.photoFile()!)
      : of(null);

    photoPath$
      .pipe(
        switchMap(photoPath =>
          this.transactionService.create({
            customerId: client.id,
            type: 'DEBT',
            label: this.label().trim(),
            amount: Number(this.amount()),
            paymentMethod: 'CASH',
            createdAt: this.createdAtIso(),
            ...(photoPath ? { photoPath } : {})
          })
        )
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.reset();
          this.close.emit();
        },
        error: err => {
          this.submitting.set(false);
          this.errorMessage.set(
            this.willUploadPhoto()
              ? "L'envoi de la photo ou l'enregistrement a échoué. Vérifiez votre connexion et réessayez."
              : "L'enregistrement a échoué. Réessayez."
          );
          console.error("Échec de l'enregistrement de la dette", err);
        }
      });
  }

  onClose(): void {
    // Échap ferme d'abord l'aperçu agrandi, sans perdre la saisie.
    if (this.photoZoomOpen()) {
      return;
    }
    this.reset();
    this.close.emit();
  }

  /** Aujourd'hui → l'heure actuelle ; autre jour → midi, pour rester sur la bonne date quel que soit le fuseau. */
  private createdAtIso(): string {
    const now = new Date();
    const chosen = this.date();
    if (isSameDay(chosen, now)) {
      return now.toISOString();
    }
    return new Date(chosen.getFullYear(), chosen.getMonth(), chosen.getDate(), 12).toISOString();
  }

  private reset(): void {
    this.selectedClient.set(null);
    this.label.set('');
    this.amount.set('');
    this.date.set(new Date());
    this.errorMessage.set('');
    this.photoFile.set(null);
    this.photoZoomOpen.set(false);
  }
}
