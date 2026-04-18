import { HA_PRICE_TIERS, SIZE_MULTIPLIER_TIERS, resolveSizeMultiplier, computeHaTotalPrice } from '@/lib/polar';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HectarePricingCalculatorProps {
  hectares: number;
  onChange: (ha: number) => void;
}

export default function HectarePricingCalculator({ hectares, onChange }: HectarePricingCalculatorProps) {
  const multiplier = resolveSizeMultiplier(hectares);
  const totalHaAnnual = computeHaTotalPrice(hectares);
  const avgPerHa = hectares > 0 ? Math.round(totalHaAnnual / hectares) : 0;

  const sorted = [...HA_PRICE_TIERS].sort((a, b) => (a.maxHa ?? 999999) - (b.maxHa ?? 999999));
  const breakdown: { tier: string; ha: number; pricePerHa: number; subtotal: number }[] = [];
  let remaining = hectares;
  let prevMax = 0;
  for (const tier of sorted) {
    const isLast = !tier.maxHa || tier.maxHa >= 999999;
    const currentMax = tier.maxHa ?? 999999;
    const tierWidth = isLast ? remaining : currentMax - prevMax;
    const haInTier = Math.min(remaining, tierWidth);
    if (haInTier <= 0 && remaining <= 0) break;
    breakdown.push({
      tier: tier.label,
      ha: haInTier,
      pricePerHa: tier.pricePerHaYear,
      subtotal: haInTier * tier.pricePerHaYear,
    });
    remaining -= haInTier;
    prevMax = isLast ? prevMax : currentMax;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Hectares</h3>
        <div className="flex items-center gap-2">
          <Badge variant={multiplier > 1 ? 'default' : 'secondary'}>
            x{multiplier} multiplier
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={1}
          value={hectares}
          onChange={e => onChange(Math.max(1, Number(e.target.value) || 1))}
          className="w-32"
        />
        <span className="text-sm text-muted-foreground">ha</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 text-muted-foreground font-medium">Tier</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">DH/ha/yr</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">ha</th>
              <th className="text-right px-3 py-2 text-muted-foreground font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.filter(b => b.ha > 0).map((row) => (
              <tr key={row.tier} className={cn('border-t', breakdown.indexOf(row) % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                <td className="px-3 py-1.5 text-foreground">{row.tier}</td>
                <td className="px-3 py-1.5 text-right text-foreground">{row.pricePerHa.toLocaleString()}</td>
                <td className="px-3 py-1.5 text-right text-foreground">{row.ha}</td>
                <td className="px-3 py-1.5 text-right font-medium text-foreground">{row.subtotal.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={2} className="px-3 py-2 text-muted-foreground">Total</td>
              <td className="px-3 py-2 text-right font-medium text-foreground">{hectares}</td>
              <td className="px-3 py-2 text-right font-bold text-foreground">{totalHaAnnual.toLocaleString()} DH</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Average per ha:</span>
        <span className="font-medium text-foreground">{avgPerHa.toLocaleString()} DH/ha/yr</span>
      </div>

      {multiplier > 1 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Size multiplier x{multiplier} applies to ERP module prices (farms {'>'} {SIZE_MULTIPLIER_TIERS.find(t => t.multiplier === multiplier)?.minHa ?? 0} ha)
          </span>
        </div>
      )}
    </div>
  );
}
