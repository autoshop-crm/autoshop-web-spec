import { http } from './http';

export interface BookingDateAvailabilityItem {
  date: string;
  available: boolean;
  reason: 'PAST' | 'CLOSED' | 'NO_EMPLOYEE' | 'FULL' | string | null;
}

export interface BookingSlotItem {
  startAt: string;
  endAt: string;
  slotMinutes: number;
  available: boolean;
  availableEmployeeCount: number;
}

interface BookingAvailabilityParams {
  vehicleId: number;
  serviceIds: number[];
  from?: string;
  days?: number;
}

interface BookingSlotsParams {
  vehicleId: number;
  serviceIds: number[];
  date: string;
}

export const customerBookingApi = {
  getAvailability: async ({ vehicleId, serviceIds, from, days }: BookingAvailabilityParams) => {
    const { data } = await http.get<BookingDateAvailabilityItem[]>('/api/customers/me/booking/availability', {
      params: {
        vehicleId,
        serviceIds,
        from,
        days
      }
    });
    return data;
  },
  getSlots: async ({ vehicleId, serviceIds, date }: BookingSlotsParams) => {
    const { data } = await http.get<BookingSlotItem[]>('/api/customers/me/booking/slots', {
      params: {
        vehicleId,
        serviceIds,
        date
      }
    });
    return data;
  }
};
