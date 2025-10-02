import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, TreeDeciduous, Sprout, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from './MultiTenantAuthProvider';
import { useTreeCategories, usePlantationTypes } from '../hooks/useTreeManagement';

interface TreeManagementProps {
  onDataChange?: () => void;
}

const TreeManagement: React.FC<TreeManagementProps> = ({ onDataChange }) => {
  const { currentOrganization } = useAuth();

  // Use the hooks to fetch data from the backend
  const {
    categories: treeCategories,
    loading: categoriesLoading,
    error: categoriesError,
    addCategory,
    updateCategory,
    deleteCategory,
    addTree,
    updateTree,
    deleteTree
  } = useTreeCategories(currentOrganization?.id || null);

  const {
    plantationTypes,
    loading: plantationLoading,
    error: plantationError,
    addPlantationType,
    updatePlantationType,
    deletePlantationType
  } = usePlantationTypes(currentOrganization?.id || null);

  // Tree categories state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingTree, setEditingTree] = useState<{ categoryId: string; treeId: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTreeName, setNewTreeName] = useState('');
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [editedTreeName, setEditedTreeName] = useState('');

  // Plantation types state
  const [editingPlantation, setEditingPlantation] = useState<string | null>(null);
  const [newPlantationType, setNewPlantationType] = useState({
    type: '',
    spacing: '',
    treesPerHa: 0
  });
  const [editedPlantationType, setEditedPlantationType] = useState({
    type: '',
    spacing: '',
    treesPerHa: 0
  });

  // Active tab
  const [activeTab, setActiveTab] = useState<'trees' | 'plantations'>('trees');

  // Tree category management
  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        await addCategory(newCategoryName.trim());
        setNewCategoryName('');
        onDataChange?.();
      } catch (error: any) {
        alert('Error adding category: ' + error.message);
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) {
      try {
        await deleteCategory(categoryId);
        onDataChange?.();
      } catch (error: any) {
        alert('Error deleting category: ' + error.message);
      }
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const category = treeCategories.find(c => c.id === categoryId);
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
    } catch (error: any) {
      alert('Error updating category: ' + error.message);
    }
  };

  const handleAddTree = async (categoryId: string) => {
    if (newTreeName.trim()) {
      try {
        await addTree(categoryId, newTreeName.trim());
        setNewTreeName('');
        onDataChange?.();
      } catch (error: any) {
        alert('Error adding tree: ' + error.message);
      }
    }
  };

  const handleDeleteTree = async (treeId: string) => {
    try {
      await deleteTree(treeId);
      onDataChange?.();
    } catch (error: any) {
      alert('Error deleting tree: ' + error.message);
    }
  };

  const handleEditTree = (categoryId: string, treeId: string, treeName: string) => {
    setEditingTree({ categoryId, treeId });
    setEditedTreeName(treeName);
  };

  const handleSaveTree = async (treeId: string) => {
    try {
      await updateTree(treeId, editedTreeName);
      setEditingTree(null);
      onDataChange?.();
    } catch (error: any) {
      alert('Error updating tree: ' + error.message);
    }
  };

  // Plantation type management
  const handleAddPlantationType = async () => {
    if (newPlantationType.type.trim() && newPlantationType.spacing.trim()) {
      try {
        await addPlantationType(
          newPlantationType.type,
          newPlantationType.spacing,
          newPlantationType.treesPerHa
        );
        setNewPlantationType({ type: '', spacing: '', treesPerHa: 0 });
        onDataChange?.();
      } catch (error: any) {
        alert('Error adding plantation type: ' + error.message);
      }
    }
  };

  const handleDeletePlantationType = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce type de plantation?')) {
      try {
        await deletePlantationType(id);
        onDataChange?.();
      } catch (error: any) {
        alert('Error deleting plantation type: ' + error.message);
      }
    }
  };

  const handleEditPlantationType = (id: string) => {
    const plantation = plantationTypes.find(p => p.id === id);
    if (plantation) {
      setEditingPlantation(id);
      setEditedPlantationType({
        type: plantation.type,
        spacing: plantation.spacing,
        treesPerHa: plantation.trees_per_ha
      });
    }
  };

  const handleSavePlantationType = async (id: string) => {
    try {
      await updatePlantationType(
        id,
        editedPlantationType.type,
        editedPlantationType.spacing,
        editedPlantationType.treesPerHa
      );
      setEditingPlantation(null);
      onDataChange?.();
    } catch (error: any) {
      alert('Error updating plantation type: ' + error.message);
    }
  };

  // Show loading state
  if (categoriesLoading || plantationLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
      </div>
    );
  }

  // Show error state
  if (categoriesError || plantationError) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Erreur: {categoriesError || plantationError}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('trees')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'trees'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <TreeDeciduous className="inline h-4 w-4 mr-2" />
          Types d'arbres
        </button>
        <button
          onClick={() => setActiveTab('plantations')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'plantations'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Sprout className="inline h-4 w-4 mr-2" />
          Types de plantation
        </button>
      </div>

      {/* Tree Categories Tab */}
      {activeTab === 'trees' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Nouvelle catégorie..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter catégorie</span>
            </button>
          </div>

          <div className="space-y-4">
            {treeCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  {editingCategory === category.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        value={editedCategoryName}
                        onChange={(e) => setEditedCategoryName(e.target.value)}
                        className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleSaveCategory(category.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {category.category}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditCategory(category.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTree(category.id)}
                      placeholder="Ajouter un arbre..."
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleAddTree(category.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
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
                            <button
                              onClick={() => handleSaveTree(tree.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setEditingTree(null)}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-green-800 dark:text-green-200">
                              {tree.name}
                            </span>
                            <button
                              onClick={() => handleEditTree(category.id, tree.id, tree.name)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTree(tree.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plantation Types Tab */}
      {activeTab === 'plantations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Ajouter un type de plantation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={newPlantationType.type}
                onChange={(e) =>
                  setNewPlantationType({ ...newPlantationType, type: e.target.value })
                }
                placeholder="Type (ex: Super intensif)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={newPlantationType.spacing}
                onChange={(e) =>
                  setNewPlantationType({ ...newPlantationType, spacing: e.target.value })
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
                    treesPerHa: parseInt(e.target.value) || 0
                  })
                }
                placeholder="Arbres/ha"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleAddPlantationType}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Espacement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Arbres/ha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {plantationTypes.map((plantation) => (
                  <tr key={plantation.id}>
                    {editingPlantation === plantation.id ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editedPlantationType.type}
                            onChange={(e) =>
                              setEditedPlantationType({
                                ...editedPlantationType,
                                type: e.target.value
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editedPlantationType.spacing}
                            onChange={(e) =>
                              setEditedPlantationType({
                                ...editedPlantationType,
                                spacing: e.target.value
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={editedPlantationType.treesPerHa}
                            onChange={(e) =>
                              setEditedPlantationType({
                                ...editedPlantationType,
                                treesPerHa: parseInt(e.target.value) || 0
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleSavePlantationType(plantation.id)}
                            className="text-green-600 hover:text-green-700 mr-3"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingPlantation(null)}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {plantation.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {plantation.spacing}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {plantation.trees_per_ha}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleEditPlantationType(plantation.id)}
                            className="text-blue-600 hover:text-blue-700 mr-3"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlantationType(plantation.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeManagement;
