import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Eye,
  Plus,
  Edit2,
  Calendar,
  MapPin,
  Sprout,
  CheckCircle,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Filter,
  MoreHorizontal,
  LayoutList,
  GanttChartSquare,
  Leaf,
  Clock,
  Layers,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_CURRENCY } from "@/utils/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import {
  useCropCycles,
  useCropCyclePnL,
  useCreateCropCycle,
  useUpdateCropCycle,
  useCompleteCropCycle,
  useCampaigns,
  useFiscalYears,
} from "@/hooks/useAgriculturalAccounting";
import { useCropTemplates } from "@/hooks/useCropTemplates";
import { useFarms, useParcelsByFarm } from "@/hooks/useParcelsQuery";
import { useCrops } from "@/hooks/useCrops";
import type {
  CropCycle,
  CropCycleStatus,
  Season,
} from "@/types/agricultural-accounting";
import {
  generateCycleCode,
  MOROCCO_CROP_TEMPLATES,
} from "@/types/agricultural-accounting";

const cropCycleSchema = z.object({
  farm_id: z.string().min(1, "Farm is required"),
  parcel_id: z.string().optional(),
  template_id: z.string().optional(),
  crop_id: z.string().optional(),
  crop_type: z.string().min(1, "Crop type is required"),
  variety_name: z.string().optional(),
  cycle_code: z.string().min(1, "Cycle code is required"),
  cycle_name: z.string().optional(),
  campaign_id: z.string().optional(),
  fiscal_year_id: z.string().optional(),
  season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
  planting_date: z.string().optional(),
  expected_harvest_start: z.string().optional(),
  expected_harvest_end: z.string().optional(),
  planted_area_ha: z.coerce.number().positive().optional(),
  expected_yield_per_ha: z.coerce.number().positive().optional(),
  yield_unit: z.string().default("kg"),
  notes: z.string().optional(),
  cycle_type: z
    .enum(["annual", "perennial", "multi_harvest", "continuous"])
    .optional(),
  is_perennial: z.boolean().optional(),
});

type CropCycleFormData = z.infer<typeof cropCycleSchema>;

export function CropCyclesList() {
  const { hasRole, currentOrganization } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<CropCycle | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  const [filterCampaignId, setFilterCampaignId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCycleType, setFilterCycleType] = useState<string>("");
  const [filterSeason, setFilterSeason] = useState<string>("");

  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [datesAutoCalculated, setDatesAutoCalculated] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const canManage = hasRole([
    "organization_admin",
    "system_admin",
    "farm_manager",
    "farm_worker",
  ]);
  const currencySymbol = currentOrganization?.currency_symbol || DEFAULT_CURRENCY;

  const { data: cropCycles = [], isLoading } = useCropCycles({
    campaign_id: filterCampaignId || undefined,
    status: (filterStatus as CropCycleStatus) || undefined,
  });

  const filteredCycles = cropCycles.filter((cycle) => {
    if (filterCycleType && filterCycleType !== "__all__") {
      if (cycle.cycle_type !== filterCycleType) return false;
    }
    if (filterSeason && filterSeason !== "__all__") {
      if (cycle.season !== filterSeason) return false;
    }
    return true;
  });

  const { data: pnlData = [] } = useCropCyclePnL({
    campaign_id: filterCampaignId || undefined,
  });
  const { data: campaigns = [] } = useCampaigns();
  const { data: fiscalYears = [] } = useFiscalYears();
  const { data: farms = [] } = useFarms(currentOrganization?.id);
  const { data: parcels = [] } = useParcelsByFarm(selectedFarmId || undefined);
  const { data: templates = [] } = useCropTemplates();
  const { data: existingCrops = [] } = useCrops({
    farmId: selectedFarmId || undefined,
    enabled: !!selectedFarmId,
  });

  const createMutation = useCreateCropCycle();
  const updateMutation = useUpdateCropCycle();
  const completeMutation = useCompleteCropCycle();

  const form = useForm<CropCycleFormData>({
    resolver: zodResolver(cropCycleSchema),
    defaultValues: {
      farm_id: "",
      parcel_id: "",
      template_id: "",
      crop_id: "",
      crop_type: "",
      variety_name: "",
      cycle_code: "",
      cycle_name: "",
      campaign_id: "",
      fiscal_year_id: "",
      yield_unit: "kg",
      notes: "",
      is_perennial: false,
    },
  });

  const watchedFarmId = form.watch("farm_id");

  if (watchedFarmId && watchedFarmId !== selectedFarmId) {
    setSelectedFarmId(watchedFarmId);
  }

  useEffect(() => {
    const templateId = form.watch("template_id");
    const plantingDate = form.watch("planting_date");
    const harvestStart = form.watch("expected_harvest_start");
    const harvestEnd = form.watch("expected_harvest_end");

    if (templateId && plantingDate && !harvestStart && !harvestEnd) {
      const template = templates.find((t) => t.id === templateId);
      if (template && template.typical_duration_months) {
        const plantDate = new Date(plantingDate);
        const harvestStartDate = new Date(plantDate);
        harvestStartDate.setMonth(
          harvestStartDate.getMonth() + template.typical_duration_months,
        );

        const harvestEndDate = new Date(harvestStartDate);
        harvestEndDate.setDate(harvestEndDate.getDate() + 30);

        const formatDate = (date: Date) => date.toISOString().split("T")[0];
        form.setValue("expected_harvest_start", formatDate(harvestStartDate));
        form.setValue("expected_harvest_end", formatDate(harvestEndDate));
        setDatesAutoCalculated(true);
      }
    }
  }, [form.watch("template_id"), form.watch("planting_date"), templates, form]);

  useEffect(() => {
    const parcelId = form.watch("parcel_id");
    const plantingDate = form.watch("planting_date");
    const harvestEnd = form.watch("expected_harvest_end");

    if (parcelId && plantingDate && harvestEnd) {
      const newCycleStart = new Date(plantingDate);
      const newCycleEnd = new Date(harvestEnd);

      const overlappingCycle = cropCycles.find((cycle) => {
        if (cycle.parcel_id !== parcelId) return false;
        if (editingCycle && cycle.id === editingCycle.id) return false;
        if (
          !["land_prep", "growing", "harvesting", "planned"].includes(
            cycle.status,
          )
        )
          return false;

        const cycleStart = cycle.planting_date
          ? new Date(cycle.planting_date)
          : null;
        const cycleEnd = cycle.expected_harvest_end
          ? new Date(cycle.expected_harvest_end)
          : null;

        if (!cycleStart || !cycleEnd) return false;

        return !(newCycleEnd < cycleStart || newCycleStart > cycleEnd);
      });

      if (overlappingCycle) {
        const startStr = overlappingCycle.planting_date
          ? new Date(overlappingCycle.planting_date).toLocaleDateString()
          : "Unknown";
        const endStr = overlappingCycle.expected_harvest_end
          ? new Date(overlappingCycle.expected_harvest_end).toLocaleDateString()
          : "Unknown";
        setOverlapWarning(
          `Warning: This parcel already has an active cycle (${overlappingCycle.cycle_code}) from ${startStr} to ${endStr}. Overlapping cycles may cause cost attribution issues.`,
        );
      } else {
        setOverlapWarning(null);
      }
    } else {
      setOverlapWarning(null);
    }
  }, [
    form.watch("parcel_id"),
    form.watch("planting_date"),
    form.watch("expected_harvest_end"),
    cropCycles,
    editingCycle,
  ]);

  const handleOpenDialog = (cycle?: CropCycle) => {
    if (cycle) {
      setEditingCycle(cycle);
      setSelectedFarmId(cycle.farm_id);
      form.reset({
        farm_id: cycle.farm_id,
        parcel_id: cycle.parcel_id || "",
        template_id: cycle.template_id || "",
        crop_type: cycle.crop_type,
        variety_name: cycle.variety_name || "",
        cycle_code: cycle.cycle_code,
        cycle_name: cycle.cycle_name || "",
        campaign_id: cycle.campaign_id || "",
        fiscal_year_id: cycle.fiscal_year_id || "",
        season: cycle.season || undefined,
        planting_date: cycle.planting_date || "",
        expected_harvest_start: cycle.expected_harvest_start || "",
        expected_harvest_end: cycle.expected_harvest_end || "",
        planted_area_ha: cycle.planted_area_ha || undefined,
        expected_yield_per_ha: cycle.expected_yield_per_ha || undefined,
        yield_unit: cycle.yield_unit,
        notes: cycle.notes || "",
        cycle_type: cycle.cycle_type || undefined,
        is_perennial: cycle.is_perennial || false,
      });
    } else {
      setEditingCycle(null);
      const currentCampaign = campaigns.find((c) => c.is_current);
      const currentFiscalYear = fiscalYears.find((fy) => fy.is_current);
      form.reset({
        farm_id: farms[0]?.id || "",
        parcel_id: "",
        template_id: "",
        crop_type: "",
        variety_name: "",
        cycle_code: "",
        cycle_name: "",
        campaign_id: currentCampaign?.id || "",
        fiscal_year_id: currentFiscalYear?.id || "",
        yield_unit: "kg",
        notes: "",
        is_perennial: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCycle(null);
    form.reset();
    setDatesAutoCalculated(false);
    setOverlapWarning(null);
  };

  const handleTemplateChange = (templateId: string) => {
    if (templateId === "__none__") {
      form.setValue("template_id", "");
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    form.setValue("template_id", template.id);
    form.setValue("crop_type", template.crop_name);
    form.setValue("variety_name", template.crop_name);
    form.setValue("yield_unit", template.yield_unit);
    form.setValue("is_perennial", template.is_perennial);

    if (template.average_yield_per_ha) {
      form.setValue("expected_yield_per_ha", template.average_yield_per_ha);
    }

    if (template.cycle_type) {
      form.setValue("cycle_type", template.cycle_type);
    }

    if (!form.getValues("cycle_code")) {
      const year = new Date().getFullYear();
      const parcelId = form.getValues("parcel_id");
      const parcel = parcels.find((p) => p.id === parcelId);
      const parcelCode = parcel?.name?.substring(0, 3).toUpperCase() || "P01";
      const code = generateCycleCode(template.code_prefix, year, parcelCode);
      form.setValue("cycle_code", code);
    }
  };

  const generateCode = () => {
    const cropType = form.getValues("crop_type");
    const parcelId = form.getValues("parcel_id");
    const parcel = parcels.find((p) => p.id === parcelId);
    const template =
      templates.find((t) => t.id === form.getValues("template_id")) ||
      Object.values(MOROCCO_CROP_TEMPLATES).find((t) =>
        t.name.toLowerCase().includes(cropType.toLowerCase()),
      );
    const prefix =
      template?.code_prefix || cropType.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const parcelCode = parcel?.name?.substring(0, 3).toUpperCase() || "P01";
    const code = generateCycleCode(prefix, year, parcelCode);
    form.setValue("cycle_code", code);
  };

  const onSubmit = async (data: CropCycleFormData) => {
    try {
      if (editingCycle) {
        await updateMutation.mutateAsync({
          id: editingCycle.id,
          status: editingCycle.status,
          actual_harvest_start: data.expected_harvest_start,
          actual_harvest_end: data.expected_harvest_end,
          notes: data.notes,
          cycle_type: data.cycle_type,
          is_perennial: data.is_perennial,
        });
      } else {
        // Try to find an existing crop matching the crop_type and farm
        let cropId = data.crop_id;
        if (!cropId && data.crop_type && data.farm_id) {
          const matchingCrop = existingCrops.find(
            (crop: { id: string; name?: string; crop_type?: string }) =>
              crop.name?.toLowerCase().includes(data.crop_type.toLowerCase()) ||
              crop.crop_type?.toLowerCase() === data.crop_type.toLowerCase(),
          );
          if (matchingCrop) {
            cropId = matchingCrop.id;
          }
        }

        await createMutation.mutateAsync({
          ...data,
          crop_id: cropId || undefined,
          parcel_id: data.parcel_id || undefined,
          variety_name: data.variety_name || undefined,
          cycle_name: data.cycle_name || undefined,
          campaign_id: data.campaign_id || undefined,
          fiscal_year_id: data.fiscal_year_id || undefined,
          season: data.season,
          planting_date: data.planting_date || undefined,
          expected_harvest_start: data.expected_harvest_start || undefined,
          expected_harvest_end: data.expected_harvest_end || undefined,
          planted_area_ha: data.planted_area_ha,
          expected_yield_per_ha: data.expected_yield_per_ha,
          expected_total_yield:
            data.planted_area_ha && data.expected_yield_per_ha
              ? data.planted_area_ha * data.expected_yield_per_ha
              : undefined,
          notes: data.notes || undefined,
          template_id: data.template_id || undefined,
          cycle_type: data.cycle_type,
          is_perennial: data.is_perennial,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to save crop cycle:", error);
    }
  };

  const handleComplete = async (cycleId: string) => {
    try {
      await completeMutation.mutateAsync(cycleId);
    } catch (error) {
      console.error("Failed to complete cycle:", error);
    }
  };

  const getStatusBadge = (status: CropCycleStatus) => {
    const config: Record<
      CropCycleStatus,
      { icon: typeof Play; color: string; label: string }
    > = {
      planned: {
        icon: Pause,
        color: "bg-gray-100 text-gray-800",
        label: t("cropCycles.status.planned", "Planned"),
      },
      land_prep: {
        icon: Sprout,
        color: "bg-yellow-100 text-yellow-800",
        label: t("cropCycles.status.land_prep", "Land Prep"),
      },
      growing: {
        icon: Play,
        color: "bg-green-100 text-green-800",
        label: t("cropCycles.status.growing", "Growing"),
      },
      harvesting: {
        icon: TrendingUp,
        color: "bg-blue-100 text-blue-800",
        label: t("cropCycles.status.harvesting", "Harvesting"),
      },
      completed: {
        icon: CheckCircle,
        color: "bg-purple-100 text-purple-800",
        label: t("cropCycles.status.completed", "Completed"),
      },
      cancelled: {
        icon: Pause,
        color: "bg-red-100 text-red-800",
        label: t("cropCycles.status.cancelled", "Cancelled"),
      },
    };
    const { icon: Icon, color, label } = config[status];
    return (
      <Badge variant="outline" className={color}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getCycleTypeBadge = (cycle: CropCycle) => {
    if (cycle.is_perennial) {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
        >
          <Leaf className="h-3 w-3 mr-1" />
          {t("cropCycles.type.perennial", "Perennial")}
        </Badge>
      );
    }
    if (cycle.cycle_type === "multi_harvest") {
      return (
        <Badge
          variant="secondary"
          className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
        >
          <GanttChartSquare className="h-3 w-3 mr-1" />
          {t("cropCycles.type.multiHarvest", "Multi-Harvest")}
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
      >
        <Clock className="h-3 w-3 mr-1" />
        {t("cropCycles.type.annual", "Annual")}
      </Badge>
    );
  };

  const getPnLForCycle = (cycleId: string) =>
    pnlData.find((p) => p.id === cycleId);

  const totals = filteredCycles.reduce(
    (acc, c) => ({
      area: acc.area + (c.planted_area_ha || 0),
      costs: acc.costs + c.total_costs,
      revenue: acc.revenue + c.total_revenue,
      profit: acc.profit + c.net_profit,
    }),
    { area: 0, costs: 0, revenue: 0, profit: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sprout className="h-6 w-6 text-green-600" />
            {t("cropCycles.title", "Crop Cycles")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "cropCycles.description",
              "Track production cycles from planting to harvest with full cost attribution.",
            )}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t("cropCycles.addNew", "New Cycle")}
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("cropCycles.metrics.totalArea", "Total Area")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {totals.area.toFixed(1)} ha
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("cropCycles.metrics.totalCosts", "Total Costs")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {currencySymbol} {totals.costs.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("cropCycles.metrics.totalRevenue", "Total Revenue")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {currencySymbol} {totals.revenue.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {t("cropCycles.metrics.netProfit", "Net Profit")}
            </CardDescription>
            <CardTitle
              className={`text-2xl ${totals.profit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {currencySymbol} {totals.profit.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
        <div className="flex flex-wrap gap-4 flex-1">
          <Select
            value={filterCampaignId || "__all__"}
            onValueChange={(v) => setFilterCampaignId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue
                placeholder={t("cropCycles.filter.campaign", "All Campaigns")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("cropCycles.filter.allCampaigns", "All Campaigns")}
              </SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus || "__all__"}
            onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder={t("cropCycles.filter.status", "All Statuses")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("cropCycles.filter.allStatuses", "All Statuses")}
              </SelectItem>
              <SelectItem value="planned">
                {t("cropCycles.status.planned", "Planned")}
              </SelectItem>
              <SelectItem value="growing">
                {t("cropCycles.status.growing", "Growing")}
              </SelectItem>
              <SelectItem value="harvesting">
                {t("cropCycles.status.harvesting", "Harvesting")}
              </SelectItem>
              <SelectItem value="completed">
                {t("cropCycles.status.completed", "Completed")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterCycleType || "__all__"}
            onValueChange={(v) => setFilterCycleType(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue
                placeholder={t("cropCycles.filter.type", "All Types")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("common.all", "All Types")}
              </SelectItem>
              <SelectItem value="annual">
                {t("cropCycles.type.annual", "Annual")}
              </SelectItem>
              <SelectItem value="perennial">
                {t("cropCycles.type.perennial", "Perennial")}
              </SelectItem>
              <SelectItem value="multi_harvest">
                {t("cropCycles.type.multiHarvest", "Multi-Harvest")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterSeason || "__all__"}
            onValueChange={(v) => setFilterSeason(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue
                placeholder={t("cropCycles.filter.season", "All Seasons")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("common.all", "All Seasons")}
              </SelectItem>
              <SelectItem value="spring">
                {t("seasons.spring", "Spring")}
              </SelectItem>
              <SelectItem value="summer">
                {t("seasons.summer", "Summer")}
              </SelectItem>
              <SelectItem value="autumn">
                {t("seasons.autumn", "Autumn")}
              </SelectItem>
              <SelectItem value="winter">
                {t("seasons.winter", "Winter")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <LayoutList className="h-4 w-4" />
            {t("common.list", "List")}
          </Button>
          <Button
            variant={viewMode === "timeline" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("timeline")}
            className="gap-2"
          >
            <GanttChartSquare className="h-4 w-4" />
            {t("common.timeline", "Timeline")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("cropCycles.loading", "Loading crop cycles...")}
        </div>
      ) : filteredCycles.length === 0 ? (
        <EmptyState
          variant="card"
          icon={Layers}
          title={t("cropCycles.empty.title", "No crop cycles")}
          description={t(
            "cropCycles.empty",
            "No crop cycles found. Create your first cycle to start tracking production.",
          )}
          action={
            canManage
              ? {
                  label: t("cropCycles.addNew", "New Cycle"),
                  onClick: () => handleOpenDialog(),
                }
              : undefined
          }
        />
      ) : viewMode === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCycles.map((cycle) => {
            const pnl = getPnLForCycle(cycle.id);
            return (
              <Card
                key={cycle.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CardTitle
                          className="text-lg cursor-pointer hover:text-primary transition-colors"
                          onClick={() =>
                            navigate({
                              to: "/crop-cycles/$cycleId",
                              params: { cycleId: cycle.id },
                            })
                          }
                        >
                          {cycle.cycle_name || cycle.crop_type}
                        </CardTitle>
                        {getCycleTypeBadge(cycle)}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">
                          {cycle.cycle_code}
                        </code>
                        {getStatusBadge(cycle.status)}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate({
                              to: "/crop-cycles/$cycleId",
                              params: { cycleId: cycle.id },
                            })
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />{" "}
                          {t("common.view", "View Details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(cycle)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />{" "}
                          {t("common.edit", "Edit")}
                        </DropdownMenuItem>
                        {cycle.status !== "completed" &&
                          cycle.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => handleComplete(cycle.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />{" "}
                              {t("cropCycles.complete", "Mark Complete")}
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {pnl?.farm_name || "Unknown Farm"}
                    {pnl?.parcel_name && ` / ${pnl.parcel_name}`}
                  </div>

                  {cycle.planting_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(cycle.planting_date).toLocaleDateString()}
                      {cycle.expected_harvest_end && (
                        <>
                          {" "}
                          →{" "}
                          {new Date(
                            cycle.expected_harvest_end,
                          ).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t("cropCycles.area", "Area")}:{" "}
                      </span>
                      <span className="font-medium">
                        {cycle.planted_area_ha?.toFixed(1) || "-"} ha
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t("cropCycles.yield", "Yield")}:{" "}
                      </span>
                      <span className="font-medium">
                        {cycle.actual_total_yield?.toLocaleString() ||
                          cycle.expected_total_yield?.toLocaleString() ||
                          "-"}{" "}
                        {cycle.yield_unit}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("cropCycles.costs", "Costs")}
                      </span>
                      <span className="font-medium">
                        {currencySymbol} {cycle.total_costs.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("cropCycles.revenue", "Revenue")}
                      </span>
                      <span className="font-medium">
                        {currencySymbol} {cycle.total_revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>{t("cropCycles.profit", "Profit")}</span>
                      <span
                        className={
                          cycle.net_profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {cycle.net_profit >= 0 ? (
                          <TrendingUp className="h-4 w-4 inline mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 inline mr-1" />
                        )}
                        {currencySymbol} {cycle.net_profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("cropCycles.timeline", "Production Timeline")}
            </CardTitle>
            <CardDescription>
              {t(
                "cropCycles.timelineDesc",
                "Visual overview of all active crop cycles",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-12 gap-1 mb-4 border-b pb-2 text-sm font-medium text-muted-foreground text-center">
                  {Array.from({ length: 12 }).map((_, monthIdx) => (
                    <div key={"month-" + monthIdx}>
                      {new Date(0, monthIdx).toLocaleString("default", {
                        month: "short",
                      })}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {filteredCycles.map((cycle) => {
                    const start = cycle.planting_date
                      ? new Date(cycle.planting_date)
                      : new Date();
                    const end = cycle.expected_harvest_end
                      ? new Date(cycle.expected_harvest_end)
                      : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);

                    const startMonth = start.getMonth();
                    const durationMonths = Math.max(
                      1,
                      (end.getTime() - start.getTime()) /
                        (1000 * 60 * 60 * 24 * 30),
                    );
                    const startPercent = (startMonth / 12) * 100;
                    const widthPercent = Math.min(
                      (durationMonths / 12) * 100,
                      100 - startPercent,
                    );

                    return (
                      <div
                        key={cycle.id}
                        className="relative h-10 flex items-center bg-muted/20 rounded hover:bg-muted/40 transition-colors"
                      >
                        <div className="w-48 shrink-0 px-2 text-sm font-medium truncate border-r mr-2">
                          {cycle.cycle_name || cycle.crop_type}
                          <div className="text-xs text-muted-foreground font-normal">
                            {cycle.cycle_code}
                          </div>
                        </div>
                        <div className="flex-1 relative h-full flex items-center">
                          <div
                            className={`absolute h-6 rounded px-2 text-xs text-white flex items-center whitespace-nowrap overflow-hidden
                              ${
                                cycle.status === "completed"
                                  ? "bg-purple-500"
                                  : cycle.status === "harvesting"
                                    ? "bg-blue-500"
                                    : cycle.status === "growing"
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                              }`}
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          >
                            {cycle.crop_type}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="md:hidden space-y-3">
              {filteredCycles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Sprout className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                  <p>
                    {t("cropCycles.empty.noCycles", "No crop cycles found")}
                  </p>
                </div>
              ) : (
                filteredCycles.map((cycle) => {
                  const parcel = cycle.parcel_id
                    ? parcels.find((p) => p.id === cycle.parcel_id)
                    : null;
                  const farm = cycle.farm_id
                    ? farms.find((f) => f.id === cycle.farm_id)
                    : null;

                  return (
                    <div
                      key={cycle.id}
                      className="border rounded-lg p-3 bg-white dark:bg-gray-800 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {cycle.cycle_name || cycle.crop_type}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {cycle.cycle_code}
                          </p>
                        </div>
                        <Badge
                          className={`${
                            cycle.status === "completed"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                              : cycle.status === "harvesting"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                : cycle.status === "growing"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                          }`}
                        >
                          {t(`cropCycles.status.${cycle.status}`, cycle.status)}
                        </Badge>
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Leaf className="h-3.5 w-3.5" />
                          <span>{cycle.crop_type}</span>
                        </div>

                        {(cycle.planting_date ||
                          cycle.expected_harvest_end) && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {cycle.planting_date
                                ? new Date(
                                    cycle.planting_date,
                                  ).toLocaleDateString()
                                : "-"}
                              {cycle.expected_harvest_end &&
                                ` → ${new Date(cycle.expected_harvest_end).toLocaleDateString()}`}
                            </span>
                          </div>
                        )}

                        {(parcel || farm) && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {parcel?.name || farm?.name || "-"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCycle
                ? t("cropCycles.edit.title", "Edit Crop Cycle")
                : t("cropCycles.create.title", "Create Crop Cycle")}
            </DialogTitle>
            <DialogDescription>
              {editingCycle
                ? t("cropCycles.edit.description", "Update crop cycle details.")
                : t(
                    "cropCycles.create.description",
                    "Start tracking a new production cycle.",
                  )}
            </DialogDescription>
          </DialogHeader>
          {overlapWarning && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
              {overlapWarning}
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("cropCycles.form.farm", "Farm")} *</Label>
                <Select
                  value={form.watch("farm_id")}
                  onValueChange={(value) => form.setValue("farm_id", value)}
                  disabled={!!editingCycle}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "cropCycles.form.selectFarm",
                        "Select farm...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("cropCycles.form.parcel", "Parcel")}</Label>
                <Select
                  value={form.watch("parcel_id") || "__none__"}
                  onValueChange={(value) =>
                    form.setValue(
                      "parcel_id",
                      value === "__none__" ? "" : value,
                    )
                  }
                  disabled={!selectedFarmId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "cropCycles.form.selectParcel",
                        "Select parcel...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("common.none", "None")}
                    </SelectItem>
                    {parcels.map((parcel) => (
                      <SelectItem key={parcel.id} value={parcel.id}>
                        {parcel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template Selector */}
            {!editingCycle && templates.length > 0 && (
              <div className="p-3 bg-muted/30 rounded-md border border-dashed">
                <Label className="mb-1.5 block text-primary font-medium">
                  {t("cropCycles.form.template", "Crop Template (Optional)")}
                </Label>
                <Select
                  value={form.watch("template_id") || "__none__"}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "cropCycles.form.selectTemplate",
                        "Select a template to auto-fill...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("common.none", "No Template")}
                    </SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.crop_name}
                        {template.is_perennial ? " (Perennial)" : " (Annual)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecting a template will auto-fill crop type, yield units,
                  and other details.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crop_type">
                  {t("cropCycles.form.cropType", "Crop Type")} *
                </Label>
                <Input
                  id="crop_type"
                  {...form.register("crop_type")}
                  placeholder={t(
                    "cropCycles.form.cropTypePlaceholder",
                    "e.g., Wheat, Olive, Tomato",
                  )}
                />
              </div>
              <div>
                <Label htmlFor="variety_name">
                  {t("cropCycles.form.variety", "Variety")}
                </Label>
                <Input
                  id="variety_name"
                  {...form.register("variety_name")}
                  placeholder={t(
                    "cropCycles.form.varietyPlaceholder",
                    "e.g., Picholine, Roma",
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cycle_code">
                  {t("cropCycles.form.cycleCode", "Cycle Code")} *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cycle_code"
                    {...form.register("cycle_code")}
                    placeholder="WHT-2024-P01"
                    disabled={!!editingCycle}
                  />
                  {!editingCycle && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCode}
                    >
                      {t("cropCycles.form.generate", "Generate")}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>{t("cropCycles.form.season", "Season")}</Label>
                <Select
                  value={form.watch("season") || ""}
                  onValueChange={(value: Season) =>
                    form.setValue("season", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "cropCycles.form.selectSeason",
                        "Select...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spring">
                      {t("seasons.spring", "Spring")}
                    </SelectItem>
                    <SelectItem value="summer">
                      {t("seasons.summer", "Summer")}
                    </SelectItem>
                    <SelectItem value="autumn">
                      {t("seasons.autumn", "Autumn")}
                    </SelectItem>
                    <SelectItem value="winter">
                      {t("seasons.winter", "Winter")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("cropCycles.form.campaign", "Campaign")}</Label>
                <Select
                  value={form.watch("campaign_id") || "__none__"}
                  onValueChange={(value) =>
                    form.setValue(
                      "campaign_id",
                      value === "__none__" ? "" : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "cropCycles.form.selectCampaign",
                        "Select...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("common.none", "None")}
                    </SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("cropCycles.form.fiscalYear", "Fiscal Year")}</Label>
                <Select
                  value={form.watch("fiscal_year_id") || "__none__"}
                  onValueChange={(value) =>
                    form.setValue(
                      "fiscal_year_id",
                      value === "__none__" ? "" : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "cropCycles.form.selectFiscalYear",
                        "Select...",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("common.none", "None")}
                    </SelectItem>
                    {fiscalYears.map((fy) => (
                      <SelectItem key={fy.id} value={fy.id}>
                        {fy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="planting_date">
                  {t("cropCycles.form.plantingDate", "Planting Date")}
                </Label>
                <Input
                  id="planting_date"
                  type="date"
                  {...form.register("planting_date")}
                />
              </div>
              <div>
                <Label htmlFor="expected_harvest_start">
                  {t("cropCycles.form.harvestStart", "Harvest Start")}
                </Label>
                <Input
                  id="expected_harvest_start"
                  type="date"
                  {...form.register("expected_harvest_start")}
                />
              </div>
              <div>
                <Label htmlFor="expected_harvest_end">
                  {t("cropCycles.form.harvestEnd", "Harvest End")}
                </Label>
                <Input
                  id="expected_harvest_end"
                  type="date"
                  {...form.register("expected_harvest_end")}
                />
              </div>
            </div>
            {datesAutoCalculated && (
              <div className="text-xs text-blue-600">
                Dates auto-calculated from template
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="planted_area_ha">
                  {t("cropCycles.form.area", "Area (ha)")}
                </Label>
                <Input
                  id="planted_area_ha"
                  type="number"
                  step="0.1"
                  {...form.register("planted_area_ha")}
                />
              </div>
              <div>
                <Label htmlFor="expected_yield_per_ha">
                  {t("cropCycles.form.yieldPerHa", "Expected Yield/ha")}
                </Label>
                <Input
                  id="expected_yield_per_ha"
                  type="number"
                  step="0.1"
                  {...form.register("expected_yield_per_ha")}
                />
              </div>
              <div>
                <Label htmlFor="yield_unit">
                  {t("cropCycles.form.yieldUnit", "Unit")}
                </Label>
                <Select
                  value={form.watch("yield_unit")}
                  onValueChange={(value) => form.setValue("yield_unit", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="tonnes">tonnes</SelectItem>
                    <SelectItem value="quintaux">quintaux</SelectItem>
                    <SelectItem value="units">units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">
                {t("cropCycles.form.notes", "Notes")}
              </Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder={t(
                  "cropCycles.form.notesPlaceholder",
                  "Additional notes...",
                )}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCycle
                  ? t("cropCycles.form.update", "Update")
                  : t("cropCycles.form.create", "Create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
