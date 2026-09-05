import { Injectable, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { Profile, ProfileInput } from '../models/profile.model';
import { ProfileRepository } from '../repositories/profile.repository';
import { formatCurrency } from '../utils/currency.util';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileSignal = signal<Profile | null>(null);
  private readonly loadedSignal = signal(false);

  readonly profile = this.profileSignal.asReadonly();
  readonly loaded = this.loadedSignal.asReadonly();

  constructor(
    private readonly repository: ProfileRepository,
    private readonly supabaseService: SupabaseService
  ) {
    // Recharge (ou vide) le profil à chaque changement de session : connexion,
    // déconnexion, ou changement de compte sans rechargement complet de la page.
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.load();
      } else {
        this.profileSignal.set(null);
        this.loadedSignal.set(false);
      }
    });
  }

  load(): void {
    this.repository.get().subscribe({
      next: profile => {
        this.profileSignal.set(profile);
        this.loadedSignal.set(true);
      },
      error: err => console.error('Échec du chargement du profil', err)
    });
  }

  /** Comme load(), mais attend la résolution — utilisé par subscriptionGuard pour connaître le rôle avant de statuer. */
  async ensureLoaded(): Promise<Profile> {
    if (this.loadedSignal()) {
      return this.profileSignal() as Profile;
    }
    const profile = await firstValueFrom(this.repository.get());
    this.profileSignal.set(profile);
    this.loadedSignal.set(true);
    return profile;
  }

  update(patch: ProfileInput): Observable<Profile> {
    return this.repository.update(patch).pipe(
      tap(updated => this.profileSignal.set(updated))
    );
  }

  /** Formate un montant avec la devise actuellement configurée dans le profil. */
  formatAmount(amount: number): string {
    return formatCurrency(amount, this.profileSignal()?.currency ?? 'CFA');
  }
}
