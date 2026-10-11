import { CustomerStatement } from '../models/customer-statement.model';
import { formatAmountPlain } from './currency.util';
import { summarizeBalance } from './statement.util';

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
