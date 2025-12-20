import { useFormContext } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { useGetPlatforms } from '@/features/platforms/api/useGetPlatforms'
import { useCreateVendor } from '../api/useCreateVendor'
import { useGetVendor } from '../api/useGetVendor'
import { useUpdateVendor } from '../api/useUpdateVendor'
import { type VendorFormSchema } from '../data/schema'
import { Vendor } from '../types'
import { VendorForm } from './vendor-form'

interface VendorsMutateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Vendor
}

// Component to render platforms inside the VendorForm context
function PlatformSection() {
  const { control, setValue, watch } = useFormContext<VendorFormSchema>()
  const { data: platforms = [] } = useGetPlatforms()
  const platformIds = watch('platformIds') || []

  return (
    <>
      <Separator />
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-medium'>Contracted Platforms</h3>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='select-all-platforms'
              checked={
                platforms.length > 0 && platformIds.length === platforms.length
              }
              onCheckedChange={(checked) => {
                setValue(
                  'platformIds',
                  checked ? platforms.map((p) => p.id) : []
                )
              }}
            />
            <label
              htmlFor='select-all-platforms'
              className='text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Select All
            </label>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-4'>
          {platforms.length === 0 && (
            <p className='text-muted-foreground text-sm'>No platforms found.</p>
          )}
          <FormField
            control={control}
            name='platformIds'
            render={() => (
              <FormItem className='col-span-2'>
                {/* Iterate over platforms and create a checkbox for each */}
                {platforms.map((platform) => (
                  <FormField
                    key={platform.id}
                    control={control}
                    name='platformIds'
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={platform.id}
                          className='flex flex-row items-start space-y-0 space-x-3'
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(platform.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([
                                      ...(field.value || []),
                                      platform.id,
                                    ])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value: string) => value !== platform.id
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {platform.name}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  )
}

export function VendorsMutateDialog({
  open,
  onOpenChange,
  currentRow,
}: VendorsMutateDialogProps) {
  const isUpdate = !!currentRow
  const { data: fetchedVendor, isLoading: isLoadingVendor } = useGetVendor(
    currentRow?.id ?? ''
  )

  const { mutateAsync: createVendor, isPending: isCreating } = useCreateVendor()
  const { mutateAsync: updateVendor, isPending: isUpdating } = useUpdateVendor()
  const queryClient = useQueryClient()

  // Prepare default values
  // We prefer the fetched data if available (for fresh platform splits),
  // otherwise fallback to currentRow (immediate display),
  // otherwise defaults for create mode.
  const vendorData = fetchedVendor || currentRow

  const defaultValues: Partial<VendorFormSchema> = vendorData
    ? {
        ...vendorData,
        subLabels: vendorData.subLabels?.map((l) => ({ value: l })) ?? [],
        bankDetails: vendorData.bankDetails ?? {
          bankName: '',
          accountNumber: '',
          bankAddress: '',
          ibanRouting: '',
          swiftCode: '',
          currency: 'USD',
          payoutMethod: 'WIRE',
          paypalEmail: '',
          accountType: 'Checking',
        },
        platformIds:
          fetchedVendor?.platformSplits?.map((split) => split.platformId) ?? [],
      }
    : {
        subLabels: [],
        platformIds: [],
      }

  const onSubmit = async (data: VendorFormSchema) => {
    try {
      const formattedData = {
        ...data,
        subLabels: data.subLabels.map((item: { value: string }) => item.value),
        bankDetails: {
          ...data.bankDetails,
          paypalEmail: data.bankDetails.paypalEmail ?? '',
        },
      }
      console.log(formattedData)

      if (isUpdate) {
        await updateVendor({ id: currentRow.id, data: formattedData })
        toast.success('Vendor updated successfully')
      } else {
        await createVendor(formattedData)
        toast.success('Vendor created successfully')
      }

      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    } catch (error) {
      console.error(error)
      toast.error('Something went wrong')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 p-0'>
        <DialogHeader className='shrink-0 border-b p-6 pb-4'>
          <DialogTitle>{isUpdate ? 'Update Vendor' : 'Add Vendor'}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'Update the vendor details and save changes.'
              : 'Add a new vendor to the system.'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4'>
          {isUpdate && isLoadingVendor ? (
            <div className='flex h-40 items-center justify-center'>
              <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
            </div>
          ) : (
            <VendorForm
              id='vendor-mutate-form'
              onSubmit={onSubmit}
              defaultValues={defaultValues}
            >
              <PlatformSection />
            </VendorForm>
          )}
        </div>
        <DialogFooter className='shrink-0 border-t p-6 pt-4'>
          <Button
            disabled={isCreating || isUpdating}
            type='submit'
            form='vendor-mutate-form'
          >
            {(isCreating || isUpdating) && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {isUpdate ? 'Update Vendor' : 'Create Vendor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
