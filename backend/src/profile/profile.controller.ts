import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('vendor/profile-requests')
  @UseGuards(JwtAuthGuard)
  createRequest(@Req() req, @Body() body: any) {
    return this.profileService.createRequest(req.user.id, body);
  }

  @Get('admin/profile-requests')
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.profileService.findAll(page, limit, search);
  }

  @Patch('admin/profile-requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Param('id') id: string) {
    return this.profileService.approve(id);
  }

  @Patch('admin/profile-requests/:id/reject')
  @UseGuards(JwtAuthGuard)
  reject(@Param('id') id: string) {
    return this.profileService.reject(id);
  }
}
