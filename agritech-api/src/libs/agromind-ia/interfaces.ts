// ── Shared Sub-types ────────────────────────────────────────

export interface ParcelProfile {
  id?: string;
  name: string;
  area: number;
  areaUnit: string;
  cropType?: string;
  treeType?: string;
  variety?: string;
  rootstock?: string;
  plantingYear?: number;
  treeCount?: number;
  plantingSystem?: string;
  soilType?: string;
  irrigationType?: string;
  waterSource?: string;
}

export interface SoilAnalysisData {
  latestDate: string;
  phLevel?: number;
  ec?: number;
  texture?: string;
  organicMatter?: number;
  totalLimestone?: number;
  activeLimestone?: number;
  cec?: number;
  nitrogenPpm?: number;
  phosphorusPpm?: number;
  potassiumPpm?: number;
  calcium?: number;
  magnesium?: number;
  iron?: number;
  zinc?: number;
  manganese?: number;
  copper?: number;
  boron?: number;
}

export interface WaterAnalysisData {
  latestDate: string;
  ph?: number;
  ec?: number;
  sar?: number;
  sodium?: number;
  chlorides?: number;
  bicarbonates?: number;
  boron?: number;
  nitrates?: number;
  tds?: number;
}

export interface PlantAnalysisData {
  latestDate: string;
  nitrogenPercent?: number;
  phosphorusPercent?: number;
  potassiumPercent?: number;
  calcium?: number;
  magnesium?: number;
  iron?: number;
  zinc?: number;
  manganese?: number;
  boron?: number;
  copper?: number;
  sodium?: number;
  chloride?: number;
}

export interface YieldHistoryEntry {
  year: number;
  season?: string;
  yieldPerHa?: number;
  quantity?: number;
  unit?: string;
  qualityGrade?: string;
}

export interface OperationEntry {
  date: string;
  type: string;
  description?: string;
}

export interface PercentileSet {
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
}

export interface IndexLatestValues {
  ndvi?: number;
  nirv?: number;
  nirvp?: number;
  ndmi?: number;
  ndre?: number;
  msi?: number;
  evi?: number;
  msavi?: number;
  gci?: number;
}

// ── 1. Calibration Prompt Input ─────────────────────────────

export interface ParcelCalibrationInput {
  parcel: ParcelProfile;

  satelliteHistory: {
    period: { start: string; end: string };
    validScenes?: number;
    coverageMonths?: number;
    timeSeries?: Record<string, Array<{ date: string; value: number }>>;
    latestValues?: IndexLatestValues;
  };

  weather?: {
    period?: { start: string; end: string };
    temperatureSummary?: {
      avgMin?: number;
      avgMax?: number;
      avgMean?: number;
    };
    precipitationTotal?: number;
    frostDays?: number;
    drySpellsCount?: number;
    chillingHours?: number;
    gddCumulative?: number;
    extremeEvents?: Array<{ date: string; type: string; description: string }>;
  };

  soilAnalysis?: SoilAnalysisData;
  waterAnalysis?: WaterAnalysisData;
  plantAnalysis?: PlantAnalysisData;

  yieldHistory?: YieldHistoryEntry[];
  operationsHistory?: OperationEntry[];
}

// ── 2. Recommendations (Operational) Prompt Input ──────────

export interface CalibratedBaseline {
  confidenceScore: number;
  confidenceLevel: string;
  healthScore: number;
  yieldPotential: { low: number; high: number };
  alternanceStatus: string;
  soilManagementMode: string;
  percentiles: Record<string, PercentileSet>;
  phenologyProfile?: {
    detectedStages?: Array<{
      stage: string;
      averageDate: string;
      interAnnualVariability: string;
      associatedGDD: number;
    }>;
  };
  zoningProfile?: {
    zones?: Array<{
      class: string;
      label: string;
      percentSurface: number;
      location: string;
    }>;
  };
}

export interface OperationalParcelProfile extends ParcelProfile {
  density?: number;
  age?: number;
  nutritionOption?: string;
  productionTarget?: string;
}

export interface CurrentSatelliteData extends IndexLatestValues {
  date: string;
  cloudCover?: number;
  quality?: string;
  ndviPosition?: string;
  nirvPosition?: string;
  nirvpPosition?: string;
  ndmiPosition?: string;
  ndrePosition?: string;
  msiPosition?: string;
  eviPosition?: string;
  msaviPosition?: string;
  gciPosition?: string;
}

export interface OperationalWeatherData {
  recent: {
    tMin?: number;
    tMax?: number;
    tMean?: number;
    precipitation?: number;
    consecutiveDryDays?: number;
    humidity?: number;
    windSpeed?: number;
  };
  gddCumulativeSeason?: number;
  chillingHoursSeason?: number;
  waterBalance?: number;
  forecast?: Record<string, unknown>;
  forecastAlerts?: string;
}

export interface PhenologyStatus {
  currentBBCH?: string;
  description?: string;
  currentGDD?: number;
  deviationFromBaseline?: string;
  nextStage?: string;
  daysToNextStage?: number;
}

export interface ActiveRecommendation {
  status: string;
  type: string;
  title: string;
  issuedDate: string;
  evaluationDeadline: string;
}

export interface InventoryItem {
  product: string;
  quantity: number;
  unit: string;
  lowStock?: boolean;
}

export interface RecentOperation extends OperationEntry {
  product?: string;
  dose?: string;
}

export interface ParcelOperationalInput {
  parcel: OperationalParcelProfile;
  baseline: CalibratedBaseline;
  currentSatellite: CurrentSatelliteData;
  recentTrends?: Record<string, unknown>;
  sameperiodLastYear?: Record<string, unknown>;
  weather: OperationalWeatherData;
  phenology: PhenologyStatus;
  recentOperations?: RecentOperation[];
  inventory?: InventoryItem[];
  activeRecommendations?: ActiveRecommendation[];
  soilAnalysis?: SoilAnalysisData;
  waterAnalysis?: WaterAnalysisData;
  plantAnalysis?: PlantAnalysisData;
}

// ── 3. Annual Plan Prompt Input ────────────────────────────

export interface AnnualPlanParcelProfile extends OperationalParcelProfile {
  eyeOfPeacockSensitivity?: string;
  spacing?: string;
  surfacePerTree?: number;
  irrigationEfficiency?: number;
}

export interface AnnualPlanBaseline {
  confidenceScore: number;
  healthScore: number;
  yieldPotential: { low: number; high: number };
  alternanceStatus: string;
  soilManagementMode: string;
}

export interface AnnualPlanInput {
  parcel: AnnualPlanParcelProfile;
  season: string;
  baseline: AnnualPlanBaseline;
  soilAnalysis?: SoilAnalysisData;
  waterAnalysis?: WaterAnalysisData;
  plantAnalysis?: PlantAnalysisData;
  yieldHistory?: Array<{ year: number; yieldPerHa: number }>;
  historicalETo?: Record<string, number>;
  generationDate?: string;
}

// ── 4. Follow-Up Prompt Input ──────────────────────────────

export interface FollowUpRecommendation {
  id: string;
  category: string;
  title: string;
  initialDiagnosis: string;
  diagnosticConfidence: string;
  action: {
    product?: string;
    dose?: string;
    doseUnit?: string;
    method?: string;
    targetZone?: string;
  };
  issuedDate: string;
  executedDate?: string;
  evaluationWindowDays: number;
  evaluationDeadline: string;
  followUp: {
    indicatorToMonitor: string;
    expectedResponse: string;
  };
  status: string;
  userNote?: string;
}

export interface SatelliteComparisonData {
  beforeDate: string;
  afterDate: string;
  daysElapsed: number;
  evaluationWindowComplete: boolean;
  before: IndexLatestValues;
  after: IndexLatestValues;
  afterPositions?: Record<string, string>;
  trendObservation?: string;
}

export interface FollowUpWeatherContext {
  precipitationTotal?: number;
  tMin?: number;
  tMax?: number;
  confoundingEvents?: string;
  cloudCoverageIssues?: string;
}

export interface InferenceData {
  coherentChangeDetected?: boolean;
  timingCoherent?: boolean;
  locationCoherent?: boolean;
  inferenceConclusion?: string;
}

export interface SeasonProgress {
  appliedDoses?: Record<string, unknown>;
  yieldForecastRevised?: number;
  yieldTarget?: number;
  remainingInterventions?: Array<{
    month: string;
    type: string;
    product?: string;
    dose?: number;
    doseUnit?: string;
    status: string;
  }>;
}

export interface PostRecommendationFollowUpInput {
  parcel: { name: string };
  recommendation: FollowUpRecommendation;
  satelliteComparison: SatelliteComparisonData;
  weatherContext: FollowUpWeatherContext;
  inferenceData?: InferenceData;
  seasonProgress?: SeasonProgress;
}

// ── Report Type Enum ───────────────────────────────────────

export enum AgromindReportType {
  /** Generic AI report (existing behavior) */
  GENERAL = 'general',
  /** Phase 1 — Calibration: Establish baseline */
  CALIBRATION = 'calibration',
  /** Phase 2 — Recommendations: Operational diagnostics & actions */
  RECOMMENDATIONS = 'recommendations',
  /** Phase 2b — Annual Plan: Full season calendar */
  ANNUAL_PLAN = 'annual_plan',
  /** Phase 2c — Follow-Up: Post-recommendation evaluation */
  FOLLOWUP = 'followup',
}
