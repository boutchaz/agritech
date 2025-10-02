/**
 * Subscription System Configuration
 *
 * ⚠️ IMPORTANT: This system requires ALL users to have a valid subscription.
 * Both old and new organizations must subscribe to access the platform.
 * No grandfathering or legacy access is provided.
 */

/**
 * This constant is kept for potential future use but is currently NOT USED.
 * ALL organizations require subscriptions regardless of creation date.
 */
export const SUBSCRIPTION_ENFORCEMENT_DATE = new Date('2020-01-01T00:00:00Z');

/**
 * Grace period settings
 */
export const SUBSCRIPTION_CONFIG = {
  /**
   * Show warning banner when subscription expires in X days or less
   */
  WARNING_DAYS_BEFORE_EXPIRATION: 7,

  /**
   * Allow access for X days after subscription expires (grace period)
   * Set to 0 to block immediately after expiration
   */
  GRACE_PERIOD_DAYS: 0,

  /**
   * Whether to show legacy user banner for grandfathered organizations
   * Set to false since all users now require subscriptions
   */
  SHOW_LEGACY_USER_BANNER: false,

  /**
   * Paths that don't require subscription (always accessible)
   */
  EXEMPT_PATHS: [
    '/settings/subscription',
    '/settings/organization',
    '/settings/profile',
  ],
};
