import { useCallback, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Wrench, Droplets, FlaskRound as Flask, Building, MapPin } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { useStructures, useCreateStructure, useUpdateStructure, useDeleteStructure } from '../hooks/useStructures';
import { useFarms } from '../hooks/useParcelsQuery';
import type { Structure as ApiStructure, CreateStructureInput } from '../lib/api/structures';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  DialogFooter,
} from './ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { FilterBar, ListPageHeader, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';


// Use the API Structure type
type Structure = ApiStructure;

type StructureDetails = Record<string, unknown>;

// Structure type keys for translation lookup
const STRUCTURE_TYPE_KEYS = ['stable', 'technical_room', 'basin', 'well', 'other'] as const;

// Basin shape keys for translation lookup
const BASIN_SHAPE_KEYS = ['trapezoidal', 'rectangular', 'cubic', 'circular'] as const;

const getDetailValue = (value: unknown): string | number =>
  typeof value === 'string' || typeof value === 'number' ? value : '';

const getDetailText = (value: unknown, fallback = '—') =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const getDetailNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const getDetailArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

const InfrastructureManagement = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  // API hooks
  const { data: structures = [], isLoading: loading, error: apiError } = useStructures();
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const createStructure = useCreateStructure();
  const updateStructure = useUpdateStructure();
  const deleteStructure = useDeleteStructure();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const _showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
  const [activeTab, setActiveTab] = useState<'organization' | 'farm'>('organization');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [farmSearch, setFarmSearch] = useState('');

  const [newStructure, setNewStructure] = useState<Partial<CreateStructureInput>>({
    name: '',
    type: 'stable',
    location: { lat: 0, lng: 0 },
    installation_date: new Date().toISOString().split('T')[0],
    condition: 'good',
    usage: '',
    structure_details: {}
  });

  const error = apiError ? 'Failed to fetch structures' : null;

  // Categorize structures
  const organizationStructures = useMemo(() =>
    structures.filter(s => !s.farm_id),
    [structures]
  );

  const farmStructures = useMemo(() =>
    structures.filter(s => s.farm_id === selectedFarmId),
    [structures, selectedFarmId]
  );

  const allFarmStructures = useMemo(() =>
    structures.filter(s => s.farm_id),
    [structures]
  );

  const matchesStructureSearch = useCallback((structure: Structure, query: string) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    const details = structure.structure_details ?? {};
    const searchableFields = [
      structure.name,
      structure.type,
      structure.usage,
      structure.farm?.name,
      getDetailText(details.custom_type, ''),
      getDetailText(details.construction_type, ''),
      getDetailText(details.shape, ''),
      getDetailText(details.pump_type, ''),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableFields.includes(normalizedQuery);
  }, []);

  const filteredOrganizationStructures = useMemo(
    () => organizationStructures.filter((structure) => matchesStructureSearch(structure, organizationSearch)),
    [matchesStructureSearch, organizationSearch, organizationStructures]
  );

  const filteredFarmStructures = useMemo(
    () => farmStructures.filter((structure) => matchesStructureSearch(structure, farmSearch)),
    [farmSearch, farmStructures, matchesStructureSearch]
  );

  const filteredAllFarmStructures = useMemo(
    () => allFarmStructures.filter((structure) => matchesStructureSearch(structure, farmSearch)),
    [allFarmStructures, farmSearch, matchesStructureSearch]
  );

  const groupedFarmStructures = useMemo(
    () => farms
      .map((farm) => ({
        farm,
        structures: filteredAllFarmStructures.filter((structure) => structure.farm_id === farm.id),
      }))
      .filter(({ structures }) => structures.length > 0),
    [farms, filteredAllFarmStructures]
  );

  const farmFilterOptions = useMemo(
    () => [
      { value: '', label: t('infrastructure.fields.allFarms') },
      ...farms.map((farm) => ({ value: farm.id, label: farm.name })),
    ],
    [farms, t]
  );

  const calculateBasinVolume = (shape: string, dimensions: Record<string, number>) => {
    switch (shape) {
      case 'rectangular':
      case 'cubic':
        return dimensions.length * dimensions.width * dimensions.height;
      case 'circular':
        return Math.PI * Math.pow(dimensions.radius, 2) * dimensions.height;
      case 'trapezoidal':
        // Volume = h * (a + b) * l / 2 where a and b are top and bottom widths
        return (dimensions.height * (dimensions.top_width + dimensions.bottom_width) * dimensions.length) / 2;
      default:
        return 0;
    }
  };

  const handleStructureDetailsChange = (
    field: string,
    value: string | number,
    structureToUpdate: Partial<Structure> = newStructure
  ) => {
    // Helper function to update nested object paths
    const updateNestedObject = (
      obj: Record<string, unknown>,
      path: string,
      val: string | number
    ): Record<string, unknown> => {
      const keys = path.split('.');
      const result = { ...obj };
      let current: Record<string, unknown> = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const currentValue = current[key];
        if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue) || currentValue === null) {
          current[key] = {};
        } else {
          current[key] = { ...(currentValue as Record<string, unknown>) };
        }
        current = current[key] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = val;
      return result;
    };

    const updatedDetails = field.includes('.')
      ? updateNestedObject(structureToUpdate.structure_details || {}, field, value)
      : { ...structureToUpdate.structure_details, [field]: value };

    // Auto-calculate basin volume
    if (structureToUpdate.type === 'basin' && field.startsWith('dimensions.')) {
      const dimensions = (updatedDetails.dimensions as Record<string, number>) || {};
      const shape = updatedDetails.shape as string;
      if (shape && Object.keys(dimensions).length > 0) {
        updatedDetails.volume = calculateBasinVolume(shape, dimensions);
      }
    }

    if (editingStructure) {
      setEditingStructure({
        ...editingStructure,
        structure_details: updatedDetails
      });
    } else {
      setNewStructure({
        ...structureToUpdate,
        structure_details: updatedDetails
      });
    }
  };

  const renderStructureFields = () => {
    const structure = editingStructure || newStructure;
    const details: StructureDetails = structure.structure_details || {};
    
    // Helper to safely get nested values
    const getNestedValue = (obj: Record<string, unknown>, path: string): string | number => {
      const keys = path.split('.');
      let current: unknown = obj;
      for (const key of keys) {
        if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return '';
        }
      }
      return (current as string | number) || '';
    };

    switch (structure.type) {
      case 'stable':
        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <FormField label={`${t('infrastructure.fields.width')} (${t('infrastructure.units.meters')})`} htmlFor="stable_width" required>
                <Input
                  id="stable_width"
                  type="number"
                  step="1"
                  min="0"
                  value={getDetailValue(details.width)}
                  onChange={(e) => handleStructureDetailsChange('width', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="stable_length" required>
                <Input
                  id="stable_length"
                  type="number"
                  step="1"
                  min="0"
                  value={getDetailValue(details.length)}
                  onChange={(e) => handleStructureDetailsChange('length', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="stable_height" required>
                <Input
                  id="stable_height"
                  type="number"
                  step="1"
                  min="0"
                  value={getDetailValue(details.height)}
                  onChange={(e) => handleStructureDetailsChange('height', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
            </div>
            <FormField label={t('infrastructure.fields.constructionType')} htmlFor="construction_type" required>
              <Select
                id="construction_type"
                  value={getDetailValue(details.construction_type)}
                onChange={(e) => handleStructureDetailsChange('construction_type', (e.target as HTMLSelectElement).value)}
              >
                <option value="">{t('infrastructure.select')}</option>
                <option value="concrete">{t('infrastructure.constructionTypes.concrete')}</option>
                <option value="metal">{t('infrastructure.constructionTypes.metal')}</option>
                <option value="wood">{t('infrastructure.constructionTypes.wood')}</option>
                <option value="mixed">{t('infrastructure.constructionTypes.mixed')}</option>
              </Select>
            </FormField>
          </>
        );

      case 'basin':
        return (
          <>
            <FormField label={t('infrastructure.fields.shape')} htmlFor="basin_shape" required>
              <Select
                id="basin_shape"
                  value={getDetailValue(details.shape)}
                onChange={(e) => handleStructureDetailsChange('shape', (e.target as HTMLSelectElement).value)}
              >
                <option value="">{t('infrastructure.select')}</option>
                {BASIN_SHAPE_KEYS.map(shape => (
                  <option key={shape} value={shape}>
                    {t(`infrastructure.shapes.${shape}`)}
                  </option>
                ))}
              </Select>
            </FormField>

             {getDetailText(details.shape, '') && (
              <div className="space-y-4 mt-4">
                {getDetailText(details.shape, '') === 'circular' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={`${t('infrastructure.fields.radius')} (${t('infrastructure.units.meters')})`} htmlFor="basin_radius" required>
                        <Input
                          id="basin_radius"
                          type="number"
                          step="0.01"
                          min="0"
                          value={getNestedValue(details, 'dimensions.radius')}
                          onChange={(e) => handleStructureDetailsChange('dimensions.radius', Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
                      </FormField>
                      <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="basin_height" required>
                        <Input
                          id="basin_height"
                          type="number"
                          step="0.01"
                          min="0"
                          value={getNestedValue(details, 'dimensions.height')}
                          onChange={(e) => handleStructureDetailsChange('dimensions.height', Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
                      </FormField>
                    </div>
                  </>
                ) : getDetailText(details.shape, '') === 'trapezoidal' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={`${t('infrastructure.fields.topWidth')} (${t('infrastructure.units.meters')})`} htmlFor="basin_top_width" required>
                        <Input
                          id="basin_top_width"
                          type="number"
                          step="0.01"
                          min="0"
                          value={getNestedValue(details, 'dimensions.top_width')}
                          onChange={(e) => handleStructureDetailsChange('dimensions.top_width', Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
                      </FormField>
                      <FormField label={`${t('infrastructure.fields.bottomWidth')} (${t('infrastructure.units.meters')})`} htmlFor="basin_bottom_width" required>
                        <Input
                          id="basin_bottom_width"
                          type="number"
                          step="0.01"
                          min="0"
                          value={getNestedValue(details, 'dimensions.bottom_width')}
                          onChange={(e) => handleStructureDetailsChange('dimensions.bottom_width', Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="basin_length" required>
                        <Input
                          id="basin_length"
                          type="number"
                          step="0.01"
                          min="0"
                          value={getNestedValue(details, 'dimensions.length')}
                          onChange={(e) => handleStructureDetailsChange('dimensions.length', Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
                      </FormField>
                      <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="basin_height2" required>
                        <Input
                          id="basin_height2"
                          type="number"
                          step="0.01"
                          min="0"
                          value={getNestedValue(details, 'dimensions.height')}
                          onChange={(e) => handleStructureDetailsChange('dimensions.height', Math.max(0, Number(e.target.value) || 0))}
                          required
                        />
                      </FormField>
                    </div>
                  </>
                ) : (
                  // Rectangular or Cubic
                  <div className="grid grid-cols-3 gap-4">
                    <FormField label={`${t('infrastructure.fields.width')} (${t('infrastructure.units.meters')})`} htmlFor="rect_width" required>
                      <Input
                        id="rect_width"
                        type="number"
                        step="0.01"
                        min="0"
                        value={getNestedValue(details, 'dimensions.width')}
                        onChange={(e) => handleStructureDetailsChange('dimensions.width', Math.max(0, Number(e.target.value) || 0))}
                        required
                      />
                    </FormField>
                    <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="rect_length" required>
                      <Input
                        id="rect_length"
                        type="number"
                        step="0.01"
                        min="0"
                        value={getNestedValue(details, 'dimensions.length')}
                        onChange={(e) => handleStructureDetailsChange('dimensions.length', Math.max(0, Number(e.target.value) || 0))}
                        required
                      />
                    </FormField>
                    <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="rect_height" required>
                      <Input
                        id="rect_height"
                        type="number"
                        step="0.01"
                        min="0"
                        value={getNestedValue(details, 'dimensions.height')}
                        onChange={(e) => handleStructureDetailsChange('dimensions.height', Math.max(0, Number(e.target.value) || 0))}
                        required
                      />
                    </FormField>
                  </div>
                )}

                <div className="mt-4">
                  <div className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('infrastructure.fields.calculatedVolume')}
                  </div>
                  <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                     {getDetailNumber(details.volume)?.toFixed(2) ?? '0.00'} {t('infrastructure.units.cubicMeters')}
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case 'technical_room':
        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <FormField label={`${t('infrastructure.fields.width')} (${t('infrastructure.units.meters')})`} htmlFor="tech_width" required>
                <Input
                  id="tech_width"
                  type="number"
                  step="0.1"
                  min="0"
                  value={getDetailValue(details.width)}
                  onChange={(e) => handleStructureDetailsChange('width', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="tech_length" required>
                <Input
                  id="tech_length"
                  type="number"
                  step="0.1"
                  min="0"
                  value={getDetailValue(details.length)}
                  onChange={(e) => handleStructureDetailsChange('length', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="tech_height" required>
                <Input
                  id="tech_height"
                  type="number"
                  step="0.1"
                  min="0"
                  value={getDetailValue(details.height)}
                  onChange={(e) => handleStructureDetailsChange('height', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
            </div>
            <FormField label={t('infrastructure.fields.equipment')} htmlFor="tech_equipment" helper={t('infrastructure.fields.equipmentHelper')}>
              <Textarea
                id="tech_equipment"
                  value={getDetailArray(details.equipment).join('\n')}
                  onChange={(e) => handleStructureDetailsChange('equipment', e.target.value.split('\n').filter(Boolean).join('\n'))}
                rows={4}
                placeholder={t('infrastructure.fields.equipmentHelper')}
              />
            </FormField>
          </>
        );

      case 'well':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={`${t('infrastructure.fields.depth')} (${t('infrastructure.units.meters')})`} htmlFor="well_depth" required>
                <Input
                  id="well_depth"
                  type="number"
                  step="1"
                  min="0"
                  value={getDetailValue(details.depth)}
                  onChange={(e) => handleStructureDetailsChange('depth', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
              <FormField label={t('infrastructure.fields.condition')} htmlFor="well_condition" required>
                <Select
                  id="well_condition"
                  value={getDetailValue(details.condition)}
                  onChange={(e) => handleStructureDetailsChange('condition', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">{t('infrastructure.select')}</option>
                  <option value="excellent">{t('infrastructure.conditions.excellent')}</option>
                  <option value="good">{t('infrastructure.conditions.good')}</option>
                  <option value="fair">{t('infrastructure.conditions.fair')}</option>
                  <option value="poor">{t('infrastructure.conditions.poor')}</option>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t('infrastructure.fields.pumpType')} htmlFor="well_pump_type" required>
                <Select
                  id="well_pump_type"
                  value={getDetailValue(details.pump_type)}
                  onChange={(e) => handleStructureDetailsChange('pump_type', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">{t('infrastructure.select')}</option>
                  <option value="submersible">{t('infrastructure.pumpTypes.submersible')}</option>
                  <option value="surface">{t('infrastructure.pumpTypes.surface')}</option>
                  <option value="manual">{t('infrastructure.pumpTypes.manual')}</option>
                </Select>
              </FormField>
              <FormField label={`${t('infrastructure.fields.pumpPower')} (${t('infrastructure.units.kilowatts')})`} htmlFor="well_pump_power" required>
                <Input
                  id="well_pump_power"
                  type="number"
                  step="1"
                  min="0"
                  value={getDetailValue(details.pump_power)}
                  onChange={(e) => handleStructureDetailsChange('pump_power', Math.max(0, Number(e.target.value)))}
                  required
                />
              </FormField>
            </div>
          </>
        );
    }
  };

  const handleAddStructure = async () => {
    if (!newStructure.name || !newStructure.type) {
      toast.error(t('infrastructure.messages.nameTypeRequired'));
      return;
    }

    if (newStructure.type === 'other' && !newStructure.structure_details?.custom_type) {
      toast.error(t('infrastructure.messages.customTypeRequired', 'Please specify the infrastructure type'));
      return;
    }

    try {
      // Determine farm_id based on active tab and selection
      let farmId = undefined;
      if (activeTab === 'farm' && selectedFarmId) {
        farmId = selectedFarmId;
      }

      await createStructure.mutateAsync({
        ...newStructure as CreateStructureInput,
        farm_id: farmId,
      });

      setShowAddModal(false);
      setNewStructure({
        name: '',
        type: 'stable',
        location: { lat: 0, lng: 0 },
        installation_date: new Date().toISOString().split('T')[0],
        condition: 'good',
        usage: '',
        structure_details: {}
      });
      toast.success(t('infrastructure.messages.createSuccess'));
    } catch (error) {
      console.error('Error adding structure:', error);
      toast.error(t('infrastructure.messages.createError'));
    }
  };

  const handleUpdateStructure = async () => {
    if (!editingStructure) return;

    try {

      const { id: _id, created_at: _created, updated_at: _updated, organization_id: _orgId, farm: _farm, ...updateData } = editingStructure;
      await updateStructure.mutateAsync({
        id: editingStructure.id,
        data: updateData
      });
      setEditingStructure(null);
      toast.success(t('infrastructure.messages.updateSuccess'));
    } catch (error) {
      console.error('Error updating structure:', error);
      toast.error(t('infrastructure.messages.updateError'));
    }
  };

  const handleDeleteStructure = (id: string) => {
    _showConfirm(
      t('infrastructure.messages.deleteConfirm'),
      async () => {
        try {
          await deleteStructure.mutateAsync(id);
          toast.success(t('infrastructure.messages.deleteSuccess'));
        } catch (error) {
          console.error('Error deleting structure:', error);
          toast.error(t('infrastructure.messages.deleteError'));
        }
      },
      { variant: 'destructive' }
    );
  };

  const getStructureTypeLabel = (structure: Structure) => {
    const details = structure.structure_details ?? {};

    return structure.type === 'other'
      ? getDetailText(details.custom_type, t('infrastructure.types.other'))
      : t(`infrastructure.types.${structure.type}`);
  };

  const getStructureIcon = (structure: Structure) => {
    if (structure.type === 'stable') {
      return <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />;
    }

    if (structure.type === 'technical_room') {
      return <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />;
    }

    if (structure.type === 'basin') {
      return <Droplets className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />;
    }

    if (structure.type === 'well') {
      return <Flask className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />;
    }

    return <Building className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />;
  };

  const getConditionClasses = (condition?: Structure['condition']) => {
    if (condition === 'excellent') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }

    if (condition === 'good') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }

    if (condition === 'fair') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }

    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const renderStructureSummary = (structure: Structure) => {
    const details = structure.structure_details ?? {};
    const equipment = getDetailArray(details.equipment);
    const basinVolume = getDetailNumber(details.volume);

    if (structure.type === 'stable') {
      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.dimensions')}:</span>{' '}
            {getDetailText(details.width)}m × {getDetailText(details.length)}m × {getDetailText(details.height)}m
          </p>
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.constructionType')}:</span>{' '}
            {details.construction_type ? t(`infrastructure.constructionTypes.${details.construction_type}`) : '—'}
          </p>
        </div>
      );
    }

    if (structure.type === 'basin') {
      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.shape')}:</span>{' '}
            {details.shape ? t(`infrastructure.shapes.${details.shape}`) : '—'}
          </p>
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.volume')}:</span>{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {basinVolume?.toFixed(2) ?? '0.00'} {t('infrastructure.units.cubicMeters')}
            </span>
          </p>
        </div>
      );
    }

    if (structure.type === 'technical_room') {
      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.dimensions')}:</span>{' '}
            {getDetailText(details.width)}m × {getDetailText(details.length)}m × {getDetailText(details.height)}m
          </p>
          {equipment.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-xs text-gray-500 mb-1">{t('infrastructure.fields.equipment')}:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {equipment.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {equipment.length > 3 && (
                  <li className="text-gray-400">+{equipment.length - 3} {t('infrastructure.more')}...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (structure.type === 'well') {
      return (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.depth')}:</span> {getDetailText(details.depth)}m
          </p>
          <p className="text-sm">
            <span className="text-gray-500">{t('infrastructure.fields.pump')}:</span>{' '}
            {details.pump_type ? t(`infrastructure.pumpTypes.${details.pump_type}`) : '—'} ({getDetailText(details.pump_power)} kW)
          </p>
        </div>
      );
    }

    return null;
  };

  const renderStructureActions = (structure: Structure) => (
    <div className="flex items-center justify-end gap-1 sm:gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setEditingStructure(structure)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('infrastructure.actions.edit')}
      >
        <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => handleDeleteStructure(structure.id)}
        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        aria-label={t('infrastructure.actions.delete')}
      >
        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  );

  const renderStructureCard = (structure: Structure) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <div className="flex-shrink-0 mt-0.5">{getStructureIcon(structure)}</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{structure.name}</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{getStructureTypeLabel(structure)}</p>
            {structure.farm && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{structure.farm.name}</span>
              </div>
            )}
          </div>
        </div>
        {renderStructureActions(structure)}
      </div>

      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">{t('infrastructure.fields.installationDate')}</span>
          <span>{new Date(structure.installation_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">{t('infrastructure.fields.condition')}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${getConditionClasses(structure.condition)}`}>
            {t(`infrastructure.conditions.${structure.condition}`)}
          </span>
        </div>
        {structure.usage && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">{t('infrastructure.fields.usage')}</span>
            <span className="text-right">{structure.usage}</span>
          </div>
        )}

        {renderStructureSummary(structure)}
      </div>
    </div>
  );

  const renderStructureTableHeader = (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.fields.name')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.fields.type')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.fields.farm')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.fields.installationDate')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.fields.condition')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.fields.usage')}</th>
      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('infrastructure.actions.actions', 'Actions')}</th>
    </tr>
  );

  const renderStructureTable = (structure: Structure) => (
    <>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">{getStructureIcon(structure)}</div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{structure.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{getStructureTypeLabel(structure)}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{t(`infrastructure.types.${structure.type}`)}</td>
      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{structure.farm?.name ?? '—'}</td>
      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(structure.installation_date).toLocaleDateString()}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-0.5 rounded-full text-xs ${getConditionClasses(structure.condition)}`}>
          {t(`infrastructure.conditions.${structure.condition}`)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{structure.usage || '—'}</td>
      <td className="px-6 py-4">{renderStructureActions(structure)}</td>
    </>
  );

  return (
    <>
    <ListPageLayout
      header={
        <ListPageHeader
          variant="shell"
          actions={
            <Button
              variant="green"
              data-tour="infrastructure-add"
              onClick={() => setShowAddModal(true)}
              className="flex w-full items-center justify-center space-x-2 px-4 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">{t('infrastructure.actions.new')}</span>
            </Button>
          }
        />
      }
      filters={
        <FilterBar
          searchValue={activeTab === 'organization' ? organizationSearch : farmSearch}
          onSearchChange={activeTab === 'organization' ? setOrganizationSearch : setFarmSearch}
          searchPlaceholder={t('infrastructure.actions.search', 'Search infrastructure...')}
          filters={activeTab === 'farm' && farms.length > 0 ? [{
            key: 'farm',
            value: selectedFarmId || '',
            onChange: (value) => setSelectedFarmId(value || null),
            options: farmFilterOptions,
            className: 'w-full sm:w-56',
          }] : []}
          onClear={() => {
            if (activeTab === 'organization') {
              setOrganizationSearch('');
              return;
            }

            setFarmSearch('');
            setSelectedFarmId(null);
          }}
        />
      }
    >

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-min">
          <Button
            onClick={() => setActiveTab('organization')}
            className={`
              py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap
              ${activeTab === 'organization'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>{t('infrastructure.tabs.organization')}</span>
              <span className="py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {organizationStructures.length}
              </span>
            </div>
          </Button>
          <Button
            onClick={() => setActiveTab('farm')}
            className={`
              py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap
              ${activeTab === 'farm'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>{t('infrastructure.tabs.farm')}</span>
              <span className="py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {allFarmStructures.length}
              </span>
            </div>
          </Button>
        </nav>
      </div>

      {/* Organization Tab Content */}
      {activeTab === 'organization' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-300">{t('infrastructure.info.organizationTitle')}</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  {t('infrastructure.info.organizationDescription')}
                </p>
              </div>
            </div>
          </div>

          <div data-tour="infrastructure-list">
            <ResponsiveList
              items={filteredOrganizationStructures}
              isLoading={loading}
              keyExtractor={(structure) => structure.id}
              renderCard={renderStructureCard}
              renderTable={renderStructureTable}
              renderTableHeader={renderStructureTableHeader}
              emptyIcon={Building2}
              emptyTitle={t('infrastructure.empty.organizationTitle')}
              emptyMessage={organizationSearch ? t('infrastructure.empty.organizationDescription') : t('infrastructure.empty.organizationDescription')}
              emptyAction={organizationSearch ? undefined : {
                label: t('infrastructure.actions.add'),
                onClick: () => {
                  setActiveTab('organization');
                  setShowAddModal(true);
                },
                variant: 'default',
              }}
            />
          </div>
        </div>
      )}

      {/* Farm Tab Content */}
      {activeTab === 'farm' && (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900 dark:text-green-300">{t('infrastructure.info.farmTitle')}</h3>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  {t('infrastructure.info.farmDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Display structures */}
          {selectedFarmId ? (
            <ResponsiveList
              items={filteredFarmStructures}
              isLoading={loading}
              keyExtractor={(structure) => structure.id}
              renderCard={renderStructureCard}
              renderTable={renderStructureTable}
              renderTableHeader={renderStructureTableHeader}
              emptyIcon={Building2}
              emptyTitle={t('infrastructure.empty.farmTitle')}
              emptyMessage={t('infrastructure.empty.farmDescription')}
              emptyAction={farmSearch ? undefined : {
                label: t('infrastructure.actions.add'),
                onClick: () => {
                  setActiveTab('farm');
                  setShowAddModal(true);
                },
                variant: 'default',
              }}
            />
          ) : (
            filteredAllFarmStructures.length === 0 ? (
              <ResponsiveList
                items={[]}
                isLoading={loading}
                keyExtractor={(structure) => structure.id}
                renderCard={renderStructureCard}
                renderTable={renderStructureTable}
                renderTableHeader={renderStructureTableHeader}
                emptyIcon={Building2}
                emptyTitle={t('infrastructure.empty.noFarmInfrastructure')}
                emptyMessage={t('infrastructure.empty.selectFarmToAdd')}
              />
            ) : (
              <div className="space-y-6">
                {groupedFarmStructures.map(({ farm, structures: farmStructuresForFarm }) => {
                  return (
                    <div key={farm.id} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{farm.name}</h3>
                        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                          {farmStructuresForFarm.length} {t('infrastructure.infrastructure', { count: farmStructuresForFarm.length })}
                        </span>
                      </div>
                      <ResponsiveList
                        items={farmStructuresForFarm}
                        keyExtractor={(structure) => structure.id}
                        renderCard={renderStructureCard}
                        renderTable={renderStructureTable}
                        renderTableHeader={renderStructureTableHeader}
                        emptyIcon={Building2}
                        emptyMessage={t('infrastructure.empty.farmDescription')}
                      />
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
    </ListPageLayout>

      <ResponsiveDialog
        open={showAddModal || !!editingStructure}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingStructure(null);
          }
        }}
        title={
          <div className="flex items-center gap-3 text-gray-900 dark:text-white">
            <Building2 className="w-6 h-6 text-green-600" />
            <span>{editingStructure ? t('infrastructure.modal.editTitle') : t('infrastructure.modal.addTitle')}</span>
          </div>
        }
        size="4xl"
        contentClassName="max-h-[90vh] overflow-y-auto"
        footer={
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingStructure(null);
              }}
            >
              {t('infrastructure.actions.cancel')}
            </Button>
            <Button variant="green" type="button" onClick={editingStructure ? handleUpdateStructure : handleAddStructure} >
              {editingStructure ? t('infrastructure.actions.update') : t('infrastructure.actions.addButton')}
            </Button>
          </DialogFooter>
        }
      >
          <div className="space-y-6">
            {/* Structure Type - Highlighted Section */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <label htmlFor="struct_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('infrastructure.fields.type')} *
              </label>
              <select
                id="struct_type"
                value={editingStructure?.type || newStructure.type}
                onChange={(e) => {
                  const type = e.target.value as Structure['type'];
                  if (editingStructure) {
                    setEditingStructure({
                      ...editingStructure,
                      type,
                      structure_details: {}
                    });
                  } else {
                    setNewStructure({
                      ...newStructure,
                      type,
                      structure_details: {}
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                {STRUCTURE_TYPE_KEYS.map(typeKey => (
                  <option key={typeKey} value={typeKey}>
                    {t(`infrastructure.types.${typeKey}`)}
                  </option>
                ))}
              </select>

              {/* Custom type input when 'other' is selected */}
              {(editingStructure?.type || newStructure.type) === 'other' && (
                <div className="mt-3">
                  <label htmlFor="struct_custom_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('infrastructure.fields.customType')} *
                  </label>
                  <input
                    id="struct_custom_type"
                    type="text"
                    value={((editingStructure || newStructure).structure_details?.custom_type as string) || ''}
                    onChange={(e) => {
                      const customType = e.target.value;
                      if (editingStructure) {
                        setEditingStructure({
                          ...editingStructure,
                          structure_details: {
                            ...editingStructure.structure_details,
                            custom_type: customType
                          }
                        });
                      } else {
                        setNewStructure({
                          ...newStructure,
                          structure_details: {
                            ...newStructure.structure_details,
                            custom_type: customType
                          }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('infrastructure.fields.customTypePlaceholder')}
                    required
                  />
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('infrastructure.sections.basicInfo', 'Basic Information')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="struct_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('infrastructure.fields.name')} *
                  </label>
                  <input
                    id="struct_name"
                    type="text"
                    value={editingStructure?.name || newStructure.name}
                    onChange={(e) => {
                      if (editingStructure) {
                        setEditingStructure({
                          ...editingStructure,
                          name: e.target.value
                        });
                      } else {
                        setNewStructure({
                          ...newStructure,
                          name: e.target.value
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('infrastructure.placeholders.name', 'Enter structure name')}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="struct_installation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('infrastructure.fields.installationDate')} *
                  </label>
                  <input
                    id="struct_installation"
                    type="date"
                    value={editingStructure?.installation_date || newStructure.installation_date}
                    onChange={(e) => {
                      if (editingStructure) {
                        setEditingStructure({
                          ...editingStructure,
                          installation_date: e.target.value
                        });
                      } else {
                        setNewStructure({
                          ...newStructure,
                          installation_date: e.target.value
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="struct_usage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('infrastructure.fields.usage')}
                  </label>
                  <input
                    id="struct_usage"
                    type="text"
                    value={editingStructure?.usage || newStructure.usage}
                    onChange={(e) => {
                      if (editingStructure) {
                        setEditingStructure({
                          ...editingStructure,
                          usage: e.target.value
                        });
                      } else {
                        setNewStructure({
                          ...newStructure,
                          usage: e.target.value
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('infrastructure.fields.usagePlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('infrastructure.sections.assignment', 'Assignment')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('infrastructure.scope.label')} *
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeTab === 'organization' && !editingStructure?.farm_id}
                        onChange={() => {
                          setActiveTab('organization');
                          setSelectedFarmId(null);
                        }}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('infrastructure.scope.organization')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeTab === 'farm' || !!editingStructure?.farm_id}
                        onChange={() => setActiveTab('farm')}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('infrastructure.scope.farm')}</span>
                    </label>
                  </div>
                </div>

                {(activeTab === 'farm' || editingStructure?.farm_id) && (
                  <div>
                    <label htmlFor="struct_farm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('infrastructure.fields.farm')} *
                    </label>
                    <select
                      id="struct_farm"
                      value={selectedFarmId || editingStructure?.farm_id || ''}
                      onChange={(e) => setSelectedFarmId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="">{t('infrastructure.select')}</option>
                      {farms.map(farm => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name}
                        </option>
                      ))}
                    </select>
                    {farms.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('infrastructure.noFarmsAvailable', 'No farms available. Please create a farm first.')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Structure Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                {t('infrastructure.sections.details', 'Structure Details')}
              </h3>
              {renderStructureFields()}
            </div>
          </div>
      </ResponsiveDialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </>
  );
};

export default InfrastructureManagement;
