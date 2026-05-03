import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly accountingAutomationService: AccountingAutomationService,
  ) {}

  private async verifyOrgAccess(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  // ── Equipment CRUD ──

  async findAll(userId: string, organizationId: string, filters?: { farm_id?: string; category?: string; status?: string }) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('equipment_assets')
      .select(`
        *,
        farm:farms(id, name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('name');

    if (error) {
      this.logger.error(`Failed to fetch equipment: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch equipment');
    }

    return data || [];
  }

  async findOne(userId: string, organizationId: string, equipmentId: string) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('equipment_assets')
      .select(`
        *,
        farm:farms(id, name)
      `)
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch equipment: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch equipment');
    }

    if (!data) {
      throw new NotFoundException('Equipment not found');
    }

    return data;
  }

  async create(userId: string, organizationId: string, createDto: CreateEquipmentDto) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    if (createDto.farm_id) {
      const { data: farm, error: farmError } = await client
        .from('farms')
        .select('id')
        .eq('id', createDto.farm_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (farmError || !farm) {
        throw new ForbiddenException('Farm does not belong to this organization');
      }
    }

    const { data, error } = await client
      .from('equipment_assets')
      .insert({
        ...createDto,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        farm:farms(id, name)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to create equipment: ${error.message}`);
      throw new InternalServerErrorException('Failed to create equipment');
    }

    return data;
  }

  async update(userId: string, organizationId: string, equipmentId: string, updateDto: UpdateEquipmentDto) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: existing, error: existingError } = await client
      .from('equipment_assets')
      .select('id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError || !existing) {
      throw new NotFoundException('Equipment not found');
    }

    if (updateDto.farm_id) {
      const { data: farm, error: farmError } = await client
        .from('farms')
        .select('id')
        .eq('id', updateDto.farm_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (farmError || !farm) {
        throw new ForbiddenException('Farm does not belong to this organization');
      }
    }

    const { data, error } = await client
      .from('equipment_assets')
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        farm:farms(id, name)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to update equipment: ${error.message}`);
      throw new InternalServerErrorException('Failed to update equipment');
    }

    return data;
  }

  async remove(userId: string, organizationId: string, equipmentId: string) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: existing, error: existingError } = await client
      .from('equipment_assets')
      .select('id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError || !existing) {
      throw new NotFoundException('Equipment not found');
    }

    const { error: deleteError } = await client
      .from('equipment_assets')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      this.logger.error(`Failed to delete equipment: ${deleteError.message}`);
      throw new InternalServerErrorException('Failed to delete equipment');
    }

    return { message: 'Equipment deleted successfully' };
  }

  // ── Maintenance CRUD ──

  async findAllMaintenance(userId: string, organizationId: string, equipmentId: string) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: equipment } = await client
      .from('equipment_assets')
      .select('id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    const { data, error } = await client
      .from('equipment_maintenance')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('maintenance_date', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch maintenance records: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch maintenance records');
    }

    return data || [];
  }

  async createMaintenance(userId: string, organizationId: string, equipmentId: string, createDto: CreateMaintenanceDto) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: equipment, error: equipError } = await client
      .from('equipment_assets')
      .select('id, name, farm_id')
      .eq('id', equipmentId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (equipError || !equipment) {
      throw new NotFoundException('Equipment not found');
    }

    const { data, error } = await client
      .from('equipment_maintenance')
      .insert({
        ...createDto,
        equipment_id: equipmentId,
        organization_id: organizationId,
        performed_by_user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to create maintenance record: ${error.message}`);
      throw new InternalServerErrorException('Failed to create maintenance record');
    }

    if (createDto.cost > 0) {
      try {
        const journalEntry = await this.accountingAutomationService.createJournalEntryFromMaintenance(
          organizationId,
          data.id,
          createDto.cost,
          new Date(createDto.maintenance_date),
          createDto.description || `Maintenance: ${createDto.type} - ${equipment.name}`,
          userId,
          equipment.name,
          createDto.type,
          createDto.cost_center_id,
          equipment.farm_id,
        );

        const { error: linkError } = await client
          .from('equipment_maintenance')
          .update({ journal_entry_id: journalEntry.id })
          .eq('id', data.id);

        if (linkError) {
          throw new Error(`Failed to link journal entry to maintenance: ${linkError.message}`);
        }
      } catch (jeError: any) {
        this.logger.error(`Failed to create/link journal entry for maintenance: ${jeError?.message}. Compensating: deleting maintenance row ${data.id}.`);
        const { error: cleanupError } = await client
          .from('equipment_maintenance')
          .delete()
          .eq('id', data.id)
          .eq('organization_id', organizationId);
        if (cleanupError) {
          this.logger.error(`Compensating delete failed for maintenance ${data.id}: ${cleanupError.message}. Row is orphaned.`);
        }
        throw new BadRequestException(`Failed to create journal entry: ${jeError?.message}`);
      }
    }

    return data;
  }

  async updateMaintenance(userId: string, organizationId: string, maintenanceId: string, updateDto: UpdateMaintenanceDto) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: existing, error: existingError } = await client
      .from('equipment_maintenance')
      .select('id, equipment_id, cost, maintenance_date, type, description, cost_center_id, journal_entry_id')
      .eq('id', maintenanceId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError || !existing) {
      throw new NotFoundException('Maintenance record not found');
    }

    const { data, error } = await client
      .from('equipment_maintenance')
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', maintenanceId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to update maintenance record: ${error.message}`);
      throw new InternalServerErrorException('Failed to update maintenance record');
    }

    // If any accounting-relevant field changed, reverse the prior JE and post a fresh one.
    const accountingFieldChanged =
      (updateDto.cost !== undefined && Number(updateDto.cost) !== Number(existing.cost ?? 0)) ||
      (updateDto.maintenance_date !== undefined && updateDto.maintenance_date !== existing.maintenance_date) ||
      (updateDto.cost_center_id !== undefined && updateDto.cost_center_id !== existing.cost_center_id) ||
      (updateDto.type !== undefined && updateDto.type !== existing.type) ||
      (updateDto.description !== undefined && updateDto.description !== existing.description);

    if (accountingFieldChanged) {
      // Reverse existing JE if any
      if (existing.journal_entry_id) {
        try {
          await this.accountingAutomationService.createReversalEntry(
            organizationId,
            existing.journal_entry_id,
            userId,
            `Maintenance record updated: ${maintenanceId}`,
          );
          await client
            .from('equipment_maintenance')
            .update({ journal_entry_id: null })
            .eq('id', maintenanceId);
        } catch (reversalError: any) {
          this.logger.error(`Failed to reverse JE for maintenance ${maintenanceId}: ${reversalError?.message}`);
          throw new BadRequestException(`Failed to reverse prior journal entry: ${reversalError?.message}`);
        }
      }

      // Post fresh JE if new cost > 0
      const newCost = Number(data.cost ?? 0);
      if (newCost > 0) {
        const { data: equipment } = await client
          .from('equipment_assets')
          .select('name, farm_id')
          .eq('id', data.equipment_id)
          .maybeSingle();

        try {
          const journalEntry = await this.accountingAutomationService.createJournalEntryFromMaintenance(
            organizationId,
            data.id,
            newCost,
            new Date(data.maintenance_date),
            data.description || `Maintenance: ${data.type} - ${equipment?.name ?? ''}`,
            userId,
            equipment?.name ?? '',
            data.type,
            data.cost_center_id,
            equipment?.farm_id,
          );

          await client
            .from('equipment_maintenance')
            .update({ journal_entry_id: journalEntry.id })
            .eq('id', maintenanceId);
        } catch (jeError: any) {
          this.logger.error(`Failed to create JE on maintenance update ${maintenanceId}: ${jeError?.message}`);
          throw new BadRequestException(`Failed to create journal entry: ${jeError?.message}`);
        }
      }
    }

    return data;
  }

  async removeMaintenance(userId: string, organizationId: string, maintenanceId: string) {
    await this.verifyOrgAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: existing, error: existingError } = await client
      .from('equipment_maintenance')
      .select('id, journal_entry_id')
      .eq('id', maintenanceId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError || !existing) {
      throw new NotFoundException('Maintenance record not found');
    }

    if (existing.journal_entry_id) {
      try {
        await this.accountingAutomationService.createReversalEntry(
          organizationId,
          existing.journal_entry_id,
          userId,
          `Maintenance record deleted: ${maintenanceId}`,
        );
      } catch (reversalError: any) {
        this.logger.error(`Failed to reverse journal entry for maintenance: ${reversalError?.message}`);
        throw new BadRequestException(`Failed to reverse journal entry: ${reversalError?.message}`);
      }
    }

    const { error: deleteError } = await client
      .from('equipment_maintenance')
      .update({
        is_active: false,
        journal_entry_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', maintenanceId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      this.logger.error(`Failed to delete maintenance record: ${deleteError.message}`);
      throw new InternalServerErrorException('Failed to delete maintenance record');
    }

    return { message: 'Maintenance record deleted successfully' };
  }
}
