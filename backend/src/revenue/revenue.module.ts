import { Module } from '@nestjs/common';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueNormalizationService } from './revenue-normalization.service';
import { VendorMatcherService } from './vendor-matcher.service';

@Module({
  controllers: [RevenueController],
  providers: [
    RevenueService,
    PrismaService,
    RevenueNormalizationService,
    VendorMatcherService,
  ],
})
export class RevenueModule {}
