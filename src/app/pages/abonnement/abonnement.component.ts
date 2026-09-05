import { DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge/badge.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { CustomerService } from '../../core/services/customer.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ProfileService } from '../../core/services/profile.service';
import { FREE_CUSTOMER_LIMIT } from '../../core/utils/subscription.util';
import { environment } from '../../../environment/environment';

type BadgeColor = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-abonnement',
  imports: [DatePipe, PageBreadcrumbComponent, ButtonComponent, BadgeComponent, SkeletonComponent],
  templateUrl: './abonnement.component.html'
})
export class AbonnementComponent {
  readonly freeLimit = FREE_CUSTOMER_LIMIT;

  readonly isLoading = computed(() => !this.subscriptionService.loaded() || !this.profileService.loaded());
  readonly hasUnlimitedAccess = computed(() => {
    const role = this.profileService.profile()?.role;
    return role === 'ADMIN' || role === 'EMPLOYEE';
  });
  readonly subscription = computed(() => this.subscriptionService.subscription());
  readonly status = computed(() => this.subscription()?.status ?? 'free');
  readonly currentPeriodEndsAt = computed(() => this.subscription()?.currentPeriodEndsAt ?? null);

  readonly customerCount = computed(() => this.customerService.customers().length);
  readonly quotaReached = computed(() => this.status() === 'free' && this.customerCount() >= this.freeLimit);

  readonly badgeColor = computed<BadgeColor>(() => {
    switch (this.status()) {
      case 'active':
        return 'success';
      case 'past_due':
        return 'warning';
      case 'canceled':
        return 'error';
      default:
        return this.quotaReached() ? 'warning' : 'info';
    }
  });

  readonly badgeLabel = computed(() => {
    switch (this.status()) {
      case 'active':
        return 'Actif';
      case 'past_due':
        return 'Paiement en attente';
      case 'canceled':
        return 'Résilié';
      default:
        return this.quotaReached() ? 'Quota atteint' : 'Gratuit';
    }
  });

  readonly showPendingBanner: boolean;

  readonly email = signal('');
  readonly customerName = computed(() => {
    const profile = this.profileService.profile();
    return profile?.businessName || profile?.ownerName || '';
  });

  readonly submitting = signal(false);
  readonly checkoutError = signal('');

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly customerService: CustomerService,
    private readonly supabaseService: SupabaseService,
    private readonly profileService: ProfileService,
    private readonly router: Router,
    route: ActivatedRoute
  ) {
    // Bandeau purement informatif : le vrai changement de statut vient uniquement
    // du webhook SaaSPay (Phase 5), jamais de ce paramètre de retour d'URL.
    this.showPendingBanner = !!route.snapshot.queryParamMap.get('status');
    this.loadEmail();
  }

  payer(): void {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.checkoutError.set('');
    this.subscriptionService
      .startCheckout({
        customerEmail: this.email(),
        customerName: this.customerName(),
        returnUrl: environment.saaspayReturnUrl
      })
      .subscribe({
        next: ({ checkoutUrl }) => {
          window.location.href = checkoutUrl;
        },
        error: err => {
          this.submitting.set(false);
          this.checkoutError.set('Erreur lors de la préparation du paiement. Réessayez.');
          console.error('Échec de la création de la session de paiement', err);
        }
      });
  }

  async logout(): Promise<void> {
    await this.supabaseService.signOut();
    this.router.navigate(['/signin']);
  }

  private async loadEmail(): Promise<void> {
    const { data } = await this.supabaseService.getUser();
    this.email.set(data.user?.email ?? '');
  }
}
