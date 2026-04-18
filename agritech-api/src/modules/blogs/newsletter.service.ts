import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async subscribe(email: string, locale: string = 'fr', sourceSlug?: string): Promise<{ success: boolean; already_subscribed?: boolean }> {
    // Check if already subscribed
    const { data: existing } = await this.databaseService.getAdminClient()
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return { success: true, already_subscribed: true };
    }

    // Insert new subscriber
    const { error } = await this.databaseService.getAdminClient()
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
