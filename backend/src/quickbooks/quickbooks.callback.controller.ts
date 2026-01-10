import { Controller, Get, Req, Res } from '@nestjs/common';
import { QuickbooksService } from './quickbooks.service';
import express from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Quickbooks')
@Controller('auth/qbo')
export class QboCallbackController {
  constructor(private readonly quickbooksService: QuickbooksService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Handle QBO OAuth callback (root level)' })
  async callback(@Req() req: express.Request, @Res() res: express.Response) {
    try {
      const redirectUri = process.env.QBO_REDIRECT_URI;
      if (!redirectUri) {
        throw new Error('QBO_REDIRECT_URI not defined');
      }

      // Ensure we verify against the expected URI structure
      const redirectBase = redirectUri.split('?')[0];
      const fullUrl = `${redirectBase.replace(/\/auth\/qbo\/callback\/?$/, '')}${req.originalUrl || req.url}`;

      await this.quickbooksService.exchangeCodeForToken(fullUrl);

      // Return simple HTML to close popup
      res.send(`
        <html><body><h1>Connected!</h1><script>try{window.opener.postMessage('qbo-connected','*')}catch(e){}window.close()</script></body></html>
      `);
    } catch (error) {
      console.error('QBO Callback Error:', error);
      res
        .status(400)
        .send(`Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}
