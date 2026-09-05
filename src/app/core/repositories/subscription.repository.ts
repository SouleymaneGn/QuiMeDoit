import { Observable } from 'rxjs';
import { CheckoutSession, Subscription } from '../models/subscription.model';

export interface CheckoutSessionInput {
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}

export abstract class SubscriptionRepository {
  abstract get(): Observable<Subscription>;
  abstract createCheckoutSession(input: CheckoutSessionInput): Observable<CheckoutSession>;
}
