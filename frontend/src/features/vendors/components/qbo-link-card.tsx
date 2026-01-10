import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Loader2, Link as LinkIcon, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QboSyncModal } from './qbo-sync-modal'

interface Props {
  vendorId: string
  qbVendorId: string | null | undefined
}

export function QboLinkCard({ vendorId, qbVendorId }: Props) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)

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
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      setIsSearching(false)
    },
  })

  // Diff Query
  const {
    data: diffData,
    isFetching: isDiffing,
    refetch: checkDiff,
  } = useQuery({
    queryKey: ['qbo-diff', vendorId],
    queryFn: async () => {
      const res = await api.get(`/quickbooks/vendors/${vendorId}/diff`)
      return res.data
    },
    enabled: false,
  })

  const handleSearch = () => {
    if (searchQuery.length > 2) {
      search()
    }
  }

  const handleCheckSync = async () => {
    const res = await checkDiff()
    if (res.isSuccess) {
      setShowSyncModal(true)
    }
  }

  if (qbVendorId) {
    return (
      <>
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100'>
                  <LinkIcon className='h-4 w-4 text-green-600' />
                </div>
                <div>
                  <CardTitle className='text-base'>QuickBooks Linked</CardTitle>
                  <CardDescription>ID: {qbVendorId}</CardDescription>
                </div>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCheckSync}
                disabled={isDiffing}
              >
                {isDiffing ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <RefreshCw className='mr-2 h-4 w-4' />
                )}
                Check Updates
              </Button>
            </div>
          </CardHeader>
        </Card>

        {diffData && (
          <QboSyncModal
            isOpen={showSyncModal}
            onClose={() => setShowSyncModal(false)}
            diff={diffData}
            vendorId={vendorId}
          />
        )}
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <img
            src='https://cdn.worldvectorlogo.com/logos/quickbooks-1.svg'
            alt='QBO'
            className='h-5 w-5'
          />
          Connect to QuickBooks
        </CardTitle>
        <CardDescription>
          Link this vendor to a QuickBooks Online vendor record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSearching ? (
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
              <div className='max-h-48 divide-y overflow-y-auto rounded-md border'>
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

            <Button
              variant='ghost'
              size='sm'
              className='text-muted-foreground w-full'
              onClick={() => setIsSearching(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant='outline'
            className='w-full'
            onClick={() => setIsSearching(true)}
          >
            <LinkIcon className='mr-2 h-4 w-4' />
            Link Existing Vendor
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
