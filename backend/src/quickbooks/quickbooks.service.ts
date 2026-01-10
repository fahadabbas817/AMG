import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OAuthClient from 'intuit-oauth';

@Injectable()
export class QuickbooksService {
  private readonly logger = new Logger(QuickbooksService.name);
  private oauthClient: any;

  constructor(private readonly prisma: PrismaService) {
    this.oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET,
      environment: process.env.QBO_ENVIRONMENT || 'sandbox',
      redirectUri: process.env.QBO_REDIRECT_URI,
    });
  }

  getAuthUri(): string {
    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
      state: 'initialState',
    });
  }

  async exchangeCodeForToken(url: string) {
    try {
      const authResponse = await this.oauthClient.createToken(url);
      const token = authResponse.getJson();

      const realmId = this.oauthClient.getToken().realmId;

      // Save to DB
      await this.prisma.quickBooksConfig.upsert({
        where: { realmId },
        update: {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresIn: token.expires_in,
          xRefreshTokenExpiresIn: token.x_refresh_token_expires_in,
        },
        create: {
          realmId,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresIn: token.expires_in,
          xRefreshTokenExpiresIn: token.x_refresh_token_expires_in,
        },
      });

      return { message: 'QuickBooks connected successfully', realmId };
    } catch (error) {
      this.logger.error('Error exchanging code for token', error);
      throw new BadRequestException('Failed to connect to QuickBooks');
    }
  }

  async refreshAccessToken(force = false) {
    try {
      const config = await this.prisma.quickBooksConfig.findFirst();

      if (!config) {
        throw new Error('No QuickBooks configuration found');
      }

      // Load token into client
      this.oauthClient.setToken({
        access_token: config.accessToken,
        refresh_token: config.refreshToken,
        expires_in: config.expiresIn,
        x_refresh_token_expires_in: config.xRefreshTokenExpiresIn,
        realmId: config.realmId,
      });

      if (force || !this.oauthClient.isAccessTokenValid()) {
        const authResponse = await this.oauthClient.refresh();
        const token = authResponse.getJson();

        await this.prisma.quickBooksConfig.update({
          where: { id: config.id },
          data: {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresIn: token.expires_in,
            xRefreshTokenExpiresIn: token.x_refresh_token_expires_in,
          },
        });

        this.logger.log('QuickBooks token refreshed successfully');
        return token.access_token;
      }

      return config.accessToken;
    } catch (error) {
      this.logger.error('Error refreshing token', error);
      throw error;
    }
  }

  // Middleware function to ensure valid token before operations
  async autoRefreshToken() {
    return this.refreshAccessToken();
  }

  async makeApiCall(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: any,
  ) {
    // 1. Ensure token is valid
    const accessToken = await this.autoRefreshToken();

    // 2. Get Realm ID because the URL usually needs it if it's relative,
    // but the caller might pass a full URL or a relative path?
    // Let's assume caller passes the path *relative* to the company Base URL.
    // e.g. "/query?query=..."

    // We need the config to get realmID and construct Date URL
    const config = await this.prisma.quickBooksConfig.findFirst();
    if (!config) throw new Error('QuickBooks not configured');

    const environment = process.env.QBO_ENVIRONMENT || 'sandbox';
    const baseUrl =
      environment === 'production'
        ? `https://quickbooks.api.intuit.com/v3/company/${config.realmId}`
        : `https://sandbox-quickbooks.api.intuit.com/v3/company/${config.realmId}`;

    const fullUrl = `${baseUrl}${url}`;

    try {
      // Dynamic import or require for axios if not using HttpModule
      const axios = require('axios');

      const response = await axios({
        method,
        url: fullUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        data: body,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `QBO API Call Failed: ${method} ${url}`,
        error.response?.data || error.message,
      );
      // Retrieve error details
      const errorData = error.response?.data;
      // Check for 401 (Token Expired) or specifically Intuit's 3200 code
      const isAuthError =
        errorData?.Fault?.Error?.[0]?.code === '401' ||
        errorData?.Fault?.Error?.[0]?.code === '3200' ||
        error.response?.status === 401;

      if (isAuthError) {
        this.logger.warn(
          'Token expired during call. Attempting force refresh...',
        );
        try {
          // Force refresh logic
          await this.refreshAccessToken(true);

          // Re-try the request with new token
          const newConfig = await this.prisma.quickBooksConfig.findFirst();
          const newAccessToken = newConfig?.accessToken;

          const axios = require('axios');
          const response = await axios({
            method,
            url: fullUrl,
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            data: body,
          });
          return response.data;
        } catch (retryError) {
          this.logger.error('Retry failed after token refresh', retryError);
          throw retryError;
        }
      }
      throw error;
    }
  }

  async searchVendors(query: string) {
    // Escape single quotes for SQL
    const safeQuery = query.replace(/'/g, "\\'");
    // Search by DisplayName, CompanyName, etc.
    const qboQuery = `SELECT * FROM Vendor WHERE DisplayName LIKE '%${safeQuery}%' MAXRESULTS 10`;

    const result = await this.makeApiCall(
      'GET',
      `/query?query=${encodeURIComponent(qboQuery)}`,
    );
    return result.QueryResponse?.Vendor || [];
  }

  async getVendor(qbVendorId: string) {
    const result = await this.makeApiCall('GET', `/vendor/${qbVendorId}`);
    return result.Vendor;
  }

  async fetchVendors() {
    // 1. Fetch all vendors (simplified, might need pagination for large sets)
    // QBO 'SELECT *' defaults to 100. We might need to iterate if > 100.
    // For now, let's grab up to 1000.
    const qboQuery = `SELECT * FROM Vendor MAXRESULTS 100`;
    const result = await this.makeApiCall(
      'GET',
      `/query?query=${encodeURIComponent(qboQuery)}`,
    );
    return result.QueryResponse?.Vendor || [];
  }

  async syncPayout(payoutId: string) {
    // 1. Fetch Payout
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { vendor: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (!payout.vendor.qbVendorId) {
      throw new BadRequestException('Vendor is not linked to QuickBooks');
    }

    // 2. Prepare Bill Payload
    const amount = Number(payout.totalAmount); // Ensure number

    // Finding a fallback account for the line item (required by QBO)
    // Ideally this should be configurable. We'll try to find 'Commissions and fees' or similar.
    let accountId = '80'; // Common default for Commissions in Sandbox?
    // Better: Query for an account
    try {
      const accounts = await this.makeApiCall(
        'GET',
        "/query?query=SELECT * FROM Account WHERE Name LIKE 'Commissions%' MAXRESULTS 1",
      );
      if (accounts.QueryResponse?.Account?.length > 0) {
        accountId = accounts.QueryResponse.Account[0].Id;
      } else {
        // Fallback query for ANY expense account
        const expenses = await this.makeApiCall(
          'GET',
          "/query?query=SELECT * FROM Account WHERE AccountType = 'Expense' MAXRESULTS 1",
        );
        if (expenses.QueryResponse?.Account?.length > 0) {
          accountId = expenses.QueryResponse.Account[0].Id;
        }
      }
    } catch (e) {
      this.logger.warn('Failed to fetch account for sync, using default', e);
    }

    const billPayload = {
      VendorRef: {
        value: payout.vendor.qbVendorId,
      },
      DocNumber: `PO-${payout.payoutNumber}`,
      TxnDate: new Date().toISOString().split('T')[0],
      PrivateNote: `Payout for ${payout.vendor.companyName}`,
      Line: [
        {
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: amount,
          AccountBasedExpenseLineDetail: {
            AccountRef: {
              value: accountId,
            },
          },
        },
      ],
    };

    try {
      // 3. Create Bill in QBO
      const result = await this.makeApiCall('POST', '/bill', billPayload);
      const qbBillId = result.Bill.Id;

      // 4. Update Payout Record
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          qbBillId: qbBillId,
          syncStatus: 'SYNCED',
        },
      });

      return {
        success: true,
        qbBillId,
        message: 'Payout synced to QuickBooks successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to sync payout to QBO', error);
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          syncStatus: 'FAILED',
        },
      });
      throw new BadRequestException(
        `QuickBooks Sync Failed: ${error.response?.data?.Fault?.Error?.[0]?.Message || error.message}`,
      );
    }
  }
}
