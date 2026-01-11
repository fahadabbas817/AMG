import { Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ConnectQboButton() {
  const handleConnect = () => {
    // Open the backend auth/connect endpoint in a new window/popup
    const width = 800
    const height = 600
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/quickbooks/auth/connect`

    const popup = window.open(
      url,
      'Connect QuickBooks Account',
      `width=${width},height=${height},top=${top},left=${left}`
    )

    const handleMessage = (event: MessageEvent) => {
      // Basic security check: ensure message comes from expected origin if possible
      if (event.data === 'qbo-connected') {
        popup?.close()
        // Optional: reload or show success toast
        window.location.reload()
      }
    }

    window.addEventListener('message', handleMessage)
  }

  return (
    <Button
      onClick={handleConnect}
      className='bg-[#2CA01C] text-white hover:bg-[#2CA01C]/90'
    >
      <Plug className='mr-2 h-4 w-4' />
      Connect QuickBooks
    </Button>
  )
}
