import { format } from 'date-fns'
import { toast } from 'sonner'
import { getChangedFields } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useApproveProfileRequest,
  useRejectProfileRequest,
} from '../api/useProfileRequests'

interface ReviewRequestDialogProps {
  request: any // Type should be ProfileChangeRequest
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewRequestDialog({
  request,
  open,
  onOpenChange,
}: ReviewRequestDialogProps) {
  const { mutate: approve, isPending: isApproving } = useApproveProfileRequest()
  const { mutate: reject, isPending: isRejecting } = useRejectProfileRequest()

  if (!request) return null

  const {
    vendor,
    oldData: rawOldData,
    newData: rawNewData,
    createdAt,
  } = request

  /* import { getChangedFields } from '@/lib/utils' needs to be added at top, but I can't add imports with replace_file_content easily without affecting whole file structure if not careful. */
  /* I'll assume I can just replace the block inside the component and handle imports separately or in same block if I can match enough context. */
  /* Actually, I need to do 2 replace calls: one for imports, one for body. */

  // Wait, I will use replace_file_content to replace the component body.

  const changes = getChangedFields(rawOldData, rawNewData)
  const changedKeys = Object.keys(changes)

  const handleApprove = () => {
    approve(request.id, {
      onSuccess: () => {
        toast.success('Approved', {
          description: 'Request approved and profile updated.',
        })
        onOpenChange(false)
      },
      onError: () =>
        toast.error('Error', { description: 'Failed to approve request.' }),
    })
  }

  const handleReject = () => {
    reject(request.id, {
      onSuccess: () => {
        toast.success('Rejected', { description: 'Request rejected.' })
        onOpenChange(false)
      },
      onError: () =>
        toast.error('Error', { description: 'Failed to reject request.' }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0'>
        <DialogHeader className='shrink-0 border-b px-6 py-4'>
          <DialogTitle>Review Profile Request</DialogTitle>
          <DialogDescription>
            Request from{' '}
            <span className='text-foreground font-semibold'>
              {vendor?.companyName}
            </span>{' '}
            ({vendor?.email})
            <br />
            Submitted on {format(new Date(createdAt), 'PPP p')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='flex-1 p-6'>
          {changedKeys.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center'>
              No changes detected or invalid data format.
            </div>
          ) : (
            <div className='overflow-hidden rounded-lg border'>
              <div className='bg-muted/50 grid grid-cols-3 border-b text-xs font-medium tracking-wider uppercase'>
                <div className='border-r p-3'>Field</div>
                <div className='border-r p-3'>Original Value</div>
                <div className='p-3'>New Value</div>
              </div>
              <div className='divide-y'>
                {changedKeys.map((key) => {
                  const { old: oldVal, new: newVal } = changes[key]

                  return (
                    <div
                      key={key}
                      className='hover:bg-muted/5 grid grid-cols-3 text-sm'
                    >
                      <div className='text-muted-foreground flex items-center border-r p-3 font-medium capitalize'>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className='text-muted-foreground border-r p-3 break-words'>
                        {oldVal !== null &&
                        oldVal !== undefined &&
                        oldVal !== '' ? (
                          String(oldVal)
                        ) : (
                          <span className='text-xs italic opacity-50'>
                            Empty
                          </span>
                        )}
                      </div>
                      <div className='text-foreground bg-blue-50/50 p-3 font-medium break-words dark:bg-blue-900/10'>
                        {newVal !== null &&
                        newVal !== undefined &&
                        newVal !== '' ? (
                          String(newVal)
                        ) : (
                          <span className='text-xs italic opacity-50'>
                            Clear Value
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className='bg-muted/10 shrink-0 gap-2 border-t px-6 py-4 sm:gap-0'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className='flex w-full justify-end gap-2 sm:w-auto'>
            <Button
              variant='destructive'
              onClick={handleReject}
              disabled={isRejecting || isApproving}
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isRejecting || isApproving}
              className='min-w-[100px]'
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
