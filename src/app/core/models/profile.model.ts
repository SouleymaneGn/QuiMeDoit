export type UserRole = 'OWNER' | 'ADMIN' | 'EMPLOYEE';

export interface Profile {
  id: string;
  ownerName: string;
  businessName: string;
  phone: string;
  currency: string;
  role: UserRole;
}

// role n'est jamais modifiable par le client (attribué en base, protégé par RLS).
export type ProfileInput = Partial<Omit<Profile, 'id' | 'role'>>;
