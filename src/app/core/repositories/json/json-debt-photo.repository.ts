import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { DebtPhotoRepository } from '../debt-photo.repository';

/** Version maquette : les photos restent en mémoire le temps de la session. */
@Injectable({ providedIn: 'root' })
export class JsonDebtPhotoRepository extends DebtPhotoRepository {
  private readonly urls = new Map<string, string>();

  upload(photo: Blob): Observable<string> {
    const path = `mock/${crypto.randomUUID()}.jpg`;
    this.urls.set(path, URL.createObjectURL(photo));
    return of(path);
  }

  getUrl(path: string): Observable<string> {
    const url = this.urls.get(path);
    return url ? of(url) : throwError(() => new Error(`Photo ${path} introuvable`));
  }

  remove(path: string): Observable<void> {
    const url = this.urls.get(path);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(path);
    }
    return of(undefined);
  }
}
