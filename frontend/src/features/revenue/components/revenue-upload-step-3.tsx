import React, { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Props = {
  previewRows: any[][] // Array of arrays
  detectedHeaders: string[] // Headers to find index
  mapping: Record<string, string> // systemKey -> headerName
  onSave: () => void
  onBack: () => void
  isSaving: boolean
}

export const RevenueUploadStep3: React.FC<Props> = ({
  previewRows,
  detectedHeaders,
  mapping,
  onSave,
  onBack,
  isSaving,
}) => {
  // Transform raw rows based on mapping for display
  const parsedData = useMemo(() => {
    // Helper to get index of a header
    const getIndex = (headerName: string) => detectedHeaders.indexOf(headerName)

    return previewRows.map((row) => {
      // Get indices for mapped fields
      const vendorNameIndex = getIndex(mapping.rawVendorName)
      const lineItemIndex = getIndex(mapping.lineItemName)
      const amountIndex = getIndex(mapping.grossRevenue)

      return {
        vendorName: vendorNameIndex !== -1 ? row[vendorNameIndex] : null,
        lineItem: lineItemIndex !== -1 ? row[lineItemIndex] : null,
        amount: amountIndex !== -1 ? row[amountIndex] : null,
      }
    })
  }, [previewRows, mapping, detectedHeaders])

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Preview Data</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Review the data before saving. Showing first {previewRows.length}{' '}
            rows.
          </p>
        </CardHeader>
        <CardContent>
          <div className='overflow-hidden rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor (Raw)</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className='font-medium'>
                      {row.vendorName || (
                        <span className='text-muted-foreground italic'>
                          Missing
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{row.lineItem || '-'}</TableCell>
                    <TableCell className='text-right'>
                      {row.amount ? `$${Number(row.amount).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {/* Placeholder status since we don't have live matching yet */}
                      <Badge
                        variant='outline'
                        className='text-muted-foreground'
                      >
                        Pending Save
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-between'>
        <Button variant='outline' onClick={onBack} disabled={isSaving}>
          Back
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Confirm & Upload'}
        </Button>
      </div>
    </div>
  )
}
