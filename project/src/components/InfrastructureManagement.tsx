import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Edit2, Trash2, Building2, Wrench, Droplets, FlaskRound as Flask, Building, MapPin } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';

interface Structure {
  id: string;
  organization_id: string;
  farm_id?: string;
  name: string;
  type: 'stable' | 'technical_room' | 'basin' | 'well';
  location: {
    lat: number;
    lng: number;
  };
  installation_date: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  usage?: string;
  structure_details: {
    // Stable
    width?: number;
    length?: number;
    height?: number;
    construction_type?: string;
    
    // Basin
    shape?: 'trapezoidal' | 'rectangular' | 'cubic' | 'circular';
    dimensions?: {
      width?: number;
      length?: number;
      height?: number;
      radius?: number;
      top_width?: number;
      bottom_width?: number;
    };
    volume?: number;
    
    // Technical Room
    equipment?: string[];
    
    // Well
    depth?: number;
    pump_type?: string;
    pump_power?: number;
  };
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farm?: {
    name: string;
  };
}

const STRUCTURE_TYPES = [
  { value: 'stable', label: 'Écurie' },
  { value: 'technical_room', label: 'Local technique' },
  { value: 'basin', label: 'Bassin' },
  { value: 'well', label: 'Puits' }
];

const BASIN_SHAPES = [
  { value: 'trapezoidal', label: 'Trapézoïdal' },
  { value: 'rectangular', label: 'Rectangulaire' },
  { value: 'cubic', label: 'Cubique' },
  { value: 'circular', label: 'Circulaire' }
];

interface Farm {
  id: string;
  name: string;
}

const InfrastructureManagement: React.FC = () => {
  const { currentOrganization, currentFarm } = useAuth();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
  const [activeTab, setActiveTab] = useState<'organization' | 'farm'>('organization');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  const [newStructure, setNewStructure] = useState<Partial<Structure>>({
    name: '',
    type: 'stable',
    location: { lat: 0, lng: 0 },
    installation_date: new Date().toISOString().split('T')[0],
    condition: 'good',
    usage: '',
    structure_details: {}
  });

  useEffect(() => {
    fetchStructures();
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

  const fetchStructures = async () => {
    try {
      if (!currentOrganization) {
        setError('No organization selected');
        setLoading(false);
        return;
      }

      // Fetch structures for the current organization
      const { data, error } = await supabase
        .from('structures')
        .select(`
          *,
          farm:farms(name)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStructures(data || []);
    } catch (error) {
      console.error('Error fetching structures:', error);
      setError('Failed to fetch structures');
    } finally {
      setLoading(false);
    }
  };

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

  const calculateBasinVolume = (shape: string, dimensions: any) => {
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
    value: any,
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
              <FormField label="Largeur (m)" htmlFor="stable_width" required>
                <Input
                  id="stable_width"
                  type="number"
                  step="1"
                  value={details.width || ''}
                  onChange={(e) => handleStructureDetailsChange('width', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label="Longueur (m)" htmlFor="stable_length" required>
                <Input
                  id="stable_length"
                  type="number"
                  step="1"
                  value={details.length || ''}
                  onChange={(e) => handleStructureDetailsChange('length', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label="Hauteur (m)" htmlFor="stable_height" required>
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
            <FormField label="Type de construction" htmlFor="construction_type" required>
              <Select
                id="construction_type"
                value={details.construction_type || ''}
                onChange={(e) => handleStructureDetailsChange('construction_type', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Sélectionner...</option>
                <option value="concrete">Béton</option>
                <option value="metal">Métallique</option>
                <option value="wood">Bois</option>
                <option value="mixed">Mixte</option>
              </Select>
            </FormField>
          </>
        );

      case 'basin':
        return (
          <>
            <FormField label="Forme" htmlFor="basin_shape" required>
              <Select
                id="basin_shape"
                value={details.shape || ''}
                onChange={(e) => handleStructureDetailsChange('shape', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Sélectionner...</option>
                {BASIN_SHAPES.map(shape => (
                  <option key={shape.value} value={shape.value}>
                    {shape.label}
                  </option>
                ))}
              </Select>
            </FormField>

            {details.shape && (
              <div className="space-y-4 mt-4">
                {details.shape === 'circular' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Rayon (m)" htmlFor="basin_radius" required>
                        <Input
                          id="basin_radius"
                          type="number"
                          step="1"
                          value={details.dimensions?.radius || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.radius', Number(e.target.value))}
                          required
                        />
                      </FormField>
                      <FormField label="Hauteur (m)" htmlFor="basin_height" required>
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
                      <FormField label="Largeur supérieure (m)" htmlFor="basin_top_width" required>
                        <Input
                          id="basin_top_width"
                          type="number"
                          step="1"
                          value={details.dimensions?.top_width || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.top_width', Number(e.target.value))}
                          required
                        />
                      </FormField>
                      <FormField label="Largeur inférieure (m)" htmlFor="basin_bottom_width" required>
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
                      <FormField label="Longueur (m)" htmlFor="basin_length" required>
                        <Input
                          id="basin_length"
                          type="number"
                          step="1"
                          value={details.dimensions?.length || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.length', Number(e.target.value))}
                          required
                        />
                      </FormField>
                      <FormField label="Hauteur (m)" htmlFor="basin_height2" required>
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
                    <FormField label="Largeur (m)" htmlFor="rect_width" required>
                      <Input
                        id="rect_width"
                        type="number"
                        step="1"
                        value={details.dimensions?.width || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.width', Number(e.target.value))}
                        required
                      />
                    </FormField>
                    <FormField label="Longueur (m)" htmlFor="rect_length" required>
                      <Input
                        id="rect_length"
                        type="number"
                        step="1"
                        value={details.dimensions?.length || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.length', Number(e.target.value))}
                        required
                      />
                    </FormField>
                    <FormField label="Hauteur (m)" htmlFor="rect_height" required>
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
                    Volume calculé
                  </label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    {details.volume?.toFixed(2) || 0} m³
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Largeur (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={details.width || ''}
                  onChange={(e) => handleStructureDetailsChange('width', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Longueur (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={details.length || ''}
                  onChange={(e) => handleStructureDetailsChange('length', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hauteur (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={details.height || ''}
                  onChange={(e) => handleStructureDetailsChange('height', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            </div>
            <FormField label="Équipements présents" htmlFor="tech_equipment" helper="Un équipement par ligne">
              <Textarea
                id="tech_equipment"
                value={details.equipment?.join('\n') || ''}
                onChange={(e) => handleStructureDetailsChange('equipment', e.target.value.split('\n').filter(Boolean))}
                rows={4}
                placeholder="Un équipement par ligne"
              />
            </FormField>
          </>
        );

      case 'well':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Profondeur (m)" htmlFor="well_depth" required>
                <Input
                  id="well_depth"
                  type="number"
                  step="1"
                  value={details.depth || ''}
                  onChange={(e) => handleStructureDetailsChange('depth', Number(e.target.value))}
                  required
                />
              </FormField>
              <FormField label="État" htmlFor="well_condition" required>
                <Select
                  id="well_condition"
                  value={details.condition || ''}
                  onChange={(e) => handleStructureDetailsChange('condition', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Sélectionner...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Bon</option>
                  <option value="fair">Moyen</option>
                  <option value="poor">Mauvais</option>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Type de pompe" htmlFor="well_pump_type" required>
                <Select
                  id="well_pump_type"
                  value={details.pump_type || ''}
                  onChange={(e) => handleStructureDetailsChange('pump_type', (e.target as HTMLSelectElement).value)}
                >
                  <option value="">Sélectionner...</option>
                  <option value="submersible">Pompe immergée</option>
                  <option value="surface">Pompe de surface</option>
                  <option value="manual">Pompe manuelle</option>
                </Select>
              </FormField>
              <FormField label="Puissance pompe (kW)" htmlFor="well_pump_power" required>
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
    if (!newStructure.name || !newStructure.type || !currentOrganization) {
      setError('Name, type, and organization are required');
      return;
    }

    try {
      // Determine farm_id based on active tab and selection
      let farmId = null;
      if (activeTab === 'farm' && selectedFarmId) {
        farmId = selectedFarmId;
      } else if (activeTab === 'farm' && currentFarm) {
        farmId = currentFarm.id;
      }

      const { data, error } = await supabase
        .from('structures')
        .insert([{
          ...newStructure,
          organization_id: currentOrganization.id,
          farm_id: farmId,
          location: newStructure.location || { lat: 0, lng: 0 },
          structure_details: newStructure.structure_details || {}
        }])
        .select(`
          *,
          farm:farms(name)
        `)
        .single();

      if (error) throw error;

      setStructures([...structures, data]);
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
    } catch (error) {
      console.error('Error adding structure:', error);
      setError('Failed to add structure');
    }
  };

  const handleUpdateStructure = async () => {
    if (!editingStructure) return;

    try {
      const { error } = await supabase
        .from('structures')
        .update(editingStructure)
        .eq('id', editingStructure.id);

      if (error) throw error;

      setStructures(structures.map(s => 
        s.id === editingStructure.id ? editingStructure : s
      ));
      setEditingStructure(null);
    } catch (error) {
      console.error('Error updating structure:', error);
      setError('Failed to update structure');
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette structure ?')) return;

    try {
      const { error } = await supabase
        .from('structures')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setStructures(structures.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting structure:', error);
      setError('Failed to delete structure');
    }
  };

  // Render structure card component
  const renderStructureCard = (structure: Structure) => (
    <div
      key={structure.id}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          {structure.type === 'stable' ? (
            <Building2 className="h-6 w-6 text-blue-500" />
          ) : structure.type === 'technical_room' ? (
            <Wrench className="h-6 w-6 text-green-500" />
          ) : structure.type === 'basin' ? (
            <Droplets className="h-6 w-6 text-blue-500" />
          ) : (
            <Flask className="h-6 w-6 text-purple-500" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{structure.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {STRUCTURE_TYPES.find(t => t.value === structure.type)?.label}
            </p>
            {structure.farm && (
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                <MapPin className="h-3 w-3" />
                <span>{structure.farm.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setEditingStructure(structure)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDeleteStructure(structure.id)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Installation</span>
          <span>{new Date(structure.installation_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">État</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            structure.condition === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            structure.condition === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            structure.condition === 'fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {structure.condition}
          </span>
        </div>
        {structure.usage && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Utilisation</span>
            <span className="text-right">{structure.usage}</span>
          </div>
        )}

        {/* Structure-specific details */}
        {structure.type === 'stable' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">Dimensions:</span> {structure.structure_details.width}m × {structure.structure_details.length}m × {structure.structure_details.height}m
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Construction:</span> {structure.structure_details.construction_type}
            </p>
          </div>
        )}

        {structure.type === 'basin' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">Forme:</span> {BASIN_SHAPES.find(s => s.value === structure.structure_details.shape)?.label}
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Volume:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{structure.structure_details.volume?.toFixed(2)} m³</span>
            </p>
          </div>
        )}

        {structure.type === 'technical_room' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">Dimensions:</span> {structure.structure_details.width}m × {structure.structure_details.length}m × {structure.structure_details.height}m
            </p>
            {structure.structure_details.equipment && structure.structure_details.equipment.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-xs text-gray-500 mb-1">Équipements:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {structure.structure_details.equipment.slice(0, 3).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                  {structure.structure_details.equipment.length > 3 && (
                    <li className="text-gray-400">+{structure.structure_details.equipment.length - 3} autres...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {structure.type === 'well' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm">
              <span className="text-gray-500">Profondeur:</span> {structure.structure_details.depth}m
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Pompe:</span> {structure.structure_details.pump_type} ({structure.structure_details.pump_power} kW)
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion des Infrastructures
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos infrastructures au niveau organisation ou ferme
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle Infrastructure</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('organization')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'organization'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span>Organisation</span>
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {organizationStructures.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('farm')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'farm'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span>Par Ferme</span>
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
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
                <h3 className="font-medium text-blue-900 dark:text-blue-300">Infrastructures de l'organisation</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Ces infrastructures sont partagées au niveau de l'organisation et ne sont pas liées à une ferme spécifique.
                </p>
              </div>
            </div>
          </div>

          {organizationStructures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <Building2 className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune infrastructure organisation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                Les infrastructures de l'organisation sont accessibles par toutes les fermes
              </p>
              <button
                onClick={() => {
                  setActiveTab('organization');
                  setShowAddModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-5 w-5" />
                <span>Ajouter une infrastructure</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <h3 className="font-medium text-green-900 dark:text-green-300">Infrastructures par ferme</h3>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Ces infrastructures sont spécifiques à une ferme et seront supprimées si la ferme est supprimée.
                </p>
              </div>
            </div>
          </div>

          {/* Farm Selector */}
          {farms.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrer par ferme
              </label>
              <select
                value={selectedFarmId || ''}
                onChange={(e) => setSelectedFarmId(e.target.value || null)}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Toutes les fermes</option>
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
                  Aucune infrastructure pour cette ferme
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                  Ajoutez votre première infrastructure pour la ferme sélectionnée
                </p>
                <button
                  onClick={() => {
                    setActiveTab('farm');
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Ajouter une infrastructure</span>
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
                  Aucune infrastructure de ferme
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6 max-w-md">
                  Sélectionnez une ferme ci-dessus pour ajouter des infrastructures spécifiques
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
                          {farmStructuresForFarm.length} infrastructure{farmStructuresForFarm.length > 1 ? 's' : ''}
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
          <div className="modal-panel p-6 max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingStructure ? 'Modifier la Structure' : 'Nouvelle Structure'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStructure(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="Nom" htmlFor="struct_name" required>
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

              <FormField label="Niveau d'affectation" htmlFor="struct_scope" required>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeTab === 'organization' && !editingStructure?.farm_id}
                        onChange={() => setActiveTab('organization')}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Organisation</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={activeTab === 'farm' || !!editingStructure?.farm_id}
                        onChange={() => setActiveTab('farm')}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ferme spécifique</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeTab === 'organization'
                      ? 'Accessible par toutes les fermes de l\'organisation'
                      : 'Liée à une ferme spécifique et supprimée avec elle'}
                  </p>
                </div>
              </FormField>

              {(activeTab === 'farm' || editingStructure?.farm_id) && farms.length > 0 && (
                <FormField label="Ferme" htmlFor="struct_farm" required>
                  <Select
                    id="struct_farm"
                    value={selectedFarmId || editingStructure?.farm_id || ''}
                    onChange={(e) => setSelectedFarmId(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner une ferme</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField label="Type de structure" htmlFor="struct_type" required>
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
                  {STRUCTURE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Date d'installation" htmlFor="struct_installation" required>
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

              <FormField label="Utilisation" htmlFor="struct_usage">
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
                  placeholder="Ex: Stockage matériel, Élevage, etc."
                />
              </FormField>

              {/* Structure-specific fields */}
              {renderStructureFields()}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStructure(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={editingStructure ? handleUpdateStructure : handleAddStructure}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                {editingStructure ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfrastructureManagement;
