import { useState } from 'react'
import { z } from 'zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Banknote,
  Building2,
  Calculator,
  CreditCard,
  Download,
  FileText,
  Hash,
  Landmark,
  Layers,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  User,
  UserPen,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DatePicker } from '@/components/date-picker'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useCreatePayout } from '@/features/payouts/api/useCreatePayout'
import { useGetUnpaidSummaries } from '@/features/payouts/api/useGetUnpaidSummaries'
import { PlatformSplit, useRemoveSplit } from '@/features/vendors/api/splits'
import { getVendorQueryOptions } from '@/features/vendors/api/useGetVendor'
import { ResetPasswordDialog } from '@/features/vendors/components/reset-password-dialog'
import {
  AddSplitDialog,
  EditSplitDialog,
} from '@/features/vendors/components/split-dialogs'
import { VendorsMutateDialog } from '@/features/vendors/components/vendors-mutate-dialog'

export const Route = createFileRoute('/_authenticated/vendors/$vendorId')({
  loader: ({ context: { queryClient }, params: { vendorId } }) =>
    queryClient.ensureQueryData(getVendorQueryOptions(vendorId)),
  component: VendorDetails,
})

// ... imports

function VendorDetails() {
  const { vendorId } = Route.useParams()
  const { data: vendor } = useSuspenseQuery(getVendorQueryOptions(vendorId))
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Split Management States
  const [isAddSplitOpen, setIsAddSplitOpen] = useState(false)
  const [editingSplit, setEditingSplit] = useState<PlatformSplit | null>(null)
  const [deleteSplitId, setDeleteSplitId] = useState<string | null>(null)

  // Password Reset State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)

  const { mutateAsync: removeSplit, isPending: isDeletingSplit } =
    useRemoveSplit(vendorId)

  // Payout Management
  console.log('UseGetUnpaidSummaries Hook Call - VendorID:', vendorId)
  const {
    data: unpaidSummaries,
    error,
    isLoading,
  } = useGetUnpaidSummaries(vendorId)

  if (error) console.error('Unpaid Summaries Error:', error)
  if (isLoading) console.log('Loading summaries...')

  const { mutate: createPayout, isPending: isCreatingPayout } =
    useCreatePayout()
  // Logic: We select "summary rows", but API needs "recordIds".
  // So when I select a row, I add all its `recordIds` to the selection set?
  // Or I just track "selected indices" and derive the ID list at submission.
  // Let's track selected INDICES or KEYS (platformId + month).
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const toggleSelection = (key: string) => {
    const next = new Set(selectedKeys)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setSelectedKeys(next)
  }

  const toggleAll = () => {
    if (!unpaidSummaries) return
    if (selectedKeys.size === unpaidSummaries.length) {
      setSelectedKeys(new Set())
    } else {
      const allKeys = unpaidSummaries.map((s) => `${s.platformId}-${s.month}`)
      setSelectedKeys(new Set(allKeys))
    }
  }

  // Derived totals
  const selectedSummaries =
    unpaidSummaries?.filter((s) =>
      selectedKeys.has(`${s.platformId}-${s.month}`)
    ) || []

  const totalNetPayout = selectedSummaries.reduce(
    (sum, item) => sum + item.netPayout,
    0
  )

  const handleGeneratePayout = () => {
    // Flatten recordIds from selected summaries
    const recordIds = selectedSummaries.flatMap((s) => s.recordIds)
    if (recordIds.length === 0) return

    createPayout(
      { vendorId, recordIds },
      {
        onSuccess: () => {
          setSelectedKeys(new Set())
        },
      }
    )
  }

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <div className='bg-muted/40 min-h-screen space-y-6 p-8 pb-32'>
        {/* Header content */}
        <div className='flex items-start justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-3'>
              <h2 className='text-3xl font-bold tracking-tight'>
                {vendor.companyName}
              </h2>
              {/* Status Badge */}
              <Badge variant='default'>
                {/* Assuming active by default if not strictly tracked in this view yet */}
                Active
              </Badge>
            </div>
            <p className='text-muted-foreground flex items-center gap-2'>
              <User className='h-4 w-4' />
              {vendor.contactName} &bull; {vendor.email}
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => setIsResetPasswordOpen(true)}
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Reset Password
            </Button>
            <Button onClick={() => setIsEditOpen(true)}>
              <Pencil className='mr-2 h-4 w-4' />
              Edit Vendor
            </Button>
          </div>
        </div>

        {/* Sub Labels */}
        {vendor.subLabels && vendor.subLabels.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {vendor.subLabels.map((label, index) => (
              <Badge
                key={index}
                variant='secondary'
                className='px-3 py-1 text-sm'
              >
                <Tag className='mr-1.5 h-3 w-3' />
                {label}
              </Badge>
            ))}
          </div>
        )}

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Section 1: Corporate Info */}
          <Card className='overflow-hidden'>
            <CardHeader className='border-b pb-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Building2 className='text-primary h-5 w-5' />
                  <CardTitle>Corporate Information</CardTitle>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsEditOpen(true)}
                  className='h-8 w-8'
                >
                  <Pencil className='text-muted-foreground h-3.5 w-3.5' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-6'>
              <dl className='grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Hash className='h-3.5 w-3.5' /> Vendor Number
                  </dt>
                  <dd className='font-medium'>{vendor.vendorNumber}</dd>
                </div>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Phone className='h-3.5 w-3.5' /> Phone
                  </dt>
                  <dd className='font-medium'>{vendor.phone}</dd>
                </div>
                <div className='col-span-full space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <MapPin className='h-3.5 w-3.5' /> Address
                  </dt>
                  <dd className='font-medium'>{vendor.address}</dd>
                </div>
                <div className='col-span-full space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <UserPen className='h-3.5 w-3.5' /> Contract Signatory
                  </dt>
                  <dd className='font-medium'>{vendor.contractSignatory}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Section 2: Bank Details */}
          <Card className='overflow-hidden'>
            <CardHeader className='border-b pb-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Landmark className='text-primary h-5 w-5' />
                  <CardTitle>Bank Details</CardTitle>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsEditOpen(true)}
                  className='h-8 w-8'
                >
                  <Pencil className='text-muted-foreground h-3.5 w-3.5' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-6'>
              <dl className='grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Building2 className='h-3.5 w-3.5' /> Bank Name
                  </dt>
                  <dd className='font-medium'>
                    {vendor.bankDetails?.bankName || '-'}
                  </dd>
                </div>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <CreditCard className='h-3.5 w-3.5' /> Account Number
                  </dt>
                  <dd className='font-mono font-medium'>
                    {vendor.bankDetails?.accountNumber || '-'}
                  </dd>
                </div>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Landmark className='h-3.5 w-3.5' /> IBAN / Routing
                  </dt>
                  <dd className='font-mono font-medium'>
                    {vendor.bankDetails?.ibanRouting || '-'}
                  </dd>
                </div>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Building2 className='h-3.5 w-3.5' /> SWIFT / BIC
                  </dt>
                  <dd className='font-mono font-medium'>
                    {vendor.bankDetails?.swiftCode || '-'}
                  </dd>
                </div>
                <div className='col-span-full space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Wallet className='h-3.5 w-3.5' /> Payout Method
                  </dt>
                  <dd className='font-medium'>
                    {vendor.bankDetails?.payoutMethod || '-'}
                  </dd>
                </div>
                <div className='space-y-1.5'>
                  <dt className='text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase'>
                    <Banknote className='h-3.5 w-3.5' /> Currency
                  </dt>
                  <dd className='font-medium'>
                    {vendor.bankDetails?.currency || 'USD'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Platform Splits */}
        <Card className='overflow-hidden'>
          <CardHeader className='border-b pb-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Layers className='text-primary h-5 w-5' />
                <div className='space-y-1'>
                  <CardTitle>Platform Splits</CardTitle>
                  <CardDescription className='text-xs'>
                    Contracted platforms and commission rates
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => setIsAddSplitOpen(true)}
                variant='secondary'
                size='sm'
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Platform
              </Button>
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow className='hover:bg-transparent'>
                  <TableHead className='pl-6'>Platform</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead className='pr-6 text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.platformSplits?.length ? (
                  vendor.platformSplits.map((split) => (
                    <TableRow key={split.id} className='hover:bg-muted/50'>
                      <TableCell className='pl-6 font-medium'>
                        {split.platform.name}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <Badge
                            variant={
                              split.commissionRate !==
                              split.platform.defaultSplit
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {(split.commissionRate * 100).toFixed(0)}%
                          </Badge>
                          {split.commissionRate !==
                            split.platform.defaultSplit && (
                            <span className='text-muted-foreground text-xs'>
                              (Overridden)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='pr-6 text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' className='h-8 w-8 p-0'>
                              <span className='sr-only'>Open menu</span>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setEditingSplit(split)}
                            >
                              <Pencil className='mr-2 h-4 w-4' />
                              Manage Split
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-red-600'
                              onClick={() => setDeleteSplitId(split.id)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className='text-muted-foreground h-24 text-center'
                    >
                      No platforms contracted.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 4: Payout Actions */}
        <Card className='overflow-hidden'>
          <CardHeader className='border-b pb-4'>
            <div className='flex items-center gap-2'>
              <FileText className='text-primary h-5 w-5' />
              <div>
                <CardTitle>Payout Actions</CardTitle>
                <CardDescription className='text-xs'>
                  Generate reports and track unpaid items
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-6 p-6'>
            {/* Export Controls */}
            <div className='bg-muted/30 flex flex-wrap items-end gap-4 rounded-lg border p-4'>
              <div className='flex flex-col space-y-2'>
                <label className='text-xs font-medium uppercase'>From</label>
                <DatePicker />
              </div>
              <div className='flex flex-col space-y-2'>
                <label className='text-xs font-medium uppercase'>To</label>
                <DatePicker />
              </div>
              <div className='flex flex-col space-y-2'>
                <label className='text-xs font-medium uppercase'>
                  Platform
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder='Select Platform' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Platforms</SelectItem>
                    {vendor.platformSplits?.map((split) => (
                      <SelectItem
                        key={split.platformId}
                        value={split.platformId}
                      >
                        {split.platform.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className='ml-auto'
                variant='outline'
                onClick={() => console.log('Exporting stats...')}
              >
                <Download className='mr-2 h-4 w-4' />
                Export Stats
              </Button>
            </div>

            <Separator />

            {/* Unpaid Items Table */}
            <div className='space-y-4'>
              <h3 className='flex items-center gap-2 text-lg font-medium'>
                <Banknote className='h-4 w-4' /> Unpaid Items
              </h3>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/50 hover:bg-muted/50'>
                      <TableHead className='w-[50px]'>
                        <Checkbox
                          checked={
                            unpaidSummaries &&
                            unpaidSummaries.length > 0 &&
                            selectedKeys.size === unpaidSummaries.length
                          }
                          onCheckedChange={toggleAll}
                          disabled={!unpaidSummaries?.length}
                        />
                      </TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className='text-right'>Gross</TableHead>
                      <TableHead className='text-right'>Comm. Rate</TableHead>
                      <TableHead className='text-right'>Comm. Amt</TableHead>
                      <TableHead className='text-right font-bold'>
                        Net Payout
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidSummaries?.length ? (
                      unpaidSummaries.map((summary) => {
                        const key = `${summary.platformId}-${summary.month}`
                        const isSelected = selectedKeys.has(key)
                        return (
                          <TableRow
                            key={key}
                            data-state={isSelected ? 'selected' : undefined}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(key)}
                              />
                            </TableCell>
                            <TableCell className='font-medium'>
                              {summary.platformName}
                            </TableCell>
                            <TableCell>
                              {format(new Date(summary.month), 'MMMM yyyy')}
                            </TableCell>
                            <TableCell className='text-right'>
                              ${summary.grossAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className='text-right'>
                              {(summary.commissionRate * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className='text-right text-red-500'>
                              -${summary.commissionAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className='text-right font-bold'>
                              ${summary.netPayout.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className='text-muted-foreground h-24 text-center'
                        >
                          No unpaid items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer / Actions */}
              <div className='bg-muted/20 flex items-center justify-between rounded-lg border p-4'>
                <div className='text-sm'>
                  <span className='text-muted-foreground'>Selected Items:</span>{' '}
                  <span className='font-medium'>{selectedKeys.size}</span>
                </div>
                <div className='flex items-center gap-6'>
                  <div className='text-right'>
                    <div className='text-muted-foreground text-xs font-medium uppercase'>
                      Total To Pay
                    </div>
                    <div className='text-primary text-2xl font-bold'>
                      ${totalNetPayout.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    onClick={handleGeneratePayout}
                    disabled={selectedKeys.size === 0 || isCreatingPayout}
                    size='lg'
                  >
                    <Calculator className='mr-2 h-4 w-4' />
                    {isCreatingPayout
                      ? 'Generating...'
                      : 'Generate Payout Report'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <ResetPasswordDialog
          open={isResetPasswordOpen}
          onOpenChange={setIsResetPasswordOpen}
          vendorId={vendor.id}
          vendorName={vendor.companyName}
        />
        <VendorsMutateDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          currentRow={vendor}
        />
        <AddSplitDialog
          open={isAddSplitOpen}
          onOpenChange={setIsAddSplitOpen}
          vendorId={vendorId}
        />
        <EditSplitDialog
          open={!!editingSplit}
          onOpenChange={(open) => !open && setEditingSplit(null)}
          vendorId={vendorId}
          split={editingSplit}
        />
        <ConfirmDeleteDialog
          open={!!deleteSplitId}
          onOpenChange={(open) => !open && setDeleteSplitId(null)}
          onConfirm={async () => {
            if (deleteSplitId) {
              await removeSplit(deleteSplitId)
              setDeleteSplitId(null)
            }
          }}
          title='Delete Platform Split?'
          description='Are you sure you want to remove this platform? This will delete the specific commission settings for this vendor.'
          isPending={isDeletingSplit}
        />
      </div>
    </>
  )
}
