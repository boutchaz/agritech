/**
 * Google Analytics 4 (GA4) Integration
 * Microsoft Clarity Integration
 * Google Tag Manager (GTM) Integration
 * Provides tracking functions for page views, events, and user interactions
 */

import Clarity from '@microsoft/clarity';

export const GA_TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
export const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;

// Microsoft Clarity Project ID
// You can find this in your Clarity dashboard: https://Clarity.microsoft.com/projects/
export const CLARITY_PROJECT_ID = 'v5m1rr7hof';

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
  let deviceId = localStorage.getItem('agritech_device_id');
  if (!deviceId) {
    deviceId = `${deviceType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('agritech_device_id', deviceId);
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
// UTM PARAMETER TRACKING
// ============================================

interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;
}

const UTM_SESSION_KEY = 'agritech_utm_params';
const UTM_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Parse UTM parameters from URL query string
 */
export const parseUTMParameters = (): UTMParameters => {
  if (typeof window === 'undefined') {
    return {};
  }

  const urlParams = new URLSearchParams(window.location.search);
  const utmParams: UTMParameters = {
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_term: urlParams.get('utm_term') || undefined,
    utm_content: urlParams.get('utm_content') || undefined,
    utm_id: urlParams.get('utm_id') || undefined,
  };

  // Filter out undefined values
  const cleanParams: UTMParameters = {};
  let hasUTM = false;
  (Object.keys(utmParams) as Array<keyof UTMParameters>).forEach((key) => {
    if (utmParams[key]) {
      cleanParams[key] = utmParams[key];
      hasUTM = true;
    }
  });

  // Store UTM parameters if found
  if (hasUTM) {
    storeUTMParameters(cleanParams);
  }

  return cleanParams;
};

/**
 * Store UTM parameters with timestamp for session persistence
 */
const storeUTMParameters = (params: UTMParameters): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const data = {
      params,
      timestamp: Date.now(),
    };
    localStorage.setItem(UTM_SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to store UTM parameters:', error);
  }
};

/**
 * Get stored UTM parameters if not expired
 */
export const getStoredUTMParameters = (): UTMParameters => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(UTM_SESSION_KEY);
    if (!stored) {
      return {};
    }

    const data = JSON.parse(stored) as { params: UTMParameters; timestamp: number };
    const age = Date.now() - data.timestamp;

    // Return params if not expired
    if (age < UTM_EXPIRY_MS) {
      return data.params;
    }

    // Clear expired params
    localStorage.removeItem(UTM_SESSION_KEY);
    return {};
  } catch {
    return {};
  }
};

/**
 * Get active UTM parameters (from URL or storage)
 */
export const getActiveUTMParameters = (): UTMParameters => {
  const urlParams = parseUTMParameters();
  const storedParams = getStoredUTMParameters();

  // URL params take precedence
  return { ...storedParams, ...urlParams };
};

/**
 * Clear stored UTM parameters (useful after conversion)
 */
export const clearUTMParameters = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(UTM_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear UTM parameters:', error);
  }
};

/**
 * Get traffic source with UTM fallback
 * Returns: 'organic', 'direct', 'referral', or UTM source
 */
export const getTrafficSource = (): string => {
  const utmParams = getActiveUTMParameters();

  if (utmParams.utm_source) {
    // Return UTM source if available
    return utmParams.utm_source;
  }

  if (typeof document === 'undefined') {
    return 'direct';
  }

  const referrer = document.referrer;

  if (!referrer) {
    return 'direct';
  }

  // Check for common search engines
  const searchEngines = [
    'google.com',
    'bing.com',
    'yahoo.com',
    'duckduckgo.com',
    'baidu.com',
    'yandex.com',
  ];

  try {
    const referrerDomain = new URL(referrer).hostname.toLowerCase();
    if (searchEngines.some((engine) => referrerDomain.includes(engine))) {
      return 'organic';
    }
    return 'referral';
  } catch {
    return 'direct';
  }
};

/**
 * Initialize UTM tracking (call on app load)
 */
export const initUTMTracking = (): UTMParameters => {
  const utmParams = parseUTMParameters();

  // Track initial UTM acquisition
  if (Object.keys(utmParams).length > 0) {
    const trafficSource = getTrafficSource();
    trackEvent({
      action: 'utm_acquisition',
      category: 'Acquisition',
      label: trafficSource,
      nonInteraction: true,
    });
  }

  return utmParams;
};

// ============================================
// ENHANCED EVENT TRACKING WITH UTM
// ============================================

/**
 * Enhanced page view with UTM parameters
 */
export const trackPageViewWithUTM = (options: PageViewOptions = {}): void => {
  const utmParams = getActiveUTMParameters();

  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_title: options.title ?? document.title,
    page_location: options.location ?? window.location.href,
    page_path: options.path ?? window.location.pathname,
    send_to: GA_TRACKING_ID,
    ...utmParams,
  });
};

/**
 * Enhanced event with UTM parameters
 */
export const trackEventWithUTM = (event: GtagEvent): void => {
  const utmParams = getActiveUTMParameters();

  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', event.action, {
    event_category: event.category,
    event_label: event.label,
    value: event.value,
    non_interaction: event.nonInteraction,
    send_to: GA_TRACKING_ID,
    ...utmParams,
  });
};

interface PageViewOptions {
  title?: string;
  location?: string;
  path?: string;
}

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

/**
 * Routes excluded from Clarity initialization
 * These routes are sensitive to history manipulation during auth flows
 */
const CLARITY_EXCLUDED_ROUTES = [
  '/login',
  '/register',
  '/set-password',
  '/auth/callback',
  '/forgot-password',
];

/**
 * Check if current route is excluded from Clarity tracking
 */
const isExcludedRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  return CLARITY_EXCLUDED_ROUTES.some(route => window.location.pathname.startsWith(route));
};

/**
 * Check if router is stable (not during navigation)
 */
let isRouterStable = true;
let hasInitializedClarity = false;

export const markRouterNavigating = () => { isRouterStable = false; };
export const markRouterStable = () => { isRouterStable = true; };

/**
 * Initialize Microsoft Clarity with safety measures
 * - Only initializes when router is stable
 * - Skips excluded routes (login, register, auth callback)
 * - Uses try-catch for error safety
 * - Tracks initialization state to prevent duplicate calls
 */
export const initClarity = (): void => {
  if (typeof window === 'undefined' || !CLARITY_PROJECT_ID) {
    return;
  }

  // Prevent duplicate initialization
  if (hasInitializedClarity) {
    return;
  }

  // Skip excluded routes
  if (isExcludedRoute()) {
    return;
  }

  // Wait for router to be stable
  if (!isRouterStable) {
    // Schedule retry after router stabilizes
    const checkInterval = setInterval(() => {
      if (isRouterStable && !hasInitializedClarity && !isExcludedRoute()) {
        clearInterval(checkInterval);
        initClarity();
      }
    }, 100);
    return;
  }

  try {
    Clarity.init(CLARITY_PROJECT_ID);
    hasInitializedClarity = true;
  } catch (error) {
    console.warn('Failed to initialize Microsoft Clarity:', error);
  }
};

/**
 * Initialize all analytics platforms
 * Call this once when the app starts
 */
export const initAnalytics = (): void => {
  initGA();
  initGTM();
  initClarity();
};

/**
 * Clarity-specific tracking functions
 */

/**
 * Set user ID for Clarity cross-session tracking
 * @param userId - Unique user identifier (email, UUID, etc.)
 */
export const setClarityUserId = (userId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    Clarity.setTag('userId', userId);
  } catch {
    // Clarity not initialized yet
  }
};

/**
 * Track a custom Clarity event
 * @param eventName - Name of the event to track
 * @param _value - Optional numeric value (Clarity doesn't support values, but kept for API compatibility)
 */
export const trackClarityEvent = (eventName: string, _value?: number): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    Clarity.event(eventName);
  } catch {
    // Clarity not initialized yet
  }
};

/**
 * Set custom user properties/tags for Clarity segmentation
 * @param properties - Object containing key-value pairs
 */
export const setClarityUserProperties = (properties: Record<string, string | number | boolean>): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    Object.entries(properties).forEach(([key, value]) => {
      Clarity.setTag(key, String(value));
    });
  } catch {
    // Clarity not initialized yet
  }
};

/**
 * Identify user with custom attributes
 * @param userId - Unique user identifier
 * @param _attributes - Optional custom attributes (not directly supported by Clarity identify)
 */
export const identifyClarityUser = (
  userId: string,
  _attributes?: Record<string, string | number | boolean>
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    Clarity.identify(userId);
  } catch {
    // Clarity not initialized yet
  }
};

/**
 * Track Clarity goal conversion
 * Use this to track important conversions (signups, purchases, etc.)
 * @param goalName - Name of the goal/conversion
 * @param _value - Optional monetary value (Clarity doesn't support values, but kept for API compatibility)
 */
export const trackClarityGoal = (goalName: string, _value?: number): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    Clarity.event(goalName);
  } catch {
    // Clarity not initialized yet
  }
};

/**
 * Track a page view
 * @param options - Optional page view parameters
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
};

/**
 * Track a custom event
 * @param event - Event parameters
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
};

/**
 * Dashboard-specific tracking functions
 */

export const trackDashboardView = (dashboardType: 'regular' | 'live'): void => {
  trackEvent({
    action: 'dashboard_view',
    category: 'Dashboard',
    label: dashboardType,
  });
};

export const trackLiveModeToggle = (enabled: boolean): void => {
  trackEvent({
    action: 'live_mode_toggle',
    category: 'Dashboard',
    label: enabled ? 'enabled' : 'disabled',
  });
};

export const trackWidgetView = (widgetName: string): void => {
  trackEvent({
    action: 'widget_view',
    category: 'Dashboard',
    label: widgetName,
    nonInteraction: true,
  });
};

export const trackWidgetClick = (widgetName: string, action: string): void => {
  trackEvent({
    action: 'widget_click',
    category: 'Dashboard',
    label: `${widgetName}_${action}`,
  });
};

export const trackRefreshMetrics = (): void => {
  trackEvent({
    action: 'refresh_metrics',
    category: 'Dashboard',
    label: 'manual_refresh',
  });
};

export const trackWidgetToggle = (widgetType: string, enabled: boolean): void => {
  trackEvent({
    action: 'widget_toggle',
    category: 'Dashboard',
    label: `${widgetType}_${enabled ? 'enabled' : 'disabled'}`,
  });
};

export const trackFarmSelection = (farmId: string | null): void => {
  trackEvent({
    action: 'farm_selection',
    category: 'Dashboard',
    label: farmId ?? 'no_farm',
  });
};

export const trackQuickActions = (action: string): void => {
  trackEvent({
    action: 'quick_actions',
    category: 'Dashboard',
    label: action,
  });
};

/**
 * Set user ID for cross-device tracking
 * @param userId - Unique user identifier
 */
export const setUserId = (userId: string): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('config', GA_TRACKING_ID, {
    user_id: userId,
  });
};

/**
 * Set user properties for segmentation
 * @param properties - User properties object
 */
export const setUserProperties = (properties: Record<string, string | number | boolean>): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('set', 'user_properties', properties);
};

/**
 * Track an error
 * @param error - Error description
 * @param fatal - Whether the error was fatal
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
};

/**
 * Authentication tracking functions
 */

export const trackLoginAttempt = (method: 'email' | 'google' | 'github'): void => {
  trackEvent({
    action: 'login_attempt',
    category: 'Authentication',
    label: method,
  });
  trackClarityEvent(`login_attempt_${method}`);
};

export const trackLoginSuccess = (method: 'email' | 'google' | 'github'): void => {
  trackEvent({
    action: 'login_success',
    category: 'Authentication',
    label: method,
  });
  trackClarityEvent(`login_success_${method}`);
};

export const trackLoginFailure = (method: 'email' | 'google' | 'github', error: string): void => {
  trackEvent({
    action: 'login_failure',
    category: 'Authentication',
    label: `${method}_${error}`,
  });
  trackClarityEvent(`login_failure_${method}`);
};

export const trackRegisterAttempt = (): void => {
  trackEvent({
    action: 'register_attempt',
    category: 'Authentication',
    label: 'signup_start',
  });
  trackClarityEvent('register_attempt');
};

export const trackRegisterSuccess = (withDemoData: boolean): void => {
  trackEvent({
    action: 'register_success',
    category: 'Authentication',
    label: withDemoData ? 'with_demo_data' : 'without_demo_data',
  });
  trackClarityGoal('registration_complete');
};

export const trackRegisterFailure = (error: string): void => {
  trackEvent({
    action: 'register_failure',
    category: 'Authentication',
    label: error,
  });
  trackClarityEvent('register_failure');
};

export const trackLogout = (): void => {
  trackEvent({
    action: 'logout',
    category: 'Authentication',
    label: 'user_logout',
  });
  trackClarityEvent('logout');
};

export const trackPasswordResetRequest = (): void => {
  trackEvent({
    action: 'password_reset_request',
    category: 'Authentication',
    label: 'forgot_password',
  });
};

export const trackPasswordResetSuccess = (): void => {
  trackEvent({
    action: 'password_reset_success',
    category: 'Authentication',
    label: 'password_changed',
  });
  trackClarityGoal('password_reset_complete');
};

/**
 * Onboarding & Trial tracking functions
 */

export const trackOnboardingStart = (): void => {
  trackEvent({
    action: 'onboarding_start',
    category: 'Onboarding',
    label: 'trial_selection',
  });
  trackClarityEvent('onboarding_start');
};

export const trackTrialPlanView = (planName: string): void => {
  trackEvent({
    action: 'trial_plan_view',
    category: 'Onboarding',
    label: planName,
    nonInteraction: true,
  });
};

export const trackTrialPlanSelect = (planName: string, price: number): void => {
  trackEvent({
    action: 'trial_plan_select',
    category: 'Onboarding',
    label: planName,
    value: price,
  });
  trackClarityEvent(`plan_select_${planName}`, price);
};

export const trackTrialStartAttempt = (planName: string): void => {
  trackEvent({
    action: 'trial_start_attempt',
    category: 'Onboarding',
    label: planName,
  });
  trackClarityEvent(`trial_start_attempt_${planName}`);
};

export const trackTrialStartSuccess = (planName: string): void => {
  trackEvent({
    action: 'trial_start_success',
    category: 'Onboarding',
    label: planName,
  });
  trackClarityGoal('trial_start_complete');
};

export const trackTrialStartFailure = (planName: string, error: string): void => {
  trackEvent({
    action: 'trial_start_failure',
    category: 'Onboarding',
    label: `${planName}_${error}`,
  });
  trackClarityEvent('trial_start_failure');
};

export const trackCheckoutSuccess = (planName: string, amount: number): void => {
  trackEvent({
    action: 'purchase',
    category: 'Ecommerce',
    label: planName,
    value: amount,
  });
  trackClarityGoal(`checkout_${planName}`, amount);
};

/**
 * Navigation tracking functions
 */

export const trackNavigationClick = (destination: string, type: 'sidebar' | 'breadcrumb' | 'button' | 'link'): void => {
  trackEvent({
    action: 'navigation_click',
    category: 'Navigation',
    label: `${type}_${destination}`,
  });
};

/**
 * Form tracking functions
 */

export const trackFormSubmitStart = (formName: string): void => {
  trackEvent({
    action: 'form_submit_start',
    category: 'Form',
    label: formName,
  });
};

export const trackFormSubmitSuccess = (formName: string): void => {
  trackEvent({
    action: 'form_submit_success',
    category: 'Form',
    label: formName,
  });
  trackClarityEvent(`form_success_${formName}`);
};

export const trackFormSubmitError = (formName: string, error: string): void => {
  trackEvent({
    action: 'form_submit_error',
    category: 'Form',
    label: `${formName}_${error}`,
  });
};

/**
 * Feature tracking functions
 */

export const trackFeatureUsed = (featureName: string, action?: string): void => {
  trackEvent({
    action: 'feature_used',
    category: 'Feature',
    label: action ? `${featureName}_${action}` : featureName,
  });
  trackClarityEvent(action ? `feature_${featureName}_${action}` : `feature_${featureName}`);
};

export const trackExportData = (dataType: string, format: string): void => {
  trackEvent({
    action: 'export_data',
    category: 'Data',
    label: `${dataType}_${format}`,
  });
  trackClarityEvent(`export_${dataType}_${format}`);
};

export const trackImportData = (dataType: string): void => {
  trackEvent({
    action: 'import_data',
    category: 'Data',
    label: dataType,
  });
  trackClarityEvent(`import_${dataType}`);
};

/**
 * Search tracking functions
 */

export const trackSearch = (searchTerm: string, resultsCount: number): void => {
  trackEvent({
    action: 'search',
    category: 'Search',
    label: searchTerm,
    value: resultsCount,
  });
};

/**
 * Settings tracking functions
 */

export const trackSettingChange = (settingName: string, value: string): void => {
  trackEvent({
    action: 'setting_change',
    category: 'Settings',
    label: `${settingName}_${value}`,
  });
  trackClarityEvent(`setting_${settingName}_${value}`);
};

/**
 * Entity CRUD operations tracking
 */

export const trackEntityCreate = (entityType: string, _entityId?: string): void => {
  trackEvent({
    action: 'entity_create',
    category: 'CRUD',
    label: entityType,
  });
  trackClarityEvent(`create_${entityType}`);
};

export const trackEntityUpdate = (entityType: string, _entityId?: string): void => {
  trackEvent({
    action: 'entity_update',
    category: 'CRUD',
    label: entityType,
  });
  trackClarityEvent(`update_${entityType}`);
};

export const trackEntityDelete = (entityType: string, _entityId?: string): void => {
  trackEvent({
    action: 'entity_delete',
    category: 'CRUD',
    label: entityType,
  });
  trackClarityEvent(`delete_${entityType}`);
};

/**
 * ============================================
 * PRODUCTION EVENTS - E-COMMERCE (GA4 Standard)
 * ============================================
 */

/**
 * Track viewing an item (product, farm, parcel, etc.)
 * GA4 Standard Event: view_item
 */
export const trackViewItem = (itemId: string, itemName: string, category?: string, price?: number): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'view_item', {
    item_id: itemId,
    item_name: itemName,
    item_category: category,
    price: price,
    send_to: GA_TRACKING_ID,
  });
};

/**
 * Track adding to cart (adding worker, inventory item, etc.)
 * GA4 Standard Event: add_to_cart
 */
export const trackAddToCart = (itemId: string, itemName: string, quantity: number, price?: number): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'add_to_cart', {
    item_id: itemId,
    item_name: itemName,
    quantity: quantity,
    price: price,
    send_to: GA_TRACKING_ID,
  });
};

/**
 * Track beginning checkout (starting trial, subscription, etc.)
 * GA4 Standard Event: begin_checkout
 */
export const trackBeginCheckout = (value: number, currency: string = 'USD', items?: Array<{item_id: string, item_name: string, price?: number}>): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'begin_checkout', {
    currency: currency,
    value: value,
    items: items || [],
    send_to: GA_TRACKING_ID,
  });
  trackClarityEvent('begin_checkout', value);
};

/**
 * Track purchase completion (subscription, trial purchase)
 * GA4 Standard Event: purchase
 */
export const trackPurchase = (transactionId: string, value: number, currency: string = 'USD', items?: Array<{item_id: string, item_name: string, price?: number}>): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    currency: currency,
    value: value,
    items: items || [],
    send_to: GA_TRACKING_ID,
  });
  trackClarityGoal('purchase_complete', value);
};

/**
 * Track refund
 * GA4 Standard Event: refund
 */
export const trackRefund = (transactionId: string, value: number, currency: string = 'USD'): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  window.gtag('event', 'refund', {
    transaction_id: transactionId,
    currency: currency,
    value: value,
    send_to: GA_TRACKING_ID,
  });
};

/**
 * ============================================
 * PRODUCTION EVENTS - USER ENGAGEMENT
 * ============================================
 */

/**
 * Track session start
 */
export const trackSessionStart = (): void => {
  trackEvent({
    action: 'session_start',
    category: 'Engagement',
    label: 'app_open',
  });
};

/**
 * Track first visit
 */
export const trackFirstVisit = (): void => {
  trackEvent({
    action: 'first_visit',
    category: 'Engagement',
    label: 'new_user',
  });
  trackClarityGoal('first_visit');
};

/**
 * Track engagement time (user spent X seconds on page)
 */
export const trackEngagementTime = (seconds: number): void => {
  trackEvent({
    action: 'engagement_time',
    category: 'Engagement',
    value: seconds,
    nonInteraction: true,
  });
};

/**
 * Track scroll depth
 */
export const trackScrollDepth = (depth: '25' | '50' | '75' | '100'): void => {
  trackEvent({
    action: 'scroll_depth',
    category: 'Engagement',
    label: `${depth}%`,
    nonInteraction: true,
  });
};

/**
 * ============================================
 * PRODUCTION EVENTS - REGISTRATION FUNNEL
 * ============================================
 */

export const trackSignupStart = (): void => {
  trackEvent({
    action: 'signup_start',
    category: 'Registration',
    label: 'form_open',
  });
  trackClarityEvent('signup_start');
};

export const trackEmailSubmit = (): void => {
  trackEvent({
    action: 'email_submit',
    category: 'Registration',
    label: 'email_entered',
  });
  trackClarityEvent('email_submit');
};

export const trackPasswordCreate = (): void => {
  trackEvent({
    action: 'password_create',
    category: 'Registration',
    label: 'password_created',
  });
  trackClarityEvent('password_create');
};

export const trackOrgSetup = (orgName: string): void => {
  trackEvent({
    action: 'org_setup',
    category: 'Registration',
    label: orgName,
  });
  trackClarityEvent('org_setup');
};

export const trackFarmSetup = (farmName: string): void => {
  trackEvent({
    action: 'farm_setup',
    category: 'Registration',
    label: farmName,
  });
  trackClarityEvent('farm_setup');
};

export const trackFirstTask = (): void => {
  trackEvent({
    action: 'first_task',
    category: 'Registration',
    label: 'first_task_created',
  });
  trackClarityGoal('first_task_complete');
};

/**
 * ============================================
 * PRODUCTION EVENTS - TRIAL FUNNEL
 * ============================================
 */

export const trackTrialView = (): void => {
  trackEvent({
    action: 'trial_view',
    category: 'Trial',
    label: 'plans_viewed',
  });
};

export const trackTrialDay = (dayNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14): void => {
  trackEvent({
    action: 'trial_day',
    category: 'Trial',
    label: `day_${dayNumber}`,
    nonInteraction: true,
  });
};

export const trackTrialConversion = (): void => {
  trackEvent({
    action: 'trial_conversion',
    category: 'Trial',
    label: 'converted_to_paid',
  });
  trackClarityGoal('trial_conversion');
};

export const trackTrialExpired = (): void => {
  trackEvent({
    action: 'trial_expired',
    category: 'Trial',
    label: 'trial_ended',
  });
};

/**
 * ============================================
 * PRODUCTION EVENTS - RETENTION
 * ============================================
 */

export const trackAppOpen = (): void => {
  trackEvent({
    action: 'app_open',
    category: 'Retention',
    label: 'session_start',
  });
};

export const trackSessionDuration = (seconds: number): void => {
  trackEvent({
    action: 'session_duration',
    category: 'Retention',
    value: seconds,
    nonInteraction: true,
  });
};

export const trackDailyActive = (): void => {
  trackEvent({
    action: 'daily_active',
    category: 'Retention',
    label: 'DAU',
    nonInteraction: true,
  });
};

export const trackWeeklyActive = (): void => {
  trackEvent({
    action: 'weekly_active',
    category: 'Retention',
    label: 'WAU',
    nonInteraction: true,
  });
};

/**
 * ============================================
 * AGRITECH-SPECIFIC EVENTS
 * ============================================
 */

/**
 * Track farm/field data upload
 */
export const trackFarmDataUpload = (dataType: 'csv' | 'shapefile' | 'geojson' | 'kml', recordCount: number): void => {
  trackEvent({
    action: 'farm_data_uploaded',
    category: 'AgriTech',
    label: dataType,
    value: recordCount,
  });
  trackClarityEvent(`farm_data_upload_${dataType}`);
};

/**
 * Track analysis report generation
 */
export const trackAnalysisReportGenerated = (reportType: 'crop_health' | 'yield_estimate' | 'soil_analysis' | 'weather_impact'): void => {
  trackEvent({
    action: 'analysis_report_generated',
    category: 'AgriTech',
    label: reportType,
  });
  trackClarityEvent(`report_${reportType}`);
};

/**
 * Track crop data update
 */
export const trackCropDataUpdated = (action: 'planted' | 'harvested' | 'updated' | 'deleted', cropType?: string): void => {
  trackEvent({
    action: 'crop_data_updated',
    category: 'AgriTech',
    label: cropType ? `${action}_${cropType}` : action,
  });
  trackClarityEvent(`crop_${action}`);
};

/**
 * Track livestock data update
 */
export const trackLivestockDataUpdated = (action: 'added' | 'updated' | 'sold' | 'veterinary', animalType?: string): void => {
  trackEvent({
    action: 'livestock_data_updated',
    category: 'AgriTech',
    label: animalType ? `${action}_${animalType}` : action,
  });
  trackClarityEvent(`livestock_${action}`);
};

/**
 * Track AI recommendation interaction
 */
export const trackRecommendationViewed = (recommendationType: 'fertilizer' | 'planting' | 'harvest' | 'pest_control'): void => {
  trackEvent({
    action: 'recommendation_viewed',
    category: 'AgriTech',
    label: recommendationType,
  });
  trackClarityEvent(`rec_view_${recommendationType}`);
};

export const trackRecommendationAccepted = (recommendationType: string, estimatedValue?: number): void => {
  trackEvent({
    action: 'recommendation_accepted',
    category: 'AgriTech',
    label: recommendationType,
    value: estimatedValue,
  });
  trackClarityGoal(`rec_accepted_${recommendationType}`, estimatedValue);
};

export const trackRecommendationRejected = (recommendationType: string, reason?: string): void => {
  trackEvent({
    action: 'recommendation_rejected',
    category: 'AgriTech',
    label: reason ? `${recommendationType}_${reason}` : recommendationType,
  });
  trackClarityEvent(`rec_rejected_${recommendationType}`);
};

/**
 * Track seasonal planning
 */
export const trackSeasonalPlanCreated = (season: 'spring' | 'summer' | 'fall' | 'winter', cropCount: number): void => {
  trackEvent({
    action: 'seasonal_plan_created',
    category: 'AgriTech',
    label: season,
    value: cropCount,
  });
  trackClarityEvent(`seasonal_plan_${season}`);
};

/**
 * Track weather data access
 */
export const trackWeatherDataViewed = (location: string, forecastDays: number): void => {
  trackEvent({
    action: 'weather_data_viewed',
    category: 'AgriTech',
    label: location,
    value: forecastDays,
  });
};

/**
 * Track soil analysis request
 */
export const trackSoilAnalysisRequested = (analysisType: 'nutrient' | 'ph' | 'organic_matter' | 'complete'): void => {
  trackEvent({
    action: 'soil_analysis_requested',
    category: 'AgriTech',
    label: analysisType,
  });
  trackClarityEvent(`soil_analysis_${analysisType}`);
};

/**
 * Track irrigation activity
 */
export const trackIrrigationActivity = (action: 'scheduled' | 'manual' | 'automated', zoneCount: number): void => {
  trackEvent({
    action: 'irrigation_activity',
    category: 'AgriTech',
    label: action,
    value: zoneCount,
  });
  trackClarityEvent(`irrigation_${action}`);
};

/**
 * Track pest/disease detection
 */
export const trackPestDetection = (diseaseType: string, severity: 'low' | 'medium' | 'high'): void => {
  trackEvent({
    action: 'pest_detection',
    category: 'AgriTech',
    label: `${diseaseType}_${severity}`,
  });
  trackClarityEvent(`pest_${diseaseType}`);
};

/**
 * Track resource usage monitoring
 */
export const trackResourceUsage = (resourceType: 'water' | 'fertilizer' | 'pesticide' | 'seed', quantity: number, _unit: string): void => {
  trackEvent({
    action: 'resource_usage',
    category: 'AgriTech',
    label: resourceType,
    value: quantity,
  });
};

/**
 * ============================================
 * USER PROPERTIES FOR SEGMENTATION
 * ============================================
 */

export interface AnalyticsUserProperties {
  userId: string;
  email?: string; // Optional, hashed before sending if provided
  signUpDate: string;
  organizationId: string;
  organizationSize: 'solo' | 'small' | 'medium' | 'large';
  subscriptionTier: 'free' | 'trial' | 'starter' | 'professional' | 'enterprise';
  trialStatus: 'none' | 'active' | 'expired' | 'converted';
  role: 'system_admin' | 'organization_admin' | 'farm_manager' | 'farm_worker' | 'day_laborer' | 'viewer';
  farmCount: number;
  totalHectares: number;
  platform: 'web';
}

/**
 * Set comprehensive user properties for segmentation
 */
export const setAnalyticsUserProperties = (properties: AnalyticsUserProperties): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) {
    return;
  }

  // Prepare user properties (hash email if provided)
  const userProperties: Record<string, string | number> = {
    userId: properties.userId,
    signUpDate: properties.signUpDate,
    organizationId: properties.organizationId,
    organizationSize: properties.organizationSize,
    subscriptionTier: properties.subscriptionTier,
    trialStatus: properties.trialStatus,
    role: properties.role,
    farmCount: properties.farmCount,
    totalHectares: properties.totalHectares,
    platform: properties.platform,
  };

  // Simple hash for email (privacy)
  if (properties.email) {
    let hash = 0;
    for (let i = 0; i < properties.email.length; i++) {
      const char = properties.email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    userProperties.email_hash = Math.abs(hash).toString();
  }

  window.gtag('set', 'user_properties', userProperties);

  // Also set user ID for cross-session tracking
  window.gtag('config', GA_TRACKING_ID, {
    user_id: properties.userId,
  });

  // Set Clarity user properties
  setClarityUserProperties(userProperties);
};

/**
 * ============================================
 * ONBOARDING FUNNEL TRACKING
 * ============================================
 */

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;
export type OnboardingStepName = 'profile' | 'organization' | 'farm' | 'modules' | 'preferences';

/**
 * Track onboarding step view
 */
export const trackOnboardingStepView = (step: OnboardingStep, stepName: OnboardingStepName): void => {
  trackEvent({
    action: 'onboarding_step_view',
    category: 'Onboarding',
    label: stepName,
    value: step,
    nonInteraction: true,
  });
  trackClarityEvent(`onboarding_view_${stepName}`);

  // Push to GTM dataLayer for more detailed tracking
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'onboarding_step_view',
      onboarding: {
        step_number: step,
        step_name: stepName,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Track onboarding step completion
 */
export const trackOnboardingStepComplete = (step: OnboardingStep, stepName: OnboardingStepName, timeSpentSeconds: number): void => {
  trackEvent({
    action: 'onboarding_step_complete',
    category: 'Onboarding',
    label: stepName,
    value: Math.round(timeSpentSeconds),
  });
  trackClarityEvent(`onboarding_complete_${stepName}`);

  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'onboarding_step_complete',
      onboarding: {
        step_number: step,
        step_name: stepName,
        time_spent_seconds: Math.round(timeSpentSeconds),
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Track onboarding form field interaction
 */
export const trackOnboardingFieldInteraction = (stepName: OnboardingStepName, fieldName: string, action: 'focus' | 'blur' | 'change'): void => {
  trackEvent({
    action: 'onboarding_field_interaction',
    category: 'Onboarding',
    label: `${stepName}_${fieldName}_${action}`,
    nonInteraction: true,
  });
};

/**
 * Track onboarding validation error
 */
export const trackOnboardingValidationError = (stepName: OnboardingStepName, fieldName: string, errorMessage: string): void => {
  trackEvent({
    action: 'onboarding_validation_error',
    category: 'Onboarding',
    label: `${stepName}_${fieldName}`,
  });
  trackClarityEvent(`onboarding_error_${stepName}_${fieldName}`);

  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'onboarding_error',
      onboarding: {
        step_name: stepName,
        field_name: fieldName,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Track onboarding API error
 */
export const trackOnboardingAPIError = (stepName: OnboardingStepName, action: string, errorMessage: string): void => {
  trackEvent({
    action: 'onboarding_api_error',
    category: 'Onboarding',
    label: `${stepName}_${action}`,
  });
  trackError(`onboarding_${stepName}_${action}: ${errorMessage}`);

  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'onboarding_api_error',
      onboarding: {
        step_name: stepName,
        action: action,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Track onboarding skip (user choosing to skip optional steps)
 */
export const trackOnboardingSkip = (stepName: OnboardingStepName, reason?: string): void => {
  trackEvent({
    action: 'onboarding_skip',
    category: 'Onboarding',
    label: reason ? `${stepName}_${reason}` : stepName,
  });
  trackClarityEvent(`onboarding_skip_${stepName}`);
};

/**
 * Track onboarding back navigation
 */
export const trackOnboardingBack = (fromStep: OnboardingStep, toStep: OnboardingStep): void => {
  trackEvent({
    action: 'onboarding_back',
    category: 'Onboarding',
    label: `step_${fromStep}_to_${toStep}`,
  });
};

/**
 * Track onboarding drop-off (user leaving incomplete)
 */
export const trackOnboardingDropOff = (currentStep: OnboardingStep, stepName: OnboardingStepName, timeSpentSeconds: number): void => {
  trackEvent({
    action: 'onboarding_drop_off',
    category: 'Onboarding',
    label: stepName,
    value: Math.round(timeSpentSeconds),
  });
  trackClarityEvent(`onboarding_dropoff_${stepName}`);

  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'onboarding_drop_off',
      onboarding: {
        step_number: currentStep,
        step_name: stepName,
        time_spent_seconds: Math.round(timeSpentSeconds),
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Track onboarding completion success
 */
export const trackOnboardingComplete = (totalTimeSeconds: number, hasDemoData: boolean): void => {
  trackEvent({
    action: 'onboarding_complete',
    category: 'Onboarding',
    label: hasDemoData ? 'with_demo_data' : 'without_demo_data',
    value: Math.round(totalTimeSeconds),
  });
  trackClarityGoal('onboarding_complete', Math.round(totalTimeSeconds));

  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'onboarding_complete',
      ecommerce: {
        transaction_id: `onboarding_${Date.now()}`,
        value: 0,
        currency: 'USD',
      },
      onboarding: {
        total_time_seconds: Math.round(totalTimeSeconds),
        has_demo_data: hasDemoData,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Track onboarding resume (user returning to complete)
 */
export const trackOnboardingResume = (currentStep: OnboardingStep): void => {
  trackEvent({
    action: 'onboarding_resume',
    category: 'Onboarding',
    label: `step_${currentStep}`,
  });
  trackClarityEvent(`onboarding_resume_step_${currentStep}`);
};

/**
 * Track module selection in onboarding
 */
export const trackOnboardingModuleToggle = (moduleId: string, enabled: boolean): void => {
  trackEvent({
    action: 'onboarding_module_toggle',
    category: 'Onboarding',
    label: `${moduleId}_${enabled ? 'enabled' : 'disabled'}`,
  });
  trackClarityEvent(`module_${enabled ? 'enable' : 'disable'}_${moduleId}`);
};

/**
 * Track onboarding progress milestone (25%, 50%, 75%)
 */
export const trackOnboardingMilestone = (percentage: 25 | 50 | 75): void => {
  trackEvent({
    action: 'onboarding_milestone',
    category: 'Onboarding',
    label: `${percentage}_percent`,
    value: percentage,
  });
  trackClarityEvent(`onboarding_${percentage}_percent`);
};

/**
 * Track slug availability check
 */
export const trackOnboardingSlugCheck = (slug: string, available: boolean): void => {
  trackEvent({
    action: 'onboarding_slug_check',
    category: 'Onboarding',
    label: available ? 'available' : 'unavailable',
    nonInteraction: true,
  });
};

/**
 * Track onboarding form autosave
 */
export const trackOnboardingAutosave = (stepName: OnboardingStepName, success: boolean): void => {
  if (success) {
    trackEvent({
      action: 'onboarding_autosave',
      category: 'Onboarding',
      label: stepName,
      nonInteraction: true,
    });
  } else {
    trackEvent({
      action: 'onboarding_autosave_failed',
      category: 'Onboarding',
      label: stepName,
    });
  }
};
