import React from 'react';
import SoilAnalysisFormRHF from './SoilAnalysisFormRHF';
import type { SoilAnalysisData } from '../../types/analysis';
import type { SoilAnalysisFormValues } from '../../schemas/analysisSchemas';

interface Parcel {
  id: string;
  name: string;
  soil_type?: string | null;
}

interface SoilAnalysisFormProps {
  onSave: (data: SoilAnalysisData, analysisDate: string, laboratory?: string, notes?: string) => void;
  onCancel: () => void;
  selectedParcel?: Parcel | null;
}

const SoilAnalysisForm: React.FC<SoilAnalysisFormProps> = ({ onSave, onCancel, selectedParcel }) => {
  const handleSave = async (values: SoilAnalysisFormValues) => {
    const { analysisDate, laboratory, notes, ...data } = values;
    onSave(data, analysisDate, laboratory || undefined, notes || undefined);
  };

  return (
    <SoilAnalysisFormRHF
      onSave={handleSave}
      onCancel={onCancel}
      selectedParcel={selectedParcel}
    />
  );
};

export default SoilAnalysisForm;
