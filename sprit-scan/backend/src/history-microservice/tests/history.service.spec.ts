import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { HistoryService } from '../history.service';
import { find } from 'rxjs';
import { create } from 'axios';

describe('HistoryService (Unit)', () => {
  let app: INestApplication;
  let historyService: HistoryService;
  let jwtService: JwtService;

  const prismaMock = {
    processedEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    history: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test_secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        HistoryService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    historyService = moduleFixture.get<HistoryService>(HistoryService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('HistoryService', () => {
    describe('createHistoryEntry', () => {
      it('should create a history entry and mark the event as processed', async () => {
        const userId = 'user123';
        const event = { eventId: 'event123', topic: 'history-entry-created' };
        const result = {
          userId,
          name: 'test',
          description: 'test',
          taste: 'test',
          origin: 'test',
          recommendation: 'test',
          year: 'test',
          customerReview: 'test',
          rawMaterials: 'test',
          alternative: 'test',
          price: 'test',
          date: new Date(),
        };

        prismaMock.processedEvent.findUnique.mockResolvedValue(null);
        prismaMock.history.create.mockResolvedValue({
          id: 'history123',
          userId,
          result,
          createdAt: new Date(),
        });

        const historyEntry = await historyService.createHistoryEntry(
          userId,
          result,
          { eventId: event.eventId, topic: event.topic },
        );

        expect(prismaMock.history.create).toHaveBeenCalledWith({
          data: {
            ...result,
            date: expect.any(Date),
          },
        });
      });
    });
    it('should return an existing history entry', async () => {
      const userId = 'user123';
      const result = {
        userId,
        name: 'test',
        description: 'test',
        taste: 'test',
        origin: 'test',
        recommendation: 'test',
        year: 'test',
        customerReview: 'test',
        rawMaterials: 'test',
        alternative: 'test',
        price: 'test',
        date: new Date(),
      };

      prismaMock.history.findMany.mockResolvedValue([
        {
          id: 'history123',
          userId,
          result,
          createdAt: new Date(),
        },
      ]);

      const historyEntry = await historyService.getHistoryEntries(userId);

      expect(historyEntry).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId,
            createdAt: expect.any(Date),
            id: 'history123', // Falls du die ID prüfen willst
            result: expect.objectContaining({
              // <--- Wichtig: Verschachtelung hinzugefügt
              name: 'test',
              description: 'test',
              taste: 'test',
              origin: 'test',
              recommendation: 'test',
              year: 'test',
              customerReview: 'test',
              rawMaterials: 'test',
              alternative: 'test',
              price: 'test',
              date: expect.any(Date),
            }),
          }),
        ]),
      );
    });
  });
});
