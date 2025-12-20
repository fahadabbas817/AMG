import { z } from 'zod'

export const vendorBankDetailsSchema = z
  .object({
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    bankAddress: z.string().min(1, 'Bank address is required'),
    ibanRouting: z.string().min(1, 'IBAN/Routing is required'),
    swiftCode: z.string().min(1, 'SWIFT code is required'),
    currency: z.string().min(1, 'Currency is required'),
    payoutMethod: z.string().min(1, 'Payout method is required'),
    paypalEmail: z
      .string()
      .email('Invalid PayPal email')
      .optional()
      .or(z.literal('')),
    accountType: z.string().min(1, 'Account type is required'),
  })
  .superRefine((data, ctx) => {
    if (data.payoutMethod === 'PAYPAL' && !data.paypalEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PayPal email is required when payout method is PAYPAL',
        path: ['paypalEmail'],
      })
    }
  })

export const vendorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  vendorNumber: z.string().min(1, 'Vendor number is required'),
  phone: z.string().min(1, 'Phone number is required'),
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
