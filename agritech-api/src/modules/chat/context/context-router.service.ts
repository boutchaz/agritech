import { Injectable, Logger } from '@nestjs/common';

export interface ContextNeeds {
  farm: boolean;
  worker: boolean;
  accounting: boolean;
  inventory: boolean;
  production: boolean;
  supplierCustomer: boolean;
  campaigns: boolean;
  reception: boolean;
  compliance: boolean;
  utilities: boolean;
  reports: boolean;
  marketplace: boolean;
  orchards: boolean;
  satellite: boolean;
  weather: boolean;
  soil: boolean;
  alerts: boolean;
  forecast: boolean;
  settings: boolean;
  agromindiaIntel: boolean;
  matchedModules?: MatchedModule[];
}

export type ContextModuleKey = Exclude<keyof ContextNeeds, 'farm' | 'worker' | 'matchedModules'>;

export interface MatchedModule {
  key: ContextModuleKey;
  score: number;
}

@Injectable()
export class ContextRouterService {
  private readonly logger = new Logger(ContextRouterService.name);
  private readonly modulePatterns: Record<ContextModuleKey, RegExp> = {
    accounting: /invoice|payment|expense|revenue|profit|cost|fiscal|tax|accounting|financial|budget|journal|account|total|spend|how much|facture|paiement|dépense|revenu|coût|comptabilité|financier|combien|total des|فاتورة|دفعة|مصروف|إيراد|تكلفة|محاسبة|مالي|كم|إجمالي/,
    inventory: /stock|inventory|warehouse|item|product|material|reception|supply|inventaire|entrepôt|article|produit|matériel|approvisionnement|مخزون|مستودع|منتج|مادة/,
    production: /harvest|yield|production|quality|delivery|crop cycle|récolte|rendement|contrôle qualité|livraison|cycle de culture|حصاد|محصول|إنتاج|مراقبة الجودة|تسليم/,
    supplierCustomer: /supplier|customer|vendor|client|order|quote|purchase|sale|fournisseur|client|commande|devis|achat|vente|مورد|عميل|طلب|عرض أسعار|شراء|بيع/,
    campaigns: /campaign|campagne|campagnes|project|initiative|حملة/,
    reception: /reception|batch|lot|reception batch|lotissement|réception|دفعة|استلام/,
    compliance: /compliance|certification|audit|non[- ]compliant|conformité|certificat|audit|امتثال|شهادة/,
    utilities: /utility|utilities|bill|electric|water|fuel|gas|utility bill|facture|électricité|eau|gaz|فاتورة/,
    reports: /report|reports|analytics|dashboard report|rapport|statistique|تحليل|تقارير/,
    marketplace: /marketplace|listing|quote request|market|order marketplace|marché|annonce|demande de devis|سوق|عرض/,
    orchards: /orchard|orchards|tree|trees|fruit tree|pruning|taille|arbor|verger|أشجار|بستان/,
    satellite: /satellite|ndvi|ndmi|ndre|gci|savi|vegetation|remote sensing|imagery|indice de végétation|télédétection|imagerie|قمر صناعي|مؤشر الغطاء النباتي|الاستشعار عن بعد/,
    weather: /weather|forecast|temperature|rain|precipitation|climate|frost|storm|humidity|wind|météo|prévision|température|pluie|climat|gel|tempête|humidité|vent|طقس|توقعات|درجة الحرارة|مطر|مناخ|صقيع|عاصفة|رطوبة|رياح/,
    soil: /soil|nutrient|fertilizer|ph|organic matter|texture|soil analysis|sol|nutriment|engrais|matière organique|analyse du sol|تربة|مغذيات|سماد|مادة عضوية|تحليل التربة/,
    alerts: /alert|warning|problem|issue|underperforming|critical|deviation|alerte|avertissement|problème|critique|déviation|تنبيه|تحذير|مشكلة|حرج|انحراف/,
    forecast: /forecast|prediction|expected|upcoming|yield forecast|benchmark|prévision|prédiction|attendu|à venir|référence|توقعات|تنبؤ|متوقع|قادم|معيار/,
    settings: /settings|plan|subscription|admin|role|user|member|permission|paramètre|abonnement|administrateur|rôle|utilisateur|permission|إعدادات|اشتراك|مسؤول|دور|مستخدم|صلاحية/,
    agromindiaIntel: /recommend|diagnostic|calibrat|intervention|plan annuel|annual plan|what should|que faire|ماذا أفعل|conseil|parcelle?|parcel|santé|health|stress|ndvi|ndmi|ndre|fertiliz|irrigat|phenolog|bbch|npk/,
  };
  private matchedModules: MatchedModule[] = [];

  /**
   * Analyze query using keyword-based routing to determine which context modules to load.
   * Supports multilingual keywords (English, French, Arabic).
   * Farm and worker contexts are ALWAYS loaded (most common queries).
   */
  analyzeQuery(query: string): ContextNeeds {
    const lowerQuery = query.toLowerCase();
    const matchedModules = this.getMatchedModulesForQuery(lowerQuery);
    return this.createContextNeeds(query, matchedModules);
  }

  createContextNeeds(query: string, matchedModules: MatchedModule[]): ContextNeeds {
    const lowerQuery = query.toLowerCase();
    this.matchedModules = matchedModules;

    const contextNeeds: ContextNeeds = {
      farm: true,
      worker: true,
      accounting: matchedModules.some((module) => module.key === 'accounting'),
      inventory: matchedModules.some((module) => module.key === 'inventory'),
      production: matchedModules.some((module) => module.key === 'production'),
      supplierCustomer: matchedModules.some((module) => module.key === 'supplierCustomer'),
      campaigns: matchedModules.some((module) => module.key === 'campaigns'),
      reception: matchedModules.some((module) => module.key === 'reception'),
      compliance: matchedModules.some((module) => module.key === 'compliance'),
      utilities: matchedModules.some((module) => module.key === 'utilities'),
      reports: matchedModules.some((module) => module.key === 'reports'),
      marketplace: matchedModules.some((module) => module.key === 'marketplace'),
      orchards: matchedModules.some((module) => module.key === 'orchards'),
      satellite: matchedModules.some((module) => module.key === 'satellite'),
      weather: matchedModules.some((module) => module.key === 'weather'),
      soil: matchedModules.some((module) => module.key === 'soil'),
      alerts: matchedModules.some((module) => module.key === 'alerts'),
      forecast: matchedModules.some((module) => module.key === 'forecast'),
      settings: matchedModules.some((module) => module.key === 'settings'),
      agromindiaIntel: matchedModules.some((module) => module.key === 'agromindiaIntel'),
      matchedModules,
    };

    // Check if any specific module was matched (excluding always-loaded farm/worker)
    const specificModulesMatched = [
      contextNeeds.accounting, contextNeeds.inventory, contextNeeds.production,
      contextNeeds.supplierCustomer, contextNeeds.campaigns, contextNeeds.reception,
      contextNeeds.compliance, contextNeeds.utilities, contextNeeds.reports,
      contextNeeds.marketplace, contextNeeds.orchards, contextNeeds.satellite,
      contextNeeds.weather, contextNeeds.soil, contextNeeds.alerts, contextNeeds.forecast,
      contextNeeds.settings, contextNeeds.agromindiaIntel,
    ].some(Boolean);

    // General/overview queries that should load ALL key contexts
    const isGeneralQuery = /overview|summary|dashboard|help|status|what should i do|how.+doing|everything|all|résumé|vue d'ensemble|aide|tableau de bord|comment ça va|tout|ملخص|نظرة عامة|مساعدة|لوحة القيادة|كل شيء|good morning|bonjour|صباح الخير|today|aujourd'hui|اليوم/.test(lowerQuery);

    if (!specificModulesMatched || isGeneralQuery) {
      contextNeeds.accounting = true;
      contextNeeds.inventory = true;
      contextNeeds.production = true;
      contextNeeds.campaigns = true;
      contextNeeds.compliance = true;
      contextNeeds.weather = true;
      contextNeeds.alerts = true;
      contextNeeds.forecast = true;
      contextNeeds.settings = true;
      contextNeeds.agromindiaIntel = true;
    }

    this.logger.log(
      `Context routing: agromindiaIntel=${contextNeeds.agromindiaIntel}, ` +
      `accounting=${contextNeeds.accounting}, inventory=${contextNeeds.inventory}, ` +
      `production=${contextNeeds.production}, weather=${contextNeeds.weather}, ` +
      `isGeneral=${isGeneralQuery}, matchedModules=${matchedModules.map((module) => `${module.key}:${module.score}`).join(',')}`,
    );

    return contextNeeds;
  }

  getMatchedModules(): MatchedModule[] {
    return this.matchedModules;
  }

  setMatchedModules(matchedModules: MatchedModule[]): void {
    this.matchedModules = matchedModules;
  }

  private getMatchedModulesForQuery(query: string): MatchedModule[] {
    return Object.entries(this.modulePatterns)
      .map(([key, pattern]) => ({
        key: key as MatchedModule['key'],
        score: this.countKeywordMatches(query, pattern),
      }))
      .filter((module) => module.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private countKeywordMatches(query: string, pattern: RegExp): number {
    const matches = query.match(new RegExp(pattern.source, 'g'));
    return matches?.length || 0;
  }
}
