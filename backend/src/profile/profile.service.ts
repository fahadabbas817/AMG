import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestStatus } from '../../prisma/generated/client';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(vendorId: string, newData: any) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { bankDetails: true },
    });

    if (!vendor) throw new NotFoundException('Vendor not found');

    const oldData = {
      companyName: vendor.companyName,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      bankDetails: vendor.bankDetails
        ? {
            bankName: vendor.bankDetails.bankName,
            bankAddress: vendor.bankDetails.bankAddress,
            accountNumber: vendor.bankDetails.accountNumber,
            ibanRouting: vendor.bankDetails.ibanRouting,
            swiftCode: vendor.bankDetails.swiftCode,
            currency: vendor.bankDetails.currency,
            payoutMethod: vendor.bankDetails.payoutMethod,
            paypalEmail: vendor.bankDetails.paypalEmail,
            accountType: vendor.bankDetails.accountType,
          }
        : null,
    };

    return this.prisma.profileChangeRequest.create({
      data: {
        vendorId,
        oldData: oldData as any,
        newData: newData as any,
        status: RequestStatus.PENDING,
      },
    });
  }

  async findAll(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      status: RequestStatus.PENDING,
    };

    if (search) {
      whereClause.vendor = {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.profileChangeRequest.findMany({
        where: whereClause,
        include: { vendor: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.profileChangeRequest.count({ where: whereClause }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approve(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const request = await tx.profileChangeRequest.findUnique({
          where: { id },
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.status !== RequestStatus.PENDING) {
          throw new BadRequestException('Request is not pending');
        }

        const updatesLine = request.newData as any;
        // Handle nested data if present or flat
        const updates = updatesLine?.data || updatesLine;

        const vendorUpdates: any = {};
        const bankUpdates: any = {};

        const vendorFields = [
          'companyName',
          'contactName',
          'email',
          'phone',
          'address',
        ];
        const bankFields = [
          'bankName',
          'bankAddress',
          'accountNumber',
          'ibanRouting',
          'swiftCode',
          'currency',
          'payoutMethod',
          'paypalEmail',
          'accountType',
        ];

        for (const key of Object.keys(updates)) {
          if (vendorFields.includes(key)) vendorUpdates[key] = updates[key];
          if (bankFields.includes(key)) bankUpdates[key] = updates[key];
        }

        // Update Vendor
        if (Object.keys(vendorUpdates).length > 0) {
          await tx.vendor.update({
            where: { id: request.vendorId },
            data: vendorUpdates,
          });
        }

        // Update or Create BankDetails
        if (Object.keys(bankUpdates).length > 0) {
          await tx.bankDetails.upsert({
            where: { vendorId: request.vendorId },
            create: {
              vendorId: request.vendorId,
              ...(bankUpdates as any),
            },
            update: bankUpdates,
          });
        }

        return tx.profileChangeRequest.update({
          where: { id },
          data: { status: RequestStatus.APPROVED },
        });
      },
      {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
      },
    );
  }

  async reject(id: string) {
    return this.prisma.profileChangeRequest.update({
      where: { id },
      data: { status: RequestStatus.REJECTED },
    });
  }
}
