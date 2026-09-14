export const ROUTE_PERMISSIONS: { prefix: string; permission: string }[] = [
  { prefix: '/dashboard/users', permission: 'user:read' },
  { prefix: '/dashboard/departments', permission: 'department:read' },
  { prefix: '/dashboard/customers', permission: 'customer:read' },
];
