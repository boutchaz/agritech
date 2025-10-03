import React from 'react';
import { FileText, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Module } from '../types';

interface ReportType {
  id: string;
  name: string;
  description: string;
  moduleId?: string;
  types: {
    id: string;
    name: string;
    description: string;
    columns: string[];
    getData: (startDate: string, endDate: string) => Promise<any[]>;
  }[];
}

interface ReportsProps {
  activeModules?: Module[];
}

const Reports: React.FC<ReportsProps> = ({ activeModules = [] }) => {

  // Base reports that are always available
  const baseReports: ReportType[] = [
    {
      id: 'analyses',
      name: 'Analyses (Sol, Plante, Eau)',
      description: 'Rapports d\'analyses de sol, plante et eau',
      types: [
        {
          id: 'complete',
          name: 'Rapport d\'analyses complet',
          description: 'Toutes les analyses (sol, plante, eau)',
          columns: ['Date', 'Parcelle', 'Type', 'Laboratoire', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('analyses')
              .select(`
                analysis_date,
                analysis_type,
                laboratory,
                notes,
                parcels!inner(name)
              `)
              .gte('analysis_date', startDate)
              .lte('analysis_date', endDate)
              .order('analysis_date', { ascending: false });

            return (data || []).map(analysis => ({
              'Date': new Date(analysis.analysis_date).toLocaleDateString(),
              'Parcelle': analysis.parcels.name,
              'Type': analysis.analysis_type === 'soil' ? 'Sol' : analysis.analysis_type === 'plant' ? 'Plante' : 'Eau',
              'Laboratoire': analysis.laboratory || 'N/A',
              'Notes': analysis.notes || ''
            }));
          }
        },
        {
          id: 'soil-only',
          name: 'Analyses de sol uniquement',
          description: 'Analyses de sol avec données détaillées',
          columns: ['Date', 'Parcelle', 'pH', 'Texture', 'N-P-K (ppm)', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('analyses')
              .select(`
                analysis_date,
                data,
                notes,
                parcels!inner(name)
              `)
              .eq('analysis_type', 'soil')
              .gte('analysis_date', startDate)
              .lte('analysis_date', endDate)
              .order('analysis_date', { ascending: false });

            return (data || []).map(analysis => ({
              'Date': new Date(analysis.analysis_date).toLocaleDateString(),
              'Parcelle': analysis.parcels.name,
              'pH': analysis.data.ph_level || 'N/A',
              'Texture': analysis.data.texture || 'N/A',
              'N-P-K (ppm)': `${analysis.data.nitrogen_ppm || 0}-${analysis.data.phosphorus_ppm || 0}-${analysis.data.potassium_ppm || 0}`,
              'Notes': analysis.notes || ''
            }));
          }
        }
      ]
    },
    {
      id: 'stock',
      name: 'Stock',
      description: 'Rapports de gestion du stock',
      types: [
        {
          id: 'inventory',
          name: 'État du stock',
          description: 'État actuel du stock',
          columns: ['Produit', 'Catégorie', 'Quantité', 'Valeur', 'Dernier achat'],
          getData: async () => {
            const { data } = await supabase
              .from('inventory')
              .select(`
                name,
                quantity,
                unit,
                price_per_unit,
                last_purchase_date,
                product_categories!inner(name)
              `);

            return (data || []).map(item => ({
              'Produit': item.name,
              'Catégorie': item.product_categories.name,
              'Quantité': `${item.quantity} ${item.unit}`,
              'Valeur': `${(item.quantity * item.price_per_unit).toFixed(2)} DH`,
              'Dernier achat': item.last_purchase_date ? new Date(item.last_purchase_date).toLocaleDateString() : '-'
            }));
          }
        },
        {
          id: 'movements',
          name: 'Mouvements de stock',
          description: 'Entrées et sorties de stock',
          columns: ['Date', 'Produit', 'Type', 'Quantité', 'Valeur'],
          getData: async (startDate, endDate) => {
            const [purchases, applications] = await Promise.all([
              supabase
                .from('purchases')
                .select(`
                  purchase_date,
                  quantity,
                  total_price,
                  inventory!inner(name, unit)
                `)
                .gte('purchase_date', startDate)
                .lte('purchase_date', endDate),
              supabase
                .from('product_applications')
                .select(`
                  application_date,
                  quantity_used,
                  inventory!inner(name, unit, price_per_unit)
                `)
                .gte('application_date', startDate)
                .lte('application_date', endDate)
            ]);

            return [
              ...(purchases.data || []).map(p => ({
                'Date': new Date(p.purchase_date).toLocaleDateString(),
                'Produit': p.inventory.name,
                'Type': 'Entrée',
                'Quantité': `${p.quantity} ${p.inventory.unit}`,
                'Valeur': `${p.total_price.toFixed(2)} DH`
              })),
              ...(applications.data || []).map(a => ({
                'Date': new Date(a.application_date).toLocaleDateString(),
                'Produit': a.inventory.name,
                'Type': 'Sortie',
                'Quantité': `${a.quantity_used} ${a.inventory.unit}`,
                'Valeur': `${(a.quantity_used * a.inventory.price_per_unit).toFixed(2)} DH`
              }))
            ];
          }
        }
      ]
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
      description: 'Rapports sur les infrastructures',
      types: [
        {
          id: 'complete',
          name: 'Rapport complet',
          description: 'État de toutes les infrastructures',
          columns: ['Structure', 'Type', 'État', 'Installation', 'Dernière maintenance'],
          getData: async () => {
            const { data } = await supabase
              .from('structures')
              .select(`
                name,
                type,
                condition,
                installation_date,
                maintenance_history(
                  maintenance_date
                )
              `);

            return (data || []).map(structure => ({
              'Structure': structure.name,
              'Type': structure.type,
              'État': structure.condition,
              'Installation': new Date(structure.installation_date).toLocaleDateString(),
              'Dernière maintenance': structure.maintenance_history?.[0]?.maintenance_date
                ? new Date(structure.maintenance_history[0].maintenance_date).toLocaleDateString()
                : '-'
            }));
          }
        }
      ]
    },
    {
      id: 'employees',
      name: 'Personnel',
      description: 'Rapports sur le personnel',
      types: [
        {
          id: 'employees',
          name: 'Liste des salariés',
          description: 'Liste complète des salariés',
          columns: ['Nom', 'Prénom', 'CIN', 'Poste', 'Date d\'embauche', 'Salaire'],
          getData: async () => {
            const { data } = await supabase
              .from('employees')
              .select('*')
              .order('last_name');

            return (data || []).map(employee => ({
              'Nom': employee.last_name,
              'Prénom': employee.first_name,
              'CIN': employee.cin,
              'Poste': employee.position,
              'Date d\'embauche': new Date(employee.hire_date).toLocaleDateString(),
              'Salaire': `${employee.salary.toFixed(2)} DH`
            }));
          }
        },
        {
          id: 'day-laborers',
          name: 'Liste des ouvriers',
          description: 'Liste des ouvriers journaliers',
          columns: ['Nom', 'Prénom', 'CIN', 'Taux journalier', 'Spécialités'],
          getData: async () => {
            const { data } = await supabase
              .from('day_laborers')
              .select('*')
              .order('last_name');

            return (data || []).map(laborer => ({
              'Nom': laborer.last_name,
              'Prénom': laborer.first_name,
              'CIN': laborer.cin,
              'Taux journalier': `${laborer.daily_rate.toFixed(2)} DH`,
              'Spécialités': laborer.specialties?.join(', ') || '-'
            }));
          }
        }
      ]
    }
  ];

  // Module-specific reports
  const moduleReports: Record<string, ReportType> = {
    'fruit-trees': {
      id: 'fruit-trees',
      name: 'Arbres Fruitiers',
      description: 'Rapports sur la gestion des arbres fruitiers',
      moduleId: 'fruit-trees',
      types: [
        {
          id: 'fertilization',
          name: 'Rapport de fertilisation',
          description: 'Historique des applications d\'engrais',
          columns: ['Date', 'Parcelle', 'Produit', 'Quantité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('product_applications')
              .select(`
                application_date,
                quantity_used,
                notes,
                inventory!inner(name, unit),
                parcels!inner(name)
              `)
              .gte('application_date', startDate)
              .lte('application_date', endDate)
              .eq('inventory.category_id', 'fertilizer');

            return (data || []).map(app => ({
              'Date': new Date(app.application_date).toLocaleDateString(),
              'Parcelle': app.parcels.name,
              'Produit': app.inventory.name,
              'Quantité': `${app.quantity_used} ${app.inventory.unit}`,
              'Notes': app.notes
            }));
          }
        },
        {
          id: 'pruning',
          name: 'Rapport de taille',
          description: 'Suivi des opérations de taille',
          columns: ['Date', 'Parcelle', 'Type de taille', 'Équipe', 'Observations'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('work_records')
              .select(`
                work_date,
                task_description,
                notes,
                parcels!inner(name),
                day_laborers!inner(first_name, last_name)
              `)
              .gte('work_date', startDate)
              .lte('work_date', endDate)
              .eq('task_category', 'pruning');

            return (data || []).map(record => ({
              'Date': new Date(record.work_date).toLocaleDateString(),
              'Parcelle': record.parcels.name,
              'Type de taille': record.task_description,
              'Équipe': `${record.day_laborers.first_name} ${record.day_laborers.last_name}`,
              'Observations': record.notes
            }));
          }
        }
      ]
    },
    'mushrooms': {
      id: 'mushrooms',
      name: 'Myciculture',
      description: 'Rapports sur la production de champignons',
      moduleId: 'mushrooms',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production de champignons',
          columns: ['Date', 'Variété', 'Quantité', 'Qualité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('harvests')
              .select(`
                harvest_date,
                quantity,
                quality,
                notes,
                crops!inner(name, variety_id)
              `)
              .gte('harvest_date', startDate)
              .lte('harvest_date', endDate)
              .eq('crops.type', 'mushrooms');

            return (data || []).map(harvest => ({
              'Date': new Date(harvest.harvest_date).toLocaleDateString(),
              'Variété': harvest.crops.name,
              'Quantité': `${harvest.quantity} kg`,
              'Qualité': harvest.quality,
              'Notes': harvest.notes
            }));
          }
        }
      ]
    },
    'greenhouse': {
      id: 'greenhouse',
      name: 'Serres',
      description: 'Rapports sur les cultures sous serre',
      moduleId: 'greenhouse',
      types: [
        {
          id: 'climate',
          name: 'Rapport climatique',
          description: 'Suivi des conditions climatiques',
          columns: ['Date', 'Température', 'Humidité', 'CO2', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('climate_readings')
              .select('*')
              .gte('timestamp', startDate)
              .lte('timestamp', endDate)
              .eq('type', 'greenhouse');

            return (data || []).map(reading => ({
              'Date': new Date(reading.timestamp).toLocaleDateString(),
              'Température': `${reading.value}°C`,
              'Humidité': `${reading.humidity}%`,
              'CO2': `${reading.co2}ppm`,
              'Notes': reading.notes
            }));
          }
        }
      ]
    },
    'hydroponics': {
      id: 'hydroponics',
      name: 'Hydroponie',
      description: 'Rapports sur les cultures hydroponiques',
      moduleId: 'hydroponics',
      types: [
        {
          id: 'nutrients',
          name: 'Rapport solution nutritive',
          description: 'Suivi des solutions nutritives',
          columns: ['Date', 'pH', 'EC', 'Température', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('sensor_readings')
              .select('*')
              .gte('timestamp', startDate)
              .lte('timestamp', endDate)
              .eq('type', 'hydroponic');

            return (data || []).map(reading => ({
              'Date': new Date(reading.timestamp).toLocaleDateString(),
              'pH': reading.data.ph,
              'EC': `${reading.data.ec} mS/cm`,
              'Température': `${reading.data.temperature}°C`,
              'Notes': reading.notes
            }));
          }
        }
      ]
    },
    'market-gardening': {
      id: 'market-gardening',
      name: 'Maraîchage',
      description: 'Rapports sur les cultures maraîchères',
      moduleId: 'market-gardening',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production maraîchère',
          columns: ['Date', 'Culture', 'Quantité', 'Qualité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('harvests')
              .select(`
                harvest_date,
                quantity,
                quality,
                notes,
                crops!inner(name)
              `)
              .gte('harvest_date', startDate)
              .lte('harvest_date', endDate)
              .eq('crops.type', 'vegetable');

            return (data || []).map(harvest => ({
              'Date': new Date(harvest.harvest_date).toLocaleDateString(),
              'Culture': harvest.crops.name,
              'Quantité': `${harvest.quantity} kg`,
              'Qualité': harvest.quality,
              'Notes': harvest.notes
            }));
          }
        }
      ]
    },
    'aquaculture': {
      id: 'aquaculture',
      name: 'Pisciculture',
      description: 'Rapports sur les installations piscicoles',
      moduleId: 'aquaculture',
      types: [
        {
          id: 'water-quality',
          name: 'Rapport qualité de l\'eau',
          description: 'Suivi de la qualité de l\'eau',
          columns: ['Date', 'Température', 'pH', 'Oxygène', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('sensor_readings')
              .select('*')
              .gte('timestamp', startDate)
              .lte('timestamp', endDate)
              .eq('type', 'aquaculture');

            return (data || []).map(reading => ({
              'Date': new Date(reading.timestamp).toLocaleDateString(),
              'Température': `${reading.data.temperature}°C`,
              'pH': reading.data.ph,
              'Oxygène': `${reading.data.oxygen} mg/L`,
              'Notes': reading.notes
            }));
          }
        }
      ]
    },
    'beekeeping': {
      id: 'beekeeping',
      name: 'Apiculture',
      description: 'Rapports sur la gestion des ruches',
      moduleId: 'beekeeping',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production de miel',
          columns: ['Date', 'Ruche', 'Quantité', 'Type', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('harvests')
              .select(`
                harvest_date,
                quantity,
                quality,
                notes,
                crops!inner(name)
              `)
              .gte('harvest_date', startDate)
              .lte('harvest_date', endDate)
              .eq('crops.type', 'honey');

            return (data || []).map(harvest => ({
              'Date': new Date(harvest.harvest_date).toLocaleDateString(),
              'Ruche': harvest.crops.name,
              'Quantité': `${harvest.quantity} kg`,
              'Type': harvest.quality,
              'Notes': harvest.notes
            }));
          }
        }
      ]
    },
    'cattle': {
      id: 'cattle',
      name: 'Élevage Bovin',
      description: 'Rapports sur l\'élevage bovin',
      moduleId: 'cattle',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production laitière',
          columns: ['Date', 'Animal', 'Production', 'Qualité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('livestock')
              .select('*')
              .gte('date', startDate)
              .lte('date', endDate)
              .eq('type', 'cattle');

            return (data || []).map(record => ({
              'Date': new Date(record.date).toLocaleDateString(),
              'Animal': record.name,
              'Production': `${record.production} L`,
              'Qualité': record.quality,
              'Notes': record.notes
            }));
          }
        }
      ]
    },
    'camel': {
      id: 'camel',
      name: 'Élevage Camelin',
      description: 'Rapports sur l\'élevage de chameaux',
      moduleId: 'camel',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production laitière',
          columns: ['Date', 'Animal', 'Production', 'Qualité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('livestock')
              .select('*')
              .gte('date', startDate)
              .lte('date', endDate)
              .eq('type', 'camel');

            return (data || []).map(record => ({
              'Date': new Date(record.date).toLocaleDateString(),
              'Animal': record.name,
              'Production': `${record.production} L`,
              'Qualité': record.quality,
              'Notes': record.notes
            }));
          }
        }
      ]
    },
    'goat': {
      id: 'goat',
      name: 'Élevage Caprin',
      description: 'Rapports sur l\'élevage de chèvres',
      moduleId: 'goat',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production laitière',
          columns: ['Date', 'Animal', 'Production', 'Qualité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('livestock')
              .select('*')
              .gte('date', startDate)
              .lte('date', endDate)
              .eq('type', 'goat');

            return (data || []).map(record => ({
              'Date': new Date(record.date).toLocaleDateString(),
              'Animal': record.name,
              'Production': `${record.production} L`,
              'Qualité': record.quality,
              'Notes': record.notes
            }));
          }
        }
      ]
    },
    'laying-hens': {
      id: 'laying-hens',
      name: 'Poules Pondeuses',
      description: 'Rapports sur l\'élevage de poules pondeuses',
      moduleId: 'laying-hens',
      types: [
        {
          id: 'production',
          name: 'Rapport de production',
          description: 'Suivi de la production d\'œufs',
          columns: ['Date', 'Lot', 'Production', 'Qualité', 'Notes'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('livestock')
              .select('*')
              .gte('date', startDate)
              .lte('date', endDate)
              .eq('type', 'laying-hens');

            return (data || []).map(record => ({
              'Date': new Date(record.date).toLocaleDateString(),
              'Lot': record.name,
              'Production': `${record.production} œufs`,
              'Qualité': record.quality,
              'Notes': record.notes
            }));
          }
        }
      ]
    }
  };

  // Combine base reports with active module reports
  const reports = [
    ...baseReports,
    ...activeModules
      .filter(module => moduleReports[module.id])
      .map(module => moduleReports[module.id])
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Rapports
        </h2>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200 text-center">
          La génération de rapports sera implémentée dans le backend. Cette fonctionnalité est en cours de développement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(report => (
          <div
            key={report.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 opacity-50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-gray-500" />
                <div>
                  <h3 className="text-lg font-semibold">{report.name}</h3>
                  <p className="text-sm text-gray-500">{report.description}</p>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              <span>À venir</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
