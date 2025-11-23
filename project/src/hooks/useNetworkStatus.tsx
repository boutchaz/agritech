import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Hook to detect network online/offline status and connection quality
 * Monitors:
 * - navigator.onLine status
 * - Network Information API (when available)
 * - Actual connectivity via periodic checks
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const connection = getConnectionInfo();
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSlowConnection: connection ? isSlowConnection(connection) : false,
      connectionType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    };
  });

  const [wasOffline, setWasOffline] = useState(false);

  // Get connection info from Network Information API
  const updateConnectionInfo = useCallback(() => {
    const connection = getConnectionInfo();
    const isOnline = navigator.onLine;

    setNetworkStatus({
      isOnline,
      isSlowConnection: connection ? isSlowConnection(connection) : false,
      connectionType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
    });

    // Track if we just came back online
    if (isOnline && wasOffline) {
      setWasOffline(false);
    } else if (!isOnline && !wasOffline) {
      setWasOffline(true);
    }
  }, [wasOffline]);

  // Perform actual connectivity check (ping a resource)
  const checkActualConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource with no-cache
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    // Update on online/offline events
    const handleOnline = () => {
      updateConnectionInfo();
      // Verify actual connectivity
      checkActualConnectivity().then((isActuallyOnline) => {
        if (!isActuallyOnline) {
          setNetworkStatus((prev) => ({ ...prev, isOnline: false }));
        }
      });
    };

    const handleOffline = () => {
      updateConnectionInfo();
    };

    // Update on connection change
    const handleConnectionChange = () => {
      updateConnectionInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getConnectionInfo();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkActualConnectivity().then((isActuallyOnline) => {
          setNetworkStatus((prev) => {
            if (prev.isOnline !== isActuallyOnline) {
              return { ...prev, isOnline: isActuallyOnline };
            }
            return prev;
          });
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      clearInterval(intervalId);
    };
  }, [updateConnectionInfo, checkActualConnectivity]);

  return {
    ...networkStatus,
    wasOffline,
    checkConnectivity: checkActualConnectivity,
  };
}

// Helper functions
function getConnectionInfo(): any {
  if (typeof navigator === 'undefined') return null;

  // @ts-ignore - Network Information API is not fully typed
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

function isSlowConnection(connection: any): boolean {
  // Consider slow if:
  // - effectiveType is 2g or slow-2g
  // - rtt (round trip time) is > 500ms
  // - downlink is < 0.5 Mbps
  const effectiveType = connection.effectiveType;
  const rtt = connection.rtt;
  const downlink = connection.downlink;

  return (
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    (rtt && rtt > 500) ||
    (downlink && downlink < 0.5)
  );
}
