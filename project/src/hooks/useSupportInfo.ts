import { useQuery } from '@tanstack/react-query';
import { SUPPORT_FALLBACK, supportApi, type SupportInfo } from '../lib/api/support';

const QUERY_KEY = ['support-info'];

/**
 * Fetch the public support contact info (email, phone, etc.).
 * Edited from the admin-app. Falls back to defaults while loading or on error
 * so pre-auth screens (legal, pending approval) always have something to show.
 */
export const useSupportInfo = (): SupportInfo => {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => supportApi.get(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
  return data ?? SUPPORT_FALLBACK;
};
