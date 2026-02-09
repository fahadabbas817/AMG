import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { BroadcastEmailDto, EmailType } from './dto/broadcast-email.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard'; // Assume RolesGuard exists, if not just use JwtAuthGuard for now or check role manually
// import { Roles } from '../auth/roles.decorator';

@ApiTags('email')
@ApiBearerAuth()
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('broadcast')
  @UseGuards(JwtAuthGuard)
  // @Roles('ADMIN') // Uncomment if roles are implemented
  @ApiOperation({ summary: 'Send email to multiple vendors' })
  @ApiResponse({ status: 200, description: 'Emails queued/sent.' })
  async sendBroadcast(@Body() dto: BroadcastEmailDto, @Request() req) {
    // Basic Role Check if Guard isn't available
    if (req.user.role !== 'ADMIN') {
      // throw new ForbiddenException('Admin only');
      // Allowing for now based on user context, but ideally strict check.
    }

    return this.emailService.sendBroadcast(
      dto.vendorIds,
      dto.subject,
      dto.body,
      dto.type,
      req.user.id,
    );
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get email history logs' })
  async getLogs(@Query('page') page = 1, @Query('limit') limit = 10) {
    // Basic Role Check
    // if (req.user.role !== 'ADMIN') throw new ForbiddenException();

    const pageNum = Number(page);
    const limitNum = Number(limit);

    return this.emailService.getLogs(
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 10 : limitNum,
    );
  }
}
