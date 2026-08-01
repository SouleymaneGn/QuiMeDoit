import { Observable } from 'rxjs';
import { Profile, ProfileInput } from '../models/profile.model';

export abstract class ProfileRepository {
  abstract get(): Observable<Profile>;
  abstract update(patch: ProfileInput): Observable<Profile>;
}
