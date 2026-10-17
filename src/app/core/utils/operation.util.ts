import { PaymentMethod, TransactionType } from '../models/transaction.model';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MOBILE_MONEY: 'Mobile Money'
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

/** Libellé en clair d'une opération client : jamais de signe « + » ou « − ». */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEBT: 'Dette',
  PAYMENT: 'Paiement reçu'
};

export type OperationBadgeColor = 'error' | 'success' | 'info' | 'warning';

export const TRANSACTION_TYPE_BADGE: Record<TransactionType, OperationBadgeColor> = {
  DEBT: 'error',
  PAYMENT: 'success'
};

/** Entrées d'argent dans la caisse (onglet « Entrées » de Paiements, « Encaissé » des rapports). */
export const INCOMING_TYPES: readonly TransactionType[] = ['PAYMENT'];

/** Couleur de texte du type (activité récente). */
export const TRANSACTION_TYPE_TEXT_CLASS: Record<TransactionType, string> = {
  DEBT: 'text-error-600 dark:text-error-500',
  PAYMENT: 'text-success-600 dark:text-success-500'
};
