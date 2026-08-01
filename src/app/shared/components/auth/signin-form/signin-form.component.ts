import { Component, computed, signal } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';

function mapSignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return 'Email ou mot de passe incorrect.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Veuillez confirmer votre email avant de vous connecter.';
  }
  return 'Une erreur est survenue. Réessayez.';
}

@Component({
  selector: 'app-signin-form',
  imports: [LabelComponent, CheckboxComponent, ButtonComponent, InputFieldComponent, RouterModule],
  templateUrl: './signin-form.component.html',
  styles: ``
})
export class SigninFormComponent {
  readonly showPassword = signal(false);
  readonly isChecked = signal(false);

  readonly email = signal('');
  readonly password = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly canSubmit = computed(() => !!this.email().trim() && !!this.password());

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onEmailChange(value: string | number): void {
    this.email.set(String(value));
  }

  onPasswordChange(value: string | number): void {
    this.password.set(String(value));
  }

  async onSignIn(): Promise<void> {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');

    const { error } = await this.supabaseService.signInWithEmail({
      email: this.email().trim(),
      password: this.password()
    });

    this.submitting.set(false);

    if (error) {
      this.errorMessage.set(mapSignInError(error.message));
      return;
    }

    this.router.navigate(['/']);
  }
}
