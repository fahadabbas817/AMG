import { Module, forwardRef } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { VendorSplitsController } from './vendor-splits.controller';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import { QuickbooksModule } from '../quickbooks/quickbooks.module';

@Module({
  imports: [forwardRef(() => QuickbooksModule)],
  controllers: [VendorsController, VendorSplitsController],
  providers: [VendorsService, PrismaService],
  exports: [VendorsService],
})
export class VendorsModule {}
