import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, TrendingUp, Sprout, Mail, ArrowRight, Check, Users, Droplets } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/utils/currencies';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ROICalculatorProps {
  className?: string;
}

const calculatorSchema = z.object({
  farmSize: z.number().min(1, 'Farm size must be at least 1').max(500, 'Farm size cannot exceed 500'),
  currentYield: z.number().min(0.5, 'Yield must be at least 0.5').max(50, 'Yield cannot exceed 50'),
  cropType: z.string().min(1, 'Crop type is required'),
  laborCost: z.number().min(1000, 'Labor cost must be at least 1000').max(100000, 'Labor cost cannot exceed 100000'),
  fertilizerCost: z.number().min(500, 'Fertilizer cost must be at least 500').max(50000, 'Fertilizer cost cannot exceed 50000'),
  waterCost: z.number().min(500, 'Water cost must be at least 500').max(30000, 'Water cost cannot exceed 30000'),
});

type CalculatorData = z.infer<typeof calculatorSchema>;

interface ROIData {
  yieldIncrease: number;
  laborSavings: number;
  inputSavings: number;
  totalAnnualSavings: number;
  roiPercentage: number;
  paybackPeriod: number;
}

const CROP_KEYS = ['vegetables', 'fruits', 'cereals', 'citrus', 'olives'] as const;

const PRICING_TIERS = {
  starter: 25,
  professional: 75,
  enterprise: 150,
} as const;

const ROICalculator: React.FC<ROICalculatorProps> = ({ className }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'calculator' | 'email'>('calculator');
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PRICING_TIERS>('professional');

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CalculatorData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      farmSize: 10,
      currentYield: 15,
      cropType: 'vegetables',
      laborCost: 5000,
      fertilizerCost: 3000,
      waterCost: 2000,
    },
  });

  const formData = watch();

  const cropOptions = CROP_KEYS.map((key) => ({
    value: key,
    label: t(`common.roiCalculator.crops.${key}`),
  }));

  const roiData: ROIData = useMemo(() => {
    // AgriTech benefits (conservative estimates)
    const yieldImprovement = 0.15; // 15% yield increase
    const laborOptimization = 0.25; // 25% labor savings
    const inputOptimization = 0.20; // 20% input savings

    const yieldIncrease = formData.farmSize * formData.currentYield * yieldImprovement;
    const laborSavings = formData.laborCost * laborOptimization;
    const inputSavings = (formData.fertilizerCost + formData.waterCost) * inputOptimization;

    const annualCost = PRICING_TIERS[selectedPlan] * 12;
    const totalAnnualSavings = yieldIncrease + laborSavings + inputSavings - annualCost;
    const roiPercentage = (totalAnnualSavings / annualCost) * 100;
    const paybackPeriod = annualCost / (yieldIncrease + laborSavings + inputSavings);

    return {
      yieldIncrease,
      laborSavings,
      inputSavings,
      totalAnnualSavings,
      roiPercentage,
      paybackPeriod,
    };
  }, [formData, selectedPlan]);



  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service
    setEmailSubmitted(true);
  };

  // Helper function for currency formatting
  const formatCurrency = (value: number) =>
    value.toLocaleString('fr-MA', {
      style: 'currency',
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  if (emailSubmitted) {
    return (
      <Card className={cn('border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
            {t('common.roiCalculator.thankYouTitle')}
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300 max-w-md">
            <span dangerouslySetInnerHTML={{ __html: t('common.roiCalculator.thankYouMessage', { email: email.replace(/[<>&"']/g, (c: string) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#x27;'}[c] || c)) }) }} />
          </CardDescription>
          <Button
            variant="outline"
            className="mt-6 border-green-600 text-green-700 hover:bg-green-50 dark:text-green-300"
            onClick={() => {
              setStep('calculator');
              setEmailSubmitted(false);
              setEmail('');
            }}
          >
            {t('common.roiCalculator.calculateNewRoi')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'email') {
    return (
      <Card className={cn('shadow-xl border-2 border-green-100 dark:border-green-900', className)}>
        <CardHeader className="text-center pb-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-3">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">
            {t('common.roiCalculator.emailReportTitle')}
          </CardTitle>
          <CardDescription className="text-base">
            {t('common.roiCalculator.emailReportSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ROI Summary */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-6 text-white">
            <div className="text-center mb-4">
              <p className="text-green-100 text-sm font-medium mb-1">{t('common.roiCalculator.estimatedAnnualSavings')}</p>
              <p className="text-4xl font-bold">{formatCurrency(roiData.totalAnnualSavings)}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-green-100">{t('common.roiCalculator.yieldIncrease')}</p>
                <p className="font-semibold">{formatCurrency(roiData.yieldIncrease)}</p>
              </div>
              <div>
                <p className="text-green-100">{t('common.roiCalculator.laborSavings')}</p>
                <p className="font-semibold">{formatCurrency(roiData.laborSavings)}</p>
              </div>
              <div>
                <p className="text-green-100">{t('common.roiCalculator.inputSavings')}</p>
                <p className="font-semibold">{formatCurrency(roiData.inputSavings)}</p>
              </div>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('common.roiCalculator.emailLabel')}
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('common.roiCalculator.emailPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Plan Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('common.roiCalculator.planOfInterest')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(PRICING_TIERS).map(([key, price]) => (
                  <Button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key as keyof typeof PRICING_TIERS)}
                    className={cn(
                      'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                      selectedPlan === key
                        ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                    )}
                  >
                    {t(`common.roiCalculator.plans.${key}`)}
                    <br />
                    <span className="font-bold">{price}$</span>
                  </Button>
                ))}
              </div>
            </div>

            <Button variant="green" type="submit" size="lg" className="w-full font-semibold" >
              {t('common.roiCalculator.receiveFreeReport')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              {t('common.roiCalculator.noCommitment')}
            </p>

            <Button
              type="button"
              onClick={() => setStep('calculator')}
              className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
            >
              {t('common.roiCalculator.backToCalculator')}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-xl', className)}>
      <CardHeader className="text-center pb-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto mb-3">
          <Calculator className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-bold">{t('common.roiCalculator.calculatorTitle')}</CardTitle>
        <CardDescription className="text-base">{t('common.roiCalculator.calculatorSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="space-y-4">
           {/* Farm Size */}
           <div>
             <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               <span>{t('common.roiCalculator.farmSize')}</span>
               <span className="text-green-600 font-semibold">
                 {formData.farmSize} {t('common.roiCalculator.farmSizeUnit')}
               </span>
             </label>
             <input
               type="range"
               min="1"
               max="500"
               step="1"
               {...register('farmSize', { valueAsNumber: true })}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
             />
             <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>1 {t('common.roiCalculator.farmSizeUnit')}</span>
               <span>500 {t('common.roiCalculator.farmSizeUnit')}</span>
             </div>
             {errors.farmSize && (
               <p className="text-red-600 text-sm mt-1">{errors.farmSize.message}</p>
             )}
           </div>

           {/* Current Yield */}
           <div>
             <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               <span>{t('common.roiCalculator.currentYield')}</span>
               <span className="text-green-600 font-semibold">
                 {formData.currentYield} {t('common.roiCalculator.currentYieldUnit')}
               </span>
             </label>
             <input
               type="range"
               min="1"
               max="50"
               step="0.5"
               {...register('currentYield', { valueAsNumber: true })}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
             />
             <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>1 {t('common.roiCalculator.currentYieldUnit')}</span>
               <span>50 {t('common.roiCalculator.currentYieldUnit')}</span>
             </div>
             {errors.currentYield && (
               <p className="text-red-600 text-sm mt-1">{errors.currentYield.message}</p>
             )}
           </div>

           {/* Crop Type */}
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               {t('common.roiCalculator.cropType')}
             </label>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
               {cropOptions.map((crop) => (
                 <Button
                   key={crop.value}
                   type="button"
                   onClick={() => setValue('cropType', crop.value)}
                   className={cn(
                     'px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                     formData.cropType === crop.value
                       ? 'border-green-500 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300'
                       : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                   )}
                 >
                   {crop.label}
                 </Button>
               ))}
             </div>
             <input type="hidden" {...register('cropType')} />
             {errors.cropType && (
               <p className="text-red-600 text-sm mt-1">{errors.cropType.message}</p>
             )}
           </div>

           {/* Labor Cost */}
           <div>
             <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               <span>{t('common.roiCalculator.laborCost')}</span>
               <span className="text-green-600 font-semibold">
                 {formData.laborCost.toLocaleString()} MAD
               </span>
             </label>
             <input
               type="range"
               min="1000"
               max="100000"
               step="1000"
               {...register('laborCost', { valueAsNumber: true })}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
             />
             <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>1,000 MAD</span>
               <span>100,000 MAD</span>
             </div>
             {errors.laborCost && (
               <p className="text-red-600 text-sm mt-1">{errors.laborCost.message}</p>
             )}
           </div>

           {/* Fertilizer Cost */}
           <div>
             <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               <span>{t('common.roiCalculator.fertilizerCost')}</span>
               <span className="text-green-600 font-semibold">
                 {formData.fertilizerCost.toLocaleString()} MAD
               </span>
             </label>
             <input
               type="range"
               min="500"
               max="50000"
               step="500"
               {...register('fertilizerCost', { valueAsNumber: true })}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
             />
             <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>500 MAD</span>
               <span>50,000 MAD</span>
             </div>
             {errors.fertilizerCost && (
               <p className="text-red-600 text-sm mt-1">{errors.fertilizerCost.message}</p>
             )}
           </div>

           {/* Water Cost */}
           <div>
             <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               <span>{t('common.roiCalculator.waterCost')}</span>
               <span className="text-green-600 font-semibold">
                 {formData.waterCost.toLocaleString()} MAD
               </span>
             </label>
             <input
               type="range"
               min="500"
               max="30000"
               step="500"
               {...register('waterCost', { valueAsNumber: true })}
               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
             />
             <div className="flex justify-between text-xs text-gray-500 mt-1">
               <span>500 MAD</span>
               <span>30,000 MAD</span>
             </div>
             {errors.waterCost && (
               <p className="text-red-600 text-sm mt-1">{errors.waterCost.message}</p>
             )}
           </div>
        </div>

        {/* Live Results */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            {t('common.roiCalculator.results')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <Sprout className="h-4 w-4 mr-2 text-green-600" />
                {t('common.roiCalculator.yieldIncrease')}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                +{formatCurrency(roiData.yieldIncrease)}
                <span className="text-xs text-gray-500 ml-1">{t('common.roiCalculator.perYear')}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-600" />
                {t('common.roiCalculator.laborSavings')}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(roiData.laborSavings)}
                <span className="text-xs text-gray-500 ml-1">{t('common.roiCalculator.perYear')}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <Droplets className="h-4 w-4 mr-2 text-cyan-600" />
                {t('common.roiCalculator.inputSavings')}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(roiData.inputSavings)}
                <span className="text-xs text-gray-500 ml-1">{t('common.roiCalculator.perYear')}</span>
              </span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.roiCalculator.totalAnnualSavings')}
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(roiData.totalAnnualSavings)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('common.roiCalculator.roi')}</span>
                  <p className="font-bold text-green-600 dark:text-green-400">{roiData.roiPercentage.toFixed(0)}%</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">{t('common.roiCalculator.paybackPeriod')}</span>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    {roiData.paybackPeriod < 1
                      ? `${(roiData.paybackPeriod * 12).toFixed(0)} ${t('common.roiCalculator.months')}`
                      : `${roiData.paybackPeriod.toFixed(1)} ${t('common.roiCalculator.months')}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button variant="green" size="lg" className="w-full font-semibold text-lg" onClick={() => setStep('email')}
        >
          {t('common.roiCalculator.receiveReport')}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">{t('common.roiCalculator.disclaimer')}</p>
      </CardContent>
    </Card>
  );
};

export default ROICalculator;
