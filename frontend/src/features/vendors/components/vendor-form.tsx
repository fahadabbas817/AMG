import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Separator } from '@/components/ui/separator'
import { vendorSchema, type VendorFormSchema } from '../data/schema'

interface VendorFormProps {
  id: string
  onSubmit: (data: VendorFormSchema) => Promise<void>
  defaultValues?: Partial<VendorFormSchema>
  isPending?: boolean // for loading state if needed internally, though usually buttons are external
  children?: React.ReactNode // For sticking buttons or extra sections at the bottom
}

export function VendorForm({
  id,
  onSubmit,
  defaultValues,
  children,
}: VendorFormProps) {
  const form = useForm<VendorFormSchema>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      companyName: '',
      contactName: '',
      email: '',
      vendorNumber: '',
      phone: '',
      address: '',
      contractSignatory: '',

      subLabels: [],
      platformIds: [],
      bankDetails: {
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
      ...defaultValues,
    },
  })

  // useFieldArray for dynamic sub-labels
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subLabels',
  })

  // Reset form when defaultValues change (important for edit mode loading)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        companyName: '',
        contactName: '',
        email: '',
        vendorNumber: '',
        phone: '',
        address: '',
        contractSignatory: '',
        subLabels: [],
        platformIds: [],
        bankDetails: {
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
        ...defaultValues,
      })
    }
  }, [defaultValues, form])

  return (
    <Form {...form}>
      <form
        id={id}
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Form validation errors:', errors)
          toast.error('Please check the form for errors')
        })}
        className='space-y-6'
      >
        {/* Section 1: Corporate Info */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Corporate Information</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='companyName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Acme Inc.' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='vendorNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Number</FormLabel>
                  <FormControl>
                    <Input placeholder='V-1001' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='address'
              render={({ field }) => (
                <FormItem className='col-span-1 md:col-span-2'>
                  <FormLabel>Corporate Address</FormLabel>
                  <FormControl>
                    <Input placeholder='123 Wall St, New York, NY' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Section 2: Contact Info */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Contact Information</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='contactName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder='John Doe' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder='john@example.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder='+1 (555) 000-0000' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='contractSignatory'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Signatory</FormLabel>
                  <FormControl>
                    <Input placeholder='Jane Smith' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Section 3: Banking */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium'>Banking Details</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField
              control={form.control}
              name='bankDetails.bankName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Chase Bank' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.accountNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder='1234567890' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.bankAddress'
              render={({ field }) => (
                <FormItem className='col-span-1 md:col-span-2'>
                  <FormLabel>Bank Address</FormLabel>
                  <FormControl>
                    <Input placeholder='456 Main St, City, State' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.ibanRouting'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN / Routing</FormLabel>
                  <FormControl>
                    <Input placeholder='ACH or Wire Routing' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.swiftCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SWIFT Code</FormLabel>
                  <FormControl>
                    <Input placeholder='CHASEUS33' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.ibanRouting'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN / Routing</FormLabel>
                  <FormControl>
                    <Input placeholder='ACH or Wire Routing' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.swiftCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SWIFT Code</FormLabel>
                  <FormControl>
                    <Input placeholder='CHASEUS33' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.currency'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select currency' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='USD'>USD</SelectItem>
                        <SelectItem value='EUR'>EUR</SelectItem>
                        <SelectItem value='GBP'>GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.payoutMethod'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payout Method</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select method' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='WIRE'>WIRE</SelectItem>
                        <SelectItem value='ACH'>ACH</SelectItem>
                        <SelectItem value='PAYPAL'>PAYPAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bankDetails.paypalEmail'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PayPal Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder='pay@example.com' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Section 4: Sub-Labels */}
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-medium'>Sub-Labels / Aliases</h3>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => append({ value: '' })}
            >
              <Plus className='mr-2 h-4 w-4' />
              Add Label
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className='flex items-center gap-2'>
              <FormField
                control={form.control}
                name={`subLabels.${index}.value`}
                render={({ field }) => (
                  <FormItem className='flex-1'>
                    <FormControl>
                      <Input placeholder='e.g. Trading Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => remove(index)}
              >
                <Trash2 className='text-destructive h-4 w-4' />
              </Button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className='text-muted-foreground text-sm italic'>
              No sub-labels added.
            </p>
          )}
        </div>

        {children}
      </form>
    </Form>
  )
}
