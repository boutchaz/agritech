import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateItemGroupDto, UpdateItemGroupDto } from './dto/create-item-group.dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(private readonly databaseService: DatabaseService) { }

  // =====================================================
  // ITEM GROUPS
  // =====================================================

  async findAllItemGroups(organizationId: string, filters?: any): Promise<PaginatedResponse<any>> {
    const supabase = this.databaseService.getAdminClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    const applyFilters = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (filters?.parent_group_id !== undefined) {
        q = filters.parent_group_id === null
          ? q.is('parent_group_id', null)
          : q.eq('parent_group_id', filters.parent_group_id);
      }
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
      if (filters?.search) { const s = sanitizeSearch(filters.search); if (s) q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%,description.ilike.%${s}%`); }
      return q;
    };

    const { count } = await applyFilters(
      supabase.from('item_groups').select('id', { count: 'exact', head: true })
    );

    const from = (page - 1) * pageSize;
    let query = applyFilters(supabase.from('item_groups').select('*'));
    query = query.order('sort_order', { ascending: true }).order('name', { ascending: true }).range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch item groups: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item groups: ${error.message}`);
    }

    return paginatedResponse(data || [], count || 0, page, pageSize);
  }

  async findOneItemGroup(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_groups')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch item group: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item group: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Item group not found');
    }

    return data;
  }

  async createItemGroup(dto: CreateItemGroupDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_groups')
      .insert({
        ...dto,
        updated_by: dto.created_by,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create item group: ${error.message}`);
      throw new BadRequestException(`Failed to create item group: ${error.message}`);
    }

    return data;
  }

  async updateItemGroup(id: string, organizationId: string, userId: string, dto: UpdateItemGroupDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_groups')
      .update({
        ...dto,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update item group: ${error.message}`);
      throw new BadRequestException(`Failed to update item group: ${error.message}`);
    }

    return data;
  }

  async deleteItemGroup(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Check if group (or any descendant) has items attached
    const allIds = await this.collectGroupIds(supabase, id, organizationId);
    const { data: linkedItems } = await supabase
      .from('items')
      .select('id')
      .in('item_group_id', allIds)
      .limit(1);

    if (linkedItems && linkedItems.length > 0) {
      throw new BadRequestException('Cannot delete item group with items. Please move or delete items first.');
    }

    // Delete all descendants bottom-up, then the group itself
    await this.deleteGroupCascade(supabase, id, organizationId);

    return { message: 'Item group deleted successfully' };
  }

  private async collectGroupIds(supabase: any, parentId: string, organizationId: string): Promise<string[]> {
    const ids: string[] = [parentId];
    const { data: children } = await supabase
      .from('item_groups')
      .select('id')
      .eq('parent_group_id', parentId)
      .eq('organization_id', organizationId);

    for (const child of children || []) {
      const childIds = await this.collectGroupIds(supabase, child.id, organizationId);
      ids.push(...childIds);
    }
    return ids;
  }

  private async deleteGroupCascade(supabase: any, id: string, organizationId: string): Promise<void> {
    const { data: children } = await supabase
      .from('item_groups')
      .select('id')
      .eq('parent_group_id', id)
      .eq('organization_id', organizationId);

    for (const child of children || []) {
      await this.deleteGroupCascade(supabase, child.id, organizationId);
    }

    const { error } = await supabase
      .from('item_groups')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete item group ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to delete item group: ${error.message}`);
    }
  }

  async seedPredefinedItemGroups(organizationId: string, userId: string): Promise<{ created: number; skipped: number }> {
    const supabase = this.databaseService.getAdminClient();

    type PredefinedSub = { name: string; code: string; description: string };
    type PredefinedGroup = { name: string; code: string; description: string; subcategories: PredefinedSub[] };

    const PREDEFINED_GROUPS: PredefinedGroup[] = [
      {
        name: 'Intrants agricoles',
        code: 'INTRANTS',
        description: 'Engrais, amendements et biostimulants pour la fertilisation des cultures',
        subcategories: [
          { name: 'Engrais solides', code: 'INTRANTS-ENGR-SOL', description: 'Engrais granulés, poudres et cristallins' },
          { name: 'Engrais liquides', code: 'INTRANTS-ENGR-LIQ', description: 'Solutions fertilisantes et engrais foliaires' },
          { name: 'Amendements organiques', code: 'INTRANTS-AMEND-ORG', description: 'Compost, fumier, tourbe et matières organiques' },
          { name: 'Amendements minéraux', code: 'INTRANTS-AMEND-MIN', description: 'Chaux, gypse et correcteurs de pH' },
          { name: 'Biostimulants', code: 'INTRANTS-BIOSTIM', description: 'Extraits d\'algues, acides aminés et micro-organismes bénéfiques' },
          { name: 'Correcteurs de carences', code: 'INTRANTS-CARENCES', description: 'Oligo-éléments et micronutriments (fer, zinc, bore…)' },
          { name: 'Acides humiques / fulviques', code: 'INTRANTS-HUMIQUE', description: 'Amendements à base d\'acides humiques et fulviques' },
        ],
      },
      {
        name: 'Produits phytosanitaires',
        code: 'PHYTO',
        description: 'Produits de protection des plantes contre les ravageurs et maladies',
        subcategories: [
          { name: 'Insecticides', code: 'PHYTO-INSECT', description: 'Lutte contre les insectes ravageurs' },
          { name: 'Fongicides', code: 'PHYTO-FONGI', description: 'Traitement et prévention des maladies fongiques' },
          { name: 'Herbicides', code: 'PHYTO-HERBI', description: 'Désherbage chimique sélectif et total' },
          { name: 'Acaricides', code: 'PHYTO-ACARI', description: 'Traitement contre les acariens et tétranyques' },
          { name: 'Nématicides', code: 'PHYTO-NEMAT', description: 'Lutte contre les nématodes parasites des racines' },
          { name: 'Produits biologiques (biocontrôle)', code: 'PHYTO-BIO', description: 'Solutions naturelles à base d\'organismes vivants ou extraits végétaux' },
          { name: 'Adjuvants / mouillants', code: 'PHYTO-ADJUV', description: 'Agents améliorant l\'efficacité des traitements phytosanitaires' },
        ],
      },
      {
        name: 'Irrigation',
        code: 'IRR',
        description: 'Matériel et équipements pour les systèmes d\'irrigation agricole',
        subcategories: [
          { name: 'Tuyaux et gaines', code: 'IRR-TUYAUX', description: 'Conduites principales, rampes et micro-tubes' },
          { name: 'Goutteurs', code: 'IRR-GOUTTEURS', description: 'Goutteurs intégrés, en ligne et boutons pousseurs' },
          { name: 'Vannes', code: 'IRR-VANNES', description: 'Vannes manuelles, électrovannes et vannes de secteur' },
          { name: 'Filtres', code: 'IRR-FILTRES', description: 'Filtres à tamis, à disques et à sable' },
          { name: 'Pompes', code: 'IRR-POMPES', description: 'Pompes de surface, immergées et surpresseurs' },
          { name: 'Programmateurs', code: 'IRR-PROGRAM', description: 'Contrôleurs d\'irrigation, minuteries et automatismes' },
          { name: 'Accessoires irrigation', code: 'IRR-ACCESS', description: 'Raccords, bouchons, piquets et supports divers' },
        ],
      },
      {
        name: 'Matériel agricole',
        code: 'MATER',
        description: 'Outils, engins et équipements pour le travail agricole',
        subcategories: [
          { name: 'Outils manuels', code: 'MATER-MANUELS', description: 'Pioches, houes, sécateurs, scies et outillage à main' },
          { name: 'Matériel motorisé', code: 'MATER-MOTEUR', description: 'Motoculteurs, tondeuses et équipements à moteur' },
          { name: 'Pulvérisateurs', code: 'MATER-PULV', description: 'Pulvérisateurs à dos, sur roues et tractés' },
          { name: 'Équipements de fertilisation', code: 'MATER-FERTIL', description: 'Épandeurs, injecteurs et matériel de fertigation' },
          { name: 'Pièces de rechange', code: 'MATER-PIECES', description: 'Pièces détachées et consommables pour engins agricoles' },
        ],
      },
      {
        name: 'Plantation & pépinière',
        code: 'PLANT',
        description: 'Matériel végétal et fournitures pour la plantation et la pépinière',
        subcategories: [
          { name: 'Plants / arbres', code: 'PLANT-PLANTS', description: 'Jeunes plants, greffons et arbres fruitiers' },
          { name: 'Porte-greffes', code: 'PLANT-PORTEGREFFES', description: 'Sujets porte-greffes pour arbres fruitiers' },
          { name: 'Tuteurs', code: 'PLANT-TUTEURS', description: 'Piquets, tuteurs bambou et supports de formation' },
          { name: 'Protections plants', code: 'PLANT-PROTECT', description: 'Gaines, manchons et protège-plants' },
          { name: 'Substrats', code: 'PLANT-SUBSTRATS', description: 'Terreau, perlite, vermiculite et mélanges horticoles' },
        ],
      },
      {
        name: 'Récolte',
        code: 'RECOLTE',
        description: 'Équipements et contenants pour la récolte et la manutention des produits',
        subcategories: [
          { name: 'Filets de récolte', code: 'RECOLTE-FILETS', description: 'Filets de sol pour olives, amandes et autres fruits' },
          { name: 'Caisses / palox', code: 'RECOLTE-CAISSES', description: 'Caisses plastiques et palox bois pour le transport' },
          { name: 'Peignes électriques', code: 'RECOLTE-PEIGNES', description: 'Vibreurs et peignes électriques pour la cueillette' },
          { name: 'Bâches', code: 'RECOLTE-BACHES', description: 'Bâches de protection et de collecte au sol' },
          { name: 'Sacs', code: 'RECOLTE-SACS', description: 'Sacs de récolte, sacs big-bag et contenants vrac' },
        ],
      },
      {
        name: 'Conditionnement & stockage',
        code: 'COND',
        description: 'Emballages et produits pour le conditionnement et la conservation',
        subcategories: [
          { name: 'Emballages', code: 'COND-EMBALL', description: 'Boîtes, plateaux, cagettes et films d\'emballage' },
          { name: 'Bidons / cuves', code: 'COND-BIDONS', description: 'Bidons de stockage, jerricans et cuves IBC' },
          { name: 'Étiquettes', code: 'COND-ETIQ', description: 'Étiquettes produits, autocollants et codes-barres' },
          { name: 'Produits de conservation', code: 'COND-CONSERV', description: 'Cires, antifongiques de post-récolte et traitements conservation' },
        ],
      },
      {
        name: 'Carburants & énergie',
        code: 'CARBU',
        description: 'Carburants, lubrifiants et sources d\'énergie pour les équipements agricoles',
        subcategories: [
          { name: 'Gasoil', code: 'CARBU-GASOIL', description: 'Gazole et diesel pour tracteurs et engins agricoles' },
          { name: 'Essence', code: 'CARBU-ESSENCE', description: 'Essence sans plomb pour petits moteurs' },
          { name: 'Lubrifiants', code: 'CARBU-LUBRI', description: 'Huiles moteur, graisses et fluides hydrauliques' },
          { name: 'Batteries', code: 'CARBU-BATT', description: 'Batteries pour véhicules, engins et équipements électriques' },
        ],
      },
      {
        name: 'Entretien & maintenance',
        code: 'MAINT',
        description: 'Produits et fournitures pour l\'entretien du matériel et des infrastructures',
        subcategories: [
          { name: 'Produits de nettoyage', code: 'MAINT-NETTOY', description: 'Désinfectants, détergents et produits d\'hygiène' },
          { name: "Pièces d'usure", code: 'MAINT-USURE', description: 'Courroies, filtres, joints et pièces d\'usure courante' },
          { name: 'Consommables atelier', code: 'MAINT-ATEL', description: 'Visserie, boulonnerie, fils et consommables divers' },
        ],
      },
      {
        name: 'Équipements de protection (EPI)',
        code: 'EPI',
        description: 'Équipements de protection individuelle pour les travailleurs agricoles',
        subcategories: [
          { name: 'Gants', code: 'EPI-GANTS', description: 'Gants de travail, anti-coupures et protection chimique' },
          { name: 'Masques', code: 'EPI-MASQUES', description: 'Masques FFP, demi-masques et respirateurs' },
          { name: 'Lunettes', code: 'EPI-LUNETTES', description: 'Lunettes de protection et écrans faciaux' },
          { name: 'Combinaisons', code: 'EPI-COMBI', description: 'Combinaisons de protection chimique et vêtements de travail' },
          { name: 'Bottes', code: 'EPI-BOTTES', description: 'Bottes de sécurité et chaussures de protection' },
        ],
      },
      {
        name: 'Divers / consommables',
        code: 'DIVERS',
        description: 'Articles non classés et fournitures diverses d\'usage général',
        subcategories: [
          { name: 'Fournitures diverses', code: 'DIVERS-FOURN', description: 'Articles de bureau, papeterie et fournitures générales' },
          { name: 'Petits équipements', code: 'DIVERS-EQUIP', description: 'Petits appareils et équipements non catégorisés' },
          { name: 'Articles non classés', code: 'DIVERS-NC', description: 'Articles en attente de classification' },
        ],
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const group of PREDEFINED_GROUPS) {
      // Check if parent group already exists
      const { data: existing } = await supabase
        .from('item_groups')
        .select('id, code')
        .eq('organization_id', organizationId)
        .eq('name', group.name)
        .is('parent_group_id', null)
        .maybeSingle();

      let parentId: string;

      if (existing) {
        parentId = existing.id;
        // Patch code/description if missing
        if (!existing.code) {
          await supabase
            .from('item_groups')
            .update({ code: group.code, description: group.description, updated_by: userId })
            .eq('id', parentId);
        }
        skipped++;
      } else {
        const { data: created_group, error } = await supabase
          .from('item_groups')
          .insert({
            organization_id: organizationId,
            name: group.name,
            code: group.code,
            description: group.description,
            is_active: true,
            created_by: userId,
            updated_by: userId,
          })
          .select('id')
          .single();

        if (error) {
          this.logger.error(`Failed to create group "${group.name}": ${error.message}`);
          continue;
        }

        parentId = created_group.id;
        created++;
      }

      // Create or update subcategories
      for (const sub of group.subcategories) {
        const { data: existingSub } = await supabase
          .from('item_groups')
          .select('id, code')
          .eq('organization_id', organizationId)
          .eq('name', sub.name)
          .eq('parent_group_id', parentId)
          .maybeSingle();

        if (existingSub) {
          // Patch code/description if missing
          if (!existingSub.code) {
            await supabase
              .from('item_groups')
              .update({ code: sub.code, description: sub.description, updated_by: userId })
              .eq('id', existingSub.id);
          }
          skipped++;
        } else {
          const { error: subError } = await supabase.from('item_groups').insert({
            organization_id: organizationId,
            name: sub.name,
            code: sub.code,
            description: sub.description,
            parent_group_id: parentId,
            is_active: true,
            created_by: userId,
            updated_by: userId,
          });

          if (subError) {
            this.logger.error(`Failed to create subcategory "${sub.name}": ${subError.message}`);
          } else {
            created++;
          }
        }
      }
    }

    return { created, skipped };
  }

  // =====================================================
  // ITEMS
  // =====================================================

  async findAllItems(organizationId: string, filters?: any): Promise<PaginatedResponse<any>> {
    const supabase = this.databaseService.getAdminClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 100;

    const applyFilters = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (filters?.item_group_id) q = q.eq('item_group_id', filters.item_group_id);
      if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
      if (filters?.is_sales_item !== undefined) q = q.eq('is_sales_item', filters.is_sales_item);
      if (filters?.is_purchase_item !== undefined) q = q.eq('is_purchase_item', filters.is_purchase_item);
      if (filters?.is_stock_item !== undefined) q = q.eq('is_stock_item', filters.is_stock_item);
      if (filters?.crop_type) q = q.eq('crop_type', filters.crop_type);
      if (filters?.variety) q = q.eq('variety', filters.variety);
      if (filters?.search) { const s = sanitizeSearch(filters.search); if (s) q = q.or(`item_code.ilike.%${s}%,item_name.ilike.%${s}%,barcode.ilike.%${s}%`); }
      return q;
    };

    const { count } = await applyFilters(
      supabase.from('items').select('id', { count: 'exact', head: true })
    );

    const from = (page - 1) * pageSize;
    let query = applyFilters(supabase.from('items').select(`*, item_group:item_groups(id, name, code, path)`));
    query = query.order('item_code', { ascending: true }).range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch items: ${error.message}`);
      throw new BadRequestException(`Failed to fetch items: ${error.message}`);
    }

    return paginatedResponse(data || [], count || 0, page, pageSize);
  }

  // =====================================================
  // PRODUCT VARIANTS
  // =====================================================

  async findItemVariants(organizationId: string, itemId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .order('variant_name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch product variants: ${error.message}`);
      throw new BadRequestException(`Failed to fetch product variants: ${error.message}`);
    }

    return data;
  }

  async createItemVariant(dto: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('product_variants')
      .insert(dto)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create product variant: ${error.message}`);
      throw new BadRequestException(`Failed to create product variant: ${error.message}`);
    }

    return data;
  }

  async updateItemVariant(id: string, organizationId: string, userId: string, dto: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('product_variants')
      .update(dto)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        throw new NotFoundException('Product variant not found');
      }
      this.logger.error(`Failed to update product variant: ${error.message}`);
      throw new BadRequestException(`Failed to update product variant: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Product variant not found');
    }

    return data;
  }

  async deleteItemVariant(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete product variant: ${error.message}`);
      throw new BadRequestException(`Failed to delete product variant: ${error.message}`);
    }

    return { message: 'Product variant deleted successfully' };
  }

  async findOneItem(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        item_group:item_groups(*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch item: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item: ${error.message}`);
    }

    return data;
  }

  private async generateItemCode(
    organizationId: string,
    itemGroupId: string | null,
    prefix: string = 'ITM'
  ): Promise<string> {
    const supabase = this.databaseService.getAdminClient();
    const year = new Date().getFullYear().toString();

    try {
      let query = supabase
        .from('items')
        .select('item_code')
        .eq('organization_id', organizationId)
        .like('item_code', `%-${year}-%`);

      if (itemGroupId) {
        query = query.eq('item_group_id', itemGroupId);
      }

      const { data: items, error } = await query;

      if (error) {
        this.logger.error(`Failed to query items for code generation: ${error.message}`);
        throw new BadRequestException(`Failed to generate item code: ${error.message}`);
      }

      let maxSeq = 0;
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.item_code) {
            const parts = item.item_code.split('-');
            if (parts.length >= 3) {
              const seq = parseInt(parts[2], 10);
              if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
              }
            }
          }
        }
      }

      const nextSeq = maxSeq + 1;
      return `${prefix}-${year}-${nextSeq.toString().padStart(5, '0')}`;
    } catch (error) {
      this.logger.error(`Item code generation error: ${error.message}`);
      throw error;
    }
  }

  async createItem(dto: CreateItemDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const dtoExt = dto as CreateItemDto & { is_inventory_item?: boolean };
    const { is_inventory_item, ...dtoForInsert } = dtoExt;

    // Generate item code if not provided
    let itemCode = dto.item_code;
    if (!itemCode) {
      itemCode = await this.generateItemCode(
        dto.organization_id,
        dto.item_group_id || null,
        'ITM'
      );
    }

    // Prepare item data with explicit defaults for boolean fields
    const itemData = {
      ...dtoForInsert,
      item_code: itemCode,
      stock_uom: dto.stock_uom || dto.default_unit,
      updated_by: dto.created_by,
      is_active: dto.is_active ?? true,
      is_sales_item: dto.is_sales_item ?? false,
      is_purchase_item: dto.is_purchase_item ?? false,
      is_stock_item:
        dto.is_stock_item ??
        (is_inventory_item !== undefined ? is_inventory_item : true),
    };

    this.logger.debug(`Creating item with data: ${JSON.stringify(itemData)}`);

    const { data, error } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create item: ${error.message}`);
      throw new BadRequestException(`Failed to create item: ${error.message}`);
    }

    this.logger.debug(`Created item: ${JSON.stringify(data)}`);

    return data;
  }

  async updateItem(id: string, organizationId: string, userId: string, dto: UpdateItemDto): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('items')
      .update({
        ...dto,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update item: ${error.message}`);
      throw new BadRequestException(`Failed to update item: ${error.message}`);
    }

    return data;
  }

  async deleteItem(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Check if item is used in stock entries
    const { data: stockEntries } = await supabase
      .from('stock_entry_items')
      .select('id')
      .eq('item_id', id)
      .limit(1);

    if (stockEntries && stockEntries.length > 0) {
      throw new BadRequestException('Cannot delete item used in stock transactions. Please deactivate it instead.');
    }

    // Check if item is used in invoices
    const { data: invoices } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('item_id', id)
      .limit(1);

    if (invoices && invoices.length > 0) {
      throw new BadRequestException('Cannot delete item used in invoices. Please deactivate it instead.');
    }

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete item: ${error.message}`);
      throw new BadRequestException(`Failed to delete item: ${error.message}`);
    }

    return { message: 'Item deleted successfully' };
  }

  // =====================================================
  // ITEM SELECTION (Lightweight for dropdowns)
  // =====================================================

  async getItemsForSelection(organizationId: string, filters?: any): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('items')
      .select(`
        id,
        item_code,
        item_name,
        default_unit,
        standard_rate,
        item_group:item_groups(id, name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('item_name', { ascending: true });

    if (filters?.is_sales_item) {
      query = query.eq('is_sales_item', true);
    }

    if (filters?.is_purchase_item) {
      query = query.eq('is_purchase_item', true);
    }

    if (filters?.is_stock_item) {
      query = query.eq('is_stock_item', true);
    }

    if (filters?.search) {
      const s = sanitizeSearch(filters.search);
      if (s) query = query.or(`item_code.ilike.%${s}%,item_name.ilike.%${s}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch items for selection: ${error.message}`);
      throw new BadRequestException(`Failed to fetch items for selection: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // STOCK LEVELS & FARM INTEGRATION
  // =====================================================

  /**
   * Get stock levels grouped by farm with warehouse relationships
   */
  async getFarmStockLevels(
    organizationId: string,
    filters?: {
      farm_id?: string;
      item_id?: string;
      low_stock_only?: boolean;
    },
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // First, get warehouse IDs for the farm if filtering by farm
    let warehouseIds: string[] | null = null;
    if (filters?.farm_id) {
      const { data: warehouses, error: whError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('farm_id', filters.farm_id)
        .eq('is_active', true);

      if (whError) {
        this.logger.error(`Failed to fetch warehouses: ${whError.message}`);
        throw new BadRequestException(`Failed to fetch warehouses: ${whError.message}`);
      }

      warehouseIds = warehouses?.map((w) => w.id) || [];
      if (warehouseIds.length === 0) {
        return []; // No warehouses for this farm
      }
    }

    let stockQuery = supabase
      .from('stock_valuation')
      .select(`
        item_id,
        warehouse_id,
        remaining_quantity,
        total_cost,
        warehouse:warehouses!inner(
          id,
          name,
          farm_id,
          farm:farms(id, name)
        ),
        item:items!inner(
          id,
          item_code,
          item_name,
          default_unit,
          minimum_stock_level
        )
      `)
      .eq('organization_id', organizationId)
      .gt('remaining_quantity', 0);

    if (warehouseIds) {
      stockQuery = stockQuery.in('warehouse_id', warehouseIds);
    }

    if (filters?.item_id) {
      stockQuery = stockQuery.eq('item_id', filters.item_id);
    }

    const { data, error } = await stockQuery;

    if (error) {
      this.logger.error(`Failed to fetch farm stock levels: ${error.message}`);
      throw new BadRequestException(`Failed to fetch farm stock levels: ${error.message}`);
    }

    // Group by item_id and aggregate
    const itemMap = new Map<string, any>();

    (data || []).forEach((row: any) => {
      const item = row.item;
      const warehouse = row.warehouse;
      const farm = warehouse?.farm;

      if (!item || !warehouse) return;

      const itemId = item.id;
      const quantity = parseFloat(row.remaining_quantity || 0);
      const value = parseFloat(row.total_cost || 0);
      const minStock = item.minimum_stock_level
        ? parseFloat(item.minimum_stock_level)
        : undefined;

      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          item_id: itemId,
          item_code: item.item_code,
          item_name: item.item_name,
          default_unit: item.default_unit,
          minimum_stock_level: minStock,
          total_quantity: 0,
          total_value: 0,
          is_low_stock: false,
          by_farm: [],
        });
      }

      const itemData = itemMap.get(itemId);
      itemData.total_quantity += quantity;
      itemData.total_value += value;

      // Add farm-level stock
      const farmStock = {
        farm_id: farm?.id || null,
        farm_name: farm?.name || null,
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        item_id: itemId,
        total_quantity: quantity,
        total_value: value,
        is_low_stock: minStock !== undefined && quantity < minStock,
        minimum_stock_level: minStock,
      };

      itemData.by_farm.push(farmStock);

      // Check if overall stock is low
      if (minStock !== undefined && itemData.total_quantity < minStock) {
        itemData.is_low_stock = true;
      }
    });

    // Also fetch items with a minimum_stock_level that have no stock movements at all
    // (they won't appear in stock_valuation, so they'd be silently missing from alerts)
    let itemsQuery = supabase
      .from('items')
      .select('id, item_code, item_name, default_unit, minimum_stock_level')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .not('minimum_stock_level', 'is', null);

    if (filters?.item_id) {
      itemsQuery = itemsQuery.eq('id', filters.item_id);
    }

    const { data: itemsWithThreshold, error: itemsError } = await itemsQuery;

    if (itemsError) {
      this.logger.error(`Failed to fetch items with thresholds: ${itemsError.message}`);
      // Non-fatal: continue with existing stock data
    } else {
      // Add zero-stock entries for items not already in the map
      (itemsWithThreshold || []).forEach((item: any) => {
        if (!itemMap.has(item.id)) {
          const minStock = item.minimum_stock_level
            ? parseFloat(item.minimum_stock_level)
            : undefined;
          itemMap.set(item.id, {
            item_id: item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            default_unit: item.default_unit,
            minimum_stock_level: minStock,
            total_quantity: 0,
            total_value: 0,
            is_low_stock: minStock !== undefined && 0 <= minStock,
            by_farm: [],
          });
        }
      });
    }

    let result = Array.from(itemMap.values());

    // Filter low stock only if requested
    if (filters?.low_stock_only) {
      result = result.filter((item) => item.is_low_stock);
    }

    return result;
  }

  /**
   * Get item usage by farm/parcel
   */
  async getItemFarmUsage(organizationId: string, itemId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Query stock movements (OUT movements indicate usage)
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select(`
        id,
        movement_date,
        quantity,
        warehouse_id,
        warehouse:warehouses!inner(
          id,
          farm_id,
          farm:farms(id, name)
        )
      `)
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .eq('movement_type', 'OUT')
      .order('movement_date', { ascending: false });

    if (movementsError) {
      this.logger.warn(`Could not fetch stock movements: ${movementsError.message}`);
    }

    // Query product_applications for this item (linked to tasks via task_id)
    const { data: applications, error: applicationsError } = await supabase
      .from('product_applications')
      .select(`
        id,
        task_id,
        application_date,
        quantity_used,
        farm_id,
        parcel_id,
        farm:farms(id, name),
        parcel:parcels(id, name),
        task:tasks(id, title)
      `)
      .eq('organization_id', organizationId)
      .eq('product_id', itemId)
      .not('task_id', 'is', null)
      .order('application_date', { ascending: false });

    if (applicationsError) {
      this.logger.warn(`Could not fetch product applications: ${applicationsError.message}`);
    }

    // Aggregate usage by farm
    const farmMap = new Map<string, any>();
    const parcelMap = new Map<string, any>();

    // Process stock movements (OUT movements = actual deductions)
    (movements || []).forEach((movement: any) => {
      const warehouse = movement.warehouse;
      const farm = warehouse?.farm;

      if (!farm) return;

      const farmId = farm.id;
      const quantity = Math.abs(parseFloat(movement.quantity || 0));
      const movementDate = movement.movement_date;

      if (!farmMap.has(farmId)) {
        farmMap.set(farmId, {
          farm_id: farmId,
          farm_name: farm.name,
          usage_count: 0,
          total_quantity_used: 0,
          task_ids: [],
          tasks: [],
        });
      }

      const farmUsage = farmMap.get(farmId);
      farmUsage.usage_count += 1;
      farmUsage.total_quantity_used += quantity;

      if (!farmUsage.last_used_date || movementDate > farmUsage.last_used_date) {
        farmUsage.last_used_date = movementDate;
      }
    });

    // Process product_applications linked to tasks (filtered by this item's product_id)
    (applications || []).forEach((app: any) => {
      const farm = app.farm;
      const parcel = app.parcel;
      if (!farm || !app.task_id) return;

      const farmId = farm.id;

      if (parcel) {
        const parcelKey = `${farmId}_${parcel.id}`;
        if (!parcelMap.has(parcelKey)) {
          parcelMap.set(parcelKey, {
            farm_id: farmId,
            farm_name: farm.name,
            parcel_id: parcel.id,
            parcel_name: parcel.name,
            usage_count: 0,
            total_quantity_used: 0,
            task_ids: [],
          });
        }
        const parcelUsage = parcelMap.get(parcelKey);
        parcelUsage.usage_count += 1;
        if (!parcelUsage.task_ids.includes(app.task_id)) {
          parcelUsage.task_ids.push(app.task_id);
        }
      }

      if (!farmMap.has(farmId)) {
        farmMap.set(farmId, {
          farm_id: farmId,
          farm_name: farm.name,
          usage_count: 0,
          total_quantity_used: 0,
          task_ids: [],
          tasks: [],
        });
      }

      const farmUsage = farmMap.get(farmId);
      farmUsage.usage_count += 1;
      farmUsage.total_quantity_used += parseFloat(app.quantity_used || 0);
      if (!farmUsage.last_used_date || app.application_date > farmUsage.last_used_date) {
        farmUsage.last_used_date = app.application_date;
      }
      if (!farmUsage.task_ids.includes(app.task_id)) {
        farmUsage.task_ids.push(app.task_id);
        if (app.task) {
          if (!farmUsage.tasks) {
            farmUsage.tasks = [];
          }
          farmUsage.tasks.push({ id: app.task.id, title: app.task.title });
        }
      }
    });

    // Combine farm and parcel usage
    const byFarm = Array.from(farmMap.values()).map((farmUsage) => {
      const parcelUsages = Array.from(parcelMap.values()).filter(
        (p) => p.farm_id === farmUsage.farm_id,
      );

      return {
        ...farmUsage,
        parcels: parcelUsages.length > 0 ? parcelUsages : undefined,
      };
    });

    // Calculate totals
    const totalUsageCount = byFarm.reduce((sum, f) => sum + f.usage_count, 0);
    const totalQuantityUsed = byFarm.reduce((sum, f) => sum + f.total_quantity_used, 0);
    const lastUsedDate = byFarm
      .map((f) => f.last_used_date)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    return {
      item_id: itemId,
      total_usage_count: totalUsageCount,
      last_used_date: lastUsedDate,
      total_quantity_used: totalQuantityUsed,
      by_farm: byFarm,
    };
  }

  /**
   * Get stock levels for items with farm context
   */
  async getStockLevels(
    organizationId: string,
    filters?: {
      farm_id?: string;
      item_id?: string;
    },
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    try {
      // First, get warehouse IDs for the farm if filtering by farm
      let warehouseIds: string[] | null = null;
      if (filters?.farm_id) {
        const { data: warehouses, error: whError } = await supabase
          .from('warehouses')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('farm_id', filters.farm_id)
          .eq('is_active', true);

        if (whError) {
          this.logger.error(`Failed to fetch warehouses: ${whError.message}`);
          throw new BadRequestException(`Failed to fetch warehouses: ${whError.message}`);
        }

        warehouseIds = warehouses?.map((w) => w.id) || [];
        if (warehouseIds.length === 0) {
          return {}; // No warehouses for this farm
        }
      }

      // Query stock valuation with explicit column selection to avoid schema cache issues
      let query = supabase
        .from('stock_valuation')
        .select(`
          item_id,
          remaining_quantity,
          total_cost,
          warehouse_id
        `)
        .eq('organization_id', organizationId)
        .gt('remaining_quantity', 0);

      if (warehouseIds) {
        query = query.in('warehouse_id', warehouseIds);
      }

      if (filters?.item_id) {
        query = query.eq('item_id', filters.item_id);
      }

      const { data: stockData, error: stockError } = await query;

      if (stockError) {
        this.logger.error(`Failed to fetch stock levels: ${stockError.message}`);
        throw new BadRequestException(`Failed to fetch stock levels: ${stockError.message}`);
      }

      if (!stockData || stockData.length === 0) {
        return {};
      }

      // Get unique warehouse and item IDs
      const uniqueWarehouseIds = [...new Set(stockData.map(s => s.warehouse_id))];
      const uniqueItemIds = [...new Set(stockData.map(s => s.item_id))];

      // Fetch warehouse details separately
      const { data: warehouses } = await supabase
        .from('warehouses')
        .select('id, name, farm_id, farm:farms(id, name)')
        .in('id', uniqueWarehouseIds);

      // Fetch item details separately
      const { data: items } = await supabase
        .from('items')
        .select('id, item_code, item_name, default_unit')
        .in('id', uniqueItemIds);

      // Create lookup maps
      const warehouseMap = new Map(warehouses?.map(w => [w.id, w]) || []);
      const itemMap = new Map(items?.map(i => [i.id, i]) || []);

      // Aggregate by item_id with farm context
      const aggregated = stockData.reduce((acc: any, val: any) => {
        const itemId = val.item_id;
        if (!acc[itemId]) {
          const item = itemMap.get(itemId);
          acc[itemId] = {
            item_id: itemId,
            item_code: item?.item_code || null,
            item_name: item?.item_name || 'Unknown Item',
            default_unit: item?.default_unit || null,
            total_quantity: 0,
            total_value: 0,
            warehouses: [], // Will be aggregated below
            _warehouseMap: new Map(), // Temporary map for warehouse aggregation
          };
        }

        const quantity = parseFloat(val.remaining_quantity || 0);
        const value = parseFloat(val.total_cost || 0);
        acc[itemId].total_quantity += quantity;
        acc[itemId].total_value += value;

        // Aggregate warehouse info (multiple FIFO batches per warehouse should be combined)
        const warehouse = warehouseMap.get(val.warehouse_id);
        if (warehouse) {
          const existingWh = acc[itemId]._warehouseMap.get(warehouse.id);
          if (existingWh) {
            // Add to existing warehouse totals
            existingWh.quantity += quantity;
            existingWh.value += value;
          } else {
            // New warehouse entry
            acc[itemId]._warehouseMap.set(warehouse.id, {
              warehouse_id: warehouse.id,
              warehouse_name: warehouse.name,
              farm_id: warehouse.farm_id,
              farm_name: (warehouse as any).farm?.name || null,
              quantity,
              value,
            });
          }
        }

        return acc;
      }, {});

      // Convert warehouse maps to arrays and remove temporary _warehouseMap
      Object.keys(aggregated).forEach((itemId) => {
        aggregated[itemId].warehouses = Array.from(aggregated[itemId]._warehouseMap.values());
        delete aggregated[itemId]._warehouseMap;
      });

      return aggregated;
    } catch (error) {
      this.logger.error('Error in getStockLevels:', error);
      throw error;
    }
  }

  // =====================================================
  // ITEM PRICES
  // =====================================================

  /**
   * Get total consumption in base unit for an item across all variants
   * Logic is implemented in NestJS for easier maintenance
   */
  async getItemConsumptionInBaseUnit(
    organizationId: string,
    itemId: string,
    filters?: {
      warehouse_id?: string;
      start_date?: Date;
      end_date?: Date;
    }
  ): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    // Get item with its default_unit
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, item_name, default_unit')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (itemError || !item) {
      throw new NotFoundException('Item not found');
    }

    // Build the query for stock movements with variant aggregation
    let query = supabase
      .from('stock_movements')
      .select(`
        quantity,
        base_quantity_at_movement,
        variant:variant_id(
          id,
          variant_name,
          base_quantity
        )
      `)
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .eq('movement_type', 'OUT'); // OUT = consumption

    // Apply filters
    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }
    if (filters?.start_date) {
      query = query.gte('movement_date', filters.start_date.toISOString());
    }
    if (filters?.end_date) {
      query = query.lte('movement_date', filters.end_date.toISOString());
    }

    const { data: movements, error: movementsError } = await query;

    if (movementsError) {
      this.logger.error(`Failed to fetch stock movements: ${movementsError.message}`);
      throw new BadRequestException(`Failed to fetch stock movements: ${movementsError.message}`);
    }

    // Aggregate consumption by variant (NestJS logic for easier maintenance)
    let totalConsumption = 0;
    const byVariant = new Map();

    (movements || []).forEach((movement: any) => {
      const variant = movement.variant;
      const quantity = parseFloat(movement.quantity || 0);
      // Use base_quantity_at_movement if available (for historical accuracy),
      // otherwise fall back to variant.base_quantity
      const baseQuantity = parseFloat(
        movement.base_quantity_at_movement ||
        variant?.base_quantity ||
        1
      );

      const consumptionInBaseUnit = quantity * baseQuantity;
      totalConsumption += consumptionInBaseUnit;

      // Aggregate by variant
      if (!byVariant.has(variant?.id)) {
        byVariant.set(variant?.id || 'unknown', {
          variant_id: variant?.id || null,
          variant_name: variant?.variant_name || 'Unknown',
          base_quantity: baseQuantity,
          quantity_consumed: 0,
          consumption_in_base_unit: 0,
        });
      }
      const variantData = byVariant.get(variant?.id || 'unknown');
      variantData.quantity_consumed += quantity;
      variantData.consumption_in_base_unit += consumptionInBaseUnit;
    });

    return {
      item_id: itemId,
      item_name: item.item_name,
      base_unit: item.default_unit,
      total_consumption: totalConsumption,
      by_variant: Array.from(byVariant.values()),
    };
  }

  /**
   * Get all prices for a specific item
   */
  async getItemPrices(itemId: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('item_prices')
      .select(`
        *,
        customer:customers(id, name),
        supplier:suppliers(id, name)
      `)
      .eq('item_id', itemId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('price_list_name', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch item prices: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item prices: ${error.message}`);
    }

    return data;
  }

}
