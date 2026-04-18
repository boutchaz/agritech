/**
 * Pure calculation functions for profitability analysis.
 *
 * These mirror the backend formulas (profitability.service.ts) so the
 * ProfitabilityDashboard can aggregate already-fetched data client-side.
 * The backend remains the authoritative source of truth.
 */

export interface CostEntry {
  amount: number;
  cost_type: string;
  parcel_id?: string;
  parcel_name?: string;
}

export interface RevenueEntry {
  amount: number;
  revenue_type: string;
  parcel_id?: string;
  parcel_name?: string;
}

export interface ParcelSummary {
  parcel_id?: string;
  parcel_name: string;
  total_costs: number;
  total_revenue: number;
  net_profit: number;
  profit_margin?: number;
  cost_breakdown: Record<string, number>;
  revenue_breakdown: Record<string, number>;
}

export interface ProfitabilityMetrics {
  totalCosts: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
  costBreakdown: Record<string, number>;
  revenueBreakdown: Record<string, number>;
  byParcel: ParcelSummary[];
}

export function calculateNetProfit(totalRevenue: number, totalCosts: number): number {
  return totalRevenue - totalCosts;
}

export function calculateProfitMargin(netProfit: number, totalRevenue: number): number {
  if (totalRevenue === 0) return 0;
  return (netProfit / totalRevenue) * 100;
}

export function aggregateCostsByType(costs: CostEntry[]): Record<string, number> {
  return costs.reduce((acc, cost) => {
    acc[cost.cost_type] = (acc[cost.cost_type] || 0) + Number(cost.amount);
    return acc;
  }, {} as Record<string, number>);
}

export function aggregateRevenuesByType(revenues: RevenueEntry[]): Record<string, number> {
  return revenues.reduce((acc, rev) => {
    acc[rev.revenue_type] = (acc[rev.revenue_type] || 0) + Number(rev.amount);
    return acc;
  }, {} as Record<string, number>);
}

export function computeByParcel(costs: CostEntry[], revenues: RevenueEntry[]): ParcelSummary[] {
  const parcels: Record<string, ParcelSummary> = {};

  for (const cost of costs) {
    const key = cost.parcel_id || 'unassigned';
    const name = cost.parcel_name || 'Non assigné';
    if (!parcels[key]) {
      parcels[key] = {
        parcel_id: cost.parcel_id,
        parcel_name: name,
        total_costs: 0,
        total_revenue: 0,
        net_profit: 0,
        cost_breakdown: {},
        revenue_breakdown: {},
      };
    }
    parcels[key].total_costs += Number(cost.amount);
    parcels[key].cost_breakdown[cost.cost_type] =
      (parcels[key].cost_breakdown[cost.cost_type] || 0) + Number(cost.amount);
  }

  for (const rev of revenues) {
    const key = rev.parcel_id || 'unassigned';
    const name = rev.parcel_name || 'Non assigné';
    if (!parcels[key]) {
      parcels[key] = {
        parcel_id: rev.parcel_id,
        parcel_name: name,
        total_costs: 0,
        total_revenue: 0,
        net_profit: 0,
        cost_breakdown: {},
        revenue_breakdown: {},
      };
    }
    parcels[key].total_revenue += Number(rev.amount);
    parcels[key].revenue_breakdown[rev.revenue_type] =
      (parcels[key].revenue_breakdown[rev.revenue_type] || 0) + Number(rev.amount);
  }

  for (const parcel of Object.values(parcels)) {
    parcel.net_profit = parcel.total_revenue - parcel.total_costs;
    parcel.profit_margin =
      parcel.total_revenue > 0
        ? (parcel.net_profit / parcel.total_revenue) * 100
        : undefined;
  }

  return Object.values(parcels);
}

/**
 * Full profitability computation — mirrors backend getProfitability().
 */
export function computeProfitability(
  costs: CostEntry[],
  revenues: RevenueEntry[],
): ProfitabilityMetrics {
  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const netProfit = calculateNetProfit(totalRevenue, totalCosts);
  const profitMargin = calculateProfitMargin(netProfit, totalRevenue);

  return {
    totalCosts,
    totalRevenue,
    netProfit,
    profitMargin,
    costBreakdown: aggregateCostsByType(costs),
    revenueBreakdown: aggregateRevenuesByType(revenues),
    byParcel: computeByParcel(costs, revenues),
  };
}
