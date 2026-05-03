import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DocumentPdfService } from '../pdf/document-pdf.service';
import type {
  ShareableResolver,
  ShareableResource,
  ShareableResourceType,
  ShareablePdf,
} from '../types';

/**
 * Common helpers for resolvers. Each concrete resolver only declares which
 * table/columns to read and how to build the human-readable subject/body.
 */
@Injectable()
export abstract class BaseShareableResolver implements ShareableResolver {
  abstract readonly type: ShareableResourceType;

  constructor(
    protected readonly databaseService: DatabaseService,
    protected readonly pdfService: DocumentPdfService,
  ) {}

  abstract resolve(
    id: string,
    organizationId: string,
  ): Promise<ShareableResource | null>;

  abstract buildSubject(resource: ShareableResource, locale?: string): string;
  abstract buildBody(resource: ShareableResource, locale?: string): string;
  getPdf?(resource: ShareableResource): Promise<ShareablePdf | null>;

  protected formatAmount(resource: ShareableResource): string {
    if (resource.amount == null) return '';
    const cur = resource.currency || 'MAD';
    return `${resource.amount.toFixed(2)} ${cur}`;
  }

  protected async loadParty(
    partyType: 'customer' | 'supplier' | null | undefined,
    partyId: string | null | undefined,
  ): Promise<{ name?: string; email?: string; phone?: string }> {
    if (!partyType || !partyId) return {};
    const supabase = this.databaseService.getAdminClient();
    const table = partyType === 'customer' ? 'customers' : 'suppliers';
    const { data } = await supabase
      .from(table)
      .select('name, email, phone, mobile, whatsapp')
      .eq('id', partyId)
      .maybeSingle();
    if (!data) return {};
    return {
      name: data.name,
      email: data.email ?? undefined,
      phone: data.whatsapp ?? data.mobile ?? data.phone ?? undefined,
    };
  }
}
