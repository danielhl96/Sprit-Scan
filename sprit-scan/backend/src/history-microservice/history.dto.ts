import { IsNotEmpty } from 'class-validator';

export class HistoryEntryDto {
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  date: Date;
  @IsNotEmpty()
  description: string;
  @IsNotEmpty()
  taste: string | null;
  @IsNotEmpty()
  origin: string | null;
  @IsNotEmpty()
  recommendation: string | null;
  @IsNotEmpty()
  year: string | null;
  @IsNotEmpty()
  customerReview: string | null;
  @IsNotEmpty()
  rawMaterials: string | null;
  @IsNotEmpty()
  alternative: string | null;
  @IsNotEmpty()
  price: string | null;
}
