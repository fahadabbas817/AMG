import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { ChevronDown, ChevronRight, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AssignVendorDialog } from './assign-vendor-dialog'

interface UnallocatedGroup {
  rawVendorName: string
  totalRevenue: number
  recordCount: number
  details?: any[] // Loaded via expansion
}

export function UnallocatedTable({
  data,
  isLoading,
}: {
  data: UnallocatedGroup[]
  isLoading: boolean
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  )
  const [detailsCache, setDetailsCache] = useState<Record<string, any[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>(
    {}
  )

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedGroupForAssign, setSelectedGroupForAssign] = useState<
    string | null
  >(null)

  const queryClient = useQueryClient()

  // Toggle Collapse
  const toggleGroup = async (rawVendorName: string) => {
    const isExpanded = !!expandedGroups[rawVendorName]

    setExpandedGroups((prev) => ({
      ...prev,
      [rawVendorName]: !isExpanded,
    }))

    if (!isExpanded && !detailsCache[rawVendorName]) {
      // Fetch details if opening
      setLoadingDetails((prev) => ({ ...prev, [rawVendorName]: true }))
      try {
        const safeName = rawVendorName || '__EMPTY__'
        const encodedName = encodeURIComponent(safeName)
        const response = await api.get<any[]>(
          `/revenue/unallocated/${encodedName}/details`
        )
        setDetailsCache((prev) => ({
          ...prev,
          [rawVendorName]: response.data,
        }))
      } catch (err) {
        toast.error('Failed to load details')
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [rawVendorName]: false }))
      }
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (recordIds: string[]) => {
      return api.delete('/revenue/unallocated', { data: { recordIds } })
    },
    onSuccess: (res) => {
      toast.success(`Deleted ${res.data.count} records`)
      queryClient.invalidateQueries({ queryKey: ['unallocated-groups'] })
      // Clear cache for deleted?
      setDetailsCache({})
    },
  })

  const handleDeleteGroup = (group: UnallocatedGroup) => {
    toast.promise(
      async () => {
        const safeName = group.rawVendorName || '__EMPTY__'
        const encodedName = encodeURIComponent(safeName)
        const res = await api.get<any[]>(
          `/revenue/unallocated/${encodedName}/details`
        )
        const ids = res.data.map((r) => r.id)
        await deleteMutation.mutateAsync(ids)
      },
      {
        loading: 'Deleting records...',
        success: 'Records deleted',
        error: 'Failed to delete',
      }
    )
  }

  const handleDeleteRecord = (recordId: string) => {
    deleteMutation.mutate([recordId])
  }

  if (isLoading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'></TableHead>
              <TableHead>Raw Vendor Name</TableHead>
              <TableHead className='text-right'>Total Records</TableHead>
              <TableHead className='text-right'>Total Revenue</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center'>
                  No unallocated funds found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((group) => {
                const isExpanded = expandedGroups[group.rawVendorName]
                const details = detailsCache[group.rawVendorName]
                const isLoadingThis = loadingDetails[group.rawVendorName]

                return (
                  <>
                    <TableRow key={group.rawVendorName} className='group'>
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => toggleGroup(group.rawVendorName)}
                        >
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className='font-medium'>
                        {group.rawVendorName || (
                          <span className='text-muted-foreground italic'>
                            Unknown / Missing
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Badge variant='secondary' className='rounded-sm'>
                          {group.recordCount} records
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right font-mono'>
                        {formatCurrency(group.totalRevenue)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                              setSelectedGroupForAssign(group.rawVendorName)
                              setAssignDialogOpen(true)
                            }}
                          >
                            <UserPlus className='mr-2 h-4 w-4' />
                            Assign
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size='sm' variant='destructive'>
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete all records?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete all {group.recordCount}{' '}
                                  unallocated records for "{group.rawVendorName}
                                  ". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteGroup(group)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className='bg-muted/50'>
                        <TableCell colSpan={5} className='p-4'>
                          {isLoadingThis ? (
                            <Skeleton className='h-20 w-full' />
                          ) : details ? (
                            <div className='bg-background overflow-x-auto rounded-md border'>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Invoice/Ref</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className='text-right'>
                                      Amount
                                    </TableHead>
                                    <TableHead className='w-[50px]'></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {details.map((record: any) => (
                                    <TableRow key={record.id}>
                                      <TableCell>
                                        {new Date(
                                          record.periodStart
                                        ).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>
                                        {record.platform?.name || 'Unknown'}
                                      </TableCell>
                                      <TableCell>
                                        {record.report?.invoiceRef || record.report?.filename || 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        {record.lineItemName}
                                      </TableCell>
                                      <TableCell className='text-right'>
                                        {formatCurrency(record.grossRevenue)}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant='ghost'
                                          size='icon'
                                          className='text-destructive h-8 w-8'
                                          onClick={() =>
                                            handleDeleteRecord(record.id)
                                          }
                                        >
                                          <Trash2 className='h-3 w-3' />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className='text-muted-foreground py-4 text-center text-sm'>
                              No details found.
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedGroupForAssign !== null && (
        <AssignVendorDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          rawVendorName={selectedGroupForAssign}
          onSuccess={() => {
            // Determine logic? The parent query invalidation in dialog handles refetch
          }}
        />
      )}
    </>
  )
}
