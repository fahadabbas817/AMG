export interface VendorBankDetails {
  bankName: string
  accountNumber: string
  bankAddress: string
  ibanRouting: string
  swiftCode: string
  currency: string
  payoutMethod: string
  paypalEmail: string
  accountType: string
}

export interface Platform {
  id: string
  name: string
  corporateName?: string
  defaultSplit: number
}

export interface PlatformSplit {
  id: string
  vendorId: string
  platformId: string
  commissionRate: number
  platform: Platform
}

export interface Vendor {
  id: string
  companyName: string
  contactName: string
  email: string
  vendorNumber: string
  phone: string
  address: string
  contractSignatory: string
  subLabels: string[]
  platformSplits?: PlatformSplit[]
  // For frontend display/edit primarily
  password?: string
  bankDetails: VendorBankDetails
}

export interface CreateVendorDTO extends Omit<Vendor, 'id'> {
  password?: string
  platformIds?: string[]
}

export interface UpdateVendorDTO extends Partial<CreateVendorDTO> {}

export interface VendorsApiResponse {
  data: Vendor[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
