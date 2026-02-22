import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateKeyDto {
  @ApiProperty({ description: 'AI provider name (gemini, claude, openai)' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: 'API key to validate' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}
