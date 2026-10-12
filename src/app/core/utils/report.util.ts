import { Transaction } from '../models/transaction.model';
import { balanceDelta, isCancelled } from './balance.util';

export type ReportPeriod = 'week' | 'month';

export interface DateRange {
  start: Date;
  /** Exclusif. */
  end: Date;
}

/** Semaine commençant le lundi, comme en France / Afrique francophone. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Période en cours (`back` = 0) ou une période précédente (`back` = 1, 2…). */
export function periodRange(period: ReportPeriod, now: Date, back = 0): DateRange {
  if (period === 'week') {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - 7 * back);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
  return { start, end };
}

/** Hors opérations annulées. */
function inRange(t: Transaction, range: DateRange): boolean {
  const time = new Date(t.createdAt).getTime();
  return !isCancelled(t) && time >= range.start.getTime() && time < range.end.getTime();
}

export function sumInRange(transactions: Transaction[], type: Transaction['type'], range: DateRange): number {
  return transactions.filter(t => t.type === type && inRange(t, range)).reduce((sum, t) => sum + t.amount, 0);
}

export function countInRange(transactions: Transaction[], type: Transaction['type'], range: DateRange): number {
  return transactions.filter(t => t.type === type && inRange(t, range)).length;
}

/**
 * Total dû à une date : somme des soldes positifs des clients en ne comptant
 * que les opérations antérieures à `date`. Même règle que « À récupérer » :
 * l'avance d'un client ne réduit pas la dette des autres.
 */
export function totalDueAt(transactions: Transaction[], date: Date): number {
  const limit = date.getTime();
  const balances = new Map<string, number>();
  for (const t of transactions) {
    if (new Date(t.createdAt).getTime() >= limit) continue;
    const delta = balanceDelta(t);
    balances.set(t.customerId, (balances.get(t.customerId) ?? 0) + delta);
  }
  let total = 0;
  for (const balance of balances.values()) {
    if (balance > 0) total += balance;
  }
  return total;
}

/**
 * Taux de recouvrement de la période : encaissé ÷ (dû au début + nouvelles dettes).
 * « Sur tout ce qu'il y avait à récupérer, quelle part est rentrée ? »
 * Null quand il n'y avait rien à récupérer (pas de taux significatif).
 */
export function recoveryRate(transactions: Transaction[], range: DateRange): number | null {
  const toRecover = totalDueAt(transactions, range.start) + sumInRange(transactions, 'DEBT', range);
  if (toRecover <= 0) return null;
  const collected = sumInRange(transactions, 'PAYMENT', range);
  return Math.min(100, Math.round((collected / toRecover) * 100));
}

/** Variation en % par rapport à la période précédente ; null si la précédente vaut 0. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
