import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, input, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';
import { StatementViewComponent } from '../../statement/statement-view/statement-view.component';
import { CustomerStatement } from '../../../../core/models/customer-statement.model';
import { CustomerStatementService } from '../../../../core/services/customer-statement.service';
import { StatementPdfService } from '../../../../core/services/statement-pdf.service';
import { StatementLink, StatementShareService } from '../../../../core/services/statement-share.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { statementMessage, whatsappUrl } from '../../../../core/utils/whatsapp.util';

interface DatePickerChangeEvent {
  selectedDates: Date[];
}

type BusyAction = 'download' | 'open' | 'whatsapp' | 'share' | 'copy' | 'revoke';

/** Aperçu HTML du relevé de compte (filtrable par période), avec PDF et partage au client (WhatsApp, lien). */
@Component({
  selector: 'app-statement-preview-modal',
  imports: [DatePipe, ModalComponent, ButtonComponent, DatePickerComponent, StatementViewComponent],
  templateUrl: './statement-preview-modal.component.html'
})
export class StatementPreviewModalComponent implements OnChanges {
  private readonly statementService = inject(CustomerStatementService);
  private readonly statementPdfService = inject(StatementPdfService);
  private readonly shareService = inject(StatementShareService);
  private readonly profileService = inject(ProfileService);

  @Input() isOpen = false;
  readonly customerId = input.required<string>();

  @Output() close = new EventEmitter<void>();

  /** Période choisie (null = tout l'historique). */
  readonly periodFrom = signal<Date | null>(null);
  readonly periodTo = signal<Date | null>(null);
  /** Incrémenté pour recréer le sélecteur de dates (flatpickr) lors d'une réinitialisation. */
  readonly pickerKey = signal(0);

  readonly statement = computed<CustomerStatement | null>(() =>
    this.statementService.build(this.customerId(), { from: this.periodFrom(), to: this.periodTo() })
  );

  /** Lien public actif du client (toujours tout l'historique, solde à jour). */
  readonly link = signal<StatementLink | null>(null);
  readonly copied = signal(false);

  readonly busy = signal<BusyAction | null>(null);
  readonly error = signal('');
  readonly info = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadLink();
    }
  }

  onPeriodChange(event: DatePickerChangeEvent): void {
    if (event.selectedDates.length < 2) {
      return;
    }
    const [from, to] = event.selectedDates;
    this.periodFrom.set(from);
    this.periodTo.set(to);
  }

  resetPeriod(): void {
    this.periodFrom.set(null);
    this.periodTo.set(null);
    this.pickerKey.update(k => k + 1);
  }

  download(): void {
    this.run('download', s => this.statementPdfService.download(s));
  }

  open(): void {
    this.run('open', s => this.statementPdfService.open(s));
  }

  /** Ouvre WhatsApp vers le numéro du client avec le message et le lien du relevé. */
  sendWhatsApp(): void {
    if (!this.canRun()) {
      return;
    }
    // L'onglet est ouvert avant l'attente : après un `await`, le navigateur le bloquerait comme pop-up.
    const tab = this.link() ? null : window.open('', '_blank');
    this.run('whatsapp', async () => {
      try {
        const link = await this.ensureLink();
        const url = whatsappUrl(this.fullStatement()?.customerPhone, this.message(link.url));
        if (tab && !tab.closed) {
          tab.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      } catch (err) {
        tab?.close();
        throw err;
      }
    });
  }

  /** Partage le PDF de la période affichée (feuille de partage native) ; repli : téléchargement + WhatsApp. */
  sharePdf(): void {
    if (!this.canRun()) {
      return;
    }
    const native = this.statementPdfService.canShareFiles();
    const tab = native ? null : window.open('', '_blank');
    this.run('share', async s => {
      try {
        const text = this.message(this.link()?.url, s);
        const result = native ? await this.statementPdfService.share(s, text) : 'unsupported';
        if (result !== 'unsupported') {
          return;
        }
        await this.statementPdfService.download(s);
        const url = whatsappUrl(s.customerPhone, text);
        if (tab && !tab.closed) {
          tab.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        this.info.set('PDF téléchargé : joignez-le à la conversation WhatsApp.');
      } catch (err) {
        tab?.close();
        throw err;
      }
    });
  }

  copyLink(): void {
    this.run('copy', async () => {
      const link = await this.ensureLink();
      try {
        await navigator.clipboard.writeText(link.url);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      } catch {
        // Presse-papiers refusé : le lien reste affiché, sélectionnable à la main.
        this.info.set('Copie impossible : sélectionnez le lien ci-dessous.');
      }
    });
  }

  revokeLink(): void {
    this.run('revoke', async () => {
      await this.shareService.revoke(this.customerId());
      this.link.set(null);
      this.info.set('Lien désactivé : il n’affiche plus le relevé.');
    });
  }

  onClose(): void {
    this.error.set('');
    this.info.set('');
    this.copied.set(false);
    this.resetPeriod();
    this.close.emit();
  }

  /** Relevé complet (sans période) : c'est ce que montre le lien, donc ce que doit annoncer le message. */
  private fullStatement(): CustomerStatement | null {
    return this.statementService.build(this.customerId());
  }

  private message(linkUrl?: string, statement: CustomerStatement | null = this.fullStatement()): string {
    if (!statement) {
      return '';
    }
    return statementMessage(statement, this.profileService.profile()?.businessName ?? '', linkUrl);
  }

  private async ensureLink(): Promise<StatementLink> {
    const current = this.link();
    if (current) {
      return current;
    }
    const link = await this.shareService.getOrCreateLink(this.customerId());
    this.link.set(link);
    return link;
  }

  private loadLink(): void {
    this.link.set(null);
    this.shareService
      .getActiveLink(this.customerId())
      .then(link => this.link.set(link))
      .catch(err => console.error('Échec du chargement du lien de partage', err));
  }

  private canRun(): boolean {
    return this.statement() !== null && this.busy() === null;
  }

  private async run(action: BusyAction, task: (s: CustomerStatement) => Promise<void>): Promise<void> {
    const statement = this.statement();
    if (!statement || !this.canRun()) {
      return;
    }
    this.busy.set(action);
    this.error.set('');
    this.info.set('');
    try {
      await task(statement);
    } catch (err) {
      console.error(`Échec de l'action « ${action} » sur le relevé`, err);
      this.error.set(ERROR_MESSAGES[action]);
    } finally {
      this.busy.set(null);
    }
  }
}

const ERROR_MESSAGES: Record<BusyAction, string> = {
  download: 'Impossible de générer le PDF. Réessayez.',
  open: 'Impossible de générer le PDF. Réessayez.',
  share: 'Impossible de partager le PDF. Réessayez.',
  whatsapp: 'Impossible de créer le lien de partage. Vérifiez votre connexion et réessayez.',
  copy: 'Impossible de créer le lien de partage. Vérifiez votre connexion et réessayez.',
  revoke: 'Impossible de désactiver le lien. Réessayez.'
};
