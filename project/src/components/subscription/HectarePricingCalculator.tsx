import { Input } from '@/components/ui/Input';

interface HectarePricingCalculatorProps {
  hectares: number;
  onChange: (ha: number) => void;
}

export default function HectarePricingCalculator({ hectares, onChange }: HectarePricingCalculatorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Hectares</h3>
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

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
        Pricing is tailored to your farm size and needs. Our team will contact you with a personalized quote.
      </div>
    </div>
  );
}
