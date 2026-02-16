import { createBrowserSupabaseClient } from '@/lib/supabase/client';

// Device Analytics Headers
interface DeviceInfo {
    deviceType: 'web' | 'mobile' | 'desktop';
    deviceOs: string;
    appVersion: string;
    deviceId: string;
}

function getDeviceInfo(): DeviceInfo {
    // Check if running in Tauri desktop app
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

    let deviceType: 'web' | 'mobile' | 'desktop' = 'web';
    if (isTauri) {
        deviceType = 'desktop';
    } else if (typeof navigator !== 'undefined') {
        // Mobile detection
        const userAgent = navigator.userAgent;
        if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            deviceType = 'mobile';
        }
    }

    // Get or generate device ID
    let deviceId: string | null = null;
    if (typeof window !== 'undefined') {
        deviceId = localStorage.getItem('agritech_marketplace_device_id');
    }
    if (!deviceId) {
        deviceId = `marketplace_${deviceType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        if (typeof window !== 'undefined') {
            localStorage.setItem('agritech_marketplace_device_id', deviceId);
        }
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

    // Get app version from package.json or build info
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

    return {
        deviceType,
        deviceOs: isTauri ? `tauri-${deviceOs}` : deviceOs,
        appVersion,
        deviceId,
    };
}

function getAnalyticsHeaders(): Record<string, string> {
    const deviceInfo = getDeviceInfo();
    return {
        'X-Device-Type': deviceInfo.deviceType,
        'X-Device-OS': deviceInfo.deviceOs,
        'X-App-Version': deviceInfo.appVersion,
        'X-Device-Id': deviceInfo.deviceId,
        'X-Client-App': 'marketplace',
    };
}

/**
 * Get the current Supabase access token from the browser session.
 * Returns null if no session exists (user not logged in).
 */
async function getSupabaseToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
        const supabase = createBrowserSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    } catch {
        return null;
    }
}

export class ApiClient {
    private static get baseUrl() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        // Ensure we use the /api/v1 prefix
        return apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
    }

    private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const token = await getSupabaseToken();
        const analyticsHeaders = getAnalyticsHeaders();
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...analyticsHeaders,
            ...((options.headers as Record<string, string>) || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // Try to get error message from response body
            let errorMessage = response.statusText;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // Response body is not JSON, use statusText
            }

            if (response.status === 401) {
                // Token expired or invalid — redirect to login
                // (middleware handles session refresh, so if we get 401 the session is truly gone)
                if (token && endpoint !== '/auth/login') {
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }
                }
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    // AUTH METHODS — signup still goes through backend for provisioning
    static async signup(data: {
        email: string;
        password: string;
        displayName: string;
        phone?: string;
        sellerType: 'individual' | 'business' | 'farm';
    }) {
        return this.request<{ user: any; organization: any; requiresLogin: boolean }>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
                email: data.email,
                password: data.password,
                displayName: data.displayName,
                phone: data.phone,
                organizationName: data.sellerType !== 'individual' ? data.displayName : undefined,
                sellerType: data.sellerType,
                accountType: 'marketplace_only',
            }),
        });
    }

    static async getCurrentUser() {
        return this.request<any>('/auth/me');
    }

    // MARKETPLACE METHODS
    static async getProducts(category?: string) {
        const params = category ? `?category=${encodeURIComponent(category)}` : '';
        return this.request<any[]>(`/marketplace/products${params}`);
    }

    static async getProductsPaginated(params?: {
        category?: string;
        search?: string;
        sort?: string;
        min_price?: number;
        max_price?: number;
        page?: number;
        limit?: number;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.sort) searchParams.set('sort', params.sort);
        if (params?.min_price !== undefined) searchParams.set('min_price', params.min_price.toString());
        if (params?.max_price !== undefined) searchParams.set('max_price', params.max_price.toString());
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
            `/marketplace/products${query ? `?${query}` : ''}`
        );
    }

    static async getProduct(id: string) {
        return this.request<any>(`/marketplace/products/${id}`);
    }

    static async getDashboardStats(organizationId: string) {
        return this.request<any>(`/marketplace/dashboard/stats?organizationId=${organizationId}`);
    }

    // LISTING MANAGEMENT METHODS
    static async getMyListings() {
        return this.request<any[]>('/marketplace/my-listings');
    }

    static async createListing(data: {
        title: string;
        description: string;
        short_description?: string;
        price: number;
        unit: string;
        product_category_id?: string;
        images?: string[];
        quantity_available?: number;
        sku?: string;
    }) {
        return this.request<any>('/marketplace/listings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async updateListing(id: string, data: Partial<{
        title: string;
        description: string;
        short_description: string;
        price: number;
        unit: string;
        product_category_id: string;
        images: string[];
        quantity_available: number;
        sku: string;
        status: string;
        is_public: boolean;
    }>) {
        return this.request<any>(`/marketplace/listings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    static async deleteListing(id: string) {
        return this.request<{ success: boolean }>(`/marketplace/listings/${id}`, {
            method: 'DELETE',
        });
    }

    // CATEGORY METHODS
    static async getCategories(locale: string = 'fr') {
        return this.request<any>(`/marketplace/categories?locale=${locale}`);
    }

    static async getFeaturedCategories(locale: string = 'fr') {
        return this.request<any>(`/marketplace/categories/featured?locale=${locale}`);
    }

    static async getCategoryBySlug(slug: string, locale: string = 'fr') {
        return this.request<any>(`/marketplace/categories/${slug}?locale=${locale}`);
    }

    // CART METHODS
    static async getCart() {
        return this.request<Cart>('/marketplace/cart');
    }

    static async addToCart(data: { listing_id?: string; item_id?: string; quantity: number }) {
        return this.request<Cart>('/marketplace/cart/items', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async updateCartItem(cartItemId: string, quantity: number) {
        return this.request<Cart>(`/marketplace/cart/items/${cartItemId}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
        });
    }

    static async removeFromCart(cartItemId: string) {
        return this.request<Cart>(`/marketplace/cart/items/${cartItemId}`, {
            method: 'DELETE',
        });
    }

    static async clearCart() {
        return this.request<{ message: string }>('/marketplace/cart/clear', {
            method: 'DELETE',
        });
    }

    // ORDER METHODS
    static async createOrder(data: CreateOrderDto) {
        return this.request<Order>('/marketplace/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async getOrders() {
        return this.request<Order[]>('/marketplace/orders');
    }

    static async getOrder(orderId: string) {
        return this.request<Order>(`/marketplace/orders/${orderId}`);
    }

    static async cancelOrder(orderId: string) {
        return this.request<Order>(`/marketplace/orders/${orderId}/cancel`, {
            method: 'POST',
        });
    }

    // SELLER/PARTNER METHODS
    static async getSellers(params?: { city?: string; category?: string; search?: string; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params?.city) searchParams.set('city', params.city);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.limit) searchParams.set('limit', params.limit.toString());
        const query = searchParams.toString();
        return this.request<{ sellers: Seller[]; total: number }>(`/marketplace/sellers${query ? `?${query}` : ''}`);
    }

    static async getSellerCities() {
        return this.request<string[]>('/marketplace/sellers/cities');
    }

    static async getSeller(slug: string) {
        return this.request<Seller>(`/marketplace/sellers/${slug}`);
    }

    static async getSellerProducts(slug: string, page?: number, limit?: number) {
        const params = new URLSearchParams();
        if (page) params.set('page', page.toString());
        if (limit) params.set('limit', limit.toString());
        const query = params.toString();
        return this.request<{ products: any[]; total: number }>(`/marketplace/sellers/${slug}/products${query ? `?${query}` : ''}`);
    }

    static async getSellerReviews(slug: string, page?: number, limit?: number) {
        const params = new URLSearchParams();
        if (page) params.set('page', page.toString());
        if (limit) params.set('limit', limit.toString());
        const query = params.toString();
        return this.request<{ reviews: SellerReview[]; total: number }>(`/marketplace/sellers/${slug}/reviews${query ? `?${query}` : ''}`);
    }

    // REVIEW METHODS
    static async canReview(sellerId: string) {
        return this.request<{ canReview: boolean; reason?: string }>(`/marketplace/reviews/can-review/${sellerId}`);
    }

    static async createReview(data: CreateReviewDto) {
        return this.request<SellerReview>('/marketplace/reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

// Types
export interface Seller {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    is_verified?: boolean;
    created_at: string;
    product_count: number;
    average_rating?: number;
    review_count: number;
}

export interface SellerReview {
    id: string;
    rating: number;
    comment?: string;
    created_at: string;
    reviewer: {
        id: string;
        name: string;
        logo_url?: string;
    };
}
export interface CartItem {
    id: string;
    listing_id?: string;
    item_id?: string;
    seller_organization_id: string;
    title: string;
    quantity: number;
    unit_price: number;
    unit?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
}

export interface Cart {
    id: string | null;
    user_id: string;
    items: CartItem[];
    total: number;
    item_count: number;
}

export interface CreateOrderDto {
    shipping_details: {
        name: string;
        phone: string;
        email?: string;
        address: string;
        city: string;
        postal_code?: string;
    };
    payment_method: 'cod' | 'online';
    notes?: string;
}

export interface CreateReviewDto {
    seller_organization_id: string;
    order_id: string;
    rating: number;
    comment?: string;
}

export interface OrderItem {
    id: string;
    product_id: string;
    title: string;
    quantity: number;
    unit_price: number;
    unit?: string;
}

export interface Order {
    id: string;
    buyer_organization_id: string;
    seller_organization_id: string;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'disputed';
    total_amount: number;
    currency: string;
    shipping_details: {
        name: string;
        phone: string;
        email?: string;
        address: string;
        city: string;
        postal_code?: string;
    };
    payment_method: string;
    payment_status: string;
    items: OrderItem[];
    notes?: string;
    created_at: string;
    updated_at: string;
}
