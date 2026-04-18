import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  TreeDeciduous,
  Sprout,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import {
  useTreeCategories,
  usePlantationTypes,
} from "../hooks/useTreeManagement";
import { Button } from '@/components/ui/button';
import { FilterBar, ListPageLayout, ResponsiveList } from '@/components/ui/data-table';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface TreeManagementProps {
  onDataChange?: () => void;
}

interface TreeItem {
  id: string;
  name: string;
}

interface TreeCategoryItem {
  id: string;
  category: string;
  trees: TreeItem[];
}

interface PlantationTypeItem {
  id: string;
  type: string;
  spacing: string;
  trees_per_ha: number;
}

const TreeManagement = ({ onDataChange }: TreeManagementProps) => {
  const { currentOrganization } = useAuth();

  // Use the hooks to fetch data from the backend
  const {
    categories: rawTreeCategories,
    loading: categoriesLoading,
    error: categoriesError,
    addCategory,
    updateCategory,
    deleteCategory,
    addTree,
    updateTree,
    deleteTree,
  } = useTreeCategories(currentOrganization?.id || null);

  const {
    plantationTypes: rawPlantationTypes,
    loading: plantationLoading,
    error: plantationError,
    addPlantationType,
    updatePlantationType,
    deletePlantationType,
  } = usePlantationTypes(currentOrganization?.id || null);

  const treeCategories: TreeCategoryItem[] = rawTreeCategories.flatMap((category) => {
    if (!category || typeof category !== 'object') {
      return [];
    }

    const record = category as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.category !== 'string') {
      return [];
    }

    const trees = Array.isArray(record.trees)
      ? record.trees.flatMap((tree) => {
          if (!tree || typeof tree !== 'object') {
            return [];
          }

          const treeRecord = tree as Record<string, unknown>;
          if (typeof treeRecord.id !== 'string' || typeof treeRecord.name !== 'string') {
            return [];
          }

          return [{ id: treeRecord.id, name: treeRecord.name }];
        })
      : [];

    return [{ id: record.id, category: record.category, trees }];
  });

  const plantationTypes: PlantationTypeItem[] = rawPlantationTypes.flatMap((plantation) => {
    if (!plantation || typeof plantation !== 'object') {
      return [];
    }

    const record = plantation as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      typeof record.type !== 'string' ||
      typeof record.spacing !== 'string' ||
      typeof record.trees_per_ha !== 'number'
    ) {
      return [];
    }

    return [{
      id: record.id,
      type: record.type,
      spacing: record.spacing,
      trees_per_ha: record.trees_per_ha,
    }];
  });

  // Tree categories state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});
  const showConfirm = (title: string, onConfirm: () => void, opts?: {description?: string; variant?: "destructive" | "default"}) => {
    setConfirmAction({title, onConfirm, ...opts});
    setConfirmOpen(true);
  };

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingTree, setEditingTree] = useState<{
    categoryId: string;
    treeId: string;
  } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTreeName, setNewTreeName] = useState("");
  const [editedCategoryName, setEditedCategoryName] = useState("");
  const [editedTreeName, setEditedTreeName] = useState("");

  // Plantation types state
  const [editingPlantation, setEditingPlantation] = useState<string | null>(
    null,
  );
  const [newPlantationType, setNewPlantationType] = useState({
    type: "",
    spacing: "",
    treesPerHa: 0,
  });
  const [editedPlantationType, setEditedPlantationType] = useState({
    type: "",
    spacing: "",
    treesPerHa: 0,
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<"trees" | "plantations">("trees");
  const [treeSearchTerm, setTreeSearchTerm] = useState("");
  const [plantationSearchTerm, setPlantationSearchTerm] = useState("");

  // Tree category management
  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        await addCategory(newCategoryName.trim());
        setNewCategoryName("");
        onDataChange?.();
      } catch (error: unknown) {
        toast.error("Error adding category: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    showConfirm("Êtes-vous sûr de vouloir supprimer cette catégorie?", async () => {
      try {
        await deleteCategory(categoryId);
        onDataChange?.();
      } catch (error: unknown) {
        toast.error("Error deleting category: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }, {variant: "destructive"});
  };

  const handleEditCategory = (categoryId: string) => {
    const category = treeCategories.find((c) => c.id === categoryId);
    if (category) {
      setEditingCategory(categoryId);
      setEditedCategoryName(category.category);
    }
  };

  const handleSaveCategory = async (categoryId: string) => {
    try {
      await updateCategory(categoryId, editedCategoryName);
      setEditingCategory(null);
      onDataChange?.();
    } catch (error: unknown) {
      toast.error("Error updating category: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleAddTree = async (categoryId: string) => {
    if (newTreeName.trim()) {
      try {
        await addTree(categoryId, newTreeName.trim());
        setNewTreeName("");
        onDataChange?.();
      } catch (error: unknown) {
        toast.error("Error adding tree: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleDeleteTree = async (treeId: string) => {
    try {
      await deleteTree(treeId);
      onDataChange?.();
    } catch (error: unknown) {
      toast.error("Error deleting tree: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditTree = (
    categoryId: string,
    treeId: string,
    treeName: string,
  ) => {
    setEditingTree({ categoryId, treeId });
    setEditedTreeName(treeName);
  };

  const handleSaveTree = async (treeId: string) => {
    try {
      await updateTree(treeId, editedTreeName);
      setEditingTree(null);
      onDataChange?.();
    } catch (error: unknown) {
      toast.error("Error updating tree: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Plantation type management
  const handleAddPlantationType = async () => {
    if (newPlantationType.type.trim() && newPlantationType.spacing.trim()) {
      try {
        await addPlantationType(
          newPlantationType.type,
          newPlantationType.spacing,
          newPlantationType.treesPerHa,
        );
        setNewPlantationType({ type: "", spacing: "", treesPerHa: 0 });
        onDataChange?.();
      } catch (error: unknown) {
        toast.error("Error adding plantation type: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleDeletePlantationType = (id: string) => {
    showConfirm("Êtes-vous sûr de vouloir supprimer ce type de plantation?", async () => {
      try {
        await deletePlantationType(id);
        onDataChange?.();
      } catch (error: unknown) {
        toast.error("Error deleting plantation type: " + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }, {variant: "destructive"});
  };

  const handleEditPlantationType = (id: string) => {
    const plantation = plantationTypes.find((p) => p.id === id);
    if (plantation) {
      setEditingPlantation(id);
      setEditedPlantationType({
        type: plantation.type,
        spacing: plantation.spacing,
        treesPerHa: plantation.trees_per_ha,
      });
    }
  };

  const handleSavePlantationType = async (id: string) => {
    try {
      await updatePlantationType(
        id,
        editedPlantationType.type,
        editedPlantationType.spacing,
        editedPlantationType.treesPerHa,
      );
      setEditingPlantation(null);
      onDataChange?.();
    } catch (error: unknown) {
      toast.error("Error updating plantation type: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Show error state
  if (categoriesError || plantationError) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Erreur: {categoriesError || plantationError}</span>
      </div>
    );
  }

  const normalizedTreeSearch = treeSearchTerm.trim().toLowerCase();
  const normalizedPlantationSearch = plantationSearchTerm.trim().toLowerCase();

  const filteredTreeCategories = treeCategories.filter((category) => {
    if (!normalizedTreeSearch) {
      return true;
    }

    return (
      category.category.toLowerCase().includes(normalizedTreeSearch) ||
      category.trees.some((tree) =>
        tree.name.toLowerCase().includes(normalizedTreeSearch),
      )
    );
  });

  const filteredPlantationTypes = plantationTypes.filter((plantation) => {
    if (!normalizedPlantationSearch) {
      return true;
    }

    return (
      plantation.type.toLowerCase().includes(normalizedPlantationSearch) ||
      plantation.spacing.toLowerCase().includes(normalizedPlantationSearch) ||
      plantation.trees_per_ha.toString().includes(normalizedPlantationSearch)
    );
  });

  const treeEmptyAction = treeSearchTerm
    ? {
        label: "Effacer la recherche",
        onClick: () => setTreeSearchTerm(""),
        variant: "outline" as const,
      }
    : newCategoryName.trim()
      ? {
          label: "Ajouter cette catégorie",
          onClick: handleAddCategory,
          variant: "default" as const,
        }
      : undefined;

  const plantationEmptyAction = plantationSearchTerm
    ? {
        label: "Effacer la recherche",
        onClick: () => setPlantationSearchTerm(""),
        variant: "outline" as const,
      }
    : newPlantationType.type.trim() && newPlantationType.spacing.trim()
      ? {
          label: "Ajouter ce type",
          onClick: handleAddPlantationType,
          variant: "default" as const,
        }
      : undefined;

  const renderTreeCard = (category: TreeCategoryItem) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3 gap-3">
        {editingCategory === category.id ? (
          <div className="flex items-center space-x-2 flex-1">
            <input
              type="text"
              value={editedCategoryName}
              onChange={(e) => setEditedCategoryName(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Button
              onClick={() => handleSaveCategory(category.id)}
              className="text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setEditingCategory(null)}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {category.category}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {category.trees.length} arbre{category.trees.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => handleEditCategory(category.id)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleDeleteCategory(category.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTree(category.id)}
            placeholder="Ajouter un arbre..."
            className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Button
            variant="green"
            onClick={() => handleAddTree(category.id)}
            className="px-3 py-1 rounded text-sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {category.trees.map((tree) => (
            <div
              key={tree.id}
              className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-sm"
            >
              {editingTree?.treeId === tree.id ? (
                <>
                  <input
                    type="text"
                    value={editedTreeName}
                    onChange={(e) => setEditedTreeName(e.target.value)}
                    className="w-32 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <Button
                    onClick={() => handleSaveTree(tree.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => setEditingTree(null)}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-green-800 dark:text-green-200">
                    {tree.name}
                  </span>
                  <Button
                    onClick={() => handleEditTree(category.id, tree.id, tree.name)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteTree(tree.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTreeTable = (category: TreeCategoryItem) => (
    <>
      <TableCell className="px-6 py-4 align-top text-sm text-gray-900 dark:text-white">
        {editingCategory === category.id ? (
          <input
            type="text"
            value={editedCategoryName}
            onChange={(e) => setEditedCategoryName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        ) : (
          <div>
            <div className="font-semibold">{category.category}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {category.trees.length} arbre{category.trees.length > 1 ? 's' : ''}
            </div>
          </div>
        )}
      </TableCell>
      <TableCell className="px-6 py-4 align-top">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTreeName}
              onChange={(e) => setNewTreeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTree(category.id)}
              placeholder="Ajouter un arbre..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <Button
              variant="green"
              onClick={() => handleAddTree(category.id)}
              className="px-3 py-2 rounded text-sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {category.trees.map((tree) => (
              <div
                key={tree.id}
                className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-sm"
              >
                {editingTree?.treeId === tree.id ? (
                  <>
                    <input
                      type="text"
                      value={editedTreeName}
                      onChange={(e) => setEditedTreeName(e.target.value)}
                      className="w-32 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <Button
                      onClick={() => handleSaveTree(tree.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => setEditingTree(null)}
                      className="text-gray-600 hover:text-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-green-800 dark:text-green-200">
                      {tree.name}
                    </span>
                    <Button
                      onClick={() => handleEditTree(category.id, tree.id, tree.name)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteTree(tree.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 align-top text-right">
        {editingCategory === category.id ? (
          <div className="flex items-center justify-end space-x-2">
            <Button
              onClick={() => handleSaveCategory(category.id)}
              className="text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setEditingCategory(null)}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end space-x-2">
            <Button
              onClick={() => handleEditCategory(category.id)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => handleDeleteCategory(category.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </>
  );

  const renderPlantationCard = (plantation: PlantationTypeItem) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      {editingPlantation === plantation.id ? (
        <div className="space-y-3">
          <div>
            <label htmlFor={`plantation-type-${plantation.id}`} className="text-xs text-gray-500 dark:text-gray-400">
              Type
            </label>
            <input
              id={`plantation-type-${plantation.id}`}
              type="text"
              value={editedPlantationType.type}
              onChange={(e) =>
                setEditedPlantationType({
                  ...editedPlantationType,
                  type: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor={`plantation-spacing-${plantation.id}`} className="text-xs text-gray-500 dark:text-gray-400">
              Espacement
            </label>
            <input
              id={`plantation-spacing-${plantation.id}`}
              type="text"
              value={editedPlantationType.spacing}
              onChange={(e) =>
                setEditedPlantationType({
                  ...editedPlantationType,
                  spacing: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor={`plantation-trees-${plantation.id}`} className="text-xs text-gray-500 dark:text-gray-400">
              Arbres/ha
            </label>
            <input
              id={`plantation-trees-${plantation.id}`}
              type="number"
              value={editedPlantationType.treesPerHa}
              onChange={(e) =>
                setEditedPlantationType({
                  ...editedPlantationType,
                  treesPerHa: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => handleSavePlantationType(plantation.id)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-green-600 hover:text-green-700"
            >
              <Save className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setEditingPlantation(null)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2 gap-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {plantation.type}
            </h4>
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => handleEditPlantationType(plantation.id)}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-blue-600 hover:text-blue-700"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleDeletePlantationType(plantation.id)}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Espacement:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {plantation.spacing}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Arbres/ha:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">
                {plantation.trees_per_ha}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPlantationTable = (plantation: PlantationTypeItem) => (
    <>
      {editingPlantation === plantation.id ? (
        <>
          <TableCell className="px-6 py-4 whitespace-nowrap">
            <input
              type="text"
              value={editedPlantationType.type}
              onChange={(e) =>
                setEditedPlantationType({
                  ...editedPlantationType,
                  type: e.target.value,
                })
              }
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap">
            <input
              type="text"
              value={editedPlantationType.spacing}
              onChange={(e) =>
                setEditedPlantationType({
                  ...editedPlantationType,
                  spacing: e.target.value,
                })
              }
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap">
            <input
              type="number"
              value={editedPlantationType.treesPerHa}
              onChange={(e) =>
                setEditedPlantationType({
                  ...editedPlantationType,
                  treesPerHa: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-right">
            <Button
              onClick={() => handleSavePlantationType(plantation.id)}
              className="text-green-600 hover:text-green-700 mr-3"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setEditingPlantation(null)}
              className="text-gray-600 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </TableCell>
        </>
      ) : (
        <>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
            {plantation.type}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
            {plantation.spacing}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
            {plantation.trees_per_ha}
          </TableCell>
          <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
            <Button
              onClick={() => handleEditPlantationType(plantation.id)}
              className="text-blue-600 hover:text-blue-700 mr-3"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => handleDeletePlantationType(plantation.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        <Button
          onClick={() => setActiveTab("trees")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "trees"
              ? "border-b-2 border-green-600 text-green-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          <TreeDeciduous className="inline h-4 w-4 mr-2" />
          Types d'arbres
        </Button>
        <Button
          onClick={() => setActiveTab("plantations")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === "plantations"
              ? "border-b-2 border-green-600 text-green-600"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          <Sprout className="inline h-4 w-4 mr-2" />
          Types de plantation
        </Button>
      </div>

      {/* Tree Categories Tab */}
      {activeTab === "trees" && (
        <ListPageLayout
          header={
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <TreeDeciduous className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Types d'arbres
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gérez les catégories et les arbres disponibles.
                </p>
              </div>
            </div>
          }
          filters={
            <FilterBar
              searchValue={treeSearchTerm}
              onSearchChange={setTreeSearchTerm}
              searchPlaceholder="Rechercher une catégorie ou un arbre..."
              onClear={() => setTreeSearchTerm("")}
            />
          }
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Nouvelle catégorie..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button variant="green" onClick={handleAddCategory} className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2" >
                <Plus className="h-4 w-4" />
                <span>Ajouter catégorie</span>
              </Button>
            </div>

            <ResponsiveList
              items={filteredTreeCategories}
              isLoading={categoriesLoading}
              keyExtractor={(category) => category.id}
              renderCard={renderTreeCard}
              renderTable={renderTreeTable}
              renderTableHeader={
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Catégorie
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Arbres
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              }
              emptyIcon={TreeDeciduous}
              emptyTitle={treeSearchTerm ? "Aucun résultat" : "Aucune catégorie"}
              emptyMessage={
                treeSearchTerm
                  ? "Aucune catégorie ni aucun arbre ne correspond à votre recherche."
                  : "Ajoutez votre première catégorie d'arbres pour commencer."
              }
              emptyAction={treeEmptyAction}
            />
          </div>
        </ListPageLayout>
      )}

      {/* Plantation Types Tab */}
      {activeTab === "plantations" && (
        <ListPageLayout
          header={
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Types de plantation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gérez les densités et espacements de plantation.
                </p>
              </div>
            </div>
          }
          filters={
            <FilterBar
              searchValue={plantationSearchTerm}
              onSearchChange={setPlantationSearchTerm}
              searchPlaceholder="Rechercher un type, un espacement ou une densité..."
              onClear={() => setPlantationSearchTerm("")}
            />
          }
        >
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Ajouter un type de plantation
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newPlantationType.type}
                  onChange={(e) =>
                    setNewPlantationType({
                      ...newPlantationType,
                      type: e.target.value,
                    })
                  }
                  placeholder="Type (ex: Super intensif)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newPlantationType.spacing}
                  onChange={(e) =>
                    setNewPlantationType({
                      ...newPlantationType,
                      spacing: e.target.value,
                    })
                  }
                  placeholder="Espacement (ex: 4x1,5)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="number"
                  value={newPlantationType.treesPerHa}
                  onChange={(e) =>
                    setNewPlantationType({
                      ...newPlantationType,
                      treesPerHa: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Arbres/ha"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <Button variant="green" onClick={handleAddPlantationType} className="px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2" >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter</span>
                </Button>
              </div>
            </div>

            <ResponsiveList
              items={filteredPlantationTypes}
              isLoading={plantationLoading}
              keyExtractor={(plantation) => plantation.id}
              renderCard={renderPlantationCard}
              renderTable={renderPlantationTable}
              renderTableHeader={
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Espacement
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Arbres/ha
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              }
              emptyIcon={Sprout}
              emptyTitle={plantationSearchTerm ? "Aucun résultat" : "Aucun type de plantation"}
              emptyMessage={
                plantationSearchTerm
                  ? "Aucun type de plantation ne correspond à votre recherche."
                  : "Ajoutez votre premier type de plantation pour commencer."
              }
              emptyAction={plantationEmptyAction}
            />
          </div>
        </ListPageLayout>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default TreeManagement;
