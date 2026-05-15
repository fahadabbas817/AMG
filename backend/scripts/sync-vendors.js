"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const XLSX = __importStar(require("xlsx"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const client_1 = require("prisma/generated/client");
dotenv.config();
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const filePath = path.join(__dirname, '../../vendor records.csv');
    console.log(`Reading file from: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.error('File not found!');
        process.exit(1);
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`Found ${data.length} records in CSV.`);
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    for (const row of data) {
        try {
            const id = row['id'];
            const vendorNumber = row['vendorNumber'];
            const companyName = row['companyName'];
            const contactName = row['contactName'];
            const email = row['email'];
            const password = row['password']; // Should be hashed?
            let phone = row['phone'];
            const address = row['address'];
            const contractSignatory = row['contractSignatory'];
            const subLabelsRaw = row['subLabels'];
            const qbVendorId = row['qbVendorId'] ? String(row['qbVendorId']) : null;
            const corporateName = row['corporateName'];
            const dbaName = row['dbaName'];
            const taxId = row['taxId'];
            // CLEANUP
            if (phone && typeof phone === 'number') {
                phone = String(phone); // Handle scientific notation if excel parsed it as number
            }
            if (phone === '#ERROR!')
                phone = null;
            let subLabels = [];
            if (subLabelsRaw) {
                try {
                    // Attempt to parse JSON string like "[""Label1"", ""Label2""]"
                    // Excel sometimes double-quotes inside strings.
                    // The raw string from XLSX might already be a JS string if it was parsed as such,
                    // but if it looks like `["A","B"]` it needs parsing.
                    // If XLSX `sheet_to_json` parsed it, it might still be a string.
                    if (typeof subLabelsRaw === 'string') {
                        // Handle the double quote escaping from CSV if raw string has it
                        // But XLSX utils usually handle CSV escaping.
                        // Let's try JSON.parse first.
                        try {
                            subLabels = JSON.parse(subLabelsRaw);
                        }
                        catch (e) {
                            // If it fails, maybe it's not valid JSON.
                            // It might be `["Good Porn","Good Porn Productions"]`
                            // Let's just log it if it fails and proceed with empty or raw split
                            console.warn(`Could not parse subLabels for ${companyName}: ${subLabelsRaw}`);
                        }
                    }
                }
                catch (e) {
                    console.warn(`Error parsing subLabels for ${companyName}`, e);
                }
            }
            const vendorData = {
                vendorNumber: vendorNumber || undefined,
                companyName: companyName,
                contactName: contactName,
                email: email,
                password: password, // Note: If this is plain text 'temp_password_change_me', it will save as such.
                phone: phone,
                address: address,
                contractSignatory: contractSignatory,
                subLabels: subLabels,
                qbVendorId: qbVendorId,
                corporateName: corporateName,
                dbaName: dbaName,
                taxId: taxId,
            };
            // REMOVE UNDEFINED/NULL data to avoid overwriting with empty if not intended?
            // User said: "change the things that has changed and if not it shouldn't change them"
            // But we are reading the *new state* from CSV. So we should overwrite with what's in CSV.
            // Except if CSV has empty/null and DB has value?
            // User said "the client has done some changes in an excel file... like emails change... ids are there".
            // So the CSV is the SOURCE OF TRUTH.
            // I will assume if a column is missing in CSV (undefined), we might keep old value,
            // but `xls` usually gives us keys for empty cells as well if we configure it, or just misses them.
            // `sheet_to_json` skips empty cells by default.
            // We will perform an UPSERT strategy if ID exists.
            if (id) {
                // UPDATE EXISTING
                const existing = await prisma.vendor.findUnique({ where: { id } });
                if (existing) {
                    await prisma.vendor.update({
                        where: { id },
                        data: vendorData,
                    });
                    console.log(`Updated vendor: ${companyName} (${id})`);
                    updatedCount++;
                }
                else {
                    // ID exists in CSV but not in DB?
                    // User "downloaded the excel file from the neon database so ids are there".
                    // If it's not in DB, maybe it was deleted?
                    // I will attempt to create it with this ID.
                    console.log(`Vendor with ID ${id} not found in DB. Creating...`);
                    await prisma.vendor.create({
                        data: {
                            id,
                            ...vendorData,
                        },
                    });
                    console.log(`Created vendor (from missing ID): ${companyName} (${id})`);
                    createdCount++;
                }
            }
            else {
                // CREATE NEW
                console.log(`Creating NEW vendor: ${companyName}`);
                await prisma.vendor.create({
                    data: vendorData,
                });
                createdCount++;
            }
        }
        catch (error) {
            console.error(`Failed to process row for ${row['companyName'] || 'Unknown'}:`, error);
            errorCount++;
        }
    }
    console.log('--- SYNC COMPLETE ---');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
