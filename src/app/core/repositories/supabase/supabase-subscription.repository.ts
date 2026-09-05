import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { CheckoutSession, Subscription, SubscriptionStatus } from '../../models/subscription.model';
import { CheckoutSessionInput, SubscriptionRepository } from '../subscription.repository';
import { SupabaseService } from '../../services/supabase.service';

interface SubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  current_period_ends_at: string | null;
  saaspay_checkout_session_id: string | null;
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    status: row.status,
    currentPeriodEndsAt: row.current_period_ends_at,
    saaspayCheckoutSessionId: row.saaspay_checkout_session_id
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseSubscriptionRepository extends SubscriptionRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  get(): Observable<Subscription> {
    return from(
      this.supabaseService.getUser().then(async ({ data: userData }) => {
        const userId = userData.user!.id;
        const { data, error } = await this.supabaseService.client
          .from('subscriptions')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          return toSubscription(data as SubscriptionRow);
        }

        // Compte créé avant la mise en place du trigger d'auto-provisioning : on crée la ligne manquante.
        const { data: created, error: insertError } = await this.supabaseService.client
          .from('subscriptions')
          .insert({ id: userId, status: 'free' })
          .select()
          .single();
        if (insertError) throw insertError;
        return toSubscription(created as SubscriptionRow);
      })
    );
  }

  createCheckoutSession(input: CheckoutSessionInput): Observable<CheckoutSession> {
    return from(
      this.supabaseService.client.functions
        .invoke<CheckoutSession>('create-checkout', {
          body: { customerEmail: input.customerEmail, customerName: input.customerName, returnUrl: input.returnUrl }
        })
        .then(({ data, error }) => {
          if (error) throw error;
          return data as CheckoutSession;
        })
    );
  }
}
