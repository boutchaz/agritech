import { useState } from 'react';
import type { Parcel } from '../types';
import type { SoilAnalysis } from '../types/analysis';

export function useParcelData() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  const addParcel = (name: string, boundary: number[][]) => {
    const newParcel: Parcel = {
      id: crypto.randomUUID(),
      name,
      boundary,
      soilData: {
        physical: {
          texture: 'Limono-sableuse',
          ph: 6.8,
          organicMatter: 2.5
        },
        chemical: {
          nitrogen: 1.2,
          phosphorus: 0.8,
          potassium: 1.5
        },
        recommendations: [
          'Apport de compost recommandé',
          'Chaulage nécessaire',
          'Fertilisation NPK à prévoir'
        ]
      },
      climateData: {
        temperature: {
          current: 22,
          min: 15,
          max: 28,
          average: 21
        },
        humidity: {
          current: 65,
          average: 70
        },
        rainfall: {
          lastWeek: 25,
          lastMonth: 85,
          annual: 850
        },
        wind: {
          speed: 12,
          direction: 'NO'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setParcels(prev => [...prev, newParcel]);
    setSelectedParcel(newParcel);
  };

  const updateParcelSoilData = (parcelId: string, soilData: SoilAnalysis) => {
    setParcels(prev => prev.map(parcel => {
      if (parcel.id === parcelId) {
        const updatedParcel = {
          ...parcel,
          soilData,
          updatedAt: new Date()
        };
        if (selectedParcel?.id === parcelId) {
          setSelectedParcel(updatedParcel);
        }
        return updatedParcel;
      }
      return parcel;
    }));
  };

  return {
    parcels,
    selectedParcel,
    setSelectedParcel,
    addParcel,
    updateParcelSoilData
  };
}