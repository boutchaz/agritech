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
    static async getProducts() {
        return this.request<any[]>('/marketplace/products');
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
}
