import { z } from 'zod'

export const vendorBankDetailsSchema = z
  .object({
    bankName: z.string().nullable().optional(),
    accountNumber: z.string().nullable().optional(),
    bankAddress: z.string().nullable().optional(),
    vendorAddress: z.string().nullable().optional(),
    ibanRouting: z.string().nullable().optional(),
    swiftCode: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    payoutMethod: z.string().nullable().optional(),
    paypalEmail: z.string().nullable().optional(),
    accountType: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Require "paypalEmail" (which acts as Wise Tag/Email) for PAYPAL, WISE, ZELLE
    const methodsRequiringEmail = ['PAYPAL', 'WISE', 'ZELLE']
    if (
      data.payoutMethod &&
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
  corporateName: z.string().nullable().optional(),
  dbaName: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  email: z.string().email('Invalid email address'),
  vendorNumber: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  contractSignatory: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  subLabels: z.array(
    z.object({ value: z.string().min(1, 'Label cannot be empty') })
  ),
  bankDetails: vendorBankDetailsSchema.optional(),
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
