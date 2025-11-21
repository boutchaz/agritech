import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private supabase: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Client for user-authenticated requests (uses RLS)
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    // Admin client for service-level operations (bypasses RLS)
    if (supabaseServiceKey) {
      this.adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    this.logger.log('Database connections initialized');
  }

  /**
   * Get Supabase client for user-authenticated requests
   * This client respects Row Level Security (RLS) policies
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get Supabase admin client for service-level operations
   * This client bypasses RLS - use with caution!
   */
  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      throw new Error('Admin client not initialized. Check service role key.');
    }
    return this.adminClient;
  }

  /**
   * Create a client with a specific user's JWT token
   * Useful for operations that need to respect RLS for a specific user
   */
  getClientWithAuth(accessToken: string): SupabaseClient {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Execute a raw SQL query (admin only)
   * Use for complex queries that can't be easily expressed with Supabase client
   */
  async executeRawQuery<T = any>(
    query: string,
    params?: any[],
  ): Promise<{ data: T[]; error: any }> {
    try {
      const { data, error } = await this.adminClient.rpc('execute_sql', {
        query,
        params: params || [],
      });

      return { data, error };
    } catch (error) {
      this.logger.error(`Raw query failed: ${error.message}`, error.stack);
      return { data: null, error };
    }
  }
}
