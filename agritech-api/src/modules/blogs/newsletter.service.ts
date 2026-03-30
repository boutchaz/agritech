import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get('SUPABASE_URL');
    const supabaseKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async subscribe(email: string, locale: string = 'fr', sourceSlug?: string): Promise<{ success: boolean; already_subscribed?: boolean }> {
    // Check if already subscribed
    const { data: existing } = await this.supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return { success: true, already_subscribed: true };
    }

    // Insert new subscriber
    const { error } = await this.supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase().trim(),
        locale,
        source_slug: sourceSlug,
      });

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        return { success: true, already_subscribed: true };
      }
      this.logger.error('Error subscribing to newsletter:', error);
      throw error;
    }

    this.logger.log(`New newsletter subscriber: ${email} (${locale})`);
    return { success: true };
  }
}
