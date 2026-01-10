import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { PrismaService } from '../prisma/prisma.service';
import { QuickbooksModule } from '../quickbooks/quickbooks.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => QuickbooksModule)],
  controllers: [PayoutController],
  providers: [PayoutService, PrismaService],
  exports: [PayoutService],
})
export class PayoutModule {}
