import { Component, computed, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { TextAreaComponent } from '../../shared/components/form/input/text-area.component';
import { SelectComponent, Option } from '../../shared/components/form/select/select.component';
import { PhoneInputComponent } from '../../shared/components/form/group-input/phone-input/phone-input.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { ProfileService } from '../../core/services/profile.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { CustomerService } from '../../core/services/customer.service';
import { TransactionService } from '../../core/services/transaction.service';
import { isAcceptablePhone } from '../../core/utils/phone.util';
import { toTitleCase } from '../../core/utils/text.util';
import { DEFAULT_REMINDER_TEMPLATE, REMINDER_VARIABLES, renderReminder } from '../../core/utils/reminder.util';
import { downloadCsv, toCsv } from '../../core/utils/csv.util';
import { balanceLabel } from '../../core/utils/balance.util';
import { TRANSACTION_TYPE_LABELS, paymentMethodLabel } from '../../core/utils/operation.util';

const CURRENCY_OPTIONS: Option[] = [
  { value: 'GNF', label: 'GNF — Franc guinéen' },
  { value: 'CFA', label: 'CFA — Franc CFA' },
  { value: 'XOF', label: 'XOF — Franc CFA (Afrique de l’Ouest)' },
  { value: 'XAF', label: 'XAF — Franc CFA (Afrique centrale)' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — Dollar américain' }
];

const MIN_PASSWORD_LENGTH = 6;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-parametres',
  imports: [
    PageBreadcrumbComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent,
    TextAreaComponent,
    SelectComponent,
    PhoneInputComponent,
    SkeletonComponent
  ],
  templateUrl: './parametres.component.html'
})
export class ParametresComponent {
  // — Profil et commerce —
  readonly ownerName = signal('');
  readonly businessName = signal('');
  readonly phone = signal('');
  readonly currency = signal('GNF');
  readonly saved = signal(false);
  readonly errorMessage = signal('');

  readonly isLoading = computed(() => this.profileService.profile() === null);
  readonly canSave = computed(() => isAcceptablePhone(this.phone()));

  /** Devise saisie librement avant la liste déroulante : on la garde sélectionnable. */
  readonly currencyOptions = computed<Option[]>(() => {
    const current = this.currency();
    return !current || CURRENCY_OPTIONS.some(o => o.value === current)
      ? CURRENCY_OPTIONS
      : [{ value: current, label: current }, ...CURRENCY_OPTIONS];
  });

  // — Message de rappel —
  readonly reminderTemplate = signal('');
  readonly reminderSaved = signal(false);
  readonly reminderError = signal('');
  readonly reminderVariables = REMINDER_VARIABLES.map(v => `{${v}}`).join(', ');
  readonly defaultReminder = DEFAULT_REMINDER_TEMPLATE;
  readonly reminderPreview = computed(() =>
    renderReminder(this.reminderTemplate(), {
      prenom: 'Mamadou',
      montant: this.profileService.formatAmount(150000),
      commerce: this.businessName().trim() || 'votre commerce'
    })
  );

  // — Mot de passe —
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly passwordSaving = signal(false);
  readonly passwordSaved = signal(false);
  readonly passwordError = signal('');
  readonly passwordHint = computed(() => {
    const password = this.newPassword();
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      return `Au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }
    if (this.confirmPassword() && password !== this.confirmPassword()) {
      return 'Les deux mots de passe ne correspondent pas.';
    }
    return '';
  });
  readonly canChangePassword = computed(
    () =>
      this.newPassword().length >= MIN_PASSWORD_LENGTH &&
      this.newPassword() === this.confirmPassword() &&
      !this.passwordSaving()
  );

  // — Export —
  readonly canExport = computed(() => this.customerService.loaded() && this.transactionService.loaded());

  constructor(
    private readonly profileService: ProfileService,
    private readonly supabaseService: SupabaseService,
    private readonly customerService: CustomerService,
    private readonly transactionService: TransactionService,
    private readonly router: Router
  ) {
    effect(() => {
      const profile = this.profileService.profile();
      if (profile) {
        this.ownerName.set(profile.ownerName);
        this.businessName.set(profile.businessName);
        this.phone.set(profile.phone);
        this.currency.set(profile.currency || 'GNF');
        this.reminderTemplate.set(profile.reminderTemplate ?? '');
      }
    });
  }

  onOwnerNameChange(value: string | number): void {
    this.ownerName.set(String(value));
  }

  onBusinessNameChange(value: string | number): void {
    this.businessName.set(String(value));
  }

  onPhoneChange(value: string | number): void {
    this.phone.set(String(value));
  }

  onCurrencyChange(value: string): void {
    this.currency.set(value);
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.errorMessage.set('');
    this.profileService
      .update({
        ownerName: toTitleCase(this.ownerName()),
        businessName: this.businessName().trim(),
        phone: this.phone().trim(),
        currency: this.currency() || 'GNF'
      })
      .subscribe({
        next: () => {
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 2000);
        },
        error: err => {
          this.errorMessage.set("Erreur lors de l'enregistrement. Réessayez.");
          console.error('Échec de la sauvegarde du profil', err);
        }
      });
  }

  onReminderChange(value: string): void {
    this.reminderTemplate.set(value);
  }

  resetReminder(): void {
    this.reminderTemplate.set('');
  }

  saveReminder(): void {
    this.reminderError.set('');
    const template = this.reminderTemplate().trim();
    this.profileService.update({ reminderTemplate: template || null }).subscribe({
      next: () => {
        this.reminderSaved.set(true);
        setTimeout(() => this.reminderSaved.set(false), 2000);
      },
      error: err => {
        this.reminderError.set("Erreur lors de l'enregistrement. Réessayez.");
        console.error('Échec de la sauvegarde du message de rappel', err);
      }
    });
  }

  onNewPasswordChange(value: string | number): void {
    this.newPassword.set(String(value));
    this.passwordSaved.set(false);
  }

  onConfirmPasswordChange(value: string | number): void {
    this.confirmPassword.set(String(value));
  }

  async changePassword(): Promise<void> {
    if (!this.canChangePassword()) {
      return;
    }
    this.passwordSaving.set(true);
    this.passwordError.set('');
    const { error } = await this.supabaseService.updatePassword(this.newPassword());
    this.passwordSaving.set(false);
    if (error) {
      this.passwordError.set(
        error.message.toLowerCase().includes('different')
          ? "Le nouveau mot de passe doit être différent de l'ancien."
          : 'Le changement a échoué. Réessayez.'
      );
      console.error('Échec du changement de mot de passe', error);
      return;
    }
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.passwordSaved.set(true);
  }

  exportCustomers(): void {
    const rows = this.customerService.customers().map(c => {
      const display = balanceLabel(this.transactionService.balanceForCustomer(c.id));
      return [c.name, c.phone ?? '', display.label, display.amount, c.creditLimit ?? '', c.createdAt?.slice(0, 10) ?? ''];
    });
    const csv = toCsv(['Nom', 'Téléphone', 'Situation', 'Montant', 'Plafond', 'Client depuis'], rows);
    downloadCsv(`clients-${today()}.csv`, csv);
  }

  exportOperations(): void {
    const rows = [...this.transactionService.transactions()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(t => [
        t.createdAt.slice(0, 10),
        this.customerService.getById(t.customerId)?.name ?? 'Client',
        TRANSACTION_TYPE_LABELS[t.type],
        t.label,
        t.amount,
        paymentMethodLabel(t.paymentMethod),
        t.cancelledAt ? 'Oui' : 'Non',
        t.cancelReason ?? ''
      ]);
    const csv = toCsv(
      ['Date', 'Client', 'Type', 'Libellé', 'Montant', 'Mode', 'Annulée', "Motif d'annulation"],
      rows
    );
    downloadCsv(`operations-${today()}.csv`, csv);
  }

  async logout(): Promise<void> {
    await this.supabaseService.signOut();
    this.router.navigate(['/signin']);
  }
}
