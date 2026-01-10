import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProfileInfoCardProps {
  title: string
  data: Record<string, string | number | null | undefined>
  onEdit?: () => void
  className?: string
}

export function ProfileInfoCard({
  title,
  data,
  onEdit,
  className,
}: ProfileInfoCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-lg font-medium'>{title}</CardTitle>
        {onEdit && (
          <Button variant='ghost' size='icon' onClick={onEdit}>
            <Pencil className='h-4 w-4' />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className='grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3'>
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className='flex flex-col space-y-1'>
              <span className='text-muted-foreground text-sm capitalize'>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className='font-medium break-words'>
                {value !== null && value !== undefined ? String(value) : '-'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
