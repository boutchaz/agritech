import React from 'react';
import { useNetworkStatusContext } from './NetworkStatusProvider';

/**
 * Debug component to log network status
 * Add this temporarily to any page to see what's happening
 *
 * Usage:
 * import { NetworkDebug } from '@/components/NetworkDebug';
 *
 * <NetworkDebug />
 */
export function NetworkDebug() {
  const networkStatus = useNetworkStatusContext();

  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('🌐 Network Status Update:', {
      isOnline: networkStatus.isOnline,
      isSlowConnection: networkStatus.isSlowConnection,
      connectionType: networkStatus.connectionType,
      downlink: networkStatus.downlink,
      rtt: networkStatus.rtt,
      saveData: networkStatus.saveData,
      wasOffline: networkStatus.wasOffline,
    });
  }, [networkStatus]);

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-lg border bg-background p-3 text-xs shadow-lg">
      <div className="font-semibold mb-2">Network Debug</div>
      <div className="space-y-1 font-mono">
        <div>Online: {networkStatus.isOnline ? '✅' : '❌'}</div>
        <div>Slow: {networkStatus.isSlowConnection ? '⚠️' : '✅'}</div>
        <div>Type: {networkStatus.connectionType}</div>
        {networkStatus.downlink !== undefined && (
          <div>Speed: {networkStatus.downlink.toFixed(2)} Mbps</div>
        )}
        {networkStatus.rtt !== undefined && (
          <div>RTT: {networkStatus.rtt} ms</div>
        )}
        <div>Was Offline: {networkStatus.wasOffline ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}
