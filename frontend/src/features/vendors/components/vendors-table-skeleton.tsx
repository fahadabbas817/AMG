import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function VendorsTableSkeleton() {
  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className='h-4 w-[100px]' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[150px]' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[120px]' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[200px]' />
            </TableHead>
            <TableHead>
              <Skeleton className='h-4 w-[100px]' />
            </TableHead>
            <TableHead className='text-right'>
              <Skeleton className='ml-auto h-4 w-[50px]' />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className='h-4 w-[100px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[150px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[120px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[200px]' />
              </TableCell>
              <TableCell>
                <Skeleton className='h-4 w-[100px]' />
              </TableCell>
              <TableCell className='text-right'>
                <div className='flex justify-end gap-2'>
                  <Skeleton className='h-8 w-8' />
                  <Skeleton className='h-8 w-8' />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
