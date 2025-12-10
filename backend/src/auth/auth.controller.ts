import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard, Roles } from './roles.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup/admin')
  @ApiOperation({ summary: 'Register a new admin' })
  @ApiResponse({ status: 201, description: 'Admin successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async signupAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.authService.signupAdmin(createAdminDto);
  }

  @Post('login/admin')
  @ApiOperation({ summary: 'Login as Admin' })
  @ApiResponse({ status: 200, description: 'Return JWT access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginAdmin(@Body() loginDto: LoginAuthDto) {
    const user = await this.authService.validateAdmin(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    return this.authService.login(user);
  }

  @Post('login/vendor')
  @ApiOperation({ summary: 'Login as Vendor' })
  @ApiResponse({ status: 200, description: 'Return JWT access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginVendor(@Body() loginDto: LoginAuthDto) {
    const user = await this.authService.validateVendor(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid vendor credentials');
    }
    return this.authService.login(user);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin profile (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return admin profile.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role.' })
  getProfile(@Request() req) {
    return req.user;
  }
}
