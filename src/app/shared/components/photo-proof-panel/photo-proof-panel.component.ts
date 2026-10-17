import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { DebtPhotoService } from '../../../core/services/debt-photo.service';
import { ProfileService } from '../../../core/services/profile.service';
import { whatsappUrl } from '../../../core/utils/whatsapp.util';

/** Le lien envoyé par WhatsApp reste valable une semaine. */
const SHARE_LINK_TTL = 7 * 24 * 60 * 60;

type ProofAction = 'upload' | 'delete' | 'download' | 'share';

/** Opération affichée dans le panneau, quelle que soit sa source (client ou fournisseur). */
export interface ProofOperation {
  id: string;
  /** « Dette », « Paiement », « Achat », « Règlement ». */
  typeLabel: string;
  createdAt: string;
  amount: number;
  /** true : l'opération augmente le solde (dette, achat), affichée avec « + ». */
  increasesBalance: boolean;
  /** Ligne « Détails » : libellé, mode de paiement… */
  details: string;
  photoPath: string | null;
  cancelled: boolean;
}

/** Panneau « Justificatif » des fiches client et fournisseur : photo de l'opération sélectionnée et actions. */
@Component({
  selector: 'app-photo-proof-panel',
  imports: [DatePipe],
  templateUrl: './photo-proof-panel.component.html'
})
export class PhotoProofPanelComponent implements OnChanges {
  private readonly debtPhotoService = inject(DebtPhotoService);
  private readonly profileService = inject(ProfileService);

  @Input() operation: ProofOperation | null = null;
  /** « client » ou « fournisseur », pour le bouton WhatsApp. */
  @Input() recipientLabel = 'client';
  @Input() recipientPhone: string | null | undefined = null;
  /** Consultation seule (abonnement expiré) : ni ajout, ni remplacement, ni suppression. */
  @Input() readOnly = false;
  /** Message WhatsApp accompagnant la photo (avec le lien quand la photo ne peut pas être jointe). */
  @Input({ required: true }) shareMessage!: (link?: string) => string;
  /** Enregistre le nouveau chemin de photo (null = photo retirée) sur l'opération. */
  @Input({ required: true }) savePhoto!: (operationId: string, photoPath: string | null) => Observable<unknown>;
  @Input() hasPrevious = false;
  @Input() hasNext = false;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() zoom = new EventEmitter<void>();

  readonly url = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly busy = signal<ProofAction | null>(null);
  readonly actionError = signal('');
  readonly confirmingDelete = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['operation'];
    if (!change) return;
    const previous = change.previousValue as ProofOperation | null;
    if (previous?.id !== this.operation?.id) {
      this.actionError.set('');
      this.confirmingDelete.set(false);
    }
    if (previous?.photoPath !== this.operation?.photoPath || previous?.id !== this.operation?.id) {
      this.loadPhoto();
    }
  }

  signedAmount(): string {
    const op = this.operation;
    if (!op) return '';
    return `${op.increasesBalance ? '+' : '−'} ${this.profileService.formatAmount(op.amount)}`;
  }

  private loadPhoto(): void {
    this.url.set(null);
    this.loadError.set('');
    const path = this.operation?.photoPath;
    if (!path) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    // Même lien pour l'affichage et l'envoi WhatsApp : il doit rester ouvrable par le destinataire.
    this.debtPhotoService.getUrl(path, { expiresIn: SHARE_LINK_TTL }).subscribe({
      next: url => {
        if (this.operation?.photoPath !== path) return;
        this.loading.set(false);
        this.url.set(url);
      },
      error: err => {
        this.loading.set(false);
        this.loadError.set("Impossible d'afficher la photo. Réessayez.");
        console.error('Échec du chargement de la photo', err);
      }
    });
  }

  retry(): void {
    this.loadPhoto();
  }

  download(): void {
    const op = this.operation;
    if (!op?.photoPath || this.busy()) return;
    const day = op.createdAt.slice(0, 10);
    const filename = `justificatif-${op.typeLabel.toLowerCase()}-${day}.jpg`;
    this.busy.set('download');
    this.actionError.set('');
    this.debtPhotoService.getUrl(op.photoPath, { download: filename }).subscribe({
      next: url => {
        this.busy.set(null);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
      },
      error: err => {
        this.busy.set(null);
        this.actionError.set('Le téléchargement a échoué. Réessayez.');
        console.error('Échec du téléchargement de la photo', err);
      }
    });
  }

  /**
   * Sur téléphone, la photo elle-même est partagée (WhatsApp proposé par le système) ;
   * sinon on ouvre WhatsApp avec un lien vers la photo.
   */
  async send(): Promise<void> {
    const url = this.url();
    if (!this.operation || !url || this.busy()) return;
    const openWhatsapp = () =>
      window.open(whatsappUrl(this.recipientPhone, this.shareMessage(url)), '_blank', 'noopener');

    if (this.canShareFiles()) {
      this.busy.set('share');
      this.actionError.set('');
      try {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], 'justificatif.jpg', { type: blob.type || 'image/jpeg' });
        await navigator.share({ files: [file], text: this.shareMessage() });
      } catch (err) {
        if ((err as DOMException)?.name !== 'AbortError') {
          openWhatsapp();
        }
      } finally {
        this.busy.set(null);
      }
      return;
    }

    openWhatsapp();
  }

  private canShareFiles(): boolean {
    if (typeof navigator.canShare !== 'function' || !window.matchMedia('(pointer: coarse)').matches) {
      return false;
    }
    try {
      return navigator.canShare({ files: [new File([''], 'test.jpg', { type: 'image/jpeg' })] });
    } catch {
      return false;
    }
  }

  /** Ajout ou remplacement : la nouvelle photo est enregistrée, puis l'ancienne supprimée. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const op = this.operation;
    if (!file || !op || this.busy()) return;
    if (!file.type.startsWith('image/')) {
      this.actionError.set('Choisissez une image (photo du carnet, reçu ou facture).');
      return;
    }
    const oldPath = op.photoPath;
    this.busy.set('upload');
    this.actionError.set('');
    this.confirmingDelete.set(false);
    this.debtPhotoService
      .upload(file)
      .pipe(switchMap(path => this.savePhoto(op.id, path)))
      .subscribe({
        next: () => {
          this.busy.set(null);
          if (oldPath) this.removeFile(oldPath);
        },
        error: err => {
          this.busy.set(null);
          this.actionError.set("L'envoi de la photo a échoué. Vérifiez votre connexion et réessayez.");
          console.error("Échec de l'envoi de la photo", err);
        }
      });
  }

  deletePhoto(): void {
    const op = this.operation;
    if (!op?.photoPath || this.busy()) return;
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    const oldPath = op.photoPath;
    this.busy.set('delete');
    this.actionError.set('');
    this.savePhoto(op.id, null).subscribe({
      next: () => {
        this.busy.set(null);
        this.confirmingDelete.set(false);
        this.removeFile(oldPath);
      },
      error: err => {
        this.busy.set(null);
        this.actionError.set('La suppression a échoué. Réessayez.');
        console.error('Échec de la suppression de la photo', err);
      }
    });
  }

  /** L'opération ne pointe plus vers ce fichier : un échec ici laisse seulement un fichier orphelin. */
  private removeFile(path: string): void {
    this.debtPhotoService.remove(path).subscribe({
      error: err => console.error('Échec de la suppression du fichier photo', err)
    });
  }
}
