import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import type { ApiError } from '@/lib/api'
import { reportService } from './service'
import type { ExportReportInput, ExportReportResult } from '../types'

/**
 * Starts a report export.
 *
 * No cache invalidation: an export produces a file, not a change to any
 * cached resource. Modelled as a mutation rather than a query because it has
 * a side effect (it generates and stores a file) and must run on demand, not
 * on render.
 */
export function useExportReport(
  options?: Omit<
    UseMutationOptions<ExportReportResult, ApiError, ExportReportInput>,
    'mutationKey' | 'mutationFn'
  >,
) {
  return useMutation<ExportReportResult, ApiError, ExportReportInput>({
    mutationKey: ['reports', 'export'],
    mutationFn: (input) => reportService.export(input),
    ...options,
  })
}
