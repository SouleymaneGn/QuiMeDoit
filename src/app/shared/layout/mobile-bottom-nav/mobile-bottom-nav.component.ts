import { NgClass } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { NewDebtModalComponent } from '../../components/modals/new-debt-modal/new-debt-modal.component';
import { NewPaymentModalComponent } from '../../components/modals/new-payment-modal/new-payment-modal.component';
import { SubscriptionService } from '../../../core/services/subscription.service';

type Sheet = 'actions' | 'more' | null;

/**
 * Navigation mobile (sous le breakpoint xl, là où la barre latérale disparaît) :
 * Accueil · Clients · [ + ] · Paiements · Plus.
 * Le « + » ouvre les actions rapides ; « Plus » les pages secondaires.
 */
@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [NgClass, RouterLink, RouterLinkActive, NewDebtModalComponent, NewPaymentModalComponent],
  templateUrl: './mobile-bottom-nav.component.html'
})
export class MobileBottomNavComponent {
  readonly sheet = signal<Sheet>(null);
  readonly showNewDebtModal = signal(false);
  readonly showNewPaymentModal = signal(false);

  constructor(
    readonly subscriptionService: SubscriptionService,
    router: Router
  ) {
    // Une navigation ferme le panneau ouvert.
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.sheet.set(null));
  }

  @HostListener('document:keydown.escape')
  closeSheet(): void {
    this.sheet.set(null);
  }

  toggle(sheet: Exclude<Sheet, null>): void {
    this.sheet.update(current => (current === sheet ? null : sheet));
  }

  newDebt(): void {
    this.sheet.set(null);
    this.showNewDebtModal.set(true);
  }

  newPayment(): void {
    this.sheet.set(null);
    this.showNewPaymentModal.set(true);
  }
}
