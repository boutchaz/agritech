import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Strapi Service - Generic HTTP client for Strapi CMS API
 *
 * Handles all communication with Strapi CMS including:
 * - Authentication via API tokens
 * - GET, POST, PUT, DELETE operations
 * - Error handling and logging
 * - Query parameter building
 */
@Injectable()
export class StrapiService {
  private readonly logger = new Logger(StrapiService.name);
  private readonly client: AxiosInstance;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get('STRAPI_API_URL') || 'http://localhost:1337/api';
    const apiToken = this.configService.get('STRAPI_API_TOKEN');

    if (!apiToken) {
      this.logger.warn('STRAPI_API_TOKEN not configured - Strapi requests will fail');
    }

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Strapi Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Strapi Request Error:', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error?.message || error.message;
        this.logger.error(`Strapi Error: ${message}`, error.response?.data);
        throw new HttpException(
          message || 'Strapi API error',
          error.response?.status || 500,
        );
      },
    );
  }

  /**
   * GET request to Strapi
   */
  async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const config: AxiosRequestConfig = { params };
    const response = await this.client.get(endpoint, config);
    return response.data;
  }

  /**
   * POST request to Strapi
   */
  async post<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  /**
   * PUT request to Strapi
   */
  async put<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  /**
   * DELETE request to Strapi
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  /**
   * Build Strapi query parameters with filters
   */
  buildFilters(filters: Record<string, any>): any {
    const params: any = {};

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params[`filters[${key}][$eq]`] = filters[key];
      }
    });

    return params;
  }

  /**
   * Build Strapi populate parameter
   */
  buildPopulate(fields: string[]): any {
    if (fields.length === 0) return {};

    return {
      populate: fields.join(','),
    };
  }

  /**
   * Transform Strapi response to simple format
   * Handles both Strapi v4 (data.attributes) and v5 (flat structure) formats
   */
  transformResponse<T = any>(strapiResponse: any): T[] {
    if (!strapiResponse?.data) return [];

    if (Array.isArray(strapiResponse.data)) {
      return strapiResponse.data.map((item: any) => {
        // Strapi v5 uses flat structure, v4 uses attributes
        if (item.attributes) {
          return {
            id: item.id,
            ...item.attributes,
          };
        }
        // Strapi v5 flat structure - item already has all fields
        return item;
      });
    }

    // Single item response
    if (strapiResponse.data.attributes) {
      return [{
        id: strapiResponse.data.id,
        ...strapiResponse.data.attributes,
      }];
    }
    return [strapiResponse.data];
  }

  /**
   * Transform single item response
   * Handles both Strapi v4 (data.attributes) and v5 (flat structure) formats
   */
  transformSingleResponse<T = any>(strapiResponse: any): T {
    if (!strapiResponse?.data) return null;

    // Strapi v5 uses flat structure, v4 uses attributes
    if (strapiResponse.data.attributes) {
      return {
        id: strapiResponse.data.id,
        ...strapiResponse.data.attributes,
      } as T;
    }
    // Strapi v5 flat structure
    return strapiResponse.data as T;
  }
}
