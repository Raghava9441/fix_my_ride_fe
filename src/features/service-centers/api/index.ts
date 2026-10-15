export { serviceCenterService } from './service'

export {
  useServiceCenters,
  useNearbyServiceCenters,
  useServiceCenter,
  useServiceCenterVehicles,
  useServiceCenterStaff,
  useServiceCenterServices,
  useServiceCenterStats,
  useServiceCenterReviews,
  useServiceCenterDocuments,
  useServiceCenterSettings,
  usePrefetchServiceCenter,
} from './queries'

export {
  useCreateServiceCenter,
  useUpdateServiceCenter,
  useDeleteServiceCenter,
  useAddOfferedService,
  useUpdateOfferedService,
  useRemoveOfferedService,
  useAddServiceCenterReview,
  useVerifyServiceCenter,
  useAddServiceCenterDocument,
  useUpdateServiceCenterSettings,
} from './mutations'
