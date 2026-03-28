export { RecommendationCard } from './RecommendationCard';
export { DiagnosticCard } from './DiagnosticCard';
export { FarmSummaryCard } from './FarmSummaryCard';
export { PlanCalendarCard } from './PlanCalendarCard';
export { StockAlertCard } from './StockAlertCard';
export { FinancialCard } from './FinancialCard';

import React from 'react';
import { RecommendationCard } from './RecommendationCard';
import { DiagnosticCard } from './DiagnosticCard';
import { FarmSummaryCard } from './FarmSummaryCard';
import { PlanCalendarCard } from './PlanCalendarCard';
import { StockAlertCard } from './StockAlertCard';
import { FinancialCard } from './FinancialCard';

export const cardRegistry: Record<string, React.ComponentType<{ data: any }>> = {
  'recommendation-card': RecommendationCard,
  'diagnostic-card': DiagnosticCard,
  'farm-summary': FarmSummaryCard,
  'plan-calendar': PlanCalendarCard,
  'stock-alert': StockAlertCard,
  'financial-snapshot': FinancialCard,
};
