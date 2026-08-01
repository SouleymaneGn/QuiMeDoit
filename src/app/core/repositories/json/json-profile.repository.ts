import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, filter, map, take, tap } from 'rxjs';
import { Profile, ProfileInput } from '../../models/profile.model';
import { ProfileRepository } from '../profile.repository';

@Injectable({ providedIn: 'root' })
export class JsonProfileRepository extends ProfileRepository {
  private readonly profile$ = new BehaviorSubject<Profile | null>(null);
  private loaded = false;

  constructor(private readonly http: HttpClient) {
    super();
  }

  private ensureLoaded(): Observable<Profile> {
    if (!this.loaded) {
      this.loaded = true;
      this.http
        .get<Profile>('assets/mock/profile.json')
        .subscribe(data => this.profile$.next(data));
    }
    return this.profile$.pipe(
      filter((profile): profile is Profile => profile !== null),
      take(1)
    );
  }

  get(): Observable<Profile> {
    return this.ensureLoaded();
  }

  update(patch: ProfileInput): Observable<Profile> {
    return this.ensureLoaded().pipe(
      map(current => ({ ...current, ...patch })),
      tap(updated => this.profile$.next(updated))
    );
  }
}
