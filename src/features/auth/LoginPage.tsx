import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth/store'
import { ApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui'
import { FieldWrap, TextInput } from '@/components/ui/Field'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-card border border-border bg-surface-raised p-7 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-xl">Fix My Ride</h1>
        <p className="mt-1 text-sm text-text-muted">Sign in to manage your service center.</p>

        <div className="mt-6 flex flex-col gap-4">
          <FieldWrap label="Email" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldWrap>
          <FieldWrap label="Password" htmlFor="password">
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FieldWrap>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-critical">{error}</p>}

        <Button type="submit" className="mt-6 w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
