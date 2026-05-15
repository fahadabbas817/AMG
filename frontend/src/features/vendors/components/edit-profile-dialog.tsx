import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useCreateProfileRequest } from '../api/useProfileRequests'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  category: 'company' | 'bank' | null
  currentData: any
}

const companySchema = z.object({
  contactName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  // Email and Company Name often read-only or restricted, allowing edit here for now
})

const bankSchema = z
  .object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ibanRouting: z.string().optional(),
    swiftCode: z.string().optional(),
    bankAddress: z.string().optional(),
    currency: z.string().default('USD'),
    payoutMethod: z.enum(['ACH', 'PAYPAL', 'WIRE']),
    paypalEmail: z.string().optional(),
    accountType: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payoutMethod === 'PAYPAL') {
      if (!data.paypalEmail || data.paypalEmail.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PayPal email is required',
          path: ['paypalEmail'],
        })
      }
    } else {
      if (!data.bankName || data.bankName.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank Name is required',
          path: ['bankName'],
        })
      }
      if (!data.accountNumber || data.accountNumber.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account Number is required',
          path: ['accountNumber'],
        })
      }
    }
  })

export function EditProfileDialog({
  open,
  onOpenChange,
  vendorId,
  category,
  currentData,
}: EditProfileDialogProps) {
  const { mutate: createRequest, isPending } = useCreateProfileRequest()

  // Dynamic form setup
  const schema = category === 'bank' ? bankSchema : companySchema
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: currentData || {},
  })

  useEffect(() => {
    if (open && currentData) {
      form.reset(currentData)
    }
  }, [open, currentData, form])

  const onSubmit = (data: any) => {
    createRequest(
      { vendorId, data },
      {
        onSuccess: () => {
          toast.success('Request Submitted', {
            description:
              'Your profile update request has been submitted for approval.',
          })
          onOpenChange(false)
        },
        onError: () => {
          toast.error('Error', {
            description: 'Failed to submit request.',
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>
            Update {category === 'bank' ? 'Banking' : 'Profile'} Information
          </DialogTitle>
          <DialogDescription>
            Submit a request to update your details. Changes require admin
            approval.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {category === 'company' && (
              <>
                <FormField
                  control={form.control}
                  name='contactName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='address'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {category === 'bank' && (
              <>
                <FormField
                  control={form.control}
                  name='payoutMethod'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payout Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select method' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='ACH'>ACH</SelectItem>
                          <SelectItem value='PAYPAL'>PayPal</SelectItem>
                          <SelectItem value='WIRE'>Wire</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('payoutMethod') === 'PAYPAL' ? (
                  <FormField
                    control={form.control}
                    name='paypalEmail'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PayPal Email</FormLabel>
                        <FormControl>
                          <Input placeholder='pay@example.com' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name='bankName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='accountNumber'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='ibanRouting'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing / IBAN</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='swiftCode'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT Code</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}

            <div className='flex justify-end pt-4'>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
