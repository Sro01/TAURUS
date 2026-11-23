import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JamAccess, JamTokenService } from './jam-token.service';

/** 방 출입증 헤더. 팀 출입증(Authorization)과 섞이지 않게 따로 둔다 */
export const JAM_TOKEN_HEADER = 'x-jam-token';

export type JamRequest = Request<{ slug: string }> & { jam: JamAccess };

/** X-Jam-Token을 JamTokenService로 확인하고 req.jam = { participantId, roomId } */
@Injectable()
export class JamTokenGuard implements CanActivate {
  constructor(private readonly jamTokenService: JamTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<JamRequest>();
    const header = req.headers[JAM_TOKEN_HEADER];
    const token = typeof header === 'string' ? header : undefined;
    req.jam = await this.jamTokenService.verify(token, req.params.slug);
    return true;
  }
}
