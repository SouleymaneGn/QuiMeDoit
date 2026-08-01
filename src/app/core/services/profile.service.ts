import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Profile, ProfileInput } from '../models/profile.model';
import { ProfileRepository } from '../repositories/profile.repository';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileSignal = signal<Profile | null>(null);

  readonly profile = this.profileSignal.asReadonly();

  constructor(private readonly repository: ProfileRepository) {
    this.load();
  }

  load(): void {
    this.repository.get().subscribe(profile => this.profileSignal.set(profile));
  }

  update(patch: ProfileInput): Observable<Profile> {
    return this.repository.update(patch).pipe(
      tap(updated => this.profileSignal.set(updated))
    );
  }
}
