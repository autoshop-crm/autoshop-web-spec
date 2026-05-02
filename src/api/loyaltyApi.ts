import { http } from './http';
import { LoyaltyAccount } from '../types/models';

export const loyaltyApi = {
  getAccountByCustomerId: async (customerId: number) => {
    const { data } = await http.get<LoyaltyAccount>(`/api/loyalty/accounts/customer/${customerId}`);
    return data;
  }
};
