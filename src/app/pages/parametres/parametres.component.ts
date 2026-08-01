import { Component, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../shared/components/form/input/input-field.component';
import { ProfileService } from '../../core/services/profile.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-parametres',
  imports: [PageBreadcrumbComponent, ButtonComponent, LabelComponent, InputFieldComponent],
  templateUrl: './parametres.component.html'
})
export class ParametresComponent {
  readonly businessName = signal('');
  readonly phone = signal('');
  readonly currency = signal('GNF');
  readonly saved = signal(false);

  constructor(
    private readonly profileService: ProfileService,
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {
    effect(() => {
      const profile = this.profileService.profile();
      if (profile) {
        this.businessName.set(profile.businessName);
        this.phone.set(profile.phone);
        this.currency.set(profile.currency);
      }
    });
  }

  onBusinessNameChange(value: string | number): void {
    this.businessName.set(String(value));
  }

  onPhoneChange(value: string | number): void {
    this.phone.set(String(value));
  }

  onCurrencyChange(value: string | number): void {
    this.currency.set(String(value));
  }

  save(): void {
    this.profileService
      .update({
        businessName: this.businessName().trim(),
        phone: this.phone().trim(),
        currency: this.currency().trim() || 'GNF'
      })
      .subscribe(() => {
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      });
  }

  async logout(): Promise<void> {
    await this.supabaseService.signOut();
    this.router.navigate(['/signin']);
  }
}
