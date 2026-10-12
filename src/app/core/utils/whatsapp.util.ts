import { CustomerStatement } from '../models/customer-statement.model';
import { formatAmountPlain } from './currency.util';
import { summarizeBalance } from './statement.util';
import { renderReminder } from './reminder.util';

/**
 * Numéro au format attendu par wa.me (chiffres uniquement, indicatif pays compris),
 * ou null si le numéro n'est pas au format international (+224…, 00224…) :
 * WhatsApp laisse alors choisir le contact.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  const trimmed = (phone ?? '').trim();
  if (!trimmed.startsWith('+') && !trimmed.startsWith('00')) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 ? digits : null;
}

export function whatsappUrl(phone: string | null | undefined, message: string): string {
  const number = normalizePhone(phone);
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(message)}`;
}

/** Message d'accompagnement du relevé : salutation, solde et lien éventuel. */
export function statementMessage(statement: CustomerStatement, businessName: string, link?: string): string {
  const firstName = statement.customerName.trim().split(/\s+/)[0] ?? '';
  const shop = businessName.trim() ? ` chez ${businessName.trim()}` : '';
  const summary = summarizeBalance(statement.balance);
  const amount = `${formatAmountPlain(summary.amount)} ${statement.currency}`;
  const balanceLine = statement.balance === 0 ? `${summary.label}.` : `${summary.label} : ${amount}.`;

  const lines = [`Bonjour ${firstName}, voici votre relevé de compte${shop}.`, balanceLine];
  if (link) {
    lines.push('', `Détail de vos opérations : ${link}`);
  }
  return lines.join('\n');
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/** Rappel de dette : modèle personnalisé des Paramètres (ou message par défaut). */
export function reminderMessage(
  template: string | null | undefined,
  customerName: string,
  formattedAmount: string,
  businessName: string
): string {
  return renderReminder(template, {
    prenom: firstNameOf(customerName),
    montant: formattedAmount,
    commerce: businessName.trim() || 'notre commerce'
  });
}

export interface ReceiptDetails {
  customerName: string;
  /** « Paiement » ou « Dépôt ». */
  kind: 'PAYMENT' | 'DEPOSIT';
  formattedAmount: string;
  date: string;
  paymentMethod: string;
  paidBy?: string | null;
  businessName: string;
  /** Solde actuel du client (DETTES − PAIEMENTS…), déjà formaté côté appelant. */
  balance: number;
  formattedBalance: string;
}

/** Reçu envoyé au client après un paiement ou un dépôt. */
export function receiptMessage(details: ReceiptDetails): string {
  const shop = details.businessName.trim() ? ` chez ${details.businessName.trim()}` : '';
  const what = details.kind === 'DEPOSIT' ? 'votre dépôt' : 'votre paiement';
  const date = new Date(details.date).toLocaleDateString('fr-FR');
  const by = details.paidBy?.trim() ? ` (apporté par ${details.paidBy.trim()})` : '';
  const balanceLine =
    details.balance > 0
      ? `Reste à payer : ${details.formattedBalance}.`
      : details.balance < 0
        ? `Votre avance${shop} : ${details.formattedBalance}.`
        : 'Votre compte est soldé.';
  return [
    `Bonjour ${firstNameOf(details.customerName)},`,
    `Nous confirmons la réception de ${what} de ${details.formattedAmount}${by} le ${date}${shop} (${details.paymentMethod}).`,
    balanceLine,
    'Merci !'
  ].join('\n');
}
