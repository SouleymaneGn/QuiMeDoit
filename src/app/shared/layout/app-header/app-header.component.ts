import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarService } from '../../services/sidebar.service';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs';
import { ThemeToggleButtonComponent } from '../../components/common/theme-toggle/theme-toggle-button.component';
import { NotificationDropdownComponent } from '../../components/header/notification-dropdown/notification-dropdown.component';
import { UserDropdownComponent } from '../../components/header/user-dropdown/user-dropdown.component';
import { ButtonComponent } from '../../components/ui/button/button.component';
import { NewDebtModalComponent } from '../../components/modals/new-debt-modal/new-debt-modal.component';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleButtonComponent,
    NotificationDropdownComponent,
    UserDropdownComponent,
    ButtonComponent,
    NewDebtModalComponent,
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  isApplicationMenuOpen = false;
  readonly isMobileOpen$;
  readonly showNewDebtModal = signal(false);

  readonly isOnAccueil;
  readonly appName = computed(() => this.profileService.profile()?.businessName || 'iziCarnet');

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    public sidebarService: SidebarService,
    private readonly router: Router,
    private readonly profileService: ProfileService
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isOnAccueil = toSignal(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects === '/app')
      ),
      { initialValue: this.router.url === '/app' }
    );
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  };
}
