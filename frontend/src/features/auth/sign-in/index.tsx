import { Link, useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Sign in</CardTitle>
          <CardDescription>
            Enter your email and password below to <br />
            log into your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='admin' className='w-full'>
            <TabsList className='mb-4 grid w-full grid-cols-2'>
              <TabsTrigger value='admin'>Admin</TabsTrigger>
              <TabsTrigger value='vendor'>Vendor</TabsTrigger>
            </TabsList>
            <TabsContent value='admin'>
              <UserAuthForm redirectTo={redirect} userType='admin' />
            </TabsContent>
            <TabsContent value='vendor'>
              <UserAuthForm redirectTo={redirect} userType='vendor' />
            </TabsContent>
          </Tabs>
        </CardContent>
        <span className='flex items-center justify-center'>
          Don't have an account?{' '}
          <Link to='/sign-up' className='underline underline-offset-4'>
            Sign Up
          </Link>
        </span>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By clicking sign in, you agree to our{' '}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
