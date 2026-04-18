import type { EngineState } from '../store/engineStore';
import { computeRDTotal, computeHaTotalPrice, computeHaTotalPriceStatic, computeErpMonthly, getNewUsersForMonth } from '../store/engineStore';

/* ═══════════════════════════════════════════════
   V9 — 60-Month Projection Engine
   Split revenue: ERP fixed + degressive per-hectare
   Unlock: cash >= R&D total × riskBuffer (deducted as CapEx)
   ═══════════════════════════════════════════════ */

export interface MonthData {
  month: number;
  users: number;
  newUsers: number;
  churnedUsers: number;

  // Revenue
  mrrBase: number;           // MRR from existing platform
  mrrUnlocked: number;       // added MRR from unlocked modules
  totalMrr: number;
  cashRevenue: number;       // actual cash received (Total)
  coreRevenue: number;       // Non-drone cash revenue
  droneRevenue: number;      // Drone-specific revenue

  // Costs
  cogs: number;              // Total COGS
  coreCogs: number;          // Non-drone COGS
  droneCogs: number;         // Drone-specific COGS
  rdCapEx: number;
  grossMargin: number;

  // Granular Roadmap Breakdown
  moduleRevenues: Record<string, number>;
  moduleCogs: Record<string, number>;
  moduleOpex: Record<string, number>;
  moduleRdCapEx: Record<string, number>;

  // OpEx
  salariesBase: number;
  salesCommissions: number;
  rent: number;
  mkt: number;
  adm: number;

  // Added Operations
  m2mSimCogs: number;
  techInstallOpex: number;
  savTerrainOpex: number;
  devMaintenanceOpex: number;
  agronomeOpex: number;
  hwBufferStockCapEx: number;

  totalOpex: number;

  ebitda: number;
  cash: number;
  phase: 1 | 2;

  unlockedThisMonth: string[];
  activeSalariedCount: number;
  fundingReceived: number;       // levée received this month
}

export function generate60Months(state: EngineState): MonthData[] {
  const result: MonthData[] = [];

  let currentCash = state.startCash;
  let currentUsers = 0;
  let currentPhase: 1 | 2 = 1;

  const cohortSignups: { funnel: number; organic: Record<string, { full: number; only: number }> }[] = Array.from({ length: 61 }, () => ({ funnel: 0, organic: {} }));
  const activeOrganicUsers: Record<string, { full: number; only: number }> = {};

  // Track unlocks
  const unlockedIds = new Set<string>();
  const unlockMonths = new Map<string, number>();
  let droneCapExFired = false;
  let activeSalaried = state.salesSalariedCount;
  let cumulativeHwClients = 0;

  for (let month = 1; month <= 60; month++) {
    let rdCapExThisMonth = 0;
    const unlockedThisMonth: string[] = [];
    const moduleRevenues: Record<string, number> = {};
    const moduleCogs: Record<string, number> = {};
    const moduleRdCapEx: Record<string, number> = {};

    // 0. Funding
    let fundingThisMonth = 0;
    if (state.fundMonth > 0 && month === state.fundMonth) {
      currentCash += state.fundAmount;
      fundingThisMonth = state.fundAmount;
    }

    // Unlock is done AFTER revenue (see below)

    // 2. SALES SCALING
    if (state.salesScaling.everyNUsers > 0 && currentUsers > 0) {
      const target = state.salesSalariedCount + Math.floor(currentUsers / state.salesScaling.everyNUsers);
      activeSalaried = Math.max(activeSalaried, target);
    }

    // 3. BASE MRR & UNLOCKS
    const baseMrrPerClient = (
      computeErpMonthly(state.erpModules, state.erpSizeMultiplier) +
      (state.haPricingMode === 'static'
        ? computeHaTotalPriceStatic(state.avgHectaresPerClient, state.haPriceTiers)
        : computeHaTotalPrice(state.avgHectaresPerClient, state.haPriceTiers)) / 12
    ) * (1 - state.discountPct / 100);

    // Active roadmap items: unlocked AND delivery delay passed
    const activeRoadmapItems = state.roadmapItems.filter(i => {
      if (!unlockedIds.has(i.id)) return false;
      const uMonth = unlockMonths.get(i.id) || 0;
      return month > uMonth + i.deliveryMonths;
    });



    // 4. ACQUISITION — Channel-based
    let totalLeads = 0;
    let weightedClients = 0;  // each channel has its own conversion
    for (const ch of state.marketing.channels) {
      if (!ch.enabled) continue;
      let chLeads = 0;
      if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.leadsPerEvent) {
        // Salon-type: leads from events spread across months
        chLeads = Math.floor((ch.eventsPerYear * ch.leadsPerEvent) / 12);
      } else if (ch.costPerLead > 0 && ch.budgetMonthly > 0) {
        chLeads = Math.floor(ch.budgetMonthly / ch.costPerLead);
      } else {
        chLeads = ch.leadsPerMonth;  // manual (e.g. partenariats)
      }
      totalLeads += chLeads;
      weightedClients += chLeads * (ch.conversionPct / 100);
    }

    const clientsFromFunnel = Math.floor(weightedClients);

    const totalAgents = state.salesFreelanceCount + activeSalaried;
    const salesCapacity = totalAgents * state.salesCapacityPerRep;

    const targetNewUsers = getNewUsersForMonth(month, state.growthTranches);
    const maxFromFunnel = totalAgents > 0 ? Math.min(clientsFromFunnel, salesCapacity) : targetNewUsers;
    const newFunnelUsers = Math.min(targetNewUsers, maxFromFunnel > 0 ? maxFromFunnel : targetNewUsers);

    // Organic clients directly from active roadmap items
    const newOrganicByModule: Record<string, { full: number; only: number }> = {};
    let totalNewOrganicFull = 0;
    let totalNewOrganicOnly = 0;
    for (const i of activeRoadmapItems) {
      if (i.newClientsPerMonth > 0 || (i.newModuleOnlyClientsPerMonth && i.newModuleOnlyClientsPerMonth > 0)) {
        newOrganicByModule[i.id] = {
          full: i.newClientsPerMonth || 0,
          only: i.newModuleOnlyClientsPerMonth || 0
        };
        totalNewOrganicFull += (i.newClientsPerMonth || 0);
        totalNewOrganicOnly += (i.newModuleOnlyClientsPerMonth || 0);
      }
    }

    const newUsers = newFunnelUsers + totalNewOrganicFull; // Full Pack users

    cohortSignups[month] = { funnel: newFunnelUsers, organic: newOrganicByModule };

    // Update Churn and Active Bases dynamically
    let totalActiveOrganicFull = 0;
    for (const counts of Object.values(activeOrganicUsers)) totalActiveOrganicFull += counts.full;

    const currentFunnelUsers = currentUsers - totalActiveOrganicFull;
    const churnedFunnel = Math.floor(currentFunnelUsers * (state.churnRate / 100));
    const newCurrentFunnel = Math.max(0, currentFunnelUsers + newFunnelUsers - churnedFunnel);

    for (const modId of Object.keys(activeOrganicUsers)) {
      const activeF = activeOrganicUsers[modId]?.full || 0;
      const activeO = activeOrganicUsers[modId]?.only || 0;
      const churnedF = Math.floor(activeF * (state.churnRate / 100));
      const churnedO = Math.floor(activeO * (state.churnRate / 100));
      activeOrganicUsers[modId] = {
        full: Math.max(0, activeF + (newOrganicByModule[modId]?.full || 0) - churnedF),
        only: Math.max(0, activeO + (newOrganicByModule[modId]?.only || 0) - churnedO)
      };
    }
    // Also init new modules not tracked yet
    for (const [modId, addedObj] of Object.entries(newOrganicByModule)) {
      if (activeOrganicUsers[modId] === undefined) {
        activeOrganicUsers[modId] = { full: addedObj.full, only: addedObj.only };
      }
    }

    let totalNewActiveOrganicFull = 0;
    let totalNewActiveOrganicOnly = 0;
    for (const counts of Object.values(activeOrganicUsers)) {
      totalNewActiveOrganicFull += counts.full;
      totalNewActiveOrganicOnly += counts.only;
    }

    const churnedUsers = Math.floor(currentUsers * (state.churnRate / 100)) + Math.floor(totalNewActiveOrganicOnly * (state.churnRate / 100)); // Total representation including module only
    currentUsers = newCurrentFunnel + totalNewActiveOrganicFull; // currentUsers ONLY represents people paying for ERP+Agro

    // 5. REVENUE (MRR & Cash)
    const mrrBase = currentUsers * baseMrrPerClient;

    let mrrUnlocked = 0;
    let unlockedHwUpfront = 0;
    let unlockedHwCOGS = 0;

    for (const i of activeRoadmapItems) {
      if (i.isParserOnly) continue; // Parser has 0 financial impact

      let mC = 1;
      if (i.mrrBasis === 'per_ha') mC = state.avgHectaresPerClient;
      if (i.mrrBasis === 'per_unit' || i.mrrBasis === 'per_head' || i.mrrBasis === 'per_greenhouse') mC = i.avgUnitsPerClient;

      let uC = 1;
      if (i.upfrontBasis === 'per_ha') uC = state.avgHectaresPerClient;
      if (i.upfrontBasis === 'per_unit' || i.upfrontBasis === 'per_head' || i.upfrontBasis === 'per_greenhouse') uC = i.avgUnitsPerClient;

      let cC = 1;
      if (i.cogsBasis === 'per_ha') cC = state.avgHectaresPerClient;
      if (i.cogsBasis === 'per_unit' || i.cogsBasis === 'per_head' || i.cogsBasis === 'per_greenhouse') cC = i.avgUnitsPerClient;

      // Existing user adoption (Only FULL pack clients count as existing 'platform' users for cross-selling)
      const orgUsersF = activeOrganicUsers[i.id]?.full || 0;
      const orgUsersO = activeOrganicUsers[i.id]?.only || 0;

      // The rest of the platform users who might adopt this module
      const otherUsers = currentUsers - orgUsersF;
      const adoptedExisting = orgUsersF + otherUsers * (i.adoptionPct / 100);

      mrrUnlocked += (adoptedExisting + orgUsersO) * i.mrrPrice * mC;
      if (i.m2mMonthlyPrice) {
        mrrUnlocked += (adoptedExisting + orgUsersO) * i.m2mMonthlyPrice;
      }

      // ── New users this month ──
      const orgNewF = newOrganicByModule[i.id]?.full || 0;
      const orgNewO = newOrganicByModule[i.id]?.only || 0;
      const otherNew = newUsers - orgNewF; // Since newUsers = funnel + all orgNewF

      const newAdoptedEx = orgNewF + otherNew * (i.adoptionPct / 100);
      const totalNewAdopters = newAdoptedEx + orgNewO;

      // Upfront Hardware & COGS
      let itemUpfront = i.upfrontPrice * uC;
      let itemCogs = i.cogsPrice * cC;

      // If module has a dynamic sensor list, OVERRIDE the baseline upfront/cogs
      if (i.sensors && i.sensors.length > 0) {
        itemUpfront = 0;
        itemCogs = 0;
        for (const s of i.sensors) {
          if (s.checked) {
            itemUpfront += s.sellPrice;
            itemCogs += s.costPrice;
          }
        }
      }

      unlockedHwUpfront += totalNewAdopters * itemUpfront;
      unlockedHwCOGS += totalNewAdopters * itemCogs;
    }

    const totalMrr = mrrBase + mrrUnlocked;

    let cashRevenue = 0;
    // New users pay 12 months base MRR upfront
    cashRevenue += newUsers * (baseMrrPerClient * 12);
    // New users pay 12 months module MRR upfront conditionally based on adoption
    for (const i of activeRoadmapItems) {
      if (i.isParserOnly) continue;

      let mC = 1;
      if (i.mrrBasis === 'per_ha') mC = state.avgHectaresPerClient;
      if (i.mrrBasis === 'per_unit' || i.mrrBasis === 'per_head' || i.mrrBasis === 'per_greenhouse') mC = i.avgUnitsPerClient;

      const orgNewF = newOrganicByModule[i.id]?.full || 0;
      const orgNewO = newOrganicByModule[i.id]?.only || 0;
      const otherNew = newUsers - orgNewF;
      const newAdopted = orgNewF + otherNew * (i.adoptionPct / 100);
      const totalNewAdopters = newAdopted + orgNewO;

      let annualMrr = i.mrrPrice * mC * 12;
      if (i.m2mMonthlyPrice) annualMrr += i.m2mMonthlyPrice * 12;

      cashRevenue += totalNewAdopters * annualMrr;
    }
    cashRevenue += unlockedHwUpfront;

    // Drone Client Billing
    let droneRevenue = 0;
    const droneItem = activeRoadmapItems.find(i => i.id === 'rm-drone');
    if (droneItem) {
      const orgUsersF = activeOrganicUsers['rm-drone']?.full || 0;
      const orgUsersO = activeOrganicUsers['rm-drone']?.only || 0;
      const otherUsers = currentUsers - orgUsersF;
      const adoptedUsers = orgUsersF + orgUsersO + otherUsers * (droneItem.adoptionPct / 100);

      const isCampaignMonth = ((month - 1) % 12) < state.droneCampaignMonths;

      if (isCampaignMonth) {
        if (state.droneChargeMode === 'per_ha') {
          droneRevenue = adoptedUsers * state.avgHectaresPerClient * state.droneChargePrice * state.dronePassagesPerMonth;
        } else {
          droneRevenue = adoptedUsers * state.droneChargePrice * state.dronePassagesPerMonth; // flat
        }
        moduleRevenues['rm-drone'] = droneRevenue;
      }
    }
    cashRevenue += droneRevenue;

    // ── RENEWALS AND UPFRONT (N+1, N+2, N+3, etc) ──
    let retainedUsers = 0;
    let retainedOrganic: Record<string, { full: number; only: number }> = {};
    if (month > 12) {
      let baseRetainedFunnel = 0;

      for (let pastMonth = month - 12; pastMonth > 0; pastMonth -= 12) {
        const cohort = cohortSignups[pastMonth];
        if (!cohort) continue;

        const retFactor = Math.pow(1 - state.churnRate / 100, month - pastMonth);
        baseRetainedFunnel += Math.floor(cohort.funnel * retFactor);

        for (const [modId, obj] of Object.entries(cohort.organic)) {
          if (!retainedOrganic[modId]) retainedOrganic[modId] = { full: 0, only: 0 };
          retainedOrganic[modId].full += Math.floor(obj.full * retFactor);
          retainedOrganic[modId].only += Math.floor(obj.only * retFactor);
        }
      }

      retainedUsers = baseRetainedFunnel;
      for (const counts of Object.values(retainedOrganic)) retainedUsers += counts.full;

      cashRevenue += retainedUsers * (baseMrrPerClient * 12);

      for (const i of activeRoadmapItems) {
        if (i.isParserOnly) continue;

        let mC = 1;
        if (i.mrrBasis === 'per_ha') mC = state.avgHectaresPerClient;
        if (i.mrrBasis === 'per_unit' || i.mrrBasis === 'per_head' || i.mrrBasis === 'per_greenhouse') mC = i.avgUnitsPerClient;

        const orgRetF = retainedOrganic[i.id]?.full || 0;
        const orgRetO = retainedOrganic[i.id]?.only || 0;
        const otherRet = retainedUsers - orgRetF;
        const retAdopted = orgRetF + otherRet * (i.adoptionPct / 100);
        const totalRetAdopters = retAdopted + orgRetO;

        let annualMrr = i.mrrPrice * mC * 12;
        if (i.m2mMonthlyPrice) annualMrr += i.m2mMonthlyPrice * 12;

        cashRevenue += totalRetAdopters * annualMrr;
      }
    }

    // Compute Module specific revenues directly for P&L Dashboard breakdown
    for (const i of activeRoadmapItems) {
      if (i.id === 'rm-drone' || i.isParserOnly) continue;

      let mC = 1;
      if (i.mrrBasis === 'per_ha') mC = state.avgHectaresPerClient;
      if (i.mrrBasis === 'per_unit' || i.mrrBasis === 'per_head' || i.mrrBasis === 'per_greenhouse') mC = i.avgUnitsPerClient;

      let uC = 1;
      if (i.upfrontBasis === 'per_ha') uC = state.avgHectaresPerClient;
      if (i.upfrontBasis === 'per_unit' || i.upfrontBasis === 'per_head' || i.upfrontBasis === 'per_greenhouse') uC = i.avgUnitsPerClient;

      let cC = 1;
      if (i.cogsBasis === 'per_ha') cC = state.avgHectaresPerClient;
      if (i.cogsBasis === 'per_unit' || i.cogsBasis === 'per_head' || i.cogsBasis === 'per_greenhouse') cC = i.avgUnitsPerClient;

      // New users this month
      const orgNewF = newOrganicByModule[i.id]?.full || 0;
      const orgNewO = newOrganicByModule[i.id]?.only || 0;
      const otherNew = newUsers - orgNewF;
      const totalNewAdopters = orgNewF + orgNewO + otherNew * (i.adoptionPct / 100);

      // Retained users from 12 months ago
      const orgRetF = retainedOrganic[i.id]?.full || 0;
      const orgRetO = retainedOrganic[i.id]?.only || 0;
      const otherRet = retainedUsers - orgRetF;
      const totalRetAdopters = orgRetF + orgRetO + otherRet * (i.adoptionPct / 100);

      // Upfront Hardware & COGS
      let itemUpfront = i.upfrontPrice * uC;
      let itemCogs = i.cogsPrice * cC;
      if (i.sensors && i.sensors.length > 0) {
        itemUpfront = 0;
        itemCogs = 0;
        for (const s of i.sensors) {
          if (s.checked) {
            itemUpfront += s.sellPrice;
            itemCogs += s.costPrice;
          }
        }
      }

      let annualMrr = i.mrrPrice * mC * 12;
      if (i.m2mMonthlyPrice) annualMrr += i.m2mMonthlyPrice * 12;

      // Breakdown: New + Retained yearly MRR + New Upfront
      const rev = (totalNewAdopters + totalRetAdopters) * annualMrr + totalNewAdopters * itemUpfront;
      if (rev > 0) moduleRevenues[i.id] = (moduleRevenues[i.id] || 0) + rev;

      const cogs = totalNewAdopters * itemCogs;
      if (cogs > 0) moduleCogs[i.id] = (moduleCogs[i.id] || 0) + cogs;
    }

    // 6. COGS
    let serverCost = state.infra.serverBaseCost;
    if (state.infra.serverStepUsers > 0) {
      serverCost += Math.floor(currentUsers / state.infra.serverStepUsers) * state.infra.serverStepCost;
    }
    serverCost += currentUsers * (state.infra.agromindApiCostPerUser + state.infra.assistantApiCostPerUser);

    // GEE cost (only if above threshold)
    let geeCost = 0;
    if (currentUsers >= state.infra.geeThresholdUsers && state.infra.geeThresholdUsers > 0) {
      geeCost = state.infra.geeFixedCost + currentUsers * state.avgHectaresPerClient * state.infra.geeVariableCostPerHa;
    }

    // Drone variable cost (third party)
    let droneVar = 0;
    if (state.droneStrategy === 'third_party') {
      if (droneItem) { // using the droneItem found above
        const adoptedUsers = currentUsers * (droneItem.adoptionPct / 100);
        const isCampaignMonth = ((month - 1) % 12) < state.droneCampaignMonths;

        if (isCampaignMonth) {
          if (state.droneThirdPartyMode === 'per_ha') {
            droneVar = adoptedUsers * state.avgHectaresPerClient * state.droneThirdPartyPrice * state.dronePassagesPerMonth;
          } else {
            droneVar = adoptedUsers * state.droneThirdPartyPrice * state.dronePassagesPerMonth;
          }
          moduleCogs['rm-drone'] = (moduleCogs['rm-drone'] || 0) + droneVar;
        }
      }
    }

    // HW COGS for newly sold units
    const hwCOGSMonth = newUsers * unlockedHwCOGS;

    const couveuseOnlyActive = activeOrganicUsers['rm-couveuse']?.only || 0;
    const m2mSimCogs = (unlockedIds.has('rm-couveuse')) ? couveuseOnlyActive * state.infra.m2mSimCardMonthly : 0;

    const totalCOGS = state.infra.devServerCost + serverCost + geeCost + state.infra.weatherApiMonthly + droneVar + hwCOGSMonth + m2mSimCogs;
    const grossMargin = cashRevenue - totalCOGS;

    // 7. COMMISSIONS
    const freelanceShare = totalAgents > 0 ? state.salesFreelanceCount / totalAgents : 0;
    const salariedShare = totalAgents > 0 ? activeSalaried / totalAgents : 0;

    let newMrrThisMonthFullPack = newFunnelUsers * baseMrrPerClient;
    let newMrrThisMonthModuleOnly = 0;
    for (const i of activeRoadmapItems) {
      if (i.isParserOnly) continue;
      let mC = 1;
      if (i.mrrBasis === 'per_ha') mC = state.avgHectaresPerClient;
      if (i.mrrBasis === 'per_unit' || i.mrrBasis === 'per_head' || i.mrrBasis === 'per_greenhouse') mC = i.avgUnitsPerClient;

      const orgNewF = newOrganicByModule[i.id]?.full || 0;
      const orgNewO = newOrganicByModule[i.id]?.only || 0;
      const otherNew = newUsers - orgNewF;
      const newAdoptedEx = orgNewF + otherNew * (i.adoptionPct / 100);

      newMrrThisMonthFullPack += newAdoptedEx * i.mrrPrice * mC;
      newMrrThisMonthModuleOnly += orgNewO * i.mrrPrice * mC;

      if (i.m2mMonthlyPrice) {
        newMrrThisMonthFullPack += newAdoptedEx * i.m2mMonthlyPrice;
        newMrrThisMonthModuleOnly += orgNewO * i.m2mMonthlyPrice;
      }
    }

    let freelanceCommissions = ((newMrrThisMonthFullPack + newMrrThisMonthModuleOnly) * 12) * freelanceShare * (state.salesRules.freelanceComY1Pct / 100);

    if (month > 12) {
      let renewedMrrThisMonthFullPack = retainedUsers * baseMrrPerClient;
      let renewedMrrThisMonthModuleOnly = 0;
      for (const i of activeRoadmapItems) {
        if (i.isParserOnly) continue;
        let mC = 1;
        if (i.mrrBasis === 'per_ha') mC = state.avgHectaresPerClient;
        if (i.mrrBasis === 'per_unit' || i.mrrBasis === 'per_head' || i.mrrBasis === 'per_greenhouse') mC = i.avgUnitsPerClient;

        const orgRetF = retainedOrganic[i.id]?.full || 0;
        const orgRetO = retainedOrganic[i.id]?.only || 0;
        const otherRet = retainedUsers - orgRetF;
        const retAdopted = orgRetF + otherRet * (i.adoptionPct / 100);

        renewedMrrThisMonthFullPack += retAdopted * i.mrrPrice * mC;
        renewedMrrThisMonthModuleOnly += orgRetO * i.mrrPrice * mC;

        if (i.m2mMonthlyPrice) {
          renewedMrrThisMonthFullPack += retAdopted * i.m2mMonthlyPrice;
          renewedMrrThisMonthModuleOnly += orgRetO * i.m2mMonthlyPrice;
        }
      }
      freelanceCommissions += ((renewedMrrThisMonthFullPack + renewedMrrThisMonthModuleOnly) * 12) * freelanceShare * (state.salesRules.freelanceComY2Pct / 100);
    }

    const salariedBaseCost = activeSalaried * state.salesRules.salariedBase;
    const salariedBonus = (newUsers * salariedShare) * state.salesRules.salariedBonusPerDeal;
    const totalCommissions = freelanceCommissions + salariedBonus;

    // 8. OPEX
    if (currentPhase === 1 && totalMrr >= state.fixedCosts.triggerPhase2MRR) {
      currentPhase = 2;
    }

    const fc = state.fixedCosts;
    const foundersCost = currentPhase === 1 ? fc.foundersP1 : fc.foundersP2;
    const devCost = currentPhase === 1 ? fc.devP1 : fc.devP2;
    const rentCost = currentPhase === 1 ? fc.rentP1 : fc.rentP2;
    const admCost = currentPhase === 1 ? fc.admP1 : fc.admP2;
    const mktBrand = currentPhase === 1 ? fc.mktBrandP1 : fc.mktBrandP2;

    // Marketing cost = sum of all enabled channels budgets
    let varMkt = 0;
    for (const ch of state.marketing.channels) {
      if (!ch.enabled) continue;
      if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.costPerEvent) {
        varMkt += (Number(ch.eventsPerYear) * Number(ch.costPerEvent)) / 12;
      } else {
        varMkt += Number(ch.budgetMonthly) || 0;
      }
    }

    // Transport (Phase 2 only, linked to commercial count)
    let transportCost = 0;
    if (currentPhase === 2 && activeSalaried > 0) {
      const vehiclesNeeded = Math.ceil(activeSalaried / Math.max(state.fixedCosts.vehiclesPerCommercial, 1));
      if (state.fixedCosts.vehicleMode === 'loa') {
        transportCost = vehiclesNeeded * state.fixedCosts.vehicleLoaMonthly;
      } else {
        // Purchase: amortize over 48 months
        transportCost = vehiclesNeeded * (state.fixedCosts.vehiclePurchasePrice / 48);
      }
    }

    const salariesBase = foundersCost + devCost + salariedBaseCost;
    const totalMkt = varMkt + mktBrand;

    // ── MODULE VARIABLES OPEX ──
    const hardwareModuleIds = ['rm-hw-capteurs', 'rm-couveuse', 'rm-elevage', 'rm-myci-serre', 'rm-drone'];
    let unlockedHwModulesCount = 0;
    for (const id of unlockedIds) {
      if (hardwareModuleIds.includes(id)) unlockedHwModulesCount++;
    }

    let hwClientsTotal = 0;
    let totalActiveModuleClients = 0;
    let newHwClientsThisMonth = 0;
    let moduleActiveClients: Record<string, number> = {};

    for (const i of activeRoadmapItems) {
      if (!i.isParserOnly) {
        const orgF = activeOrganicUsers[i.id]?.full || 0;
        const orgO = activeOrganicUsers[i.id]?.only || 0;
        const other = currentUsers - orgF;
        const adoptedActive = orgF + orgO + (other * (i.adoptionPct / 100));
        totalActiveModuleClients += adoptedActive;
        moduleActiveClients[i.id] = adoptedActive;

        if (hardwareModuleIds.includes(i.id)) {
          hwClientsTotal += adoptedActive;

          const orgNewF = newOrganicByModule[i.id]?.full || 0;
          const orgNewO = newOrganicByModule[i.id]?.only || 0;
          const otherNew = newUsers - orgNewF;
          newHwClientsThisMonth += orgNewF + orgNewO + (otherNew * (i.adoptionPct / 100));
        }
      }
    }
    cumulativeHwClients += newHwClientsThisMonth;

    let techInstallOpex = 0;
    if (unlockedHwModulesCount >= fc.techInstallTriggerHwModules) {
      const techCount = 1 + Math.floor(Math.max(0, hwClientsTotal - 1) / Math.max(1, fc.techInstallScalingClients));
      techInstallOpex = techCount * fc.techInstallMonthly;
    }

    const savTerrainOpex = cumulativeHwClients >= fc.savTerrainTriggerClients ? fc.savTerrainMonthly : 0;
    const devMaintenanceOpex = (unlockedIds.size >= fc.devMaintenanceTriggerModules && currentPhase === 2) ? fc.devMaintenanceMonthly : 0;
    const agronomeOpex = (currentPhase === 2 && totalActiveModuleClients >= fc.agronomeTriggerClients) ? fc.agronomeMonthly : 0;

    const moduleVariablesOpex = techInstallOpex + savTerrainOpex + devMaintenanceOpex + agronomeOpex;

    const totalOpex = salariesBase + totalCommissions + rentCost + totalMkt + admCost + transportCost + moduleVariablesOpex;

    // Distribute Shared Opex to `moduleOpex`
    const moduleOpex: Record<string, number> = {};
    for (const i of activeRoadmapItems) {
      if (!i.isParserOnly && moduleActiveClients[i.id] > 0) {
        let allocated = 0;
        // General distribution (Dev, Agronome) proportionally per active client
        if (totalActiveModuleClients > 0) {
          const ratio = moduleActiveClients[i.id] / totalActiveModuleClients;
          allocated += ratio * (devMaintenanceOpex + agronomeOpex);
        }
        // HW specific distribution (Tech, SAV)
        if (hardwareModuleIds.includes(i.id) && hwClientsTotal > 0) {
          const hwRatio = moduleActiveClients[i.id] / hwClientsTotal;
          allocated += hwRatio * (techInstallOpex + savTerrainOpex);
        }
        // M2M direct allocation
        if (i.id === 'rm-couveuse') {
          allocated += m2mSimCogs;
        }
        moduleOpex[i.id] = (moduleOpex[i.id] || 0) + allocated;
      }
    }

    // ── 1-MONTH AHEAD BUFFER STOCK (CAPEX) ──
    let hwBufferStockCapEx = 0;
    for (const i of state.roadmapItems) {
      if (hardwareModuleIds.includes(i.id) && unlockedIds.has(i.id)) {
        const uMonth = unlockMonths.get(i.id) || 0;
        const realStart = uMonth + i.deliveryMonths;
        if (month === realStart - 1) { // Trigger 1 month before actual launch
          let cC = 1;
          if (i.cogsBasis === 'per_ha') cC = state.avgHectaresPerClient;
          if (i.cogsBasis === 'per_unit' || i.cogsBasis === 'per_head' || i.cogsBasis === 'per_greenhouse') cC = i.avgUnitsPerClient;

          let itemCogs = i.cogsPrice * cC;
          if (i.sensors && i.sensors.length > 0) {
            itemCogs = 0;
            for (const s of i.sensors) if (s.checked) itemCogs += s.costPrice;
          }

          // Rough 12-month expected sales volume for COGS calculation
          const estimatedY1Sales = (currentUsers * (i.adoptionPct / 100)) + ((i.newClientsPerMonth || 0) + (i.newModuleOnlyClientsPerMonth || 0)) * 12;
          const bStockCost = (estimatedY1Sales * itemCogs) * (fc.hwBufferStockPct / 100);
          hwBufferStockCapEx += bStockCost;
          moduleOpex[i.id] = (moduleOpex[i.id] || 0) + bStockCost;
        }
      }
    }
    currentCash -= hwBufferStockCapEx;

    // ── 5-YEAR HARDWARE RENEWAL (MONTH 60) ──
    let hardwareRenewalRevenue = 0;
    let hardwareRenewalCOGS = 0;

    if (month === 60) {
      // Hardware sold in Y1 (Months 1-12) dictates renewal volume at month 60
      let y1AdoptersCount: Record<string, number> = {};

      for (let pastMonth = 1; pastMonth <= 12; pastMonth++) {
        const cohort = cohortSignups[pastMonth];
        if (!cohort) continue;

        const retFactorTo60 = Math.pow(1 - state.churnRate / 100, 60 - pastMonth);
        const cUsersFull = Math.floor(cohort.funnel * retFactorTo60);

        for (const [modId, obj] of Object.entries(cohort.organic)) {
          const orgRetF = Math.floor(obj.full * retFactorTo60);
          const orgRetO = Math.floor(obj.only * retFactorTo60);
          const otherRet = cUsersFull;

          const i = state.roadmapItems.find(x => x.id === modId);
          if (i) {
            const totalAdoptersForModInCohort = orgRetF + orgRetO + otherRet * (i.adoptionPct / 100);
            y1AdoptersCount[modId] = (y1AdoptersCount[modId] || 0) + totalAdoptersForModInCohort;
          }
        }

        // Platform cross-sells
        for (const i of activeRoadmapItems) {
          if (i.isParserOnly) continue;
          if (!cohort.organic[i.id]) { // if not explicitly tracked above
            const totalAdoptersForModInHw = cUsersFull * (i.adoptionPct / 100);
            y1AdoptersCount[i.id] = (y1AdoptersCount[i.id] || 0) + totalAdoptersForModInHw;
          }
        }
      }

      for (const [modId, adopters] of Object.entries(y1AdoptersCount)) {
        const i = state.roadmapItems.find(x => x.id === modId);
        if (!i || i.isParserOnly || adopters <= 0) continue;

        let uC = 1;
        if (i.upfrontBasis === 'per_ha') uC = state.avgHectaresPerClient;
        if (i.upfrontBasis === 'per_unit' || i.upfrontBasis === 'per_head' || i.upfrontBasis === 'per_greenhouse') uC = i.avgUnitsPerClient;

        let cC = 1;
        if (i.cogsBasis === 'per_ha') cC = state.avgHectaresPerClient;
        if (i.cogsBasis === 'per_unit' || i.cogsBasis === 'per_head' || i.cogsBasis === 'per_greenhouse') cC = i.avgUnitsPerClient;

        let itemUpfront = i.upfrontPrice * uC;
        let itemCogs = i.cogsPrice * cC;

        if (i.sensors && i.sensors.length > 0) {
          itemUpfront = 0;
          itemCogs = 0;
          for (const s of i.sensors) {
            if (s.checked) {
              itemUpfront += s.sellPrice;
              itemCogs += s.costPrice;
            }
          }
        }

        const rev = adopters * itemUpfront;
        const cogs = adopters * itemCogs;

        hardwareRenewalRevenue += rev;
        hardwareRenewalCOGS += cogs;

        if (rev > 0) moduleRevenues[i.id] = (moduleRevenues[i.id] || 0) + rev;
        if (cogs > 0) moduleCogs[i.id] = (moduleCogs[i.id] || 0) + cogs;
      }

      cashRevenue += hardwareRenewalRevenue;
    }

    // 9. EBITDA & CASH
    const finalCOGS = totalCOGS + hardwareRenewalCOGS;
    const ebitda = cashRevenue - finalCOGS - totalOpex;
    currentCash += ebitda;

    // 10. AUTO-UNLOCK — Need cash >= rdCost × (1 + riskBuffer%)
    const riskMultiplier = 1 + state.unlockRiskBufferPct / 100;
    let unlockHappened = true;
    while (unlockHappened) {
      unlockHappened = false;
      for (const item of state.roadmapItems) {
        if (!item.checked || unlockedIds.has(item.id)) continue;
        if (item.dependsOn && !unlockedIds.has(item.dependsOn)) continue;
        const rdCost = computeRDTotal(item.rdItems);
        // Modules without R&D launch instantly if zero cost
        if (rdCost > 0 && currentCash < rdCost * riskMultiplier) continue;

        unlockedIds.add(item.id);
        unlockMonths.set(item.id, month);
        rdCapExThisMonth += rdCost;
        moduleRdCapEx[item.id] = (moduleRdCapEx[item.id] || 0) + rdCost;
        currentCash -= rdCost;
        unlockedThisMonth.push(item.name);
        unlockHappened = true;
      }
    }

    // Drone CapEx (if proprietary + drone module unlocked)
    if (state.droneStrategy === 'proprietary' && !droneCapExFired && unlockedIds.has('rm-drone')) {
      droneCapExFired = true;
      rdCapExThisMonth += state.droneCapExCost;
      moduleRdCapEx['rm-drone'] = (moduleRdCapEx['rm-drone'] || 0) + state.droneCapExCost;
      currentCash -= state.droneCapExCost;
    }

    result.push({
      month,
      users: currentUsers,
      newUsers,
      churnedUsers,
      mrrBase,
      mrrUnlocked,
      totalMrr,
      cashRevenue,
      coreRevenue: cashRevenue - droneRevenue,
      droneRevenue,
      cogs: totalCOGS,
      coreCogs: totalCOGS - droneVar - m2mSimCogs,
      droneCogs: droneVar,
      rdCapEx: rdCapExThisMonth,
      grossMargin,
      moduleRevenues,
      moduleCogs,
      moduleOpex,
      moduleRdCapEx,
      salariesBase,
      salesCommissions: totalCommissions,
      rent: rentCost,
      mkt: totalMkt,
      adm: admCost,

      m2mSimCogs,
      techInstallOpex,
      savTerrainOpex,
      devMaintenanceOpex,
      agronomeOpex,
      hwBufferStockCapEx,

      totalOpex,
      ebitda,
      cash: currentCash,
      phase: currentPhase,
      unlockedThisMonth,
      activeSalariedCount: activeSalaried,
      fundingReceived: fundingThisMonth,
    });
  }

  return result;
}
