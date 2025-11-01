import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import StockReportsDashboard from '../../components/Stock/StockReportsDashboard';

const StockReportsPage: React.FC = () => {
  return <StockReportsDashboard />;
};

export const Route = createFileRoute('/stock/reports')({
  component: StockReportsPage,
});
