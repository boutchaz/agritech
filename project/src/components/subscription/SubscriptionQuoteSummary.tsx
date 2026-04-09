import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { computeModularQuote, type BillingInterval, DEFAULT_DISCOUNT_PERCENT } from '@/lib/polar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/radix-select';

interface SubscriptionQuoteSummaryProps {
  selectedModules: string[];
  hectares: number;
  billingCycle: BillingInterval;
  onBillingCycleChange: (cycle: BillingInterval) => void;
  onCheckout: () => void;
  isLoading: boolean;
}

export default function SubscriptionQuoteSummary({
  selectedModules,
  hectares,
  billingCycle,
  onBillingCycleChange,
  onCheckout,
  isLoading,
}: SubscriptionQuoteSummaryProps) {
  const quote = useMemo(
    () => computeModularQuote({
      selectedModules,
      hectares,
      billingCycle,
      discountPercent: DEFAULT_DISCOUNT_PERCENT,
    }),
    [selectedModules, hectares, billingCycle],
  );

  const cycleLabel = billingCycle === 'monthly' ? 'mois' : billingCycle === 'semiannual' ? '6 mois' : 'an';

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ERP Monthly</span>
            <span className="font-medium text-foreground">{quote.erpMonthly.toLocaleString()} DH/mo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ha Annual</span>
            <span className="font-medium text-foreground">{quote.haAnnual.toLocaleString()} DH/yr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal (year)</span>
            <span className="font-medium text-foreground">{quote.annualSubtotal.toLocaleString()} DH</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span className="text-emerald-600/80">Discount ({quote.discountPercent}%)</span>
            <span className="font-medium">-{quote.discountAmount.toLocaleString()} DH</span>
          </div>
          <div className="flex justify-between pt-2 border-t font-semibold">
            <span className="text-foreground">Annual HT</span>
            <span className="text-foreground">{quote.annualHt.toLocaleString()} DH</span>
          </div>
        </div>

        <div className="pt-2">
          <span className="text-sm text-muted-foreground mb-1 block">Billing cycle</span>
          <Select value={billingCycle} onValueChange={(v) => onBillingCycleChange(v as BillingInterval)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="semiannual">Semi-annual</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Per {cycleLabel} (HT)</span>
            <span className="font-medium text-foreground">{quote.cycleHt.toLocaleString()} DH</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TVA (20%)</span>
            <span className="text-foreground">{quote.cycleTva.toLocaleString()} DH</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t">
            <span className="text-foreground">TTC / {cycleLabel}</span>
            <span className="text-foreground text-lg">{quote.cycleTtc.toLocaleString()} DH</span>
          </div>
        </div>

        <Button
          className="w-full mt-2"
          size="lg"
          onClick={onCheckout}
          disabled={isLoading || selectedModules.length === 0}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Subscribe
        </Button>
      </CardContent>
    </Card>
  );
}
