import { redact } from './redact'

/**
 * The vendor boundary.
 *
 * The API layer emits three kinds of signal — spans, metrics, and errors —
 * against this interface and nothing else. Sentry, Datadog, New Relic, or an
 * OpenTelemetry exporter is then ~40 lines of adapter registered at startup,
 * and swapping one for another touches one file rather than every call site.
 *
 * No provider is bundled. Adding a vendor SDK is a decision with real bundle
 * and privacy cost, and it should be made deliberately rather than inherited
 * from an architecture document.
 */

export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined
}

export interface TelemetrySpan {
  name: string
  /** Milliseconds. */
  duration: number
  attributes: SpanAttributes
  status: 'ok' | 'error' | 'cancelled'
  traceId?: string
  spanId?: string
}

export interface TelemetryMetric {
  name: string
  value: number
  /**
   * `counter` accumulates, `histogram` records a distribution (durations),
   * `gauge` is a point-in-time reading.
   */
  type: 'counter' | 'histogram' | 'gauge'
  /**
   * Bounded-cardinality labels only. A URL with an id in it must never
   * appear here — it produces one time series per entity and will get the
   * metric dropped by any serious backend.
   */
  labels?: Record<string, string>
}

export interface TelemetryErrorEvent {
  error: unknown
  /** Structured context; redacted before it reaches the provider. */
  context?: Record<string, unknown>
  /** `error` pages someone, `warning` is a signal, `info` is a breadcrumb. */
  severity?: 'error' | 'warning' | 'info'
  fingerprint?: string[]
}

export interface TelemetryProvider {
  name: string
  recordSpan?(span: TelemetrySpan): void
  recordMetric?(metric: TelemetryMetric): void
  recordError?(event: TelemetryErrorEvent): void
  /**
   * Returns the active trace context, if the provider maintains one, so the
   * API client can propagate it as a `traceparent` header. Returning
   * undefined means "no distributed tracing" and no header is sent — we do
   * not invent trace ids the backend has no way to correlate.
   */
  currentTraceContext?(): { traceId: string; spanId: string } | undefined
}

class TelemetryRegistry {
  private providers: TelemetryProvider[] = []

  register(provider: TelemetryProvider): () => void {
    this.providers.push(provider)
    return () => {
      this.providers = this.providers.filter((p) => p !== provider)
    }
  }

  reset(): void {
    this.providers = []
  }

  get registered(): string[] {
    return this.providers.map((p) => p.name)
  }

  span(span: TelemetrySpan): void {
    this.each((p) => p.recordSpan?.(span))
  }

  metric(metric: TelemetryMetric): void {
    this.each((p) => p.recordMetric?.(metric))
  }

  error(event: TelemetryErrorEvent): void {
    const safe: TelemetryErrorEvent = {
      ...event,
      context: event.context ? (redact(event.context) as Record<string, unknown>) : undefined,
    }
    this.each((p) => p.recordError?.(safe))
  }

  traceContext(): { traceId: string; spanId: string } | undefined {
    for (const provider of this.providers) {
      const ctx = provider.currentTraceContext?.()
      if (ctx) return ctx
    }
    return undefined
  }

  private each(fn: (provider: TelemetryProvider) => void): void {
    for (const provider of this.providers) {
      try {
        fn(provider)
      } catch {
        // Telemetry must never take the application down with it.
      }
    }
  }
}

export const telemetry = new TelemetryRegistry()

/**
 * Example adapter, kept here as executable documentation of the contract.
 * Not registered by default.
 *
 * ```ts
 * // src/lib/observability/providers/sentry.ts
 * telemetry.register({
 *   name: 'sentry',
 *   recordError: ({ error, context, severity }) =>
 *     Sentry.captureException(error, { extra: context, level: severity }),
 *   currentTraceContext: () => {
 *     const span = Sentry.getActiveSpan()
 *     return span && { traceId: span.spanContext().traceId, spanId: span.spanContext().spanId }
 *   },
 * })
 * ```
 */
export type { TelemetryProvider as ObservabilityProvider }
