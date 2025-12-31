export interface AggregatedParcelData {
  parcel: {
    id: string;
    name: string;
    area: number;
    areaUnit: string;
    soilType?: string;
    irrigationType?: string;
    cropType?: string;
    treeType?: string;
    treeCount?: number;
    plantingYear?: number;
    variety?: string;
    rootstock?: string;
  };

  soilAnalysis?: {
    latestDate: string;
    phLevel?: number;
    organicMatter?: number;
    nitrogenPpm?: number;
    phosphorusPpm?: number;
    potassiumPpm?: number;
    texture?: string;
    cec?: number;
    ec?: number;
    calcium?: number;
    magnesium?: number;
    sulfur?: number;
    iron?: number;
    zinc?: number;
    manganese?: number;
    copper?: number;
    boron?: number;
  };

  waterAnalysis?: {
    latestDate: string;
    ph?: number;
    ec?: number;
    tds?: number;
    nitrates?: number;
    chlorides?: number;
    hardness?: number;
    sar?: number;
  };

  plantAnalysis?: {
    latestDate: string;
    nitrogenPercent?: number;
    phosphorusPercent?: number;
    potassiumPercent?: number;
    chlorophyllIndex?: number;
  };

  satelliteIndices: {
    period: { start: string; end: string };
    latestData: {
      date: string;
      ndvi?: number;
      ndmi?: number;
      ndre?: number;
      gci?: number;
      savi?: number;
    };
    trends: {
      ndvi: { direction: 'increasing' | 'decreasing' | 'stable'; changePercent: number };
      ndmi: { direction: 'increasing' | 'decreasing' | 'stable'; changePercent: number };
    };
    timeSeries: Array<{ date: string; ndvi?: number; ndmi?: number }>;
  };

  weather: {
    period: { start: string; end: string };
    temperatureSummary: {
      avgMin: number;
      avgMax: number;
      avgMean: number;
    };
    precipitationTotal: number;
    drySpellsCount: number;
    frostDays: number;
  };
}

export interface AIReportSections {
  executiveSummary: string;
  healthAssessment: {
    overallScore: number;
    soilHealth: string;
    vegetationHealth: string;
    waterStatus: string;
  };
  detailedAnalysis: {
    soilAnalysis: string;
    vegetationAnalysis: string;
    waterAnalysis: string;
    climateImpact: string;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'fertilization' | 'irrigation' | 'pest-control' | 'soil-amendment' | 'general';
    title: string;
    description: string;
    timing?: string;
  }>;
  riskAlerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    type: string;
    description: string;
    mitigationSteps?: string[];
  }>;
  actionItems: Array<{
    priority: number;
    action: string;
    deadline?: string;
    estimatedImpact: string;
  }>;
}
