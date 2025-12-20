import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
  Res,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto, LoginVendorDto } from './dto/login-auth.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import express from 'express';

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
  async loginAdmin(
    @Res({ passthrough: true }) response: express.Response,
    @Body() loginDto: LoginAuthDto,
  ) {
    const user = await this.authService.validateAdmin(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const result = await this.authService.login(user);

    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: false, // 👈 Use 'true' in Production (HTTPS), 'false' for localhost
      sameSite: 'lax',
      maxAge: 7200000, // 2 hours
    });

    return {
      message: 'Login successful',
      access_token: result.access_token, // 👈 Return token for Swagger/Postman
      user: { id: user.id, role: user.role, email: user.email },
    };
  }

  @Post('login/vendor')
  @ApiOperation({ summary: 'Login as Vendor' })
  @ApiResponse({ status: 200, description: 'Return JWT access token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginVendor(
    @Res({ passthrough: true }) response: express.Response,
    @Body() loginDto: LoginVendorDto,
  ) {
    const user = await this.authService.validateVendor(
      loginDto.email,
      loginDto.password,
      loginDto.vendorId,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid vendor credentials');
    }
    const result = await this.authService.login(user);

    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: false, // 👈 Use 'true' in Production (HTTPS), 'false' for localhost
      sameSite: 'lax',
      maxAge: 7200000, // 2 hours
    });

    return {
      message: 'Login successful',
      access_token: result.access_token, // 👈 Return token for Swagger/Postman
      user: { id: user.id, role: user.role, email: user.email },
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get profile' })
  @ApiResponse({ status: 200, description: 'Return profile.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN or VENDOR role.',
  })
  getProfile(@Request() req) {
    return {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role, // 👈 This is what you need
    };
  }
}
