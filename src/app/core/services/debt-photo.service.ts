import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { DebtPhotoRepository, PhotoUrlOptions } from '../repositories/debt-photo.repository';
import { compressPhoto } from '../utils/image.util';

@Injectable({ providedIn: 'root' })
export class DebtPhotoService {
  constructor(private readonly repository: DebtPhotoRepository) {}

  /** Compresse la photo puis l'enregistre ; renvoie le chemin à stocker dans la dette. */
  upload(file: File): Observable<string> {
    return from(compressPhoto(file)).pipe(switchMap(blob => this.repository.upload(blob)));
  }

  getUrl(path: string, options?: PhotoUrlOptions): Observable<string> {
    return this.repository.getUrl(path, options);
  }

  remove(path: string): Observable<void> {
    return this.repository.remove(path);
  }
}
