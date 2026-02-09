import { useState } from 'react'
import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import api from '@/services/api'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

// Validation Schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const Route = createFileRoute('/(auth)/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { token: string; email: string } => {
    return {
      token: (search.token as string) || '',
      email: (search.email as string) || '',
    }
  },
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token, email } = Route.useSearch()

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token || !email) {
      toast.error('Invalid link', { description: 'Missing token or email.' })
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        newPassword: data.password,
      })

      toast.success('Password updated!', {
        description: 'You can now log in with your new password.',
      })

      // Redirect to login
      navigate({ to: '/sign-in' })
    } catch (error: any) {
      toast.error('Failed to reset password', {
        description: error.response?.data?.message || 'Something went wrong.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='text-destructive'>Invalid Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or incomplete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className='w-full'>
              <Link to='/sign-in'>Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='bg-muted/40 flex h-screen w-full items-center justify-center px-4'>
      <Card className='mx-auto w-full max-w-sm'>
        <CardHeader>
          <CardTitle className='text-2xl'>Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='********'
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() => setShowPassword((prev) => !prev)}
                        >
                          {showPassword ? (
                            <EyeOff className='text-muted-foreground h-4 w-4' />
                          ) : (
                            <Eye className='text-muted-foreground h-4 w-4' />
                          )}
                          <span className='sr-only'>
                            {showPassword ? 'Hide password' : 'Show password'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder='********'
                          {...field}
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent'
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className='text-muted-foreground h-4 w-4' />
                          ) : (
                            <Eye className='text-muted-foreground h-4 w-4' />
                          )}
                          <span className='sr-only'>
                            {showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Set Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
