export interface Profile {
  id: string;
  ownerName: string;
  businessName: string;
  phone: string;
  currency: string;
}

export type ProfileInput = Partial<Omit<Profile, 'id'>>;
