export class ApiClient {
    private static get baseUrl() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        // Ensure we use the /api/v1 prefix
        return apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
    }

    private static getAuthToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('auth_token');
    }

    private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const token = this.getAuthToken();
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
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
            if (response.status === 401) {
                // Clear token and redirect to login
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth_token');
                    window.location.href = '/login';
                }
            }
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    // AUTH METHODS
    static async login(email: string, password: string) {
        const response = await this.request<{ access_token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', response.access_token);
        }

        return response;
    }

    static async signup(email: string, password: string, organizationName: string) {
        return this.request<{ access_token: string; user: any }>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, organizationName }),
        });
    }

    static async logout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
        }
    }

    static async getCurrentUser() {
        return this.request<any>('/auth/me');
    }

    // MARKETPLACE METHODS
    static async getProducts(category?: string) {
        const params = category ? `?category=${encodeURIComponent(category)}` : '';
        return this.request<any[]>(`/marketplace/products${params}`);
    }

    static async getProduct(id: string) {
        return this.request<any>(`/marketplace/products/${id}`);
    }

    static async getDashboardStats(organizationId: string) {
        return this.request<any>(`/marketplace/dashboard/stats?organizationId=${organizationId}`);
    }

    static async createListing(data: any) {
        return this.request<any>('/marketplace/products', {
            method: 'POST',
            body: JSON.stringify(data),
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
}

// Types
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
