import React, { useState, useEffect, useRef } from "react";
import {
  Satellite,
  TrendingUp,
  Download,
  BarChart3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Check,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Image,
  Thermometer,
  X,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { useSatelliteIndices } from "../hooks/useSatelliteIndices";
import {
  TimeSeriesResponse,
  IndexCalculationResponse,
  ExportFormat,
} from "../services/satelliteIndicesService";
import TimeSeriesChart from "./TimeSeriesChart";
import MultiIndexChart from "./MultiIndexChart";
import { useTifUpload } from "../hooks/useTifUpload";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type DataExportFormat = "JSON" | "CSV" | "PDF";
type ImageExportFormat = ExportFormat;

interface Parcel {
  id: string;
  name: string;
  boundary?: number[][];
  tif_image_url?: string | null;
}

interface SatelliteIndicesProps {
  parcel: Parcel;
}

const SatelliteIndices: React.FC<SatelliteIndicesProps> = ({ parcel }) => {
  const {
    calculateIndices,
    getTimeSeries,
    exportIndexMap,
    exportTimeSeries,
    loading,
    error,
    availableIndices,
    loadAvailableIndices,
  } = useSatelliteIndices();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [selectedIndex, setSelectedIndex] = useState<string>("NDVI");
  const [selectedIndices, setSelectedIndices] = useState<string[]>(["NDVI"]);
  const [timeRange, setTimeRange] = useState<
    "30d" | "90d" | "6m" | "1y" | "2y"
  >("2y");
  const [indicesData, setIndicesData] =
    useState<IndexCalculationResponse | null>(null);
  const [timeSeriesData, setTimeSeriesData] =
    useState<TimeSeriesResponse | null>(null);
  const [multiTimeSeriesData, setMultiTimeSeriesData] = useState<
    Record<string, TimeSeriesResponse>
  >({});
  const [activeTab, setActiveTab] = useState<"current" | "timeseries">(
    "current",
  );
  const [chartMode, setChartMode] = useState<"single" | "multi">("single");
  const [showIndexSelector, setShowIndexSelector] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemperatureOverlay, setShowTemperatureOverlay] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // TIF Image state
  const [tifImageUrl, setTifImageUrl] = useState<string | null>(
    parcel.tif_image_url || null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TIF upload hook
  const { uploadTif, removeTif, isUploading, uploadProgress } = useTifUpload({
    parcelId: parcel.id,
    parcelName: parcel.name,
    onSuccess: (imageUrl) => {
      setTifImageUrl(imageUrl);
    },
  });

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    loadAvailableIndices();
  }, [loadAvailableIndices]);

  useEffect(() => {
    if (availableIndices.length > 0 && !selectedIndex) {
      setSelectedIndex(availableIndices[0]);
    }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [availableIndices, selectedIndex]);

  const timeSeriesIndices = Array.from(new Set([...availableIndices, "NIRvP"]));

  useEffect(() => {
    if (
      activeTab === "current" &&
      availableIndices.length > 0 &&
      !availableIndices.includes(selectedIndex)
    ) {
      setSelectedIndex(availableIndices[0]);
    }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [activeTab, availableIndices, selectedIndex]);

  const getDateRange = (range: string) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "6m":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "2y":
        startDate.setFullYear(endDate.getFullYear() - 2);
        break;
    }

    return {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    };
  };

  const handleCalculateCurrentIndices = async () => {
    if (!parcel.boundary || parcel.boundary.length === 0) {
      toast.error(
        "Cette parcelle n'a pas de limites géographiques définies. Veuillez d'abord définir les limites sur la carte.",
      );
      return;
    }

    try {
      const dateRange = getDateRange("30d"); // Last 30 days for current values
      const result = await calculateIndices(
        parcel.boundary,
        parcel.name,
        availableIndices,
        dateRange,
      );
      setIndicesData(result);
    } catch (err) {
      console.error("Error calculating indices:", err);
    }
  };

  const handleGetTimeSeries = async () => {
    if (!parcel.boundary || parcel.boundary.length === 0) {
      toast.error(
        "Cette parcelle n'a pas de limites géographiques définies. Veuillez d'abord définir les limites sur la carte.",
      );
      return;
    }

    try {
      const dateRange = getDateRange(timeRange);

      if (chartMode === "multi") {
        // Fetch data for multiple indices
        const results: Record<string, TimeSeriesResponse> = {};

        // Use Promise.all for parallel fetching
        const promises = selectedIndices.map(async (index) => {
          const result = await getTimeSeries(
            parcel.boundary || [],
            parcel.name,
            index,
            dateRange,
          );
          return { index, result };
        });

        const responses = await Promise.all(promises);
        responses.forEach(({ index, result }) => {
          results[index] = result;
        });

        setMultiTimeSeriesData(results);
      } else {
        // Single index mode
        const result = await getTimeSeries(
          parcel.boundary,
          parcel.name,
          selectedIndex,
          dateRange,
        );
        setTimeSeriesData(result);
      }
    } catch (err) {
      console.error("Error getting time series:", err);
    }
  };

  const handleExportMap = async (format: ImageExportFormat = "GeoTIFF") => {
    if (!parcel.boundary || parcel.boundary.length === 0) {
      toast.error("Cette parcelle n'a pas de limites géographiques définies.");
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const result = await exportIndexMap(
        parcel.boundary,
        parcel.name,
        today,
        selectedIndex,
        { format },
      );

      // Get file extension based on format
      const extensions: Record<string, string> = {
        GeoTIFF: "tif",
        PNG: "png",
        JPEG: "jpg",
        JSON: "json",
        CSV: "csv",
        PDF: "pdf",
      };
      const ext = extensions[format] || "tif";

      // Create a temporary link to download the file
      const link = document.createElement("a");
      link.href = result.download_url;
      link.download = `${parcel.name}_${selectedIndex}_${today}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (err) {
      console.error("Error exporting map:", err);
    }
  };

  const handleExportData = async (format: DataExportFormat) => {
    if (!timeSeriesData) {
      toast.warning(
        "Veuillez d'abord charger les données de la série temporelle.",
      );
      return;
    }

    try {
      await exportTimeSeries(timeSeriesData, format, parcel.name);
      setShowExportMenu(false);
    } catch (err) {
      console.error("Error exporting data:", err);
    }
  };

  const getIndexColor = (index: string, value?: number) => {
    if (value !== undefined) {
      switch (index) {
        case "NDVI":
          if (value > 0.6) return "text-green-600 dark:text-green-400";
          if (value > 0.3) return "text-yellow-600 dark:text-yellow-400";
          return "text-red-600 dark:text-red-400";
        default:
          return "text-blue-600 dark:text-blue-400";
      }
    }

    // Return chart colors when value is not provided
    const chartColors: Record<string, string> = {
      NDVI: "#22c55e", // green
      NDRE: "#eab308", // yellow
      NDMI: "#3b82f6", // blue
      MNDWI: "#06b6d4", // cyan
      GCI: "#10b981", // emerald
      SAVI: "#f59e0b", // amber
      OSAVI: "#8b5cf6", // violet
      MSAVI2: "#ec4899", // pink
      NIRv: "#f97316", // orange
      EVI: "#0ea5e9", // sky
      NIRvP: "#9333ea", // violet
      MSI: "#ef4444", // red
      MCARI: "#a855f7", // purple
      TCARI: "#14b8a6", // teal
    };
    return chartColors[index] || "#6366f1"; // indigo as default
  };

  const toggleIndexSelection = (index: string) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        // Don't allow deselecting if it's the only one selected
        if (prev.length === 1) return prev;
        return prev.filter((i) => i !== index);
      } else {
        // Maximum 5 indices for performance
        if (prev.length >= 5) {
          toast.warning(
            "Maximum 5 indices peuvent être affichés simultanément",
          );
          return prev;
        }
        return [...prev, index];
      }
    });
  };

  const getIndexDescription = (index: string) => {
    const descriptions: Record<string, string> = {
      NDVI: "Indice de végétation différentiel normalisé - Santé générale de la végétation",
      NDRE: "Indice de végétation différentiel normalisé rouge-bord - Stress végétal",
      NDMI: "Indice d'humidité différentiel normalisé - Contenu en eau",
      GCI: "Indice de chlorophylle verte - Activité photosynthétique",
      SAVI: "Indice de végétation ajusté au sol - Végétation clairsemée",
      MNDWI: "Indice d'eau différentiel normalisé modifié - Détection de l'eau",
      OSAVI: "Indice de végétation ajusté au sol optimisé",
      MSAVI2: "Indice de végétation ajusté au sol modifié 2",
      NIRv: "Indice NIRv - Réflectance proche infrarouge de la végétation",
      EVI: "Indice de végétation amélioré - adapté aux couverts denses",
      NIRvP: "Produit de NIRv et PAR - proxy de productivité photosynthétique",
      MSI: "Indice de stress hydrique",
      MCARI: "Indice de chlorophylle résistant à l'atmosphère modifié",
      TCARI: "Indice de chlorophylle résistant à l'atmosphère transformé",
    };
    return descriptions[index] || "Indice de végétation";
  };

  if (!parcel.boundary || parcel.boundary.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Satellite className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Indices Satellites
          </h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Limites géographiques non définies
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Veuillez d'abord définir les limites de cette parcelle sur la carte
            pour accéder aux données satellites.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Satellite className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Indices Satellites
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {(activeTab === "timeseries"
              ? timeSeriesIndices
              : availableIndices
            ).map((index) => (
              <option key={index} value={index}>
                {index}
              </option>
            ))}
          </select>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-1 px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Importer image TIF depuis drone"
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Image className="h-3 w-3" />
            )}
            <span>{tifImageUrl ? "Remplacer TIF" : "Importer TIF"}</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".tif,.tiff,image/tiff,image/geotiff"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadTif(file);
              }
            }}
          />
          <Button
            onClick={() => window.location.reload()}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <Button
          onClick={() => setActiveTab("current")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "current"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Valeurs Actuelles
        </Button>
        <Button
          onClick={() => setActiveTab("timeseries")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "timeseries"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Série Temporelle
        </Button>
      </div>

      {/* TIF Image Section */}
      {tifImageUrl && (
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Image Drone
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Image orthomosaïque GeoTIFF
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => window.open(tifImageUrl, "_blank")}
                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                title="Ouvrir en plein écran"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  showConfirm("Êtes-vous sûr de vouloir supprimer cette image ?", () => {
                    removeTif();
                    setTifImageUrl(null);
                  })
                }}
                disabled={isUploading}
                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Supprimer l'image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image Preview */}
          <div
            className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
            style={{ maxHeight: "300px" }}
          >
            <img
              src={tifImageUrl}
              alt="Image drone de la parcelle"
              className="w-full h-auto object-contain cursor-pointer"
              onClick={() => window.open(tifImageUrl, "_blank")}
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml," +
                  encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">Image non disponible</text></svg>',
                  );
              }}
            />
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Importation en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {error}
            </span>
          </div>
        </div>
      )}

      {/* Current Values Tab */}
      {activeTab === "current" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getIndexDescription(selectedIndex)}
            </p>
            <Button variant="blue" onClick={handleCalculateCurrentIndices} disabled={loading} className="flex items-center space-x-2 px-4 py-2 rounded-md disabled:cursor-not-allowed" >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              <span>Calculer</span>
            </Button>
          </div>

          {indicesData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {indicesData.indices.map((indexData) => (
                <div
                  key={indexData.index}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {indexData.index}
                  </div>
                  <div
                    className={`text-2xl font-bold ${getIndexColor(indexData.index, indexData.value)}`}
                  >
                    {indexData.value.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(indexData.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Time Series Tab */}
      {activeTab === "timeseries" && (
        <div className="space-y-4">
          {/* Controls Row */}
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex items-center gap-4">
              {/* Chart Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mode d'affichage
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                  <Button
                    onClick={() => setChartMode("single")}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      chartMode === "single"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Indice unique
                  </Button>
                  <Button
                    onClick={() => setChartMode("multi")}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      chartMode === "multi"
                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Multi-indices
                  </Button>
                </div>
              </div>

              {/* Time Range Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Période
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">3 derniers mois</option>
                  <option value="6m">6 derniers mois</option>
                  <option value="1y">1 dernière année</option>
                  <option value="2y">2 dernières années</option>
                </select>
              </div>

              {/* Index Selector for Single Mode */}
              {chartMode === "single" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Indice
                  </label>
                  <select
                    value={selectedIndex}
                    onChange={(e) => setSelectedIndex(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {timeSeriesIndices.map((index) => (
                      <option key={index} value={index}>
                        {index}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multi-Index Selector Button */}
              {chartMode === "multi" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Indices ({selectedIndices.length}/5)
                  </label>
                  <Button
                    onClick={() => setShowIndexSelector(!showIndexSelector)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Sélectionner les indices
                  </Button>
                </div>
              )}

              {/* Temperature Overlay Toggle */}
              {chartMode === "single" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Température
                  </label>
                  <Button
                    onClick={() =>
                      setShowTemperatureOverlay(!showTemperatureOverlay)
                    }
                    className={`flex items-center gap-2 px-3 py-2 border rounded-md transition-colors ${
                      showTemperatureOverlay
                        ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                    title="Afficher la température au moment du passage satellite (11h)"
                  >
                    <Thermometer className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {showTemperatureOverlay ? "Masquer" : "Afficher"}
                    </span>
                  </Button>
                </div>
              )}
            </div>

            {/* Load Button */}
            <Button variant="green" onClick={handleGetTimeSeries} disabled={ loading || (chartMode === "multi" && selectedIndices.length === 0) } className="flex items-center space-x-2 px-4 py-2 rounded-md disabled:cursor-not-allowed" >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span>Charger Série</span>
            </Button>
          </div>

          {/* Multi-Index Selector Panel */}
          {chartMode === "multi" && showIndexSelector && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Sélectionnez les indices à comparer
                </h4>
                <Button
                  onClick={() => setShowIndexSelector(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </Button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {timeSeriesIndices.map((index) => {
                  const isSelected = selectedIndices.includes(index);
                  return (
                    <Button
                      key={index}
                      onClick={() => toggleIndexSelection(index)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-500"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getIndexColor(index) }}
                        />
                        {index}
                      </span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single Index Chart */}
          {chartMode === "single" && timeSeriesData && (
            <div className="space-y-4">
              {/* Statistics */}
              {timeSeriesData.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Moyenne
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeSeriesData.statistics.mean.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Médiane
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeSeriesData.statistics.median.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Min
                    </div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {timeSeriesData.statistics.min.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Max
                    </div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {timeSeriesData.statistics.max.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Écart-type
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeSeriesData.statistics.std.toFixed(3)}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Series Chart */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Graphique d'évolution
                  </h4>
                  {/* Export Dropdown */}
                  <div className="relative" ref={exportMenuRef}>
                    <Button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={loading}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Exporter</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>

                    {showExportMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                        <div className="py-1">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Données
                          </div>
                          <Button
                            onClick={() => handleExportData("JSON")}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <FileJson className="h-4 w-4 mr-3 text-blue-500" />
                            JSON
                          </Button>
                          <Button
                            onClick={() => handleExportData("CSV")}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-3 text-green-500" />
                            CSV / Excel
                          </Button>
                          <Button
                            onClick={() => handleExportData("PDF")}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <FileText className="h-4 w-4 mr-3 text-red-500" />
                            PDF / Rapport
                          </Button>

                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Image Satellite
                          </div>
                          <Button
                            onClick={() => handleExportMap("GeoTIFF")}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Image className="h-4 w-4 mr-3 text-purple-500" />
                            GeoTIFF (SIG)
                          </Button>
                          <Button
                            onClick={() => handleExportMap("PNG")}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Image className="h-4 w-4 mr-3 text-orange-500" />
                            PNG (Image)
                          </Button>
                          <Button
                            onClick={() => handleExportMap("JPEG")}
                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Image className="h-4 w-4 mr-3 text-amber-500" />
                            JPEG (Compressé)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <TimeSeriesChart
                  data={timeSeriesData.data}
                  index={selectedIndex}
                  showTemperature={showTemperatureOverlay}
                  temperatureData={
                    showTemperatureOverlay
                      ? timeSeriesData.data.map((point) => {
                          // Simulated temperature at 11:00 (satellite pass time)
                          // In production, this would come from a weather API
                          const date = new Date(point.date);
                          const month = date.getMonth();
                          // Approximate temperature based on month (Northern Hemisphere pattern)
                          // Summer (June-Aug): 25-35°C, Winter (Dec-Feb): 5-15°C
                          const baseTemp =
                            15 + 10 * Math.sin(((month - 3) * Math.PI) / 6);
                          const dailyVariation = ((point.date.charCodeAt(point.date.length - 1) % 100) / 100 - 0.5) * 8;
                          const temperature = baseTemp + dailyVariation;
                          return {
                            date: point.date,
                            temperature: Math.round(temperature * 10) / 10,
                            temp_min: temperature - 5,
                            temp_max: temperature + 8,
                          };
                        })
                      : []
                  }
                />

                {/* Data table (collapsed by default) */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Voir les données détaillées ({timeSeriesData.data.length}{" "}
                    points)
                  </summary>
                  <div className="mt-2 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {timeSeriesData.data.map((point, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(point.date).toLocaleDateString()}
                          </span>
                          <span
                            className={`font-medium ${getIndexColor(selectedIndex, point.value)}`}
                          >
                            {point.value.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Multi-Index Chart */}
          {chartMode === "multi" &&
            Object.keys(multiTimeSeriesData).length > 0 && (
              <div className="space-y-4">
                {/* Combined Statistics */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Statistiques comparatives
                  </h4>
                  {/* Mobile-friendly stacked cards */}
                  <div className="space-y-3 md:hidden">
                    {Object.entries(multiTimeSeriesData).map(
                      ([index, data]) => (
                        <div
                          key={index}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 p-3 bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getIndexColor(index) }}
                            />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {index}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Moyenne
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {data.statistics?.mean.toFixed(3) || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Min
                              </span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {data.statistics?.min.toFixed(3) || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Max
                              </span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {data.statistics?.max.toFixed(3) || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">
                                Écart-type
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {data.statistics?.std.toFixed(3) || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {/* Desktop table */}
                  <div className="overflow-x-auto hidden md:block">
                    <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Indice
                          </TableHead>
                          <TableHead className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Moyenne
                          </TableHead>
                          <TableHead className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Min
                          </TableHead>
                          <TableHead className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Max
                          </TableHead>
                          <TableHead className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Écart-type
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {Object.entries(multiTimeSeriesData).map(
                          ([index, data]) => (
                            <TableRow key={index}>
                              <TableCell className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                <span className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor: getIndexColor(index),
                                    }}
                                  />
                                  {index}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                                {data.statistics?.mean.toFixed(3) || "-"}
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center text-sm text-green-600 dark:text-green-400">
                                {data.statistics?.min.toFixed(3) || "-"}
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center text-sm text-red-600 dark:text-red-400">
                                {data.statistics?.max.toFixed(3) || "-"}
                              </TableCell>
                              <TableCell className="px-4 py-2 text-center text-sm text-gray-900 dark:text-white">
                                {data.statistics?.std.toFixed(3) || "-"}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Multi-Index Chart */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Comparaison des indices
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Object.keys(multiTimeSeriesData).length} indices
                        affichés
                      </span>
                      <Button
                        onClick={() => handleExportMap("GeoTIFF")}
                        disabled={loading}
                        className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" />
                        <span>GeoTIFF</span>
                      </Button>
                    </div>
                  </div>

                  <MultiIndexChart
                    datasets={Object.entries(multiTimeSeriesData).map(
                      ([index, data]) => ({
                        index,
                        data: data.data,
                        color: getIndexColor(index),
                        visible: true,
                      }),
                    )}
                  />
                </div>
              </div>
            )}
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default SatelliteIndices;
