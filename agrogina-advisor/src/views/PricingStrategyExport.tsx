import { useEngineStore, computeHaTotalPriceStatic, computeHaTotalPrice, computeErpMonthly } from '../store/engineStore';
import { generate60Months } from '../utils/engine60M';
import { useMemo } from 'react';
import { Download, Crown, Target, FileText, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';

export default function PricingStrategyExport() {
    const state = useEngineStore();
    const data = useMemo(() => generate60Months(state), [state]);

    // KPIs
    const m60 = data[59] || { totalMrr: 0, users: 1 };
    const breakEvenMonth = data.find(m => m.ebitda > 0)?.month || null;
    const lowestCash = Math.min(...data.map(m => m.cash));
    const cashNeeded = lowestCash < 0 ? Math.abs(lowestCash) : 0;

    // LTV & CAC
    const avgMrr = m60.totalMrr / Math.max(1, m60.users);
    const avgLife = state.churnRate > 0 ? 1 / (state.churnRate / 100) : 60;
    const ltv = avgMrr * avgLife;

    const mkt = state.marketing.channels.reduce((sum, ch) => sum + (ch.enabled ? (ch.budgetMonthly || 0) : 0), 0);
    const monthlyAcqCost = mkt + state.salesSalariedCount * state.salesRules.salariedBase;
    const cac = state.newUsersPerMonth > 0 ? monthlyAcqCost / state.newUsersPerMonth : 0;
    const ltvCac = cac > 0 ? ltv / cac : 0;

    const handlePrint = () => {
        window.print();
    };

    // Pre-calculate pricing for 3 typical packages
    const erpMonthly = computeErpMonthly(state.erpModules, state.erpSizeMultiplier);
    const erpAnnual = erpMonthly * 12;

    const calcAgro = (ha: number) => state.haPricingMode === 'static'
        ? computeHaTotalPriceStatic(ha, state.haPriceTiers)
        : computeHaTotalPrice(ha, state.haPriceTiers);

    const pkgEntry = calcAgro(5) + erpAnnual;
    const pkgStandard = calcAgro(50) + erpAnnual;
    const pkgAdvanced = calcAgro(200) + erpAnnual;

    const hasValueAnchoring = state.haPriceTiers.some(t => t.valuePerHa && t.valuePerHa > 0);

    return (
        <div className="max-w-5xl mx-auto text-slate-800 bg-white min-h-screen printable-doc rounded-xl shadow-2xl overflow-hidden relative print:shadow-none print:m-0 print:border-none print:rounded-none">

            {/* HEADER SECTION */}
            <div className="bg-slate-900 text-white p-8 md:p-12 print:bg-slate-900 print:text-white relative">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                            <Crown className="text-amber-500" size={36} />
                            Stratégie Pricing & Modèle d'Affaires
                        </h1>
                        <p className="text-slate-400 text-lg">Projet AGROGINA — Rapport d'Audit CFO</p>
                    </div>
                    <button onClick={handlePrint} className="print:hidden bg-blue-600 hover:bg-blue-500 transition px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-500/30">
                        <Download size={20} /> Exporter PDF
                    </button>
                </div>
            </div>

            <div className="p-8 md:p-12 space-y-12">

                {/* BLOC 1: Verdict de Tranchage */}
                <section>
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                        <Target className="text-blue-600" /> 1. Verdict & Viabilité (Tranchage)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="text-slate-500 text-sm font-bold uppercase mb-1 flex items-center gap-2"><TrendingUp size={16} /> LTV : CAC</div>
                            <div className="text-3xl font-black text-slate-800">{ltvCac.toFixed(1)}x</div>
                            <div className="text-xs text-slate-500 mt-2">Cible idéale &gt; 3.0x</div>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="text-slate-500 text-sm font-bold uppercase mb-1 flex items-center gap-2"><AlertTriangle size={16} /> Cash Requis (Plancher)</div>
                            <div className="text-3xl font-black text-slate-800">{(cashNeeded / 1000000).toFixed(2)}M DH</div>
                            <div className="text-xs text-slate-500 mt-2">Définit la taille de la Série A/Seed</div>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <div className="text-slate-500 text-sm font-bold uppercase mb-1 flex items-center gap-2"><FileText size={16} /> Mois de Breakeven</div>
                            <div className="text-3xl font-black text-slate-800">{breakEvenMonth ? `M ${breakEvenMonth}` : 'N/A'}</div>
                            <div className="text-xs text-slate-500 mt-2">Rentabilité opérationnelle</div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 text-slate-700 leading-relaxed">
                        <p className="mb-3">
                            Sur la base des projections à 60 mois, structurer le modèle AGROGINA avec une tarification ERP fixe et une tarification agronomie dynamique {state.haPricingMode === 'static' ? '(statique par tranche)' : '(progressive par tranches)'} nécessite un besoin en fonds de roulement brut de {(cashNeeded / 1000000).toFixed(2)}M DH.
                        </p>
                        <p>
                            La force de frappe compétitive réside dans un ratio LTV/CAC de <strong>{ltvCac.toFixed(1)}x</strong>, prouvant que le coût d'acquisition de {Math.round(cac).toLocaleString('fr-FR')} DH par client {ltvCac >= 3 ? "est largement amorti et permet une croissance saine." : "est trop risqué par rapport au prix de vente actuel."}
                        </p>
                    </div>
                </section>

                {/* BLOC 2: Stratégie Pricing */}
                <section>
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                        <Target className="text-emerald-600" /> 2. Synthèse de la Grille Tarifaire
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Entry */}
                        <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 p-4 text-center border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-1">Pack Entry (≈ 5 ha)</h3>
                                <div className="text-3xl font-black text-slate-900">{Math.round(pkgEntry).toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">DH/an</span></div>
                            </div>
                            <div className="p-4 text-sm text-slate-600 space-y-2">
                                <div className="flex justify-between"><span>ERP De base</span><span>{(erpAnnual).toLocaleString('fr-FR')} DH</span></div>
                                <div className="flex justify-between"><span>AgromindIA (5ha)</span><span>{Math.round(calcAgro(5)).toLocaleString('fr-FR')} DH</span></div>
                            </div>
                        </div>
                        {/* Standard */}
                        <div className="border-2 border-blue-500 rounded-xl overflow-hidden relative shadow-lg shadow-blue-500/10">
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Cœur de Cible</div>
                            <div className="bg-blue-50 p-4 text-center border-b border-blue-200">
                                <h3 className="font-bold text-blue-800 uppercase tracking-widest text-xs mb-1">Pack Standard (≈ 50 ha)</h3>
                                <div className="text-3xl font-black text-blue-900">{Math.round(pkgStandard).toLocaleString('fr-FR')} <span className="text-sm font-bold text-blue-400">DH/an</span></div>
                            </div>
                            <div className="p-4 text-sm text-slate-600 space-y-2">
                                <div className="flex justify-between"><span>ERP De base</span><span>{(erpAnnual).toLocaleString('fr-FR')} DH</span></div>
                                <div className="flex justify-between border-b border-slate-100 pb-2"><span>AgromindIA (50ha)</span><span>{Math.round(calcAgro(50)).toLocaleString('fr-FR')} DH</span></div>
                                <div className="flex justify-between font-bold text-slate-800 pt-1"><span>Prix moyen/Ha</span><span>{Math.round(pkgStandard / 50)} DH/ha</span></div>
                            </div>
                        </div>
                        {/* Advanced */}
                        <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 p-4 text-center border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-1">Pack Premium (≈ 200 ha)</h3>
                                <div className="text-3xl font-black text-slate-900">{Math.round(pkgAdvanced).toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">DH/an</span></div>
                            </div>
                            <div className="p-4 text-sm text-slate-600 space-y-2">
                                <div className="flex justify-between"><span>ERP De base</span><span>{(erpAnnual).toLocaleString('fr-FR')} DH</span></div>
                                <div className="flex justify-between"><span>AgromindIA (200ha)</span><span>{Math.round(calcAgro(200)).toLocaleString('fr-FR')} DH</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* BLOC 3: Actions Immédiates */}
                <section>
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2 border-b-2 border-slate-200 pb-2">
                        <CheckSquare className="text-amber-600" /> 3. Actions Immédiates (To-Do List CFO)
                    </h2>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                        <ul className="space-y-4 text-slate-700">
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5 shrink-0"></div>
                                <div>
                                    <strong className="block text-slate-900">1. Valider le CAC Terrain au SIAM</strong>
                                    Tester le coût d'acquisition de {Math.round(cac).toLocaleString('fr-FR')} DH en acquérant manuellement 5 clients type "Standard" (50 ha) au prix de {Math.round(pkgStandard).toLocaleString('fr-FR')} DH.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5 shrink-0"></div>
                                <div>
                                    <strong className="block text-slate-900">2. Sécuriser la Levée de Fonds ou les Subventions</strong>
                                    Le trou de trésorerie de {(cashNeeded / 1000000).toFixed(2)}M DH signifie qu'il faut enclencher les discussions avec des Business Angels, VC early-stage, ou Innov Invest (CCG) dès le M{Math.max(1, (lowestCash < 0 ? data.findIndex(m => m.cash === lowestCash) - 6 : 1))}.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5 shrink-0"></div>
                                <div>
                                    <strong className="block text-slate-900">3. {hasValueAnchoring ? 'Prouver la Valeur d\'Ancrage' : 'Définir l\'Ancrage Valeur'}</strong>
                                    {hasValueAnchoring
                                        ? "Les ratios Valeur/Prix sont configurés. L'équipe Sales doit maintenant prouver empiriquement aux 10 premiers clients marginaux que la solution rapporte effectivement les gains saisis dans le système (gain de rendement, RH, eau)."
                                        : "Retournez à l'étape 1 du Pricing et remplissez la nouvelle section 'Ancrage Valeur Client'. Sans preuve mathématique du gain pour l'agriculteur, le prix paraîtra arbitraire aux VC."}
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded border-2 border-slate-300 mt-0.5 shrink-0"></div>
                                <div>
                                    <strong className="block text-slate-900">4. Finaliser l'Analyse Concurrentielle</strong>
                                    Présenter la matrice compétitive avec les ratios Valeur/Prix normalisés aux investisseurs pour prouver visuellement que AGROGINA propose une équation valeur/prix imbattable sur le terrain.
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>

            </div>

            {/* Print styles */}
            <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          body { background: white !important; }
          .printable-doc { max-width: 100% !important; box-shadow: none !important; margin: 0 !important; }
          /* Hide app sidebar and layout paddings during print */
          #print-hide-sidebar { display: none !important; }
          #print-main-content { margin-left: 0 !important; padding: 0 !important; }
        }
      `}</style>
        </div>
    );
}
