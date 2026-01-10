import { Module } from '@nestjs/common';
import { VendorDashboardService } from './vendor-dashboard.service';
import { VendorDashboardController } from './vendor-dashboard.controller';
import { PrismaService } from '../prisma/prisma.service';

import { PayoutModule } from '../payout/payout.module';

@Module({
  imports: [PayoutModule],
  controllers: [VendorDashboardController],
  providers: [VendorDashboardService, PrismaService],
})
export class VendorDashboardModule {}
