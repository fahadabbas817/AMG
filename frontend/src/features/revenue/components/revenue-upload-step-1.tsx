import React, { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  UploadCloud,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetPlatforms } from '../../platforms/api/useGetPlatforms'

export type Step1Data = {
  platformId: string
  month: string
  totalAmount: string
  invoiceNumber: string
  paymentStatus: string
  file: File | null
}

type Props = {
  data: Step1Data
  onChange: (data: Partial<Step1Data>) => void
  onNext: () => void
  isLoading?: boolean
}

export const RevenueUploadStep1: React.FC<Props> = ({
  data,
  onChange,
  onNext,
  isLoading = false,
}) => {
  const { data: platforms, isLoading: isPlatformsLoading } = useGetPlatforms()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange({ file: e.target.files[0] })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange({ file: e.dataTransfer.files[0] })
    }
  }

  // Check validity - assuming Total Amount is NOT strictly required for the 'Next' step based on previous logic, but marking it as important.
  // User explicitly asked for strict field indication.
  // Previous logic: isValid = data.platformId && data.month && data.paymentStatus && data.file
  const isValid =
    data.platformId && data.month && data.paymentStatus && data.file

  return (
    <div className='mx-auto max-w-4xl space-y-8'>
      <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
        {/* Left Column: Context & Metadata */}
        <div className='space-y-6 md:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Provide the context for this revenue report.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-6'>
              {/* Platform Select */}
              <div className='space-y-2'>
                <Label>
                  Platform <span className='text-red-500'>*</span>
                </Label>
                <Select
                  value={data.platformId}
                  onValueChange={(val) => onChange({ platformId: val })}
                  disabled={isPlatformsLoading || !platforms || isLoading}
                >
                  <SelectTrigger
                    className={
                      !data.platformId ? 'border-muted-foreground/30' : ''
                    }
                  >
                    <SelectValue placeholder='Choose a platform...' />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {/* Month */}
                <div className='space-y-2'>
                  <Label>
                    Reporting Month <span className='text-red-500'>*</span>
                  </Label>
                  <Input
                    type='date'
                    value={data.month}
                    onChange={(e) => onChange({ month: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                {/* Amount */}
                <div className='space-y-2'>
                  <Label>Total Check Amount ($)</Label>
                  <Input
                    type='number'
                    step='0.01'
                    placeholder='0.00'
                    value={data.totalAmount}
                    onChange={(e) => onChange({ totalAmount: e.target.value })}
                    disabled={isLoading}
                  />
                  <p className='text-muted-foreground text-[0.8rem]'>
                    Optional validation check
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                {/* Payment Status */}
                <div className='space-y-2'>
                  <Label>
                    Payment Status <span className='text-red-500'>*</span>
                  </Label>
                  <Select
                    value={data.paymentStatus || ''}
                    onValueChange={(val) => onChange({ paymentStatus: val })}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select Status...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='PAID'>Paid to AMG</SelectItem>
                      <SelectItem value='PENDING'>
                        Pending Payment to AMG
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Invoice */}
                <div className='space-y-2'>
                  <Label>Invoice Number (Optional)</Label>
                  <Input
                    type='text'
                    placeholder='e.g. INV-2025-001'
                    value={data.invoiceNumber || ''}
                    onChange={(e) =>
                      onChange({ invoiceNumber: e.target.value })
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: File Upload */}
        <div className='space-y-6 md:col-span-1'>
          <Card
            className={cn(
              'flex h-full flex-col',
              data.file ? 'border-primary/50 bg-primary/5' : ''
            )}
          >
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
              <CardDescription>
                Upload the statement file{' '}
                <span className='text-red-500'>*</span>
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col'>
              <div
                className={cn(
                  'hover:bg-muted/50 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200',
                  data.file
                    ? 'border-primary bg-background'
                    : 'border-muted-foreground/25',
                  isLoading && 'pointer-events-none opacity-50'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('border-primary')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-primary')
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='.csv,.xls,.xlsx'
                  className='hidden'
                  onChange={handleFileChange}
                />

                {data.file ? (
                  <div className='animate-in fade-in zoom-in space-y-3 duration-300'>
                    <div className='bg-primary/10 mx-auto w-fit rounded-full p-3'>
                      <FileText className='text-primary h-8 w-8' />
                    </div>
                    <div className='space-y-1'>
                      <p className='line-clamp-2 text-sm font-medium break-all'>
                        {data.file.name}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {(data.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <div className='pt-2'>
                      <p className='flex items-center justify-center gap-1 text-xs text-green-600'>
                        <CheckCircle2 className='h-3 w-3' /> Ready to upload
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <div className='bg-muted mx-auto w-fit rounded-full p-4'>
                      <UploadCloud className='text-muted-foreground h-8 w-8' />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-sm font-medium'>Click or drag file</p>
                      <p className='text-muted-foreground text-xs'>
                        CSV, Excel (.xlsx)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='flex items-center justify-between border-t pt-4'>
        <Button
          variant='ghost'
          onClick={() => navigate({ to: '/revenue/manual' })}
          disabled={isLoading}
          className='text-muted-foreground hover:text-foreground'
        >
          Want to enter manually?
        </Button>
        <div className='flex items-center gap-4'>
          {!isValid && (
            <p className='text-muted-foreground flex items-center gap-2 text-sm'>
              <AlertCircle className='h-4 w-4' />
              Fill required fields to proceed
            </p>
          )}
          <Button
            onClick={onNext}
            disabled={!isValid || isLoading}
            size='lg'
            className='min-w-[150px]'
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Processing...
              </>
            ) : (
              'Next Step'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
