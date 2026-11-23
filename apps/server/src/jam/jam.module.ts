import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { WeekModule } from '../week/week.module';
import { JamController } from './jam.controller';
import { JamService } from './jam.service';
import { JamTokenGuard } from './jam-token.guard';
import { JamTokenService } from './jam-token.service';

@Module({
  imports: [
    PrismaModule,
    WeekModule,
    // 방 출입증 서명. 만료·audience는 발급할 때 JamTokenService가 정함
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [JamController],
  providers: [JamService, JamTokenService, JamTokenGuard],
})
export class JamModule {}
