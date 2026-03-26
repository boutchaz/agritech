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
}

@Injectable()
export class ContextRouterService {
  private readonly logger = new Logger(ContextRouterService.name);

  /**
   * Analyze query using keyword-based routing to determine which context modules to load.
   * Supports multilingual keywords (English, French, Arabic).
   * Farm and worker contexts are ALWAYS loaded (most common queries).
   */
  analyzeQuery(query: string): ContextNeeds {
    const lowerQuery = query.toLowerCase();

    const contextNeeds: ContextNeeds = {
      farm: true, // Always load
      worker: true, // Always load
      accounting: /invoice|payment|expense|revenue|profit|cost|fiscal|tax|accounting|financial|budget|journal|account|total|spend|how much|facture|paiement|dépense|revenu|coût|comptabilité|financier|combien|total des|فاتورة|دفعة|مصروف|إيراد|تكلفة|محاسبة|مالي|كم|إجمالي/.test(lowerQuery),
      inventory: /stock|inventory|warehouse|item|product|material|reception|supply|inventaire|entrepôt|article|produit|matériel|approvisionnement|مخزون|مستودع|منتج|مادة/.test(lowerQuery),
      production: /harvest|yield|production|quality|delivery|crop cycle|récolte|rendement|contrôle qualité|livraison|cycle de culture|حصاد|محصول|إنتاج|مراقبة الجودة|تسليم/.test(lowerQuery),
      supplierCustomer: /supplier|customer|vendor|client|order|quote|purchase|sale|fournisseur|client|commande|devis|achat|vente|مورد|عميل|طلب|عرض أسعار|شراء|بيع/.test(lowerQuery),
      campaigns: /campaign|campagne|campagnes|project|initiative|حملة/.test(lowerQuery),
      reception: /reception|batch|lot|reception batch|lotissement|réception|دفعة|استلام/.test(lowerQuery),
      compliance: /compliance|certification|audit|non[- ]compliant|conformité|certificat|audit|امتثال|شهادة/.test(lowerQuery),
      utilities: /utility|utilities|bill|electric|water|fuel|gas|utility bill|facture|électricité|eau|gaz|فاتورة/.test(lowerQuery),
      reports: /report|reports|analytics|dashboard report|rapport|statistique|تحليل|تقارير/.test(lowerQuery),
      marketplace: /marketplace|listing|quote request|market|order marketplace|marché|annonce|demande de devis|سوق|عرض/.test(lowerQuery),
      orchards: /orchard|orchards|tree|trees|fruit tree|pruning|taille|arbor|verger|أشجار|بستان/.test(lowerQuery),
      satellite: /satellite|ndvi|ndmi|ndre|gci|savi|vegetation|remote sensing|imagery|indice de végétation|télédétection|imagerie|قمر صناعي|مؤشر الغطاء النباتي|الاستشعار عن بعد/.test(lowerQuery),
      weather: /weather|forecast|temperature|rain|precipitation|climate|frost|storm|humidity|wind|météo|prévision|température|pluie|climat|gel|tempête|humidité|vent|طقس|توقعات|درجة الحرارة|مطر|مناخ|صقيع|عاصفة|رطوبة|رياح/.test(lowerQuery),
      soil: /soil|nutrient|fertilizer|ph|organic matter|texture|soil analysis|sol|nutriment|engrais|matière organique|analyse du sol|تربة|مغذيات|سماد|مادة عضوية|تحليل التربة/.test(lowerQuery),
      alerts: /alert|warning|problem|issue|underperforming|critical|deviation|alerte|avertissement|problème|critique|déviation|تنبيه|تحذير|مشكلة|حرج|انحراف/.test(lowerQuery),
      forecast: /forecast|prediction|expected|upcoming|yield forecast|benchmark|prévision|prédiction|attendu|à venir|référence|توقعات|تنبؤ|متوقع|قادم|معيار/.test(lowerQuery),
      settings: /settings|plan|subscription|admin|role|user|member|permission|paramètre|abonnement|administrateur|rôle|utilisateur|permission|إعدادات|اشتراك|مسؤول|دور|مستخدم|صلاحية/.test(lowerQuery),
      agromindiaIntel: /recommend|diagnostic|calibrat|intervention|plan annuel|annual plan|what should|que faire|ماذا أفعل|conseil|parcelle?|parcel|santé|health|stress|ndvi|ndmi|ndre|fertiliz|irrigat|phenolog|bbch|npk/.test(lowerQuery),
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
      `isGeneral=${isGeneralQuery}`,
    );

    return contextNeeds;
  }
}
