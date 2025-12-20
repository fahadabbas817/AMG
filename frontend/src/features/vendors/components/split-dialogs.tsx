import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetPlatforms } from '@/features/platforms/api/useGetPlatforms'
import { useAddSplit, useUpdateSplit, PlatformSplit } from '../api/splits'

// Schema for Adding Split
const addSplitSchema = z.object({
  platformId: z.string().min(1, 'Platform is required'),
  commissionRate: z.coerce
    .number()
    .min(0, 'Commission must be positive')
    .max(100, 'Cannot exceed 100%'),
})

// Schema for Editing Split
const editSplitSchema = z.object({
  commissionRate: z.coerce
    .number()
    .min(0, 'Commission must be positive')
    .max(100, 'Cannot exceed 100%'),
})

interface AddSplitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
}

export function AddSplitDialog({
  open,
  onOpenChange,
  vendorId,
}: AddSplitDialogProps) {
  const { mutateAsync: addSplit, isPending } = useAddSplit(vendorId)
  const { data: platforms = [] } = useGetPlatforms()

  const form = useForm<z.infer<typeof addSplitSchema>>({
    resolver: zodResolver(addSplitSchema),
    defaultValues: {
      platformId: '',
      commissionRate: 0,
    },
  })

  const onSubmit = async (data: z.infer<typeof addSplitSchema>) => {
    try {
      // Convert percentage (25) to decimal (0.25)
      await addSplit({ ...data, commissionRate: data.commissionRate / 100 })
      toast.success('Platform added successfully')
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error(error)
      toast.error('Failed to add platform. It might already exist.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Platform Split</DialogTitle>
          <DialogDescription>
            Link a new platform to this vendor. Enter commission as percentage
            (e.g. 25 for 25%).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='add-split-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='platformId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      const selectedPlatform = platforms.find(
                        (p) => p.id === value
                      )
                      if (selectedPlatform) {
                        form.setValue(
                          'commissionRate',
                          selectedPlatform.defaultSplit * 100
                        )
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select platform' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (Default: {p.defaultSplit * 100}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='commissionRate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate (%)</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='add-split-form' disabled={isPending}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Add Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EditSplitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  split: PlatformSplit | null
}

export function EditSplitDialog({
  open,
  onOpenChange,
  vendorId,
  split,
}: EditSplitDialogProps) {
  const { mutateAsync: updateSplit, isPending } = useUpdateSplit(vendorId)

  const form = useForm<z.infer<typeof editSplitSchema>>({
    resolver: zodResolver(editSplitSchema),
    defaultValues: {
      commissionRate: 0,
    },
  })

  useEffect(() => {
    if (split) {
      // Backend provides decimal (0.25), input expects percentage (25)
      form.reset({ commissionRate: split.commissionRate * 100 })
    }
  }, [split, form])

  const onSubmit = async (data: z.infer<typeof editSplitSchema>) => {
    if (!split) return
    try {
      // Input is percentage (25), Backend expects decimal (0.25)
      await updateSplit({
        splitId: split.id,
        data: { commissionRate: data.commissionRate / 100 },
      })
      toast.success('Split updated successfully')
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error('Failed to update split')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Commission</DialogTitle>
          <DialogDescription>
            Update the commission rate for {split?.platform.name}. Enter as
            percentage.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='edit-split-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='commissionRate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate (%)</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='edit-split-form' disabled={isPending}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
