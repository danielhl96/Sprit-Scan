import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { AuthKafkaProducerService } from '../auth-kafka-producer.service';
import * as argon2 from 'argon2';

describe('AuthService (Unit)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtService: JwtService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test_secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuthKafkaProducerService,
          useValue: {
            publish: jest.fn(),
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  // --- REGISTER TESTS ---
  describe('register', () => {
    const email = 'test@test.de';
    const password = 'password123';

    beforeEach(() => {
      jest.clearAllMocks();
      prismaMock.user.create.mockReset();
      prismaMock.user.findUnique.mockReset();
    });

    it('should register a new user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      prismaMock.user.create.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email,
        password: 'hashed_password_here',
      });

      const result = await authService.register(email, password);
      expect(result).toBe('User registered successfully');
    });

    it('should throw ConflictException if user already exists', async () => {
      prismaMock.user.create.mockRejectedValue({
        code: 'P2002',
      });

      await expect(authService.register(email, password)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // --- LOGIN TESTS ---
  describe('login', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      prismaMock.user.findUnique.mockReset();
    });

    it('the user should not be login because of incorrect password', async () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: await argon2.hash('password12'),
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: user.id, // Prisma-Feldname prüfen (id statt userId im DB-Rückgabewert!)
        email: user.email,
        password: user.password,
      });

      await expect(
        authService.login(user.email, 'falschesPassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('the user should be login with correct password', async () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@test.de',
        password: await argon2.hash('password123'),
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: user.id, // Prisma-Feldname prüfen (id statt userId im DB-Rückgabewert!)
        email: user.email,
        password: user.password,
      });

      const result = await authService.login(user.email, 'password123');
      expect(result).toHaveProperty('access_token');
    });
  });

  afterAll(async () => {
    await app.close();
  });
}); // Hier schließt der Haupt-Block nun ganz am Ende korrekt ab!
