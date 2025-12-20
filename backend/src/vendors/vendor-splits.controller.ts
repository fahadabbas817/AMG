import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { AddSplitDto } from './dto/add-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorSplitsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get(':vendorId/splits')
  getSplits(@Param('vendorId') vendorId: string) {
    return this.vendorsService.getSplits(vendorId);
  }

  @Post(':vendorId/splits')
  addSplit(
    @Param('vendorId') vendorId: string,
    @Body() addSplitDto: AddSplitDto,
  ) {
    return this.vendorsService.addSplit(vendorId, addSplitDto);
  }

  @Patch('splits/:splitId')
  updateSplit(
    @Param('splitId') splitId: string,
    @Body() updateSplitDto: UpdateSplitDto,
  ) {
    return this.vendorsService.updateSplit(splitId, updateSplitDto);
  }

  @Delete('splits/:splitId')
  removeSplit(@Param('splitId') splitId: string) {
    return this.vendorsService.removeSplit(splitId);
  }
}
