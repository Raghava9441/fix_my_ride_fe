import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Field,
  SelectInput,
  Switch,
  TextInput,
  useToast,
} from '@/components/ui'
import { ChevronRightIcon, LockIcon, SettingsIcon } from '@/components/icons'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS } from '@/lib/routing'
import { useAuthStore } from '@/lib/auth/store'
import { useMyAccount, useUpdateProfile } from '@/features/auth/api'
import { useOwner, useUpdateOwner } from '@/features/owners/api'
import type { AccountPreferences } from '@/features/accounts/types'
import { ProfileHero } from './profile/ProfileHero'
import { ProfileCompleteness } from './profile/ProfileCompleteness'
import { SignInHistory } from './profile/SignInHistory'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED']

/**
 * Timezones from the platform rather than a hard-coded list — a stale list of
 * a few dozen is wrong for most of the world.
 *
 * `current` is folded in when the platform doesn't list it, and that guard is
 * not theoretical: accounts here are seeded with `UTC`, which is a valid IANA
 * zone that `supportedValuesOf` omits (it reports the canonical `Etc/UTC`
 * instead). Without this the select fell back to its first option —
 * `Africa/Abidjan` — and saving the form would have silently overwritten the
 * user's real timezone with an alphabetical accident.
 */
function timezones(current?: string): string[] {
  let zones: string[] = []

  try {
    zones =
      (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
        'timeZone',
      ) ?? []
  } catch {
    // Older engine; fall through to the guessed local zone.
  }

  if (zones.length === 0) {
    zones = [Intl.DateTimeFormat().resolvedOptions().timeZone].filter(Boolean)
  }

  return current && !zones.includes(current) ? [current, ...zones] : zones
}

/**
 * The profile screen.
 *
 * ---- Why each section saves on its own ----
 *
 * One "Save" for the whole page would be simpler to write and worse to use:
 * the sections write to *different endpoints* (name and alternate contacts
 * live on the owner profile; phone, locale, and notifications live on the
 * account), so a single button would have to fan out and then explain a
 * partial failure. Saving per section means a failure is scoped to the thing
 * that failed, and the buttons stay disabled until something actually changed.
 */
export default function ProfilePage() {
  const session = useAuthStore((s) => s.user)
  const account = useMyAccount()
  const owner = useOwner(session?.ownerProfileId ?? undefined)

  const displayName =
    [owner.data?.firstName, owner.data?.lastName].filter(Boolean).join(' ') ||
    session?.name ||
    session?.email?.split('@')[0] ||
    'Your account'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <PageHeader
        title="Your profile"
        description="Your details, how we reach you, and what you see."
      />

      <ProfileHero account={account.data} displayName={displayName} loading={account.isLoading} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <PersonalDetailsSection />
          <RegionalSection />
          <NotificationsSection />
        </div>

        {/* Sticky on desktop so the summary stays with you while you edit;
            plain flow on mobile, where sticky would eat the viewport. */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start">
          <ProfileCompleteness account={account.data} owner={owner.data} />
          <ShortcutsCard />
          <SignInHistory account={account.data} />
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PersonalDetailsSection() {
  const toast = useToast()
  const session = useAuthStore((s) => s.user)
  const ownerId = session?.ownerProfileId ?? undefined

  const account = useMyAccount()
  const owner = useOwner(ownerId)
  const updateOwner = useUpdateOwner(ownerId ?? '')
  const updateAccount = useUpdateProfile()

  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    alternateEmail: '',
    alternatePhone: '',
  })
  const [dirty, setDirty] = useState(false)

  // Seeded from the server once loaded. Without the `dirty` guard a background
  // refetch would overwrite what the user is mid-way through typing.
  useEffect(() => {
    if (dirty) return
    setValues({
      firstName: owner.data?.firstName ?? '',
      lastName: owner.data?.lastName ?? '',
      phone: account.data?.phone ?? '',
      alternateEmail: owner.data?.alternateEmail ?? '',
      alternatePhone: owner.data?.alternatePhone ?? '',
    })
  }, [owner.data, account.data, dirty])

  const set = (key: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setDirty(true)
  }

  const pending = updateOwner.isPending || updateAccount.isPending
  const error = asApiError(updateOwner.error ?? updateAccount.error)

  const save = async () => {
    try {
      /*
       * Two endpoints, because the fields genuinely live in two places: the
       * account owns the phone number it authenticates with, the owner profile
       * owns the person's name and alternate contacts. Run sequentially rather
       * than in parallel so a failure on the first doesn't leave the second
       * applied with no way to tell which half landed.
       */
      if (ownerId) {
        await updateOwner.mutateAsync({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          // Same reasoning: an empty string clears, absent means unchanged.
          alternateEmail: values.alternateEmail.trim(),
          alternatePhone: values.alternatePhone.trim(),
        })
      }
      // `null`, not `undefined` — see the note on `updateProfile`.
      await updateAccount.mutateAsync({ phone: values.phone.trim() || null })

      setDirty(false)
      toast.success('Profile updated')
    } catch {
      // Surfaced inline below; the toast would duplicate it.
    }
  }

  return (
    <Card>
      <CardHeader title="Personal details" description="How your name appears across the workspace." />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name">
          {(props) => (
            <TextInput
              {...props}
              value={values.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              autoComplete="given-name"
              disabled={!ownerId}
            />
          )}
        </Field>

        <Field label="Last name">
          {(props) => (
            <TextInput
              {...props}
              value={values.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              autoComplete="family-name"
              disabled={!ownerId}
            />
          )}
        </Field>

        <Field
          label="Email"
          hint="Changing this needs verification — contact an admin for now."
        >
          {(props) => (
            /*
             * Read-only on purpose. The account's email is its identity and
             * the server refuses to change it here; an editable field that
             * silently discards its value would be worse than a disabled one.
             */
            <TextInput {...props} value={account.data?.email ?? ''} disabled readOnly />
          )}
        </Field>

        <Field label="Phone">
          {(props) => (
            <TextInput
              {...props}
              type="tel"
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              autoComplete="tel"
              placeholder="+91 98765 43210"
            />
          )}
        </Field>

        <Field label="Alternate email" hint="Used only if we can't reach the primary.">
          {(props) => (
            <TextInput
              {...props}
              type="email"
              value={values.alternateEmail}
              onChange={(e) => set('alternateEmail', e.target.value)}
              disabled={!ownerId}
            />
          )}
        </Field>

        <Field label="Alternate phone">
          {(props) => (
            <TextInput
              {...props}
              type="tel"
              value={values.alternatePhone}
              onChange={(e) => set('alternatePhone', e.target.value)}
              disabled={!ownerId}
            />
          )}
        </Field>

        {!ownerId && (
          <p className="text-xs text-text-muted sm:col-span-2">
            Name and alternate contacts live on a customer profile, which this account doesn’t have.
            Phone and preferences below still apply.
          </p>
        )}

        {error && <p className="text-sm text-critical sm:col-span-2">{error.userMessage}</p>}
      </CardBody>

      <CardFooter>
        <Button size="sm" onClick={save} loading={pending} disabled={!dirty}>
          Save details
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function RegionalSection() {
  const toast = useToast()
  const account = useMyAccount()
  const updateAccount = useUpdateProfile()

  const [values, setValues] = useState({ language: 'en', timezone: '', currency: 'USD' })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (dirty || !account.data) return
    setValues({
      language: account.data.preferences?.language ?? 'en',
      timezone:
        account.data.preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: account.data.preferences?.currency ?? 'USD',
    })
  }, [account.data, dirty])

  const set = (key: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setDirty(true)
  }

  const error = asApiError(updateAccount.error)

  return (
    <Card>
      <CardHeader
        title="Language & region"
        description="Applies to your account everywhere you sign in."
      />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Language">
          {(props) => (
            <SelectInput
              {...props}
              value={values.language}
              onChange={(e) => set('language', e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Timezone">
          {(props) => (
            <SelectInput
              {...props}
              value={values.timezone}
              onChange={(e) => set('timezone', e.target.value)}
            >
              {timezones(values.timezone).map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Currency">
          {(props) => (
            <SelectInput
              {...props}
              value={values.currency}
              onChange={(e) => set('currency', e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        {/* Appearance is deliberately elsewhere: it's per-device and stored in
            this browser, while everything on this card follows the account. */}
        <p className="text-xs text-text-muted sm:col-span-3">
          Theme, density, and text size are per-device and live under{' '}
          <Link to={ROUTE_PATHS.appearance} className="font-semibold text-accent hover:underline">
            Appearance
          </Link>
          .
        </p>

        {error && <p className="text-sm text-critical sm:col-span-3">{error.userMessage}</p>}
      </CardBody>

      <CardFooter>
        <Button
          size="sm"
          disabled={!dirty}
          loading={updateAccount.isPending}
          onClick={() =>
            updateAccount.mutate(
              {
                preferences: {
                  ...account.data?.preferences,
                  language: values.language,
                  timezone: values.timezone,
                  currency: values.currency,
                },
              },
              {
                onSuccess: () => {
                  setDirty(false)
                  toast.success('Preferences saved')
                },
              },
            )
          }
        >
          Save preferences
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function NotificationsSection() {
  const toast = useToast()
  const account = useMyAccount()
  const updateAccount = useUpdateProfile()

  const [prefs, setPrefs] = useState<NonNullable<AccountPreferences['notificationPreferences']>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (dirty || !account.data) return
    setPrefs(account.data.preferences?.notificationPreferences ?? {})
  }, [account.data, dirty])

  const setEmail = (key: 'marketing' | 'transactional' | 'security', value: boolean) => {
    setPrefs((p) => ({ ...p, email: { ...p.email, [key]: value } }))
    setDirty(true)
  }

  const error = asApiError(updateAccount.error)

  return (
    <Card>
      <CardHeader title="Notifications" description="What we send, and where." />
      <CardBody className="flex flex-col gap-4">
        <section className="flex flex-col gap-1">
          <h3 className="px-3 text-[11px] font-bold uppercase tracking-wide text-text-faint">Email</h3>

          <Switch
            label="Service and account updates"
            description="Booking confirmations, invoices, and reminders."
            checked={prefs.email?.transactional ?? true}
            onChange={(v) => setEmail('transactional', v)}
          />

          {/*
            Security email is intentionally not switchable. Sign-in alerts and
            password-change notices are how someone finds out their account was
            taken over — an off switch here is a feature for an attacker.
          */}
          <Switch
            label="Security alerts"
            description="Always on. Sign-ins and password changes are how you'd spot a compromise."
            checked
            disabled
            onChange={() => {}}
          />

          <Switch
            label="Product news"
            description="Occasional updates about new features."
            checked={prefs.email?.marketing ?? false}
            onChange={(v) => setEmail('marketing', v)}
          />
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="px-3 text-[11px] font-bold uppercase tracking-wide text-text-faint">
            SMS &amp; push
          </h3>

          <Switch
            label="SMS notifications"
            description="Urgent reminders by text."
            checked={prefs.sms?.enabled ?? false}
            onChange={(v) => {
              setPrefs((p) => ({ ...p, sms: { ...p.sms, enabled: v } }))
              setDirty(true)
            }}
          />

          <Switch
            label="Push notifications"
            description="On devices where you've allowed them."
            checked={prefs.push?.enabled ?? false}
            onChange={(v) => {
              setPrefs((p) => ({ ...p, push: { ...p.push, enabled: v } }))
              setDirty(true)
            }}
          />
        </section>

        {error && <p className="text-sm text-critical">{error.userMessage}</p>}
      </CardBody>

      <CardFooter>
        <Button
          size="sm"
          disabled={!dirty}
          loading={updateAccount.isPending}
          onClick={() =>
            updateAccount.mutate(
              {
                preferences: {
                  ...account.data?.preferences,
                  notificationPreferences: {
                    ...prefs,
                    // Re-asserted on every save so a stale or hand-crafted
                    // payload can't quietly turn security mail off.
                    email: { ...prefs.email, security: true },
                  },
                },
              },
              {
                onSuccess: () => {
                  setDirty(false)
                  toast.success('Notification preferences saved')
                },
              },
            )
          }
        >
          Save notifications
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function ShortcutsCard() {
  const items = [
    {
      to: ROUTE_PATHS.security,
      icon: LockIcon,
      label: 'Security',
      description: 'Password and two-factor',
    },
    {
      to: ROUTE_PATHS.appearance,
      icon: SettingsIcon,
      label: 'Appearance',
      description: 'Theme, density, text size',
    },
  ]

  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-2">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="interactive flex items-center gap-3 rounded-input px-2.5 py-2.5 hover:bg-surface-sunken"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-input bg-surface-sunken text-text-muted">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="block truncate text-xs text-text-muted">{item.description}</span>
            </span>
            <ChevronRightIcon className="h-4 w-4 flex-none text-text-faint" />
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}
