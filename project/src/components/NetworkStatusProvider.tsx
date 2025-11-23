import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { NetworkStatus } from '@/hooks/useNetworkStatus';

interface NetworkStatusContextValue extends NetworkStatus {
  wasOffline: boolean;
  checkConnectivity: () => Promise<boolean>;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | undefined>(undefined);

export function useNetworkStatusContext() {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatusContext must be used within NetworkStatusProvider');
  }
  return context;
}

interface NetworkStatusProviderProps {
  children: ReactNode;
  enableToasts?: boolean;
  enableSlowConnectionWarning?: boolean;
}

/**
 * Provider that monitors network status and displays toast notifications
 * when the connection goes online/offline or becomes slow
 */
export function NetworkStatusProvider({
  children,
  enableToasts = true,
  enableSlowConnectionWarning = true,
}: NetworkStatusProviderProps) {
  const { t } = useTranslation();
  const networkStatus = useNetworkStatus();

  // Show toast notifications on network status changes
  useEffect(() => {
    if (!enableToasts) return;

    if (!networkStatus.isOnline) {
      toast.error(t('network.offline.title'), {
        description: t('network.offline.description'),
        duration: Infinity,
        id: 'network-offline',
        action: {
          label: t('network.offline.retry'),
          onClick: () => {
            networkStatus.checkConnectivity().then((isOnline) => {
              if (isOnline) {
                toast.success(t('network.online.title'), {
                  description: t('network.online.description'),
                });
                toast.dismiss('network-offline');
              }
            });
          },
        },
      });
    } else {
      // Dismiss offline toast when back online
      toast.dismiss('network-offline');

      // Show success message if we just came back online
      if (networkStatus.wasOffline) {
        toast.success(t('network.online.title'), {
          description: t('network.online.description'),
          duration: 5000,
        });
      }
    }
  }, [networkStatus.isOnline, networkStatus.wasOffline, enableToasts, t, networkStatus.checkConnectivity]);

  // Show warning for slow connections
  useEffect(() => {
    if (!enableToasts || !enableSlowConnectionWarning) return;

    if (networkStatus.isOnline && networkStatus.isSlowConnection) {
      toast.warning(t('network.slow.title'), {
        description: t('network.slow.description', {
          type: networkStatus.connectionType,
        }),
        duration: 5000,
        id: 'network-slow',
      });
    } else {
      toast.dismiss('network-slow');
    }
  }, [
    networkStatus.isOnline,
    networkStatus.isSlowConnection,
    networkStatus.connectionType,
    enableToasts,
    enableSlowConnectionWarning,
    t,
  ]);

  return (
    <NetworkStatusContext.Provider value={networkStatus}>
      {children}
    </NetworkStatusContext.Provider>
  );
}
