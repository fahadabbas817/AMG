export type Payout = {
  id: string
  payoutNumber: number
  vendorId: string
  totalAmount: number
  status: 'PENDING' | 'PAID'
  paymentDate: string | null
  createdAt: string
  updatedAt: string
  vendor: {
    id: string
    companyName: string
    vendorNumber: string
  }
}
