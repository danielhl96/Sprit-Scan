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
    data: Partial<CreateHistoryEntryInput>,
  ): Promise<void> {
    await this.prisma.history.create({
      data: {
        userId,
        name: this.requiredText(data.name, 'Unknown Spirit'),
        description: this.requiredText(data.description, 'No Description'),
        taste: this.optionalTextOrNull(data.taste),
        origin: this.optionalTextOrNull(data.origin),
        recommendation: this.optionalTextOrNull(data.recommendation),
        year: this.optionalTextOrNull(data.year),
        customerReview: this.optionalTextOrNull(data.customerReview),
        rawMaterials: this.optionalTextOrNull(data.rawMaterials),
        alternative: this.optionalTextOrNull(data.alternative),
        price: this.optionalTextOrNull(data.price),
        date: this.toValidDate(data.date),
      },
    });
  }

  private requiredText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  private optionalTextOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toValidDate(value: unknown): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
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
