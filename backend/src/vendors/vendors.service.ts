import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { AddSplitDto } from './dto/add-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const { bankDetails, platformIds, ...vendorData } = createVendorDto;

    // Check for duplicates
    const existingVendor = await this.prisma.vendor.findFirst({
      where: {
        OR: [
          { email: vendorData.email },
          { vendorNumber: vendorData.vendorNumber },
        ],
      },
    });

    if (existingVendor) {
      if (existingVendor.email === vendorData.email) {
        throw new ConflictException('Vendor with this email already exists');
      }
      throw new ConflictException('Vendor number already exists');
    }

    // Default password if not provided
    const rawPassword = vendorData.password || 'TemporaryPassword123!';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    return this.prisma.$transaction(async (prisma) => {
      const vendor = await prisma.vendor.create({
        data: {
          ...vendorData,
          password: hashedPassword,
        },
      });

      if (bankDetails) {
        await prisma.bankDetails.create({
          data: {
            ...bankDetails,
            vendorId: vendor.id,
          },
        });
      }

      // Handle Platform Splits
      if (platformIds && platformIds.length > 0) {
        // Fetch platforms to retrieve default splits
        const platforms = await prisma.platform.findMany({
          where: { id: { in: platformIds } },
        });

        if (platforms.length !== platformIds.length) {
          throw new BadRequestException('One or more platform IDs are invalid');
        }

        const splitPromises = platforms.map((platform) =>
          prisma.platformSplit.create({
            data: {
              vendorId: vendor.id,
              platformId: platform.id,
              commissionRate: platform.defaultSplit,
            },
          }),
        );

        await Promise.all(splitPromises);
      }

      const { password, ...result } = vendor;
      return result;
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const skip = (pageNumber - 1) * limitNumber;

    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        skip,
        take: limitNumber,
        include: {
          bankDetails: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        bankDetails: true,
        platformSplits: {
          include: {
            platform: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto) {
    const { bankDetails, platformIds, ...vendorData } = updateVendorDto;

    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (prisma) => {
      // Update vendor details
      const updatedVendor = await prisma.vendor.update({
        where: { id },
        data: vendorData,
      });

      // Update or create bank details
      if (bankDetails) {
        await prisma.bankDetails.upsert({
          where: { vendorId: id },
          create: {
            ...bankDetails,
            vendorId: id,
          },
          update: bankDetails,
        });
      }

      // Handle Platform Splits Update
      if (platformIds) {
        // Get existing splits
        const existingSplits = await prisma.platformSplit.findMany({
          where: { vendorId: id },
          select: { platformId: true },
        });

        const existingPlatformIds = existingSplits.map((s) => s.platformId);

        // Determine additions and removals
        const toAdd = platformIds.filter(
          (pid) => !existingPlatformIds.includes(pid),
        );
        const toRemove = existingPlatformIds.filter(
          (pid) => !platformIds.includes(pid),
        );

        // Add new splits
        if (toAdd.length > 0) {
          // Fetch platforms to get default splits
          const platformsToAdd = await prisma.platform.findMany({
            where: { id: { in: toAdd } },
          });

          await Promise.all(
            platformsToAdd.map((platform) =>
              prisma.platformSplit.create({
                data: {
                  vendorId: id,
                  platformId: platform.id,
                  commissionRate: platform.defaultSplit,
                },
              }),
            ),
          );
        }

        // Remove old splits
        if (toRemove.length > 0) {
          await prisma.platformSplit.deleteMany({
            where: {
              vendorId: id,
              platformId: { in: toRemove },
            },
          });
        }
      }

      return updatedVendor;
    });
  }

  async remove(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Delete dependencies first
        await prisma.bankDetails.deleteMany({ where: { vendorId: id } });
        await prisma.platformSplit.deleteMany({ where: { vendorId: id } });

        // Attempt to delete vendor
        return await prisma.vendor.delete({ where: { id } });
      });
    } catch (error) {
      // Check for foreign key constraint violation (Prisma code 'P2003')
      if (error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete vendor because they have associated financial records (Revenue/Payouts).',
        );
      }
      throw error;
    }
  }

  // --- Split Management ---

  async addSplit(vendorId: string, addSplitDto: AddSplitDto) {
    const { platformId, commissionRate } = addSplitDto;

    // Verify vendor existence
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Verify platform existence
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
    });
    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    // Check if split already exists
    const existingSplit = await this.prisma.platformSplit.findUnique({
      where: {
        vendorId_platformId: {
          vendorId,
          platformId,
        },
      },
    });

    if (existingSplit) {
      throw new ConflictException(
        'Split for this platform already exists for this vendor',
      );
    }

    return this.prisma.platformSplit.create({
      data: {
        vendorId,
        platformId,
        commissionRate,
      },
    });
  }

  async getSplits(vendorId: string) {
    return this.prisma.platformSplit.findMany({
      where: { vendorId },
      include: {
        platform: true,
      },
    });
  }

  async updateSplit(splitId: string, updateSplitDto: UpdateSplitDto) {
    const split = await this.prisma.platformSplit.findUnique({
      where: { id: splitId },
    });
    if (!split) {
      throw new NotFoundException('Split not found');
    }

    return this.prisma.platformSplit.update({
      where: { id: splitId },
      data: {
        commissionRate: updateSplitDto.commissionRate,
      },
    });
  }

  async removeSplit(splitId: string) {
    const split = await this.prisma.platformSplit.findUnique({
      where: { id: splitId },
    });
    if (!split) {
      throw new NotFoundException('Split not found');
    }

    return this.prisma.platformSplit.delete({
      where: { id: splitId },
    });
  }
}
