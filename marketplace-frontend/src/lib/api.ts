export class ApiClient {
    private static get baseUrl() {
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Points to NestJS
    }

    // Generic request handler
    private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // Add auth token if available (client-side)
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...((options.headers as Record<string, string>) || {}),
        };

        if (typeof window !== 'undefined') {
            // Typically you get this from your Auth context or cookie
            // For now, let's assume it's passed or stored in cookie
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
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
}
