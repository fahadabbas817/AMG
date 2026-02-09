import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/eula')({
  component: EulaPage,
})

function EulaPage() {
  return (
    <div className='bg-background min-h-screen p-4 md:p-8'>
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-3xl font-bold tracking-tight'>
            End User License Agreement
          </h1>
          <Button asChild variant='outline' size='sm'>
            <Link to='/sign-in'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Sign In
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AMG Vendor Database Management System EULA</CardTitle>
            <p className='text-muted-foreground text-sm'>
              Last Updated: 11th January 2026
            </p>
          </CardHeader>
          <CardContent className='space-y-6 text-sm leading-relaxed'>
            <section>
              <p>
                This End User License Agreement ("Agreement") is a binding legal
                agreement between you ("Licensee" or "User") and All Media Group
                ("Licensor", "Company", "we", or "us") for the use of the AMG
                Vendor Database Management System ("Software" or "Service").
              </p>
              <p className='mt-2'>
                By accessing, installing, or using the Software, you agree to be
                bound by the terms of this Agreement. If you do not agree to the
                terms of this Agreement, do not install or use the Software.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>1. License Grant</h2>
              <p>
                Subject to your compliance with this Agreement, All Media Group
                grants you a limited, non-exclusive, non-transferable,
                non-sublicensable, and revocable license to use the Software
                solely for your internal business accounting and vendor
                management purposes.
              </p>
              <p className='mt-2 font-medium'>
                This Software is licensed, not sold. You acknowledge that you
                obtain no ownership rights to the Software itself, but only a
                license to use it in accordance with this Agreement.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                2. Restrictions on Use
              </h2>
              <p>You agree not to resolve to, and will not permit others to:</p>
              <ol className='ml-4 list-decimal space-y-1'>
                <li>
                  <strong>Reverse Engineering</strong>: Decompile, disassemble,
                  reverse engineer, or attempt to derive the source code of the
                  Software.
                </li>
                <li>
                  <strong>Illegal Activities</strong>: Use the Software for any
                  unlawful financial activities, money laundering, fraud, or
                  purposes restricted by applicable laws.
                </li>
                <li>
                  <strong>Security Bypass</strong>: Attempt to bypass, modify,
                  or tamper with the QuickBooks Online API security mechanisms,
                  authentication protocols, or any other security features of
                  the Software.
                </li>
                <li>
                  <strong>Distribution</strong>: Rent, lease, lend, sell,
                  redistribute, or sublicense the Software.
                </li>
              </ol>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                3. QuickBooks Integration
              </h2>
              <p>
                The Software acts as an "Integration" with QuickBooks Online.
              </p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Intuit Terms</strong>: By using this Software, you
                  acknowledge and agree that your use of the QuickBooks Online
                  data and services is also subject to Intuit’s Terms of Service
                  and Privacy Policy.
                </li>
                <li>
                  <strong>Data Accuracy</strong>: We are not responsible for the
                  accuracy of the data as it exists within QuickBooks Online
                  prior to synchronization, nor for changes made directly within
                  QuickBooks that affect the Software's reports.
                </li>
              </ul>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                4. Limitation of Liability
              </h2>
              <p className='font-bold uppercase'>
                The Software is provided "AS IS", without warranty of any kind,
                express or implied.
              </p>
              <p className='mt-2'>
                To the maximum extent permitted by applicable law, in no event
                shall All Media Group be liable for:
              </p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  Any indirect, incidental, special, consequential, or punitive
                  damages.
                </li>
                <li>
                  Any accounting errors, financial discrepancies, tax penalties,
                  or data loss resulting from the use of the Software or the
                  synchronization process.
                </li>
                <li>
                  Any damages resulting from unauthorized access to or use of
                  our servers and/or any personal information stored therein.
                </li>
              </ul>
              <p className='mt-2'>
                It is your responsibility to verify all financial data and
                payouts generated by the Software before processing actual
                payments.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>5. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your access to the
                Software and this license immediately, without prior notice or
                liability, for any reason whatsoever, including without
                limitation:
              </p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Breach of Terms</strong>: If you breach any provision
                  of this Agreement.
                </li>
                <li>
                  <strong>Non-Payment</strong>: If applicable subscription fees
                  are not paid.
                </li>
                <li>
                  <strong>Misuse</strong>: If we detect misuse of the QuickBooks
                  connection or api quotas.
                </li>
              </ul>
              <p className='mt-2'>
                Upon termination, your right to use the Software will
                immediately cease, and you must discontinue all use of the
                Software.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>6. Governing Law</h2>
              <p>
                This Agreement shall be governed by and construed in accordance
                with the laws of Delaware, United States, without regard to its
                conflict of law provisions. Any legal action or proceeding
                arising under this Agreement will be brought exclusively in the
                federal or state courts located in Delaware, United States.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                7. Contact Information
              </h2>
              <p>
                If you have any questions about this Agreement, please contact
                us at:
              </p>
              <div className='mt-2'>
                <p>
                  <strong>Email</strong>: amy@allmediagroup.tv
                </p>
                <p>
                  <strong>Company</strong>: All Media Group
                </p>
              </div>
            </section>
          </CardContent>
        </Card>

        <div className='flex justify-center pb-8'>
          <p className='text-muted-foreground text-xs'>
            &copy; {new Date().getFullYear()} All Media Group. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
