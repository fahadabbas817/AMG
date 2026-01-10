import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Res,
  Req,
} from '@nestjs/common';
import { QuickbooksService } from './quickbooks.service';
import { QuickbooksSyncService } from './quickbooks.sync.service';
import { PrismaService } from '../prisma/prisma.service';
import express from 'express';

@Controller('quickbooks')
export class QuickbooksController {
  constructor(
    private readonly quickbooksService: QuickbooksService,
    private readonly syncService: QuickbooksSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('auth/connect')
  connect(@Res() res: express.Response) {
    const authUri = this.quickbooksService.getAuthUri();
    res.redirect(authUri);
  }

  @Get('auth/callback')
  async callback(@Req() req: express.Request, @Res() res: express.Response) {
    try {
      const redirectUri = process.env.QBO_REDIRECT_URI;
      if (!redirectUri) {
        throw new Error('QBO_REDIRECT_URI not defined');
      }

      const redirectBase = redirectUri.split('?')[0];
      const fullUrl = `${redirectBase.replace(/\/auth\/qbo\/callback\/?$/, '')}${req.originalUrl || req.url}`;

      await this.quickbooksService.exchangeCodeForToken(fullUrl);

      res.send(`
        <html><body><h1>Connected!</h1><script>try{window.opener.postMessage('qbo-connected','*')}catch(e){}window.close()</script></body></html>
      `);
    } catch (error) {
      console.error('QBO Callback Error:', error);
      res
        .status(400)
        .send(`Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  @Get('vendors/search')
  async searchVendors(@Query('query') query: string) {
    return this.quickbooksService.searchVendors(query);
  }

  @Get('vendors/:id/diff')
  async getVendorDiff(@Param('id') id: string) {
    return this.syncService.compareVendor(id);
  }

  @Post('vendors/:id/sync')
  async syncVendor(@Param('id') id: string, @Body('fields') fields: string[]) {
    return this.syncService.syncVendor(id, fields);
  }

  @Post('sync-payout/:id')
  async syncPayout(@Param('id') id: string) {
    return this.quickbooksService.syncPayout(id);
  }

  @Patch('vendors/:id/link')
  async linkVendor(
    @Param('id') id: string,
    @Body('qbVendorId') qbVendorId: string,
  ) {
    return this.prisma.vendor.update({
      where: { id },
      data: { qbVendorId },
    });
  }

  @Get('sync/preview')
  async getSyncPreview() {
    return this.syncService.getSyncPreview();
  }

  @Post('sync/batch')
  async processSyncBatch(
    @Body()
    batchData: {
      conflicts?: {
        vendorId: string;
        qbVendorId: string;
        resolutions: { field: string; direction: 'LOCAL' | 'QBO' }[];
      }[];
      imports?: { qbId: string }[];
    },
  ) {
    return this.syncService.processSyncBatch(batchData);
  }

  @Get('debug/inspect')
  async inspectVendor(@Query('name') name: string) {
    const vendors = await this.quickbooksService.searchVendors(name);
    return vendors;
  }
  @Post('sync/payment-status')
  async syncPaymentStatus() {
    return this.syncService.syncBillStatus();
  }
}
