import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { SubscriptionService } from '../../core/services/subscription.service';

/**
 * Page « Dettes » : onglets Clients (ce qu'on me doit) / Fournisseurs (ce que je dois).
 * Chaque onglet garde sa propre adresse (/app/customers, /app/suppliers).
 */
@Component({
  selector: 'app-debts',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PageBreadcrumbComponent],
  templateUrl: './debts.component.html'
})
export class DebtsComponent {
  readonly tabs = [
    { path: '/app/customers', label: 'Clients', pro: false },
    { path: '/app/suppliers', label: 'Fournisseurs', pro: true }
  ];

  constructor(readonly subscriptionService: SubscriptionService) {}
}
