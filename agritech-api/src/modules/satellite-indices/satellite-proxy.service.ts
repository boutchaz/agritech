import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SatelliteProxyService {
  private readonly logger = new Logger(SatelliteProxyService.name);
  private readonly satelliteBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('SATELLITE_SERVICE_URL') || 'http://localhost:8000';
    this.satelliteBaseUrl = url.replace(/\/+$/, '');
    this.logger.log(`Satellite proxy targeting: ${this.satelliteBaseUrl}`);
  }

  async proxy(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string | string[] | undefined>;
      organizationId?: string;
      timeout?: number;
    } = {},
  ): Promise<unknown> {
    const { body, query, organizationId, timeout = 120_000 } = options;

    const params = new URLSearchParams();
    if (query) {
      for (const [key, val] of Object.entries(query)) {
        if (val === undefined || val === null) continue;
        if (Array.isArray(val)) {
          val.forEach((v) => params.append(key, v));
        } else {
          params.append(key, val);
        }
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${this.satelliteBaseUrl}/api${path}${qs}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }

    this.logger.debug(`[Proxy] ${method} ${url}`);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn(`[Proxy] ${method} ${url} → ${res.status}: ${errorText.slice(0, 500)}`);
        throw new HttpException(
          errorText || `Satellite service error: ${res.statusText}`,
          res.status >= 500 ? HttpStatus.BAD_GATEWAY : res.status,
        );
      }

      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return await res.text();
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`[Proxy] Timeout: ${method} ${url}`);
        throw new HttpException(
          'Satellite service request timed out',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      this.logger.error(`[Proxy] Connection failed: ${method} ${url}`, error);
      throw new HttpException(
        'Satellite service unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async get(path: string, query?: Record<string, string | string[] | undefined>, organizationId?: string) {
    return this.proxy('GET', path, { query, organizationId });
  }

  async post(path: string, body: unknown, organizationId?: string, query?: Record<string, string | string[] | undefined>) {
    return this.proxy('POST', path, { body, organizationId, query });
  }
}
