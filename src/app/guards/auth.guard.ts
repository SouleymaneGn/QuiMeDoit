import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';
import { CustomerService } from '../core/services/customer.service';
import { TransactionService } from '../core/services/transaction.service';
import { ProfileService } from '../core/services/profile.service';
import { SubscriptionService } from '../core/services/subscription.service';

export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);
  const customerService = inject(CustomerService);
  const transactionService = inject(TransactionService);
  const profileService = inject(ProfileService);
  const subscriptionService = inject(SubscriptionService);

  try {
    const { data } = await supabaseService.getSession();
    if (data.session) {
      // Recharge explicitement les données à chaque entrée dans /app : après une
      // reconnexion sans rechargement de page, l'événement onAuthStateChange des
      // services n'est pas fiable à 100% pour redéclencher le chargement.
      customerService.loadAll();
      transactionService.loadAll();
      profileService.load();
      subscriptionService.load();
      return true;
    }
  } catch (err) {
    console.error('Échec de la vérification de session, redirection vers /signin', err);
  }

  return router.parseUrl('/signin');
};
