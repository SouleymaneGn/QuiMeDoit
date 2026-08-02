import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Profile, ProfileInput } from '../models/profile.model';
import { ProfileRepository } from '../repositories/profile.repository';
import { formatCurrency } from '../utils/currency.util';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileSignal = signal<Profile | null>(null);

  readonly profile = this.profileSignal.asReadonly();

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
      }
    });
  }

  load(): void {
    this.repository.get().subscribe({
      next: profile => this.profileSignal.set(profile),
      error: err => console.error('Échec du chargement du profil', err)
    });
  }

  update(patch: ProfileInput): Observable<Profile> {
    return this.repository.update(patch).pipe(
      tap(updated => this.profileSignal.set(updated))
    );
  }

  /** Formate un montant avec la devise actuellement configurée dans le profil. */
  formatAmount(amount: number): string {
    return formatCurrency(amount, this.profileSignal()?.currency ?? 'GNF');
  }
}
