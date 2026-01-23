/**
 * Google Tag Manager (GTM) Integration for Admin App
 * Provides tracking functions for page views, events, and user interactions
 */

export const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;
export const GA_TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

interface GtagEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  nonInteraction?: boolean;
}

// ============================================
// DEVICE DETECTION FOR ANALYTICS
// ============================================

interface DeviceInfo {
  deviceType: 'web' | 'desktop';
  deviceOs: string;
  appVersion: string;
  deviceId: string;
  isTauri: boolean;
}

function getDeviceInfo(): DeviceInfo {
  // Check if running in Tauri desktop app
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  const deviceType = isTauri ? 'desktop' : 'web';

  // Get or generate device ID
  let deviceId = localStorage.getItem('agritech_admin_device_id');
  if (!deviceId) {
    deviceId = `admin_${deviceType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('agritech_admin_device_id', deviceId);
  }

  // Detect OS
  let deviceOs = 'unknown';
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) deviceOs = 'windows';
    else if (userAgent.includes('Mac')) deviceOs = 'macos';
    else if (userAgent.includes('Linux')) deviceOs = 'linux';
    else if (userAgent.includes('Android')) deviceOs = 'android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceOs = 'ios';
    else deviceOs = 'web';
  }

  // Get app version from build info
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

  return {
    deviceType,
    deviceOs: isTauri ? `tauri-${deviceOs}` : deviceOs,
    appVersion,
    deviceId,
    isTauri,
  };
}

export { getDeviceInfo };

// ============================================
// GOOGLE ANALYTICS INITIALIZATION
// ============================================

/**
 * Initialize Google Analytics
 * Loads the gtag.js script and sets up the tracking configuration
 */
export const initGA = (): void => {
  if (typeof window === 'undefined' || !GA_TRACKING_ID) {
    return;
  }

  // Prevent duplicate initialization
  if (window.gtag) {
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  // Configure GA4
  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    send_page_view: false, // We'll track page views manually
  });
};

// ============================================
// GOOGLE TAG MANAGER INITIALIZATION
// ============================================

/**
 * Initialize Google Tag Manager
 * Loads the GTM script and sets up the dataLayer
 */
export const initGTM = (): void => {
  if (typeof window === 'undefined' || !GTM_CONTAINER_ID) {
    return;
  }

  // Prevent duplicate initialization
  if ((window as any).gtmInitialized) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];

  // Push device info to dataLayer
  const deviceInfo = getDeviceInfo();
  window.dataLayer.push({
    event: 'device_info',
    ...deviceInfo,
    client_app: 'admin',
  });

  // Load GTM script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);

  // Mark GTM as initialized
  (window as any).gtmInitialized = true;

  // Add noscript fallback for iframe
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.display = 'none';
  iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body?.prepend(noscript);
};

// ============================================
// ANALYTICS INITIALIZATION
// ============================================

/**
 * Initialize all analytics platforms
 * Call this once when the app starts
 */
export const initAnalytics = (): void => {
  initGA();
  initGTM();
};

// ============================================
// TRACKING FUNCTIONS
// ============================================

interface PageViewOptions {
  title?: string;
  location?: string;
  path?: string;
}

/**
 * Track a page view
 */
export const trackPageView = (options: PageViewOptions = {}): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_title: options.title ?? document.title,
    page_location: options.location ?? window.location.href,
    page_path: options.path ?? window.location.pathname,
    send_to: GA_TRACKING_ID,
  });

  // Also push to dataLayer for GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'page_view',
      page_title: options.title ?? document.title,
      page_location: options.location ?? window.location.href,
      page_path: options.path ?? window.location.pathname,
    });
  }
};

/**
 * Track a custom event
 */
export const trackEvent = (event: GtagEvent): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', event.action, {
    event_category: event.category,
    event_label: event.label,
    value: event.value,
    non_interaction: event.nonInteraction,
    send_to: GA_TRACKING_ID,
  });

  // Also push to dataLayer for GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: event.action,
      event_category: event.category,
      event_label: event.label,
      event_value: event.value,
      non_interaction: event.nonInteraction,
    });
  }
};

/**
 * Admin-specific tracking functions
 */

export const trackAdminLogin = (method: 'email' | 'google' | 'github', success: boolean): void => {
  trackEvent({
    action: 'admin_login',
    category: 'Authentication',
    label: `${method}_${success ? 'success' : 'failed'}`,
  });
};

export const trackAdminAction = (action: string, category: string, label?: string): void => {
  trackEvent({
    action,
    category,
    label,
  });
};

export const trackReferenceDataEdit = (table: string, action: 'view' | 'edit' | 'import' | 'publish'): void => {
  trackEvent({
    action: 'reference_data_action',
    category: 'Admin',
    label: `${table}_${action}`,
  });
};

export const trackAdminPageView = (page: string): void => {
  trackPageView({
    title: `Admin - ${page}`,
    path: `/admin/${page}`,
  });
};

export const trackOrganizationView = (orgId: string): void => {
  trackEvent({
    action: 'organization_view',
    category: 'Admin',
    label: orgId,
  });
};

export const trackJobStatusChange = (jobId: string, status: string): void => {
  trackEvent({
    action: 'job_status_change',
    category: 'Admin',
    label: `${jobId}_${status}`,
  });
};

/**
 * Set user ID for cross-device tracking
 */
export const setUserId = (userId: string): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('config', GA_TRACKING_ID, {
    user_id: userId,
  });

  // Also push to dataLayer for GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'user_id_set',
      user_id: userId,
    });
  }
};

/**
 * Set user properties for segmentation
 */
export const setUserProperties = (properties: Record<string, string | number | boolean>): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('set', 'user_properties', properties);

  // Also push to dataLayer for GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'user_properties_set',
      user_properties: properties,
    });
  }
};

/**
 * Track an error
 */
export const trackError = (error: string, fatal = false): void => {
  trackEvent({
    action: 'exception',
    category: 'Error',
    label: error,
    nonInteraction: true,
  });

  if (fatal && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: error,
      fatal: true,
    });
  }

  // Also push to dataLayer for GTM
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'error',
      error_description: error,
      error_fatal: fatal,
    });
  }
};

// Extend the Window interface to include gtag and dataLayer
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}
