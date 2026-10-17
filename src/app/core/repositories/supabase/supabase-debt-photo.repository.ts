import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { DebtPhotoRepository, PhotoUrlOptions } from '../debt-photo.repository';
import { SupabaseService } from '../../services/supabase.service';

/** Bucket privé : chaque commerçant n'accède qu'au dossier `{son id}/` (politiques RLS). */
const BUCKET = 'debt-photos';
/** Durée de validité de l'URL d'affichage (secondes). */
const SIGNED_URL_TTL = 60 * 60;

@Injectable({ providedIn: 'root' })
export class SupabaseDebtPhotoRepository extends DebtPhotoRepository {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  upload(photo: Blob): Observable<string> {
    return from(
      this.supabaseService.getUser().then(async ({ data: userData }) => {
        const path = `${userData.user!.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await this.supabaseService.client.storage
          .from(BUCKET)
          .upload(path, photo, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        return path;
      })
    );
  }

  getUrl(path: string, options?: PhotoUrlOptions): Observable<string> {
    return from(
      this.supabaseService.client.storage
        .from(BUCKET)
        .createSignedUrl(
          path,
          options?.expiresIn ?? SIGNED_URL_TTL,
          options?.download ? { download: options.download } : undefined
        )
        .then(({ data, error }) => {
          if (error) throw error;
          return data.signedUrl;
        })
    );
  }

  remove(path: string): Observable<void> {
    return from(
      this.supabaseService.client.storage
        .from(BUCKET)
        .remove([path])
        .then(({ error }) => {
          if (error) throw error;
        })
    );
  }
}
