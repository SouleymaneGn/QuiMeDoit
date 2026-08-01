export interface Customer {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt'>;
