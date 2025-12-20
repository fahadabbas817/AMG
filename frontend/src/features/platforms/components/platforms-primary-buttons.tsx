import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlatforms } from './platforms-provider'

export function PlatformsPrimaryButtons() {
  const { setOpen } = usePlatforms()

  return (
    <div className='flex gap-2'>
      <Button onClick={() => setOpen('create')}>
        <Plus className='mr-2 h-4 w-4' />
        Add Platform
      </Button>
    </div>
  )
}
