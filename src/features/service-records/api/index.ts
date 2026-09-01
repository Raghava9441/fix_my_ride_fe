export { serviceRecordService } from './service'

export {
  useServiceRecords,
  useInfiniteServiceRecords,
  useServiceRecord,
  useServiceRecordParts,
  useServiceRecordLabor,
  useServiceRecordDocuments,
  useServiceRecordInvoice,
  useServiceRecordFeedback,
  useServiceRecordNextService,
  usePrefetchServiceRecord,
} from './queries'

export {
  useCreateServiceRecord,
  useUpdateServiceRecord,
  useDeleteServiceRecord,
  useUpdateServiceRecordStatus,
  useAddServicePart,
  useUpdateServicePart,
  useRemoveServicePart,
  useAddServiceLabor,
  useAddServiceRecordDocument,
  useRemoveServiceRecordDocument,
  useGenerateInvoice,
  useSubmitServiceFeedback,
  useSetNextService,
} from './mutations'
