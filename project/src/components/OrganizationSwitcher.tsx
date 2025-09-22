import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './MultiTenantAuthProvider';
import { useNavigate } from '@tanstack/react-router';
import { Building, ChevronDown, Check, Settings, Users, LogOut } from 'lucide-react';

const OrganizationSwitcher: React.FC = () => {
  const {
    organizations,
    currentOrganization,
    farms,
    currentFarm,
    setCurrentOrganization,
    setCurrentFarm,
    signOut,
    profile
  } = useAuth();

  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [showFarms, setShowFarms] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowFarms(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const dropdownWidth = 320; // w-80 = 20rem = 320px

      // Check if dropdown would overflow on the right
      if (buttonRect.left + dropdownWidth > windowWidth - 20) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    }
  }, [isOpen]);

  const handleOrganizationSelect = async (org: any) => {
    setCurrentOrganization(org);
    setShowFarms(true);
  };

  const handleFarmSelect = (farm: any) => {
    setCurrentFarm(farm);
    setIsOpen(false);
    setShowFarms(false);
  };

  const handleOrganizationSettings = () => {
    setIsOpen(false);
    setShowFarms(false);
    navigate({ to: '/settings/organization' });
  };

  const handleTeamManagement = () => {
    setIsOpen(false);
    setShowFarms(false);
    navigate({ to: '/settings/users' });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'member': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propriétaire';
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'member': return 'Membre';
      case 'viewer': return 'Lecteur';
      default: return role;
    }
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Building className="h-5 w-5 text-gray-500" />
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {currentOrganization.name}
            </div>
            {currentFarm && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {currentFarm.name}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 ${
          dropdownPosition === 'right' ? 'right-0' : 'left-0'
        }`}>
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {profile?.first_name} {profile?.last_name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {profile?.id}
                </div>
              </div>
            </div>
          </div>

          {!showFarms ? (
            // Organization List
            <>
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Organisations
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrganizationSelect(org)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {org.name}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(org.role)}`}>
                            {getRoleLabel(org.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {currentOrganization.id === org.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700">
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                  onClick={handleOrganizationSettings}
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">Paramètres de l'organisation</span>
                </button>
                <button
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3"
                  onClick={handleTeamManagement}
                >
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">Gérer l'équipe</span>
                </button>
                <button
                  onClick={signOut}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </>
          ) : (
            // Farm List
            <>
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowFarms(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Retour aux organisations
                </button>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-2">
                  Fermes - {currentOrganization.name}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                {farms.map((farm) => (
                  <button
                    key={farm.id}
                    onClick={() => handleFarmSelect(farm)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {farm.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {farm.location} • {farm.size} ha
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        Gestionnaire: {farm.manager_name}
                      </div>
                    </div>
                    {currentFarm?.id === farm.id && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                ))}
              </div>

              {farms.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>Aucune ferme trouvée</p>
                  <p className="text-xs">Créez votre première ferme</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationSwitcher;