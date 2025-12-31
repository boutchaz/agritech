import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Edit2, Trash2, Building2, Wrench, Droplets, FlaskRound as Flask, Building, MapPin } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { useAuth } from './MultiTenantAuthProvider';
import { useStructures, useCreateStructure, useUpdateStructure, useDeleteStructure } from '../hooks/useStructures';
import type { Structure as ApiStructure, CreateStructureInput } from '../lib/api/structures';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

// Use the API Structure type
type Structure = ApiStructure;

// Structure type keys for translation lookup
const STRUCTURE_TYPE_KEYS = ['stable', 'technical_room', 'basin', 'well'] as const;

// Basin shape keys for translation lookup
const BASIN_SHAPE_KEYS = ['trapezoidal', 'rectangular', 'cubic', 'circular'] as const;

interface Farm {
  id: string;
  name: string;
}

const InfrastructureManagement: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();

  // API hooks
  const { data: structures = [], isLoading: loading, error: apiError } = useStructures();
  const createStructure = useCreateStructure();
  const updateStructure = useUpdateStructure();
  const deleteStructure = useDeleteStructure();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
  const [activeTab, setActiveTab] = useState<'organization' | 'farm'>('organization');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchFarms();
  }, [currentOrganization]);

  const fetchFarms = async () => {
    try {
      if (!currentOrganization) return;

      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  // fetchStructures is now handled by useStructures hook

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
    const updatedDetails = { ...structureToUpdate.structure_details, [field]: value };

    // Auto-calculate basin volume
    if (structureToUpdate.type === 'basin' && field.startsWith('dimensions.')) {
      const dimensions = updatedDetails.dimensions || {};
      if (updatedDetails.shape && Object.keys(dimensions).length > 0) {
        updatedDetails.volume = calculateBasinVolume(updatedDetails.shape, dimensions);
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
    const details = structure.structure_details || {};

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
                  value={details.width || ''}
                  onChange={(e) => handleStructureDetailsChange('width', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="stable_length" required>
                <Input
                  id="stable_length"
                  type="number"
                  step="1"
                  value={details.length || ''}
                  onChange={(e) => handleStructureDetailsChange('length', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="stable_height" required>
                <Input
                  id="stable_height"
                  type="number"
                  step="1"
                  value={details.height || ''}
                  onChange={(e) => handleStructureDetailsChange('height', Number(e.target.value))}
                  required
                />
              </FormField>
            </div>
            <FormField label={t('infrastructure.fields.constructionType')} htmlFor="construction_type" required>
              <Select
                id="construction_type"
                value={details.construction_type || ''}
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
                value={details.shape || ''}
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

            {details.shape && (
              <div className="space-y-4 mt-4">
                {details.shape === 'circular' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={`${t('infrastructure.fields.radius')} (${t('infrastructure.units.meters')})`} htmlFor="basin_radius" required>
                        <Input
                          id="basin_radius"
                          type="number"
                          step="1"
                          value={details.dimensions?.radius || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.radius', Number(e.target.value))}
                          required
                        />
                      </FormField>
                      <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="basin_height" required>
                        <Input
                          id="basin_height"
                          type="number"
                          step="1"
                          value={details.dimensions?.height || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.height', Number(e.target.value))}
                          required
                        />
                      </FormField>
                    </div>
                  </>
                ) : details.shape === 'trapezoidal' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={`${t('infrastructure.fields.topWidth')} (${t('infrastructure.units.meters')})`} htmlFor="basin_top_width" required>
                        <Input
                          id="basin_top_width"
                          type="number"
                          step="1"
                          value={details.dimensions?.top_width || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.top_width', Number(e.target.value))}
                          required
                        />
                      </FormField>
                      <FormField label={`${t('infrastructure.fields.bottomWidth')} (${t('infrastructure.units.meters')})`} htmlFor="basin_bottom_width" required>
                        <Input
                          id="basin_bottom_width"
                          type="number"
                          step="1"
                          value={details.dimensions?.bottom_width || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.bottom_width', Number(e.target.value))}
                          required
                        />
                      </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="basin_length" required>
                        <Input
                          id="basin_length"
                          type="number"
                          step="1"
                          value={details.dimensions?.length || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.length', Number(e.target.value))}
                          required
                        />
                      </FormField>
                      <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="basin_height2" required>
                        <Input
                          id="basin_height2"
                          type="number"
                          step="1"
                          value={details.dimensions?.height || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.height', Number(e.target.value))}
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
                        step="1"
                        value={details.dimensions?.width || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.width', Number(e.target.value))}
                        required
                      />
                    </FormField>
                    <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="rect_length" required>
                      <Input
                        id="rect_length"
                        type="number"
                        step="1"
                        value={details.dimensions?.length || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.length', Number(e.target.value))}
                        required
                      />
                    </FormField>
                    <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="rect_height" required>
                      <Input
                        id="rect_height"
                        type="number"
                        step="1"
                        value={details.dimensions?.height || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.height', Number(e.target.value))}
                        required
                      />
                    </FormField>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('infrastructure.fields.calculatedVolume')}
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    {details.volume?.toFixed(2) || 0} {t('infrastructure.units.cubicMeters')}
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
                  value={details.width || ''}
                  onChange={(e) => handleStructureDetailsChange('width', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.length')} (${t('infrastructure.units.meters')})`} htmlFor="tech_length" required>
                <Input
                  id="tech_length"
                  type="number"
                  step="0.1"
                  value={details.length || ''}
                  onChange={(e) => handleStructureDetailsChange('length', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label={`${t('infrastructure.fields.height')} (${t('infrastructure.units.meters')})`} htmlFor="tech_height" required>
                <Input
                  id="tech_height"
                  type="number"
                  step="0.1"
                  value={details.height || ''}
                  onChange={(e) => handleStructureDetailsChange('height', Number(e.target.value))}
                  required
                />
              </FormField>
            </div>
            <FormField label={t('infrastructure.fields.equipment')} htmlFor="tech_equipment" helper={t('infrastructure.fields.equipmentHelper')}>
              <Textarea
                id="tech_equipment"
                value={details.equipment?.join('\n') || ''}
                onChange={(e) => handleStructureDetailsChange('equipment', e.target.value.split('\n').filter(Boolean))}
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
                  value={details.depth || ''}
                  onChange={(e) => handleStructureDetailsChange('depth', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label={t('infrastructure.fields.condition')} htmlFor="well_condition" required>
                <Select
                  id="well_condition"
                  value={details.condition || ''}
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
                  value={details.pump_type || ''}
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
                  value={details.pump_power || ''}
                  onChange={(e) => handleStructureDetailsChange('pump_power', Number(e.target.value))}
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

  const handleDeleteStructure = async (id: string) => {
    if (!confirm(t('infrastructure.messages.deleteConfirm'))) return;

    try {
      await deleteStructure.mutateAsync(id);
      toast.success(t('infrastructure.messages.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting structure:', error);
      toast.error(t('infrastructure.messages.deleteError'));
    }
  };

  // Render structure card component
  const renderStructureCard = (structure: Structure) => (
    <div
      key={structure.id}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {structure.type === 'stable' ? (
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            ) : structure.type === 'technical_room' ? (
              <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            ) : structure.type === 'basin' ? (
              <Droplets className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            ) : (
              <Flask className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{structure.name}</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {t(`infrastructure.types.${structure.type}`)}
            </p>
            {structure.farm && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{structure.farm.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 flex-shrink-0">
          <button
            onClick={() => setEditingStructure(structure)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('infrastructure.actions.edit')}
          >
            <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => handleDeleteStructure(structure.id)}
            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label={t('infrastructure.actions.delete')}
          >
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">{t('infrastructure.fields.installationDate')}</span>
          <span>{new Date(structure.installation_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">{t('infrastructure.fields.condition')}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            structure.condition === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            structure.condition === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            structure.condition === 'fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {t(`infrastructure.conditions.${structure.condition}`)}
          </span>
        </div>
        {structure.usage && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">{t('infrastructure.fields.usage')}</span>
            <span className="text-right">{structure.usage}</span>
          </div>
        )}

        {/* Structure-specific details */}
        {structure.type === 'stable' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.dimensions')}:</span> {structure.structure_details.width}m × {structure.structure_details.length}m × {structure.structure_details.height}m
            </p>
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.constructionType')}:</span> {t(`infrastructure.constructionTypes.${structure.structure_details.construction_type}`)}
            </p>
          </div>
        )}

        {structure.type === 'basin' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.shape')}:</span> {t(`infrastructure.shapes.${structure.structure_details.shape}`)}
            </p>
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.volume')}:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{structure.structure_details.volume?.toFixed(2)} {t('infrastructure.units.cubicMeters')}</span>
            </p>
          </div>
        )}

        {structure.type === 'technical_room' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.dimensions')}:</span> {structure.structure_details.width}m × {structure.structure_details.length}m × {structure.structure_details.height}m
            </p>
            {structure.structure_details.equipment && structure.structure_details.equipment.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-xs text-gray-500 mb-1">{t('infrastructure.fields.equipment')}:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {structure.structure_details.equipment.slice(0, 3).map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                  {structure.structure_details.equipment.length > 3 && (
                    <li className="text-gray-400">+{structure.structure_details.equipment.length - 3} {t('infrastructure.more')}...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {structure.type === 'well' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.depth')}:</span> {structure.structure_details.depth}m
            </p>
            <p className="text-sm">
              <span className="text-gray-500">{t('infrastructure.fields.pump')}:</span> {t(`infrastructure.pumpTypes.${structure.structure_details.pump_type}`)} ({structure.structure_details.pump_power} kW)
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="hidden sm:block">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('infrastructure.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('infrastructure.subtitle')}
          </p>
        </div>
        <button
          data-tour="infrastructure-add"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">{t('infrastructure.actions.new')}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-min">
          <button
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
          </button>
          <button
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
              <span>{t('infrastructure.tabs.byFarm')}</span>
              <span className="py-0.5 px-1.5 sm:px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {allFarmStructures.length}
              </span>
            </div>
          </button>
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

          {organizationStructures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <Building2 className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('infrastructure.empty.organizationTitle')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                {t('infrastructure.empty.organizationDescription')}
              </p>
              <button
                onClick={() => {
                  setActiveTab('organization');
                  setShowAddModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-5 w-5" />
                <span>{t('infrastructure.actions.add')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="infrastructure-list">
              {organizationStructures.map(structure => renderStructureCard(structure))}
            </div>
          )}
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

          {/* Farm Selector */}
          {farms.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('infrastructure.fields.filterByFarm')}
              </label>
              <select
                value={selectedFarmId || ''}
                onChange={(e) => setSelectedFarmId(e.target.value || null)}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('infrastructure.fields.allFarms')}</option>
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Display structures */}
          {selectedFarmId ? (
            // Filtered by selected farm
            farmStructures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Building2 className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('infrastructure.empty.farmTitle')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                  {t('infrastructure.empty.farmDescription')}
                </p>
                <button
                  onClick={() => {
                    setActiveTab('farm');
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>{t('infrastructure.actions.add')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farmStructures.map(structure => renderStructureCard(structure))}
              </div>
            )
          ) : (
            // All farm structures grouped by farm
            allFarmStructures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Building2 className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('infrastructure.empty.noFarmInfrastructure')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                  {t('infrastructure.empty.selectFarmToAdd')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {farms.filter(farm => allFarmStructures.some(s => s.farm_id === farm.id)).map(farm => {
                  const farmStructuresForFarm = allFarmStructures.filter(s => s.farm_id === farm.id);
                  return (
                    <div key={farm.id} className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{farm.name}</h3>
                        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                          {farmStructuresForFarm.length} {t('infrastructure.infrastructure', { count: farmStructuresForFarm.length })}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {farmStructuresForFarm.map(structure => renderStructureCard(structure))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* Add/Edit Structure Modal */}
      {(showAddModal || editingStructure) && (
        <div className="modal-overlay">
          <div className="modal-panel p-4 sm:p-6 max-w-full sm:max-w-lg mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                {editingStructure ? t('infrastructure.modal.editTitle') : t('infrastructure.modal.addTitle')}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStructure(null);
                }}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t('infrastructure.actions.close')}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label={t('infrastructure.fields.name')} htmlFor="struct_name" required>
                <Input
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
                  required
                />
              </FormField>

              <FormField label={t('infrastructure.scope.label')} htmlFor="struct_scope" required>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeTab === 'organization' && !editingStructure?.farm_id}
                        onChange={() => setActiveTab('organization')}
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('infrastructure.scope.specificFarm')}</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeTab === 'organization'
                      ? t('infrastructure.scope.organizationHint')
                      : t('infrastructure.scope.farmHint')}
                  </p>
                </div>
              </FormField>

              {(activeTab === 'farm' || editingStructure?.farm_id) && farms.length > 0 && (
                <FormField label={t('infrastructure.fields.farm')} htmlFor="struct_farm" required>
                  <Select
                    id="struct_farm"
                    value={selectedFarmId || editingStructure?.farm_id || ''}
                    onChange={(e) => setSelectedFarmId(e.target.value)}
                    required
                  >
                    <option value="">{t('infrastructure.select')}</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label={t('infrastructure.fields.type')} htmlFor="struct_type" required>
                <Select
                  id="struct_type"
                  value={editingStructure?.type || newStructure.type}
                  onChange={(e) => {
                    const type = (e.target as HTMLSelectElement).value as Structure['type'];
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
                  required
                >
                  {STRUCTURE_TYPE_KEYS.map(typeKey => (
                    <option key={typeKey} value={typeKey}>
                      {t(`infrastructure.types.${typeKey}`)}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label={t('infrastructure.fields.installationDate')} htmlFor="struct_installation" required>
                <Input
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
                  required
                />
              </FormField>

              <FormField label={t('infrastructure.fields.usage')} htmlFor="struct_usage">
                <Input
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
                  placeholder={t('infrastructure.fields.usagePlaceholder')}
                />
              </FormField>

              {/* Structure-specific fields */}
              {renderStructureFields()}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end sticky bottom-0 bg-white dark:bg-gray-800 pt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStructure(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('infrastructure.actions.cancel')}
              </button>
              <button
                onClick={editingStructure ? handleUpdateStructure : handleAddStructure}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                {editingStructure ? t('infrastructure.actions.update') : t('infrastructure.actions.addButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructureManagement;
