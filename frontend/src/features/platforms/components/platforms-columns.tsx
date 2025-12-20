import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { Platform } from '../types'
import { PlatformsRowActions } from './platforms-row-actions'

export const platformsColumns: ColumnDef<Platform>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => {
      return (
        <span className='max-w-[500px] truncate font-medium'>
          {row.getValue('name')}
        </span>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'corporateName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Corporate Name' />
    ),
    cell: ({ row }) => row.getValue('corporateName') || '-',
    enableSorting: true,
  },
  {
    accessorKey: 'defaultSplit',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Default Split' />
    ),
    cell: ({ row }) => `${Number(row.getValue('defaultSplit')) * 100}%`,
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <PlatformsRowActions row={row} />,
    size: 50,
  },
]
