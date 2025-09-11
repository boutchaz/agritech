import React, { useState } from 'react';
import { Check, X, Users, Sliders, Boxes, LayoutGrid } from 'lucide-react';
import type { Module } from '../types';
import type { DashboardSettings } from '../types';

interface SettingsProps {
  modules: Module[];
  onModuleToggle: (moduleId: string) => void;
  dashboardSettings?: DashboardSettings;
  onDashboardSettingsChange?: (settings: DashboardSettings) => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive';
}

type DifficultyLevel = 'basic' | 'intermediate' | 'expert';

const Settings: React.FC<SettingsProps> = ({
  modules,
  onModuleToggle,
  dashboardSettings = {
    showSoilData: true,
    showClimateData: true,
    showIrrigationData: true,
    showMaintenanceData: true,
    showProductionData: true,
    showFinancialData: true,
    showStockAlerts: true,
    showTaskAlerts: true,
    layout: {
      topRow: ['soil', 'climate', 'irrigation', 'maintenance'],
      middleRow: ['production', 'financial'],
      bottomRow: ['alerts', 'tasks']
    }
  },
  onDashboardSettingsChange = () => {}
}) => {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState<'modules' | 'users' | 'preferences' | 'dashboard'>('modules');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('basic');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const agricultureModules = modules.filter(m => m.category === 'agriculture');
  const elevageModules = modules.filter(m => m.category === 'elevage');

  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active'
    },
    {
      id: '2',
      name: 'Manager User',
      email: 'manager@example.com',
      role: 'manager',
      status: 'active'
    }
  ]);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user' as const,
    password: '',
    confirmPassword: ''
  });

  const tabs = [
    { id: 'modules', name: 'Modules', icon: Boxes },
    { id: 'users', name: 'Utilisateurs', icon: Users },
    { id: 'preferences', name: 'Préférences', icon: Sliders },
    { id: 'dashboard', name: 'Tableau de bord', icon: LayoutGrid }
  ];

  const handleDashboardSettingChange = (key: keyof DashboardSettings, value: boolean) => {
    const newSettings = {
      ...dashboardSettings,
      [key]: value
    };
    onDashboardSettingsChange(newSettings);
  };

  const handleAddUser = () => {
    // Add user logic here
    setShowAddUser(false);
  };

  const handleUpdateUser = () => {
    // Update user logic here
    setEditingUser(null);
  };

  const handleDeleteUser = (userId: string) => {
    // Delete user logic here
  };

  const renderModuleSettings = (module: Module) => {
    switch (module.id) {
      case 'fruit-trees':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Paramètres des arbres fruitiers</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span>Notifications de taille</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span>Alertes de maladies</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span>Prévisions de récolte</span>
              </label>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-gray-500 dark:text-gray-400">
            Aucun paramètre spécifique disponible pour ce module
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Modules Agriculture
            </h3>
            <div className="space-y-3">
              {agricultureModules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => setSelectedModule(module)}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={module.active}
                      onChange={() => onModuleToggle(module.id)}
                      className="rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{module.name}</span>
                  </div>
                  {module.active ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Modules Élevage
            </h3>
            <div className="space-y-3">
              {elevageModules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => setSelectedModule(module)}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={module.active}
                      onChange={() => onModuleToggle(module.id)}
                      className="rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{module.name}</span>
                  </div>
                  {module.active ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Users className="h-5 w-5" />
              <span>Nouvel Utilisateur</span>
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          user.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                      >
                        {user.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Préférences de l'Application
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Niveau de difficulté
              </label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setDifficultyLevel('basic')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    difficultyLevel === 'basic'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">Basique</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Interface simplifiée avec fonctionnalités essentielles
                  </p>
                </button>
                
                <button
                  onClick={() => setDifficultyLevel('intermediate')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    difficultyLevel === 'intermediate'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">Moyen</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Fonctionnalités avancées avec aide contextuelle
                  </p>
                </button>
                
                <button
                  onClick={() => setDifficultyLevel('expert')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    difficultyLevel === 'expert'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">Expert</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Toutes les fonctionnalités sans assistance
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Configuration du Tableau de Bord
          </h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Données à afficher</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showSoilData}
                    onChange={(e) => handleDashboardSettingChange('showSoilData', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Données du sol</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showClimateData}
                    onChange={(e) => handleDashboardSettingChange('showClimateData', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Données climatiques</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showIrrigationData}
                    onChange={(e) => handleDashboardSettingChange('showIrrigationData', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Données d'irrigation</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showMaintenanceData}
                    onChange={(e) => handleDashboardSettingChange('showMaintenanceData', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Données de maintenance</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showProductionData}
                    onChange={(e) => handleDashboardSettingChange('showProductionData', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Données de production</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showFinancialData}
                    onChange={(e) => handleDashboardSettingChange('showFinancialData', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Données financières</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showStockAlerts}
                    onChange={(e) => handleDashboardSettingChange('showStockAlerts', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Alertes de stock</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={dashboardSettings.showTaskAlerts}
                    onChange={(e) => handleDashboardSettingChange('showTaskAlerts', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Alertes de tâches</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Disposition</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ligne supérieure
                  </label>
                  <select
                    multiple
                    value={dashboardSettings.layout.topRow}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      onDashboardSettingsChange({
                        ...dashboardSettings,
                        layout: {
                          ...dashboardSettings.layout,
                          topRow: values
                        }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="soil">Données du sol</option>
                    <option value="climate">Données climatiques</option>
                    <option value="irrigation">Irrigation</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ligne centrale
                  </label>
                  <select
                    multiple
                    value={dashboardSettings.layout.middleRow}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      onDashboardSettingsChange({
                        ...dashboardSettings,
                        layout: {
                          ...dashboardSettings.layout,
                          middleRow: values
                        }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="production">Production</option>
                    <option value="financial">Finances</option>
                    <option value="stock">Stock</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ligne inférieure
                  </label>
                  <select
                    multiple
                    value={dashboardSettings.layout.bottomRow}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      onDashboardSettingsChange({
                        ...dashboardSettings,
                        layout: {
                          ...dashboardSettings.layout,
                          bottomRow: values
                        }
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="alerts">Alertes</option>
                    <option value="tasks">Tâches</option>
                    <option value="weather">Météo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {(showAddUser || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h3>
              <button
                onClick={() => {
                  setShowAddUser(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom
                </label>
                <input
                  type="text"
                  value={editingUser?.name || newUser.name}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({ ...editingUser, name: e.target.value });
                    } else {
                      setNewUser({ ...newUser, name: e.target.value });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser?.email || newUser.email}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({ ...editingUser, email: e.target.value });
                    } else {
                      setNewUser({ ...newUser, email: e.target.value });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rôle
                </label>
                <select
                  value={editingUser?.role || newUser.role}
                  onChange={(e) => {
                    if (editingUser) {
                      setEditingUser({
                        ...editingUser,
                        role: e.target.value as 'admin' | 'manager' | 'user'
                      });
                    } else {
                      setNewUser({
                        ...newUser,
                        role: e.target.value as 'admin' | 'manager' | 'user'
                      });
                    }
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="user">Utilisateur</option>
                  <option value="manager">Gestionnaire</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={newUser.confirmPassword}
                      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddUser(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Annuler
              </button>
              <button
                onClick={editingUser ? handleUpdateUser : handleAddUser}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                {editingUser ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Settings */}
      {selectedModule && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configuration de {selectedModule.name}
            </h3>
            <button
              onClick={() => setSelectedModule(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {renderModuleSettings(selectedModule)}
        </div>
      )}
    </div>
  );
};

export default Settings;