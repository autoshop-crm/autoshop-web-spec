import { http } from './http';
import { LoyaltySettingsDTO } from '../types/models';

export const crmLoyaltySettingsApi = {
  getSettings: async () => {
    const { data } = await http.get<LoyaltySettingsDTO>('/api/loyalty/settings');
    return data;
  }
};
