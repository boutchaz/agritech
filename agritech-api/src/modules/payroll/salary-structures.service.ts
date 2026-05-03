import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateSalaryStructureDto,
  CreateStructureAssignmentDto,
  SalaryComponentDto,
  UpdateSalaryStructureDto,
} from './dto';

@Injectable()
export class SalaryStructuresService {
  constructor(private readonly db: DatabaseService) {}

  async list(organizationId: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('salary_structures')
      .select('*, components:salary_components(*)')
      .eq('organization_id', organizationId)
      .order('name');
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async getOne(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { data, error } = await supabase
      .from('salary_structures')
      .select('*, components:salary_components(*)')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Salary structure not found');
    return data;
  }

  async create(
    organizationId: string,
    userId: string | null,
    dto: CreateSalaryStructureDto,
  ) {
    const supabase = this.db.getAdminClient();
    const { components, ...rest } = dto;

    const { data: structure, error } = await supabase
      .from('salary_structures')
      .insert({ organization_id: organizationId, created_by: userId, ...rest })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    if (components && components.length > 0) {
      await this.insertComponents(structure.id, components);
    }
    return this.getOne(organizationId, structure.id);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateSalaryStructureDto,
  ) {
    const supabase = this.db.getAdminClient();
    const { components, ...rest } = dto;
    const { data, error } = await supabase
      .from('salary_structures')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Salary structure not found');

    if (components) await this.replaceComponents(id, components);
    return this.getOne(organizationId, id);
  }

  async remove(organizationId: string, id: string) {
    const supabase = this.db.getAdminClient();
    const { error } = await supabase
      .from('salary_structures')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  async replaceComponents(structureId: string, components: SalaryComponentDto[]) {
    const supabase = this.db.getAdminClient();
    const { error: delErr } = await supabase
      .from('salary_components')
      .delete()
      .eq('salary_structure_id', structureId);
    if (delErr) throw new BadRequestException(delErr.message);
    if (components.length > 0) {
      await this.insertComponents(structureId, components);
    }
    return this.list_components(structureId);
  }

  async list_components(structureId: string) {
    const supabase = this.db.getAdminClient();
    const { data } = await supabase
      .from('salary_components')
      .select('*')
      .eq('salary_structure_id', structureId)
      .order('sort_order', { ascending: true });
    return data ?? [];
  }

  private async insertComponents(structureId: string, components: SalaryComponentDto[]) {
    const supabase = this.db.getAdminClient();
    const rows = components.map((c, idx) => ({
      salary_structure_id: structureId,
      sort_order: c.sort_order ?? idx,
      ...c,
    }));
    const { error } = await supabase.from('salary_components').insert(rows);
    if (error) throw new BadRequestException(error.message);
  }

  // ── Assignments ────────────────────────────────────────────

  async listAssignments(organizationId: string, workerId?: string) {
    const supabase = this.db.getAdminClient();
    let query = supabase
      .from('salary_structure_assignments')
      .select(
        `*, worker:workers(id, first_name, last_name), structure:salary_structures(id, name)`,
      )
      .eq('organization_id', organizationId)
      .order('effective_from', { ascending: false });
    if (workerId) query = query.eq('worker_id', workerId);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  async createAssignment(
    organizationId: string,
    userId: string | null,
    dto: CreateStructureAssignmentDto,
  ) {
    const supabase = this.db.getAdminClient();

    // Validate cross-tenant references BEFORE writing. The bare insert at the
    // bottom only sets organization_id; without these checks a caller could
    // bind another org's worker (or salary structure) into this org's payroll.
    const [{ data: worker }, { data: structure }] = await Promise.all([
      supabase
        .from('workers')
        .select('id')
        .eq('id', dto.worker_id)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('salary_structures')
        .select('id')
        .eq('id', dto.salary_structure_id)
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);
    if (!worker) {
      throw new BadRequestException(`Worker ${dto.worker_id} does not belong to this organization`);
    }
    if (!structure) {
      throw new BadRequestException(`Salary structure ${dto.salary_structure_id} does not belong to this organization`);
    }

    // Close the previous assignment for this worker by setting effective_to.
    const { data: prev } = await supabase
      .from('salary_structure_assignments')
      .select('id, effective_to')
      .eq('organization_id', organizationId)
      .eq('worker_id', dto.worker_id)
      .is('effective_to', null)
      .lt('effective_from', dto.effective_from)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) {
      const closeDate = new Date(dto.effective_from);
      closeDate.setDate(closeDate.getDate() - 1);
      await supabase
        .from('salary_structure_assignments')
        .update({ effective_to: closeDate.toISOString().slice(0, 10) })
        .eq('id', prev.id)
        .eq('organization_id', organizationId);
    }

    const { data, error } = await supabase
      .from('salary_structure_assignments')
      .insert({ organization_id: organizationId, created_by: userId, ...dto })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
