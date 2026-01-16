import { apiClient } from '../api-client';

/**
 * Tour ID type - matches backend TourId definition
 */
export type TourId =
  | 'welcome'
  | 'full-app'
  | 'dashboard'
  | 'farm-management'
  | 'parcels'
  | 'tasks'
  | 'workers'
  | 'inventory'
  | 'harvests'
  | 'infrastructure'
  | 'billing'
  | 'accounting'
  | 'satellite'
  | 'reports'
  | 'settings';

/**
 * Tour preferences response from the API
 */
export interface TourPreferences {
  completed_tours: TourId[];
  dismissed_tours: TourId[];
}

/**
 * Response from tour action endpoints (dismiss, complete, reset)
 */
export interface TourActionResponse extends TourPreferences {
  success: boolean;
  message: string;
}

const BASE_URL = '/api/v1/users';

/**
 * API service for managing tour preferences
 * These endpoints persist tour state in the database for cross-device sync
 */
export const tourPreferencesApi = {
  /**
   * Get current user's tour preferences (completed and dismissed tours)
   * This is the primary endpoint to check on app load/login
   */
  async getTourPreferences(): Promise<TourPreferences> {
    return apiClient.get<TourPreferences>(`${BASE_URL}/me/tour-preferences`);
  },

  /**
   * Update tour preferences (bulk update)
   * Use this when you need to set both completed and dismissed arrays at once
   */
  async updateTourPreferences(preferences: Partial<TourPreferences>): Promise<TourPreferences> {
    return apiClient.patch<TourPreferences>(`${BASE_URL}/me/tour-preferences`, preferences);
  },

  /**
   * Dismiss a specific tour (mark as permanently skipped)
   * This prevents the tour from auto-starting again
   */
  async dismissTour(tourId: TourId): Promise<TourActionResponse> {
    return apiClient.post<TourActionResponse>(`${BASE_URL}/me/tours/${tourId}/dismiss`);
  },

  /**
   * Mark a tour as completed
   * Tours marked as completed won't auto-start, but can still be manually restarted
   */
  async completeTour(tourId: TourId): Promise<TourActionResponse> {
    return apiClient.post<TourActionResponse>(`${BASE_URL}/me/tours/${tourId}/complete`);
  },

  /**
   * Reset a specific tour (remove from completed and dismissed lists)
   * This allows the tour to be shown again
   */
  async resetTour(tourId: TourId): Promise<TourActionResponse> {
    return apiClient.post<TourActionResponse>(`${BASE_URL}/me/tours/${tourId}/reset`);
  },

  /**
   * Reset all tours (clear both completed and dismissed lists)
   * Use this to show all tours again from scratch
   */
  async resetAllTours(): Promise<TourActionResponse> {
    return apiClient.post<TourActionResponse>(`${BASE_URL}/me/tours/reset-all`);
  },
};

/**
 * Utility function to check if a tour should auto-start
 * A tour should auto-start if it's not completed AND not dismissed
 */
export function shouldAutoStartTour(
  tourId: TourId,
  preferences: TourPreferences
): boolean {
  return (
    !preferences.completed_tours.includes(tourId) &&
    !preferences.dismissed_tours.includes(tourId)
  );
}

/**
 * Retry configuration for tour API calls
 */
export const TOUR_API_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  // Time in ms to wait before considering the sync stale and refetching
  staleTimeMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Helper function to retry an API call with exponential backoff
 */
export async function retryTourApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = TOUR_API_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Tour API call failed (attempt ${attempt + 1}/${maxRetries}):`, lastError.message);

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s, ...
        const delay = TOUR_API_CONFIG.retryDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
