import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettlePayout } from '@/features/payouts/api/useSettlePayout'

interface SettlePayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payoutId: string
  payoutNumber: number
}

export function SettlePayoutDialog({
  open,
  onOpenChange,
  payoutId,
  payoutNumber,
}: SettlePayoutDialogProps) {
  const [date, setDate] = useState('')
  const { mutate, isPending } = useSettlePayout()

  const handleSettle = () => {
    if (!date) return
    mutate(
      { id: payoutId, paymentDate: date },
      {
        onSuccess: () => {
          onOpenChange(false)
          setDate('')
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Settle Payout #{payoutNumber}</DialogTitle>
          <DialogDescription>
            Mark this payout as paid by selecting the payment date.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='payment-date' className='text-right'>
              Date
            </Label>
            <Input
              id='payment-date'
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='col-span-3'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSettle} disabled={!date || isPending}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
