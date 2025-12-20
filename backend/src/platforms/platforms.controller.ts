import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UniversalAuthGuard } from '../auth/universal-auth.guard';

@ApiTags('Platforms')
@ApiBearerAuth()
@UseGuards(UniversalAuthGuard, RolesGuard)
@Controller('admin/platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Post()
  @UseGuards(UniversalAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new platform' })
  @ApiResponse({
    status: 201,
    description: 'The platform has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Platform name already exists.' })
  create(@Body() createPlatformDto: CreatePlatformDto) {
    return this.platformsService.create(createPlatformDto);
  }

  @Get()
  @UseGuards(UniversalAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all platforms' })
  @ApiResponse({ status: 200, description: 'Return all platforms.' })
  findAll() {
    return this.platformsService.findAll();
  }

  @Patch(':id')
  @UseGuards(UniversalAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a platform' })
  @ApiResponse({
    status: 200,
    description: 'The platform has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Platform not found.' })
  update(
    @Param('id') id: string,
    @Body() updatePlatformDto: UpdatePlatformDto,
  ) {
    return this.platformsService.update(id, updatePlatformDto);
  }
}
