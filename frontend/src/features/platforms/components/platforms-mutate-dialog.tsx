import { useFormContext } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreatePlatform } from '../api/useCreatePlatform'
import { useUpdatePlatform } from '../api/useUpdatePlatform'
import { PlatformFormSchema } from '../data/schema'
import { Platform } from '../types'
import { PlatformForm } from './platform-form'

interface PlatformsMutateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Platform
}

export function PlatformsMutateDialog({
  open,
  onOpenChange,
  currentRow,
}: PlatformsMutateDialogProps) {
  const isUpdate = !!currentRow
  const queryClient = useQueryClient()

  const { mutateAsync: createPlatform, isPending: isCreating } =
    useCreatePlatform()
  const { mutateAsync: updatePlatform, isPending: isUpdating } =
    useUpdatePlatform()

  const onSubmit = async (data: PlatformFormSchema) => {
    try {
      // Backend expects 0-1, user inputs 0-100
      const formattedData = {
        ...data,
        defaultSplit: Number(data.defaultSplit) / 100,
      }

      if (isUpdate) {
        await updatePlatform({ id: currentRow.id, data: formattedData })
        toast.success('Platform updated successfully')
      } else {
        await createPlatform(formattedData)
        toast.success('Platform created successfully')
      }
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['platforms'] })
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? 'Update Platform' : 'Create Platform'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Update the platform details.'
              : 'Add a new platform to the system.'}
          </DialogDescription>
        </DialogHeader>

        <div className='py-4'>
          <PlatformForm
            id='platform-form'
            onSubmit={onSubmit}
            defaultValues={currentRow}
          />
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='platform-form'
            disabled={isCreating || isUpdating}
          >
            {(isCreating || isUpdating) && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {isUpdate ? 'Save Changes' : 'Create Platform'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
