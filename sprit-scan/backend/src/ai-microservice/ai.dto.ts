import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class ExpertContextTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class DataBodyExpertDto {
  @IsNotEmpty()
  prompt: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpertContextTurnDto)
  context?: ExpertContextTurnDto[];
}

export class DataBodySpiritsDto {
  @ValidateIf((o) => !o.imageUrl)
  @IsNotEmpty()
  imageBase64?: string;

  @ValidateIf((o) => !o.imageBase64)
  @IsNotEmpty()
  imageUrl?: string;
}
