import { Injectable, computed, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { CheckoutSession, Subscription } from '../models/subscription.model';
import { CheckoutSessionInput, SubscriptionRepository } from '../repositories/subscription.repository';
import { hasAppAccess } from '../utils/subscription.util';
import { CustomerService } from './customer.service';
import { ProfileService } from './profile.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly subscriptionSignal = signal<Subscription | null>(null);
  private readonly loadedSignal = signal(false);

  readonly subscription = this.subscriptionSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  /** Vrai si ADMIN/EMPLOYEE (illimité), ou si l'abonnement OWNER est payé/actif, ou sous le quota gratuit. */
  readonly hasAccess = computed(() =>
    hasAppAccess(
      this.subscriptionSignal(),
      this.customerService.customers().length,
      this.profileService.profile()?.role
    )
  );

  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly supabaseService: SupabaseService,
    private readonly customerService: CustomerService,
    private readonly profileService: ProfileService
  ) {
    // Recharge (ou vide) l'abonnement à chaque changement de session : connexion,
    // déconnexion, ou changement de compte sans rechargement complet de la page.
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.load();
      } else {
        this.subscriptionSignal.set(null);
        this.loadedSignal.set(false);
      }
    });
  }

  load(): void {
    this.repository.get().subscribe({
      next: subscription => {
        this.subscriptionSignal.set(subscription);
        this.loadedSignal.set(true);
      },
      error: err => console.error("Échec du chargement de l'abonnement", err)
    });
  }

  /** Comme load(), mais attend la résolution — utilisé par subscriptionGuard pour éviter une décision prise avant la fin du chargement. */
  async ensureLoaded(): Promise<Subscription> {
    if (this.loadedSignal()) {
      return this.subscriptionSignal() as Subscription;
    }
    const subscription = await firstValueFrom(this.repository.get());
    this.subscriptionSignal.set(subscription);
    this.loadedSignal.set(true);
    return subscription;
  }

  startCheckout(input: CheckoutSessionInput): Observable<CheckoutSession> {
    return this.repository.createCheckoutSession(input);
  }
}
