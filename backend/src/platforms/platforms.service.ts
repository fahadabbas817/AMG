import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

@Injectable()
export class PlatformsService {
  constructor(private prisma: PrismaService) {}

  async create(createPlatformDto: CreatePlatformDto) {
    try {
      return await this.prisma.platform.create({
        data: createPlatformDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Platform with this name already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.platform.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async update(id: string, updatePlatformDto: UpdatePlatformDto) {
    try {
      return await this.prisma.platform.update({
        where: { id },
        data: updatePlatformDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Platform with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Platform name already exists');
      }
      throw error;
    }
  }
}
