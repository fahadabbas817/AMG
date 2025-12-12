import { ProfileDropdown } from '@/components/profile-dropdown'

export function VendorDashboard() {
  return (
    <div className='flex h-full flex-1 flex-col'>
      {/* Header */}
      <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
        <h1 className='text-xl font-semibold'>Vendor Dashboard</h1>
        <div className='ml-auto flex items-center gap-2'>
          <ProfileDropdown />
        </div>
      </header>

      {/* Main Content */}
      <div className='flex flex-1 flex-col gap-4 p-4'>
        {/* Dashboard content commented out for future milestones */}
        <div className='flex h-full items-center justify-center'>
          <p className='text-muted-foreground text-lg'>
            Dashboard content will be added in future milestones
          </p>
        </div>

        {/* 
        <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            // Cards, graphs, tables will go here
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            // Analytics content will go here
          </TabsContent>
        </Tabs>
        */}
      </div>
    </div>
  )
}
