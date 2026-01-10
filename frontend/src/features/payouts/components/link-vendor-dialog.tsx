import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface LinkVendorDialogProps {
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
}

export function LinkVendorDialog({
  isOpen,
  onClose,
  vendorId,
  vendorName,
}: LinkVendorDialogProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  // Search Query
  const {
    data: searchResults,
    isFetching: isSearchingApi,
    refetch: search,
  } = useQuery({
    queryKey: ['qbo-search', searchQuery],
    queryFn: async () => {
      const res = await api.get(
        `/quickbooks/vendors/search?query=${searchQuery}`
      )
      return res.data
    },
    enabled: false,
  })

  // Link Mutation
  const linkMutation = useMutation({
    mutationFn: async (qboId: string) => {
      await api.patch(`/quickbooks/vendors/${vendorId}/link`, {
        qbVendorId: qboId,
      })
    },
    onSuccess: () => {
      toast.success('Linked to QuickBooks vendor')
      queryClient.invalidateQueries({ queryKey: ['payouts'] }) // Refresh payouts to see updated status
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      onClose()
    },
    onError: (error: any) => {
      toast.error('Failed to link vendor')
      console.error(error)
    },
  })

  const handleSearch = () => {
    if (searchQuery.length > 2) {
      search()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Vendor to QuickBooks</DialogTitle>
          <DialogDescription>
            Search for "{vendorName}" in QuickBooks to link them.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex gap-2'>
            <Input
              placeholder='Search by name...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearchingApi}>
              {isSearchingApi ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Search className='h-4 w-4' />
              )}
            </Button>
          </div>

          {searchResults && (
            <div className='max-h-60 divide-y overflow-y-auto rounded-md border'>
              {searchResults.length === 0 && (
                <div className='text-muted-foreground p-3 text-center text-sm'>
                  No results found.
                </div>
              )}
              {searchResults.map((v: any) => (
                <div
                  key={v.Id}
                  className='hover:bg-muted/50 flex items-center justify-between p-2'
                >
                  <div>
                    <div className='text-sm font-medium'>{v.DisplayName}</div>
                    <div className='text-muted-foreground text-xs'>
                      {v.CompanyName}
                    </div>
                  </div>
                  <Button
                    size='sm'
                    variant='secondary'
                    onClick={() => linkMutation.mutate(v.Id)}
                    disabled={linkMutation.isPending}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
