import { restClient } from '../client';
import type { Season } from '@/graphql/generated/graphql';

export interface SeasonInput {
  name?: string;
  seasonType?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  color?: string;
  notes?: string;
}

export async function createSeason(hotelId: string, input: SeasonInput): Promise<Season> {
  const { data } = await restClient.post(`/admin/hotels/${hotelId}/seasons`, input);
  return data as Season;
}

export async function updateSeason(id: string, input: SeasonInput): Promise<Season> {
  const { data } = await restClient.put(`/admin/seasons/${id}`, input);
  return data as Season;
}

export async function deleteSeason(id: string): Promise<void> {
  await restClient.delete(`/admin/seasons/${id}`);
}
