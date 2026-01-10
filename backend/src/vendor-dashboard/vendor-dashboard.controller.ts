import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
  Res,
} from '@nestjs/common';
import express from 'express';
import { VendorDashboardService } from './vendor-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { Role } from 'prisma/generated/client';

@Controller('vendor/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorDashboardController {
  constructor(
    private readonly vendorDashboardService: VendorDashboardService,
  ) {}

  @Get('summary')
  @Roles(Role.VENDOR)
  async getDashboardSummary(@Request() req) {
    const vendorId = req.user.id; // extracted from JWT sub by strategy mapping
    return this.vendorDashboardService.getDashboardSummary(vendorId);
  }

  @Get('stats')
  @Roles(Role.VENDOR)
  async getStats(
    @Request() req,
    @Query('platformId') platformId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const vendorId = req.user.id;
    return this.vendorDashboardService.getStats(vendorId, {
      platformId,
      startDate,
      endDate,
    });
  }

  @Get('stats/export')
  @Roles(Role.VENDOR)
  async exportStats(
    @Request() req,
    @Query('platformId') platformId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'pdf' | 'xlsx',
    @Res() res: express.Response,
  ) {
    const vendorId = req.user.id;
    const buffer = await this.vendorDashboardService.exportStats(
      vendorId,
      { platformId, startDate, endDate },
      format || 'pdf',
    );

    if (format === 'xlsx') {
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=stats-report.xlsx',
        'Content-Length': buffer.length,
      });
    } else {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=stats-report.pdf',
        'Content-Length': buffer.length,
      });
    }

    res.send(buffer);
  }

  @Get('platforms')
  @Roles(Role.VENDOR)
  async getVendorPlatforms(@Request() req) {
    const vendorId = req.user.id;
    return this.vendorDashboardService.getVendorPlatforms(vendorId);
  }

  @Get('payouts')
  @Roles(Role.VENDOR)
  async getPayouts(@Request() req) {
    const vendorId = req.user.id;
    return this.vendorDashboardService.getPayouts(vendorId);
  }

  @Get('payouts/:id')
  @Roles(Role.VENDOR)
  async getPayout(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.vendorDashboardService.getPayout(vendorId, id);
  }

  @Get('payouts/:id/export')
  @Roles(Role.VENDOR)
  async exportPayout(
    @Request() req,
    @Param('id') id: string,
    @Query('format') format: 'pdf' | 'xlsx',
    @Res() res: express.Response,
  ) {
    const vendorId = req.user.id;
    const buffer = await this.vendorDashboardService.exportPayout(
      vendorId,
      id,
      format || 'pdf',
    );

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
