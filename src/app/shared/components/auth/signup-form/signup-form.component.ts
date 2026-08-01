import { Component, computed, signal } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';

function mapSignUpError(message: string): string {
  if (/already registered|already exists/i.test(message)) {
    return 'Cet email est déjà utilisé.';
  }
  if (/password/i.test(message)) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  return 'Une erreur est survenue. Réessayez.';
}

@Component({
  selector: 'app-signup-form',
  imports: [LabelComponent, CheckboxComponent, ButtonComponent, InputFieldComponent, RouterModule],
  templateUrl: './signup-form.component.html',
  styles: ``
})
export class SignupFormComponent {
  readonly showPassword = signal(false);
  readonly isChecked = signal(false);

  readonly fname = signal('');
  readonly lname = signal('');
  readonly email = signal('');
  readonly password = signal('');

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly canSubmit = computed(
    () =>
      !!this.fname().trim() &&
      !!this.lname().trim() &&
      !!this.email().trim() &&
      !!this.password() &&
      this.isChecked()
  );

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onFnameChange(value: string | number): void {
    this.fname.set(String(value));
  }

  onLnameChange(value: string | number): void {
    this.lname.set(String(value));
  }

  onEmailChange(value: string | number): void {
    this.email.set(String(value));
  }

  onPasswordChange(value: string | number): void {
    this.password.set(String(value));
  }

  async onSignUp(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { data, error } = await this.supabaseService.signUpWithEmail({
      name: `${this.fname().trim()} ${this.lname().trim()}`.trim(),
      email: this.email().trim(),
      password: this.password()
    });

    this.submitting.set(false);

    if (error) {
      this.errorMessage.set(mapSignUpError(error.message));
      return;
    }

    if (data.session) {
      this.router.navigate(['/']);
      return;
    }

    this.successMessage.set('Compte créé. Vérifiez votre email pour confirmer votre inscription.');
  }
}
