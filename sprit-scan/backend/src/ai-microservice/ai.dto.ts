import { IsNotEmpty, ValidateIf } from 'class-validator';

export class DataBodyExpertDto {
  @IsNotEmpty()
  prompt: string;
}

export class DataBodySpiritsDto {
  @ValidateIf((o) => !o.imageUrl)
  @IsNotEmpty()
  imageBase64?: string;

  @ValidateIf((o) => !o.imageBase64)
  @IsNotEmpty()
  imageUrl?: string;
}
