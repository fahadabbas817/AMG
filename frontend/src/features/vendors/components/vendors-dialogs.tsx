import { VendorsDeleteDialog } from './vendors-delete-dialog'
import { VendorsMutateDialog } from './vendors-mutate-dialog'
import { useVendors } from './vendors-provider'

export function VendorsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useVendors()
  return (
    <>
      <VendorsMutateDialog
        key='vendor-mutate-dialog'
        open={open === 'add' || open === 'edit'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setTimeout(() => {
              setCurrentRow(null)
            }, 500)
          }
        }}
        currentRow={currentRow ?? undefined}
      />

      {/* Placeholders for other dialogs */}
      {open === 'delete' && currentRow && (
        <VendorsDeleteDialog
          open={open === 'delete'}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setOpen(null)
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }
          }}
          vendor={currentRow}
        />
      )}
      {open === 'details' && console.log('Details dialog open')}
      {open === 'splits' && console.log('Splits dialog open')}
    </>
  )
}
