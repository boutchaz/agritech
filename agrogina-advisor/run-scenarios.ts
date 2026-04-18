/**
 * AgroGina CFO Scenario Runner
 * Run with: npx tsx run-scenarios.ts
 */

// ── Types ──
type BasisType = 'per_client' | 'per_ha' | 'per_unit' | 'per_head' | 'per_greenhouse';
interface RDCostItem { id: string; name: string; category: string; qty: number; timeMonths: number; monthlyRate: number; }
interface HaPriceTier { maxHa: number | null; label: string; pricePerHa: number; }
interface ErpModule { id: string; name: string; desc: string; isBase: boolean; checked: boolean; pricePerMonth: number; }
interface HardwareSensor { id: string; name: string; checked: boolean; costPrice: number; sellPrice: number; }
interface RoadmapItem {
  id: string; name: string; desc: string; type: 'software'|'hardware'|'bundle'; checked: boolean;
  rdItems: RDCostItem[]; isParserOnly?: boolean; sensors?: HardwareSensor[];
  mrrPrice: number; mrrBasis: BasisType; upfrontPrice: number; upfrontBasis: BasisType;
  cogsPrice: number; cogsBasis: BasisType; avgUnitsPerClient: number;
  dependsOn: string | null; adoptionPct: number; deliveryMonths: number;
  newClientsPerMonth: number; newModuleOnlyClientsPerMonth?: number; m2mMonthlyPrice?: number;
}
interface InfraConfig {
  devServerCost: number; serverBaseCost: number; serverStepCost: number; serverStepUsers: number;
  agromindApiCostPerUser: number; assistantApiCostPerUser: number;
  geeFixedCost: number; geeVariableCostPerHa: number; geeThresholdUsers: number;
  weatherApiMonthly: number; m2mSimCardMonthly: number;
}
interface SalesRules { freelanceComY1Pct: number; freelanceComY2Pct: number; salariedBase: number; salariedBonusPerDeal: number; }
interface FixedCosts {
  foundersP1: number; foundersP2: number; devP1: number; devP2: number;
  rentP1: number; rentP2: number; admP1: number; admP2: number;
  mktBrandP1: number; mktBrandP2: number;
  vehicleMode: 'purchase'|'loa'; vehiclePurchasePrice: number; vehicleLoaMonthly: number; vehiclesPerCommercial: number;
  techInstallMonthly: number; techInstallTriggerHwModules: number; techInstallScalingClients: number;
  savTerrainMonthly: number; savTerrainTriggerClients: number;
  devMaintenanceMonthly: number; devMaintenanceTriggerModules: number;
  agronomeMonthly: number; agronomeTriggerClients: number;
  hwBufferStockPct: number; triggerPhase2MRR: number;
}
interface MarketingChannel {
  id: string; name: string; emoji: string; enabled: boolean; budgetMonthly: number;
  costPerLead: number; leadsPerMonth: number; conversionPct: number; note: string;
  frequency?: 'monthly'|'yearly'; eventsPerYear?: number; costPerEvent?: number; leadsPerEvent?: number;
}
interface GrowthTranche { label: string; fromMonth: number; toMonth: number; newClientsPerMonth: number; }
interface EngineState {
  erpModules: ErpModule[]; erpSizeMultiplier: number; haPriceTiers: HaPriceTier[];
  haPricingMode: 'progressive'|'static'; discountPct: number; avgHectaresPerClient: number;
  roadmapItems: RoadmapItem[]; droneStrategy: 'third_party'|'proprietary'; droneCapExCost: number;
  droneThirdPartyMode: 'per_ha'|'per_day'; droneThirdPartyPrice: number;
  dronePassagesPerMonth: number; droneCampaignMonths: number;
  droneChargeMode: 'per_ha'|'flat'; droneChargePrice: number;
  infra: InfraConfig; salesFreelanceCount: number; salesSalariedCount: number;
  salesCapacityPerRep: number; salesRules: SalesRules; salesScaling: { everyNUsers: number }; churnRate: number;
  fixedCosts: FixedCosts; marketing: { channels: MarketingChannel[] };
  growthTranches: GrowthTranche[]; newUsersPerMonth: number; startCash: number;
  fundAmount: number; fundMonth: number; unlockRiskBufferPct: number;
}

// ── Helpers ──
function computeRDTotal(items: RDCostItem[]): number { return items.reduce((s, i) => s + i.qty * i.timeMonths * i.monthlyRate, 0); }
function computeHaTotalPrice(ha: number, tiers: HaPriceTier[]): number {
  const sorted = [...tiers].sort((a, b) => (a.maxHa || 999999) - (b.maxHa || 999999));
  let rem = ha, tot = 0, prev = 0;
  for (const t of sorted) { const isLast = !t.maxHa || t.maxHa >= 999999; const cur = t.maxHa || 999999; const w = isLast ? rem : cur - prev; const h = Math.min(rem, w); if (h <= 0) break; tot += h * t.pricePerHa; rem -= h; prev = isLast ? prev : cur; }
  return tot;
}
function computeHaTotalPriceStatic(ha: number, tiers: HaPriceTier[]): number {
  const sorted = [...tiers].sort((a, b) => (a.maxHa || 999999) - (b.maxHa || 999999));
  for (const t of sorted) { if (ha <= (t.maxHa || 999999) || !t.maxHa || t.maxHa >= 999999) return ha * t.pricePerHa; }
  return ha * sorted[sorted.length - 1].pricePerHa;
}
function computeErpMonthly(mods: ErpModule[], mult = 1): number { return mods.filter(m => m.checked).reduce((a, m) => a + m.pricePerMonth * mult, 0); }
function getNewUsersForMonth(month: number, tranches: GrowthTranche[]): number {
  for (const t of tranches) { if (month >= t.fromMonth && month <= t.toMonth) return t.newClientsPerMonth; }
  return tranches.length > 0 ? tranches[tranches.length - 1].newClientsPerMonth : 0;
}

// ── 60-Month Engine ──
interface MonthData {
  month: number; users: number; newUsers: number; churnedUsers: number;
  mrrBase: number; mrrUnlocked: number; totalMrr: number; cashRevenue: number;
  cogs: number; rdCapEx: number; grossMargin: number; totalOpex: number;
  ebitda: number; cash: number; phase: 1|2; unlockedThisMonth: string[];
  activeSalariedCount: number; fundingReceived: number; droneRevenue: number;
}

function generate60Months(state: EngineState): MonthData[] {
  const result: MonthData[] = [];
  let currentCash = state.startCash, currentUsers = 0, currentPhase: 1|2 = 1;
  const cohortSignups: { funnel: number; organic: Record<string, { full: number; only: number }> }[] = Array.from({ length: 61 }, () => ({ funnel: 0, organic: {} }));
  const activeOrganicUsers: Record<string, { full: number; only: number }> = {};
  const unlockedIds = new Set<string>(), unlockMonths = new Map<string, number>();
  let droneCapExFired = false, activeSalaried = state.salesSalariedCount, cumulativeHwClients = 0;

  for (let month = 1; month <= 60; month++) {
    let rdCapExThisMonth = 0;
    const unlockedThisMonth: string[] = [];

    // Funding
    let fundingThisMonth = 0;
    if (state.fundMonth > 0 && month === state.fundMonth) { currentCash += state.fundAmount; fundingThisMonth = state.fundAmount; }

    // Sales scaling
    if (state.salesScaling.everyNUsers > 0 && currentUsers > 0) {
      activeSalaried = Math.max(activeSalaried, state.salesSalariedCount + Math.floor(currentUsers / state.salesScaling.everyNUsers));
    }

    // Base MRR per client
    const baseMrrPerClient = (computeErpMonthly(state.erpModules, state.erpSizeMultiplier) +
      (state.haPricingMode === 'static' ? computeHaTotalPriceStatic(state.avgHectaresPerClient, state.haPriceTiers) : computeHaTotalPrice(state.avgHectaresPerClient, state.haPriceTiers)) / 12
    ) * (1 - state.discountPct / 100);

    const activeRoadmapItems = state.roadmapItems.filter(i => {
      if (!unlockedIds.has(i.id)) return false;
      return month > (unlockMonths.get(i.id) || 0) + i.deliveryMonths;
    });

    // Acquisition
    let weightedClients = 0;
    for (const ch of state.marketing.channels) {
      if (!ch.enabled) continue;
      let chLeads = 0;
      if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.leadsPerEvent) chLeads = Math.floor((ch.eventsPerYear * ch.leadsPerEvent) / 12);
      else if (ch.costPerLead > 0 && ch.budgetMonthly > 0) chLeads = Math.floor(ch.budgetMonthly / ch.costPerLead);
      else chLeads = ch.leadsPerMonth;
      weightedClients += chLeads * (ch.conversionPct / 100);
    }
    const clientsFromFunnel = Math.floor(weightedClients);
    const totalAgents = state.salesFreelanceCount + activeSalaried;
    const salesCapacity = totalAgents * state.salesCapacityPerRep;
    const targetNewUsers = getNewUsersForMonth(month, state.growthTranches);
    const maxFromFunnel = totalAgents > 0 ? Math.min(clientsFromFunnel, salesCapacity) : targetNewUsers;
    const newFunnelUsers = Math.min(targetNewUsers, maxFromFunnel > 0 ? maxFromFunnel : targetNewUsers);

    // Organic from modules
    const newOrganicByModule: Record<string, { full: number; only: number }> = {};
    let totalNewOrganicFull = 0;
    for (const i of activeRoadmapItems) {
      if (i.newClientsPerMonth > 0 || (i.newModuleOnlyClientsPerMonth && i.newModuleOnlyClientsPerMonth > 0)) {
        newOrganicByModule[i.id] = { full: i.newClientsPerMonth || 0, only: i.newModuleOnlyClientsPerMonth || 0 };
        totalNewOrganicFull += (i.newClientsPerMonth || 0);
      }
    }
    const newUsers = newFunnelUsers + totalNewOrganicFull;
    cohortSignups[month] = { funnel: newFunnelUsers, organic: newOrganicByModule };

    // Churn & active users
    let totalActiveOrganicFull = 0;
    for (const c of Object.values(activeOrganicUsers)) totalActiveOrganicFull += c.full;
    const currentFunnelUsers = currentUsers - totalActiveOrganicFull;
    const churnedFunnel = Math.floor(currentFunnelUsers * (state.churnRate / 100));
    const newCurrentFunnel = Math.max(0, currentFunnelUsers + newFunnelUsers - churnedFunnel);

    for (const modId of Object.keys(activeOrganicUsers)) {
      const a = activeOrganicUsers[modId];
      activeOrganicUsers[modId] = {
        full: Math.max(0, a.full + (newOrganicByModule[modId]?.full || 0) - Math.floor(a.full * (state.churnRate / 100))),
        only: Math.max(0, a.only + (newOrganicByModule[modId]?.only || 0) - Math.floor(a.only * (state.churnRate / 100)))
      };
    }
    for (const [modId, obj] of Object.entries(newOrganicByModule)) {
      if (!activeOrganicUsers[modId]) activeOrganicUsers[modId] = { full: obj.full, only: obj.only };
    }

    let totalNewActiveOrganicFull = 0, totalNewActiveOrganicOnly = 0;
    for (const c of Object.values(activeOrganicUsers)) { totalNewActiveOrganicFull += c.full; totalNewActiveOrganicOnly += c.only; }

    const churnedUsers = Math.floor(currentUsers * (state.churnRate / 100)) + Math.floor(totalNewActiveOrganicOnly * (state.churnRate / 100));
    currentUsers = newCurrentFunnel + totalNewActiveOrganicFull;

    // Revenue
    const mrrBase = currentUsers * baseMrrPerClient;
    let mrrUnlocked = 0, unlockedHwUpfront = 0, unlockedHwCOGS = 0;

    for (const i of activeRoadmapItems) {
      if (i.isParserOnly) continue;
      const mC = i.mrrBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.mrrBasis) ? i.avgUnitsPerClient : 1);
      const uC = i.upfrontBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.upfrontBasis) ? i.avgUnitsPerClient : 1);
      const cC = i.cogsBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.cogsBasis) ? i.avgUnitsPerClient : 1);

      const orgF = activeOrganicUsers[i.id]?.full || 0, orgO = activeOrganicUsers[i.id]?.only || 0;
      const adopted = orgF + (currentUsers - orgF) * (i.adoptionPct / 100);
      mrrUnlocked += (adopted + orgO) * i.mrrPrice * mC;
      if (i.m2mMonthlyPrice) mrrUnlocked += (adopted + orgO) * i.m2mMonthlyPrice;

      const orgNewF = newOrganicByModule[i.id]?.full || 0, orgNewO = newOrganicByModule[i.id]?.only || 0;
      const newAdopted = orgNewF + (newUsers - orgNewF) * (i.adoptionPct / 100) + orgNewO;
      let itemUp = i.upfrontPrice * uC, itemCogs = i.cogsPrice * cC;
      if (i.sensors?.length) { itemUp = 0; itemCogs = 0; for (const s of i.sensors) if (s.checked) { itemUp += s.sellPrice; itemCogs += s.costPrice; } }
      unlockedHwUpfront += newAdopted * itemUp;
      unlockedHwCOGS += newAdopted * itemCogs;
    }
    const totalMrr = mrrBase + mrrUnlocked;

    // Cash revenue (annual upfront)
    let cashRevenue = newUsers * baseMrrPerClient * 12;
    for (const i of activeRoadmapItems) {
      if (i.isParserOnly) continue;
      const mC = i.mrrBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.mrrBasis) ? i.avgUnitsPerClient : 1);
      const orgNewF = newOrganicByModule[i.id]?.full || 0, orgNewO = newOrganicByModule[i.id]?.only || 0;
      const newAdopted = orgNewF + (newUsers - orgNewF) * (i.adoptionPct / 100) + orgNewO;
      let annualMrr = i.mrrPrice * mC * 12;
      if (i.m2mMonthlyPrice) annualMrr += i.m2mMonthlyPrice * 12;
      cashRevenue += newAdopted * annualMrr;
    }
    cashRevenue += unlockedHwUpfront;

    // Drone billing
    let droneRevenue = 0;
    const droneItem = activeRoadmapItems.find(i => i.id === 'rm-drone');
    if (droneItem) {
      const orgF = activeOrganicUsers['rm-drone']?.full || 0, orgO = activeOrganicUsers['rm-drone']?.only || 0;
      const adopted = orgF + orgO + (currentUsers - orgF) * (droneItem.adoptionPct / 100);
      const isCampaign = ((month - 1) % 12) < state.droneCampaignMonths;
      if (isCampaign) {
        droneRevenue = state.droneChargeMode === 'per_ha'
          ? adopted * state.avgHectaresPerClient * state.droneChargePrice * state.dronePassagesPerMonth
          : adopted * state.droneChargePrice * state.dronePassagesPerMonth;
      }
    }
    cashRevenue += droneRevenue;

    // Renewals (year N+1+)
    let retainedUsers = 0;
    const retainedOrganic: Record<string, { full: number; only: number }> = {};
    if (month > 12) {
      let baseRetained = 0;
      for (let pm = month - 12; pm > 0; pm -= 12) {
        const cohort = cohortSignups[pm]; if (!cohort) continue;
        const rf = Math.pow(1 - state.churnRate / 100, month - pm);
        baseRetained += Math.floor(cohort.funnel * rf);
        for (const [mid, obj] of Object.entries(cohort.organic)) {
          if (!retainedOrganic[mid]) retainedOrganic[mid] = { full: 0, only: 0 };
          retainedOrganic[mid].full += Math.floor(obj.full * rf);
          retainedOrganic[mid].only += Math.floor(obj.only * rf);
        }
      }
      retainedUsers = baseRetained;
      for (const c of Object.values(retainedOrganic)) retainedUsers += c.full;
      cashRevenue += retainedUsers * baseMrrPerClient * 12;
      for (const i of activeRoadmapItems) {
        if (i.isParserOnly) continue;
        const mC = i.mrrBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.mrrBasis) ? i.avgUnitsPerClient : 1);
        const orgRetF = retainedOrganic[i.id]?.full || 0, orgRetO = retainedOrganic[i.id]?.only || 0;
        const retAdopted = orgRetF + (retainedUsers - orgRetF) * (i.adoptionPct / 100) + orgRetO;
        let annualMrr = i.mrrPrice * mC * 12;
        if (i.m2mMonthlyPrice) annualMrr += i.m2mMonthlyPrice * 12;
        cashRevenue += retAdopted * annualMrr;
      }
    }

    // COGS
    let serverCost = state.infra.serverBaseCost;
    if (state.infra.serverStepUsers > 0) serverCost += Math.floor(currentUsers / state.infra.serverStepUsers) * state.infra.serverStepCost;
    serverCost += currentUsers * (state.infra.agromindApiCostPerUser + state.infra.assistantApiCostPerUser);
    let geeCost = 0;
    if (currentUsers >= state.infra.geeThresholdUsers) geeCost = state.infra.geeFixedCost + currentUsers * state.avgHectaresPerClient * state.infra.geeVariableCostPerHa;
    let droneVar = 0;
    if (state.droneStrategy === 'third_party' && droneItem) {
      const adopted = currentUsers * (droneItem.adoptionPct / 100);
      const isCampaign = ((month - 1) % 12) < state.droneCampaignMonths;
      if (isCampaign) droneVar = state.droneThirdPartyMode === 'per_ha'
        ? adopted * state.avgHectaresPerClient * state.droneThirdPartyPrice * state.dronePassagesPerMonth
        : adopted * state.droneThirdPartyPrice * state.dronePassagesPerMonth;
    }
    const couveuseOnly = activeOrganicUsers['rm-couveuse']?.only || 0;
    const m2mSim = unlockedIds.has('rm-couveuse') ? couveuseOnly * state.infra.m2mSimCardMonthly : 0;
    const totalCOGS = state.infra.devServerCost + serverCost + geeCost + state.infra.weatherApiMonthly + droneVar + newUsers * unlockedHwCOGS + m2mSim;
    const grossMargin = cashRevenue - totalCOGS;

    // Commissions
    const freelanceShare = totalAgents > 0 ? state.salesFreelanceCount / totalAgents : 0;
    const salariedShare = totalAgents > 0 ? activeSalaried / totalAgents : 0;
    let newMrr = newFunnelUsers * baseMrrPerClient;
    for (const i of activeRoadmapItems) {
      if (i.isParserOnly) continue;
      const mC = i.mrrBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.mrrBasis) ? i.avgUnitsPerClient : 1);
      const orgNewF = newOrganicByModule[i.id]?.full || 0;
      newMrr += (orgNewF + (newUsers - orgNewF) * (i.adoptionPct / 100)) * i.mrrPrice * mC;
    }
    let freelanceCom = (newMrr * 12) * freelanceShare * (state.salesRules.freelanceComY1Pct / 100);
    if (month > 12) {
      let renewedMrr = retainedUsers * baseMrrPerClient;
      for (const i of activeRoadmapItems) {
        if (i.isParserOnly) continue;
        const mC = i.mrrBasis === 'per_ha' ? state.avgHectaresPerClient : (['per_unit','per_head','per_greenhouse'].includes(i.mrrBasis) ? i.avgUnitsPerClient : 1);
        const orgRetF = retainedOrganic[i.id]?.full || 0;
        renewedMrr += (orgRetF + (retainedUsers - orgRetF) * (i.adoptionPct / 100)) * i.mrrPrice * mC;
      }
      freelanceCom += (renewedMrr * 12) * freelanceShare * (state.salesRules.freelanceComY2Pct / 100);
    }
    const salariedBaseCost = activeSalaried * state.salesRules.salariedBase;
    const totalCommissions = freelanceCom + (newUsers * salariedShare) * state.salesRules.salariedBonusPerDeal;

    // OPEX
    if (currentPhase === 1 && totalMrr >= state.fixedCosts.triggerPhase2MRR) currentPhase = 2;
    const fc = state.fixedCosts;
    const founders = currentPhase === 1 ? fc.foundersP1 : fc.foundersP2;
    const dev = currentPhase === 1 ? fc.devP1 : fc.devP2;
    const rent = currentPhase === 1 ? fc.rentP1 : fc.rentP2;
    const adm = currentPhase === 1 ? fc.admP1 : fc.admP2;
    const mktBrand = currentPhase === 1 ? fc.mktBrandP1 : fc.mktBrandP2;
    let varMkt = 0;
    for (const ch of state.marketing.channels) {
      if (!ch.enabled) continue;
      if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.costPerEvent) varMkt += (ch.eventsPerYear * ch.costPerEvent) / 12;
      else varMkt += ch.budgetMonthly || 0;
    }
    let transport = 0;
    if (currentPhase === 2 && activeSalaried > 0) {
      const vehicles = Math.ceil(activeSalaried / Math.max(fc.vehiclesPerCommercial, 1));
      transport = fc.vehicleMode === 'loa' ? vehicles * fc.vehicleLoaMonthly : vehicles * (fc.vehiclePurchasePrice / 48);
    }
    const salariesBase = founders + dev + salariedBaseCost;

    // Module variable opex
    const hwModIds = ['rm-hw-capteurs', 'rm-couveuse', 'rm-elevage', 'rm-myci-serre', 'rm-drone'];
    let hwModCount = 0; for (const id of unlockedIds) if (hwModIds.includes(id)) hwModCount++;
    let hwClients = 0, totalModClients = 0;
    for (const i of activeRoadmapItems) {
      if (!i.isParserOnly) {
        const orgF = activeOrganicUsers[i.id]?.full || 0, orgO = activeOrganicUsers[i.id]?.only || 0;
        const adopted = orgF + orgO + (currentUsers - orgF) * (i.adoptionPct / 100);
        totalModClients += adopted;
        if (hwModIds.includes(i.id)) {
          hwClients += adopted;
          const orgNewF = newOrganicByModule[i.id]?.full || 0, orgNewO = newOrganicByModule[i.id]?.only || 0;
          cumulativeHwClients += orgNewF + orgNewO + (newUsers - orgNewF) * (i.adoptionPct / 100);
        }
      }
    }
    let techInstall = 0;
    if (hwModCount >= fc.techInstallTriggerHwModules) techInstall = (1 + Math.floor(Math.max(0, hwClients - 1) / Math.max(1, fc.techInstallScalingClients))) * fc.techInstallMonthly;
    const sav = cumulativeHwClients >= fc.savTerrainTriggerClients ? fc.savTerrainMonthly : 0;
    const devMaint = (unlockedIds.size >= fc.devMaintenanceTriggerModules && currentPhase === 2) ? fc.devMaintenanceMonthly : 0;
    const agronome = (currentPhase === 2 && totalModClients >= fc.agronomeTriggerClients) ? fc.agronomeMonthly : 0;

    const totalOpex = salariesBase + totalCommissions + rent + varMkt + mktBrand + adm + transport + techInstall + sav + devMaint + agronome;

    // HW buffer stock CapEx
    let hwBuffer = 0;
    for (const i of state.roadmapItems) {
      if (hwModIds.includes(i.id) && unlockedIds.has(i.id)) {
        const realStart = (unlockMonths.get(i.id) || 0) + i.deliveryMonths;
        if (month === realStart - 1) {
          let cC = ['per_unit','per_head','per_greenhouse'].includes(i.cogsBasis) ? i.avgUnitsPerClient : (i.cogsBasis === 'per_ha' ? state.avgHectaresPerClient : 1);
          let itemCogs = i.cogsPrice * cC;
          if (i.sensors?.length) { itemCogs = 0; for (const s of i.sensors) if (s.checked) itemCogs += s.costPrice; }
          const est = (currentUsers * (i.adoptionPct / 100)) + ((i.newClientsPerMonth || 0) + (i.newModuleOnlyClientsPerMonth || 0)) * 12;
          hwBuffer += (est * itemCogs) * (fc.hwBufferStockPct / 100);
        }
      }
    }
    currentCash -= hwBuffer;

    // EBITDA & Cash
    const ebitda = cashRevenue - totalCOGS - totalOpex;
    currentCash += ebitda;

    // Auto-unlock
    const riskMult = 1 + state.unlockRiskBufferPct / 100;
    let unlockHappened = true;
    while (unlockHappened) {
      unlockHappened = false;
      for (const item of state.roadmapItems) {
        if (!item.checked || unlockedIds.has(item.id)) continue;
        if (item.dependsOn && !unlockedIds.has(item.dependsOn)) continue;
        const rdCost = computeRDTotal(item.rdItems);
        if (rdCost > 0 && currentCash < rdCost * riskMult) continue;
        unlockedIds.add(item.id); unlockMonths.set(item.id, month);
        rdCapExThisMonth += rdCost; currentCash -= rdCost;
        unlockedThisMonth.push(item.name); unlockHappened = true;
      }
    }
    if (state.droneStrategy === 'proprietary' && !droneCapExFired && unlockedIds.has('rm-drone')) {
      droneCapExFired = true; rdCapExThisMonth += state.droneCapExCost; currentCash -= state.droneCapExCost;
    }

    result.push({ month, users: currentUsers, newUsers, churnedUsers, mrrBase, mrrUnlocked, totalMrr, cashRevenue,
      cogs: totalCOGS, rdCapEx: rdCapExThisMonth, grossMargin, totalOpex, ebitda, cash: currentCash,
      phase: currentPhase, unlockedThisMonth, activeSalariedCount: activeSalaried, fundingReceived: fundingThisMonth, droneRevenue });
  }
  return result;
}

// ══════════════════════════════════════════════
//  DEFAULT STATE
// ══════════════════════════════════════════════
let _rdId = 0;
const rdId = () => `rd-${++_rdId}`;

const defaultRoadmap: RoadmapItem[] = [
  { id: 'rm-drone', name: 'Imagerie par Drone', desc: '', type: 'software', checked: true, dependsOn: null,
    mrrPrice: 10, mrrBasis: 'per_ha', upfrontPrice: 0, upfrontBasis: 'per_client', cogsPrice: 0, cogsBasis: 'per_client', avgUnitsPerClient: 1,
    adoptionPct: 30, deliveryMonths: 3, newClientsPerMonth: 0,
    rdItems: [{ id: rdId(), name: 'Dev pipeline', category: 'dev', qty: 1, timeMonths: 4, monthlyRate: 15000 }, { id: rdId(), name: 'Agrosciences', category: 'other', qty: 1, timeMonths: 3, monthlyRate: 12000 }] },
  { id: 'rm-maraich', name: 'Module Maraîchage', desc: '', type: 'software', checked: true, dependsOn: 'rm-drone',
    mrrPrice: 150, mrrBasis: 'per_ha', upfrontPrice: 0, upfrontBasis: 'per_client', cogsPrice: 0, cogsBasis: 'per_client', avgUnitsPerClient: 1,
    adoptionPct: 15, deliveryMonths: 2, newClientsPerMonth: 2,
    rdItems: [{ id: rdId(), name: 'Dev backend', category: 'dev', qty: 1, timeMonths: 2, monthlyRate: 12000 }, { id: rdId(), name: 'Test QA', category: 'test', qty: 1, timeMonths: 1, monthlyRate: 8000 }] },
  { id: 'rm-iot-sensors', name: 'Hardware Capteurs', desc: '', type: 'hardware', checked: true, dependsOn: null,
    mrrPrice: 0, mrrBasis: 'per_client', upfrontPrice: 0, upfrontBasis: 'per_unit', cogsPrice: 0, cogsBasis: 'per_unit', avgUnitsPerClient: 1,
    adoptionPct: 20, deliveryMonths: 4, newClientsPerMonth: 1,
    sensors: [{ id: 's1', name: 'Station Météo', checked: true, costPrice: 3000, sellPrice: 5000 }, { id: 's2', name: 'Humidité Sol', checked: true, costPrice: 500, sellPrice: 1200 },
      { id: 's3', name: 'NPK', checked: true, costPrice: 1200, sellPrice: 2500 }, { id: 's4', name: 'Gateway', checked: true, costPrice: 2000, sellPrice: 4000 }],
    rdItems: [{ id: rdId(), name: 'Ingénieur HW', category: 'hw_engineer', qty: 1, timeMonths: 6, monthlyRate: 18000 }, { id: rdId(), name: 'Proto', category: 'material', qty: 1, timeMonths: 1, monthlyRate: 40000 }, { id: rdId(), name: 'Certification', category: 'certification', qty: 1, timeMonths: 1, monthlyRate: 20000 }] },
  { id: 'rm-iot-parser', name: 'Data Parser IoT', desc: '', type: 'software', checked: true, dependsOn: 'rm-iot-sensors', isParserOnly: true,
    mrrPrice: 0, mrrBasis: 'per_client', upfrontPrice: 0, upfrontBasis: 'per_client', cogsPrice: 0, cogsBasis: 'per_client', avgUnitsPerClient: 1,
    adoptionPct: 100, deliveryMonths: 1, newClientsPerMonth: 0,
    rdItems: [{ id: rdId(), name: 'Dev Parser', category: 'server', qty: 1, timeMonths: 2, monthlyRate: 14000 }] },
  { id: 'rm-couveuse', name: 'Couveuses Connectées', desc: '', type: 'bundle', checked: true, dependsOn: 'rm-iot-parser',
    mrrPrice: 100, mrrBasis: 'per_unit', upfrontPrice: 8000, upfrontBasis: 'per_unit', cogsPrice: 3500, cogsBasis: 'per_unit', avgUnitsPerClient: 2,
    adoptionPct: 5, deliveryMonths: 6, newClientsPerMonth: 2, newModuleOnlyClientsPerMonth: 3, m2mMonthlyPrice: 50,
    rdItems: [{ id: rdId(), name: 'IA/Robotique', category: 'dev', qty: 1, timeMonths: 5, monthlyRate: 20000 }, { id: rdId(), name: 'Proto HW', category: 'material', qty: 1, timeMonths: 1, monthlyRate: 60000 }] },
  { id: 'rm-elevage', name: 'Module Élevage', desc: '', type: 'bundle', checked: true, dependsOn: null,
    mrrPrice: 5, mrrBasis: 'per_head', upfrontPrice: 15, upfrontBasis: 'per_head', cogsPrice: 5, cogsBasis: 'per_head', avgUnitsPerClient: 100,
    adoptionPct: 10, deliveryMonths: 3, newClientsPerMonth: 1, newModuleOnlyClientsPerMonth: 2,
    rdItems: [{ id: rdId(), name: 'Fullstack Dev', category: 'dev', qty: 2, timeMonths: 4, monthlyRate: 14000 }, { id: rdId(), name: 'API RFID', category: 'api', qty: 1, timeMonths: 1, monthlyRate: 15000 }] },
  { id: 'rm-myci-serre', name: 'Mycoculture & Serres', desc: '', type: 'bundle', checked: true, dependsOn: 'rm-iot-sensors',
    mrrPrice: 100, mrrBasis: 'per_greenhouse', upfrontPrice: 0, upfrontBasis: 'per_unit', cogsPrice: 0, cogsBasis: 'per_unit', avgUnitsPerClient: 5,
    adoptionPct: 15, deliveryMonths: 3, newClientsPerMonth: 1, newModuleOnlyClientsPerMonth: 2,
    sensors: [{ id: 'sm1', name: 'Sonde T°', checked: true, costPrice: 150, sellPrice: 400 }, { id: 'sm2', name: 'Hygrométrie', checked: true, costPrice: 200, sellPrice: 500 }, { id: 'sm3', name: 'CO2', checked: true, costPrice: 800, sellPrice: 1800 }],
    rdItems: [{ id: rdId(), name: 'Dev serre', category: 'dev', qty: 1, timeMonths: 3, monthlyRate: 12000 }] },
];

function createBaseState(): EngineState {
  return {
    erpModules: [
      { id: 'e1', name: 'Multi-Fermes', desc: '', isBase: true, checked: true, pricePerMonth: 100 },
      { id: 'e2', name: 'Dashboard', desc: '', isBase: true, checked: true, pricePerMonth: 50 },
      { id: 'e3', name: 'Tâches', desc: '', isBase: true, checked: true, pricePerMonth: 80 },
      { id: 'e4', name: 'Récolte', desc: '', isBase: true, checked: true, pricePerMonth: 50 },
      { id: 'e5', name: 'RH & Paie', desc: '', isBase: false, checked: true, pricePerMonth: 80 },
      { id: 'e6', name: 'Stocks', desc: '', isBase: false, checked: true, pricePerMonth: 60 },
      { id: 'e7', name: 'Compta', desc: '', isBase: false, checked: false, pricePerMonth: 250 },
      { id: 'e8', name: 'Qualité', desc: '', isBase: false, checked: false, pricePerMonth: 40 },
      { id: 'e9', name: 'Conformité', desc: '', isBase: false, checked: false, pricePerMonth: 60 },
      { id: 'e10', name: 'Marketplace', desc: '', isBase: false, checked: false, pricePerMonth: 50 },
      { id: 'e11', name: 'Assistant IA', desc: '', isBase: false, checked: false, pricePerMonth: 60 },
    ],
    erpSizeMultiplier: 1, haPricingMode: 'progressive', discountPct: 10, avgHectaresPerClient: 50,
    haPriceTiers: [
      { maxHa: 5, label: '<5ha', pricePerHa: 500 }, { maxHa: 20, label: '5-20ha', pricePerHa: 400 },
      { maxHa: 100, label: '20-100ha', pricePerHa: 300 }, { maxHa: 200, label: '100-200ha', pricePerHa: 250 },
      { maxHa: 400, label: '200-400ha', pricePerHa: 200 }, { maxHa: 500, label: '400-500ha', pricePerHa: 180 },
      { maxHa: 999999, label: '500+ha', pricePerHa: 150 },
    ],
    roadmapItems: JSON.parse(JSON.stringify(defaultRoadmap)),
    droneStrategy: 'third_party', droneCapExCost: 150000, droneThirdPartyMode: 'per_day', droneThirdPartyPrice: 10000,
    dronePassagesPerMonth: 3, droneCampaignMonths: 3, droneChargeMode: 'per_ha', droneChargePrice: 150,
    infra: { devServerCost: 500, serverBaseCost: 1000, serverStepCost: 2000, serverStepUsers: 500,
      agromindApiCostPerUser: 100, assistantApiCostPerUser: 50, geeFixedCost: 500, geeVariableCostPerHa: 2,
      geeThresholdUsers: 100, weatherApiMonthly: 300, m2mSimCardMonthly: 40 },
    salesFreelanceCount: 1, salesSalariedCount: 0, salesCapacityPerRep: 6,
    salesRules: { freelanceComY1Pct: 15, freelanceComY2Pct: 5, salariedBase: 6000, salariedBonusPerDeal: 300 },
    salesScaling: { everyNUsers: 50 }, churnRate: 2,
    fixedCosts: {
      foundersP1: 0, foundersP2: 60000, devP1: 0, devP2: 15000, rentP1: 0, rentP2: 8000, admP1: 0, admP2: 5000,
      mktBrandP1: 0, mktBrandP2: 20000, vehicleMode: 'loa', vehiclePurchasePrice: 150000, vehicleLoaMonthly: 3000, vehiclesPerCommercial: 2,
      techInstallMonthly: 5500, techInstallTriggerHwModules: 1, techInstallScalingClients: 15,
      savTerrainMonthly: 4500, savTerrainTriggerClients: 20, devMaintenanceMonthly: 9000, devMaintenanceTriggerModules: 3,
      agronomeMonthly: 7000, agronomeTriggerClients: 1, hwBufferStockPct: 25, triggerPhase2MRR: 50000,
    },
    marketing: { channels: [
      { id: 'ads', name: 'Pub Digitale', emoji: '', enabled: true, budgetMonthly: 3000, costPerLead: 150, leadsPerMonth: 20, conversionPct: 5, note: '' },
      { id: 'mail', name: 'Emailing', emoji: '', enabled: true, budgetMonthly: 500, costPerLead: 50, leadsPerMonth: 10, conversionPct: 3, note: '' },
      { id: 'salons', name: 'Salons', emoji: '', enabled: false, budgetMonthly: 0, costPerLead: 250, leadsPerMonth: 0, conversionPct: 15, note: '', frequency: 'yearly', eventsPerYear: 4, costPerEvent: 5000, leadsPerEvent: 20 },
      { id: 'door', name: 'Porte à Porte', emoji: '', enabled: false, budgetMonthly: 2000, costPerLead: 100, leadsPerMonth: 20, conversionPct: 20, note: '' },
      { id: 'sms', name: 'SMS', emoji: '', enabled: false, budgetMonthly: 1000, costPerLead: 30, leadsPerMonth: 33, conversionPct: 2, note: '' },
      { id: 'linkedin', name: 'LinkedIn', emoji: '', enabled: false, budgetMonthly: 2000, costPerLead: 200, leadsPerMonth: 10, conversionPct: 8, note: '' },
      { id: 'content', name: 'Content', emoji: '', enabled: false, budgetMonthly: 1500, costPerLead: 80, leadsPerMonth: 19, conversionPct: 7, note: '' },
      { id: 'partners', name: 'Partenariats', emoji: '', enabled: false, budgetMonthly: 0, costPerLead: 0, leadsPerMonth: 5, conversionPct: 25, note: '' },
    ] },
    growthTranches: [
      { label: 'M1-3', fromMonth: 1, toMonth: 3, newClientsPerMonth: 1 },
      { label: 'M4-6', fromMonth: 4, toMonth: 6, newClientsPerMonth: 2 },
      { label: 'M7-12', fromMonth: 7, toMonth: 12, newClientsPerMonth: 3 },
      { label: 'M13-24', fromMonth: 13, toMonth: 24, newClientsPerMonth: 5 },
      { label: 'M25-60', fromMonth: 25, toMonth: 60, newClientsPerMonth: 8 },
    ],
    newUsersPerMonth: 3, startCash: 0, fundAmount: 2000000, fundMonth: 12, unlockRiskBufferPct: 40,
  };
}

// ══════════════════════════════════════════════
//  SCENARIO VARIANTS
// ══════════════════════════════════════════════

function scenarioBootstrapped(): EngineState {
  const s = createBaseState();
  s.startCash = 200000; s.fundAmount = 0; s.fundMonth = 0;
  s.growthTranches = [
    { label: 'M1-6', fromMonth: 1, toMonth: 6, newClientsPerMonth: 1 },
    { label: 'M7-12', fromMonth: 7, toMonth: 12, newClientsPerMonth: 2 },
    { label: 'M13-24', fromMonth: 13, toMonth: 24, newClientsPerMonth: 3 },
    { label: 'M25-60', fromMonth: 25, toMonth: 60, newClientsPerMonth: 5 },
  ];
  s.roadmapItems = s.roadmapItems.map(r => ({ ...r, checked: ['rm-drone', 'rm-maraich'].includes(r.id) }));
  s.churnRate = 3;
  return s;
}

function scenarioFundedAggressive(): EngineState {
  const s = createBaseState();
  s.startCash = 0; s.fundAmount = 3000000; s.fundMonth = 6;
  s.growthTranches = [
    { label: 'M1-3', fromMonth: 1, toMonth: 3, newClientsPerMonth: 2 },
    { label: 'M4-6', fromMonth: 4, toMonth: 6, newClientsPerMonth: 3 },
    { label: 'M7-12', fromMonth: 7, toMonth: 12, newClientsPerMonth: 5 },
    { label: 'M13-24', fromMonth: 13, toMonth: 24, newClientsPerMonth: 8 },
    { label: 'M25-60', fromMonth: 25, toMonth: 60, newClientsPerMonth: 12 },
  ];
  s.marketing.channels = s.marketing.channels.map(ch => ({ ...ch, enabled: true }));
  s.salesFreelanceCount = 2; s.salesSalariedCount = 1; s.churnRate = 2;
  return s;
}

function scenarioSoftwareOnly(): EngineState {
  const s = createBaseState();
  s.startCash = 100000; s.fundAmount = 1500000; s.fundMonth = 12;
  s.roadmapItems = s.roadmapItems.map(r => ({ ...r, checked: r.type === 'software' && !r.isParserOnly }));
  s.growthTranches = [
    { label: 'M1-3', fromMonth: 1, toMonth: 3, newClientsPerMonth: 1 },
    { label: 'M4-6', fromMonth: 4, toMonth: 6, newClientsPerMonth: 2 },
    { label: 'M7-12', fromMonth: 7, toMonth: 12, newClientsPerMonth: 4 },
    { label: 'M13-24', fromMonth: 13, toMonth: 24, newClientsPerMonth: 6 },
    { label: 'M25-60', fromMonth: 25, toMonth: 60, newClientsPerMonth: 10 },
  ];
  return s;
}

function scenarioPremiumLowChurn(): EngineState {
  const s = createBaseState();
  s.haPriceTiers = s.haPriceTiers.map(t => ({ ...t, pricePerHa: Math.round(t.pricePerHa * 1.2) }));
  s.erpModules = s.erpModules.map(m => ({ ...m, checked: true }));
  s.churnRate = 1;
  s.growthTranches = [
    { label: 'M1-6', fromMonth: 1, toMonth: 6, newClientsPerMonth: 1 },
    { label: 'M7-12', fromMonth: 7, toMonth: 12, newClientsPerMonth: 2 },
    { label: 'M13-24', fromMonth: 13, toMonth: 24, newClientsPerMonth: 4 },
    { label: 'M25-60', fromMonth: 25, toMonth: 60, newClientsPerMonth: 7 },
  ];
  return s;
}

function scenarioWorstCase(): EngineState {
  const s = createBaseState();
  s.fundAmount = 1000000; s.fundMonth = 18; s.churnRate = 5;
  s.growthTranches = [
    { label: 'M1-6', fromMonth: 1, toMonth: 6, newClientsPerMonth: 1 },
    { label: 'M7-18', fromMonth: 7, toMonth: 18, newClientsPerMonth: 1 },
    { label: 'M19-36', fromMonth: 19, toMonth: 36, newClientsPerMonth: 2 },
    { label: 'M37-60', fromMonth: 37, toMonth: 60, newClientsPerMonth: 3 },
  ];
  s.roadmapItems = s.roadmapItems.map(r => ({ ...r, checked: false }));
  return s;
}

// ══════════════════════════════════════════════
//  ANALYSIS & OUTPUT
// ══════════════════════════════════════════════

function fmt(n: number): string { return Math.round(n).toLocaleString('fr-FR'); }

function analyzeScenario(name: string, state: EngineState) {
  const data = generate60Months(state);
  const m12 = data[11], m24 = data[23], m36 = data[35], m60 = data[59];
  const lowestCash = Math.min(...data.map(m => m.cash));
  const lowestMonth = data.find(m => m.cash === lowestCash)!.month;
  const breakEven = data.find(m => m.ebitda > 0)?.month ?? null;

  const baseMrr = (computeErpMonthly(state.erpModules, state.erpSizeMultiplier) +
    (state.haPricingMode === 'static' ? computeHaTotalPriceStatic(state.avgHectaresPerClient, state.haPriceTiers) : computeHaTotalPrice(state.avgHectaresPerClient, state.haPriceTiers)) / 12
  ) * (1 - state.discountPct / 100);
  const avgLife = state.churnRate > 0 ? 1 / (state.churnRate / 100) : 60;
  const ltv = baseMrr * avgLife;
  let mkt = 0;
  for (const ch of state.marketing.channels) { if (ch.enabled) { if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.costPerEvent) mkt += (ch.eventsPerYear * ch.costPerEvent) / 12; else mkt += ch.budgetMonthly; } }
  const targetN = getNewUsersForMonth(12, state.growthTranches);
  const cac = targetN > 0 ? (mkt + state.salesSalariedCount * state.salesRules.salariedBase) / targetN : 0;
  const ltvCac = cac > 0 ? ltv / cac : Infinity;
  const cacPayback = baseMrr > 0 ? cac / baseMrr : 0;
  const totalRD = data.reduce((s, m) => s + m.rdCapEx, 0);
  const cumRevenue = data.reduce((s, m) => s + m.cashRevenue, 0);

  // Rule of 40 at M24
  const revGrowth = m12.totalMrr > 0 ? ((m24.totalMrr - m12.totalMrr) / m12.totalMrr) * 100 : 0;
  const ebitdaMargin = m24.cashRevenue > 0 ? (m24.ebitda / m24.cashRevenue) * 100 : 0;
  const ruleOf40 = revGrowth + ebitdaMargin;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${name.toUpperCase()}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\n  UNIT ECONOMICS`);
  console.log(`  | Base MRR/Client:   ${fmt(baseMrr)} DH/mois (${fmt(baseMrr * 12)} DH/an)`);
  console.log(`  | LTV:              ${fmt(ltv)} DH`);
  console.log(`  | CAC:              ${fmt(cac)} DH`);
  console.log(`  | LTV:CAC:          ${ltvCac === Infinity ? 'inf' : ltvCac.toFixed(1)}x ${ltvCac >= 3 ? '[OK]' : '[WARN <3x]'}`);
  console.log(`  | CAC Payback:      ${cacPayback.toFixed(1)} months ${cacPayback <= 12 ? '[OK]' : '[WARN >12mo]'}`);
  console.log(`  | Churn:            ${state.churnRate}%/month`);
  console.log(`\n  GROWTH`);
  console.log(`  | M12: ${m12.users} users | M24: ${m24.users} | M36: ${m36.users} | M60: ${m60.users}`);
  console.log(`\n  REVENUE (DH)`);
  console.log(`  | MRR M12: ${fmt(m12.totalMrr)} | MRR M24: ${fmt(m24.totalMrr)} | MRR M60: ${fmt(m60.totalMrr)}`);
  console.log(`  | ARR M60: ${fmt(m60.totalMrr * 12)} | Cumulative: ${fmt(cumRevenue)}`);
  console.log(`\n  CASH & PROFIT`);
  console.log(`  | Start: ${fmt(state.startCash)} DH | Funding: ${state.fundAmount > 0 ? `${fmt(state.fundAmount)} DH @ M${state.fundMonth}` : 'None'}`);
  console.log(`  | Lowest Cash: ${fmt(lowestCash)} DH (M${lowestMonth}) ${lowestCash < 0 ? '[CASH NEGATIVE]' : '[OK]'}`);
  console.log(`  | Break-Even: ${breakEven ? `Month ${breakEven}` : 'Never in 60mo [WARN]'}`);
  console.log(`  | EBITDA M12: ${fmt(m12.ebitda)} | EBITDA M60: ${fmt(m60.ebitda)}`);
  console.log(`  | Cash M60: ${fmt(m60.cash)} DH | R&D CapEx Total: ${fmt(totalRD)} DH`);
  console.log(`\n  CHARLIE CFO RATIOS`);
  console.log(`  | Rule of 40 (M24): ${ruleOf40.toFixed(1)}% ${ruleOf40 >= 40 ? '[OK]' : '[WARN]'}`);
  console.log(`  | Gross Margin M60: ${m60.cashRevenue > 0 ? ((m60.grossMargin / m60.cashRevenue) * 100).toFixed(1) : 0}%`);

  const unlocks = data.filter(m => m.unlockedThisMonth.length > 0);
  if (unlocks.length > 0) {
    console.log(`\n  MODULE UNLOCKS`);
    for (const u of unlocks) console.log(`  | M${u.month}: ${u.unlockedThisMonth.join(', ')} (CapEx: ${fmt(u.rdCapEx)} DH)`);
  }

  return { name, usersM60: m60.users, mrrM60: m60.totalMrr, arrM60: m60.totalMrr * 12, cashM60: m60.cash, lowestCash, breakEven, ltvCac, negative: lowestCash < 0 };
}

// ══════════════════════════════════════════════
//  RUN
// ══════════════════════════════════════════════

console.log('\n' + '='.repeat(70));
console.log('  AGROGINA CFO v9 — 60-MONTH SCENARIO ANALYSIS');
console.log('  Charlie Munger Mode: Capital Discipline is King');
console.log('='.repeat(70));

const results = [
  analyzeScenario('A. Baseline (Default + 2M DH Funding M12)', createBaseState()),
  analyzeScenario('B. Bootstrapped (200K DH, No Funding, SW Only)', scenarioBootstrapped()),
  analyzeScenario('C. Funded Aggressive (3M DH @ M6, Full Roadmap)', scenarioFundedAggressive()),
  analyzeScenario('D. Software-Only SaaS (No Hardware)', scenarioSoftwareOnly()),
  analyzeScenario('E. Premium Pricing + Low Churn (1%)', scenarioPremiumLowChurn()),
  analyzeScenario('F. Worst Case (Late Funding, 5% Churn, No Modules)', scenarioWorstCase()),
];

// Comparison matrix
const pad = (s: string, n: number) => s.padEnd(n);
const padR = (s: string, n: number) => s.padStart(n);

console.log(`\n\n${'='.repeat(120)}`);
console.log('  COMPARISON MATRIX');
console.log('='.repeat(120));
console.log(`\n  ${pad('Scenario', 20)} ${padR('Users M60', 10)} ${padR('MRR M60', 14)} ${padR('ARR M60', 14)} ${padR('Cash M60', 14)} ${padR('Low Cash', 14)} ${padR('Break-Even', 12)} ${padR('LTV:CAC', 9)}`);
console.log(`  ${'-'.repeat(110)}`);
for (const r of results) {
  console.log(`  ${pad(r.name.substring(0, 20), 20)} ${padR(String(r.usersM60), 10)} ${padR(fmt(r.mrrM60) + ' DH', 14)} ${padR(fmt(r.arrM60) + ' DH', 14)} ${padR(fmt(r.cashM60) + ' DH', 14)} ${padR(fmt(r.lowestCash) + ' DH', 14)} ${padR(r.breakEven ? `M${r.breakEven}` : 'Never', 12)} ${padR((r.ltvCac === Infinity ? 'inf' : r.ltvCac.toFixed(1)) + 'x', 9)}`);
}

console.log(`\n  CHARLIE'S VERDICT:`);
console.log(`  The best scenario maximizes LTV:CAC while keeping cash positive for 60 months.`);
console.log(`  Capital discipline = every DH works hardest.\n`);
