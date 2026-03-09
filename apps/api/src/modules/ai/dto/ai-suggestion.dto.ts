import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * C-03 fix: Removed apiKey field — validate-key now reads the key
 * from app_settings (server-side only) instead of accepting it in
 * the request body, preventing API key transmission over HTTP.
 */
export class ValidateKeyDto {
  @ApiProperty({
    description: 'AI provider name to validate (reads stored key from app_settings)',
    enum: ['gemini', 'claude', 'openai', 'ollama'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['gemini', 'claude', 'openai', 'ollama'])
  provider: string;
}
