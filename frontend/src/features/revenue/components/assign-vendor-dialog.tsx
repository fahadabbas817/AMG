import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetVendors } from '@/features/vendors/api/useGetVendors'

const formSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  subLabel: z.string().optional(),
  addToVendorSubLabels: z.boolean().default(true).optional(),
})

interface AssignVendorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rawVendorName: string
  recordIds?: string[] // Optional: if assigning specific IDs
  onSuccess?: () => void
}

export function AssignVendorDialog({
  open,
  onOpenChange,
  rawVendorName,
  recordIds,
  onSuccess,
}: AssignVendorDialogProps) {
  const [openCombobox, setOpenCombobox] = useState(false)
  const queryClient = useQueryClient()

  // We fetch all vendors for search. Optimally this should be server-side search if many vendors.
  // The existing useGetVendors supports search, but here we might want all?
  // Let's use the hook with a search term if we implement server-side filtering in combobox later.
  // For now, let's load initial list.
  const { data: vendors } = useGetVendors({ page: 1, limit: 1000 }) // Load enough for client filtering or rely on basic list

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: '',
      subLabel: '',
      addToVendorSubLabels: true,
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        rawVendorName,
        vendorId: values.vendorId,
        subLabel: values.subLabel || undefined,
        addToVendorSubLabels: values.addToVendorSubLabels,
        recordIds,
      }
      return api.post('/revenue/unallocated/assign', payload)
    },
    onSuccess: (data: any) => {
      toast.success('Records assigned successfully')
      if (data.data?.syncResult?.status === 'FAILED') {
        toast.warning(
          `Assigned, but QBO Sync failed: ${data.data.syncResult.error}`
        )
      }
      queryClient.invalidateQueries({ queryKey: ['unallocated-groups'] })
      queryClient.invalidateQueries({ queryKey: ['unallocated-details'] })
      onOpenChange(false)
      if (onSuccess) onSuccess()
    },
    onError: (error: any) => {
      toast.error(
        'Failed to assign records: ' +
          (error.response?.data?.message || error.message)
      )
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    assignMutation.mutate(values)
  }

  // Find selected vendor to show sublabels
  const selectedVendorId = form.watch('vendorId')
  const selectedVendor = vendors?.data?.find((v) => v.id === selectedVendorId)
  const hasSubLabels =
    selectedVendor?.subLabels && selectedVendor.subLabels.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Assign Vendor</DialogTitle>
          <DialogDescription>
            Assign <strong>{rawVendorName}</strong> records to a vendor. This
            will trigger a payout and sync to QuickBooks.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='vendorId'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Vendor</FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          role='combobox'
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value
                            ? vendors?.data?.find(
                                (vendor) => vendor.id === field.value
                              )?.companyName
                            : 'Select vendor'}
                          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='w-[400px] p-0'>
                      <Command>
                        <CommandInput placeholder='Search vendor...' />
                        <CommandList>
                          <CommandEmpty>No vendor found.</CommandEmpty>
                          <CommandGroup>
                            {vendors?.data?.map((vendor) => (
                              <CommandItem
                                value={`${vendor.companyName} ${vendor.vendorNumber}`}
                                key={vendor.id}
                                onSelect={() => {
                                  form.setValue('vendorId', vendor.id)
                                  setOpenCombobox(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    vendor.id === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {vendor.vendorNumber}: {vendor.companyName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedVendor && (
              <>
                <FormField
                  control={form.control}
                  name='subLabel'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-Label / Details</FormLabel>
                      <FormControl>
                        {hasSubLabels ? (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ''}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='Select a sub-label' />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedVendor.subLabels.map((sl) => (
                                <SelectItem key={sl} value={sl}>
                                  {sl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input placeholder='Enter description' {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='addToVendorSubLabels'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-y-0 space-x-3 py-2'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel className='cursor-pointer text-sm font-medium'>
                          Add{' '}
                          <span className='text-primary font-semibold'>
                            "{rawVendorName}"
                          </span>{' '}
                          to sub-labels
                        </FormLabel>
                        <p className='text-muted-foreground text-xs'>
                          This will help automatically match this vendor name in
                          the future.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button type='submit' disabled={assignMutation.isPending}>
                {assignMutation.isPending
                  ? 'Assigning...'
                  : 'Assign & Create Payout'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
