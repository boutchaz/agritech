/**
 * Google Analytics 4 (GA4) — gtag.js only
 * Lightweight analytics: page views + custom events via gtag.
 * No Clarity, no GTM, no heavy tracking.
 */

export const GA_TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// ============================================
// Types
// ============================================

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

export interface AnalyticsUserProperties {
  userId: string;
  email?: string;
  signUpDate: string;
  organizationId: string;
  organizationSize: 'solo' | 'small' | 'medium' | 'large';
  subscriptionTier:
    | 'free'
    | 'trial'
    | 'starter'
    | 'standard'
    | 'premium'
    | 'professional'
    | 'enterprise';
  trialStatus: 'none' | 'active' | 'expired' | 'converted';
  role: 'system_admin' | 'organization_admin' | 'farm_manager' | 'farm_worker' | 'day_laborer' | 'viewer';
  farmCount: number;
  totalHectares: number;
  platform: 'web';
}

// ============================================
// Init — gtag.js only
// ============================================

/**
 * Initialize Google Analytics (gtag.js)
 */
export const initGA = (): void => {
  if (typeof window === 'undefined' || !GA_TRACKING_ID) return;
  if (window.gtag) return; // already initialized

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, { send_page_view: false });
};

// Stubs for removed features — keep API surface so callers don't break
export const markRouterNavigating = (): void => {};
export const markRouterStable = (): void => {};
export const initClarity = (): void => {};

// ============================================
// Core tracking
// ============================================

export const trackPageView = (options: PageViewOptions = {}): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;
  window.gtag('event', 'page_view', {
    page_title: options.title ?? document.title,
    page_location: options.location ?? window.location.href,
    page_path: options.path ?? window.location.pathname,
    send_to: GA_TRACKING_ID,
  });
};

export const trackEvent = (event: GtagEvent): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;
  window.gtag('event', event.action, {
    event_category: event.category,
    event_label: event.label,
    value: event.value,
    non_interaction: event.nonInteraction,
    send_to: GA_TRACKING_ID,
  });
};

export const setUserId = (userId: string): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;
  window.gtag('config', GA_TRACKING_ID, { user_id: userId });
};

export const setUserProperties = (properties: Record<string, string | number | boolean>): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;
  window.gtag('set', 'user_properties', properties);
};

/**
 * Set user properties for segmentation (called once after auth)
 */
export const setAnalyticsUserProperties = (properties: AnalyticsUserProperties): void => {
  if (typeof window === 'undefined' || !window.gtag || !GA_TRACKING_ID) return;

  window.gtag('set', 'user_properties', {
    userId: properties.userId,
    organizationId: properties.organizationId,
    organizationSize: properties.organizationSize,
    subscriptionTier: properties.subscriptionTier,
    role: properties.role,
    farmCount: properties.farmCount,
    totalHectares: properties.totalHectares,
    platform: properties.platform,
  });

  window.gtag('config', GA_TRACKING_ID, { user_id: properties.userId });
};

export const trackError = (error: string, fatal = false): void => {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'exception', { description: error, fatal });
};

// ============================================
// Dashboard
// ============================================

export const trackDashboardView = (dashboardType: 'regular' | 'live'): void => {
  trackEvent({ action: 'dashboard_view', category: 'Dashboard', label: dashboardType });
};

export const trackLiveModeToggle = (enabled: boolean): void => {
  trackEvent({ action: 'live_mode_toggle', category: 'Dashboard', label: enabled ? 'enabled' : 'disabled' });
};

export const trackRefreshMetrics = (): void => {
  trackEvent({ action: 'refresh_metrics', category: 'Dashboard', label: 'manual_refresh' });
};

// ============================================
// Auth
// ============================================

export const trackLoginAttempt = (method: 'email' | 'google' | 'github'): void => {
  trackEvent({ action: 'login_attempt', category: 'Authentication', label: method });
};

export const trackLoginSuccess = (method: 'email' | 'google' | 'github'): void => {
  trackEvent({ action: 'login_success', category: 'Authentication', label: method });
};

export const trackLoginFailure = (method: 'email' | 'google' | 'github', error: string): void => {
  trackEvent({ action: 'login_failure', category: 'Authentication', label: `${method}_${error}` });
};

export const trackRegisterAttempt = (): void => {
  trackEvent({ action: 'register_attempt', category: 'Authentication', label: 'signup_start' });
};

export const trackRegisterSuccess = (withDemoData: boolean): void => {
  trackEvent({ action: 'register_success', category: 'Authentication', label: withDemoData ? 'with_demo_data' : 'without_demo_data' });
};

export const trackRegisterFailure = (error: string): void => {
  trackEvent({ action: 'register_failure', category: 'Authentication', label: error });
};

export const trackLogout = (): void => {
  trackEvent({ action: 'logout', category: 'Authentication', label: 'user_logout' });
};

export const trackSessionStart = (): void => {
  trackEvent({ action: 'session_start', category: 'Engagement', label: 'app_open' });
};

// ============================================
// Onboarding
// ============================================

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;
export type OnboardingStepName = 'profile' | 'organization' | 'farm' | 'modules' | 'preferences';

export const trackOnboardingStart = (): void => {
  trackEvent({ action: 'onboarding_start', category: 'Onboarding', label: 'trial_selection' });
};

export const trackTrialPlanView = (planName: string): void => {
  trackEvent({ action: 'trial_plan_view', category: 'Onboarding', label: planName, nonInteraction: true });
};

export const trackTrialPlanSelect = (planName: string, price: number): void => {
  trackEvent({ action: 'trial_plan_select', category: 'Onboarding', label: planName, value: price });
};

export const trackTrialStartAttempt = (planName: string): void => {
  trackEvent({ action: 'trial_start_attempt', category: 'Onboarding', label: planName });
};

export const trackTrialStartSuccess = (planName: string): void => {
  trackEvent({ action: 'trial_start_success', category: 'Onboarding', label: planName });
};

export const trackTrialStartFailure = (planName: string, error: string): void => {
  trackEvent({ action: 'trial_start_failure', category: 'Onboarding', label: `${planName}_${error}` });
};

export const trackCheckoutSuccess = (planName: string, amount: number): void => {
  trackEvent({ action: 'purchase', category: 'Ecommerce', label: planName, value: amount });
};

export const trackOnboardingStepView = (step: OnboardingStep, stepName: OnboardingStepName): void => {
  trackEvent({ action: 'onboarding_step_view', category: 'Onboarding', label: stepName, value: step, nonInteraction: true });
};

export const trackOnboardingStepComplete = (step: OnboardingStep, stepName: OnboardingStepName, timeSpentSeconds: number): void => {
  trackEvent({ action: 'onboarding_step_complete', category: 'Onboarding', label: stepName, value: Math.round(timeSpentSeconds) });
};

export const trackOnboardingFieldInteraction = (stepName: OnboardingStepName, fieldName: string, action: 'focus' | 'blur' | 'change'): void => {
  trackEvent({ action: 'onboarding_field_interaction', category: 'Onboarding', label: `${stepName}_${fieldName}_${action}`, nonInteraction: true });
};

export const trackOnboardingValidationError = (stepName: OnboardingStepName, fieldName: string, _errorMessage: string): void => {
  trackEvent({ action: 'onboarding_validation_error', category: 'Onboarding', label: `${stepName}_${fieldName}` });
};

export const trackOnboardingAPIError = (stepName: OnboardingStepName, action: string, errorMessage: string): void => {
  trackEvent({ action: 'onboarding_api_error', category: 'Onboarding', label: `${stepName}_${action}` });
  trackError(`onboarding_${stepName}_${action}: ${errorMessage}`);
};

export const trackOnboardingSkip = (stepName: OnboardingStepName, reason?: string): void => {
  trackEvent({ action: 'onboarding_skip', category: 'Onboarding', label: reason ? `${stepName}_${reason}` : stepName });
};

export const trackOnboardingBack = (fromStep: OnboardingStep, toStep: OnboardingStep): void => {
  trackEvent({ action: 'onboarding_back', category: 'Onboarding', label: `step_${fromStep}_to_${toStep}` });
};

export const trackOnboardingDropOff = (currentStep: OnboardingStep, stepName: OnboardingStepName, timeSpentSeconds: number): void => {
  trackEvent({ action: 'onboarding_drop_off', category: 'Onboarding', label: stepName, value: Math.round(timeSpentSeconds) });
};

export const trackOnboardingComplete = (totalTimeSeconds: number, hasDemoData: boolean): void => {
  trackEvent({ action: 'onboarding_complete', category: 'Onboarding', label: hasDemoData ? 'with_demo_data' : 'without_demo_data', value: Math.round(totalTimeSeconds) });
};

export const trackOnboardingResume = (currentStep: OnboardingStep): void => {
  trackEvent({ action: 'onboarding_resume', category: 'Onboarding', label: `step_${currentStep}` });
};

export const trackOnboardingModuleToggle = (moduleId: string, enabled: boolean): void => {
  trackEvent({ action: 'onboarding_module_toggle', category: 'Onboarding', label: `${moduleId}_${enabled ? 'enabled' : 'disabled'}` });
};

export const trackOnboardingMilestone = (percentage: 25 | 50 | 75): void => {
  trackEvent({ action: 'onboarding_milestone', category: 'Onboarding', label: `${percentage}_percent`, value: percentage });
};

export const trackOnboardingSlugCheck = (slug: string, available: boolean): void => {
  trackEvent({ action: 'onboarding_slug_check', category: 'Onboarding', label: available ? 'available' : 'unavailable', nonInteraction: true });
};

export const trackOnboardingAutosave = (stepName: OnboardingStepName, success: boolean): void => {
  trackEvent({ action: success ? 'onboarding_autosave' : 'onboarding_autosave_failed', category: 'Onboarding', label: stepName, nonInteraction: success });
};

// ============================================
// Navigation / Forms / Features — light wrappers
// ============================================

export const trackNavigationClick = (destination: string, type: 'sidebar' | 'breadcrumb' | 'button' | 'link'): void => {
  trackEvent({ action: 'navigation_click', category: 'Navigation', label: `${type}_${destination}` });
};

export const trackFormSubmitStart = (formName: string): void => {
  trackEvent({ action: 'form_submit_start', category: 'Form', label: formName });
};

export const trackFormSubmitSuccess = (formName: string): void => {
  trackEvent({ action: 'form_submit_success', category: 'Form', label: formName });
};

export const trackFormSubmitError = (formName: string, error: string): void => {
  trackEvent({ action: 'form_submit_error', category: 'Form', label: `${formName}_${error}` });
};

export const trackFeatureUsed = (featureName: string, action?: string): void => {
  trackEvent({ action: 'feature_used', category: 'Feature', label: action ? `${featureName}_${action}` : featureName });
};

export const trackSettingChange = (settingName: string, value: string): void => {
  trackEvent({ action: 'setting_change', category: 'Settings', label: `${settingName}_${value}` });
};

export const trackEntityCreate = (entityType: string, _entityId?: string): void => {
  trackEvent({ action: 'entity_create', category: 'CRUD', label: entityType });
};

export const trackEntityUpdate = (entityType: string, _entityId?: string): void => {
  trackEvent({ action: 'entity_update', category: 'CRUD', label: entityType });
};

export const trackEntityDelete = (entityType: string, _entityId?: string): void => {
  trackEvent({ action: 'entity_delete', category: 'CRUD', label: entityType });
};

// ============================================
// Stubs for removed heavy-tracking functions
// (keep exports so existing call-sites compile)
// ============================================

export const trackWidgetView = (_w: string): void => {};
export const trackWidgetClick = (_w: string, _a: string): void => {};
export const trackWidgetToggle = (_w: string, _e: boolean): void => {};
export const trackFarmSelection = (_f: string | null): void => {};
export const trackQuickActions = (_a: string): void => {};
export const trackPasswordResetRequest = (): void => {};
export const trackPasswordResetSuccess = (): void => {};
export const trackFirstVisit = (): void => {};
export const trackSearch = (_t: string, _c: number): void => {};
export const trackExportData = (_d: string, _f: string): void => {};
export const trackImportData = (_d: string): void => {};
export const trackViewItem = (_id: string, _n: string, _c?: string, _p?: number): void => {};
export const trackBeginCheckout = (_v: number, _cur?: string, _items?: any[]): void => {};
export const trackPurchase = (_tid: string, _v: number, _cur?: string, _items?: any[]): void => {};
export const trackTrialView = (): void => {};
export const trackTrialConversion = (): void => {};
