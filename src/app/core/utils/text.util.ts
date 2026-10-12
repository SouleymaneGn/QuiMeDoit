/**
 * Majuscule à chaque mot (« oumar hingo doyon » → « Oumar Hingo Doyon »).
 * Seule la première lettre est modifiée : les sigles (SARL, BTP) restent intacts.
 * Les mots composés sont aussi traités (« mamadou-alpha » → « Mamadou-Alpha »).
 */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toUpperCase());
}
