import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface FinancialData {
  revenue: number;
  expenses: number;
  currency?: string;
  period?: string;
}

export function FinancialCard({ data }: { data: FinancialData }) {
  const profit = data.revenue - data.expenses;
  const currency = data.currency || 'MAD';

  return (
    <Card className="my-2 border-l-4 border-l-emerald-500">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          Financial Summary
          {data.period && <span className="text-xs text-muted-foreground ml-auto">{data.period}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />
            <p className="text-sm font-semibold text-green-600">{data.revenue.toLocaleString()} {currency}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </div>
          <div>
            <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-600">{data.expenses.toLocaleString()} {currency}</p>
            <p className="text-xs text-muted-foreground">Expenses</p>
          </div>
          <div>
            <DollarSign className="w-4 h-4 text-blue-500 mx-auto" />
            <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit.toLocaleString()} {currency}
            </p>
            <p className="text-xs text-muted-foreground">Profit</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
