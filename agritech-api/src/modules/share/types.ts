export type ShareableResourceType =
  | 'invoice'
  | 'quote'
  | 'sales_order'
  | 'purchase_order'
  | 'delivery'
  | 'payment';

export type ShareChannel = 'email' | 'whatsapp';

export interface ShareableResource {
  id: string;
  organizationId: string;
  /** Document number / display id (e.g. "INV-2026-0042"). */
  documentNumber: string;
  /** Recipient name (party / customer / supplier). */
  partyName?: string;
  /** Default email address from the resource's party. */
  partyEmail?: string;
  /** Default phone (E.164) from the resource's party. */
  partyPhone?: string;
  /** Currency + amount summary (used to build default body). */
  amount?: number;
  currency?: string;
  /** ISO date for the document (invoice_date, quote_date, etc.). */
  documentDate?: string;
  /** Optional public URL where the recipient can view the document. */
  publicUrl?: string;
  /** Free-form additional fields a resolver wants to expose for templating. */
  extra?: Record<string, unknown>;
}

export interface ShareablePdf {
  buffer: Buffer;
  filename: string;
}

export interface ShareableResolver {
  type: ShareableResourceType;
  /** Returns null when the resource is not found. */
  resolve(id: string, organizationId: string): Promise<ShareableResource | null>;
  /** Default email subject. */
  buildSubject(resource: ShareableResource, locale?: string): string;
  /** Default plain-text body (also used as HTML if no template). */
  buildBody(resource: ShareableResource, locale?: string): string;
  /** Optional PDF generator. When defined and `attach_pdf=true`, the file is
   *  attached on email or sent as a WhatsApp document. */
  getPdf?(resource: ShareableResource): Promise<ShareablePdf | null>;
}

export const SHAREABLE_RESOLVERS = Symbol('SHAREABLE_RESOLVERS');
