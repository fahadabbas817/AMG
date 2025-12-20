import { useState } from 'react'
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { useGetSplits, useRemoveSplit, PlatformSplit } from '../api/splits'
import { AddSplitDialog, EditSplitDialog } from './split-dialogs'

interface VendorSplitsListProps {
  vendorId: string
}

export function VendorSplitsList({ vendorId }: VendorSplitsListProps) {
  const { data: splits, isLoading } = useGetSplits(vendorId)
  const { mutateAsync: removeSplit, isPending } = useRemoveSplit(vendorId)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingSplit, setEditingSplit] = useState<PlatformSplit | null>(null)
  const [deletingSplit, setDeletingSplit] = useState<PlatformSplit | null>(null)

  const handleDelete = async () => {
    if (!deletingSplit) return
    try {
      await removeSplit(deletingSplit.id)
      toast.success('Split removed')
      setDeletingSplit(null)
    } catch (error) {
      toast.error('Failed to remove split')
    }
  }

  if (isLoading) {
    return (
      <div className='flex justify-center p-4'>
        <Loader2 className='h-6 w-6 animate-spin' />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div className='space-y-1.5'>
          <CardTitle>Platform Splits</CardTitle>
          <CardDescription>
            Manage platform-specific commission rates.
          </CardDescription>
        </div>
        <Button size='sm' onClick={() => setIsAddOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Add Split
        </Button>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Default Split</TableHead>
                <TableHead>Vendor Split</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {splits && splits.length > 0 ? (
                splits.map((split) => (
                  <TableRow key={split.id}>
                    <TableCell className='font-medium'>
                      {split.platform.name}
                    </TableCell>
                    <TableCell>
                      {(split.platform.defaultSplit * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell>{split.commissionRate}%</TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => setEditingSplit(split)}
                        >
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='text-destructive'
                          onClick={() => setDeletingSplit(split)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className='h-24 text-center'>
                    No splits configured.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AddSplitDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        vendorId={vendorId}
      />

      <EditSplitDialog
        open={!!editingSplit}
        onOpenChange={(open) => !open && setEditingSplit(null)}
        vendorId={vendorId}
        split={editingSplit}
      />

      <ConfirmDeleteDialog
        open={!!deletingSplit}
        onOpenChange={(open) => {
          if (!open) setDeletingSplit(null)
        }}
        onConfirm={handleDelete}
        title='Are you sure?'
        description={`This will remove the platform link. The vendor will no longer be associated with ${deletingSplit?.platform.name}.`}
        isPending={isPending}
      />
    </Card>
  )
}
