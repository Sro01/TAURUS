import { Module } from '@nestjs/common';
import { WeekService } from './week.service';
import { WeekController } from './week.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ReservationModule } from '../reservation/reservation.module';

@Module({
  imports: [PrismaModule, ReservationModule],
  providers: [WeekService],
  controllers: [WeekController],
  exports: [WeekService],
})
export class WeekModule { }
