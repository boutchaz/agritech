/**
 * Google Tag Manager (GTM) Integration for Marketplace
 * Provides tracking functions for page views, events, and user interactions
 */

export const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || '';
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

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

export { getDeviceInfo };

// ============================================
// GOOGLE TAG MANAGER DATA LAYER HELPERS
// ============================================

export const pushToDataLayer = (event: string, data?: Record<string, unknown>): void => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...data,
  });
};

// ============================================
// MARKETPLACE-SPECIFIC TRACKING FUNCTIONS
// ============================================

/**
 * Track product view
 */
export const trackProductView = (productId: string, productName: string, category?: string, price?: number): void => {
  const deviceInfo = getDeviceInfo();

  pushToDataLayer('view_item', {
    item_id: productId,
    item_name: productName,
    item_category: category,
    price: price,
    ...deviceInfo,
    client_app: 'marketplace',
  });
};

/**
 * Track add to cart
 */
export const trackAddToCart = (productId: string, productName: string, quantity: number, price?: number): void => {
  pushToDataLayer('add_to_cart', {
    item_id: productId,
    item_name: productName,
    quantity: quantity,
    price: price,
  });
};

/**
 * Track remove from cart
 */
export const trackRemoveFromCart = (productId: string, productName: string): void => {
  pushToDataLayer('remove_from_cart', {
    item_id: productId,
    item_name: productName,
  });
};

/**
 * Track checkout start
 */
export const trackBeginCheckout = (cartValue: number, itemCount: number): void => {
  pushToDataLayer('begin_checkout', {
    value: cartValue,
    item_count: itemCount,
    currency: 'MAD',
  });
};

/**
 * Track purchase
 */
export const trackPurchase = (orderId: string, value: number, items: Array<{item_id: string, item_name: string, price?: number, quantity?: number}>): void => {
  pushToDataLayer('purchase', {
    transaction_id: orderId,
    value: value,
    currency: 'MAD',
    items: items,
  });
};

/**
 * Track seller view
 */
export const trackSellerView = (sellerSlug: string, sellerName: string): void => {
  pushToDataLayer('seller_view', {
    seller_slug: sellerSlug,
    seller_name: sellerName,
  });
};

/**
 * Track category view
 */
export const trackCategoryView = (categorySlug: string, categoryName: string): void => {
  pushToDataLayer('category_view', {
    category_slug: categorySlug,
    category_name: categoryName,
  });
};

/**
 * Track search
 */
export const trackSearch = (searchTerm: string, resultCount: number): void => {
  pushToDataLayer('search', {
    search_term: searchTerm,
    results_count: resultCount,
  });
};

/**
 * Track marketplace signup
 */
export const trackSignupStart = (): void => {
  pushToDataLayer('signup_start', {
    client_app: 'marketplace',
  });
};

export const trackSignupComplete = (sellerType: string): void => {
  pushToDataLayer('signup_complete', {
    seller_type: sellerType,
    client_app: 'marketplace',
  });
};

/**
 * Track listing creation
 */
export const trackListingCreate = (productId: string, title: string): void => {
  pushToDataLayer('listing_create', {
    product_id: productId,
    product_title: title,
  });
};

/**
 * Track listing update
 */
export const trackListingUpdate = (productId: string, title: string): void => {
  pushToDataLayer('listing_update', {
    product_id: productId,
    product_title: title,
  });
};

/**
 * Track authentication events
 */
export const trackLogin = (method: string, success: boolean): void => {
  pushToDataLayer('login', {
    method,
    success,
    client_app: 'marketplace',
  });
};

export const trackLogout = (): void => {
  pushToDataLayer('logout', {
    client_app: 'marketplace',
  });
};

/**
 * Track order events
 */
export const trackOrderView = (orderId: string): void => {
  pushToDataLayer('order_view', {
    order_id: orderId,
  });
};

export const trackOrderCancel = (orderId: string, reason?: string): void => {
  pushToDataLayer('order_cancel', {
    order_id: orderId,
    reason,
  });
};

/**
 * Set user ID for cross-device tracking
 */
export const setUserId = (userId: string): void => {
  if (typeof window === 'undefined') return;

  pushToDataLayer('user_id_set', {
    user_id: userId,
  });
};

/**
 * Set user properties for segmentation
 */
export const setUserProperties = (properties: Record<string, string | number | boolean>): void => {
  if (typeof window === 'undefined') return;

  pushToDataLayer('user_properties_set', {
    user_properties: properties,
  });
};

/**
 * Track errors
 */
export const trackError = (error: string, context?: string): void => {
  pushToDataLayer('error', {
    error_message: error,
    error_context: context,
  });
};

// Extend the Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}
