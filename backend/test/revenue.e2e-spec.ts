import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from 'prisma/generated/enums';

describe('RevenueController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let testPlatformId: string;
  let testVendorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Crucial: mimic behavior in main.ts so validation pipes work!
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    // Create a mock admin token for the @Roles(Role.ADMIN) guard
    const admin = await prisma.admin.findFirst();
    if (admin) {
      adminToken = jwtService.sign({
        sub: admin.id,
        email: admin.email,
        role: Role.ADMIN,
      });
    } else {
      // Fallback fake token if DB is completely empty and lacks an admin
      adminToken = jwtService.sign({
        sub: 'fake-admin-id',
        email: 'admin@test.com',
        role: Role.ADMIN,
      });
    }

    // Seed required data for the tests
    // Using upsert/create to ensure we don't accidentally wipe existing DB data
    const platform = await prisma.platform.upsert({
      where: { name: 'E2E_Test_Platform' },
      update: {},
      create: { name: 'E2E_Test_Platform', defaultSplit: 0.2 },
    });
    testPlatformId = platform.id;

    const vendor = await prisma.vendor.upsert({
      where: { vendorNumber: 'E2E-VEN-999' },
      update: {},
      create: {
        vendorNumber: 'E2E-VEN-999',
        companyName: 'E2E Test Vendor',
        contactName: 'Test Contact',
        email: 'e2e@testvendor.com',
      },
    });
    testVendorId = vendor.id;
  });

  afterAll(async () => {
    // Clean up specifically the data WE created, so we don't mess up the user's local test DB
    await prisma.revenueRecord.deleteMany({
      where: { rawVendorName: 'E2E Test Vendor' },
    });
    await prisma.revenueReport.deleteMany({
      where: { platformId: testPlatformId },
    });
    await prisma.platform.delete({ where: { id: testPlatformId } });
    await prisma.vendor.delete({ where: { id: testVendorId } });
    await app.close();
  });

  describe('/revenue/manual (POST)', () => {
    it('1. should save a valid manual report successfully (Happy Path)', async () => {
      const response = await request(app.getHttpServer())
        .post('/revenue/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platformId: testPlatformId,
          month: '2024-05-01',
          totalAmount: 150.0,
          rows: [
            { vendorId: testVendorId, grossRevenue: 100.0 },
            { vendorId: testVendorId, grossRevenue: 50.0 },
          ],
        });

      if (response.status !== 201) {
        console.error(response.body); // Help debug if it fails
      }
      expect(response.status).toBe(201);

      // Verify in DB!
      const report = await prisma.revenueReport.findUnique({
        where: { id: response.body.reportId },
      });
      expect(report).toBeDefined();
      if (report) {
        expect(Number(report.totalAmount)).toBe(150.0);
      }
    });

    it('2. should return 400 Bad Request when totalAmount != sum of rows', async () => {
      const response = await request(app.getHttpServer())
        .post('/revenue/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platformId: testPlatformId,
          month: '2024-05-01',
          totalAmount: 150.0, // INTENTIONAL MISMATCH
          rows: [{ vendorId: testVendorId, grossRevenue: 100.0 }],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Sum validation failed');
    });

    it('3. should return 400 Bad Request for an invalid/non-existent vendorId matching DB check', async () => {
      const response = await request(app.getHttpServer())
        .post('/revenue/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platformId: testPlatformId,
          month: '2024-05-01',
          totalAmount: 100.0,
          rows: [
            { vendorId: 'FAKE-VENDOR-DOES-NOT-EXIST', grossRevenue: 100.0 },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid vendor IDs provided');
    });

    it('4. should return 400 Bad Request if a string instead of number is sent for grossRevenue', async () => {
      const response = await request(app.getHttpServer())
        .post('/revenue/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          platformId: testPlatformId,
          month: '2024-05-01',
          totalAmount: 100.0,
          rows: [{ vendorId: testVendorId, grossRevenue: 'Not a number' }],
        });

      // Because of the ValidationPipe and @IsNumber(), this should fail before hitting the controller logic natively
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('grossRevenue must be a number'),
        ]),
      );
    });
  });
});
