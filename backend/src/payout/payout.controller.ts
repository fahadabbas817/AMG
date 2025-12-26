import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import express from 'express';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { PayoutService } from './payout.service';

@ApiTags('Payouts')
@Controller('payout')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('summary/:vendorId')
  @ApiOperation({ summary: 'Get aggregated unpaid monies owed for a vendor' })
  getUnpaidSummaries(@Param('vendorId') vendorId: string) {
    return this.payoutService.getUnpaidSummaries(vendorId);
  }

  @Post()
  @ApiOperation({ summary: 'Generate a new payout for selected records' })
  createPayout(@Body() dto: CreatePayoutDto) {
    return this.payoutService.createPayout(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payouts' })
  findAll() {
    return this.payoutService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout details' })
  getPayout(@Param('id') id: string) {
    return this.payoutService.getPayout(id);
  }

  @Patch(':id/settle')
  @ApiOperation({ summary: 'Mark payout as settled' })
  settlePayout(
    @Param('id') id: string,
    @Body('paymentDate') paymentDate: string,
  ) {
    return this.payoutService.settlePayout(id, new Date(paymentDate));
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export payout report (PDF/XLSX)' })
  @ApiQuery({ name: 'format', enum: ['pdf', 'xlsx'] })
  async exportPayout(
    @Param('id') id: string,
    @Query('format') format: 'pdf' | 'xlsx',
    @Res() res: express.Response,
  ) {
    const buffer = await this.payoutService.exportPayout(id, format);

    if (format === 'xlsx') {
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=payout-${id}.xlsx`,
        'Content-Length': buffer.length,
      });
    } else {
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=payout-${id}.pdf`,
        'Content-Length': buffer.length,
      });
    }

    res.send(buffer);
  }
}
