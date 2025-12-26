import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PayoutController],
  providers: [PayoutService, PrismaService],
})
export class PayoutModule {}
