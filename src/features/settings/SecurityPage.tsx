import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/lib/auth/store'
import { ChangePasswordCard } from './security/ChangePasswordCard'
import { MfaCard } from './security/MfaCard'

/**
 * Account security: password and two-factor authentication.
 *
 * Split from the profile screen because these are credentials rather than
 * preferences. Getting a name wrong is an edit; getting a password or an MFA
 * secret wrong can cost someone access to the account — so they get their own
 * route, their own confirmations, and no shared "save" button that could
 * submit one while the user was still thinking about the other.
 *
 * `mfaEnabled` is read from the session rather than fetched here. It arrives
 * on `/auth/me` and is already resolved before this route renders, and every
 * mutation that changes it calls `refreshSession()` — so the card re-renders
 * without this screen owning a second copy of the same flag, which is how
 * the two would end up disagreeing.
 */
export default function SecurityPage() {
  const mfaEnabled = useAuthStore((s) => s.user?.mfaEnabled ?? false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Security" description="Your password and two-factor authentication." />

      <div className="flex max-w-3xl flex-col gap-6">
        <ChangePasswordCard />
        <MfaCard mfaEnabled={mfaEnabled} />
      </div>
    </div>
  )
}
