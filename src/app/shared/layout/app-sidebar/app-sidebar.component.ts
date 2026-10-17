import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, ChangeDetectorRef, computed } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { SidebarWidgetComponent } from './app-sidebar-widget.component';
import { combineLatest, Subscription } from 'rxjs';
import { ProfileService } from '../../../core/services/profile.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { AppLogoComponent } from '../../components/common/app-logo/app-logo.component';

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  /** Réservé aux abonnés : pastille « Pro » tant que le compte n'a pas d'abonnement payant. */
  pro?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
  /** Autres routes qui allument cette entrée (ex. les onglets d'une même page). */
  activePaths?: string[];
};

@Component({
  selector: 'app-sidebar',
  imports: [
    CommonModule,
    RouterModule,
    SafeHtmlPipe,
    SidebarWidgetComponent,
    AppLogoComponent
  ],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent {

  // Main nav items
  navItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z" fill="currentColor"></path></svg>`,
       name: "Accueil",
      path: "/app",

      // subItems: [
      //   { name: "Ecommerce", path: "/" },
      // ],
    },
    
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"></path><path d="M9 3.5v17M12 8h3.5M12 11.5h3.5"></path></svg>`,
      // Clients et Fournisseurs regroupés en onglets dans la page Dettes.
      name: "Dettes",
      path: "/app/customers",
      activePaths: ["/app/customers", "/app/suppliers"],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 6.5C3.25 4.98122 4.48122 3.75 6 3.75H18C19.5188 3.75 20.75 4.98122 20.75 6.5V17.5C20.75 19.0188 19.5188 20.25 18 20.25H6C4.48122 20.25 3.25 19.0188 3.25 17.5V6.5ZM6 5.25C5.30964 5.25 4.75 5.80964 4.75 6.5V8H19.25V6.5C19.25 5.80964 18.6904 5.25 18 5.25H6ZM19.25 9.5H4.75V17.5C4.75 18.1904 5.30964 18.75 6 18.75H18C18.6904 18.75 19.25 18.1904 19.25 17.5V9.5ZM6.75 15C6.75 14.5858 7.08579 14.25 7.5 14.25H10.5C10.9142 14.25 11.25 14.5858 11.25 15C11.25 15.4142 10.9142 15.75 10.5 15.75H7.5C7.08579 15.75 6.75 15.4142 6.75 15Z" fill="currentColor"></path></svg>`,
      name: "Paiements",
      path: "/app/payments",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.6559 2.75C9.36399 2.75 9.11433 2.9576 9.06018 3.24327L8.86153 4.28901C8.4649 4.42315 8.08792 4.60039 7.73577 4.81497L6.86682 4.21778C6.62723 4.05221 6.30447 4.08186 6.09902 4.28839L4.29742 6.09384C4.09202 6.30032 4.06296 6.62311 4.22868 6.86249L4.82762 7.72982C4.61426 8.08131 4.43769 8.45744 4.30411 8.85312L3.25701 9.05165C2.97127 9.10578 2.76562 9.35547 2.76562 9.64744V12.2005C2.76562 12.4925 2.97127 12.7422 3.25701 12.7963L4.30411 12.9948C4.43769 13.3905 4.61426 13.7666 4.82762 14.1181L4.22868 14.9855C4.06296 15.2248 4.09202 15.5476 4.29742 15.7541L6.09902 17.5596C6.30447 17.7661 6.62723 17.7957 6.86682 17.6302L7.73577 17.033C8.08792 17.2476 8.4649 17.4248 8.86153 17.559L9.06018 18.6047C9.11433 18.8904 9.36399 19.098 9.6559 19.098H12.2088C12.5008 19.098 12.7504 18.8904 12.8045 18.6047L13.0032 17.559C13.3999 17.4248 13.7768 17.2476 14.129 17.033L14.998 17.6302C15.2375 17.7957 15.5603 17.7661 15.7657 17.5596L17.5673 15.7541C17.7727 15.5476 17.8018 15.2248 17.6361 14.9855L17.0371 14.1181C17.2505 13.7666 17.4271 13.3905 17.5606 12.9948L18.6077 12.7963C18.8935 12.7422 19.0991 12.4925 19.0991 12.2005V9.64744C19.0991 9.35547 18.8935 9.10578 18.6077 9.05165L17.5606 8.85312C17.4271 8.45744 17.2505 8.08131 17.0371 7.72982L17.6361 6.86249C17.8018 6.62311 17.7727 6.30032 17.5673 6.09384L15.7657 4.28839C15.5603 4.08186 15.2375 4.05221 14.998 4.21778L14.129 4.81497C13.7768 4.60039 13.3999 4.42315 13.0032 4.28901L12.8045 3.24327C12.7504 2.9576 12.5008 2.75 12.2088 2.75H9.6559ZM10.9324 8.02344C9.30001 8.02344 7.97742 9.34602 7.97742 10.9784C7.97742 12.6109 9.30001 13.9334 10.9324 13.9334C12.5648 13.9334 13.8874 12.6109 13.8874 10.9784C13.8874 9.34602 12.5648 8.02344 10.9324 8.02344Z" fill="currentColor"></path></svg>`,
      name: "Paramètres",
      path: "/app/parametres",
    },
  ];

  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};
  @ViewChildren('subMenu') subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  readonly appName = computed(() => this.profileService.profile()?.businessName || 'QuiMeDoit');

  private subscription: Subscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private profileService: ProfileService,
    readonly subscriptionService: SubscriptionService
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit() {
    // Subscribe to router events
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    // Subscribe to combined observables to close submenus when all are false
    this.subscription.add(
      combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).subscribe(
        ([isExpanded, isMobileOpen, isHovered]) => {
          if (!isExpanded && !isMobileOpen && !isHovered) {
            // this.openSubmenu = null;
            // this.savedSubMenuHeights = { ...this.subMenuHeights };
            // this.subMenuHeights = {};
            this.cdr.detectChanges();
          } else {
            // Restore saved heights when reopening
            // this.subMenuHeights = { ...this.savedSubMenuHeights };
            // this.cdr.detectChanges();
          }
        }
      )
    );

    // Initial load
    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscription.unsubscribe();
  }

  /** Entrée allumée sur sa route ou sur l'une de ses `activePaths`. */
  isNavActive(nav: NavItem): boolean {
    return (nav.activePaths ?? [nav.path ?? '']).some(path => !!path && this.isActive(path));
  }

  isActive(path: string): boolean {
    return path === '/app' ? this.router.url === '/app' : this.router.url.startsWith(path);
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges(); // Ensure UI updates
        }
      });
    }
  }

  onSidebarMouseEnter() {
    this.isExpanded$.subscribe(expanded => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    }).unsubscribe();
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    const menuGroups = [
      { items: this.navItems, prefix: 'main' },
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (currentUrl === subItem.path) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;

              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges(); // Ensure UI updates
                }
              });
            }
          });
        }
      });
    });
  }

  onSubmenuClick() {
    console.log('click submenu');
    this.isMobileOpen$.subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    }).unsubscribe();
  }  

  
}
