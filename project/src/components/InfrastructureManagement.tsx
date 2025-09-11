import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Building2, Wrench, Droplets, FlaskRound as Flask } from 'lucide-react';
import { supabase, DEFAULT_FARM_ID } from '../lib/supabase';

interface Structure {
  id: string;
  name: string;
  type: 'stable' | 'technical_room' | 'basin' | 'well';
  location: {
    lat: number;
    lng: number;
  };
  installation_date: string;
  condition: string;
  usage: string;
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

const InfrastructureManagement: React.FC = () => {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);

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
  }, []);

  const fetchStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('structures')
        .select('*')
        .eq('farm_id', DEFAULT_FARM_ID)
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type de construction
              </label>
              <select
                value={details.construction_type || ''}
                onChange={(e) => handleStructureDetailsChange('construction_type', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              >
                <option value="">Sélectionner...</option>
                <option value="concrete">Béton</option>
                <option value="metal">Métallique</option>
                <option value="wood">Bois</option>
                <option value="mixed">Mixte</option>
              </select>
            </div>
          </>
        );

      case 'basin':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Forme
              </label>
              <select
                value={details.shape || ''}
                onChange={(e) => handleStructureDetailsChange('shape', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                required
              >
                <option value="">Sélectionner...</option>
                {BASIN_SHAPES.map(shape => (
                  <option key={shape.value} value={shape.value}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>

            {details.shape && (
              <div className="space-y-4 mt-4">
                {details.shape === 'circular' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Rayon (m)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={details.dimensions?.radius || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.radius', Number(e.target.value))}
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
                          value={details.dimensions?.height || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.height', Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : details.shape === 'trapezoidal' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Largeur supérieure (m)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={details.dimensions?.top_width || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.top_width', Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Largeur inférieure (m)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={details.dimensions?.bottom_width || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.bottom_width', Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Longueur (m)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={details.dimensions?.length || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.length', Number(e.target.value))}
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
                          value={details.dimensions?.height || ''}
                          onChange={(e) => handleStructureDetailsChange('dimensions.height', Number(e.target.value))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  // Rectangular or Cubic
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Largeur (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={details.dimensions?.width || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.width', Number(e.target.value))}
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
                        value={details.dimensions?.length || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.length', Number(e.target.value))}
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
                        value={details.dimensions?.height || ''}
                        onChange={(e) => handleStructureDetailsChange('dimensions.height', Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                        required
                      />
                    </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Équipements présents
              </label>
              <textarea
                value={details.equipment?.join('\n') || ''}
                onChange={(e) => handleStructureDetailsChange('equipment', e.target.value.split('\n').filter(Boolean))}
                rows={4}
                placeholder="Un équipement par ligne"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </>
        );

      case 'well':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Profondeur (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={details.depth || ''}
                  onChange={(e) => handleStructureDetailsChange('depth', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  État
                </label>
                <select
                  value={details.condition || ''}
                  onChange={(e) => handleStructureDetailsChange('condition', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="">Sélectionner...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Bon</option>
                  <option value="fair">Moyen</option>
                  <option value="poor">Mauvais</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type de pompe
                </label>
                <select
                  value={details.pump_type || ''}
                  onChange={(e) => handleStructureDetailsChange('pump_type', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  <option value="">Sélectionner...</option>
                  <option value="submersible">Pompe immergée</option>
                  <option value="surface">Pompe de surface</option>
                  <option value="manual">Pompe manuelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Puissance pompe (kW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={details.pump_power || ''}
                  onChange={(e) => handleStructureDetailsChange('pump_power', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            </div>
          </>
        );
    }
  };

  const handleAddStructure = async () => {
    try {
      const { data, error } = await supabase
        .from('structures')
        .insert([{
          ...newStructure,
          farm_id: DEFAULT_FARM_ID
        }])
        .select()
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
        .eq('id', editingStructure.id)
        .eq('farm_id', DEFAULT_FARM_ID);

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
        .delete()
        .eq('id', id)
        .eq('farm_id', DEFAULT_FARM_ID);

      if (error) throw error;

      setStructures(structures.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting structure:', error);
      setError('Failed to delete structure');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestion des Infrastructures
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle Structure</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map(structure => (
          <div
            key={structure.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
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
                  <h3 className="text-lg font-semibold">{structure.name}</h3>
                  <p className="text-sm text-gray-500">
                    {STRUCTURE_TYPES.find(t => t.value === structure.type)?.label}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingStructure(structure)}
                  className="text-gray-400 hover:text-gray-500"
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

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Installation</span>
                <span>{new Date(structure.installation_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">État</span>
                <span>{structure.condition}</span>
              </div>
              {structure.usage && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Utilisation</span>
                  <span>{structure.usage}</span>
                </div>
              )}

              {/* Structure-specific details */}
              {structure.type === 'stable' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p>Dimensions: {structure.structure_details.width}m × {structure.structure_details.length}m × {structure.structure_details.height}m</p>
                  <p>Construction: {structure.structure_details.construction_type}</p>
                </div>
              )}

              {structure.type === 'basin' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p>Forme: {BASIN_SHAPES.find(s => s.value === structure.structure_details.shape)?.label}</p>
                  <p>Volume: {structure.structure_details.volume?.toFixed(2)} m³</p>
                </div>
              )}

              {structure.type === 'technical_room' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p>Dimensions: {structure.structure_details.width}m × {structure.structure_details.length}m × {structure.structure_details.height}m</p>
                  {structure.structure_details.equipment && (
                    <div className="mt-2">
                      <p className="font-medium mb-1">Équipements:</p>
                      <ul className="list-disc list-inside">
                        {structure.structure_details.equipment.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {structure.type === 'well' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p>Profondeur: {structure.structure_details.depth}m</p>
                  <p>Pompe: {structure.structure_details.pump_type} ({structure.structure_details.pump_power} kW)</p>
                  <p>État: {structure.structure_details.condition}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Structure Modal */}
      {(showAddModal || editingStructure) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom
                </label>
                <input
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type de structure
                </label>
                <select
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                >
                  {STRUCTURE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date d'installation
                </label>
                <input
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Utilisation
                </label>
                <input
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  placeholder="Ex: Stockage matériel, Élevage, etc."
                />
              </div>

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