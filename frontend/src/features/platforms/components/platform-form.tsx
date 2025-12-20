import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PlatformFormSchema, platformSchema } from '../data/schema'

interface PlatformFormProps {
  onSubmit: (data: PlatformFormSchema) => void
  defaultValues?: Partial<PlatformFormSchema>
  children?: React.ReactNode
  id?: string
}

export function PlatformForm({
  onSubmit,
  defaultValues,
  children,
  id,
}: PlatformFormProps) {
  const form = useForm<PlatformFormSchema>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      name: '',
      corporateName: '',
      defaultSplit: 25,
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form
        id={id}
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-4'
      >
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter platform name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='corporateName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Corporate Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter corporate name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='defaultSplit'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Split (%)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='25'
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {children}
      </form>
    </Form>
  )
}
