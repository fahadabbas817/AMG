import React, { createContext, useContext, useState } from 'react'
import { Platform } from '../types'

interface PlatformsContextType {
  open: 'create' | 'update' | 'delete' | null
  setOpen: (type: PlatformsContextType['open']) => void
  currentRow: Platform | null
  setCurrentRow: (row: Platform | null) => void
}

const PlatformsContext = createContext<PlatformsContextType | null>(null)

interface PlatformsProviderProps {
  children: React.ReactNode
}

export function PlatformsProvider({ children }: PlatformsProviderProps) {
  const [open, setOpen] = useState<PlatformsContextType['open']>(null)
  const [currentRow, setCurrentRow] = useState<Platform | null>(null)

  return (
    <PlatformsContext.Provider
      value={{ open, setOpen, currentRow, setCurrentRow }}
    >
      {children}
    </PlatformsContext.Provider>
  )
}

export const usePlatforms = () => {
  const context = useContext(PlatformsContext)

  if (!context) {
    throw new Error('usePlatforms must be used within a PlatformsProvider')
  }

  return context
}
