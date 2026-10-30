import {
  INestApplication,
  InternalServerErrorException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('AuthController (HTTP)', () => {
  let app: INestApplication;

  let guardUserId: string | null = 'guard-user';

  const authServiceMock = {
    login: jest.fn(),
    register: jest.fn(),
    getEmail: jest.fn(),
    changeEmail: jest.fn(),
    changePassword: jest.fn(),
    deleteUser: jest.fn(),
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

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    });

    const module: TestingModule = await moduleBuilder
      .overrideGuard(JwtAuthGuard)
      .useValue(guardMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
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

  describe('POST /auth/login', () => {
    it('should return login result for valid input', async () => {
      authServiceMock.login.mockResolvedValue({ access_token: 'jwt-token' });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(response.body).toEqual({ access_token: 'jwt-token' });
      expect(authServiceMock.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should return 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);

      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      authServiceMock.login.mockRejectedValue(
        new InternalServerErrorException('Login failed'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(500);

      expect(response.body.message).toBe('Login failed');
    });
  });

  describe('POST /auth/register', () => {
    it('should return register result for valid input', async () => {
      authServiceMock.register.mockResolvedValue(
        'User registered successfully',
      );

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123' })
        .expect(201);

      expect(response.text).toBe('User registered successfully');
      expect(authServiceMock.register).toHaveBeenCalledWith(
        'new@example.com',
        'password123',
      );
    });

    it('should return 400 for empty password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: '' })
        .expect(400);

      expect(authServiceMock.register).not.toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'password123' })
        .expect(400);

      expect(authServiceMock.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/me', () => {
    it('should return true for authorized request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/me')
        .set('authorization', 'Bearer valid-token')
        .send({})
        .expect(200);

      expect(response.text).toBe('true');
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).post('/auth/me').send({}).expect(401);
    });
  });

  describe('GET /auth/email', () => {
    it('should return email for authorized request', async () => {
      authServiceMock.getEmail.mockResolvedValue({ email: 'test@example.com' });

      const response = await request(app.getHttpServer())
        .get('/auth/email')
        .set('authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({ email: 'test@example.com' });
      expect(authServiceMock.getEmail).toHaveBeenCalledWith('guard-user');
    });

    it('should return 401 when userId is missing in token context', async () => {
      guardUserId = null;

      const response = await request(app.getHttpServer())
        .get('/auth/email')
        .set('authorization', 'Bearer valid-token')
        .expect(401);

      expect(response.body.message).toBe('Missing user in token');
      expect(authServiceMock.getEmail).not.toHaveBeenCalled();
    });
  });

  describe('PUT /auth/email', () => {
    it('should call changeEmail for valid input', async () => {
      authServiceMock.changeEmail.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put('/auth/email')
        .set('authorization', 'Bearer valid-token')
        .send({
          newEmail: 'changed@example.com',
          password: 'current-password',
        })
        .expect(200);

      expect(authServiceMock.changeEmail).toHaveBeenCalledWith(
        'guard-user',
        'changed@example.com',
        'current-password',
      );
    });

    it('should return 400 for invalid newEmail', async () => {
      await request(app.getHttpServer())
        .put('/auth/email')
        .set('authorization', 'Bearer valid-token')
        .send({
          newEmail: 'invalid-email',
          password: 'current-password',
        })
        .expect(400);

      expect(authServiceMock.changeEmail).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      await request(app.getHttpServer())
        .put('/auth/email')
        .set('authorization', 'Bearer valid-token')
        .send({ newEmail: 'changed@example.com' })
        .expect(400);

      expect(authServiceMock.changeEmail).not.toHaveBeenCalled();
    });

    it('should return 401 when token user is missing', async () => {
      guardUserId = null;

      await request(app.getHttpServer())
        .put('/auth/email')
        .set('authorization', 'Bearer valid-token')
        .send({
          newEmail: 'changed@example.com',
          password: 'current-password',
        })
        .expect(401);

      expect(authServiceMock.changeEmail).not.toHaveBeenCalled();
    });
  });

  describe('PUT /auth/password', () => {
    it('should call changePassword for valid input', async () => {
      authServiceMock.changePassword.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put('/auth/password')
        .set('authorization', 'Bearer valid-token')
        .send({
          oldPassword: 'old-password',
          newPassword: 'new-password',
        })
        .expect(200);

      expect(authServiceMock.changePassword).toHaveBeenCalledWith(
        'guard-user',
        'old-password',
        'new-password',
      );
    });

    it('should return 400 when oldPassword is missing', async () => {
      await request(app.getHttpServer())
        .put('/auth/password')
        .set('authorization', 'Bearer valid-token')
        .send({ newPassword: 'new-password' })
        .expect(400);

      expect(authServiceMock.changePassword).not.toHaveBeenCalled();
    });

    it('should return 400 when newPassword is missing', async () => {
      await request(app.getHttpServer())
        .put('/auth/password')
        .set('authorization', 'Bearer valid-token')
        .send({ oldPassword: 'old-password' })
        .expect(400);

      expect(authServiceMock.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /auth/user/', () => {
    it('should call deleteUser for valid input', async () => {
      authServiceMock.deleteUser.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/auth/user/')
        .set('authorization', 'Bearer valid-token')
        .send({ password: 'current-password' })
        .expect(200);

      expect(authServiceMock.deleteUser).toHaveBeenCalledWith(
        'guard-user',
        'current-password',
      );
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .delete('/auth/user/')
        .set('authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(authServiceMock.deleteUser).not.toHaveBeenCalled();
    });

    it('should return 401 when request is unauthorized', async () => {
      await request(app.getHttpServer())
        .delete('/auth/user/')
        .send({ password: 'current-password' })
        .expect(401);

      expect(authServiceMock.deleteUser).not.toHaveBeenCalled();
    });
  });
});
