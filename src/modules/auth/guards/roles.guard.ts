import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorator/roles.decorator';
import { Request } from 'express';
import { PayloadDto } from 'src/modules/auth/dto/payload-jwt.dto';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as PayloadDto;

    if (
      !user?.roles ||
      !user.roles.some((role: string) => requiredRoles.includes(role))
    ) {
      return false;
    }

    return true;
  }
}
