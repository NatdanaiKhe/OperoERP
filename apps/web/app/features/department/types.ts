export interface Department {
  id: string;
  name: string;
  description: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentPayload {
  name: string;
  companyId: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
}

export interface ReassignPayload {
  fromId: string;
  toId: string;
}
