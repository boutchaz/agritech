import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private supabase: SupabaseClient;
  private adminClient: SupabaseClient;
  private pgPool: Pool | null = null;

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

    // Initialize PostgreSQL connection pool
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (databaseUrl) {
      this.pgPool = new Pool({
        connectionString: databaseUrl,
        max: 10, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pgPool.on('error', (err) => {
        this.logger.error('Unexpected error on idle PostgreSQL client', err);
      });

      this.logger.log('PostgreSQL connection pool initialized');
    } else {
      this.logger.warn('DATABASE_URL not configured, PostgreSQL pool not initialized');
    }

    this.logger.log('Database connections initialized');
  }

  async onModuleDestroy() {
    if (this.pgPool) {
      await this.pgPool.end();
      this.logger.log('PostgreSQL connection pool closed');
    }
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
   * Get PostgreSQL connection pool
   * Use for operations requiring true ACID transactions
   */
  getPgPool(): Pool {
    if (!this.pgPool) {
      throw new Error('PostgreSQL pool not initialized. Check DATABASE_URL configuration.');
    }
    return this.pgPool;
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

  /**
   * Execute operations within a PostgreSQL transaction
   * Provides true ACID transaction guarantees with BEGIN/COMMIT/ROLLBACK
   *
   * @example
   * await databaseService.executeInPgTransaction(async (client) => {
   *   await client.query('INSERT INTO stock_entries ...');
   *   await client.query('INSERT INTO stock_entry_items ...');
   * });
   */
  async executeInPgTransaction<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const pool = this.getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      this.logger.debug('Transaction started');

      const result = await operation(client);

      await client.query('COMMIT');
      this.logger.debug('Transaction committed');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back due to error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
}
