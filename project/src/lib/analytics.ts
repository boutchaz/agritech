/**
 * Google Analytics 4 (GA4) Integration
 * Microsoft Clarity Integration
 * Provides tracking functions for page views, events, and user interactions
 */

import Clarity from '@microsoft/clarity';

export const GA_TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

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
 * Initialize Microsoft Clarity
 * Uses the official Microsoft Clarity package
 */
export const initClarity = (): void => {
  if (typeof window === 'undefined' || !CLARITY_PROJECT_ID) {
    return;
  }

  // Initialize Clarity with project ID
  Clarity.init(CLARITY_PROJECT_ID);
};

/**
 * Initialize all analytics platforms
 * Call this once when the app starts
 */
export const initAnalytics = (): void => {
  initGA();
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
