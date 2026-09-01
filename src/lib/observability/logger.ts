import { redact } from './redact'

/**
 * Structured logging.
 *
 * Two things this buys over bare `console.log`:
 *
 *   1. **A level that production can turn down.** Dev logs everything at
 *      DEBUG; production logs WARN and above. Nothing has to be deleted
 *      before a release, so debug logging survives instead of being stripped
 *      and re-added by the next person.
 *   2. **Redaction that can't be forgotten.** Every field goes through
 *      `redact()` on the way out — see redact.ts for why that's at the sink.
 *
 * Records are objects, not interpolated strings, so a log drain can index
 * them and a developer can filter the browser console by field.
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

export interface LogRecord {
  timestamp: string
  level: Exclude<LogLevel, 'silent'>
  /** Subsystem, e.g. `api`, `auth`. Lets the console be filtered by prefix. */
  scope: string
  message: string
  fields?: Record<string, unknown>
}

export type LogSink = (record: LogRecord) => void

function resolveInitialLevel(): LogLevel {
  // A developer chasing a production-only bug can raise the level from the
  // console without a rebuild: localStorage.setItem('fmr.logLevel', 'debug').
  try {
    const override = localStorage.getItem('fmr.logLevel')
    if (override && (LOG_LEVELS as readonly string[]).includes(override)) return override as LogLevel
  } catch {
    // storage unavailable — fall through to the build-time default
  }
  return import.meta.env.DEV ? 'debug' : 'warn'
}

const CONSOLE_METHOD: Record<Exclude<LogLevel, 'silent'>, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
}

/**
 * Default sink. In dev it prints a readable single line with the fields
 * expanded; in production it prints the record as one object so a log
 * forwarder can pick it up whole.
 */
const consoleSink: LogSink = (record) => {
  const method = CONSOLE_METHOD[record.level]
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- the logger *is* the console boundary
    console[method](`%c${record.scope}%c ${record.message}`, 'font-weight:600', '', record.fields ?? '')
  } else {
    // eslint-disable-next-line no-console -- as above
    console[method](record)
  }
}

class Logger {
  private level: LogLevel = resolveInitialLevel()
  private sinks: LogSink[] = [consoleSink]

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }

  /** Adds a sink (a log drain, a Sentry breadcrumb bridge). Returns a detach function. */
  addSink(sink: LogSink): () => void {
    this.sinks.push(sink)
    return () => {
      this.sinks = this.sinks.filter((s) => s !== sink)
    }
  }

  /** Replaces the console sink entirely — used by tests to capture output. */
  setSinks(sinks: LogSink[]): void {
    this.sinks = sinks
  }

  private write(level: Exclude<LogLevel, 'silent'>, scope: string, message: string, fields?: Record<string, unknown>) {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.level]) return

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      // Redacting once here rather than in each sink means a sink can't
      // accidentally receive the unredacted original.
      fields: fields ? (redact(fields) as Record<string, unknown>) : undefined,
    }

    for (const sink of this.sinks) {
      try {
        sink(record)
      } catch {
        // A broken sink must never break the code that logged.
      }
    }
  }

  debug = (scope: string, message: string, fields?: Record<string, unknown>) =>
    this.write('debug', scope, message, fields)
  info = (scope: string, message: string, fields?: Record<string, unknown>) =>
    this.write('info', scope, message, fields)
  warn = (scope: string, message: string, fields?: Record<string, unknown>) =>
    this.write('warn', scope, message, fields)
  error = (scope: string, message: string, fields?: Record<string, unknown>) =>
    this.write('error', scope, message, fields)
}

export const logger = new Logger()

/** Binds a scope so a module doesn't repeat it on every call. */
export function scopedLogger(scope: string) {
  return {
    debug: (message: string, fields?: Record<string, unknown>) => logger.debug(scope, message, fields),
    info: (message: string, fields?: Record<string, unknown>) => logger.info(scope, message, fields),
    warn: (message: string, fields?: Record<string, unknown>) => logger.warn(scope, message, fields),
    error: (message: string, fields?: Record<string, unknown>) => logger.error(scope, message, fields),
  }
}
