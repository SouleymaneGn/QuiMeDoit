import { Observable } from 'rxjs';

export interface PhotoUrlOptions {
  /** Durée de validité du lien (secondes). */
  expiresIn?: number;
  /** Nom de fichier : le lien déclenche alors un téléchargement. */
  download?: string;
}

/** Stockage des photos justificatives des dettes (carnet, reçu, facture). */
export abstract class DebtPhotoRepository {
  /** Enregistre la photo (déjà compressée) et renvoie son chemin, à garder dans la transaction. */
  abstract upload(photo: Blob): Observable<string>;
  /** URL temporaire pour afficher (ou télécharger) la photo. */
  abstract getUrl(path: string, options?: PhotoUrlOptions): Observable<string>;
  /** Supprime définitivement le fichier. */
  abstract remove(path: string): Observable<void>;
}
