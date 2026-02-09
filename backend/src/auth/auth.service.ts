import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signupAdmin(createAdminDto: CreateAdminDto): Promise<any> {
    const existingUser = await this.prisma.admin.findUnique({
      where: { email: createAdminDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createAdminDto.password, salt);

    const user = await this.prisma.admin.create({
      data: {
        email: createAdminDto.email,
        password: hashedPassword,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async validateAdmin(email: string, pass: string): Promise<any> {
    const user = await this.prisma.admin.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return { ...result, role: 'ADMIN' };
    }
    return null;
  }

  async validateVendor(
    email: string,
    pass: string,
    vendorId: string,
  ): Promise<any> {
    const user = await this.prisma.vendor.findUnique({
      where: { email, vendorNumber: vendorId },
    });
    // Check if user exists AND has a password (since it's nullable)
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return { ...result, role: 'VENDOR' };
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.companyName || user.email, // Use companyName for vendors, email for admins (or generic name)
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async resetPassword(token: string, newPass: string, email: string) {
    // 1. Find vendor by email
    const vendor = await this.prisma.vendor.findUnique({
      where: { email },
    });

    if (!vendor) {
      throw new UnauthorizedException('Invalid request');
    }

    // 2. Verify Token
    if (!vendor.resetToken || !vendor.resetTokenExpiry) {
      throw new UnauthorizedException('No reset token found');
    }

    if (new Date() > vendor.resetTokenExpiry) {
      throw new UnauthorizedException('Token expired');
    }

    const isMatch = await bcrypt.compare(token, vendor.resetToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid token');
    }

    // 3. Hash New Password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPass, salt);

    // 4. Update Vendor
    await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        isFirstLogin: false,
      },
    });

    return { message: 'Password updated successfully' };
  }
}
