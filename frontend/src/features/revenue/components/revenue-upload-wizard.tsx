import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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

  // New state for Step 3
  const [savedReportId, setSavedReportId] = useState<string | null>(null)

  const [previewData, setPreviewData] = useState<any>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const previewMutation = usePreviewRevenueReport()
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

      setStep(2)
    } catch (error: any) {
      toast.error('Failed to preview file')
      console.error(error)
    }
  }

  const handleSave = async () => {
    if (!step1Data.file || !step1Data.platformId) return

    try {
      const response = await saveMutation.mutateAsync({
        file: step1Data.file,
        platformId: step1Data.platformId,
        month: step1Data.month,
        totalAmount: parseFloat(step1Data.totalAmount),
        mapping: mapping,
        invoiceNumber: step1Data.invoiceNumber,
        paymentStatus: step1Data.paymentStatus,
      })

      toast.success('Revenue report saved. Proceeding to review.')

      // Store ID and move to Step 3
      if (response && response.reportId) {
        setSavedReportId(response.reportId)
        setStep(3)
      } else {
        // Fallback if no ID (should not happen)
        navigate({ to: '/' })
      }
    } catch (error: any) {
      toast.error('Failed to save report: ' + error.message)
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
          onSave={handleSave}
          onBack={() => setStep(1)}
          isSaving={saveMutation.isPending}
        />
      )}

      {step === 3 && savedReportId && (
        <RevenueUploadStep3
          reportId={savedReportId}
          invoiceNumber={step1Data.invoiceNumber}
        />
      )}
    </div>
  )
}
