import { useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { sendBroadcastEmail } from '@/services/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['CUSTOM', 'WELCOME']),
})

type FormValues = z.infer<typeof formSchema>

interface EmailComposeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedVendorIds: string[]
  onSuccess?: () => void
}

export function EmailComposeModal({
  isOpen,
  onClose,
  selectedVendorIds,
  onSuccess,
}: EmailComposeModalProps) {
  const [template, setTemplate] = useState<'CUSTOM' | 'WELCOME'>('CUSTOM')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      body: '',
      type: 'CUSTOM',
    },
  })

  // Template handling
  const handleTemplateChange = (value: 'CUSTOM' | 'WELCOME') => {
    setTemplate(value)
    form.setValue('type', value)

    if (value === 'WELCOME') {
      form.setValue('subject', 'Welcome to AMG Vendor Portal')
      form.setValue(
        'body',
        'Welcome! Click the link below to set up your account: {{link}}'
      ) // Placeholder logic
    } else {
      form.setValue('subject', '')
      form.setValue('body', '')
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: sendBroadcastEmail,
    onSuccess: (data: any) => {
      toast.success(`Emails sent successfully to ${data.sent} vendors.`)
      onClose()
      form.reset()
      if (onSuccess) onSuccess()
    },
    onError: (error: any) => {
      toast.error('Failed to send emails.', {
        description: error.response?.data?.message || 'Unknown error',
      })
    },
  })

  const onSubmit = (values: FormValues) => {
    mutate({
      vendorIds: selectedVendorIds,
      subject: values.subject,
      body: values.body,
      type: values.type,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Sending to {selectedVendorIds.length} vendor(s).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <Select
                    onValueChange={(val) => handleTemplateChange(val as any)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select template' />
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

            <FormField
              control={form.control}
              name='subject'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder='Email subject' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='body'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message Body</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Type your message here...'
                      className='min-h-[200px]'
                      {...field}
                    />
                  </FormControl>
                  <DialogDescription className='text-xs'>
                    Variables: {'{{name}}'} will be replaced with vendor name.
                    {template === 'WELCOME' &&
                      ' {{link}} is required for setup link.'}
                  </DialogDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='button' variant='secondary' onClick={onClose}>
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isPending || selectedVendorIds.length === 0}
              >
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Send Emails
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
