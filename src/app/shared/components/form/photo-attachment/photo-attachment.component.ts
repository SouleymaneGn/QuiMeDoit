import { Component, EventEmitter, Input, OnDestroy, Output, computed, signal } from '@angular/core';
import { CheckboxComponent } from '../input/checkbox.component';
import { ModalComponent } from '../../ui/modal/modal.component';

/**
 * Case « Joindre une photo comme justificatif » + Prendre une photo / Importer,
 * vignette (Agrandir, Changer, Retirer). Émet la photo à envoyer, ou null
 * (case décochée ou photo retirée). L'envoi reste à la charge du parent.
 */
@Component({
  selector: 'app-photo-attachment',
  imports: [CheckboxComponent, ModalComponent],
  templateUrl: './photo-attachment.component.html'
})
export class PhotoAttachmentComponent implements OnDestroy {
  @Input() id = 'photo-attachment';
  @Input() hint = 'Le carnet, un reçu ou une facture.';
  /** Photo retenue (null si case décochée ou aucune photo). */
  @Output() photoChange = new EventEmitter<File | null>();
  /** Aperçu agrandi ouvert : le parent ignore alors Échap pour ne pas perdre la saisie. */
  @Output() zoomOpenChange = new EventEmitter<boolean>();

  readonly attach = signal(false);
  readonly file = signal<File | null>(null);
  readonly preview = signal<string | null>(null);
  readonly zoomOpen = signal(false);
  readonly error = signal('');

  private readonly selected = computed(() => (this.attach() ? this.file() : null));

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onAttachChange(checked: boolean): void {
    this.attach.set(checked);
    this.emit();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permet de reprendre la même photo
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Choisissez une image (photo, PNG ou JPG).');
      return;
    }
    this.revokePreview();
    this.error.set('');
    this.file.set(file);
    this.preview.set(URL.createObjectURL(file));
    this.emit();
  }

  remove(): void {
    this.revokePreview();
    this.file.set(null);
    this.emit();
  }

  setZoom(open: boolean): void {
    this.zoomOpen.set(open);
    this.zoomOpenChange.emit(open);
  }

  private emit(): void {
    this.photoChange.emit(this.selected());
  }

  private revokePreview(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
    this.preview.set(null);
  }
}
