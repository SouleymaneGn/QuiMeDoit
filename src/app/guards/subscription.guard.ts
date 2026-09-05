import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CustomerService } from '../core/services/customer.service';
import { ProfileService } from '../core/services/profile.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { hasAppAccess } from '../core/utils/subscription.util';

export const subscriptionGuard: CanActivateFn = async () => {
  const subscriptionService = inject(SubscriptionService);
  const customerService = inject(CustomerService);
  const profileService = inject(ProfileService);
  const router = inject(Router);

  try {
    const [subscription, customers, profile] = await Promise.all([
      subscriptionService.ensureLoaded(),
      customerService.ensureLoaded(),
      profileService.ensureLoaded()
    ]);
    if (hasAppAccess(subscription, customers.length, profile.role)) {
      return true;
    }
  } catch (err) {
    console.error("Échec de la vérification de l'abonnement, redirection vers /app/abonnement", err);
  }

  return router.parseUrl('/app/abonnement');
};
