import { z } from 'zod'

export const vendorBankDetailsSchema = z
  .object({
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    bankAddress: z.string().min(1, 'Bank address is required'),
    vendorAddress: z.string().optional(), // New field
    ibanRouting: z.string().optional(), // Made optional per request
    swiftCode: z.string().optional(), // DB allows null, so make optional
    currency: z.string().min(1, 'Currency is required'),
    payoutMethod: z.string().min(1, 'Payout method is required'),
    paypalEmail: z.string().optional().or(z.literal('')),
    accountType: z.string().optional(), // Changed to optional or dropdown value
  })
  .superRefine((data, ctx) => {
    // Require "paypalEmail" (which acts as Wise Tag/Email) for PAYPAL, WISE, ZELLE
    const methodsRequiringEmail = ['PAYPAL', 'WISE', 'ZELLE']
    if (
      methodsRequiringEmail.includes(data.payoutMethod) &&
      !data.paypalEmail
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'This field is required for the selected payout method',
        path: ['paypalEmail'],
      })
    }
  })

export const vendorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  corporateName: z.string().optional(),
  dbaName: z.string().optional(),
  taxId: z.string().optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  vendorNumber: z.string().min(1, 'Vendor number is required'),
  phone: z.string().optional(), // Made optional
  address: z.string().min(1, 'Address is required'),
  contractSignatory: z.string().min(1, 'Contract signatory is required'),
  password: z.string().optional(),
  subLabels: z.array(
    z.object({ value: z.string().min(1, 'Label cannot be empty') })
  ),
  bankDetails: vendorBankDetailsSchema,
  // Section 5: Platforms (Bonus) - Schema only, might not be in DTO yet
  platformIds: z.array(z.string()).optional(),
})

export type VendorFormSchema = z.infer<typeof vendorSchema>

// Relaxed schema for updates: explicit optionality for everything
export const vendorUpdateSchema = vendorSchema.partial()

// But we might want some deep partials for objects like bankDetails?
// zod .partial() is shallow. access bankDetails and make it partial too.
// Actually, nested objects in .partial() are NOT automatically partial.
// So we need to construct it manually or use a deep partial util if we had one.
// Better approach: Re-define update schema to be partial of the base.
export const vendorUpdateFormSchema = vendorSchema
  .extend({
    bankDetails: vendorBankDetailsSchema.partial(),
    // arrays like subLabels are already optional in base or handled
    subLabels: z.array(z.object({ value: z.string().optional() })).optional(),
  })
  .partial()
