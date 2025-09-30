import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

interface SoilAnalysisProps {
  onSave: (data: SoilAnalysisData) => void;
  onCancel: () => void;
  initialData?: SoilAnalysisData;
}

interface SoilAnalysisData {
  physical: {
    texture: string;
    ph: number;
    organicMatter: number;
    density: number;
    waterRetention: number;
  };
  chemical: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    calcium: number;
    magnesium: number;
    sulfur: number;
    iron: number;
    manganese: number;
    zinc: number;
    copper: number;
    boron: number;
  };
  biological: {
    microorganisms: number;
    earthworms: number;
    organicActivity: number;
  };
}

const SoilAnalysis: React.FC<SoilAnalysisProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<SoilAnalysisData>(initialData || {
    physical: {
      texture: '',
      ph: 7.0,
      organicMatter: 0,
      density: 0,
      waterRetention: 0
    },
    chemical: {
      nitrogen: 0,
      phosphorus: 0,
      potassium: 0,
      calcium: 0,
      magnesium: 0,
      sulfur: 0,
      iron: 0,
      manganese: 0,
      zinc: 0,
      copper: 0,
      boron: 0
    },
    biological: {
      microorganisms: 0,
      earthworms: 0,
      organicActivity: 0
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Analyse du Sol</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Physical Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Physiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Texture du Sol" htmlFor="soil_texture" required>
              <Select
                id="soil_texture"
                value={formData.physical.texture}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    texture: (e.target as HTMLSelectElement).value
                  }
                })}
              >
                <option value="">Sélectionner...</option>
                <option value="Sableuse">Sableuse</option>
                <option value="Limoneuse">Limoneuse</option>
                <option value="Argileuse">Argileuse</option>
                <option value="Limono-sableuse">Limono-sableuse</option>
                <option value="Argilo-limoneuse">Argilo-limoneuse</option>
              </Select>
            </FormField>

            <FormField label="pH" htmlFor="soil_ph" required>
              <Input
                id="soil_ph"
                type="number"
                step="1"
                min={0}
                max={14}
                value={formData.physical.ph}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    ph: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Matière Organique (%)" htmlFor="soil_om" required>
              <Input
                id="soil_om"
                type="number"
                step="1"
                min={0}
                max={100}
                value={formData.physical.organicMatter}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    organicMatter: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Densité Apparente (g/cm³)" htmlFor="soil_density" required>
              <Input
                id="soil_density"
                type="number"
                step={1}
                min={0}
                value={formData.physical.density}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    density: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Rétention d'eau (%)" htmlFor="soil_wr" required>
              <Input
                id="soil_wr"
                type="number"
                step="1"
                min={0}
                max={100}
                value={formData.physical.waterRetention}
                onChange={(e) => setFormData({
                  ...formData,
                  physical: {
                    ...formData.physical,
                    waterRetention: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>
          </div>
        </div>

        {/* Chemical Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Chimiques (mg/kg)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Azote (N)" htmlFor="chem_n" required>
              <Input
                id="chem_n"
                type="number"
                step="1"
                min={0}
                value={formData.chemical.nitrogen}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    nitrogen: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Phosphore (P)" htmlFor="chem_p" required>
              <Input
                id="chem_p"
                type="number"
                step="1"
                min={0}
                value={formData.chemical.phosphorus}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    phosphorus: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Potassium (K)" htmlFor="chem_k" required>
              <Input
                id="chem_k"
                type="number"
                step="1"
                min={0}
                value={formData.chemical.potassium}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    potassium: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Calcium (Ca)" htmlFor="chem_ca" required>
              <Input
                id="chem_ca"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.calcium}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    calcium: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Magnésium (Mg)" htmlFor="chem_mg" required>
              <Input
                id="chem_mg"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.magnesium}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    magnesium: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Soufre (S)" htmlFor="chem_s" required>
              <Input
                id="chem_s"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.sulfur}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    sulfur: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Fer (Fe)" htmlFor="chem_fe" required>
              <Input
                id="chem_fe"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.iron}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    iron: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Manganèse (Mn)" htmlFor="chem_mn" required>
              <Input
                id="chem_mn"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.manganese}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    manganese: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Zinc (Zn)" htmlFor="chem_zn" required>
              <Input
                id="chem_zn"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.zinc}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    zinc: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Cuivre (Cu)" htmlFor="chem_cu" required>
              <Input
                id="chem_cu"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.copper}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    copper: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Bore (B)" htmlFor="chem_b" required>
              <Input
                id="chem_b"
                type="number"
                step={0.1}
                min={0}
                value={formData.chemical.boron}
                onChange={(e) => setFormData({
                  ...formData,
                  chemical: {
                    ...formData.chemical,
                    boron: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>
          </div>
        </div>

        {/* Biological Properties */}
        <div>
          <h4 className="font-medium mb-4">Propriétés Biologiques</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Microorganismes (UFC/g)" htmlFor="bio_micro" required>
              <Input
                id="bio_micro"
                type="number"
                step={1000}
                min={0}
                value={formData.biological.microorganisms}
                onChange={(e) => setFormData({
                  ...formData,
                  biological: {
                    ...formData.biological,
                    microorganisms: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Vers de terre (nb/m²)" htmlFor="bio_worms" required>
              <Input
                id="bio_worms"
                type="number"
                step={1}
                min={0}
                value={formData.biological.earthworms}
                onChange={(e) => setFormData({
                  ...formData,
                  biological: {
                    ...formData.biological,
                    earthworms: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>

            <FormField label="Activité Organique (%)" htmlFor="bio_activity" required>
              <Input
                id="bio_activity"
                type="number"
                step={0.1}
                min={0}
                max={100}
                value={formData.biological.organicActivity}
                onChange={(e) => setFormData({
                  ...formData,
                  biological: {
                    ...formData.biological,
                    organicActivity: parseFloat(e.target.value)
                  }
                })}
                required
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SoilAnalysis;
