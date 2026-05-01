import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateWorkerDocumentDto,
  UpdateWorkerDocumentDto,
} from './dto/create-worker-document.dto';

@Injectable()
export class WorkerDocumentsService {
  constructor(private readonly db: DatabaseService) {}

  async list(
    organizationId: string,
    filters: { worker_id?: string; document_type?: string; expiring_within_days?: number },
  ) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('worker_documents')
      .select(`*, worker:workers(id, first_name, last_name, cin)`)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (filters.worker_id) query = query.eq('worker_id', filters.worker_id);
    if (filters.document_type) query = query.eq('document_type', filters.document_type);
    if (filters.expiring_within_days) {
      const now = new Date();
      const limit = new Date();
      limit.setDate(limit.getDate() + filters.expiring_within_days);
      query = query
        .gte('expiry_date', now.toISOString().slice(0, 10))
        .lte('expiry_date', limit.toISOString().slice(0, 10));
    }
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Worker document not found');
    return data;
  }

  async create(
    organizationId: string,
    userId: string | null,
    dto: CreateWorkerDocumentDto,
  ) {
    await this.assertWorkerInOrg(organizationId, dto.worker_id);
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_documents')
      .upsert(
        { organization_id: organizationId, created_by: userId, ...dto },
        { onConflict: 'worker_id,document_type' },
      )
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWorkerDocumentDto,
  ) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_documents')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Worker document not found');
    return data;
  }

  async verify(organizationId: string, userId: string | null, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('worker_documents')
      .update({
        is_verified: true,
        verified_by: userId,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Worker document not found');
    return data;
  }

  async remove(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('worker_documents')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  private async assertWorkerInOrg(organizationId: string, workerId: string) {
    const supabase = this.db.getAdminClient();
    const { data } = await supabase
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Worker not found in organization');
  }
}
