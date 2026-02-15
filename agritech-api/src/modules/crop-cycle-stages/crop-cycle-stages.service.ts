import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCropCycleStageDto, CropCycleStageStatus } from './dto/create-crop-cycle-stage.dto';

interface TemplateStage {
  name: string;
  order: number;
  duration_days: number;
}

@Injectable()
export class CropCycleStagesService {
  private readonly logger = new Logger(CropCycleStagesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findByCropCycle(cropCycleId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('crop_cycle_stages')
      .select('*')
      .eq('crop_cycle_id', cropCycleId)
      .order('stage_order', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch crop cycle stages: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async findOne(id: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('crop_cycle_stages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch crop cycle stage: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(createDto: CreateCropCycleStageDto) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('crop_cycle_stages')
      .insert({
        ...createDto,
        status: createDto.status || CropCycleStageStatus.PENDING,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create crop cycle stage: ${error.message}`);
      throw error;
    }

    return data;
  }

  async createBulk(cropCycleId: string, stages: CreateCropCycleStageDto[]) {
    const client = this.databaseService.getAdminClient();

    const rows = stages.map((stage) => ({
      ...stage,
      crop_cycle_id: cropCycleId,
      status: stage.status || CropCycleStageStatus.PENDING,
    }));

    const { data, error } = await client
      .from('crop_cycle_stages')
      .insert(rows)
      .select();

    if (error) {
      this.logger.error(`Failed to create crop cycle stages in bulk: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async update(id: string, updateDto: Partial<CreateCropCycleStageDto>) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Crop cycle stage not found');
    }

    const { data, error } = await client
      .from('crop_cycle_stages')
      .update(updateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update crop cycle stage: ${error.message}`);
      throw error;
    }

    return data;
  }

  async updateStatus(id: string, status: string) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Crop cycle stage not found');
    }

    const { data, error } = await client
      .from('crop_cycle_stages')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update crop cycle stage status: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(id: string) {
    const client = this.databaseService.getAdminClient();

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Crop cycle stage not found');
    }

    const { error } = await client
      .from('crop_cycle_stages')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete crop cycle stage: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async generateFromTemplate(
    cropCycleId: string,
    templateStages: TemplateStage[],
    plantingDate: string,
  ) {
    const stages: CreateCropCycleStageDto[] = [];
    let currentDate = new Date(plantingDate);

    for (const templateStage of templateStages) {
      const expectedStartDate = new Date(currentDate);
      const expectedEndDate = new Date(currentDate);
      expectedEndDate.setDate(expectedEndDate.getDate() + templateStage.duration_days);

      stages.push({
        crop_cycle_id: cropCycleId,
        stage_name: templateStage.name,
        stage_order: templateStage.order,
        expected_start_date: expectedStartDate.toISOString().split('T')[0],
        expected_end_date: expectedEndDate.toISOString().split('T')[0],
        status: CropCycleStageStatus.PENDING,
      });

      currentDate = expectedEndDate;
    }

    return this.createBulk(cropCycleId, stages);
  }
}
