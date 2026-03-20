/**
 * GTM/GA4 Analytics Wrapper
 * 
 * Safe wrapper that provides no-op functions when:
 * - Running in Expo Go
 * - GTM is not configured
 * - Native modules are unavailable
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

// ============================================
// EXPO GO DETECTION & SAFE WRAPPER
// ============================================

const isExpoGo = Constants.appOwnership === 'expo';

// No-op async function for mocking
const noop = async (): Promise<void> => {};
const noopWithArg = async (_arg: unknown): Promise<void> => {};
const noopWithArgs = async (..._args: unknown[]): Promise<void> => {};

// ============================================
// TYPES
// ============================================

export interface MobileAnalyticsUserProperties {
  userId: string;
  email?: string;
  signUpDate: string;
  organizationId: string;
  organizationSize: 'solo' | 'small' | 'medium' | 'large';
  subscriptionTier: 'free' | 'trial' | 'starter' | 'professional' | 'enterprise';
  trialStatus: 'none' | 'active' | 'expired' | 'converted';
  role: 'system_admin' | 'organization_admin' | 'farm_manager' | 'farm_worker' | 'day_laborer' | 'viewer';
  farmCount: number;
  totalHectares: number;
  platform: 'mobile';
  appVersion: string;
}

interface GA4Event {
  name: string;
  params?: Record<string, string | number | boolean | undefined>;
}

interface GA4Body {
  client_id: string;
  user_id?: string;
  events: GA4Event[];
}

// ============================================
// CONFIGURATION
// ============================================

const DEVICE_ID_KEY = 'agritech_device_id';
const GTM_CID_KEY = 'agritech_gtm_cid';
const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const MEASUREMENT_ID = Constants.expoConfig?.extra?.ga4MeasurementId || '';
const API_SECRET = Constants.expoConfig?.extra?.ga4ApiSecret || '';

const isConfigured = MEASUREMENT_ID && MEASUREMENT_ID !== 'G-XXXXXXXXXX' && API_SECRET;

// ============================================
// INTERNAL HELPERS
// ============================================

async function getClientId(): Promise<string> {
  try {
    let clientId = await SecureStore.getItemAsync(GTM_CID_KEY);
    if (!clientId) {
      const randomPart1 = Math.random().toString(36).substring(2, 10);
      const randomPart2 = Math.random().toString(36).substring(2, 20) + Date.now().toString(36);
      clientId = `${randomPart1}.${randomPart2}`;
      await SecureStore.setItemAsync(GTM_CID_KEY, clientId);
    }
    return clientId;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

async function getDeviceInfo() {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = Constants.sessionId || `mobile_${Date.now()}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }

    let deviceType = 'mobile';
    if (Device.deviceType === Device.DeviceType.TABLET) {
      deviceType = 'tablet';
    }

    return {
      client_id: await getClientId(),
      user_id: deviceId,
      device_type: deviceType,
      os_name: Platform.OS,
      os_version: String(Platform.Version),
      app_version: Constants.expoConfig?.version ?? Constants.manifest?.version ?? '1.0.0',
      app_name: Constants.expoConfig?.name ?? 'AgroGina',
      platform: 'mobile',
    };
  } catch {
    return {
      client_id: `fallback_${Date.now()}`,
      user_id: `fallback_${Date.now()}`,
      device_type: 'mobile',
      os_name: Platform.OS,
      os_version: String(Platform.Version),
      app_version: '1.0.0',
      app_name: 'AgroGina',
      platform: 'mobile',
    };
  }
}

// ============================================
// CORE SEND FUNCTION
// ============================================

async function sendEventImpl(eventName: string, params?: Record<string, string | number | boolean | undefined>): Promise<void> {
  if (isExpoGo) {
    if (__DEV__) console.log('[GTM] Expo Go - skipping:', eventName);
    return;
  }

  if (!isConfigured) {
    if (__DEV__) console.log('[GTM] Not configured - skipping:', eventName);
    return;
  }

  try {
    const deviceInfo = await getDeviceInfo();

    // Filter out undefined values
    const cleanParams: Record<string, string | number | boolean> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanParams[key] = value;
        }
      });
    }

    const body: GA4Body = {
      client_id: deviceInfo.client_id,
      user_id: deviceInfo.user_id,
      events: [
        {
          name: eventName,
          params: {
            ...cleanParams,
            device_type: deviceInfo.device_type,
            os_name: deviceInfo.os_name,
            os_version: deviceInfo.os_version,
            app_version: deviceInfo.app_version,
            platform: deviceInfo.platform,
            timestamp: Date.now(),
          },
        },
      ],
    };

    const response = await fetch(
      `${GA4_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok && __DEV__) {
      console.warn('[GTM] Event send failed:', eventName);
    }
  } catch (error) {
    if (__DEV__) console.warn('[GTM] Event send error:', error);
  }
}

// ============================================
// EXPORTED FUNCTIONS (with safe wrappers)
// ============================================

export const sendEvent = sendEventImpl;

export async function initializeGTM(): Promise<void> {
  if (isExpoGo || !isConfigured) return;
  await sendEventImpl('session_start', { session_id: Date.now() });
}

// Screen & Navigation
export async function trackScreenView(screenName: string, screenClass?: string): Promise<void> {
  await sendEventImpl('page_view', {
    page_title: screenName,
    page_location: screenClass || screenName,
    screen_name: screenName,
  });
}

// User Actions
export async function trackAction(action: string, category?: string, label?: string, value?: number): Promise<void> {
  await sendEventImpl('user_action', {
    action_name: action,
    action_category: category || 'user_interaction',
    action_label: label,
    value,
  });
}

// Authentication Events
export async function trackAuth(method: 'login' | 'signup' | 'logout', status: 'success' | 'failed'): Promise<void> {
  await sendEventImpl(`auth_${method}`, { method, status });
}

export async function trackLoginAttempt(method: string): Promise<void> {
  await sendEventImpl('login_attempt', { method });
}

export async function trackLoginSuccess(method: string): Promise<void> {
  await sendEventImpl('login_success', { method });
}

export async function trackLoginFailure(method: string, reason?: string): Promise<void> {
  await sendEventImpl('login_failure', { method, reason });
}

export async function trackLogout(): Promise<void> {
  await sendEventImpl('logout', {});
}

export async function trackBiometricAuth(success: boolean): Promise<void> {
  await sendEventImpl('biometric_auth', { success });
}

// Session & Engagement
export async function trackAppOpen(): Promise<void> {
  await sendEventImpl('app_open', { platform: 'mobile' });
}

export async function trackSessionStart(): Promise<void> {
  await sendEventImpl('session_start', { session_id: Date.now() });
}

export async function trackSessionDuration(seconds: number): Promise<void> {
  await sendEventImpl('session_duration', { duration_seconds: seconds });
}

export async function trackFirstVisit(): Promise<void> {
  await sendEventImpl('first_visit', {});
}

export async function trackEngagementTime(seconds: number): Promise<void> {
  await sendEventImpl('engagement_time', { duration_seconds: seconds });
}

export async function trackDailyActive(): Promise<void> {
  await sendEventImpl('daily_active', { date: new Date().toISOString().split('T')[0] });
}

export async function trackWeeklyActive(): Promise<void> {
  const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1);
  const pastDaysOfYear = (Date.now() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  await sendEventImpl('weekly_active', { week: weekNumber });
}

// User Properties
export async function setUserProperties(properties: MobileAnalyticsUserProperties): Promise<void> {
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
    appVersion: properties.appVersion,
  };

  if (properties.email) {
    let hash = 0;
    for (let i = 0; i < properties.email.length; i++) {
      const char = properties.email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    userProperties.email_hash = Math.abs(hash).toString();
  }

  await sendEventImpl('user_properties_set', userProperties);
}

export async function getDeviceParams(): Promise<Record<string, string>> {
  const deviceInfo = await getDeviceInfo();
  return {
    device_type: deviceInfo.device_type,
    os_name: deviceInfo.os_name,
    os_version: deviceInfo.os_version,
    app_version: deviceInfo.app_version,
  };
}

// Task Events
export async function trackTaskEvent(action: 'created' | 'completed' | 'updated' | 'deleted', taskId?: string): Promise<void> {
  await sendEventImpl(`task_${action}`, { task_id: taskId, task_action: action });
}

// Harvest Events
export async function trackHarvestEvent(action: 'created' | 'updated' | 'deleted', harvestId?: string): Promise<void> {
  await sendEventImpl(`harvest_${action}`, { harvest_id: harvestId, harvest_action: action });
}

// Error Tracking
export async function trackError(error: string, context?: string): Promise<void> {
  await sendEventImpl('error', { error_message: error, error_context: context, fatal: false });
}

// E-Commerce Events
export async function trackViewItem(itemId: string, itemName: string, category?: string, price?: number): Promise<void> {
  await sendEventImpl('view_item', { item_id: itemId, item_name: itemName, item_category: category, price });
}

export async function trackAddToCart(itemId: string, itemName: string, quantity: number, price?: number): Promise<void> {
  await sendEventImpl('add_to_cart', { item_id: itemId, item_name: itemName, quantity, price });
}

export async function trackBeginCheckout(value: number, currency = 'USD'): Promise<void> {
  await sendEventImpl('begin_checkout', { currency, value });
}

export async function trackPurchase(transactionId: string, value: number, currency = 'USD'): Promise<void> {
  await sendEventImpl('purchase', { transaction_id: transactionId, currency, value });
}

export async function trackRefund(transactionId: string, value: number, currency = 'USD'): Promise<void> {
  await sendEventImpl('refund', { transaction_id: transactionId, currency, value });
}

// Registration Funnel
export async function trackSignupStart(): Promise<void> {
  await sendEventImpl('signup_start', {});
}

export async function trackEmailSubmit(): Promise<void> {
  await sendEventImpl('email_submit', {});
}

export async function trackPasswordCreate(): Promise<void> {
  await sendEventImpl('password_create', {});
}

export async function trackOrgSetup(orgName: string): Promise<void> {
  await sendEventImpl('org_setup', { org_name: orgName });
}

export async function trackFarmSetup(farmName: string): Promise<void> {
  await sendEventImpl('farm_setup', { farm_name: farmName });
}

export async function trackFirstTask(): Promise<void> {
  await sendEventImpl('first_task', {});
}

// Trial Funnel
export async function trackTrialView(): Promise<void> {
  await sendEventImpl('trial_view', {});
}

export async function trackTrialStart(planName: string): Promise<void> {
  await sendEventImpl('trial_start', { plan_name: planName });
}

export async function trackTrialDay(dayNumber: number): Promise<void> {
  await sendEventImpl('trial_day', { day: dayNumber });
}

export async function trackTrialConversion(): Promise<void> {
  await sendEventImpl('trial_conversion', {});
}

export async function trackTrialExpired(): Promise<void> {
  await sendEventImpl('trial_expired', {});
}

// Mobile-Specific Events
export async function trackNotificationOpened(notificationId?: string): Promise<void> {
  await sendEventImpl('notification_opened', { notification_id: notificationId });
}

export async function trackBackgroundSync(dataType: string, success: boolean): Promise<void> {
  await sendEventImpl('background_sync', { data_type: dataType, success });
}

export async function trackGeofenceEnter(locationId: string, locationName: string): Promise<void> {
  await sendEventImpl('geofence_enter', { location_id: locationId, location_name: locationName });
}

export async function trackOfflineModeToggle(enabled: boolean): Promise<void> {
  await sendEventImpl('offline_mode_toggle', { enabled });
}

// Dashboard & Widget Events
export async function trackDashboardView(dashboardType: 'regular' | 'live'): Promise<void> {
  await sendEventImpl('dashboard_view', { type: dashboardType });
}

export async function trackWidgetView(widgetName: string): Promise<void> {
  await sendEventImpl('widget_view', { widget_name: widgetName });
}

export async function trackWidgetClick(widgetName: string, action: string): Promise<void> {
  await sendEventImpl('widget_click', { widget_name: widgetName, action });
}

export async function trackFarmSelection(farmId: string | null): Promise<void> {
  await sendEventImpl('farm_selection', { farm_id: farmId || 'none' });
}

export async function trackQuickActions(action: string): Promise<void> {
  await sendEventImpl('quick_actions', { action });
}

// Entity CRUD Events
export async function trackEntityCreate(entityType: string, entityId?: string): Promise<void> {
  await sendEventImpl('entity_create', { entity_type: entityType, entity_id: entityId });
}

export async function trackEntityUpdate(entityType: string, entityId?: string): Promise<void> {
  await sendEventImpl('entity_update', { entity_type: entityType, entity_id: entityId });
}

export async function trackEntityDelete(entityType: string, entityId?: string): Promise<void> {
  await sendEventImpl('entity_delete', { entity_type: entityType, entity_id: entityId });
}
