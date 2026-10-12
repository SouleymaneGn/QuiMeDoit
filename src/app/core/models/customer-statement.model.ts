import { TransactionType } from './transaction.model';

export interface CustomerStatementLine {
  date: string;
  label: string;
  amount: number;
  type: TransactionType;
}

/** Période optionnelle du relevé (bornes incluses, à la journée). */
export interface StatementPeriod {
  from: Date | null;
  to: Date | null;
}

/** Relevé de compte d’un client : opérations de la période, totaux et solde calculés. */
export interface CustomerStatement {
  customerName: string;
  customerPhone?: string;
  /** Date d'arrêt : fin de période si elle est choisie, sinon aujourd'hui. */
  asOf: Date;
  /** Début de période, ou null pour tout l'historique. */
  periodStart: Date | null;
  currency: string;
  lines: CustomerStatementLine[];
  /** Solde des opérations antérieures au début de période (0 sans période). */
  openingBalance: number;
  totalDebts: number;
  totalPayments: number;
  balance: number;
  paymentsCount: number;
  /** Cachet du commerce à apposer (data URL), s'il a été importé dans Paramètres. */
  stampImage?: string | null;
}
