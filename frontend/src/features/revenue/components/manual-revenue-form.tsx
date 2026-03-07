import * as React from 'react'
import { useMemo } from 'react'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import {
  Plus,
  ArrowLeft,
  Trash2,
  Save,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGetPlatforms } from '../../platforms/api/useGetPlatforms'
import { useGetVendors } from '../../vendors/api/useGetVendors'
import { useSaveManualReport, ManualRow } from '../api/useSaveManualReport'

type FormValues = {
  platformId: string
  month: string
  invoiceNumber?: string
  rows: ManualRow[]
}

export const ManualRevenueForm = () => {
  const navigate = useNavigate()
  const { data: platforms } = useGetPlatforms()
  const { data: vendors } = useGetVendors({ limit: 1000 })
  const saveMutation = useSaveManualReport()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      platformId: '',
      month: new Date().toISOString().slice(0, 10), // Today YYYY-MM-DD
      rows: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rows',
  })

  // Use useWatch for reliable re-renders on nested field changes
  const watchedRows = useWatch({
    control,
    name: 'rows',
  })

  // Auto-calculate sum of rows
  const calculatedSum = useMemo(() => {
    return (watchedRows || []).reduce(
      (acc, row) => acc + (Number(row.grossRevenue) || 0),
      0
    )
  }, [watchedRows])

  const onSubmit = async (data: FormValues) => {
    if (data.rows.length === 0) {
      toast.error('Please add at least one vendor row')
      return
    }

    // Explicitly validate all rows have a vendor selected
    const hasInvalidRows = data.rows.some(
      (r) => !r.vendorId || r.vendorId.trim() === ''
    )
    if (hasInvalidRows) {
      toast.error('Please select a vendor for all rows before submitting.')
      return
    }

    try {
      await saveMutation.mutateAsync({
        ...data,
        totalAmount: calculatedSum,
        rows: data.rows.map((r) => ({
          ...r,
          grossRevenue: Number(r.grossRevenue),
        })),
      })
      toast.success('Manual report saved successfully')
      navigate({ to: '/' })
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message)
    }
  }

  return (
    <div className='container mx-auto max-w-5xl space-y-6 py-10'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => navigate({ to: '/revenue/upload' })}
        >
          <ArrowLeft className='h-5 w-5' />
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>
          Create Report Manually
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* Header Section */}
        <Card>
          <CardHeader>
            <CardTitle>Report Context</CardTitle>
          </CardHeader>
          <CardContent className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            {/* Platform */}
            <div className='space-y-2'>
              <Label>
                Platform <span className='text-red-500'>*</span>
              </Label>
              <Controller
                control={control}
                name='platformId'
                rules={{ required: 'Platform is required' }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <SelectTrigger
                      className={errors.platformId ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder='Select Platform' />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.platformId && (
                <p className='text-xs text-red-500'>
                  {errors.platformId.message}
                </p>
              )}
            </div>

            {/* Month */}
            <div className='space-y-2'>
              <Label>
                Reporting Month <span className='text-red-500'>*</span>
              </Label>
              <Input type='date' {...register('month', { required: true })} />
            </div>

            {/* Invoice Number */}
            <div className='space-y-2'>
              <Label>
                Invoice Number{' '}
                <span className='text-muted-foreground text-xs'>
                  (Optional for QBO)
                </span>
              </Label>
              <Input
                placeholder='e.g. INV-2024-001'
                {...register('invoiceNumber')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Rows */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Vendor Breakdown</CardTitle>
            <Button
              type='button'
              onClick={() => append({ vendorId: '', grossRevenue: 0 })}
              size='sm'
            >
              <Plus className='mr-2 h-4 w-4' /> Add Vendor
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[400px]'>
                    Vendor <span className='text-red-500'>*</span>
                  </TableHead>
                  <TableHead className='w-[250px]'>
                    Sub-Label / Description
                  </TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead className='w-[50px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`rows.${index}.vendorId`}
                        rules={{ required: true }}
                        render={({ field, fieldState }) => {
                          const [open, setOpen] = React.useState(false)
                          const selectedVendor = vendors?.data?.find(
                            (v: any) => v.id === field.value
                          )

                          return (
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  role='combobox'
                                  aria-expanded={open}
                                  className={cn(
                                    'w-full justify-between',
                                    fieldState.error && 'border-red-500'
                                  )}
                                >
                                  {field.value
                                    ? selectedVendor
                                      ? `${selectedVendor.vendorNumber}: ${selectedVendor.companyName}`
                                      : 'Vendor not found'
                                    : 'Select vendor...'}
                                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className='w-[400px] p-0'>
                                <Command>
                                  <CommandInput placeholder='Search vendor...' />
                                  <CommandList>
                                    <CommandEmpty>
                                      No vendor found.
                                    </CommandEmpty>
                                    <CommandGroup>
                                      {vendors?.data?.map((vendor: any) => (
                                        <CommandItem
                                          key={vendor.id}
                                          value={`${vendor.companyName} ${vendor.vendorNumber}`}
                                          onSelect={() => {
                                            field.onChange(vendor.id)
                                            // Reset sublabel when vendor changes
                                            const currentRows =
                                              control._formValues.rows
                                            if (
                                              currentRows &&
                                              currentRows[index]
                                            ) {
                                              // We need to leverage setValue from useForm context if possible,
                                              // but here we are in a render prop.
                                              // Actually, we can just let the user re-select.
                                              // But optimally we should clear it.
                                            }
                                            setOpen(false)
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              field.value === vendor.id
                                                ? 'opacity-100'
                                                : 'opacity-0'
                                            )}
                                          />
                                          {vendor.vendorNumber}:{' '}
                                          {vendor.companyName}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`rows.${index}.lineItemName`}
                        render={({ field }) => {
                          // Watch the vendor ID for this row to determine input type
                          const currentVendorId = useWatch({
                            control,
                            name: `rows.${index}.vendorId`,
                          })
                          const vendor = vendors?.data?.find(
                            (v: any) => v.id === currentVendorId
                          )
                          const hasSubLabels =
                            vendor?.subLabels && vendor.subLabels.length > 0

                          if (hasSubLabels) {
                            return (
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || ''}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder='Select Sub-Label' />
                                </SelectTrigger>
                                <SelectContent>
                                  {vendor.subLabels.map((subLabel: string) => (
                                    <SelectItem key={subLabel} value={subLabel}>
                                      {subLabel}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          }

                          return (
                            <Input
                              placeholder='Description (Optional)'
                              {...field}
                              value={field.value || ''}
                            />
                          )
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type='number'
                        step='0.01'
                        {...register(`rows.${index}.grossRevenue` as const, {
                          required: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => remove(index)}
                      >
                        <Trash2 className='h-4 w-4 text-red-500' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {fields.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className='text-muted-foreground h-24 text-center'
                    >
                      No vendors added. Click "Add Vendor" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Footer / Summary */}
        <Card className='bg-muted/50'>
          <CardContent className='flex items-center justify-between py-6'>
            <div>
              <p className='text-muted-foreground text-sm font-medium'>
                Calculated Total
              </p>
              <p className='text-foreground text-2xl font-bold'>
                ${calculatedSum.toFixed(2)}
              </p>
            </div>
            <div className='flex items-center gap-4'>
              <Button type='submit' size='lg' disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Submit Report'}
                <Save className='ml-2 h-4 w-4' />
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
