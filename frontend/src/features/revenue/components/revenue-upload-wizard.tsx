import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useDryRunRevenueReport } from '../api/useDryRunRevenueReport'
import { usePreviewRevenueReport } from '../api/usePreviewRevenueReport'
import { useSaveRevenueReport } from '../api/useSaveRevenueReport'
import { RevenueUploadStep1, Step1Data } from './revenue-upload-step-1'
import { RevenueUploadStep2 } from './revenue-upload-step-2'
import { RevenueUploadStep3 } from './revenue-upload-step-3'

export const RevenueUploadWizard = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data>({
    platformId: '',
    month: '',
    totalAmount: '',
    invoiceNumber: '',
    paymentStatus: '',
    file: null,
  })

  // New state for Step 3: Stores the dry run summary (calculated but not saved)
  const [dryRunSummary, setDryRunSummary] = useState<any>(null)

  const [previewData, setPreviewData] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0)

  const previewMutation = usePreviewRevenueReport()
  const dryRunMutation = useDryRunRevenueReport()
  const saveMutation = useSaveRevenueReport()

  const handleStep1Next = async () => {
    if (!step1Data.file || !step1Data.platformId) return

    try {
      const data = await previewMutation.mutateAsync({
        file: step1Data.file,
        platformId: step1Data.platformId,
      })

      setPreviewData(data)

      // Pre-fill mapping if available
      if (data.suggestedMapping) {
        setMapping(data.suggestedMapping)
      }
      setHeaderRowIndex(data.headerRowIndex)

      setStep(2)
    } catch (error: any) {
      toast.error('Failed to preview file')
      console.error(error)
    }
  }

  // Re-run preview when header row index changes explicitly
  const handleHeaderRowChange = async (newIndex: number) => {
    if (!step1Data.file || !step1Data.platformId) return
    setHeaderRowIndex(newIndex)

    try {
      const data = await previewMutation.mutateAsync({
        file: step1Data.file,
        platformId: step1Data.platformId,
        headerRowIndex: newIndex,
      })
      setPreviewData(data)
      if (data.suggestedMapping) {
        setMapping(data.suggestedMapping)
      }
    } catch (error: any) {
      toast.error('Failed to preview file with new header row')
      console.error(error)
    }
  }

  // Step 2 Next: Run Dry Run (No Save)
  const handleDryRun = async () => {
    if (!step1Data.file || !step1Data.platformId) return

    try {
      const summary = await dryRunMutation.mutateAsync({
        file: step1Data.file,
        platformId: step1Data.platformId,
        month: step1Data.month,
        totalAmount: parseFloat(step1Data.totalAmount),
        mapping: mapping,
        invoiceNumber: step1Data.invoiceNumber,
        headerRowIndex: headerRowIndex,
      })

      setDryRunSummary(summary)
      setStep(3)
    } catch (error: any) {
      toast.error('Failed to process dry run: ' + error.message)
    }
  }

  // Step 3 Confirm: Final Save (Writes to DB + Syncs)
  const handleFinalSave = async () => {
    if (!step1Data.file || !step1Data.platformId) return

    try {
      await saveMutation.mutateAsync({
        file: step1Data.file,
        platformId: step1Data.platformId,
        month: step1Data.month,
        totalAmount: parseFloat(step1Data.totalAmount),
        mapping: mapping,
        invoiceNumber: step1Data.invoiceNumber,
        paymentStatus: step1Data.paymentStatus,
        headerRowIndex: headerRowIndex,
      })

      toast.success('Revenue report saved and synced successfully.')
      navigate({ to: '/' })
    } catch (error: any) {
      // Check for Conflict (409) with specific duplicate message
      if (error.response?.status === 409) {
        toast.error(
          error.response.data?.message ||
            'A duplicate report for this month/platform already exists. Please delete the existing report before re-uploading.'
        )
      } else {
        toast.error(
          'Failed to save report: ' + (error.message || 'Unknown error')
        )
      }
    }
  }

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8 text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>
          Upload Revenue Report
        </h1>
        <p className='text-muted-foreground mt-2'>Step {step} of 3</p>
      </div>

      {step === 1 && (
        <RevenueUploadStep1
          data={step1Data}
          onChange={(newData) =>
            setStep1Data((prev) => ({ ...prev, ...newData }))
          }
          onNext={handleStep1Next}
          isLoading={previewMutation.isPending}
        />
      )}

      {step === 2 && previewData && (
        <RevenueUploadStep2
          detectedHeaders={previewData.detectedHeaders}
          previewRows={previewData.sampleRows}
          mapping={mapping}
          onChange={setMapping}
          headerRowIndex={headerRowIndex}
          onHeaderRowChange={handleHeaderRowChange}
          isPreviewing={previewMutation.isPending}
          onSave={handleDryRun}
          onBack={() => setStep(1)}
          isSaving={dryRunMutation.isPending}
        />
      )}

      {step === 3 && dryRunSummary && (
        <RevenueUploadStep3
          summary={dryRunSummary}
          onConfirm={handleFinalSave}
          isSaving={saveMutation.isPending}
          invoiceNumber={step1Data.invoiceNumber}
        />
      )}
    </div>
  )
}
