import { ContentSection } from '../components/content-section'
import { ChangePasswordForm } from './change-password-form'

export function SettingsChangePassword() {
  return (
    <ContentSection
      title='Change Password'
      desc='Update your password to keep your account secure.'
    >
      <ChangePasswordForm />
    </ContentSection>
  )
}
