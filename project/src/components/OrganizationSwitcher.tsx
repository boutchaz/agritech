import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import { Building, ChevronDown, Check, Settings, Users, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/ui/UserAvatar';
import {
  headerToolbarTextTriggerClass,
  headerToolbarTightTriggerClass,
} from '@/lib/header-toolbar';
import { Button } from '@/components/ui/button';

interface OrganizationSwitcherProps {
  compact?: boolean;
}

const OrganizationSwitcher = ({ compact = false }: OrganizationSwitcherProps) => {
  const { t } = useTranslation();
  const {
    organizations,
    currentOrganization,
    farms: farmsData,
    currentFarm,
    setCurrentOrganization,
    setCurrentFarm,
    signOut,
    profile,
    user
  } = useAuth();

  // Ensure farms is always an array
  const farms = Array.isArray(farmsData) ? farmsData : [];

  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [showFarms, setShowFarms] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => {
      setIsOpen(false);
      setShowFarms(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen]);

  useHotkey('Escape', () => {
    setIsOpen(false);
    setShowFarms(false);
  }, {
    enabled: isOpen,
    meta: { name: t('close', 'Close'), description: 'Close organization switcher' },
  });

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current || !dropdownRef.current) return;
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const parentRect = dropdownRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const dropdownWidth = Math.min(320, windowWidth - 24);
      const margin = 12;

      // Calculate where the dropdown's left edge would be if right-aligned to button
      const rightAlignedLeft = buttonRect.right - dropdownWidth;
      // Calculate where the dropdown's right edge would be if left-aligned to button
      const leftAlignedRight = buttonRect.left + dropdownWidth;

      let left: number;

      if (rightAlignedLeft >= margin) {
        // Right-align: dropdown ends at button's right edge
        left = buttonRect.right - dropdownWidth - parentRect.left;
      } else if (leftAlignedRight <= windowWidth - margin) {
        // Left-align: dropdown starts at button's left edge
        left = buttonRect.left - parentRect.left;
      } else {
        // Center in viewport as fallback
        left = (windowWidth - dropdownWidth) / 2 - parentRect.left;
      }

      setDropdownStyle({
        left: `${left}px`,
        width: `${dropdownWidth}px`,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const handleOrganizationSelect = async (org: { id: string; name: string; role: string }) => {
    setCurrentOrganization(org);
    setShowFarms(true);
  };

  const handleFarmSelect = (farm: { id: string; name: string; location?: string | null; size?: number | null }) => {
    setCurrentFarm(farm);
    setIsOpen(false);
    setShowFarms(false);
  };

  const handleOrganizationSettings = () => {
    setIsOpen(false);
    setShowFarms(false);
    navigate({ to: '/settings/organization' });
  };

  const handleUserProfile = () => {
    setIsOpen(false);
    setShowFarms(false);
    navigate({ to: '/settings/account' });
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
    const key = `orgSwitcher.roles.${role}`;
    const translated = t(key);
    return translated !== key ? translated : role;
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef} data-tour="org-switcher">
      <Button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        data-tour="user-menu"
        title={
          !compact && currentFarm
            ? `${currentOrganization.name} — ${currentFarm.name}`
            : currentOrganization.name
        }
        className={cn(
          compact ? headerToolbarTightTriggerClass : cn(headerToolbarTextTriggerClass, 'justify-between'),
          'w-full sm:w-auto',
        )}
      >
        {compact ? (
          <>
            <Building className="h-5 w-5 shrink-0 text-gray-500" />
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform', isOpen && 'rotate-180')}
            />
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Building className="h-5 w-5 shrink-0 text-gray-500" />
              <span className="truncate text-start text-sm font-medium text-gray-900 dark:text-white">
                {currentOrganization.name}
                {currentFarm ? ` · ${currentFarm.name}` : ''}
              </span>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-gray-500 transition-transform', isOpen && 'rotate-180')}
            />
          </>
        )}
      </Button>

      {isOpen && (
        <div
          className="absolute top-full z-[200] mt-2 max-h-[80vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={dropdownStyle}
        >
          {/* User Info */}
          <button
            type="button"
            onClick={handleUserProfile}
            className="w-full px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                src={profile?.avatar_url}
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={user?.email}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-start">
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate text-start">
                  {user?.email || 'No email'}
                </div>
              </div>
            </div>
          </button>

          {!showFarms ? (
            // Organization List
            <>
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t('orgSwitcher.organizations')}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                {organizations.map((org) => (
                  <button
                    type="button"
                    key={org.id}
                    onClick={() => handleOrganizationSelect(org)}
                    className="w-full px-4 py-3 text-start hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Building className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[180px]">
                          {org.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium max-w-[150px] truncate ${getRoleColor(org.role)}`}>
                            {getRoleLabel(org.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {currentOrganization.id === org.id && (
                      <Check className="h-4 w-4 shrink-0 text-green-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={handleOrganizationSettings}
                >
                  <Settings className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 text-gray-700 dark:text-gray-300">
                    {t('orgSwitcher.orgSettings')}
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={handleTeamManagement}
                >
                  <Users className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 text-gray-700 dark:text-gray-300">{t('orgSwitcher.manageTeam')}</span>
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">{t('orgSwitcher.signOut')}</span>
                </button>
              </div>
            </>
          ) : (
            // Farm List
            <>
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowFarms(false)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {t('orgSwitcher.backToOrganizations')}
                </button>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-2">
                  {t('orgSwitcher.farms', { orgName: currentOrganization.name })}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                {Array.isArray(farms) && farms.length > 0 ? (
                  farms.map((farm) => (
                    <button
                      key={farm.id}
                      type="button"
                      onClick={() => handleFarmSelect(farm)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {farm.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {farm.location ? `${farm.location} • ` : ''}{farm.size ? `${farm.size} ha` : ''}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {t('orgSwitcher.manager', { name: farm.manager_name })}
                        </div>
                      </div>
                      {currentFarm?.id === farm.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>{t('orgSwitcher.noFarms')}</p>
                    <p className="text-xs">{t('orgSwitcher.createFirstFarm')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationSwitcher;
