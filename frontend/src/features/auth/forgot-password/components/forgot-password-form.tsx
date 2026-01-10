import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <div className='text-muted-foreground text-center text-sm'>
        Please contact your administrator to reset your password.
      </div>
      <Link
        to='/sign-in'
        className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
      >
        Back to Sign In
      </Link>
    </div>
  )
}
