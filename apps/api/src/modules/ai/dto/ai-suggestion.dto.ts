import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateKeyDto {
  @ApiProperty({ description: 'AI provider name (gemini, claude, openai)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  provider: string;

  @ApiProperty({ description: 'API key to validate' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  apiKey: string;
}
