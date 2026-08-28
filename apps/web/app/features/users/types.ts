export interface Department {
  id: string;
  name: string;
  description: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department: Department | null;
  isActive: boolean;
  roles: string[];
}

export interface InvitePayload {
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  role: string;
}

export interface InviteResponse {
  message: string;
  userId: string;
}
