import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { memoryStorage } from 'multer';
import { CreateManualReportDto } from './dto/create-manual-report.dto';

@ApiTags('Revenue')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Preview revenue report (No save)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platformId: { type: 'string', description: 'UUID of the Platform' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['platformId', 'file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File processed successfully (Preview).',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or missing columns.' })
  @ApiResponse({ status: 404, description: 'Platform not found.' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(csv|xls|xlsx)$/)) {
          return callback(
            new Error('Only CSV, XLS, and XLSX files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  previewRevenueReport(
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body('platformId') platformId: string,
  ) {
    return this.revenueService.previewRevenueReport(file, platformId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload and Save revenue report' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        platformId: { type: 'string', description: 'UUID of the Platform' },
        file: { type: 'string', format: 'binary' },
        month: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
        totalAmount: {
          type: 'number',
          description: 'Total Check Amount from Admin (Optional)',
        },
      },
      required: ['platformId', 'file', 'month'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Revenue report saved successfully.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(csv|xls|xlsx)$/)) {
          return callback(
            new Error('Only CSV, XLS, and XLSX files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  saveRevenueReport(
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Body() body: any,
  ) {
    // Note: Multer body parsing might result in strings, so explicit conversion/validation is good
    const platformId = body.platformId;
    const month = new Date(body.month);
    // Handle optional totalAmount: empty string or undefined should be null
    const totalAmount =
      body.totalAmount && body.totalAmount !== 'null' && body.totalAmount !== ''
        ? parseFloat(body.totalAmount)
        : null;

    const mapping = body.mapping ? JSON.parse(body.mapping) : undefined;
    const invoiceNumber = body.invoiceNumber; // Already optional
    const paymentStatus = body.paymentStatus;

    return this.revenueService.saveRevenueReport(
      file,
      platformId,
      month,
      totalAmount,
      mapping,
      invoiceNumber,
      paymentStatus,
    );
  }

  @Post('manual')
  @ApiOperation({ summary: 'Manually enter revenue report' })
  @ApiBody({ type: CreateManualReportDto })
  @ApiResponse({
    status: 201,
    description: 'Manual report saved successfully.',
  })
  @ApiResponse({ status: 400, description: 'Sum validation failed.' })
  saveManualReport(@Body() dto: CreateManualReportDto) {
    return this.revenueService.saveManualReport(dto);
  }
}
