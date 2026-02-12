import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, AdminModule],
  providers: [ReservationService],
  controllers: [ReservationController],
  exports: [ReservationService], // WeekModule에서 processRotation 호출을 위해
})
export class ReservationModule { }
