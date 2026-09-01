import { afterEach, beforeEach, vi } from 'vitest'
import { logger } from '@/lib/observability/logger'
import { telemetry } from '@/lib/observability/telemetry'
import { apiMetrics } from '@/lib/observability/metrics'
import { retryBudget } from '@/lib/api/retry'
import { requestDeduplicator } from '@/lib/api/dedupe'
import { __resetRefreshState } from '@/lib/api/authRefresh'

/**
 * Global test setup.
 *
 * The API layer keeps deliberate module-level state — the retry budget, the
 * in-flight deduplication map, the single-flight refresh promise. That state
 * is correct in the browser and poison between test cases, so it is reset
 * here rather than in each file (where it would eventually be forgotten and
 * produce a test that only passes in isolation).
 */

beforeEach(() => {
  // Silence log output by default; tests that assert on logging install
  // their own sink.
  logger.setSinks([])
  logger.setLevel('debug')

  retryBudget.reset()
  requestDeduplicator.abortAll('test reset')
  __resetRefreshState()
  apiMetrics.reset()
  telemetry.reset()

  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})
