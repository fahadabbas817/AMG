import { PlatformsMutateDialog } from './platforms-mutate-dialog'
import { usePlatforms } from './platforms-provider'

export function PlatformsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = usePlatforms()

  return (
    <>
      <PlatformsMutateDialog
        key='platform-create'
        open={open === 'create'}
        onOpenChange={(v) => {
          if (!v) setOpen(null)
        }}
      />

      {currentRow && (
        <PlatformsMutateDialog
          key={`platform-update-${currentRow.id}`}
          open={open === 'update'}
          onOpenChange={() => {
            setOpen(null)
            setTimeout(() => setCurrentRow(null), 200)
          }}
          currentRow={currentRow}
        />
      )}
    </>
  )
}
