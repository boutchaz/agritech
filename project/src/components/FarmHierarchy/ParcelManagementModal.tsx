import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Edit, Leaf, MapPin, Plus, Sparkles, Sprout, Trash2 } from "lucide-react";
import {  useEffect, useState  } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import {
  calculatePlantCount,
  getCropTypesByCategory,
  getPlantingSystemsByCategory,
  getVarietiesByCropType,
  PLANTING_SYSTEMS,
  type CropCategory,
} from "../../lib/plantingSystemData";
import { parcelsService, type Parcel } from "../../services/parcelsService";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/radix-select";
import { Textarea } from "../ui/Textarea";
import { SectionLoader } from '@/components/ui/loader';
import { useSupportedCrops } from '@/hooks/useAgromindSupport';


// Parcel interface is now imported from parcelsService

interface ParcelManagementModalProps {
  farmId: string;
  farmName: string;
  onClose: () => void;
}

const getParcelSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t("farmHierarchy.parcel.validation.nameRequired")),
    description: z.string().optional(),
    area: z
      .number()
      .positive(t("farmHierarchy.parcel.validation.areaPositive")),
    area_unit: z.string().optional().default("hectares"),
    crop_category: z.string().optional(),
    crop_type: z.string().optional(),
    variety: z.string().optional(),
    planting_system: z.string().optional(),
    spacing: z.string().optional(),
    density_per_hectare: z.number().optional(),
    plant_count: z.number().int().optional(),
    planting_date: z.string().optional(),
    planting_year: z.number().int().optional(),
    rootstock: z.string().optional(),
    soil_type: z.string().optional(),
    irrigation_type: z.string().optional(),
    irrigation_frequency: z.string().optional(),
    water_quantity_per_session: z.number().optional(),
    water_quantity_unit: z.string().optional(),
  });

type ParcelFormValues = {
  name: string;
  description?: string;
  area: number;
  area_unit?: string;
  crop_category?: string;
  crop_type?: string;
  variety?: string;
  planting_system?: string;
  spacing?: string;
  density_per_hectare?: number;
  plant_count?: number;
  planting_date?: string;
  planting_year?: number;
  rootstock?: string;
  soil_type?: string;
  irrigation_type?: string;
  irrigation_frequency?: string;
  water_quantity_per_session?: number;
  water_quantity_unit?: string;
};

const ParcelManagementModal = ({
  farmId,
  farmName,
  onClose,
}: ParcelManagementModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Base categories always shown (static, fully controlled)
  const BASE_CROP_CATEGORIES = [
    { value: 'trees', label: t('farmHierarchy.parcel.categories.trees') },
    { value: 'cereals', label: t('farmHierarchy.parcel.categories.cereals') },
    { value: 'vegetables', label: t('farmHierarchy.parcel.categories.vegetables') },
    { value: 'legumes', label: t('farmHierarchy.parcel.categories.legumes', 'Légumineuses') },
    { value: 'fourrages', label: t('farmHierarchy.parcel.categories.fourrages', 'Cultures fourragères') },
    { value: 'industrielles', label: t('farmHierarchy.parcel.categories.industrielles', 'Cultures industrielles') },
    { value: 'aromatiques', label: t('farmHierarchy.parcel.categories.aromatiques', 'Plantes aromatiques') },
    { value: 'other', label: t('farmHierarchy.parcel.categories.other') },
  ];
  const availableCropCategories = BASE_CROP_CATEGORIES;

  const [showForm, setShowForm] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [parcelToDelete, setParcelToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ParcelFormValues>({
    resolver: zodResolver(getParcelSchema(t)),
    defaultValues: {
      area_unit: "hectares",
    },
  });

  const { isCropSupported, isVarietySupported, getSupportedVarieties } = useSupportedCrops();

  // Watch form values for dynamic updates
  const selectedCategory = watch("crop_category") as CropCategory | undefined;
  const selectedCropType = watch("crop_type");
  const selectedPlantingSystem = watch("planting_system");
  const selectedArea = watch("area");
  const selectedDensity = watch("density_per_hectare");

  const availableCropTypes = selectedCategory
    ? getCropTypesByCategory(selectedCategory)
    : [];

  // Get available varieties: static list first, then referential varieties as fallback.
  // Each item has { value, label } — value is the code stored in DB, label is displayed.
  const staticVarietyNames = selectedCropType
    ? getVarietiesByCropType(selectedCropType)
    : [];
  const availableVarieties: { value: string; label: string }[] = staticVarietyNames.length > 0
    ? staticVarietyNames.map((name) => ({ value: name, label: name }))
    : (selectedCropType
        ? getSupportedVarieties(selectedCropType).map((v) => ({ value: v.code, label: v.nom }))
        : []);

  // Get available planting systems based on category
  const availablePlantingSystems = selectedCategory
    ? getPlantingSystemsByCategory(selectedCategory)
    : PLANTING_SYSTEMS;

  // Auto-update density when planting system changes
  useEffect(() => {
    if (selectedPlantingSystem) {
      const system = availablePlantingSystems.find(
        (s) =>
          s.type === selectedPlantingSystem ||
          `${s.type} (${s.spacing})` === selectedPlantingSystem,
      );
      if (system) {
        const density =
          "treesPerHectare" in system
            ? system.treesPerHectare
            : "plantsPerHectare" in system
              ? system.plantsPerHectare
              : "seedsPerHectare" in system
                ? system.seedsPerHectare
                : 0;
        setValue("density_per_hectare", density);
        setValue("spacing", system.spacing);
      }
    }
  }, [selectedPlantingSystem, availablePlantingSystems, setValue]);

  // Auto-calculate plant count when area or density changes
  useEffect(() => {
    if (selectedArea && selectedDensity) {
      const count = calculatePlantCount(selectedArea, selectedDensity);
      setValue("plant_count", count);
    }
  }, [selectedArea, selectedDensity, setValue]);

  // Auto-derive planting_year from planting_date
  const watchedPlantingDate = watch("planting_date");
  useEffect(() => {
    if (watchedPlantingDate) {
      const year = new Date(watchedPlantingDate).getFullYear();
      if (!isNaN(year)) {
        setValue("planting_year", year);
      }
    }
  }, [watchedPlantingDate, setValue]);

  // Fetch parcels for this farm using parcelsService (apiClient)
  const { data: parcels = [], isLoading } = useQuery({
    queryKey: ["parcels", farmId],
    queryFn: () => parcelsService.listParcels(farmId),
  });

  // Create/Update parcel mutation using parcelsService (apiClient)
  const saveParcelMutation = useMutation({
    mutationFn: async (formData: ParcelFormValues) => {
      const parcelData = {
        name: formData.name,
        description: formData.description,
        area: formData.area,
        area_unit: formData.area_unit || "hectares",
        crop_category: formData.crop_category,
        crop_type: formData.crop_type,
        variety: formData.variety,
        planting_system: formData.planting_system,
        spacing: formData.spacing,
        density_per_hectare: formData.density_per_hectare,
        plant_count: formData.plant_count,
        planting_date: formData.planting_date,
        planting_year: formData.planting_year,
        rootstock: formData.rootstock,
        soil_type: formData.soil_type,
        irrigation_type: formData.irrigation_type,
        irrigation_frequency: formData.irrigation_frequency,
        water_quantity_per_session: formData.water_quantity_per_session,
        water_quantity_unit: formData.water_quantity_unit,
      };

      if (editingParcel) {
        // Update existing parcel
        return parcelsService.updateParcel(editingParcel.id, parcelData);
      } else {
        // Create new parcel
        return parcelsService.createParcel({
          farm_id: farmId,
          ...parcelData,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcels", farmId] });
      queryClient.invalidateQueries({ queryKey: ["farm-hierarchy"] });
      reset();
      setShowForm(false);
      setEditingParcel(null);
    },
    onError: (error: Error) => {
      toast.error(t("app.error") + ": " + (error.message || ""));
    },
  });

  // Archive parcel mutation (soft delete)
  const archiveParcelMutation = useMutation({
    mutationFn: async (parcelId: string) => {
      const result = await parcelsService.archiveParcel(parcelId);

      if (!result?.success) {
        throw new Error(t('parcels.archiveFailed', "L'archivage a échoué"));
      }

      return parcelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcels", farmId] });
      queryClient.invalidateQueries({ queryKey: ["farm-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["parcels"] });

      setParcelToDelete(null);
      archiveParcelMutation.reset();
      toast.success(t('parcels.archiveSuccess', 'Parcelle archivée avec succès'));
    },
    onError: (error: Error) => {
      let errorMessage = t('parcels.archiveError', t('common.error'));

      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }

      toast.error(errorMessage);
    },
  });

  const handleEdit = (parcel: Parcel) => {
    setEditingParcel(parcel);
    setValue("name", parcel.name);
    setValue("description", parcel.description || "");
    setValue("area", parcel.area);
    setValue("area_unit", parcel.area_unit);
    setValue("crop_category", parcel.crop_category || "");
    setValue("crop_type", parcel.crop_type || "");
    setValue("variety", parcel.variety || "");
    setValue("planting_system", parcel.planting_system || "");
    setValue("spacing", parcel.spacing || "");
    setValue("density_per_hectare", parcel.density_per_hectare);
    setValue("plant_count", parcel.plant_count);
    setValue("planting_date", parcel.planting_date || "");
    setValue("planting_year", parcel.planting_year);
    setValue("rootstock", parcel.rootstock || "");
    setValue("soil_type", parcel.soil_type || "");
    setValue("irrigation_type", parcel.irrigation_type || "");
    setValue(
      "irrigation_frequency",
      parcel.irrigation_frequency || "",
    );
    setValue(
      "water_quantity_per_session",
      parcel.water_quantity_per_session,
    );
    setValue(
      "water_quantity_unit",
      parcel.water_quantity_unit || "m3",
    );
    setShowForm(true);
  };

  const handleDelete = (parcelId: string, parcelName: string) => {
    setParcelToDelete({ id: parcelId, name: parcelName });
  };

  const onSubmit = (data: ParcelFormValues) => {
    saveParcelMutation.mutate(data);
  };

  const handleAddNew = () => {
    // Redirect to parcels page with farm pre-selected for map-based parcel creation
    navigate({
      to: "/parcels",
      search: { farmId },
    });
  };

  const handleParcelClick = (parcelId: string) => {
    // Navigate to parcel detail page
    navigate({
      to: `/parcels/${parcelId}`,
    });
    onClose(); // Close the modal after navigation
  };

  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);

  return (
    <>
      <ResponsiveDialog
        open={true}
        onOpenChange={(open) => !open && onClose()}
        size="4xl"
        className="p-0"
        contentClassName="max-h-[90vh] overflow-y-auto"
      >
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("farmHierarchy.parcel.management")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {farmName} • {parcels.length}{" "}
              {t("farmHierarchy.farm.parcels").toLowerCase()} •{" "}
              {totalArea.toFixed(2)} ha
            </DialogDescription>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {/* Add Button */}
            {!showForm && (
              <Button
                onClick={handleAddNew}
                variant="outline"
                className="w-full border-dashed border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">
                  {t("farmHierarchy.parcel.add")}
                </span>
              </Button>
            )}

            {/* Form */}
            {showForm && (
              <Card className="bg-gray-50 dark:bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingParcel
                      ? t("farmHierarchy.parcel.edit")
                      : t("farmHierarchy.parcel.new")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t("farmHierarchy.parcel.sections.basicInfo")}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label={`${t("farmHierarchy.parcel.name")} *`}
                          htmlFor="name"
                          error={errors.name?.message}
                        >
                          <Input
                            id="name"
                            {...register("name")}
                            placeholder={t(
                              "farmHierarchy.parcel.namePlaceholder",
                            )}
                            invalid={!!errors.name}
                          />
                        </FormField>

                        <FormField
                          label={`${t("farmHierarchy.parcel.area")} *`}
                          htmlFor="area"
                          error={errors.area?.message}
                        >
                          <Input
                            id="area"
                            type="number"
                            step="0.01"
                            {...register("area", { valueAsNumber: true })}
                            placeholder={t(
                              "farmHierarchy.parcel.areaPlaceholder",
                            )}
                            invalid={!!errors.area}
                          />
                        </FormField>

                        <div className="md:col-span-2">
                          <FormField
                            label={t("farmHierarchy.parcel.description")}
                            htmlFor="description"
                          >
                            <Textarea
                              id="description"
                              {...register("description")}
                              rows={2}
                              placeholder={t(
                                "farmHierarchy.parcel.descriptionPlaceholder",
                              )}
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>

                    {/* Crop Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t("farmHierarchy.parcel.sections.cropInfo")}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label={t("farmHierarchy.parcel.cropCategory")}
                          htmlFor="crop_category"
                        >
                          <Select
                            value={watch("crop_category") || undefined}
                            onValueChange={(value) => {
                              setValue("crop_category", value);
                              setValue("crop_type", "");
                            }}
                          >
                            <SelectTrigger id="crop_category">
                              <SelectValue
                                placeholder={t("common.selectOption")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCropCategories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.cropType")}
                          htmlFor="crop_type"
                        >
                          {availableCropTypes.length > 0 ? (
                            <Select
                              value={watch("crop_type") || undefined}
                              onValueChange={(value) => {
                                setValue("crop_type", value);
                                setValue("variety", "");
                              }}
                            >
                              <SelectTrigger id="crop_type">
                                <SelectValue
                                  placeholder={t("common.selectOption")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCropTypes.map((crop) => (
                                  <SelectItem key={crop} value={crop}>
                                    <span className="flex items-center gap-1.5">
                                      {crop}
                                      {isCropSupported(crop) && (
                                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      )}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="crop_type"
                              {...register("crop_type")}
                              placeholder={t(
                                "farmHierarchy.parcel.cropTypePlaceholder",
                              )}
                            />
                          )}
                          {isCropSupported(selectedCropType) && (
                            <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              {t('farmHierarchy.parcel.agromindSupported', 'Supporté par AgromindIA')}
                            </p>
                          )}
                        </FormField>

                        {selectedCategory && watch("crop_type") && (
                          <FormField
                            label={t("farmHierarchy.parcel.variety")}
                            htmlFor="variety"
                          >
                            {availableVarieties.length > 0 ? (
                              <Select
                                value={watch("variety") || undefined}
                                onValueChange={(value) =>
                                  setValue("variety", value)
                                }
                              >
                                <SelectTrigger id="variety">
                                  <SelectValue
                                    placeholder={t("common.selectOption")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableVarieties.map((v) => (
                                    <SelectItem key={v.value} value={v.value}>
                                      <span className="flex items-center gap-1.5">
                                        {v.label}
                                        {isVarietySupported(selectedCropType, v.value) && (
                                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="variety"
                                {...register("variety")}
                                placeholder={t("farmHierarchy.parcel.variety")}
                              />
                            )}
                            {watch("variety") === 'Menara/Haouzia' && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                Le calibrage AgromindIA utilisera les paramètres de la variété <strong>Menara</strong>.
                              </p>
                            )}
                          </FormField>
                        )}

                        {selectedCategory === "trees" && (
                          <FormField
                            label={t("farmHierarchy.parcel.rootstock")}
                            htmlFor="rootstock"
                          >
                            <Input
                              id="rootstock"
                              {...register("rootstock")}
                              placeholder={t(
                                "farmHierarchy.parcel.rootstockPlaceholder",
                              )}
                            />
                          </FormField>
                        )}
                      </div>
                    </div>

                    {/* Planting System */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t("farmHierarchy.parcel.sections.plantingSystem")}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label={t("farmHierarchy.parcel.plantingDate")}
                          htmlFor="planting_date"
                        >
                          <Input
                            id="planting_date"
                            type="date"
                            {...register("planting_date")}
                          />
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.plantingYear")}
                          htmlFor="planting_year"
                        >
                          <Input
                            id="planting_year"
                            type="number"
                            {...register("planting_year", {
                              valueAsNumber: true,
                            })}
                            placeholder="2024"
                            readOnly={!!watch("planting_date")}
                            className={
                              watch("planting_date")
                                ? "bg-gray-50 dark:bg-gray-800"
                                : ""
                            }
                          />
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.plantingSystem")}
                          htmlFor="planting_system"
                        >
                          <Select
                            value={watch("planting_system") || undefined}
                            onValueChange={(value) =>
                              setValue("planting_system", value)
                            }
                          >
                            <SelectTrigger id="planting_system">
                              <SelectValue
                                placeholder={t("common.selectOption")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePlantingSystems.map((system) => {
                                const uniqueValue = `${system.type} (${system.spacing})`;
                                return (
                                  <SelectItem key={uniqueValue} value={uniqueValue}>
                                    {system.type} ({system.spacing}) — {
                                      "treesPerHectare" in system
                                        ? `${system.treesPerHectare} arb/ha`
                                        : "plantsPerHectare" in system
                                          ? `${(system as { plantsPerHectare: number }).plantsPerHectare} plants/ha`
                                          : "seedsPerHectare" in system
                                            ? `${(system as { seedingRate: string }).seedingRate}`
                                            : ""
                                    }
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.spacing")}
                          htmlFor="spacing"
                        >
                          <Input
                            id="spacing"
                            {...register("spacing")}
                            placeholder={t(
                              "farmHierarchy.parcel.spacingPlaceholder",
                            )}
                            readOnly
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.densityPerHectare")}
                          htmlFor="density_per_hectare"
                        >
                          <Input
                            id="density_per_hectare"
                            type="number"
                            {...register("density_per_hectare", {
                              valueAsNumber: true,
                            })}
                            placeholder="0"
                            readOnly
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.plantCount")}
                          htmlFor="plant_count"
                        >
                          <Input
                            id="plant_count"
                            type="number"
                            {...register("plant_count", {
                              valueAsNumber: true,
                            })}
                            placeholder="0"
                            readOnly
                            className="bg-gray-50 dark:bg-gray-800"
                          />
                        </FormField>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t("farmHierarchy.parcel.sections.additionalInfo")}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label={t("farmHierarchy.parcel.soilType")}
                          htmlFor="soil_type"
                        >
                          <Input
                            id="soil_type"
                            {...register("soil_type")}
                            placeholder={t(
                              "farmHierarchy.parcel.soilTypePlaceholder",
                            )}
                          />
                        </FormField>

                        <FormField
                          label={t("farmHierarchy.parcel.irrigationType")}
                          htmlFor="irrigation_type"
                        >
                          <Select
                            value={watch("irrigation_type") || undefined}
                            onValueChange={(value) =>
                              setValue("irrigation_type", value)
                            }
                          >
                            <SelectTrigger id="irrigation_type">
                              <SelectValue
                                placeholder={t("common.selectOption")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="drip">
                                {t("farmHierarchy.parcel.irrigation.drip")}
                              </SelectItem>
                              <SelectItem value="sprinkler">
                                {t("farmHierarchy.parcel.irrigation.sprinkler")}
                              </SelectItem>
                              <SelectItem value="gravity">
                                {t("farmHierarchy.parcel.irrigation.gravity")}
                              </SelectItem>
                              <SelectItem value="pivot">
                                {t("farmHierarchy.parcel.irrigation.pivot")}
                              </SelectItem>
                              <SelectItem value="submersion">
                                {t(
                                  "farmHierarchy.parcel.irrigation.submersion",
                                )}
                              </SelectItem>
                              <SelectItem value="rainfed">
                                {t("farmHierarchy.parcel.irrigation.rainfed")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField
                          label={t(
                            "parcels.irrigationFrequency",
                            "Fréquence d'irrigation",
                          )}
                          htmlFor="irrigation_frequency"
                        >
                          <Select
                            value={watch("irrigation_frequency") || undefined}
                            onValueChange={(value) =>
                              setValue("irrigation_frequency", value)
                            }
                          >
                            <SelectTrigger id="irrigation_frequency">
                              <SelectValue
                                placeholder={t("common.select")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">
                                {t(
                                  "parcels.irrigationFrequencies.daily",
                                  "Daily",
                                )}
                              </SelectItem>
                              <SelectItem value="2_3_per_week">
                                {t(
                                  "parcels.irrigationFrequencies.2_3_per_week",
                                  "2-3 times/week",
                                )}
                              </SelectItem>
                              <SelectItem value="weekly">
                                {t(
                                  "parcels.irrigationFrequencies.weekly",
                                  "Once a week",
                                )}
                              </SelectItem>
                              <SelectItem value="biweekly">
                                {t(
                                  "parcels.irrigationFrequencies.biweekly",
                                  "Every 2 weeks",
                                )}
                              </SelectItem>
                              <SelectItem value="monthly">
                                {t(
                                  "parcels.irrigationFrequencies.monthly",
                                  "Once a month",
                                )}
                              </SelectItem>
                              <SelectItem value="other">
                                {t(
                                  "parcels.irrigationFrequencies.other",
                                  "Other",
                                )}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField
                          label="Quantité d'eau par session"
                          htmlFor="water_quantity_per_session"
                        >
                          <div className="flex gap-2">
                            <Input
                              id="water_quantity_per_session"
                              type="number"
                              step="0.01"
                              {...register("water_quantity_per_session", {
                                valueAsNumber: true,
                              })}
                              placeholder="0"
                              className="flex-1"
                            />
                            <Select
                              value={watch("water_quantity_unit") || "m3"}
                              onValueChange={(value) =>
                                setValue("water_quantity_unit", value)
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="m3">m³</SelectItem>
                                <SelectItem value="liters">L</SelectItem>
                                <SelectItem value="mm">mm</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </FormField>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={saveParcelMutation.isPending}
                        className="flex-1"
                      >
                        {saveParcelMutation.isPending
                          ? t("farmHierarchy.parcel.saving")
                          : editingParcel
                            ? t("farmHierarchy.parcel.update")
                            : t("farmHierarchy.parcel.create")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingParcel(null);
                          reset();
                        }}
                      >
                        {t("app.cancel")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Parcels List */}
            {isLoading ? (
              <SectionLoader />
            ) : parcels.length === 0 ? (
              <div className="text-center py-12">
                <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t("farmHierarchy.parcel.noParcels")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parcels.map((parcel) => (
                  <Card
                    key={parcel.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleParcelClick(parcel.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <CardTitle className="group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                              {parcel.name}
                            </CardTitle>
                            {parcel.crop_type && (
                              <CardDescription>
                                {parcel.crop_type}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(parcel);
                            }}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(parcel.id, parcel.name);
                            }}
                            className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t("farmHierarchy.parcel.area")}:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {parcel.area} ha
                          </span>
                        </div>
                        {parcel.soil_type && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("farmHierarchy.parcel.soilType")}:
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {parcel.soil_type}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {t("farmHierarchy.parcel.clickForDetails")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
      </ResponsiveDialog>

      {/* Archive Parcel Confirmation Dialog */}
      <AlertDialog
        open={!!parcelToDelete}
        onOpenChange={(open) => {
          if (!open && !archiveParcelMutation.isPending) {
            setParcelToDelete(null);
            if (archiveParcelMutation.isSuccess) {
              archiveParcelMutation.reset();
            }
          }
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">
              {t("parcels.archiveConfirm", "Archiver la parcelle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("parcels.archiveWarning", "Voulez-vous archiver la parcelle")}{" "}
              <strong className="text-gray-900 dark:text-white">
                {parcelToDelete?.name}
              </strong>{" "}
              ?
              <br />
              <br />
              <span className="text-amber-600 dark:text-amber-400">
                {t("parcels.archiveNote", "Les données historiques (récoltes, coûts, tâches) seront conservées.")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveParcelMutation.isPending}>
              {t("app.cancel")}
            </AlertDialogCancel>
            <Button variant="amber"
              onClick={() => {
                if (parcelToDelete && !archiveParcelMutation.isPending) {
                  archiveParcelMutation.mutate(parcelToDelete.id);
                }
              }}
              disabled={archiveParcelMutation.isPending}
            >
              {archiveParcelMutation.isPending
                ? t("parcels.archiving", "Archivage...")
                : t("parcels.archive", "Archiver")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ParcelManagementModal;
