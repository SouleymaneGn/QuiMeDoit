import { NgClass } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { SkeletonComponent } from '../../shared/components/ui/skeleton/skeleton.component';
import { TransactionService } from '../../core/services/transaction.service';
import { INCOMING_TYPES } from '../../core/utils/operation.util';
import { ProfileService } from '../../core/services/profile.service';
import {
  DateRange,
  ReportPeriod,
  countInRange,
  percentChange,
  periodRange,
  recoveryRate,
  sumInRange,
  totalDueAt
} from '../../core/utils/report.util';

/** Nombre de points sur la courbe « Évolution du total dû ». */
const HISTORY_POINTS = 6;

@Component({
  selector: 'app-reports',
  imports: [NgClass, PageBreadcrumbComponent, SkeletonComponent],
  templateUrl: './reports.component.html'
})
export class ReportsComponent {
  readonly period = signal<ReportPeriod>('week');

  readonly isLoading = computed(() => !this.transactionService.loaded());

  private readonly transactions = computed(() => this.transactionService.activeTransactions());
  private readonly currentRange = computed(() => periodRange(this.period(), new Date()));
  private readonly previousRange = computed(() => periodRange(this.period(), new Date(), 1));

  readonly periodLabel = computed(() => (this.period() === 'week' ? 'cette semaine' : 'ce mois'));
  readonly previousLabel = computed(() => (this.period() === 'week' ? 'la semaine dernière' : 'le mois dernier'));

  // — Encaissé —
  /** Encaissé = paiements reçus + dépôts confiés (toute entrée d'argent). */
  readonly collected = computed(() => this.incomingSum(this.currentRange()));
  readonly collectedCount = computed(() =>
    INCOMING_TYPES.reduce((n, type) => n + countInRange(this.transactions(), type, this.currentRange()), 0)
  );
  readonly previousCollected = computed(() => this.incomingSum(this.previousRange()));
  readonly collectedChange = computed(() => percentChange(this.collected(), this.previousCollected()));

  /** Nouvelles dettes accordées sur la période, pour mettre l'encaissé en perspective. */
  readonly newDebts = computed(() => sumInRange(this.transactions(), 'DEBT', this.currentRange()));

  // — Taux de recouvrement —
  readonly recoveryRate = computed(() => recoveryRate(this.transactions(), this.currentRange()));
  readonly previousRecoveryRate = computed(() => recoveryRate(this.transactions(), this.previousRange()));

  // — Évolution du total dû (fin de chaque période, la dernière = aujourd'hui) —
  readonly dueHistory = computed(() => {
    const now = new Date();
    const transactions = this.transactions();
    const points = [];
    for (let back = HISTORY_POINTS - 1; back >= 0; back--) {
      const range = periodRange(this.period(), now, back);
      const at = back === 0 ? now : range.end;
      points.push({ label: this.pointLabel(range.start, back), amount: totalDueAt(transactions, at) });
    }
    const max = Math.max(...points.map(p => p.amount), 1);
    return points.map(p => ({ ...p, heightPercent: Math.round((p.amount / max) * 100) }));
  });

  readonly dueNow = computed(() => this.dueHistory()[HISTORY_POINTS - 1].amount);
  readonly dueStartOfPeriod = computed(() => totalDueAt(this.transactions(), this.currentRange().start));
  readonly dueDelta = computed(() => this.dueNow() - this.dueStartOfPeriod());

  constructor(
    private readonly transactionService: TransactionService,
    private readonly profileService: ProfileService
  ) {}

  private incomingSum(range: DateRange): number {
    return INCOMING_TYPES.reduce((sum, type) => sum + sumInRange(this.transactions(), type, range), 0);
  }

  setPeriod(period: ReportPeriod): void {
    this.period.set(period);
  }

  formatAmount(amount: number): string {
    return this.profileService.formatAmount(amount);
  }

  private pointLabel(start: Date, back: number): string {
    if (this.period() === 'week') {
      if (back === 0) return 'Cette sem.';
      return start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
    const month = start.toLocaleDateString('fr-FR', { month: 'short' });
    return back === 0 ? 'Ce mois' : month.charAt(0).toUpperCase() + month.slice(1);
  }
}
