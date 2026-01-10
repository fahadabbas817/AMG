export type Payout = {
  id: string
  payoutNumber: number
  vendorId: string
  totalAmount: number
  status: 'PENDING' | 'PAID'
  paymentDate: string | null
  createdAt: string
  updatedAt: string
  qbBillId?: string
  syncStatus?: 'NOT_SYNCED' | 'PENDING_SYNC' | 'SYNCED' | 'FAILED'
  vendor: {
    id: string
    companyName: string
    vendorNumber: string
    qbVendorId?: string
  }
}
