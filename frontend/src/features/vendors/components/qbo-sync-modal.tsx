import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DiffField {
  matches: boolean
  local: string | null
  qbo: string | null
}

interface QboDiff {
  vendorId: string
  qbVendorId: string
  companyName: DiffField
  email: DiffField
  phone: DiffField
  address: DiffField
}

interface QboSyncModalProps {
  isOpen: boolean
  onClose: () => void
  diff: QboDiff | null
  vendorId: string
}

export function QboSyncModal({
  isOpen,
  onClose,
  diff,
  vendorId,
}: QboSyncModalProps) {
  const queryClient = useQueryClient()
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'companyName',
    'email',
    'phone',
    'address',
  ])

  const syncMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/quickbooks/vendors/${vendorId}/sync`, {
        fields: selectedFields,
      })
    },
    onSuccess: () => {
      toast.success('Vendor synced with QuickBooks')
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to sync vendor')
    },
  })

  if (!diff) return null

  const renderFieldDiff = (fieldKey: keyof QboDiff, field: DiffField) => {
    const isSelected = selectedFields.includes(String(fieldKey))
    return (
      <div
        className={`grid grid-cols-[1fr,auto,1fr] items-center gap-4 rounded-md border p-3 ${field.matches ? 'border-green-100 bg-green-50/50' : 'border-yellow-100 bg-yellow-50/50'}`}
      >
        <div className='bg-red-200'>
          <p className='text-muted-foreground mb-1 text-xs font-medium'>
            AMG App
          </p>
          <div className='text-sm font-medium'>
            {field.local || (
              <span className='text-muted-foreground italic'>Empty</span>
            )}
          </div>
        </div>

        <div className='flex flex-col items-center justify-center'>
          {field.matches ? (
            <Badge
              variant='outline'
              className='border-green-200 bg-green-100 text-green-700'
            >
              Match
            </Badge>
          ) : (
            <ArrowRight className='text-muted-foreground h-4 w-4' />
          )}
        </div>

        <div>
          <p className='text-muted-foreground mb-1 text-xs font-medium'>
            QuickBooks
          </p>
          <div className='text-sm font-medium text-blue-700'>
            {field.qbo || (
              <span className='text-muted-foreground italic'>Empty</span>
            )}
          </div>
        </div>

        {!field.matches && (
          <div className='col-span-3 flex justify-end'>
            <label className='flex cursor-pointer items-center gap-2 text-xs'>
              <input
                type='checkbox'
                checked={isSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFields([...selectedFields, String(fieldKey)])
                  } else {
                    setSelectedFields(
                      selectedFields.filter((f) => f !== String(fieldKey))
                    )
                  }
                }}
                className='rounded border-gray-300'
              />
              Generic Sync
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Sync with QuickBooks</DialogTitle>
          <DialogDescription>
            Review differences below. Check the boxes to overwrite local App
            data with QuickBooks data.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Only show fields that usually map */}
          <div className='space-y-4'>
            {renderFieldDiff('companyName', diff.companyName)}
            {renderFieldDiff('email', diff.email)}
            {renderFieldDiff('phone', diff.phone)}
            {renderFieldDiff('address', diff.address)}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            Sync Selected Fields
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
