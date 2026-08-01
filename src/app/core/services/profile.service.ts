import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Profile, ProfileInput } from '../models/profile.model';
import { ProfileRepository } from '../repositories/profile.repository';
import { formatCurrency } from '../utils/currency.util';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileSignal = signal<Profile | null>(null);

  readonly profile = this.profileSignal.asReadonly();

  constructor(private readonly repository: ProfileRepository) {
    this.load();
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
