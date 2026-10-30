import {
  BadRequestException,
  INestApplication,
  InternalServerErrorException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

jest.mock('../ai.service', () => ({
  AiService: class AiService {
    expert() {}
    spirits() {}
  },
}));

import { AiController } from '../ai.controller';
import { AiService } from '../ai.service';
import { JwtValiGuard } from '../guards/jwt-vali.guard';

describe('AiController (HTTP)', () => {
  let app: INestApplication;
  let controller: AiController;

  let guardUserId: string | null = 'guard-user';

  const aiServiceMock = {
    expert: jest.fn(),
    spirits: jest.fn(),
  };

  const guardMock = {
    canActivate: jest.fn((context: any) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: aiServiceMock,
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

    controller = module.get<AiController>(AiController);
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

  describe('POST /ai/expert', () => {
    it('should return service result for valid input (normal case)', async () => {
      aiServiceMock.expert.mockResolvedValue({ message: 'Expert answer' });

      const response = await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .set('x-user-id', 'header-user-1')
        .send({ prompt: 'What is rum?' })
        .expect(200);

      expect(response.body).toEqual({ message: 'Expert answer' });
      expect(aiServiceMock.expert).toHaveBeenCalledWith('header-user-1', {
        prompt: 'What is rum?',
      });
    });

    it('should use req.user.userId from guard when x-user-id header is missing', async () => {
      aiServiceMock.expert.mockResolvedValue({ message: 'Guard user answer' });
      guardUserId = 'guard-user-42';

      await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .send({ prompt: 'Whisky basics' })
        .expect(200);

      expect(aiServiceMock.expert).toHaveBeenCalledWith('guard-user-42', {
        prompt: 'Whisky basics',
      });
    });

    it('should prioritize x-user-id over req.user.userId when both are present', async () => {
      aiServiceMock.expert.mockResolvedValue({ message: 'Header wins' });
      guardUserId = 'guard-user-should-not-be-used';

      await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .set('x-user-id', 'header-priority-user')
        .send({ prompt: 'Gin notes' })
        .expect(200);

      expect(aiServiceMock.expert).toHaveBeenCalledWith(
        'header-priority-user',
        {
          prompt: 'Gin notes',
        },
      );
    });

    it('should return 401 when no user context is available (missing header + guard user)', async () => {
      guardUserId = null;

      const response = await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .send({ prompt: 'Who am I?' })
        .expect(401);

      expect(response.body.message).toBe('Missing user context');
      expect(aiServiceMock.expert).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is missing', async () => {
      await request(app.getHttpServer())
        .post('/ai/expert')
        .send({ prompt: 'No auth' })
        .expect(401);

      expect(aiServiceMock.expert).not.toHaveBeenCalled();
    });

    it('should return 400 for missing prompt (invalid input)', async () => {
      await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(aiServiceMock.expert).not.toHaveBeenCalled();
    });

    it('should return 400 for empty prompt (boundary invalid input)', async () => {
      await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .send({ prompt: '' })
        .expect(400);

      expect(aiServiceMock.expert).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      aiServiceMock.expert.mockRejectedValue(
        new InternalServerErrorException('OpenAI failed'),
      );

      const response = await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .send({ prompt: 'Trigger error' })
        .expect(500);

      expect(response.body.message).toBe('OpenAI failed');
    });

    it('should forward whitespace-only prompt to service (controller boundary case)', async () => {
      aiServiceMock.expert.mockRejectedValue(
        new BadRequestException(
          'Request body must contain a string field "prompt"',
        ),
      );

      await request(app.getHttpServer())
        .post('/ai/expert')
        .set('authorization', 'Bearer valid-token')
        .send({ prompt: '   ' })
        .expect(400);

      expect(aiServiceMock.expert).toHaveBeenCalledWith('guard-user', {
        prompt: '   ',
      });
    });
  });

  describe('POST /ai/spirits', () => {
    it('should return service result for valid imageUrl input', async () => {
      aiServiceMock.spirits.mockResolvedValue({
        name: 'Gin',
        description: 'Dry gin',
      });

      const response = await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .set('x-user-id', 'spirits-user-1')
        .send({ imageUrl: 'https://example.com/bottle.jpg' })
        .expect(200);

      expect(response.body).toEqual({ name: 'Gin', description: 'Dry gin' });
      expect(aiServiceMock.spirits).toHaveBeenCalledWith('spirits-user-1', {
        imageUrl: 'https://example.com/bottle.jpg',
      });
    });

    it('should accept valid imageBase64 input', async () => {
      aiServiceMock.spirits.mockResolvedValue({
        name: 'Rum',
        description: 'Dark rum',
      });

      await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .send({ imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAUA' })
        .expect(200);

      expect(aiServiceMock.spirits).toHaveBeenCalledWith('guard-user', {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAUA',
      });
    });

    it('should accept both imageUrl and imageBase64 (boundary valid input)', async () => {
      aiServiceMock.spirits.mockResolvedValue({
        name: 'Vodka',
        description: 'Clean spirit',
      });

      await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .send({
          imageUrl: 'https://example.com/vodka.jpg',
          imageBase64: 'base64-content',
        })
        .expect(200);

      expect(aiServiceMock.spirits).toHaveBeenCalledWith('guard-user', {
        imageUrl: 'https://example.com/vodka.jpg',
        imageBase64: 'base64-content',
      });
    });

    it('should return 400 when both imageUrl and imageBase64 are missing', async () => {
      await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(aiServiceMock.spirits).not.toHaveBeenCalled();
    });

    it('should return 400 when imageUrl is empty and imageBase64 is missing', async () => {
      await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .send({ imageUrl: '' })
        .expect(400);

      expect(aiServiceMock.spirits).not.toHaveBeenCalled();
    });

    it('should return 400 when imageBase64 is empty and imageUrl is missing', async () => {
      await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .send({ imageBase64: '' })
        .expect(400);

      expect(aiServiceMock.spirits).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      aiServiceMock.spirits.mockRejectedValue(
        new InternalServerErrorException('Structured output failed'),
      );

      const response = await request(app.getHttpServer())
        .post('/ai/spirits')
        .set('authorization', 'Bearer valid-token')
        .send({ imageUrl: 'https://example.com/error.jpg' })
        .expect(500);

      expect(response.body.message).toBe('Structured output failed');
    });
  });

  describe('requireUserId() edge handling', () => {
    it('should use first value when x-user-id is provided as an array header', () => {
      const req = {
        headers: { 'x-user-id': ['array-user-1', 'array-user-2'] },
        user: { userId: 'guard-fallback' },
      } as any;

      const userId = (controller as any).requireUserId(req);
      expect(userId).toBe('array-user-1');
    });
  });
});
