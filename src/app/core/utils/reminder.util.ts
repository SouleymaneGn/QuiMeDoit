/** Variables disponibles dans le message de rappel personnalisable. */
export interface ReminderVariables {
  prenom: string;
  montant: string;
  commerce: string;
}

export const REMINDER_VARIABLES: (keyof ReminderVariables)[] = ['prenom', 'montant', 'commerce'];

export const DEFAULT_REMINDER_TEMPLATE =
  'Bonjour {prenom}, petit rappel : il vous reste {montant} à régler chez {commerce}. Merci et bonne journée !';

/** Remplace {prenom}, {montant} et {commerce} ; un modèle vide retombe sur le modèle par défaut. */
export function renderReminder(template: string | null | undefined, variables: ReminderVariables): string {
  const source = template?.trim() || DEFAULT_REMINDER_TEMPLATE;
  return source.replace(/\{(prenom|montant|commerce)\}/g, (_match, key: keyof ReminderVariables) => variables[key]);
}
