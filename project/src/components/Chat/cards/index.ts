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

type CardComponent = React.ComponentType<{ data: Record<string, unknown> }>;

const rawRegistry: Record<string, CardComponent> = {
  'recommendation-card': RecommendationCard as unknown as CardComponent,
  'diagnostic-card': DiagnosticCard as unknown as CardComponent,
  'farm-summary': FarmSummaryCard as unknown as CardComponent,
  'plan-calendar': PlanCalendarCard as unknown as CardComponent,
  'stock-alert': StockAlertCard as unknown as CardComponent,
  'financial-snapshot': FinancialCard as unknown as CardComponent,
};

export const cardRegistry: Record<string, CardComponent> = rawRegistry;
