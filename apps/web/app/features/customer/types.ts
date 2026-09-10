export interface Customer {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CustomersMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomersResponse {
  data: Customer[];
  meta: CustomersMeta;
}

export interface CustomerPayload {
  name: string;
  email: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
}

export type CustomerSearchField = 'name' | 'email' | 'taxId';

export interface CustomerFilters {
  field?: CustomerSearchField;
  query: string;
  page: number;
  pageSize: number;
}
