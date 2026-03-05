import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  app.setGlobalPrefix('api/v1');

  app.use(helmet());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // CORS — require explicit origin in production
  const corsOrigin = process.env.CORS_ORIGIN;
  // H-07 fix: Reject wildcard CORS in production
  if (isProduction && corsOrigin === '*') {
    logger.error('CORS_ORIGIN=* is not allowed in production. Set a specific origin.');
    process.exit(1);
  }
  if (isProduction && !corsOrigin) {
    logger.warn(
      'CORS_ORIGIN not set in production — defaulting to deny all cross-origin',
    );
  }
  const parsedOrigin = corsOrigin
    ? corsOrigin.includes(',')
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin
    : isProduction
      ? false
      : 'http://localhost:47001';
  app.enableCors({
    origin: parsedOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — disabled in production
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SSO Cancer Care API')
      .setDescription(
        'Thai Social Security Office Cancer Treatment Protocol Management',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  const port = process.env.PORT || process.env.API_PORT || 48002;
  await app.listen(port);
  logger.log(`SSO Cancer API running on http://localhost:${port}/api/v1`);
  if (!isProduction) {
    logger.log(`Swagger docs: http://localhost:${port}/api/v1/docs`);
  }
}

bootstrap();
