import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { DebtPhotoService } from '../../../../core/services/debt-photo.service';

/** Affiche la photo justificative d'une dette (URL temporaire chargée à l'ouverture). */
@Component({
  selector: 'app-photo-viewer-modal',
  imports: [ModalComponent],
  templateUrl: './photo-viewer-modal.component.html'
})
export class PhotoViewerModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() photoPath: string | null = null;
  @Input() title = 'Justificatif';
  @Output() close = new EventEmitter<void>();

  readonly url = signal<string | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor(private readonly debtPhotoService: DebtPhotoService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] || changes['photoPath']) && this.isOpen && this.photoPath) {
      this.load(this.photoPath);
    }
  }

  private load(path: string): void {
    this.url.set(null);
    this.errorMessage.set('');
    this.loading.set(true);
    this.debtPhotoService.getUrl(path).subscribe({
      next: url => {
        this.loading.set(false);
        this.url.set(url);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set("Impossible d'afficher la photo. Réessayez.");
        console.error('Échec du chargement de la photo', err);
      }
    });
  }
}
