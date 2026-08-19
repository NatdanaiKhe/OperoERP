/**
 * Database seed — sets up the RBAC roles and permissions.
 *
 * Idempotent: safe to run multiple times (upserts by unique name).
 * Compiled to dist/seed.js by the package build (`prisma generate && tsc`).
 * Run with: `yarn workspace database db:seed` (from repo root)
 *   or:     `npx prisma db seed` (from packages/database)
 */
import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { validateEnv } from '@opero/config';

const appEnv = validateEnv(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: appEnv.DATABASE_URL }),
});

type PermissionDef = { name: string; description: string };
type RoleDef = {
  name: string;
  description: string;
  permissions: string[];
};

const permissions: PermissionDef[] = [
  // Identity & access
  { name: 'user:read', description: 'View users' },
  { name: 'user:create', description: 'Create users' },
  { name: 'user:update', description: 'Update users' },
  { name: 'user:delete', description: 'Delete users' },
  { name: 'role:read', description: 'View roles' },
  { name: 'role:create', description: 'Create roles' },
  { name: 'role:update', description: 'Update roles' },
  { name: 'role:delete', description: 'Delete roles' },
  { name: 'role:assign', description: 'Assign roles to users' },
  { name: 'permission:read', description: 'View permissions' },
  { name: 'permission:assign', description: 'Assign permissions to roles' },

  // Catalog & inventory
  { name: 'product:read', description: 'View products' },
  { name: 'product:create', description: 'Create products' },
  { name: 'product:update', description: 'Update products' },
  { name: 'product:delete', description: 'Delete products' },
  { name: 'inventory:read', description: 'View inventory' },
  { name: 'inventory:create', description: 'Add stock' },
  { name: 'inventory:update', description: 'Adjust stock' },
  { name: 'inventory:delete', description: 'Remove stock records' },

  // Customers & suppliers
  { name: 'customer:read', description: 'View customers' },
  { name: 'customer:create', description: 'Create customers' },
  { name: 'customer:update', description: 'Update customers' },
  { name: 'customer:delete', description: 'Delete customers' },
  { name: 'supplier:read', description: 'View suppliers' },
  { name: 'supplier:create', description: 'Create suppliers' },
  { name: 'supplier:update', description: 'Update suppliers' },
  { name: 'supplier:delete', description: 'Delete suppliers' },

  // Sales & purchasing
  { name: 'sale:read', description: 'View sales' },
  { name: 'sale:create', description: 'Create sales' },
  { name: 'sale:update', description: 'Update sales' },
  { name: 'sale:delete', description: 'Delete sales' },
  { name: 'purchase:read', description: 'View purchases' },
  { name: 'purchase:create', description: 'Create purchases' },
  { name: 'purchase:update', description: 'Update purchases' },
  { name: 'purchase:delete', description: 'Delete purchases' },
  { name: 'payment:read', description: 'View payments' },
  { name: 'payment:create', description: 'Record payments' },
  { name: 'payment:update', description: 'Update payments' },

  // Reporting & settings
  { name: 'report:read', description: 'View reports' },
  { name: 'report:export', description: 'Export reports' },
  { name: 'setting:read', description: 'View settings' },
  { name: 'setting:update', description: 'Update settings' },
];

const roles: RoleDef[] = [
  {
    name: 'sales_representative',
    description: 'Manage customers, quotations, and sales',
    permissions: [
      'customer:read',
      'customer:create',
      'customer:update',
      'product:read',
      'inventory:read',
      'sale:read',
      'sale:create',
      'sale:update',
      'payment:read',
      'report:read',
    ],
  },
  {
    name: 'sales_manager',
    description: 'Approve quotations, monitor sales performance',
    permissions: [
      'user:read',
      'customer:read',
      'customer:create',
      'customer:update',
      'product:read',
      'inventory:read',
      'sale:read',
      'sale:create',
      'sale:update',
      'sale:delete',
      'payment:read',
      'report:read',
      'report:export',
    ],
  },
  {
    name: 'warehouse_staff',
    description: 'Manage stock, receive and deliver products',
    permissions: [
      'product:read',
      'product:create',
      'product:update',
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'inventory:delete',
      'supplier:read',
      'purchase:read',
    ],
  },
  {
    name: 'accountant',
    description: 'Manage invoices, payments, financial reports',
    permissions: [
      'customer:read',
      'supplier:read',
      'sale:read',
      'purchase:read',
      'payment:read',
      'payment:create',
      'payment:update',
      'report:read',
      'report:export',
    ],
  },
  {
    name: 'user',
    description: 'Default role for authenticated users',
    permissions: [
      'user:read',
      'product:read',
      'inventory:read',
      'customer:read',
      'supplier:read',
      'sale:read',
      'sale:create',
      'purchase:read',
      'purchase:create',
      'payment:read',
      'payment:create',
      'report:read',
    ],
  },
  {
    name: 'manager',
    description: 'Operational access across business modules',
    permissions: [
      'user:read',
      'product:read',
      'product:create',
      'product:update',
      'inventory:read',
      'inventory:create',
      'inventory:update',
      'customer:read',
      'customer:create',
      'customer:update',
      'supplier:read',
      'supplier:create',
      'supplier:update',
      'sale:read',
      'sale:create',
      'sale:update',
      'purchase:read',
      'purchase:create',
      'purchase:update',
      'payment:read',
      'payment:create',
      'payment:update',
      'report:read',
      'report:export',
    ],
  },
  {
    name: 'admin',
    description: 'Full system access',
    permissions: permissions.map((p) => p.name),
  },
  {
    name: 'superadmin',
    description: 'Full system access including role and menu management',
    permissions: permissions.map((p) => p.name),
  },
];

// Configurable menu keys (must match the frontend sidebar keys).
const MENU_KEYS = [
  'dashboard',
  'user_management',
  'customers',
  'products',
  'sales',
  'approvals',
  'reports',
  'quick_action',
] as const;

// Default menu visibility per role. All hidden by default —
// only the keys listed here are set to visible=true.
const MENU_DEFAULTS: Record<string, string[]> = {
  superadmin: [...MENU_KEYS],
  admin: [...MENU_KEYS],
  manager: ['dashboard', 'customers', 'products', 'sales', 'approvals', 'reports', 'quick_action'],
  user: ['dashboard', 'customers', 'products'],
  sales_representative: ['dashboard', 'customers', 'sales', 'reports'],
  sales_manager: ['dashboard', 'customers', 'sales', 'approvals', 'reports', 'quick_action'],
  warehouse_staff: ['dashboard', 'products', 'sales'],
  accountant: ['dashboard', 'reports', 'customers'],
};

async function main() {
  // 1. Seed permissions (idempotent upsert by unique name).
  const permissionIds = new Map<string, string>();
  for (const p of permissions) {
    const record = await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: { name: p.name, description: p.description },
    });
    permissionIds.set(p.name, record.id);
  }
  console.log(`Seeded ${permissions.length} permissions.`);

  // 2. Seed roles and link their permissions.
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });

    for (const permName of r.permissions) {
      const permissionId = permissionIds.get(permName);
      if (!permissionId) {
        console.warn(
          `Skipping unknown permission "${permName}" for role "${r.name}".`,
        );
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
    console.log(
      `Seeded role "${r.name}" with ${r.permissions.length} permissions.`,
    );
  }

  // 3. Seed menu visibility defaults per role (fail-closed: all hidden by default).
  for (const [roleName, visibleKeys] of Object.entries(MENU_DEFAULTS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.warn(`Skipping menu defaults for unknown role "${roleName}".`);
      continue;
    }
    for (const menuKey of MENU_KEYS) {
      const visible = visibleKeys.includes(menuKey);
      await prisma.menuVisibility.upsert({
        where: {
          roleId_menuKey: { roleId: role.id, menuKey },
        },
        update: { visible },
        create: { roleId: role.id, menuKey, visible },
      });
    }
    console.log(
      `Seeded menu visibility for "${roleName}" (${visibleKeys.length}/${MENU_KEYS.length} visible).`,
    );
  }
}

main()
  .then(() => console.log('Seed completed successfully.'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
