---
description: Scaffold a new NestJS API module with controller, service, DTOs, and module file
---

# Scaffold NestJS API Module

You are scaffolding a new API module for the AgriTech NestJS backend. The user will provide a feature name and description.

## Input: $ARGUMENTS

## Steps

### 1. Determine the module details
Parse the user's input to determine:
- **Module name** (kebab-case, e.g., `crop-treatments`)
- **Entity name** (PascalCase singular, e.g., `CropTreatment`)
- **Table name** (snake_case plural, e.g., `crop_treatments`)
- **Key fields** the entity needs (ask if not specified)
- **Which roles** should have access (default: organization_admin, farm_manager)
- **CASL subject name** (PascalCase, e.g., `CropTreatment`)

### 2. Create the module structure

Create files at `agritech-api/src/modules/{module-name}/`:

#### `dto/create-{module-name}.dto.ts`
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

export class Create{Entity}Dto {
  @ApiProperty()
  @IsUUID()
  organization_id: string;

  // Add fields based on user requirements
  // Always include @ApiProperty() or @ApiPropertyOptional()
  // Always include class-validator decorators
}
```

#### `dto/update-{module-name}.dto.ts`
```typescript
import { PartialType } from '@nestjs/swagger';
import { Create{Entity}Dto } from './create-{module-name}.dto';

export class Update{Entity}Dto extends PartialType(Create{Entity}Dto) {}
```

#### `dto/list-{module-name}.dto.ts`
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class List{Entity}QueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farm_id?: string;
}
```

#### `{module-name}.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { {Entity}Service } from './{module-name}.service';
import { Create{Entity}Dto } from './dto/create-{module-name}.dto';
import { Update{Entity}Dto } from './dto/update-{module-name}.dto';
import { List{Entity}QueryDto } from './dto/list-{module-name}.dto';

@ApiTags('{module-name}')
@Controller('{module-name}')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class {Entity}Controller {
  constructor(private readonly {camelCase}Service: {Entity}Service) {}

  @Get()
  @ApiOperation({ summary: 'List all {entity-plural}' })
  @CheckPolicies((ability) => ability.can(Action.Read, '{Entity}'))
  async findAll(@Request() req, @Query() query: List{Entity}QueryDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.{camelCase}Service.findAll(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get {entity} by ID' })
  @CheckPolicies((ability) => ability.can(Action.Read, '{Entity}'))
  async findOne(@Request() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.{camelCase}Service.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new {entity}' })
  @CheckPolicies((ability) => ability.can(Action.Create, '{Entity}'))
  async create(@Request() req, @Body() dto: Create{Entity}Dto) {
    const organizationId = req.headers['x-organization-id'];
    return this.{camelCase}Service.create(organizationId, req.user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update {entity}' })
  @CheckPolicies((ability) => ability.can(Action.Update, '{Entity}'))
  async update(@Request() req, @Param('id') id: string, @Body() dto: Update{Entity}Dto) {
    const organizationId = req.headers['x-organization-id'];
    return this.{camelCase}Service.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete {entity}' })
  @CheckPolicies((ability) => ability.can(Action.Delete, '{Entity}'))
  async remove(@Request() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.{camelCase}Service.remove(id, organizationId);
  }
}
```

#### `{module-name}.service.ts`
```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Create{Entity}Dto } from './dto/create-{module-name}.dto';
import { Update{Entity}Dto } from './dto/update-{module-name}.dto';
import { List{Entity}QueryDto } from './dto/list-{module-name}.dto';
import { paginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class {Entity}Service {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger({Entity}Service.name);

  constructor(private configService: ConfigService) {
    this.supabaseAdmin = createClient(
      this.configService.get('SUPABASE_URL'),
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  async findAll(organizationId: string, query: List{Entity}QueryDto) {
    const { page = 1, pageSize = 10 } = query;
    let qb = this.supabaseAdmin
      .from('{table_name}')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await qb;
    if (error) throw error;
    return paginatedResponse(data, count, page, pageSize);
  }

  async findOne(id: string, organizationId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('{table_name}')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new NotFoundException('{Entity} not found');
    return data;
  }

  async create(organizationId: string, userId: string, dto: Create{Entity}Dto) {
    const { data, error } = await this.supabaseAdmin
      .from('{table_name}')
      .insert({ ...dto, organization_id: organizationId, created_by: userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, organizationId: string, dto: Update{Entity}Dto) {
    const { data, error } = await this.supabaseAdmin
      .from('{table_name}')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string, organizationId: string) {
    const { error } = await this.supabaseAdmin
      .from('{table_name}')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
    return { success: true };
  }
}
```

#### `{module-name}.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { {Entity}Controller } from './{module-name}.controller';
import { {Entity}Service } from './{module-name}.service';

@Module({
  controllers: [{Entity}Controller],
  providers: [{Entity}Service],
  exports: [{Entity}Service],
})
export class {Entity}Module {}
```

### 3. Register the module
Add the new module to `agritech-api/src/app.module.ts` imports array.

### 4. Add CASL subject
Check `agritech-api/src/modules/casl/casl-ability.factory.ts` and add the new subject if needed.

### 5. Remind the user
After scaffolding, remind them to:
- Add the database table (use `/migrate` command)
- Add CASL permissions for appropriate roles
- Generate types: `cd project && npm run db:generate-types`
