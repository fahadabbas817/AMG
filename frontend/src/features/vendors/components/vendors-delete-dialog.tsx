import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { useDeleteVendor } from '../api/useDeleteVendor'
import { Vendor } from '../types'

interface VendorsDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor: Vendor
}

export function VendorsDeleteDialog({
  open,
  onOpenChange,
  vendor,
}: VendorsDeleteDialogProps) {
  const { mutateAsync: deleteVendor, isPending } = useDeleteVendor()

  const handleDelete = async () => {
    try {
      await deleteVendor(vendor.id)
      onOpenChange(false)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={handleDelete}
      title={`Delete ${vendor.companyName}?`}
      description={`Are you sure you want to delete ${vendor.companyName}? This will permanently remove the vendor and all associated platform splits from the database. Financial records usage may prevent deletion.`}
      isPending={isPending}
    />
  )
}
