'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function CodeExchanger() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const redeemingRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || redeemingRef.current) return;

    redeemingRef.current = true;

    const redeemCode = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/exchange-code/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (response.ok) {
          const { access_token, refresh_token } = await response.json();
          const supabase = createBrowserSupabaseClient();
          await supabase.auth.setSession({ access_token, refresh_token });
        } else {
          console.warn('[CodeExchanger] Failed to redeem code:', response.status);
        }
      } catch (error) {
        console.error('[CodeExchanger] Error redeeming code:', error);
      } finally {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('code');
        const cleanUrl = params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;
        router.replace(cleanUrl);
        redeemingRef.current = false;
      }
    };

    redeemCode();
  }, [searchParams, pathname, router]);

  return null;
}
