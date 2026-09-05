export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled';

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  /** Calculé par l'app (now + 30 jours) au moment du webhook `transaction.success` — SaaSPay ne fournit pas de renouvellement automatique. */
  currentPeriodEndsAt: string | null;
  /** Id de la dernière session de checkout SaaSPay créée (`POST /checkout-sessions/`), sert à relier un webhook à cet utilisateur. */
  saaspayCheckoutSessionId: string | null;
}

export interface CheckoutSession {
  checkoutUrl: string;
}
