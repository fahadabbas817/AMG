import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVendors } from './vendors-provider'

export function VendorsPrimaryButtons() {
  const { setOpen } = useVendors()
  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Add Vendor</span> <UserPlus size={18} />
      </Button>
    </div>
  )
}
