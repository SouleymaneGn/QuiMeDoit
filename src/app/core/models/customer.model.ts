export interface Customer {
  id: string;
  name: string;
  phone?: string;
  /** Dette maximale autorisée pour ce client. Absent ou null = pas de plafond. */
  creditLimit?: number | null;
  createdAt: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;
