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
import { SupplierService } from '../../../core/services/supplier.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SupplierOperationModalComponent } from '../../components/modals/supplier-operation-modal/supplier-operation-modal.component';
import { AppLogoComponent } from '../../components/common/app-logo/app-logo.component';

type HeaderAction = 'debt' | 'purchase' | 'none';

const SUPPLIER_DETAIL_URL = /^\/app\/suppliers\/([^/]+)$/;

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
    SupplierOperationModalComponent,
    AppLogoComponent,
  ],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  readonly isMobileOpen$;
  readonly showNewDebtModal = signal(false);
  readonly showPurchaseModal = signal(false);

  readonly isOnAccueil;
  /** Bouton contextuel : dette client partout, achat à crédit sur une fiche fournisseur. */
  readonly headerAction;
  readonly currentSupplier;
  readonly appName = computed(() => this.profileService.profile()?.businessName || 'QuiMeDoit');

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    public sidebarService: SidebarService,
    private readonly router: Router,
    private readonly profileService: ProfileService,
    private readonly supplierService: SupplierService,
    private readonly subscriptionService: SubscriptionService
  ) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    const url = toSignal(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(event => event.urlAfterRedirects.split('?')[0])
      ),
      { initialValue: this.router.url.split('?')[0] }
    );
    this.isOnAccueil = computed(() => url() === '/app');
    this.currentSupplier = computed(() => {
      const match = url().match(SUPPLIER_DETAIL_URL);
      return match ? (this.supplierService.getById(match[1]) ?? null) : null;
    });
    this.headerAction = computed<HeaderAction>(() => {
      const current = url();
      // Accueil : les deux gros boutons de la page suffisent.
      // Liste fournisseurs : « + Nouvelle dette » (client) y serait ambigu.
      if (current === '/app' || current === '/app/suppliers') return 'none';
      if (SUPPLIER_DETAIL_URL.test(current)) {
        return this.subscriptionService.hasPaidAccess() && this.currentSupplier() ? 'purchase' : 'none';
      }
      return 'debt';
    });
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
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
