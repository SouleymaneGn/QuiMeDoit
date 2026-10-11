import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { CustomerStatement } from '../../../../core/models/customer-statement.model';
import { formatAmountPlain } from '../../../../core/utils/currency.util';
import { LedgerRow, ledgerRows, summarizeBalance } from '../../../../core/utils/statement.util';

/** Tableau des opérations (ordre chronologique, solde cumulé) et récapitulatif d'un relevé. */
@Component({
  selector: 'app-statement-view',
  imports: [DatePipe, NgClass],
  templateUrl: './statement-view.component.html'
})
export class StatementViewComponent {
  readonly statement = input.required<CustomerStatement>();
  /** Limite la hauteur du tableau (défilement interne), pour l'affichage en modale. */
  readonly scrollable = input(false);

  readonly rows = computed<LedgerRow[]>(() => ledgerRows(this.statement()));
  readonly summary = computed(() => summarizeBalance(this.statement().balance));

  money(value: number): string {
    return `${formatAmountPlain(value)} ${this.statement().currency}`;
  }
}
