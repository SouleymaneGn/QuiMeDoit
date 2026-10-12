export type UserRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE';

export interface Profile {
  id: string;
  ownerName: string;
  businessName: string;
  phone: string;
  currency: string;
  /** Message de rappel WhatsApp ({prenom}, {montant}, {commerce}) ; vide = message par défaut. */
  reminderTemplate?: string | null;
  /** Cachet du commerce (data URL PNG), apposé sur les relevés. */
  stampImage?: string | null;
  role: UserRole;
}

// role n'est jamais modifiable par le client (attribué en base, protégé par RLS).
export type ProfileInput = Partial<Omit<Profile, 'id' | 'role'>>;
