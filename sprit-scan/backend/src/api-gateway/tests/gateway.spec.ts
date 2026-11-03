import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import request from 'supertest';

jest.mock('../proxy/proxy.service', () => ({
  ProxyService: class ProxyService {
    forward() {}
  },
}));

import { ProxyService } from '../proxy/proxy.service';
import { JwtValiGuard } from '../guards/jwt-vali.guard';
import { AuthController } from '../routes/auth.controller';
import { HistoryController } from '../routes/history.controller';
import { AiController } from '../routes/ai.controller';
import { redisClient } from '../../redis/redis';

jest.mock('../../redis/redis', () => ({
  redisClient: {
    set: jest.fn(),
  },
}));

describe('API Gateway integration (Auth/History/AI routes)', () => {
  let app: INestApplication;
  let rateLimitApp: INestApplication;

  let guardUserId: string | null = 'gateway-user-id';
  let guardEmail: string | null = 'gateway-user@example.com';

  const proxyMock = {
    forward: jest.fn(),
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
        req.user = {
          userId: guardUserId,
          ...(guardEmail ? { email: guardEmail } : {}),
        };
      }

      return true;
    }),
  };

  const createToken = (expSeconds: number) => {
    const payload = Buffer.from(
      JSON.stringify({ exp: expSeconds }),
      'utf8',
    ).toString('base64url');
    return `header.${payload}.signature`;
  };

  const createApp = async (rateLimit: number, ttl: number) => {
    const moduleBuilder: TestingModuleBuilder = Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ limit: rateLimit, ttl }],
        }),
      ],
      controllers: [AuthController, HistoryController, AiController],
      providers: [
        {
          provide: ProxyService,
          useValue: proxyMock,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    });

    const module: TestingModule = await moduleBuilder
      .overrideGuard(JwtValiGuard)
      .useValue(guardMock)
      .compile();

    const instance = module.createNestApplication();
    instance.use(cookieParser());
    instance.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await instance.init();
    return instance;
  };

  beforeAll(async () => {
    app = await createApp(200, 60_000);
    rateLimitApp = await createApp(2, 10_000);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    guardUserId = 'gateway-user-id';
    guardEmail = 'gateway-user@example.com';
    proxyMock.forward.mockResolvedValue({ ok: true });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (rateLimitApp) await rateLimitApp.close();
  });

  describe('Auth gateway endpoints', () => {
    it('POST /api/auth/login forwards valid payload and returns login message', async () => {
      proxyMock.forward.mockResolvedValue({ access_token: 'jwt-token' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'secret123' })
        .expect(200);

      expect(response.body).toEqual({ message: 'Login successful' });
      expect(String(response.headers['set-cookie'])).toContain(
        'access_token=jwt-token',
      );

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          method: 'POST',
          path: '/auth/login',
          data: { email: 'user@example.com', password: 'secret123' },
        }),
      );
    });

    it('POST /api/auth/login forwards empty body (edge case)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({ path: '/auth/login', data: {} }),
      );
    });

    it('POST /api/auth/register forwards payload', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'secret123' })
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({ path: '/auth/register' }),
      );
    });

    it('POST /api/auth/me forwards request', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/me')
        .send({})
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({ path: '/auth/me' }),
      );
    });

    it('GET /api/auth/email forwards request and query', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/email?includeMeta=true')
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({
          method: 'GET',
          path: '/auth/email',
          params: { includeMeta: 'true' },
        }),
      );
    });

    it('PUT /api/auth/email forwards payload', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/email')
        .send({ newEmail: 'changed@example.com', password: 'secret123' })
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({ path: '/auth/email' }),
      );
    });

    it('PUT /api/auth/password forwards payload', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/password')
        .send({ oldPassword: 'old', newPassword: 'new' })
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({ path: '/auth/password' }),
      );
    });

    it('DELETE /api/auth/user forwards payload', async () => {
      await request(app.getHttpServer())
        .delete('/api/auth/user')
        .send({ password: 'secret123' })
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'auth',
        expect.objectContaining({ path: '/auth/user' }),
      );
    });

    it('POST /api/auth/logout blacklists token and clears cookie', async () => {
      const token = createToken(Math.floor(Date.now() / 1000) + 3600);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', `access_token=${token}`)
        .expect(204);

      expect(redisClient.set).toHaveBeenCalledWith(
        `blacklist_${token}`,
        'true',
        expect.objectContaining({ EX: expect.any(Number) }),
      );
      // logout handled directly; no proxy call
      expect(proxyMock.forward).not.toHaveBeenCalled();
    });

    it('POST /api/auth/logout without cookie still returns 204', async () => {
      await request(app.getHttpServer()).post('/api/auth/logout').expect(204);

      expect(redisClient.set).not.toHaveBeenCalled();
      expect(proxyMock.forward).not.toHaveBeenCalled();
    });
  });

  describe('History gateway endpoints', () => {
    it('GET /api/history/entries forwards with injected user headers', async () => {
      await request(app.getHttpServer())
        .get('/api/history/entries')
        .set('authorization', 'Bearer token')
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'history',
        expect.objectContaining({
          method: 'GET',
          path: '/history/entries',
          headers: expect.objectContaining({
            authorization: 'Bearer token',
            'x-user-id': 'gateway-user-id',
            'x-user-email': 'gateway-user@example.com',
          }),
        }),
      );
    });

    it('POST /api/history/entry forwards empty body (edge case)', async () => {
      await request(app.getHttpServer())
        .post('/api/history/entry')
        .set('authorization', 'Bearer token')
        .send({})
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'history',
        expect.objectContaining({ path: '/history/entry', data: {} }),
      );
    });

    it('DELETE /api/history/entry/:id forwards id path', async () => {
      await request(app.getHttpServer())
        .delete('/api/history/entry/abc123')
        .set('authorization', 'Bearer token')
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'history',
        expect.objectContaining({ path: '/history/entry/abc123' }),
      );
    });

    it('returns 401 for history routes when authorization is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/history/entries')
        .expect(401);

      expect(proxyMock.forward).not.toHaveBeenCalled();
    });
  });

  describe('AI gateway endpoints', () => {
    it('POST /api/ai/expert forwards valid payload', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/expert')
        .set('authorization', 'Bearer token')
        .send({ prompt: 'What is bourbon?' })
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'ai',
        expect.objectContaining({
          path: '/ai/expert',
          data: { prompt: 'What is bourbon?' },
        }),
      );
    });

    it('POST /api/ai/spirits forwards empty body (invalid input edge case)', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/spirits')
        .set('authorization', 'Bearer token')
        .send({})
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'ai',
        expect.objectContaining({ path: '/ai/spirits', data: {} }),
      );
    });

    it('POST /api/ai/spirits forwards small image payload', async () => {
      const smallBase64 = 'a'.repeat(64);

      await request(app.getHttpServer())
        .post('/api/ai/spirits')
        .set('authorization', 'Bearer token')
        .send({ imageBase64: smallBase64 })
        .expect(200);

      expect(proxyMock.forward).toHaveBeenCalledWith(
        'ai',
        expect.objectContaining({
          path: '/ai/spirits',
          data: { imageBase64: smallBase64 },
        }),
      );
    });

    it('POST /api/ai/spirits rejects too large payload (boundary size)', async () => {
      const largeBase64 = 'b'.repeat(2 * 1024 * 1024); // ~2 MB base64 string

      await request(app.getHttpServer())
        .post('/api/ai/spirits')
        .set('authorization', 'Bearer token')
        .send({ imageBase64: largeBase64 })
        .expect(413);

      const call = proxyMock.forward.mock.calls.find(
        (entry: any[]) => entry[1]?.path === '/ai/spirits',
      );
      expect(call).toBeUndefined();
    });

    it('returns 401 for AI routes when authorization is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/expert')
        .send({ prompt: 'x' })
        .expect(401);

      expect(proxyMock.forward).not.toHaveBeenCalled();
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when request limit is exceeded', async () => {
      proxyMock.forward.mockResolvedValue({ ok: true });

      await request(rateLimitApp.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'a@a.de', password: 'x' })
        .expect(200);

      await request(rateLimitApp.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'b@b.de', password: 'x' })
        .expect(200);

      await request(rateLimitApp.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'c@c.de', password: 'x' })
        .expect(429);
    });
  });
});
