import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { AuthService } from '@/services/auth'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
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
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long'),
  vendorId: z.string().optional(),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
  userType?: 'admin' | 'vendor'
}

export function UserAuthForm({
  className,
  redirectTo,
  userType = 'vendor',
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      vendorId: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    // Validate vendor ID for vendors
    if (userType === 'vendor' && !data.vendorId) {
      form.setError('vendorId', {
        type: 'manual',
        message: 'Please enter your vendor ID',
      })
      return
    }

    setIsLoading(true)

    try {
      let response: any

      console.log('🔐 Attempting login with:', {
        userType,
        email: data.email,
        hasPassword: !!data.password,
        vendorId: data.vendorId || 'N/A',
      })

      // Call appropriate API based on user type
      if (userType === 'admin') {
        response = await AuthService.loginAdmin({
          email: data.email,
          password: data.password,
        })
      } else {
        response = await AuthService.loginVendor({
          email: data.email,
          password: data.password,
          vendorId: data.vendorId,
        })
      }

      console.log('✅ Login response:', response)

      // Backend now returns: { message, user: { id, role, email } }
      const userData = response.user

      // Store user data in auth store
      const user = {
        userId: userData.id,
        email: userData.email,
        role: userData.role.toLowerCase(), // Convert 'ADMIN' to 'admin', 'VENDOR' to 'vendor'
        exp: Date.now() + 2 * 60 * 60 * 1000, // 2 hours (matching cookie expiry)
      }

      console.log('💾 Storing user:', user)

      auth.setUser(user)
      auth.setAccessToken('token-stored-in-cookie') // Token is in httpOnly cookie

      // Show success toast
      toast.success(`Welcome back, ${userData.email}!`)

      // Redirect based on role
      const targetPath = user.role === 'vendor' ? '/vendor' : '/'
      console.log('🚀 Redirecting to:', targetPath)

      navigate({ to: targetPath, replace: true })
    } catch (error: any) {
      setIsLoading(false)

      console.error('❌ Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error,
      })

      // Handle different error scenarios
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Invalid credentials. Please try again.'

      toast.error(errorMessage)

      // Clear form password on error
      form.setValue('password', '')
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='name@example.com'
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vendor ID field - only shown for vendors */}
        {userType === 'vendor' && (
          <FormField
            control={form.control}
            name='vendorId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Enter your vendor ID'
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75'
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Sign in
        </Button>
      </form>
    </Form>
  )
}
