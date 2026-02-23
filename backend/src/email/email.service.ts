import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as Brevo from '@getbrevo/brevo';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiInstance: Brevo.TransactionalEmailsApi;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiInstance = new Brevo.TransactionalEmailsApi();
    // Configure API key authorization
    this.apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey,
      this.config.get<string>('BREVO_API_KEY') || '',
    );
  }

  /**
   * Helper to load and compile handlebars template
   */
  private getCompiledHtml(templateName: string, context: any): string {
    const templatePath = path.join(
      process.cwd(),
      'dist',
      'templates',
      `${templateName}.hbs`,
    );
    try {
      const source = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(source);
      return template(context);
    } catch (error) {
      this.logger.error(
        `Error loading template ${templateName} at ${templatePath}`,
        error,
      );
      throw new Error(`Could not load template: ${templateName}`);
    }
  }

  /**
   * Sends a password reset email to a specific vendor.
   */
  async sendPasswordReset(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Generate Token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 48); // 48 Hours

    // Save to Vendor
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry: expiry,
      },
    });

    // Frontend Link
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const link = `${frontendUrl}/reset-password?token=${rawToken}&email=${vendor.email}`;

    // Prepare Brevo Email
    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = 'Reset Your Password - AMG Portal';
    sendSmtpEmail.to = [{ email: vendor.email, name: vendor.companyName }];
    sendSmtpEmail.htmlContent = this.getCompiledHtml('reset-password', {
      link,
    });
    sendSmtpEmail.sender = {
      email: this.config.get<string>('BREVO_USER') || 'no-reply@amg.com',
      name: 'AMG Vendor Portal',
    };

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      this.logger.error('Error sending reset email', error);
      throw error;
    }

    // Log
    await this.logEmail(
      'Password Reset',
      `Sent reset link to ${vendor.email}`,
      1,
      'SYSTEM',
    );
  }

  /**
   * Sends a broadcast email (welcome or custom) to multiple vendors.
   */
  async sendBroadcast(
    vendorIds: string[],
    subject: string,
    bodyOrTemplate: string,
    type: 'CUSTOM' | 'WELCOME' = 'CUSTOM',
    adminId: string,
  ) {
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    let successCount = 0;

    // We can use Brevo's batch sending (versions), but simpler to loop for now
    // to maintain the logic of individual customizations if needed.
    // Or we could use BCC if no customization, but we have customization {{name}}.

    // For reliability in this loop with API, request limits apply (usually high).

    for (const vendor of vendors) {
      try {
        let templateName = 'general';
        let context: any = { body: bodyOrTemplate };

        if (type === 'WELCOME') {
          // Generate a setup token for welcome flow if they are new
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = await bcrypt.hash(rawToken, 10);
          const expiry = new Date();
          expiry.setHours(expiry.getHours() + 24); // 24 Hours for welcome

          await this.prisma.vendor.update({
            where: { id: vendor.id },
            data: {
              resetToken: tokenHash,
              resetTokenExpiry: expiry,
              isFirstLogin: true,
            },
          });

          const link = `${frontendUrl}/reset-password?token=${rawToken}&email=${vendor.email}`;

          // Perform variable replacements for WELCOME type
          let personalizedBody = bodyOrTemplate
            .replace(
              /{{name}}/g,
              vendor.companyName || vendor.contactName || 'Partner',
            )
            .replace(/{{vendorNumber}}/g, vendor.vendorNumber || 'N/A')
            .replace(/{{email}}/g, vendor.email || 'N/A')
            .replace(/{{link}}/g, link);

          // Convert newlines to <br> for HTML email
          personalizedBody = personalizedBody.replace(/\n/g, '<br>');

          context = { body: personalizedBody };
        }

        // Templating replacement for custom text
        if (type === 'CUSTOM') {
          // Basic replacement for internal variable before passing to template
          let personalizedBody = bodyOrTemplate.replace(
            /{{name}}/g,
            vendor.companyName || vendor.contactName || 'Partner',
          );

          // Convert newlines to <br> for HTML email
          personalizedBody = personalizedBody.replace(/\n/g, '<br>');

          context = { body: personalizedBody };
        }

        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.to = [{ email: vendor.email }];
        sendSmtpEmail.htmlContent = this.getCompiledHtml(templateName, context);
        sendSmtpEmail.sender = {
          email: this.config.get<string>('BREVO_USER') || 'no-reply@amg.com',
          name: 'AMG Vendor Portal',
        };

        await this.apiInstance.sendTransacEmail(sendSmtpEmail);

        successCount++;
        // Small delay to be nice to the API rate limit if sending massive amounts
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Failed to send email to ${vendor.email}`, error);
      }
    }

    // Log the broadcast
    await this.logEmail(
      subject,
      `Broadcast (${type}) sent to ${successCount} vendors.`,
      successCount,
      adminId,
    );

    return { sent: successCount, total: vendors.length };
  }

  async getLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emailLog.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  private async logEmail(
    subject: string,
    body: string,
    count: number,
    sentBy: string,
  ) {
    await this.prisma.emailLog.create({
      data: {
        subject,
        body,
        recipientCount: count,
        sentBy,
      },
    });
  }
}
