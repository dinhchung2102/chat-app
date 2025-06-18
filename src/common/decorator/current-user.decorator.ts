import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PayloadDto } from 'src/modules/auth/dto/payload-jwt.dto';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user as PayloadDto;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return data ? user?.[data] : user;
  },
);
