import React, { useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { Vendor } from '../types'

type VendorsDialogType = 'add' | 'edit' | 'delete' | 'details' | 'splits'

type VendorsContextType = {
  open: VendorsDialogType | null
  setOpen: (str: VendorsDialogType | null) => void
  currentRow: Vendor | null
  setCurrentRow: React.Dispatch<React.SetStateAction<Vendor | null>>
}

const VendorsContext = React.createContext<VendorsContextType | null>(null)

export function VendorsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<VendorsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<Vendor | null>(null)

  return (
    <VendorsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </VendorsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useVendors = () => {
  const vendorsContext = React.useContext(VendorsContext)

  if (!vendorsContext) {
    throw new Error('useVendors has to be used within <VendorsContext>')
  }

  return vendorsContext
}
