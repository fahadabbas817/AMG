import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/privacy-policy')({
  component: PrivacyPolicy,
})

function PrivacyPolicy() {
  return (
    <div className='bg-background min-h-screen p-4 md:p-8'>
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-3xl font-bold tracking-tight'>Privacy Policy</h1>
          <Button asChild variant='outline' size='sm'>
            <Link to='/sign-in'>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Sign In
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AMG Vendor Database Management System</CardTitle>
            <p className='text-muted-foreground text-sm'>
              Last Updated: 11th January 2026
            </p>
          </CardHeader>
          <CardContent className='space-y-6 text-sm leading-relaxed'>
            <section>
              <p>
                This Privacy Policy describes how AMG Vendor Database Management
                System ("we", "us", or "our") collects, uses, and discloses your
                information when you use our AMG Vendor Database Management
                System application (the "Service") which integrates with
                QuickBooks Online.
              </p>
              <p className='mt-2'>
                By accessing or using the Service, you desire to agree to be
                bound by this Privacy Policy. If you do not agree to this
                Privacy Policy, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                1. Information We Collect
              </h2>
              <p>
                We collect information necessary to provide our Service,
                calculate commissions, and sync data with QuickBooks Online.
                This includes:
              </p>

              <h3 className='mt-3 font-medium'>
                A. Information You Provide to Us
              </h3>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Contact Information</strong>: When you register or
                  contact us, we collect your name, email address, phone number,
                  and company details.
                </li>
                <li>
                  <strong>Account Credentials</strong>: We store secure
                  authentication tokens to maintain your connection with our
                  Service.
                </li>
              </ul>

              <h3 className='mt-3 font-medium'>
                B. Information Accessed from QuickBooks Online
              </h3>
              <p>
                Our Service integrates with QuickBooks Online via API. Upon your
                authorization, we access the following financial data:
              </p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Invoices & Bills</strong>: To calculate vendor
                  commissions and generate payout reports.
                </li>
                <li>
                  <strong>Vendor Details</strong>: To identify payees and sync
                  expense data securely.
                </li>
                <li>
                  <strong>Company Info</strong>: Basic company profile data
                  required for the integration context.
                </li>
              </ul>
              <p className='mt-2 font-medium'>
                We do not collect or store your QuickBooks Online login
                credentials. Authentication is handled securely via OAuth 2.0.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                2. Purpose of Processing
              </h2>
              <p>We process your data for the following specific purposes:</p>
              <ol className='ml-4 list-decimal space-y-1'>
                <li>
                  <strong>Commission Calculation</strong>: To automatically
                  compute vendor commissions based on retrieved Invoice and Bill
                  data.
                </li>
                <li>
                  <strong>Payout Report Generation</strong>: To create accurate
                  financial payout reports for your review and approval.
                </li>
                <li>
                  <strong>Data Synchronization</strong>: To sync approved
                  expense and bill data back to your QuickBooks Online account
                  ensuring your books are up-to-date.
                </li>
                <li>
                  <strong>Service Maintenance</strong>: To provide customer
                  support, troubleshoot issues, and ensure the security of our
                  application.
                </li>
              </ol>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                3. Data Sharing and Disclosure
              </h2>
              <p>
                We respect your data privacy.{' '}
                <strong>
                  We do not sell your personal or financial data to third
                  parties.
                </strong>
              </p>
              <p className='mt-2'>
                We share data only in the following circumstances:
              </p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Intuit (QuickBooks Online)</strong>: Data is shared
                  with Intuit to fulfill the core functionality of the Service
                  (e.g., creating bills in your QuickBooks account). This
                  sharing is governed by your agreement with Intuit.
                </li>
                <li>
                  <strong>Service Providers</strong>: We use trusted third-party
                  infrastructure providers to host and secure our Service:
                  <ul className='ml-4 list-[circle]'>
                    <li>
                      <strong>Heroku / AWS</strong>: For secure cloud hosting
                      and data storage.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Legal Requirements</strong>: We may disclose
                  information if required by law, subpoena, or other legal
                  process.
                </li>
              </ul>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>4. Data Security</h2>
              <p>
                We employ industry-standard security measures to protect your
                data:
              </p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Encryption in Transit</strong>: All data transmitted
                  between your browser, our servers, and QuickBooks Online is
                  encrypted using SSL/TLS (Secure Sockets Layer/Transport Layer
                  Security) protocols.
                </li>
                <li>
                  <strong>Encryption at Rest</strong>: Sensitive data stored in
                  our databases is encrypted to prevent unauthorized access.
                </li>
                <li>
                  <strong>Secure Token Storage</strong>: OAuth tokens used for
                  QuickBooks authentication are stored securely using
                  environment variables and encrypted storage mechanisms,
                  strictly isolating them from codebase and public access.
                </li>
              </ul>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                5. User Rights and Data Control
              </h2>
              <p>You have the following rights regarding your data:</p>
              <ul className='ml-4 list-disc space-y-1'>
                <li>
                  <strong>Access and Correction</strong>: You may access or
                  update your account information by logging into the Service or
                  contacting us.
                </li>
                <li>
                  <strong>Disconnecting QuickBooks</strong>: You can disconnect
                  the Service from your QuickBooks Online company at any time
                  via the "Apps" tab in QuickBooks Online or through our
                  application's settings. Upon disconnection, we will cease
                  fetching new data.
                </li>
                <li>
                  <strong>Data Deletion</strong>: You may request the deletion
                  of your personal data and account by contacting us at the
                  email below. We will delete your data within a reasonable
                  timeframe, except where retention is required by law.
                </li>
              </ul>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>
                6. Changes to This Privacy Policy
              </h2>
              <p>
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last Updated" date. You are advised
                to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className='mb-2 text-lg font-semibold'>7. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or our data
                practices, please contact us at:
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
