import { Component, computed, signal } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ProfileService } from '../../../../core/services/profile.service';

/** Profil connecté : avatar à initiales + prénom ; le menu détaille nom, email et commerce. */
@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports: [CommonModule, RouterModule, DropdownComponent]
})
export class UserDropdownComponent {
  isOpen = false;

  private readonly displayName = signal('');
  readonly email = signal('');

  /** Nom du profil, sinon nom saisi à l'inscription, sinon début de l'email. */
  readonly fullName = computed(
    () =>
      this.profileService.profile()?.ownerName?.trim() ||
      this.displayName() ||
      this.email().split('@')[0] ||
      ''
  );
  readonly firstName = computed(() => this.fullName().split(' ')[0]);
  readonly initials = computed(() => {
    const parts = this.fullName().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  });
  readonly businessName = computed(() => this.profileService.profile()?.businessName?.trim() ?? '');

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly profileService: ProfileService,
    private readonly router: Router
  ) {
    this.loadUser();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  async signOut(): Promise<void> {
    this.closeDropdown();
    await this.supabaseService.signOut();
    this.router.navigate(['/signin']);
  }

  private async loadUser(): Promise<void> {
    const { data } = await this.supabaseService.getUser();
    const displayName = data.user?.user_metadata?.['displayName'] as string | undefined;
    this.displayName.set(displayName?.trim() ?? '');
    this.email.set(data.user?.email ?? '');
  }
}
