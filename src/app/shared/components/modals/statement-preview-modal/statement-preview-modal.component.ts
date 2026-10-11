import { DatePipe, NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, input, signal } from '@angular/core';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { DatePickerComponent } from '../../form/date-picker/date-picker.component';
import { CustomerStatement } from '../../../../core/models/customer-statement.model';
import { CustomerStatementService } from '../../../../core/services/customer-statement.service';
import { StatementPdfService } from '../../../../core/services/statement-pdf.service';
import { formatAmountPlain } from '../../../../core/utils/currency.util';
import { BalanceSummary, summarizeBalance } from '../../../../core/utils/statement.util';

interface DatePickerChangeEvent {
  selectedDates: Date[];
}

/** Aperçu HTML de la situation de facture (filtrable par période), avec téléchargement / ouverture du PDF. */
@Component({
  selector: 'app-statement-preview-modal',
  imports: [DatePipe, NgClass, ModalComponent, ButtonComponent, DatePickerComponent],
  templateUrl: './statement-preview-modal.component.html'
})
export class StatementPreviewModalComponent {
  private readonly statementService = inject(CustomerStatementService);
  private readonly statementPdfService = inject(StatementPdfService);

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

  readonly busy = signal<'download' | 'open' | null>(null);
  readonly error = signal('');

  amount(value: number): string {
    return formatAmountPlain(value);
  }

  balanceSummary(balance: number): BalanceSummary {
    return summarizeBalance(balance);
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

  onClose(): void {
    this.error.set('');
    this.resetPeriod();
    this.close.emit();
  }

  private async run(action: 'download' | 'open', task: (s: CustomerStatement) => Promise<void>): Promise<void> {
    const statement = this.statement();
    if (!statement || this.busy()) {
      return;
    }
    this.busy.set(action);
    this.error.set('');
    try {
      await task(statement);
    } catch (err) {
      console.error('Échec de la génération de la situation PDF', err);
      this.error.set('Impossible de générer le PDF. Réessayez.');
    } finally {
      this.busy.set(null);
    }
  }
}
