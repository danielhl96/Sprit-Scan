import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type HistoryEntry = {
  id: string;
  userId: string;
  name: string;
  date: Date;
  description: string;
  taste: string | null;
  origin: string | null;
  recommendation: string | null;
  year: string | null;
  customerReview: string | null;
  rawMaterials: string | null;
  alternative: string | null;
  price: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateHistoryEntryInput = Omit<
  HistoryEntry,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createHistoryEntry(
    userId: string,
    data: CreateHistoryEntryInput,
  ): Promise<void> {
    await this.prisma.history.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async getHistoryEntries(userId: string): Promise<HistoryEntry[]> {
    return this.prisma.history.findMany({
      where: { userId },
    });
  }

  async deleteHistoryEntry(userId: string, entryId: string): Promise<void> {
    await this.prisma.history.deleteMany({
      where: { userId, id: entryId },
    });
  }
}
