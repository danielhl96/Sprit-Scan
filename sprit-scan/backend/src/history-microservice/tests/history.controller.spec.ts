import {
  INestApplication,
  InternalServerErrorException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { HistoryController } from '../history.controller';
import { HistoryService } from '../history.service';
import { JwtValiGuard } from '../guards/jwt-vali.guard';

describe('HistoryController (HTTP)', () => {
  let app: INestApplication;
  let controller: HistoryController;

  let guardUserId: string | null = 'guard-user';

  const historyServiceMock = {
    createHistoryEntry: jest.fn(),
    getHistoryEntries: jest.fn(),
    deleteHistoryEntry: jest.fn(),
  };

  const guardMock = {
    canActivate: jest.fn((context: any) => {
      const req = context.switchToHttp().getRequest();
      const token =
        req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new UnauthorizedException(
          'Missing or invalid Authorization header',
        );
      }

      if (guardUserId) {
        req.user = { userId: guardUserId };
      }

      return true;
    }),
  };

  const validHistoryEntry = {
    name: 'Tanqueray',
    date: '2026-10-31T12:00:00.000Z',
    description: 'Dry gin with juniper notes',
    taste: 'Juniper and citrus',
    origin: 'UK',
    recommendation: 'Serve with tonic',
    year: '2024',
    customerReview: 'Very balanced',
    rawMaterials: 'Juniper, coriander',
    alternative: 'Bombay Sapphire',
    price: '29.99 EUR',
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        {
          provide: HistoryService,
          useValue: historyServiceMock,
        },
      ],
    });

    const module: TestingModule = await moduleBuilder
      .overrideGuard(JwtValiGuard)
      .useValue(guardMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();

    controller = module.get<HistoryController>(HistoryController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    guardUserId = 'guard-user';
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /history/entry', () => {
    it('should create history entry for valid input', async () => {
      historyServiceMock.createHistoryEntry.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/history/entry')
        .set('authorization', 'Bearer valid-token')
        .set('x-user-id', 'header-user-1')
        .send(validHistoryEntry)
        .expect(201);

      expect(historyServiceMock.createHistoryEntry).toHaveBeenCalledWith(
        'header-user-1',
        expect.objectContaining(validHistoryEntry),
      );
    });

    it('should use req.user.userId when x-user-id header is missing', async () => {
      historyServiceMock.createHistoryEntry.mockResolvedValue(undefined);
      guardUserId = 'guard-user-42';

      await request(app.getHttpServer())
        .post('/history/entry')
        .set('authorization', 'Bearer valid-token')
        .send(validHistoryEntry)
        .expect(201);

      expect(historyServiceMock.createHistoryEntry).toHaveBeenCalledWith(
        'guard-user-42',
        expect.objectContaining(validHistoryEntry),
      );
    });

    it('should return 401 when no user context exists', async () => {
      guardUserId = null;

      const response = await request(app.getHttpServer())
        .post('/history/entry')
        .set('authorization', 'Bearer valid-token')
        .send(validHistoryEntry)
        .expect(401);

      expect(response.body.message).toBe('Missing user context');
      expect(historyServiceMock.createHistoryEntry).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization is missing', async () => {
      await request(app.getHttpServer())
        .post('/history/entry')
        .send(validHistoryEntry)
        .expect(401);

      expect(historyServiceMock.createHistoryEntry).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/history/entry')
        .set('authorization', 'Bearer valid-token')
        .send({ name: 'Incomplete' })
        .expect(400);

      expect(historyServiceMock.createHistoryEntry).not.toHaveBeenCalled();
    });

    it('should return 400 for empty boundary fields', async () => {
      await request(app.getHttpServer())
        .post('/history/entry')
        .set('authorization', 'Bearer valid-token')
        .send({ ...validHistoryEntry, name: '' })
        .expect(400);

      expect(historyServiceMock.createHistoryEntry).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      historyServiceMock.createHistoryEntry.mockRejectedValue(
        new InternalServerErrorException('create failed'),
      );

      const response = await request(app.getHttpServer())
        .post('/history/entry')
        .set('authorization', 'Bearer valid-token')
        .send(validHistoryEntry)
        .expect(500);

      expect(response.body.message).toBe('create failed');
    });
  });

  describe('GET /history/entries', () => {
    it('should return history entries for valid request', async () => {
      const entries = [
        {
          id: 'entry-1',
          userId: 'guard-user',
          ...validHistoryEntry,
          date: new Date(validHistoryEntry.date),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      historyServiceMock.getHistoryEntries.mockResolvedValue(entries);

      const response = await request(app.getHttpServer())
        .get('/history/entries')
        .set('authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(historyServiceMock.getHistoryEntries).toHaveBeenCalledWith(
        'guard-user',
      );
    });

    it('should return 401 when request is unauthorized', async () => {
      await request(app.getHttpServer()).get('/history/entries').expect(401);

      expect(historyServiceMock.getHistoryEntries).not.toHaveBeenCalled();
    });

    it('should return 401 when user context is missing', async () => {
      guardUserId = null;

      await request(app.getHttpServer())
        .get('/history/entries')
        .set('authorization', 'Bearer valid-token')
        .expect(401);

      expect(historyServiceMock.getHistoryEntries).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /history/entry/:id', () => {
    it('should delete history entry for valid id', async () => {
      historyServiceMock.deleteHistoryEntry.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/history/entry/entry-123')
        .set('authorization', 'Bearer valid-token')
        .expect(200);

      expect(historyServiceMock.deleteHistoryEntry).toHaveBeenCalledWith(
        'guard-user',
        'entry-123',
      );
    });

    it('should handle boundary id values (single character)', async () => {
      historyServiceMock.deleteHistoryEntry.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/history/entry/a')
        .set('authorization', 'Bearer valid-token')
        .expect(200);

      expect(historyServiceMock.deleteHistoryEntry).toHaveBeenCalledWith(
        'guard-user',
        'a',
      );
    });

    it('should return 401 when authorization is missing', async () => {
      await request(app.getHttpServer())
        .delete('/history/entry/entry-123')
        .expect(401);

      expect(historyServiceMock.deleteHistoryEntry).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      historyServiceMock.deleteHistoryEntry.mockRejectedValue(
        new InternalServerErrorException('delete failed'),
      );

      const response = await request(app.getHttpServer())
        .delete('/history/entry/entry-123')
        .set('authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.message).toBe('delete failed');
    });
  });

  describe('requireUserId() edge handling', () => {
    it('should use first value when x-user-id is an array', () => {
      const req = {
        headers: { 'x-user-id': ['array-user-1', 'array-user-2'] },
        user: { userId: 'guard-fallback' },
      } as any;

      const userId = (controller as any).requireUserId(req);
      expect(userId).toBe('array-user-1');
    });
  });
});
