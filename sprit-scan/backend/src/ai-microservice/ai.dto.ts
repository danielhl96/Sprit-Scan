import { IsNotEmpty } from 'class-validator';

export class DataBodyExpertDto {
  @IsNotEmpty()
  prompt: string;
}

export class DataBodySpiritsDto {
  @IsNotEmpty()
  base64Image: string;
}
