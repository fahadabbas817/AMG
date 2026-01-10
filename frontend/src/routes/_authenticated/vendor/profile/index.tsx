import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { useGetVendor } from '@/features/vendors/api/useGetVendor'
import { EditProfileDialog } from '@/features/vendors/components/edit-profile-dialog'
import { ProfileInfoCard } from '@/features/vendors/components/profile-info-card'

export const Route = createFileRoute('/_authenticated/vendor/profile/')({
  component: VendorProfilePage,
})

function VendorProfilePage() {
  const { auth } = useAuthStore()
  const vendorId = auth.user?.userId ? String(auth.user.userId) : ''
  const { data: vendor, isLoading } = useGetVendor(vendorId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<'company' | 'bank' | null>(
    null
  )

  const handleEdit = (category: 'company' | 'bank') => {
    setEditCategory(category)
    setDialogOpen(true)
  }

  const getBankData = () => {
    if (!vendor?.bankDetails) return {}
    const {
      bankName,
      bankAddress,
      accountNumber,
      ibanRouting,
      swiftCode,
      currency,
      payoutMethod,
      paypalEmail,
    } = vendor.bankDetails
    return {
      bankName,
      accountNumber: masked(accountNumber),
      bankAddress,
      ibanRouting,
      swiftCode,
      currency,
      payoutMethod,
      paypalEmail,
    }
  }

  const masked = (str?: string | null) => {
    if (!str) return ''
    if (str.length <= 4) return str
    return '****' + str.slice(-4)
  }

  const getCompanyData = () => {
    if (!vendor) return {}
    const { companyName, contactName, email, phone, address, vendorNumber } =
      vendor
    return {
      companyName,
      contactName,
      email,
      phone,
      address,
      vendorNumber,
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          {/* Breadcrumbs could go here */}
          <h1 className='text-xl font-bold'>My Profile</h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <div className='flex flex-1 flex-col gap-6 p-8 pt-6'>
        <h2 className='text-3xl font-bold tracking-tight'>
          Profile Management
        </h2>

        {isLoading ? (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <Skeleton className='h-[200px] w-full' />
            <Skeleton className='h-[200px] w-full' />
          </div>
        ) : vendor ? (
          <div className='flex flex-col gap-6'>
            <ProfileInfoCard
              title='Company Information'
              data={getCompanyData()}
              onEdit={() => handleEdit('company')}
              className='w-full'
            />
            <ProfileInfoCard
              title='Banking Details'
              data={getBankData()}
              onEdit={() => handleEdit('bank')}
              className='w-full'
            />
          </div>
        ) : (
          <div>Failed to load profile.</div>
        )}

        <EditProfileDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          vendorId={vendorId}
          category={editCategory}
          currentData={editCategory === 'bank' ? vendor?.bankDetails : vendor}
        />
      </div>
    </>
  )
}
