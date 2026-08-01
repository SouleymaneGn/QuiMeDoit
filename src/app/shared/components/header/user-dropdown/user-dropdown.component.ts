import { Component, computed, signal } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;
    readonly userName = signal('');
    

  readonly firstName = computed(() => {
    const name = this.userName();
    return name.split(' ')[0] || name;
  });
  constructor(
    private readonly supabaseService: SupabaseService,
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
    this.userName.set(displayName?.trim() || data.user?.email || '');
  }
}