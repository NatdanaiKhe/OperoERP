import './helpers';

import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { createMockPrisma, createTestApp } from './helpers';

const COMPANY_ID = 'company-1';
const OTHER_COMPANY_ID = 'company-2';

describe('Inventory (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();

    mockPrisma._seed.roles.set('role-superadmin', {
      id: 'role-superadmin',
      name: 'superadmin',
      companyId: COMPANY_ID,
    });

    const passwordHash = bcrypt.hashSync('Superadmin1234!', 10);
    mockPrisma.user.create({
      data: {
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        department: 'IT',
        isActive: true,
        userRoles: {
          create: { roleId: 'role-superadmin' },
        },
      },
    });

    mockPrisma._seed.uoms.set('uom-1', {
      id: 'uom-1',
      companyId: COMPANY_ID,
      name: 'Piece',
      symbol: 'pc',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    app = await createTestApp(mockPrisma);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@example.com', password: 'Superadmin1234!' })
      .expect(201);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const seedProduct = (
    id: string,
    name: string,
    type: string,
    companyId: string = COMPANY_ID,
  ) => {
    mockPrisma._seed.products.set(id, {
      id,
      companyId,
      name,
      sku: `SKU-${id}`,
      type,
      baseUomId: 'uom-1',
      isActive: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return id;
  };

  it('POST /api/v1/inventory/adjust creates the first row for a receipt', async () => {
    const productId = seedProduct('p-receipt', 'Receipt Product', 'STOCKABLE');

    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'RECEIPT', quantity: 10 })
      .expect(201);

    expect(res.body.id).toEqual(expect.any(String));
    expect(Number(res.body.quantity)).toBe(10);
  });

  it('POST /api/v1/inventory/adjust increments existing stock', async () => {
    const productId = seedProduct('p-increment', 'Increment Product', 'STOCKABLE');

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'RECEIPT', quantity: 10 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'RECEIPT', quantity: 5 })
      .expect(201);

    expect(Number(res.body.quantity)).toBe(15);
  });

  it('POST /api/v1/inventory/adjust rejects negative stock', async () => {
    const productId = seedProduct('p-negative', 'Negative Product', 'STOCKABLE');

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'RECEIPT', quantity: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'WRITE_OFF', quantity: -10, reason: 'oops' })
      .expect(400);

    const read = await request(app.getHttpServer())
      .get(`/api/v1/inventory/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(read.body.quantity).toBe(5);
  });

  it('POST /api/v1/inventory/adjust rejects non-stockable products', async () => {
    const productId = seedProduct('p-service', 'Service Product', 'SERVICE');

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'RECEIPT', quantity: 10 })
      .expect(400);
  });

  it('GET /api/v1/inventory lists stockable products and excludes others', async () => {
    const stockableId = seedProduct('p-list-stock', 'Stockable', 'STOCKABLE');
    seedProduct('p-list-service', 'Service', 'SERVICE');
    seedProduct('p-list-nonstock', 'Non-Stock', 'NON_STOCK');

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: stockableId, type: 'RECEIPT', quantity: 7 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.data.map((p: { productId: string }) => p.productId);
    expect(ids).toContain(stockableId);
    expect(ids).not.toContain('p-list-service');
    expect(ids).not.toContain('p-list-nonstock');
    const stockable = res.body.data.find(
      (p: { productId: string }) => p.productId === stockableId,
    );
    expect(stockable.quantity).toBe(7);
  });

  it('GET /api/v1/inventory/product/:id returns 0 for a stockable product with no row', async () => {
    const productId = seedProduct('p-zero', 'Zero Product', 'STOCKABLE');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.quantity).toBe(0);
    expect(res.body.id).toBeNull();
  });

  it('GET /api/v1/inventory/product/:id returns 400 for a non-stockable product', async () => {
    const productId = seedProduct('p-service-read', 'Service Read', 'SERVICE');

    await request(app.getHttpServer())
      .get(`/api/v1/inventory/product/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /api/v1/inventory/product/:id/movements returns paginated movements newest first', async () => {
    const productId = seedProduct('p-movements', 'Movement Product', 'STOCKABLE');

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'RECEIPT', quantity: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, type: 'ADJUSTMENT', quantity: 3, reason: 'found' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/product/${productId}/movements`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 2, page: 1, limit: 10 });
    expect(res.body.data[0].quantity).toBe(3);
    expect(res.body.data[1].quantity).toBe(5);
  });

  it('GET /api/v1/inventory enforces tenant isolation', async () => {
    const foreignId = seedProduct('p-foreign', 'Foreign Product', 'STOCKABLE', OTHER_COMPANY_ID);

    await request(app.getHttpServer())
      .get(`/api/v1/inventory/product/${foreignId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const res = await request(app.getHttpServer())
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      res.body.data.some((p: { productId: string }) => p.productId === foreignId),
    ).toBe(false);
  });
});
