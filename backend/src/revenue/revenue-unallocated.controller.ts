import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { Role } from 'prisma/generated/client';

@ApiTags('Revenue - Unallocated')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('revenue/unallocated')
export class RevenueUnallocatedController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get()
  @ApiOperation({ summary: 'Get grouped unallocated revenue records' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.revenueService.getUnallocatedGroups(page, limit, search);
  }

  @Get(':vendorName/details')
  @ApiOperation({
    summary: 'Get details for a specific unallocated vendor group',
  })
  getDetails(@Param('vendorName') vendorName: string) {
    // Decoding might be needed if vendorName contains special chars
    const decodedName =
      vendorName === '__EMPTY__' ? '' : decodeURIComponent(vendorName);
    return this.revenueService.getUnallocatedDetails(decodedName);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign unallocated records to a vendor' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rawVendorName: { type: 'string' },
        vendorId: { type: 'string' },
        subLabel: { type: 'string' },
        addToVendorSubLabels: { type: 'boolean' },
        recordIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['rawVendorName', 'vendorId'],
    },
  })
  assign(@Body() body: any) {
    return this.revenueService.assignUnallocated(
      body.rawVendorName,
      body.vendorId,
      body.subLabel,
      body.recordIds,
      body.addToVendorSubLabels,
    );
  }

  @Delete()
  @ApiOperation({ summary: 'Delete unallocated records' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        recordIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['recordIds'],
    },
  })
  delete(@Body() body: any) {
    return this.revenueService.deleteUnallocated(body.recordIds);
  }
}
