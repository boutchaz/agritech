import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, Calendar, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Base reports that are always available
  const baseReports: ReportType[] = [
    {
      id: 'soil-analysis',
      name: 'Analyses de Sol',
      description: 'Rapports d\'analyses de sol',
      types: [
        {
          id: 'complete',
          name: 'Rapport d\'analyses complet',
          description: 'Toutes les analyses de sol avec recommandations',
          columns: ['Date', 'Parcelle', 'pH', 'Matière organique', 'NPK', 'Recommandations'],
          getData: async (startDate, endDate) => {
            const { data } = await supabase
              .from('soil_analyses')
              .select(`
                analysis_date,
                physical,
                chemical,
                notes,
                parcels!inner(name)
              `)
              .gte('analysis_date', startDate)
              .lte('analysis_date', endDate);

            return (data || []).map(analysis => ({
              'Date': new Date(analysis.analysis_date).toLocaleDateString(),
              'Parcelle': analysis.parcels.name,
              'pH': analysis.physical.ph,
              'Matière organique': `${analysis.physical.organicMatter}%`,
              'NPK': `${analysis.chemical.nitrogen}-${analysis.chemical.phosphorus}-${analysis.chemical.potassium}`,
              'Recommandations': analysis.notes
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

  const generatePDF = async (reportType: ReportType['types'][0]) => {
    try {
      setLoading(reportType.id);
      const data = await reportType.getData(dateRange.startDate, dateRange.endDate);
      
      const doc = new jsPDF();
      doc.setFont('helvetica');
      
      // Add title
      doc.setFontSize(20);
      doc.text(reportType.name, 14, 20);
      
      // Add date range
      doc.setFontSize(10);
      doc.text(`Période: du ${new Date(dateRange.startDate).toLocaleDateString()} au ${new Date(dateRange.endDate).toLocaleDateString()}`, 14, 30);
      
      // Add table
      (doc as any).autoTable({
        startY: 40,
        head: [reportType.columns],
        body: data.map(item => reportType.columns.map(col => item[col])),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [34, 197, 94] }
      });
      
      doc.save(`${reportType.id}_${dateRange.startDate}_${dateRange.endDate}.pdf`);
    } catch (err) {
      setError('Erreur lors de la génération du PDF');
      console.error(err);
    } finally {
      setLoading(null);
      setShowModal(false);
    }
  };

  const generateExcel = async (reportType: ReportType['types'][0]) => {
    try {
      setLoading(reportType.id);
      const data = await reportType.getData(dateRange.startDate, dateRange.endDate);
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportType.name);
      
      XLSX.writeFile(wb, `${reportType.id}_${dateRange.startDate}_${dateRange.endDate}.xlsx`);
    } catch (err) {
      setError('Erreur lors de la génération du fichier Excel');
      console.error(err);
    } finally {
      setLoading(null);
      setShowModal(false);
    }
  };

  const handleDownload = () => {
    if (!selectedReport || !selectedReportType) return;
    
    const reportType = selectedReport.types.find(t => t.id === selectedReportType);
    if (!reportType) return;

    format === 'pdf' ? generatePDF(reportType) : generateExcel(reportType);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Rapports
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(report => (
          <div
            key={report.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
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
              onClick={() => {
                setSelectedReport(report);
                setSelectedReportType(report.types[0].id);
                setShowModal(true);
              }}
              disabled={loading === report.id}
              className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === report.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  <span>Télécharger</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Download Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 overflow-hidden shadow-xl ring-1 ring-black/10 dark:ring-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Télécharger {selectedReport.name}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type de rapport
                </label>
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                >
                  {selectedReport.types.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedReport.types.find(t => t.id === selectedReportType)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormat('pdf')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border ${
                      format === 'pdf'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('excel')}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-lg border ${
                      format === 'excel'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Période
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Date début
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        startDate: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({
                        ...dateRange,
                        endDate: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  format === 'pdf'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
