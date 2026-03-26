import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, OPERATIONAL_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { CreateHarvestEventDto } from './dto/create-harvest-event.dto';

@Injectable()
export class HarvestEventsService {
  private readonly logger = new Logger(HarvestEventsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByCropCycle(cropCycleId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('harvest_events')
      .select('*')
      .eq('crop_cycle_id', cropCycleId)
      .order('harvest_number', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch harvest events: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async findOne(id: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('harvest_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch harvest event: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(createDto: CreateHarvestEventDto) {
    const client = this.databaseService.getAdminClient();

    // Auto-set harvest_number as next sequential number for this crop_cycle_id
    let harvestNumber = createDto.harvest_number;
    if (!harvestNumber) {
      const { count, error: countError } = await client
        .from('harvest_events')
        .select('*', { count: 'exact', head: true })
        .eq('crop_cycle_id', createDto.crop_cycle_id);

      if (countError) {
        this.logger.error(`Failed to count harvest events: ${countError.message}`);
        throw countError;
      }

      harvestNumber = (count || 0) + 1;
    }

    const { data, error } = await client
      .from('harvest_events')
      .insert({
        ...createDto,
        harvest_number: harvestNumber,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create harvest event: ${error.message}`);
      throw error;
    }

    // Notify operational roles about harvest event
    try {
      const quantity = createDto.quantity;
      const unit = createDto.quantity_unit || 'kg';
      // Resolve organization_id from the crop_cycle
      const { data: cycle } = await client
        .from('crop_cycles')
        .select('organization_id')
        .eq('id', createDto.crop_cycle_id)
        .single();
      if (cycle?.organization_id) {
        await this.notificationsService.createNotificationsForRoles(
          cycle.organization_id,
          OPERATIONAL_ROLES,
          null,
          NotificationType.HARVEST_EVENT_RECORDED,
          `🌾 Harvest recorded: ${quantity ? `${quantity} ${unit}` : 'New harvest event'}`,
          createDto.quality_notes || undefined,
          { harvestEventId: data.id, cropCycleId: createDto.crop_cycle_id, quantity, unit },
        );
      }
    } catch (notifError) {
      this.logger.warn(`Failed to send harvest event notification: ${notifError}`);
    }

    return data;
  }

  async update(id: string, updateDto: Partial<CreateHarvestEventDto>) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Harvest event not found');
    }

    const { data, error } = await client
      .from('harvest_events')
      .update(updateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update harvest event: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Harvest event not found');
    }

    const { error } = await client
      .from('harvest_events')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete harvest event: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async getStatsByCropCycle(cropCycleId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('harvest_events')
      .select('quantity, harvest_date')
      .eq('crop_cycle_id', cropCycleId);

    if (error) {
      this.logger.error(`Failed to fetch harvest event stats: ${error.message}`);
      throw error;
    }

    const events = data || [];
    const totalHarvests = events.length;
    const quantities = events
      .map((e) => e.quantity)
      .filter((q): q is number => q !== null && q !== undefined);

    const totalQuantity = quantities.reduce((sum, q) => sum + q, 0);
    const averageQuantity = quantities.length > 0 ? totalQuantity / quantities.length : 0;

    const harvestDates = events
      .map((e) => e.harvest_date)
      .filter((d): d is string => d !== null && d !== undefined);

    const lastHarvestDate = harvestDates.length > 0
      ? harvestDates.sort().reverse()[0]
      : null;

    return {
      total_harvests: totalHarvests,
      total_quantity: totalQuantity,
      average_quantity: averageQuantity,
      last_harvest_date: lastHarvestDate,
    };
  }
}
