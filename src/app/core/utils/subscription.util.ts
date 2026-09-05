import { Subscription } from '../models/subscription.model';
import { UserRole } from '../models/profile.model';

/** Nombre de clients autorisés avant de devoir payer l'abonnement. */
export const FREE_CUSTOMER_LIMIT = 10;

/**
 * Prix affiché côté client (lecture seule dans le modal de paiement).
 * Le prix qui fait foi reste les secrets SAASPAY_PLAN_AMOUNT/SAASPAY_PLAN_CURRENCY
 * côté Edge Function create-checkout — garder ces deux valeurs synchronisées.
 */
export const SUBSCRIPTION_PLAN_AMOUNT = 2000;
export const SUBSCRIPTION_PLAN_CURRENCY = 'XOF';

/**
 * `past_due`/`canceled` bloque l'accès quel que soit le nombre de clients
 * (pas de retour au quota gratuit après résiliation/impayé).
 *
 * SaaSPay ne renouvelle rien automatiquement (pas d'abonnement récurrent
 * natif) : un `status==='active'` dont `currentPeriodEndsAt` est dépassé
 * doit donc être traité comme expiré, pas comme actif indéfiniment.
 *
 * ADMIN/EMPLOYEE : accès illimité, jamais soumis au quota gratuit ni à
 * l'abonnement (seul un OWNER doit payer). `role` par défaut à 'OWNER' si
 * le profil n'est pas encore chargé, pour ne jamais accorder d'accès par erreur.
 */
export function hasAppAccess(
  subscription: Subscription | null,
  customerCount: number,
  role: UserRole = 'OWNER'
): boolean {
  if (role === 'ADMIN' || role === 'EMPLOYEE') {
    return true;
  }

  const status = subscription?.status ?? 'free';

  if (status === 'active') {
    return isPeriodStillValid(subscription!.currentPeriodEndsAt);
  }
  if (status === 'past_due' || status === 'canceled') {
    return false;
  }
  return customerCount <= FREE_CUSTOMER_LIMIT;
}

function isPeriodStillValid(currentPeriodEndsAt: string | null): boolean {
  if (!currentPeriodEndsAt) {
    return false;
  }
  return new Date(currentPeriodEndsAt).getTime() > Date.now();
}
