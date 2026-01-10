import { useState } from 'react'
import { UserPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QboGlobalSyncModal } from './qbo-global-sync-modal'
import { useVendors } from './vendors-provider'

export function VendorsPrimaryButtons() {
  const { setOpen } = useVendors()
  const [showSync, setShowSync] = useState(false)

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={() => setShowSync(true)}
      >
        <RefreshCw size={16} />{' '}
        <span className='hidden sm:inline'>Sync from QBO</span>
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Add Vendor</span> <UserPlus size={18} />
      </Button>

      <QboGlobalSyncModal
        isOpen={showSync}
        onClose={() => setShowSync(false)}
      />
    </div>
  )
}
