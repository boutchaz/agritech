import { useQuery } from '@tanstack/react-query';
import { LANDING_FALLBACK, landingApi, type LandingSettings } from '../lib/api/landing';

export const useLandingSettings = (): LandingSettings => {
  const { data } = useQuery({
    queryKey: ['landing-settings'],
    queryFn: () => landingApi.get(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
  return data ?? LANDING_FALLBACK;
};
