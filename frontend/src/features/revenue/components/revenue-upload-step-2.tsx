import React, { useMemo } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type Mapping = {
  grossRevenue: string
  lineItemName: string
  rawVendorName: string // Used to match Vendor Name
  // Add others if needed
}

// Friendly names for system fields
const SYSTEM_FIELDS = [
  { key: 'grossRevenue', label: 'Revenue Amount', required: true },
  { key: 'lineItemName', label: 'Title / Line Item', required: false },
  { key: 'rawVendorName', label: 'Vendor Name', required: true },
] as const

type Props = {
  detectedHeaders: string[]
  previewRows: any[][]
  mapping: Record<string, string> // systemKey -> headerName
  onChange: (mapping: Record<string, string>) => void
  onSave: () => void
  onBack: () => void
  isSaving: boolean
}

export const RevenueUploadStep2: React.FC<Props> = ({
  detectedHeaders,
  previewRows,
  mapping,
  onChange,
  onSave,
  onBack,
  isSaving,
}) => {
  const handleMappingChange = (systemKey: string, header: string) => {
    onChange({ ...mapping, [systemKey]: header })
  }

  // Check if all required fields are mapped
  const isValid = SYSTEM_FIELDS.every(
    (field) => !field.required || mapping[field.key]
  )

  // Reverse mapping to show usage in table headers
  // headerName -> systemKey
  const headerUsage = useMemo(() => {
    const usage: Record<string, string> = {}
    Object.entries(mapping).forEach(([key, value]) => {
      usage[value] = key
    })
    return usage
  }, [mapping])

  const getSystemLabel = (header: string) => {
    const key = headerUsage[header]
    if (!key) return null
    const field = SYSTEM_FIELDS.find((f) => f.key === key)
    return field ? field.label : key
  }

  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      {/* 1. Mapping Section */}
      <Card>
        <CardHeader>
          <CardTitle>Map Columns</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Match the columns from your uploaded file to our system fields.
          </p>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            {SYSTEM_FIELDS.map((field) => (
              <div
                key={field.key}
                className='grid grid-cols-1 gap-2 rounded-lg border p-4'
              >
                <div>
                  <Label className='text-base font-semibold'>
                    {field.label}
                    {field.required && (
                      <span className='ml-1 text-red-500'>*</span>
                    )}
                  </Label>
                </div>

                <Select
                  value={mapping[field.key] || ''}
                  onValueChange={(val) => handleMappingChange(field.key, val)}
                >
                  <SelectTrigger
                    className={mapping[field.key] ? 'border-primary' : ''}
                  >
                    <SelectValue placeholder='Select column...' />
                  </SelectTrigger>
                  <SelectContent>
                    {detectedHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Review the data below. This is exactly how it will be imported. We
            show the first {previewRows.length} rows.
          </p>
        </CardHeader>
        <CardContent>
          <div className='overflow-auto rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  {detectedHeaders.map((header) => (
                    <TableHead key={header} className='whitespace-nowrap'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-foreground font-bold'>
                          {header}
                        </span>
                        {getSystemLabel(header) ? (
                          <Badge
                            variant='default'
                            className='h-5 w-fit px-1 py-0 text-xs'
                          >
                            {getSystemLabel(header)}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground text-xs font-normal'>
                            Metadata
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {detectedHeaders.map((_, colIndex) => (
                      <TableCell key={colIndex} className='whitespace-nowrap'>
                        {row[colIndex] !== undefined && row[colIndex] !== null
                          ? String(row[colIndex])
                          : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className='flex justify-between'>
        <Button variant='outline' onClick={onBack} disabled={isSaving}>
          <ArrowLeft className='mr-2 h-4 w-4' /> Back
        </Button>
        <Button onClick={onSave} disabled={!isValid || isSaving}>
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              Confirm & Upload <Save className='ml-2 h-4 w-4' />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
