import { Module } from '@nestjs/common';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueNormalizationService } from './revenue-normalization.service';
import { VendorMatcherService } from './vendor-matcher.service';
import { PayoutModule } from '../payout/payout.module';
import { QuickbooksModule } from '../quickbooks/quickbooks.module';

import { RevenueUnallocatedController } from './revenue-unallocated.controller';

@Module({
  imports: [PayoutModule, QuickbooksModule],
  controllers: [RevenueUnallocatedController, RevenueController],
  providers: [
    RevenueService,
    PrismaService,
    RevenueNormalizationService,
    VendorMatcherService,
  ],
})
export class RevenueModule {}
