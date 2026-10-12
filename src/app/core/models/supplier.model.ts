export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export type SupplierInput = Omit<Supplier, 'id' | 'createdAt'>;
