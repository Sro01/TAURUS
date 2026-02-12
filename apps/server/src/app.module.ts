import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { WeekModule } from './week/week.module';
import { ReservationModule } from './reservation/reservation.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AuthModule,
    TeamModule,
    WeekModule,
    ReservationModule,
    AdminModule,
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
