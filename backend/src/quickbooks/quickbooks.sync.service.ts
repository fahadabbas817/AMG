import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuickbooksService } from './quickbooks.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayoutService } from '../payout/payout.service';

export interface DiffField {
  matches: boolean;
  local: string | null;
  qbo: string | null;
}

export interface VendorDiff {
  vendorId: string;
  vendorName: string;
  qbVendorId: string;
  changes: {
    companyName: DiffField;
    email: DiffField;
    phone: DiffField;
    address: DiffField;
    // New Fields
    corporateName: DiffField;
    contactName: DiffField;
    taxId: DiffField;
    accountNumber: DiffField;
  };
}

@Injectable()
export class QuickbooksSyncService {
  private readonly logger = new Logger(QuickbooksSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quickbooksService: QuickbooksService,
    @Inject(forwardRef(() => PayoutService))
    private readonly payoutService: PayoutService,
  ) {}

  async getSyncPreview() {
    // 1. Fetch all Local Vendors
    const localVendors = await this.prisma.vendor.findMany({
      include: { bankDetails: true },
    });

    // 2. Fetch all QBO Vendors
    const qbVendors = await this.quickbooksService.fetchVendors();

    const conflicts: VendorDiff[] = [];
    const newVendors: any[] = [];
    const matchedVendorIds = new Set<string>();

    // 3. Compare Local vs QBO
    for (const local of localVendors) {
      // Try to find match by ID first
      let match = qbVendors.find((q) => q.Id === local.qbVendorId);

      // If no ID match, try Fuzzy Match (Name or Email)
      if (!match) {
        match = qbVendors.find(
          (q) =>
            (q.DisplayName &&
              local.companyName &&
              q.DisplayName.toLowerCase().trim() ===
                local.companyName.toLowerCase().trim()) ||
            (q.PrimaryEmailAddr?.Address &&
              local.email &&
              q.PrimaryEmailAddr.Address.toLowerCase().trim() ===
                local.email.toLowerCase().trim()),
        );
      }

      if (match) {
        matchedVendorIds.add(match.Id);
        // Compare Fields
        const diff = this.calculateDiff(local, match);
        // If there are ANY mismatches, add to conflicts
        if (
          !diff.changes.companyName.matches ||
          !diff.changes.email.matches ||
          !diff.changes.phone.matches ||
          !diff.changes.address.matches ||
          !diff.changes.corporateName.matches ||
          !diff.changes.contactName.matches ||
          !diff.changes.taxId.matches ||
          !diff.changes.accountNumber.matches
        ) {
          // DEBUG: Log one mismatch example to verify QBO data
          if (conflicts.length === 0) {
            this.logger.debug(
              `[SyncPreview] First Conflict Found: ${local.companyName}`,
            );
            this.logger.debug(
              `[SyncPreview] QBO Data for ${local.companyName}: ${JSON.stringify(match)}`,
            );
          }
          conflicts.push(diff);
        }
      }
    }

    // 4. Identify New Vendors (in QBO but not matched to Local)
    for (const qbV of qbVendors) {
      if (!matchedVendorIds.has(qbV.Id)) {
        newVendors.push({
          qbId: qbV.Id,
          displayName: qbV.DisplayName,
          email: qbV.PrimaryEmailAddr?.Address || null,
          phone: qbV.PrimaryPhone?.FreeFormNumber || null,
        });
      }
    }

    return {
      conflicts,
      newVendors,
      totalLocal: localVendors.length,
      totalQbo: qbVendors.length,
    };
  }

  private calculateDiff(local: any, qbo: any): VendorDiff {
    const qboAddress = this.formatQboAddress(qbo.BillAddr);

    // DEBUG: Log extraction for one vendor to verify path
    if (
      qbo.DisplayName === 'Cal Telephone' ||
      qbo.DisplayName === "Bob's Burger Joint"
    ) {
      this.logger.debug(`[calculateDiff] Extracting for ${qbo.DisplayName}`);
      this.logger.debug(
        `[calculateDiff] qbo.CompanyName: ${qbo.CompanyName}, qbo.DisplayName: ${qbo.DisplayName}`,
      );
      this.logger.debug(
        `[calculateDiff] qbo.PrimaryEmailAddr: ${JSON.stringify(qbo.PrimaryEmailAddr)}`,
      );
      this.logger.debug(
        `[calculateDiff] qbo.PrimaryPhone: ${JSON.stringify(qbo.PrimaryPhone)}`,
      );
      this.logger.debug(`[calculateDiff] qboAddress: ${qboAddress}`);
    }

    // Helper to compare with null safety
    const compare = (l: string | null, q: string | null) => {
      const localVal = l || '';
      const qboVal = q || '';
      return localVal.trim().toLowerCase() === qboVal.trim().toLowerCase();
    };

    const normalizePhone = (p: string | null) => {
      if (!p) return '';
      return p.replace(/\D/g, ''); // Remove all non-digits
    };

    const comparePhone = (l: string | null, q: string | null) => {
      return normalizePhone(l) === normalizePhone(q);
    };

    const diff = {
      vendorId: local.id,
      vendorName: local.companyName,
      qbVendorId: qbo.Id, // Ensure we link if we matched by name
      changes: {
        companyName: {
          matches: compare(
            local.companyName,
            qbo.CompanyName || qbo.DisplayName,
          ),
          local: local.companyName,
          qbo: qbo.CompanyName || qbo.DisplayName,
        },
        email: {
          matches: compare(local.email, qbo.PrimaryEmailAddr?.Address),
          local: local.email,
          qbo: qbo.PrimaryEmailAddr?.Address || null,
        },
        phone: {
          matches: comparePhone(local.phone, qbo.PrimaryPhone?.FreeFormNumber),
          local: local.phone,
          qbo: qbo.PrimaryPhone?.FreeFormNumber || null,
        },
        address: {
          matches: compare(local.address, qboAddress),
          local: local.address,
          qbo: qboAddress,
        },
        // New Fields Logic
        corporateName: {
          matches: compare(local.corporateName, qbo.CompanyName), // Corporate Name often maps to QBO CompanyName (legal)
          local: local.corporateName,
          qbo: qbo.CompanyName || null,
        },
        contactName: {
          matches: compare(
            local.contactName,
            [qbo.GivenName, qbo.FamilyName].filter(Boolean).join(' '),
          ),
          local: local.contactName,
          qbo:
            [qbo.GivenName, qbo.FamilyName].filter(Boolean).join(' ') || null,
        },
        taxId: {
          matches: compare(local.taxId, qbo.TaxIdentifier),
          local: local.taxId,
          qbo: qbo.TaxIdentifier || null,
        },
        accountNumber: {
          matches: compare(local.bankDetails?.accountNumber, qbo.AcctNum),
          local: local.bankDetails?.accountNumber || null,
          qbo: qbo.AcctNum || null,
        },
      },
    };

    if (
      qbo.DisplayName === 'Cal Telephone' ||
      qbo.DisplayName === "Bob's Burger Joint"
    ) {
      this.logger.debug(
        `[calculateDiff] Result for ${qbo.DisplayName}: ${JSON.stringify(diff)}`,
      );
    }

    return diff;
  }

  private formatQboAddress(addr: any): string {
    if (!addr) return '';
    return [addr.Line1, addr.City, addr.CountrySubDivisionCode, addr.PostalCode]
      .filter(Boolean)
      .join(', ');
  }

  async processSyncBatch(payload: {
    conflicts?: {
      vendorId: string;
      qbVendorId: string;
      resolutions: { field: string; direction: 'LOCAL' | 'QBO' }[];
    }[];
    imports?: { qbId: string }[];
  }) {
    this.logger.log(
      `[ProcessSyncBatch] Received payload with ${payload.conflicts?.length || 0} conflicts and ${payload.imports?.length || 0} imports`,
    );
    if (payload.conflicts && payload.conflicts.length > 0) {
      this.logger.debug(
        `[ProcessSyncBatch] First conflict resolutions: ${JSON.stringify(payload.conflicts[0].resolutions)}`,
      );
    }

    const results = { updated: 0, imported: 0, errors: [] as string[] };
    const qbIdsToFetch = new Set<string>();

    if (payload.conflicts) {
      payload.conflicts.forEach((c) => qbIdsToFetch.add(c.qbVendorId));
    }
    if (payload.imports) {
      payload.imports.forEach((i) => qbIdsToFetch.add(i.qbId));
    }

    if (qbIdsToFetch.size === 0) return results;

    // Fetch all QBO vendors in bulk
    const idsArray = Array.from(qbIdsToFetch);
    const chunkSize = 50;
    const qboVendorsMap = new Map<string, any>();

    for (let i = 0; i < idsArray.length; i += chunkSize) {
      const chunk = idsArray.slice(i, i + chunkSize);
      const query = `SELECT * FROM Vendor WHERE Id IN ('${chunk.join("', '")}')`;
      try {
        const response = await this.quickbooksService.makeApiCall(
          'GET',
          `/query?query=${encodeURIComponent(query)}`,
        );
        const vendors = response.QueryResponse?.Vendor || [];
        vendors.forEach((v: any) => qboVendorsMap.set(v.Id, v));
      } catch (e) {
        this.logger.error(`Failed to fetch QBO batch chunk`, e);
      }
    }

    // 1. Handle Conflicts (Updates)
    if (payload.conflicts && payload.conflicts.length > 0) {
      for (const item of payload.conflicts) {
        try {
          // Fetch existing local vendor to get current values
          const localVendor = await this.prisma.vendor.findUnique({
            where: { id: item.vendorId },
            include: { bankDetails: true },
          });

          if (!localVendor) throw new Error('Local vendor not found');

          const qboVendor = qboVendorsMap.get(item.qbVendorId);
          if (!qboVendor) {
            throw new Error(
              `Could not retrieve latest data for QBO Vendor ${item.qbVendorId}`,
            );
          }

          const localUpdates: any = {};
          const qboUpdates: any = {
            Id: item.qbVendorId,
            SyncToken: qboVendor.SyncToken,
            sparse: true, // Only update fields we send
          };

          // Always ensure link is set locally
          if (localVendor.qbVendorId !== item.qbVendorId) {
            localUpdates.qbVendorId = item.qbVendorId;
          }

          if (!item.resolutions || item.resolutions.length === 0) {
            this.logger.warn(
              `[ProcessSyncBatch] No resolutions for vendor ${item.vendorId}`,
            );
          }

          for (const resolution of item.resolutions || []) {
            const { field, direction } = resolution;

            this.logger.debug(
              `[ProcessSyncBatch] Processing ${field} -> ${direction} for ${localVendor.companyName}`,
            );

            if (direction === 'QBO') {
              // Keep QBO Value -> Update Local
              if (field === 'companyName')
                localUpdates.companyName =
                  qboVendor.CompanyName || qboVendor.DisplayName;
              if (field === 'email')
                localUpdates.email =
                  qboVendor.PrimaryEmailAddr?.Address || null;
              if (field === 'phone')
                localUpdates.phone =
                  qboVendor.PrimaryPhone?.FreeFormNumber || null;
              if (field === 'address')
                localUpdates.address =
                  this.formatQboAddress(qboVendor.BillAddr) || null;

              // New Fields Mappings
              if (field === 'corporateName')
                localUpdates.corporateName = qboVendor.CompanyName || null;
              if (field === 'contactName')
                localUpdates.contactName =
                  [qboVendor.GivenName, qboVendor.FamilyName]
                    .filter(Boolean)
                    .join(' ') || null;
              if (field === 'taxId')
                localUpdates.taxId = qboVendor.TaxIdentifier || null;

              if (field === 'accountNumber') {
                // Upsert Bank Details
                await this.prisma.bankDetails.upsert({
                  where: { vendorId: item.vendorId },
                  create: {
                    vendorId: item.vendorId,
                    accountNumber: qboVendor.AcctNum || null,
                  },
                  update: {
                    accountNumber: qboVendor.AcctNum || null,
                  },
                });
              }
            } else if (direction === 'LOCAL') {
              // Keep Local Value -> Update QBO
              if (field === 'companyName')
                qboUpdates.CompanyName = localVendor.companyName;
              if (field === 'email') {
                qboUpdates.PrimaryEmailAddr = { Address: localVendor.email };
              }
              if (field === 'phone') {
                qboUpdates.PrimaryPhone = { FreeFormNumber: localVendor.phone };
              }
              if (field === 'address') {
                qboUpdates.BillAddr = { Line1: localVendor.address };
              }
              // New Fields Mappings
              if (field === 'corporateName')
                qboUpdates.CompanyName = localVendor.corporateName;
              if (field === 'contactName') {
                // Splitting Name is hard, maybe just put in DisplayName?
                // Or GivenName/FamilyName if we can split by space.
                const parts = (localVendor.contactName || '').split(' ');
                if (parts.length > 0) {
                  qboUpdates.GivenName = parts[0];
                  qboUpdates.FamilyName = parts.slice(1).join(' ');
                }
              }
              if (field === 'taxId')
                qboUpdates.TaxIdentifier = localVendor.taxId;
              if (field === 'accountNumber')
                qboUpdates.AcctNum =
                  localVendor.bankDetails?.accountNumber || '';
            }
          }

          // Apply Local Updates
          if (Object.keys(localUpdates).length > 0) {
            await this.prisma.vendor.update({
              where: { id: item.vendorId },
              data: localUpdates,
            });
            this.logger.debug(
              `[ProcessSyncBatch] Updated Local Vendor ${item.vendorId}`,
            );
          }

          // Apply QBO Updates (if any fields other than Id/SyncToken/sparse)
          if (Object.keys(qboUpdates).length > 3) {
            this.logger.debug(
              `[ProcessSyncBatch] Pushing updates to QBO for ${item.qbVendorId}: ${JSON.stringify(qboUpdates)}`,
            );
            await this.quickbooksService.makeApiCall(
              'POST',
              '/vendor?minorversion=65',
              qboUpdates,
            );
          }

          results.updated++;
        } catch (e: any) {
          this.logger.error(
            `Failed to resolve conflict for ${item.vendorId}`,
            e,
          );
          results.errors.push(
            `Update failed for ${item.vendorId}: ${e.message}`,
          );
        }
      }
    }

    // 2. Handle Imports (New Vendors)
    if (payload.imports && payload.imports.length > 0) {
      for (const item of payload.imports) {
        try {
          const qboVendor = qboVendorsMap.get(item.qbId);
          if (!qboVendor) {
            throw new Error(
              `Could not retrieve latest data for QBO Vendor ${item.qbId}`,
            );
          }

          await this.prisma.vendor.create({
            data: {
              companyName: qboVendor.DisplayName,
              corporateName: qboVendor.CompanyName || qboVendor.DisplayName, // Best guess
              dbaName: qboVendor.PrintOnCheckName || null,
              contactName:
                [qboVendor.GivenName, qboVendor.FamilyName]
                  .filter(Boolean)
                  .join(' ') || qboVendor.DisplayName,
              taxId: qboVendor.TaxIdentifier || null,
              email:
                qboVendor.PrimaryEmailAddr?.Address ||
                `temp_${Date.now()}_${Math.random().toString(36).substring(7)}@placeholder.com`,
              phone: qboVendor.PrimaryPhone?.FreeFormNumber,
              address: this.formatQboAddress(qboVendor.BillAddr),
              vendorNumber: `QB${qboVendor.Id}`,
              qbVendorId: qboVendor.Id,
              password: 'temp_password_change_me',
              bankDetails: qboVendor.AcctNum
                ? {
                    create: {
                      accountNumber: qboVendor.AcctNum,
                    },
                  }
                : undefined,
            },
          });
          results.imported++;
        } catch (e: any) {
          // ... existing error logic
          if (e.code === 'P2002') {
            results.errors.push(
              `Import failed for ${qboVendorsMap.get(item.qbId)?.DisplayName}: Already exists.`,
            );
          } else {
            results.errors.push(
              `Import failed for QB ID ${item.qbId}: ${e.message}`,
            );
          }
        }
      }
    }

    return results;
  }

  async compareVendor(localVendorId: string) {
    const localVendor = await this.prisma.vendor.findUnique({
      where: { id: localVendorId },
    });

    if (!localVendor) {
      throw new NotFoundException(`Vendor with ID ${localVendorId} not found`);
    }

    if (!localVendor.qbVendorId) {
      throw new BadRequestException('Vendor is not linked to QuickBooks');
    }

    const qboVendor = await this.quickbooksService.getVendor(
      localVendor.qbVendorId,
    );

    if (!qboVendor) {
      throw new NotFoundException(
        `QuickBooks Vendor ${localVendor.qbVendorId} not found`,
      );
    }

    const diff = this.calculateDiff(localVendor, qboVendor);

    return {
      vendorId: diff.vendorId,
      qbVendorId: diff.qbVendorId,
      companyName: diff.changes.companyName,
      email: diff.changes.email,
      phone: diff.changes.phone,
      address: diff.changes.address,
      corporateName: diff.changes.corporateName,
      contactName: diff.changes.contactName,
      taxId: diff.changes.taxId,
      accountNumber: diff.changes.accountNumber,
    };
  }

  // Deprecated single-vendor sync (kept for compatibility if needed, but updated to use new logic structure internally?)
  // Actually, let's keep it simple. It was pushing QBO -> Local only previously.
  async syncVendor(localVendorId: string, fieldsToSync: string[]) {
    // Reuse processSyncBatch for single vendor QBO->Local sync
    const localVendor = await this.prisma.vendor.findUnique({
      where: { id: localVendorId },
    });
    if (!localVendor?.qbVendorId) throw new Error('Vendor not linked');

    return this.processSyncBatch({
      conflicts: [
        {
          vendorId: localVendorId,
          qbVendorId: localVendor.qbVendorId,
          resolutions: fieldsToSync.map((f) => ({
            field: f,
            direction: 'QBO',
          })),
        },
      ],
    });
  }

  async createBillFromPayout(payoutId: string, invoiceRef?: string) {
    // 1. Fetch Payout
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        vendor: true,
        items: {
          include: {
            platform: true,
          },
        },
      },
    });

    if (!payout) throw new NotFoundException('Payout not found');
    if (!payout.vendor.qbVendorId) {
      throw new BadRequestException('Vendor not linked to QBO');
    }

    const platforms = [
      ...new Set(payout.items.map((i) => i.platform.name)),
    ].join(', ');
    const month =
      payout.items[0]?.periodStart.toISOString().slice(0, 7) || 'Unknown Month';

    const billData = {
      VendorRef: {
        value: payout.vendor.qbVendorId,
      },
      DocNumber: invoiceRef
        ? `${invoiceRef}-${payout.payoutNumber}`
        : String(payout.payoutNumber),
      Line: [
        {
          DetailType: 'AccountBasedExpenseLineDetail',
          Amount: Number(payout.totalAmount),
          AccountBasedExpenseLineDetail: {
            AccountRef: {
              value: '1',
            },
          },
          Description: `Payout #${payout.payoutNumber} for ${platforms} (${month})`,
        },
      ],
    };

    // 3. Send to QBO (Expense Account Lookup Logic)
    try {
      const accountId = await this.quickbooksService.getRevenueShareAccountId();
      billData.Line[0].AccountBasedExpenseLineDetail.AccountRef.value =
        accountId;
    } catch (e) {
      this.logger.warn("Could not fetch expense account, using Id '1'", e);
    }

    const createdBill = await this.quickbooksService.makeApiCall(
      'POST',
      '/bill',
      billData,
    );

    // 4. Update Payout with Bill ID
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        qbBillId: createdBill.Bill?.Id || createdBill.Id,
        syncStatus: 'SYNCED',
      },
    });

    return createdBill;
  }

  async createBillPayment(
    payoutId: string,
    qbBillId: string,
    amount: number,
    paymentDate: Date,
  ) {
    this.logger.log(
      `[CreateBillPayment] Validating Bill Payment for payout ${payoutId}`,
    );

    // 1. Identify Payment Account (Bank/Checking)
    let accountRefValue = '35'; // Default fallback ID often seen in sandboxes (Checking)

    // Try to find a real bank account
    try {
      const q = "select * from Account where AccountType = 'Bank' maxresults 1";
      const res = await this.quickbooksService.makeApiCall(
        'GET',
        `/query?query=${encodeURIComponent(q)}`,
      );
      if (res.QueryResponse?.Account?.length > 0) {
        accountRefValue = res.QueryResponse.Account[0].Id;
      }
    } catch {
      // ignore
    }

    const payload = {
      PrivateNote: `Payment for Payout ${payoutId}`,
      TxnDate: paymentDate.toISOString().split('T')[0],
      TotalAmt: amount,
      PayType: 'Check',
      CheckPayment: {
        BankAccountRef: {
          value: accountRefValue,
        },
      },
      Line: [
        {
          Amount: amount,
          LinkedTxn: [
            {
              TxnId: qbBillId,
              TxnType: 'Bill',
            },
          ],
        },
      ],
    };

    this.logger.log(
      `[CreateBillPayment] Sending BillPayment to QBO for Bill ${qbBillId}`,
    );
    return this.quickbooksService.makeApiCall('POST', '/billpayment', payload);
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async syncBillStatus() {
    this.logger.log(
      '[SyncBillStatus] Starting automated payment tracking check...',
    );

    // 1. Find Payouts that are SYNCED but not PAID
    const pendingPayouts = await this.prisma.payout.findMany({
      where: {
        AND: [{ qbBillId: { not: null } }, { status: { not: 'PAID' } }],
      },
      select: { id: true, qbBillId: true, payoutNumber: true },
    });

    if (pendingPayouts.length === 0) {
      this.logger.log(
        '[SyncBillStatus] No pending payouts with QBO Bills found.',
      );
      return { message: 'No pending payouts found', updated: 0 };
    }

    this.logger.log(
      `[SyncBillStatus] Checking ${pendingPayouts.length} pending bills...`,
    );
    let updatedCount = 0;

    // 2. Query QBO for these Bills
    // Optimization: If list is small, do individual checks. If large, do IN query (chunked).
    // For simplicity, let's do batch query logic.
    const chunks = this.chunkArray(pendingPayouts, 20);

    for (const chunk of chunks) {
      const ids = chunk.map((p) => `'${p.qbBillId}'`).join(',');
      const query = `select * from Bill where Id in (${ids})`;

      try {
        const response = await this.quickbooksService.makeApiCall(
          'GET',
          `/query?query=${encodeURIComponent(query)}`,
        );

        const bills = response.QueryResponse?.Bill || [];

        for (const bill of bills) {
          // 3. Check Balance
          if (bill.Balance === 0) {
            this.logger.log(
              `[SyncBillStatus] Bill ${bill.Id} (Payout) is PAID in QBO. Settling local payout...`,
            );

            // 4. Get Payment Details
            // LinkedTxn contains reference to Payment
            const paymentLink = bill.LinkedTxn?.find(
              (t: any) => t.TxnType === 'Payment',
            );
            let paymentDate = new Date(); // Default to now if not found

            if (paymentLink) {
              const payment = await this.quickbooksService.makeApiCall(
                'GET',
                `/payment/${paymentLink.TxnId}`,
              );
              if (payment && payment.Payment) {
                paymentDate = new Date(payment.Payment.TxnDate);
              }
            } else {
              // Fallback: Use bill MetaData last updated? Or just today.
            }

            // 5. Settle Payout
            const localPayout = pendingPayouts.find(
              (p) => p.qbBillId === bill.Id,
            );
            if (localPayout) {
              await this.payoutService.settlePayout(
                localPayout.id,
                paymentDate,
              );
              updatedCount++;
            }
          }
        }
      } catch (e) {
        this.logger.error('[SyncBillStatus] Failed to query QBO', e);
      }
    }

    return {
      message: 'Sync complete',
      checked: pendingPayouts.length,
      updated: updatedCount,
    };
  }

  async deleteBill(qbBillId: string) {
    if (!(await this.quickbooksService.isConnected())) {
      throw new Error('QuickBooks not connected');
    }
    await this.quickbooksService.deleteBill(qbBillId);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  }
}
