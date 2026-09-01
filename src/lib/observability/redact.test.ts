import { describe, expect, it, vi } from 'vitest'
import { REDACTED, redact, redactUrl } from './redact'
import { logger, type LogRecord } from './logger'

describe('redaction', () => {
  it('redacts credential-shaped keys', () => {
    const result = redact({
      email: 'user@example.com',
      password: 'hunter2',
      accessToken: 'abc',
      refreshToken: 'def',
      Authorization: 'Bearer xyz',
      'x-api-key': 'k',
      sessionId: 's',
    }) as Record<string, unknown>

    expect(result.password).toBe(REDACTED)
    expect(result.accessToken).toBe(REDACTED)
    expect(result.refreshToken).toBe(REDACTED)
    expect(result.Authorization).toBe(REDACTED)
    expect(result['x-api-key']).toBe(REDACTED)
    expect(result.sessionId).toBe(REDACTED)
    // Non-sensitive fields survive, or the logs are useless.
    expect(result.email).toBe('user@example.com')
  })

  it('matches key stems case- and separator-insensitively', () => {
    const result = redact({ ACCESS_TOKEN: 'a', 'Auth-Token': 'b', userPassword: 'c' }) as Record<
      string,
      unknown
    >
    expect(Object.values(result)).toEqual([REDACTED, REDACTED, REDACTED])
  })

  it('redacts a JWT even when the key looks innocent', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc123signature'
    const result = redact({ note: `token is ${jwt}` }) as Record<string, string>
    // Value-shape matching is the backstop for a field nobody thought about.
    expect(result.note).not.toContain('eyJ')
    expect(result.note).toContain(REDACTED)
  })

  it('redacts bearer prefixes in free text', () => {
    const result = redact({ header: 'Bearer sk-live-abc123' }) as Record<string, string>
    expect(result.header).toBe(`Bearer ${REDACTED}`)
  })

  it('survives circular references instead of hanging', () => {
    const cyclic: Record<string, unknown> = { name: 'root' }
    cyclic.self = cyclic
    const result = redact(cyclic) as Record<string, unknown>
    expect(result.self).toBe('[circular]')
  })

  it('caps depth and breadth so a log line cannot become a heap dump', () => {
    const wide = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]))
    const result = redact(wide) as Record<string, unknown>
    expect(result['[truncated]']).toBe(true)

    const deep = { a: { b: { c: { d: { e: { f: 'too far' } } } } } }
    expect(JSON.stringify(redact(deep))).toContain('[depth-limit]')
  })

  it('redacts sensitive query params in URLs', () => {
    expect(redactUrl('/auth/verify?token=abc123&email=a@b.com')).toContain(`token=${REDACTED}`)
    expect(redactUrl('/vehicles?q=civic')).toBe('/vehicles?q=civic')
  })
})

describe('logger', () => {
  it('redacts fields before they reach any sink', () => {
    const records: LogRecord[] = []
    logger.setSinks([(record) => records.push(record)])
    logger.setLevel('debug')

    logger.info('api', 'request', { url: '/auth/login', password: 'hunter2' })

    // Redaction happens once, centrally — a sink can never receive the
    // unredacted original.
    expect(records[0].fields?.password).toBe(REDACTED)
    expect(records[0].fields?.url).toBe('/auth/login')
  })

  it('honours the level threshold', () => {
    const sink = vi.fn()
    logger.setSinks([sink])
    logger.setLevel('warn')

    logger.debug('api', 'noisy')
    logger.info('api', 'also noisy')
    expect(sink).not.toHaveBeenCalled()

    logger.warn('api', 'worth knowing')
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it('does not let a broken sink break the caller', () => {
    logger.setSinks([
      () => {
        throw new Error('sink exploded')
      },
    ])
    logger.setLevel('debug')

    expect(() => logger.error('api', 'still fine')).not.toThrow()
  })
})
