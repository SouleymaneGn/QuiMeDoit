import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { AppLogoComponent } from '../../shared/components/common/app-logo/app-logo.component';
import { StatementViewComponent } from '../../shared/components/statement/statement-view/statement-view.component';
import { PublicStatement, StatementShareService } from '../../core/services/statement-share.service';
import { StatementPdfService } from '../../core/services/statement-pdf.service';
import { formatAmountPlain } from '../../core/utils/currency.util';
import { BalanceSummary, summarizeBalance } from '../../core/utils/statement.util';

type PageState = 'loading' | 'ready' | 'invalid' | 'error';

/** Relevé consulté par le client via le lien partagé par le commerçant (sans compte, lecture seule). */
@Component({
  selector: 'app-shared-statement',
  imports: [DatePipe, RouterModule, ButtonComponent, AppLogoComponent, StatementViewComponent],
  templateUrl: './shared-statement.component.html'
})
export class SharedStatementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly shareService = inject(StatementShareService);
  private readonly statementPdfService = inject(StatementPdfService);

  readonly state = signal<PageState>('loading');
  readonly data = signal<PublicStatement | null>(null);
  readonly downloading = signal(false);
  readonly downloadError = signal('');

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.state.set('loading');
    try {
      const data = await this.shareService.loadPublic(token);
      this.data.set(data);
      this.state.set(data ? 'ready' : 'invalid');
    } catch (err) {
      console.error('Échec du chargement du relevé partagé', err);
      this.state.set('error');
    }
  }

  async download(): Promise<void> {
    const data = this.data();
    if (!data || this.downloading()) {
      return;
    }
    this.downloading.set(true);
    this.downloadError.set('');
    try {
      await this.statementPdfService.download(data.statement);
    } catch (err) {
      console.error('Échec de la génération du PDF', err);
      this.downloadError.set('Impossible de générer le PDF. Réessayez.');
    } finally {
      this.downloading.set(false);
    }
  }

  amount(value: number): string {
    return formatAmountPlain(value);
  }

  balanceSummary(balance: number): BalanceSummary {
    return summarizeBalance(balance);
  }
}
