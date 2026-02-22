import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const ERROR_MESSAGES: Record<string, { th: string; en: string }> = {
  VALIDATION_ERROR: {
    th: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ',
    en: 'Validation failed',
  },
  INVALID_CREDENTIALS: {
    th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    en: 'Invalid email or password',
  },
  TOKEN_EXPIRED: {
    th: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    en: 'Session expired',
  },
  TOKEN_INVALID: {
    th: 'Token ไม่ถูกต้อง',
    en: 'Invalid token',
  },
  FORBIDDEN: {
    th: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
    en: 'Insufficient permissions',
  },
  ACCOUNT_LOCKED: {
    th: 'บัญชีถูกล็อก กรุณาลองใหม่ภายหลัง',
    en: 'Account locked',
  },
  ACCOUNT_DEACTIVATED: {
    th: 'บัญชีถูกปิดใช้งาน',
    en: 'Account deactivated',
  },
  NOT_FOUND: {
    th: 'ไม่พบข้อมูลที่ต้องการ',
    en: 'Not found',
  },
  DUPLICATE_ENTRY: {
    th: 'ข้อมูลซ้ำ กรุณาตรวจสอบ',
    en: 'Duplicate entry',
  },
  RATE_LIMITED: {
    th: 'คำขอมากเกินไป กรุณารอสักครู่',
    en: 'Too many requests',
  },
  INTERNAL_ERROR: {
    th: 'เกิดข้อผิดพลาดในระบบ',
    en: 'Internal error',
  },
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal error';
    let details: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        code = resp.code || resp.error || this.statusToCode(status);
        message = resp.message || exception.message;
        details = Array.isArray(resp.message) ? resp.message : undefined;
        if (details) {
          message =
            ERROR_MESSAGES[code]?.en || 'Validation failed';
        }
      } else {
        code = this.statusToCode(status);
        message = String(exceptionResponse);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = 'Internal error';
    }

    const bilingualMessage = ERROR_MESSAGES[code];

    response.status(status).json({
      success: false,
      error: {
        code,
        message: bilingualMessage?.en || message,
        messageThai: bilingualMessage?.th,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(details ? { details } : {}),
      },
    });
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'TOKEN_INVALID';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'DUPLICATE_ENTRY';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
