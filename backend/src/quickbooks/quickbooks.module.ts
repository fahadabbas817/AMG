import { Module } from '@nestjs/common';
import { QuickbooksService } from './quickbooks.service';
import { QuickbooksController } from './quickbooks.controller';
import { QboCallbackController } from './quickbooks.callback.controller';
import { PrismaService } from '../prisma/prisma.service';
import { QuickbooksSyncService } from './quickbooks.sync.service';

import { PayoutModule } from '../payout/payout.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => PayoutModule)],
  controllers: [QuickbooksController, QboCallbackController],
  providers: [QuickbooksService, QuickbooksSyncService, PrismaService],
  exports: [QuickbooksSyncService, QuickbooksService],
})
export class QuickbooksModule {}
