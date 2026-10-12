import { Transaction, TransactionType } from '../models/transaction.model';

/** Opération annulée : conservée pour la trace, mais exclue de tous les calculs. */
export function isCancelled(op: { cancelledAt?: string | null }): boolean {
  return !!op.cancelledAt;
}

/** Types qui augmentent ce que le client me doit (colonne « débit » du relevé). */
const DEBIT_TYPES: ReadonlySet<TransactionType> = new Set<TransactionType>(['DEBT', 'WITHDRAWAL']);

export function isDebitType(type: TransactionType): boolean {
  return DEBIT_TYPES.has(type);
}

/** Effet d'une opération client sur son solde : + pour DEBT/WITHDRAWAL, − pour PAYMENT/DEPOSIT, 0 si annulée. */
export function balanceDelta(t: Pick<Transaction, 'type' | 'amount' | 'cancelledAt'>): number {
  if (isCancelled(t)) return 0;
  return isDebitType(t.type) ? t.amount : -t.amount;
}

/**
 * Solde générique : somme des opérations `increasingType` − somme des autres,
 * opérations annulées exclues. Sert aux fournisseurs (PURCHASE augmente ce que je dois).
 */
export function computeSignedBalance<T extends string>(
  operations: { type: T; amount: number; cancelledAt?: string | null }[],
  increasingType: T
): number {
  return operations.reduce((balance, op) => {
    if (isCancelled(op)) return balance;
    return op.type === increasingType ? balance + op.amount : balance - op.amount;
  }, 0);
}

/** Solde client : DETTES + RETRAITS − PAIEMENTS − DÉPÔTS (jamais stocké). */
export function computeBalance(transactions: Transaction[]): number {
  return transactions.reduce((balance, t) => balance + balanceDelta(t), 0);
}

export type BalanceTone = 'owes-you' | 'you-owe' | 'settled';

export interface BalanceDisplay {
  /** « Vous doit », « Vous lui devez » ou « Soldé ». */
  label: string;
  /** Toujours positif : le sens est porté par le libellé, jamais par un signe. */
  amount: number;
  tone: BalanceTone;
  /** Classes Tailwind de couleur du texte. */
  textClass: string;
}

const TONE_CLASSES: Record<BalanceTone, string> = {
  'owes-you': 'text-error-600 dark:text-error-500',
  'you-owe': 'text-brand-600 dark:text-brand-400',
  settled: 'text-gray-500 dark:text-gray-400'
};

/** Présentation d'un solde client (DETTES − PAIEMENTS) sans montant négatif. */
export function balanceLabel(balance: number): BalanceDisplay {
  const tone: BalanceTone = balance > 0 ? 'owes-you' : balance < 0 ? 'you-owe' : 'settled';
  const label = tone === 'owes-you' ? 'Vous doit' : tone === 'you-owe' ? 'Vous lui devez' : 'Soldé';
  return { label, amount: Math.abs(balance), tone, textClass: TONE_CLASSES[tone] };
}
