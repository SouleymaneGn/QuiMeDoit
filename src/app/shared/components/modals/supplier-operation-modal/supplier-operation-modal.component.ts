import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { SelectComponent, Option } from '../../form/select/select.component';
import { Observable, of, switchMap } from 'rxjs';
import { PhotoAttachmentComponent } from '../../form/photo-attachment/photo-attachment.component';
import { SupplierTransactionService } from '../../../../core/services/supplier-transaction.service';
import { DebtPhotoService } from '../../../../core/services/debt-photo.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { PaymentMethod } from '../../../../core/models/transaction.model';
import { SupplierTransaction, SupplierTransactionType } from '../../../../core/models/supplier-transaction.model';

const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' }
];

const DEFAULT_PAYMENT_LABEL = 'Règlement';

/**
 * Une seule fenêtre pour les 4 cas : achat à crédit / règlement, en création
 * ou en modification (si `operation` est fourni, son type l'emporte sur `type`).
 * Achat : libellé + montant (moins de 10 s, comme Nouvelle dette).
 * Règlement : montant + mode de paiement + libellé.
 */
@Component({
  selector: 'app-supplier-operation-modal',
  imports: [ModalComponent, ButtonComponent, LabelComponent, InputFieldComponent, SelectComponent, PhotoAttachmentComponent],
  templateUrl: './supplier-operation-modal.component.html'
})
export class SupplierOperationModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() type: SupplierTransactionType = 'PURCHASE';
  @Input() supplierId = '';
  @Input() supplierName = '';
  /** Opération à modifier ; absent = création. */
  @Input() operation: SupplierTransaction | null = null;
  @Output() close = new EventEmitter<void>();

  readonly effectiveType = signal<SupplierTransactionType>('PURCHASE');
  readonly isEdit = signal(false);
  readonly label = signal('');
  readonly amount = signal<number | ''>('');
  readonly paymentMethod = signal<PaymentMethod>('CASH');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  /** Photo justificative d'un nouvel achat (case cochée + photo choisie), sinon null. */
  readonly photoFile = signal<File | null>(null);
  readonly photoZoomOpen = signal(false);

  readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;
  readonly currency = computed(() => this.profileService.profile()?.currency ?? 'CFA');

  readonly title = computed(() => {
    const purchase = this.effectiveType() === 'PURCHASE';
    if (this.isEdit()) {
      return purchase ? "Modifier l'achat" : 'Modifier le règlement';
    }
    return purchase ? 'Achat à crédit' : 'Payer le fournisseur';
  });

  readonly canSubmit = computed(() => !!this.label().trim() && Number(this.amount()) > 0);

  /** Justificatif proposé seulement à la création d'un achat à crédit. */
  readonly canAttachPhoto = computed(() => !this.isEdit() && this.effectiveType() === 'PURCHASE');
  readonly willUploadPhoto = computed(() => this.canAttachPhoto() && !!this.photoFile());

  constructor(
    private readonly supplierTransactionService: SupplierTransactionService,
    private readonly debtPhotoService: DebtPhotoService,
    private readonly profileService: ProfileService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen'] || !this.isOpen) {
      return;
    }
    this.errorMessage.set('');
    this.photoFile.set(null);
    this.photoZoomOpen.set(false);
    if (this.operation) {
      this.isEdit.set(true);
      this.effectiveType.set(this.operation.type);
      this.label.set(this.operation.label);
      this.amount.set(this.operation.amount);
      this.paymentMethod.set(this.operation.paymentMethod);
    } else {
      this.isEdit.set(false);
      this.effectiveType.set(this.type);
      this.label.set(this.type === 'PAYMENT' ? DEFAULT_PAYMENT_LABEL : '');
      this.amount.set('');
      this.paymentMethod.set('CASH');
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
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    const fields = {
      label: this.label().trim(),
      amount: Number(this.amount()),
      // Un achat n'a pas de mode de paiement réel : CASH par défaut, comme les dettes clients.
      paymentMethod: this.effectiveType() === 'PAYMENT' ? this.paymentMethod() : ('CASH' as PaymentMethod)
    };
    // Photo d'abord : si l'envoi échoue, l'achat n'est pas créé.
    const photoPath$: Observable<string | null> = this.willUploadPhoto()
      ? this.debtPhotoService.upload(this.photoFile()!)
      : of(null);
    const request$ = this.operation
      ? this.supplierTransactionService.update(this.operation.id, fields)
      : photoPath$.pipe(
          switchMap(photoPath =>
            this.supplierTransactionService.create({
              ...fields,
              supplierId: this.supplierId,
              type: this.effectiveType(),
              ...(photoPath ? { photoPath } : {})
            })
          )
        );

    this.submitting.set(true);
    this.errorMessage.set('');
    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.close.emit();
      },
      error: err => {
        this.submitting.set(false);
        this.errorMessage.set(
          this.willUploadPhoto()
            ? "L'envoi de la photo ou l'enregistrement a échoué. Vérifiez votre connexion et réessayez."
            : "Erreur lors de l'enregistrement. Réessayez."
        );
        console.error("Échec de l'enregistrement de l'opération fournisseur", err);
      }
    });
  }

  onClose(): void {
    // Échap ferme d'abord l'aperçu agrandi de la photo, sans perdre la saisie.
    if (this.photoZoomOpen()) {
      return;
    }
    this.errorMessage.set('');
    this.close.emit();
  }
}
