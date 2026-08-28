import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import type { Vehicle } from './types'

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => apiRequest<Vehicle[]>({ method: 'GET', url: '/vehicles' }),
  })
}
