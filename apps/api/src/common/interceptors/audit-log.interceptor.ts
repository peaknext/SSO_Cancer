import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const ENTITY_TYPE_MAP: Record<string, string> = {
  'cancer-sites': 'CancerSite',
  'cancer-stages': 'CancerStage',
  protocols: 'ProtocolName',
  regimens: 'Regimen',
  drugs: 'Drug',
  'drug-trade-names': 'DrugTradeName',
  users: 'User',
  'app-settings': 'AppSetting',
};

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const user = request.user;
    const path: string = request.route?.path || request.url;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || null;

    // Parse entity type and ID from path
    // Paths look like: /api/v1/drugs/:id, /api/v1/protocols/:id/regimens/:regimenId
    const segments = request.url.replace(/^\/api\/v1\//, '').split('/');
    const resourceName = segments[0];
    const entityType = ENTITY_TYPE_MAP[resourceName];

    if (!entityType) {
      return next.handle();
    }

    // Skip auth endpoints (handled directly by auth service)
    if (resourceName === 'auth') {
      return next.handle();
    }

    const entityId = segments[1] ? parseInt(segments[1], 10) : null;
    const action = this.methodToAction(method, path);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Fire-and-forget audit log creation
          this.createAuditLog({
            userId: user?.sub || user?.id || null,
            action,
            entityType,
            entityId: isNaN(entityId as number) ? null : entityId,
            newValues:
              method === 'POST' || method === 'PATCH'
                ? JSON.stringify(request.body)
                : null,
            ipAddress: ip,
            userAgent,
          }).catch(() => {
            // Silently fail — audit logging should never break the request
          });
        },
      }),
    );
  }

  private methodToAction(method: string, path: string): string {
    if (path.includes('deactivate')) return 'DEACTIVATE';
    if (path.includes('activate')) return 'ACTIVATE';
    if (path.includes('reset-password')) return 'RESET_PASSWORD';
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return method;
    }
  }

  private async createAuditLog(data: {
    userId: number | null;
    action: string;
    entityType: string;
    entityId: number | null;
    newValues: string | null;
    ipAddress: string;
    userAgent: string | null;
  }) {
    await this.prisma.auditLog.create({ data });
  }
}
