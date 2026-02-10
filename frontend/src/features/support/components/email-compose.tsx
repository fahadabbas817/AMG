import { useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { sendBroadcastEmail } from '@/services/api'
import { Check, ChevronsUpDown, X, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
import { Textarea } from '@/components/ui/textarea'
import { useGetVendors } from '@/features/vendors/api/useGetVendors'

const emailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['CUSTOM', 'WELCOME']),
  vendorIds: z.array(z.string()).min(1, 'Select at least one vendor'),
})

type EmailFormValues = z.infer<typeof emailSchema>

export function EmailCompose() {
  const [openCombobox, setOpenCombobox] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Fetch vendors for selection (limit 100 for now, or implement search)
  const { data: vendorsData } = useGetVendors({
    limit: 100,
    search: searchValue,
  })
  const vendors = vendorsData?.data || []

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: 'Update from All Media Group',
      body: `Hi {{name}},

[Your message here]

Regards,
amy@allmediagroup.tv`,
      type: 'CUSTOM',
      vendorIds: [],
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: sendBroadcastEmail,
    onSuccess: (data: any) => {
      toast.success(`Emails sent successfully to ${data.sent} vendors.`)
      form.reset()
    },
    onError: (error: any) => {
      toast.error('Failed to send emails.', {
        description: error.response?.data?.message || 'Unknown error',
      })
    },
  })

  const onSubmit = (values: EmailFormValues) => {
    mutate(values)
  }

  const selectedVendorIds = form.watch('vendorIds')

  // Template change handler
  const onTemplateChange = (
    value: string,
    fieldOnChange: (value: string) => void
  ) => {
    fieldOnChange(value) // Update the form value for 'type' first

    // Slight delay to ensure form state is ready if needed, but direct setValue usually works
    if (value === 'WELCOME') {
      form.setValue('subject', 'Welcome to AMG Vendor Portal')
      form.setValue(
        'body',
        `Hi {{name}},

Welcome to the AMG Vendor Portal. We are excited to have you on board.

Here are your account details:
Vendor Number: {{vendorNumber}}
Email: {{email}}

Please click the link below to set your password and access the portal:
{{link}}

Regards,
amy@allmediagroup.tv`
      )
    } else {
      // CUSTOM template
      form.setValue('subject', 'Update from All Media Group')
      form.setValue(
        'body',
        `Hi {{name}},

[Your message here]

Regards,
amy@allmediagroup.tv`
      )
    }
  }

  return (
    <Card className='h-full border shadow-sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Mail className='h-5 w-5' />
          Compose Email
        </CardTitle>
        <CardDescription>
          Send updates or announcements to your vendors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Vendors Selection */}
            <FormField
              control={form.control}
              name='vendorIds'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel className='text-base font-semibold'>
                    Recipients
                  </FormLabel>
                  <div className='mb-3 flex flex-wrap gap-2'>
                    {selectedVendorIds.length > 0 &&
                      selectedVendorIds.map((id) => {
                        const vendor = vendors.find((v) => v.id === id) || {
                          companyName: 'Unknown',
                          id,
                        }
                        return (
                          <Badge
                            key={id}
                            variant='secondary'
                            className='px-3 py-1'
                          >
                            {vendor.companyName}
                            <button
                              type='button'
                              className='hover:text-destructive ring-offset-background focus:ring-ring ml-2 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none'
                              onClick={() => {
                                const newIds = selectedVendorIds.filter(
                                  (vid) => vid !== id
                                )
                                form.setValue('vendorIds', newIds)
                              }}
                            >
                              <X className='h-3 w-3' />
                            </button>
                          </Badge>
                        )
                      })}
                    {selectedVendorIds.length === 0 && (
                      <p className='text-muted-foreground text-sm italic'>
                        No vendors selected
                      </p>
                    )}
                  </div>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant='outline'
                          role='combobox'
                          className={cn(
                            'w-full justify-between',
                            !field.value.length && 'text-muted-foreground'
                          )}
                        >
                          {field.value.length > 0
                            ? `${field.value.length} vendors selected`
                            : 'Select vendors...'}
                          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className='w-[400px] p-0'>
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder='Search vendors...'
                          value={searchValue}
                          onValueChange={setSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>No vendor found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                if (
                                  selectedVendorIds.length === vendors.length
                                ) {
                                  form.setValue('vendorIds', [])
                                } else {
                                  form.setValue(
                                    'vendorIds',
                                    vendors.map((v) => v.id)
                                  )
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedVendorIds.length === vendors.length &&
                                    vendors.length > 0
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              Select All ({vendors.length})
                            </CommandItem>
                            {vendors.map((vendor) => (
                              <CommandItem
                                value={vendor.companyName}
                                key={vendor.id}
                                onSelect={() => {
                                  const current = new Set(selectedVendorIds)
                                  if (current.has(vendor.id)) {
                                    current.delete(vendor.id)
                                  } else {
                                    current.add(vendor.id)
                                  }
                                  form.setValue(
                                    'vendorIds',
                                    Array.from(current)
                                  )
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedVendorIds.includes(vendor.id)
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                {vendor.companyName}
                                <span className='text-muted-foreground ml-auto text-xs'>
                                  {vendor.vendorNumber}
                                </span>
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

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              {/* Template */}
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-base font-semibold'>
                      Template
                    </FormLabel>
                    <Select
                      onValueChange={(value) =>
                        onTemplateChange(value, field.onChange)
                      }
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a template' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='CUSTOM'>Custom Message</SelectItem>
                        <SelectItem value='WELCOME'>Welcome Invite</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject */}
              <FormField
                control={form.control}
                name='subject'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-base font-semibold'>
                      Subject
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='Email subject...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Body */}
            <FormField
              control={form.control}
              name='body'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-base font-semibold'>
                    Message Body
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Type your message here...'
                      className='min-h-[250px] font-mono text-sm'
                      {...field}
                    />
                  </FormControl>
                  <p className='text-muted-foreground text-xs'>
                    Available variables:{' '}
                    <code className='bg-muted rounded px-1'>{'{{name}}'}</code>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-end pt-4'>
              <Button
                type='submit'
                size='lg'
                disabled={isPending || selectedVendorIds.length === 0}
              >
                {isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Mail className='mr-2 h-4 w-4' />
                )}
                Send Email ({selectedVendorIds.length})
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
