import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SyncPreview {
  conflicts: any[]
  newVendors: any[]
  totalLocal: number
  totalQbo: number
}

interface QboGlobalSyncModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QboGlobalSyncModal({
  isOpen,
  onClose,
}: QboGlobalSyncModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('conflicts')

  // State
  const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set())

  // Track resolutions: "vendorId-field" -> "LOCAL" | "QBO"
  // If a key is present, it means the user has made a choice for that conflict.
  const [resolutions, setResolutions] = useState<
    Record<string, 'LOCAL' | 'QBO'>
  >({})

  const {
    data: preview,
    isPending: isLoadingPreview,
    error,
  } = useQuery<SyncPreview>({
    queryKey: ['qbo-sync-preview'],
    queryFn: async () => {
      const res = await api.get('/quickbooks/sync/preview')
      return res.data
    },
    enabled: isOpen,
    staleTime: 0,
  })

  // Count active conflicts (items that need resolution)
  // For now, we only count items where a resolution is SELECTED.
  // Or better: show total conflicts available vs resolved.

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Transform resolutions state into payload
      // Group by vendorId
      const conflictsMap = new Map<
        string,
        {
          qbVendorId: string
          resolutions: { field: string; direction: string }[]
        }
      >()

      Object.entries(resolutions).forEach(([key, direction]) => {
        const [vendorId, field] = key.split(':')

        if (!conflictsMap.has(vendorId)) {
          const conflictItem = preview?.conflicts.find(
            (c) => c.vendorId === vendorId
          )
          if (conflictItem) {
            conflictsMap.set(vendorId, {
              qbVendorId: conflictItem.qbVendorId,
              resolutions: [],
            })
          }
        }

        const vendorEntry = conflictsMap.get(vendorId)
        if (vendorEntry) {
          vendorEntry.resolutions.push({ field, direction })
        }
      })

      const conflictsPayload = Array.from(conflictsMap.entries()).map(
        ([vendorId, data]) => ({
          vendorId,
          qbVendorId: data.qbVendorId,
          resolutions: data.resolutions,
        })
      )

      const importsPayload = Array.from(selectedImports).map((qbId) => ({
        qbId,
      }))

      return api.post('/quickbooks/sync/batch', {
        conflicts: conflictsPayload,
        imports: importsPayload,
      })
    },
    onSuccess: (data) => {
      const { updated, imported, errors } = data.data

      if (errors.length > 0) {
        toast.warning('Sync completed with issues', {
          description: (
            <div className='mt-2 max-h-[200px] overflow-auto text-xs'>
              {errors.map((e: string, i: number) => (
                <div key={i} className='mb-1 border-b pb-1 last:border-0'>
                  {e}
                </div>
              ))}
            </div>
          ),
          duration: 10000,
        })
      } else {
        toast.success(`Sync Complete`, {
          description: `Updated ${updated} vendors, Imported ${imported} new vendors.`,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setResolutions({})
      setSelectedImports(new Set())
      onClose()
    },
    onError: (err: any) => {
      toast.error('Sync failed', {
        description:
          err?.response?.data?.message ||
          err.message ||
          'Unknown error occurred',
      })
    },
  })

  const toggleImport = (qbId: string) => {
    const next = new Set(selectedImports)
    if (next.has(qbId)) next.delete(qbId)
    else next.add(qbId)
    setSelectedImports(next)
  }

  const handleResolutionChange = (
    vendorId: string,
    field: string,
    value: 'LOCAL' | 'QBO'
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [`${vendorId}:${field}`]: value,
    }))
  }

  const clearResolution = (vendorId: string, field: string) => {
    const next = { ...resolutions }
    delete next[`${vendorId}:${field}`]
    setResolutions(next)
  }

  if (!isOpen) return null

  const resolvedCount = Object.keys(resolutions).length
  const importCount = selectedImports.size

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>QuickBooks Global Sync</DialogTitle>
          <DialogDescription>
            Resolve data conflicts and import new vendors from QuickBooks
            Online.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreview ? (
          <div className='flex flex-col items-center justify-center space-y-4 py-12'>
            <Loader2 className='text-primary h-8 w-8 animate-spin' />
            <p className='text-muted-foreground'>
              Analyzing database vs QuickBooks...
            </p>
          </div>
        ) : error ? (
          <div className='text-destructive flex flex-col items-center justify-center space-y-2 py-12'>
            <AlertTriangle className='h-8 w-8' />
            <p>Failed to load sync preview</p>
            <Button
              variant='outline'
              onClick={() =>
                queryClient.refetchQueries({ queryKey: ['qbo-sync-preview'] })
              }
            >
              Retry
            </Button>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex flex-1 flex-col overflow-hidden'
          >
            <div className='flex items-center justify-between border-b px-1 pb-2'>
              <TabsList>
                <TabsTrigger value='conflicts' className='relative'>
                  Conflicts
                  {preview.conflicts.length > 0 && (
                    <Badge
                      variant='destructive'
                      className='ml-2 h-5 px-1.5 text-xs'
                    >
                      {preview.conflicts.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value='new' className='relative'>
                  New in QuickBooks
                  {preview.newVendors.length > 0 && (
                    <Badge
                      variant='secondary'
                      className='ml-2 h-5 px-1.5 text-xs'
                    >
                      {preview.newVendors.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <div className='text-muted-foreground text-xs'>
                Total Synced: {preview.totalLocal - preview.conflicts.length} /{' '}
                {preview.totalLocal}
              </div>
            </div>

            <div className='mt-2 flex-1 overflow-hidden'>
              <TabsContent value='conflicts' className='m-0 h-full'>
                <ScrollArea className='h-[55vh] pr-4'>
                  {preview.conflicts.length === 0 ? (
                    <div className='text-muted-foreground flex h-full flex-col items-center justify-center space-y-2 p-8 text-sm'>
                      <CheckCircleIcon className='h-12 w-12 text-green-500 opacity-50' />
                      <p>
                        No conflicts found. All matched vendors are in sync.
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-6 pb-6'>
                      {preview.conflicts.map((conflict) => (
                        <div
                          key={conflict.vendorId}
                          className='bg-card rounded-lg border shadow-sm'
                        >
                          <div className='bg-muted/40 flex items-center justify-between border-b px-4 py-3'>
                            <div className='flex items-center gap-3'>
                              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700'>
                                {conflict.vendorName.charAt(0)}
                              </div>
                              <div>
                                <h4 className='text-sm font-semibold'>
                                  {conflict.vendorName}
                                </h4>
                                <div className='text-muted-foreground flex gap-2 text-xs'>
                                  <span title={conflict.vendorId}>
                                    ID: ...{conflict.vendorId.slice(-6)}
                                  </span>
                                  <span>•</span>
                                  <span>QB ID: {conflict.qbVendorId}</span>
                                </div>
                              </div>
                            </div>
                            {/* Actions for bulk select? Maybe later */}
                          </div>

                          <div className='p-0'>
                            {['companyName', 'email', 'phone', 'address'].map(
                              (key) => {
                                const field = conflict.changes[key]
                                if (field.matches) return null

                                // Debug: Inspect why qbo field might be empty

                                const resolutionKey = `${conflict.vendorId}:${key}`
                                const selection = resolutions[resolutionKey]

                                return (
                                  <div
                                    key={key}
                                    className={`hover:bg-muted/5 grid grid-cols-[1fr,120px,1fr] items-stretch gap-4 border-b px-4 py-4 transition-colors last:border-0`}
                                  >
                                    {/* Local Side */}
                                    <div
                                      className={`relative flex cursor-pointer flex-col justify-center rounded-md border p-3 transition-all ${selection === 'LOCAL' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-muted/10 border-transparent'} `}
                                      onClick={() =>
                                        handleResolutionChange(
                                          conflict.vendorId,
                                          key,
                                          'LOCAL'
                                        )
                                      }
                                    >
                                      <div className='flex items-start gap-3'>
                                        <div className='mt-1'>
                                          <div
                                            className={`border-primary h-4 w-4 rounded-full border ${selection === 'LOCAL' ? 'bg-primary' : 'bg-transparent'} flex items-center justify-center`}
                                          >
                                            {selection === 'LOCAL' && (
                                              <div className='h-2 w-2 rounded-full bg-white' />
                                            )}
                                          </div>
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                          <p className='text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase'>
                                            Local Database
                                          </p>
                                          <div
                                            className={`text-sm break-words ${selection === 'LOCAL' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                                          >
                                            {field.local || (
                                              <span className='italic opacity-70'>
                                                Empty
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {selection === 'LOCAL' && (
                                        <div className='absolute top-2 right-2'>
                                          <Badge
                                            variant='secondary'
                                            className='h-5 bg-blue-100 px-1 text-[10px] text-blue-700 hover:bg-blue-100'
                                          >
                                            Will Overwrite QBO
                                          </Badge>
                                        </div>
                                      )}
                                    </div>

                                    {/* Divider / Status */}
                                    <div className='flex flex-col items-center justify-center gap-2'>
                                      <Badge
                                        variant='outline'
                                        className='text-[10px] tracking-wide uppercase'
                                      >
                                        {key === 'companyName' ? 'Name' : key}
                                      </Badge>
                                      {selection ? (
                                        <Button
                                          variant='ghost'
                                          size='icon'
                                          className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            clearResolution(
                                              conflict.vendorId,
                                              key
                                            )
                                          }}
                                          title='Reset Selection'
                                        >
                                          <RefreshCw className='h-4 w-4' />
                                        </Button>
                                      ) : (
                                        <div className='bg-border h-full w-px' />
                                      )}
                                    </div>

                                    {/* QBO Side */}
                                    <div
                                      className={`relative flex cursor-pointer flex-col justify-center rounded-md border p-3 transition-all ${selection === 'QBO' ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'hover:bg-muted/10 border-transparent'} `}
                                      onClick={() =>
                                        handleResolutionChange(
                                          conflict.vendorId,
                                          key,
                                          'QBO'
                                        )
                                      }
                                    >
                                      <div className='flex items-start gap-3'>
                                        <div className='mt-1'>
                                          <div
                                            className={`border-primary h-4 w-4 rounded-full border ${selection === 'QBO' ? 'bg-primary' : 'bg-transparent'} flex items-center justify-center`}
                                          >
                                            {selection === 'QBO' && (
                                              <div className='h-2 w-2 rounded-full bg-white' />
                                            )}
                                          </div>
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                          <p className='text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase'>
                                            QuickBooks Online
                                          </p>
                                          <div
                                            className={`text-sm break-words ${selection === 'QBO' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                                          >
                                            {field.qbo || (
                                              <span className='italic opacity-70'>
                                                Empty
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {selection === 'QBO' && (
                                        <div className='absolute top-2 right-2'>
                                          <Badge
                                            variant='secondary'
                                            className='h-5 bg-orange-100 px-1 text-[10px] text-orange-700 hover:bg-orange-100'
                                          >
                                            Will Overwrite Local
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              }
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value='new' className='m-0 h-full'>
                <ScrollArea className='h-[55vh]'>
                  {preview.newVendors.length === 0 ? (
                    <div className='text-muted-foreground flex h-full items-center justify-center p-8 text-sm'>
                      No new vendors found in QuickBooks.
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 divide-y px-1'>
                      {preview.newVendors.map((vendor) => (
                        <div
                          key={vendor.qbId}
                          className='hover:bg-accent/5 mb-2 flex items-center justify-between rounded-md border p-4 last:mb-0'
                        >
                          <div className='grid gap-1'>
                            <h4 className='text-sm font-semibold'>
                              {vendor.displayName}
                            </h4>
                            <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                              <span>{vendor.email || 'No Email'}</span>
                              <span>{vendor.phone || 'No Phone'}</span>
                            </div>
                          </div>
                          <div className='flex items-center gap-3'>
                            {selectedImports.has(vendor.qbId) && (
                              <Badge
                                variant='secondary'
                                className='bg-green-100 text-green-700 hover:bg-green-100'
                              >
                                Ready to Import
                              </Badge>
                            )}
                            <Checkbox
                              checked={selectedImports.has(vendor.qbId)}
                              onCheckedChange={() => toggleImport(vendor.qbId)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter className='mt-4 flex items-center justify-between border-t pt-4'>
          <div className='text-muted-foreground text-sm'>
            {resolvedCount > 0 || importCount > 0 ? (
              <span className='flex items-center gap-2'>
                <Badge>{resolvedCount}</Badge> conflicts resolved,{' '}
                <Badge variant='secondary'>{importCount}</Badge> imports
                selected.
              </span>
            ) : (
              <span>No changes selected.</span>
            )}
          </div>

          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={onClose}
              disabled={syncMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={
                syncMutation.isPending ||
                (resolvedCount === 0 && importCount === 0)
              }
            >
              {syncMutation.isPending && (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              )}
              Confirm & Sync
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
      <polyline points='22 4 12 14.01 9 11.01' />
    </svg>
  )
}
