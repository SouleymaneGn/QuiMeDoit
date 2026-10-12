import { CustomerStatement, StatementPeriod } from '../models/customer-statement.model';
import { TransactionType } from '../models/transaction.model';
import { isDebitType } from './balance.util';

/** Libellé et montant (toujours positif) à afficher pour le solde d'un relevé. */
export interface BalanceSummary {
  label: string;
  amount: number;
}

export function summarizeBalance(balance: number): BalanceSummary {
  if (balance > 0) {
    return { label: 'Reste à payer', amount: balance };
  }
  if (balance < 0) {
    return { label: 'Avance du client', amount: -balance };
  }
  return { label: 'Compte soldé', amount: 0 };
}

/** Ligne du relevé dans l'ordre chronologique, avec le solde cumulé après l'opération. */
export interface LedgerRow {
  date: string | null;
  label: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  /** Ligne « Solde antérieur » (relevé sur une période). */
  opening: boolean;
}

/** Lignes du relevé de la plus ancienne à la plus récente, précédées du solde antérieur s'il y a une période. */
export function ledgerRows(statement: CustomerStatement): LedgerRow[] {
  const rows: LedgerRow[] = [];
  let balance = statement.openingBalance;
  if (statement.periodStart) {
    rows.push({
      date: statement.periodStart.toISOString(),
      label: 'Solde antérieur',
      debit: null,
      credit: null,
      balance,
      opening: true
    });
  }
  for (const line of [...statement.lines].reverse()) {
    const debit = isDebitType(line.type);
    balance += debit ? line.amount : -line.amount;
    rows.push({
      date: line.date,
      label: line.label,
      debit: debit ? line.amount : null,
      credit: debit ? null : line.amount,
      balance,
      opening: false
    });
  }
  return rows;
}

/** Début affiché du relevé : début de période, sinon date de la plus ancienne opération (null si aucune). */
export function statementStart(statement: CustomerStatement): Date | null {
  if (statement.periodStart) {
    return statement.periodStart;
  }
  const oldest = statement.lines[statement.lines.length - 1];
  return oldest ? new Date(oldest.date) : null;
}

/** Champs d'une opération nécessaires au relevé (transaction du commerçant ou d'un lien public). */
export interface StatementOperation {
  type: TransactionType;
  label: string;
  amount: number;
  createdAt: string;
}

/**
 * Construit le relevé de compte à partir des opérations d'un client (triées du plus récent au plus ancien).
 * Avec une période, les opérations antérieures sont reportées en « solde antérieur »
 * et celles postérieures sont ignorées : le solde final est celui à la date d'arrêt.
 */
export function buildStatement(
  customer: { name: string; phone?: string },
  operations: StatementOperation[],
  currency: string,
  period: StatementPeriod = { from: null, to: null }
): CustomerStatement {
  const from = period.from ? startOfDay(period.from).getTime() : null;
  const to = period.to ? endOfDay(period.to).getTime() : null;

  let openingBalance = 0;
  let totalDebts = 0;
  let totalPayments = 0;
  let paymentsCount = 0;
  const inPeriod: StatementOperation[] = [];

  for (const op of operations) {
    const time = new Date(op.createdAt).getTime();
    const signed = isDebitType(op.type) ? op.amount : -op.amount;
    if (from !== null && time < from) {
      openingBalance += signed;
      continue;
    }
    if (to !== null && time > to) {
      continue;
    }
    inPeriod.push(op);
    if (isDebitType(op.type)) {
      totalDebts += op.amount;
    } else {
      totalPayments += op.amount;
      paymentsCount++;
    }
  }

  return {
    customerName: customer.name,
    customerPhone: customer.phone,
    asOf: period.to ? startOfDay(period.to) : new Date(),
    periodStart: period.from ? startOfDay(period.from) : null,
    currency,
    lines: inPeriod.map(op => ({
      date: op.createdAt,
      label: op.label,
      amount: op.amount,
      type: op.type
    })),
    openingBalance,
    totalDebts,
    totalPayments,
    balance: openingBalance + totalDebts - totalPayments,
    paymentsCount
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
