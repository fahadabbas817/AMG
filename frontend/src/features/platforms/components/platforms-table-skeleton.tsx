import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function PlatformsTableSkeleton() {
  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[40px]'>
              <Skeleton className='h-4 w-4 rounded-sm' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[150px]' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[200px]' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[100px]' />
            </TableHead>
            <TableHead className='w-[50px]'>
              <Skeleton className='ml-auto h-4 w-4' />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className='h-4 w-4 rounded-sm' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[200px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[250px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[80px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='ml-auto h-8 w-8 rounded-md' />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
