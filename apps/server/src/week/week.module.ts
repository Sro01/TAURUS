import { Module } from '@nestjs/common';
import { WeekService } from './week.service';
import { WeekController } from './week.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WeekService],
  controllers: [WeekController],
  exports: [WeekService],
})
export class WeekModule { }
