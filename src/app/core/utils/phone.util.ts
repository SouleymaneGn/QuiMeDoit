/**
 * Validation des numéros enregistrés au format composé par `app-phone-input`
 * (indicatif + chiffres, ex. « +224622123456 »).
 *
 * Guinée (+224) : 9 chiffres commençant par 6 (mobiles Orange, MTN, Cellcom).
 * Autres pays : 8 à 15 chiffres au total (norme E.164).
 * Dans tous les cas, un numéro composé uniquement de zéros est refusé.
 */
export type PhoneStatus = 'empty' | 'valid' | 'invalid';

const GUINEA_PHONE = /^\+2246\d{8}$/;
const INTERNATIONAL_PHONE = /^\+\d{8,15}$/;

function compact(phone: string | null | undefined): string {
  return (phone ?? '').replace(/[\s.-]/g, '');
}

export function phoneStatus(phone: string | null | undefined): PhoneStatus {
  const value = compact(phone);
  if (!value) return 'empty';
  if (value.startsWith('+224')) {
    return GUINEA_PHONE.test(value) ? 'valid' : 'invalid';
  }
  if (!INTERNATIONAL_PHONE.test(value)) return 'invalid';
  // Indicatif (1 à 3 chiffres) suivi de zéros uniquement : numéro bidon.
  return /^\+\d{1,3}0+$/.test(value) ? 'invalid' : 'valid';
}

/** Message d'erreur à afficher sous le champ, ou '' si le numéro est vide ou valide. */
export function phoneErrorMessage(phone: string | null | undefined): string {
  if (phoneStatus(phone) !== 'invalid') return '';
  return compact(phone).startsWith('+224')
    ? 'Numéro guinéen invalide : 9 chiffres commençant par 6 (ex. 622 12 34 56).'
    : 'Numéro invalide.';
}

/** Un champ téléphone facultatif est acceptable s'il est vide ou valide. */
export function isAcceptablePhone(phone: string | null | undefined): boolean {
  return phoneStatus(phone) !== 'invalid';
}

export const MISSING_PHONE_WARNING = 'Sans numéro, vous ne pourrez pas envoyer de rappel.';
