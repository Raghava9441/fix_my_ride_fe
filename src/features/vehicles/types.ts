export interface Vehicle {
  _id: string
  registrationNumber: string
  make: string
  model: string
  year: number
  fuelType: string
  color?: string
  currentOdometer?: {
    value: number
    unit: string
  }
  serviceSchedule?: {
    nextServiceDueDate?: string
  }
}
