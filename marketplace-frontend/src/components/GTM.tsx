'use client';

import { useEffect } from 'react';
import Script from 'next/script';

const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || '';
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export function GoogleTagManager() {
  useEffect(() => {
    // Initialize dataLayer on client side
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];

      // Push device info to dataLayer
      const deviceInfo = getDeviceInfo();
      window.dataLayer.push({
        event: 'device_info',
        ...deviceInfo,
        client_app: 'marketplace',
      });
    }
  }, []);

  if (!GTM_CONTAINER_ID) {
    return null;
  }

  return (
    <>
      {/* GTM Script */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
          `,
        }}
      />

      {/* GTM NoScript */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}

interface DeviceInfo {
  deviceType: 'web' | 'mobile' | 'desktop';
  deviceOs: string;
  appVersion: string;
  deviceId: string;
  isTauri: boolean;
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'web',
      deviceOs: 'unknown',
      appVersion: '1.0.0',
      deviceId: '',
      isTauri: false,
    };
  }

  // Check if running in Tauri desktop app
  const isTauri = '__TAURI__' in window;

  let deviceType: 'web' | 'mobile' | 'desktop' = 'web';
  if (isTauri) {
    deviceType = 'desktop';
  } else {
    // Mobile detection
    const userAgent = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = 'mobile';
    }
  }

  // Get or generate device ID
  let deviceId = localStorage.getItem('agritech_marketplace_device_id');
  if (!deviceId) {
    deviceId = `marketplace_${deviceType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('agritech_marketplace_device_id', deviceId);
  }

  // Detect OS
  let deviceOs = 'unknown';
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) deviceOs = 'windows';
  else if (userAgent.includes('Mac')) deviceOs = 'macos';
  else if (userAgent.includes('Linux')) deviceOs = 'linux';
  else if (userAgent.includes('Android')) deviceOs = 'android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceOs = 'ios';
  else deviceOs = 'web';

  // Get app version from build info
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

  return {
    deviceType,
    deviceOs: isTauri ? `tauri-${deviceOs}` : deviceOs,
    appVersion,
    deviceId,
    isTauri,
  };
}

// Extend the Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export default GoogleTagManager;
