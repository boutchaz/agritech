import React from 'react';
import { useNetworkStatusContext } from './NetworkStatusProvider';
import { NoConnection } from './NoConnection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, WifiLow } from 'lucide-react';

/**
 * Demo component showing how to use network status in your components
 *
 * USAGE EXAMPLES:
 *
 * 1. Show full-page NoConnection view when offline:
 * ```tsx
 * const MyPage = () => {
 *   const { isOnline } = useNetworkStatusContext();
 *
 *   if (!isOnline) {
 *     return <NoConnection />;
 *   }
 *
 *   return <div>Your page content</div>;
 * };
 * ```
 *
 * 2. Disable features when offline:
 * ```tsx
 * const MyForm = () => {
 *   const { isOnline } = useNetworkStatusContext();
 *
 *   return (
 *     <Button disabled={!isOnline}>
 *       {isOnline ? 'Submit' : 'Offline - Cannot Submit'}
 *     </Button>
 *   );
 * };
 * ```
 *
 * 3. Show warning for slow connections:
 * ```tsx
 * const MyComponent = () => {
 *   const { isSlowConnection, connectionType } = useNetworkStatusContext();
 *
 *   return (
 *     <>
 *       {isSlowConnection && (
 *         <Alert>
 *           Slow connection detected ({connectionType}).
 *           Features may load slower than usual.
 *         </Alert>
 *       )}
 *       <YourContent />
 *     </>
 *   );
 * };
 * ```
 */
export function NetworkStatusDemo() {
  const {
    isOnline,
    isSlowConnection,
    connectionType,
    downlink,
    rtt,
    saveData,
    checkConnectivity,
  } = useNetworkStatusContext();

  const [isChecking, setIsChecking] = React.useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkConnectivity();
    setIsChecking(false);
  };

  // Example: Show NoConnection view when offline
  if (!isOnline) {
    return <NoConnection showTroubleshootingTips={true} />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Network Status Demo</h1>
        <p className="text-muted-foreground mt-2">
          This page demonstrates how to use network status detection in your components.
        </p>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              isSlowConnection ? (
                <WifiLow className="h-5 w-5 text-warning" />
              ) : (
                <Wifi className="h-5 w-5 text-success" />
              )
            ) : (
              <WifiOff className="h-5 w-5 text-destructive" />
            )}
            Current Network Status
          </CardTitle>
          <CardDescription>Real-time network connection information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Connection Type</p>
              <Badge variant="outline">{connectionType || 'Unknown'}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Speed</p>
              <Badge variant={isSlowConnection ? 'destructive' : 'default'}>
                {isSlowConnection ? 'Slow' : 'Normal'}
              </Badge>
            </div>
            {downlink !== undefined && (
              <div>
                <p className="text-sm font-medium">Downlink</p>
                <p className="text-sm text-muted-foreground">{downlink.toFixed(2)} Mbps</p>
              </div>
            )}
            {rtt !== undefined && (
              <div>
                <p className="text-sm font-medium">Round Trip Time</p>
                <p className="text-sm text-muted-foreground">{rtt} ms</p>
              </div>
            )}
            {saveData !== undefined && (
              <div>
                <p className="text-sm font-medium">Data Saver</p>
                <Badge variant={saveData ? 'secondary' : 'outline'}>
                  {saveData ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button onClick={handleManualCheck} disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Manual Connectivity Check'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples Card */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Examples</CardTitle>
          <CardDescription>How to use network status in your components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Full-Page Offline View</h3>
            <p className="text-sm text-muted-foreground mb-2">
              This page demonstrates the full-page offline view. Try disconnecting your internet
              to see it in action.
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
              {`const MyPage = () => {
  const { isOnline } = useNetworkStatusContext();

  if (!isOnline) {
    return <NoConnection />;
  }

  return <div>Your page content</div>;
};`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Conditional Feature Rendering</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Disable buttons or features when offline:
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
              {`const MyForm = () => {
  const { isOnline } = useNetworkStatusContext();

  return (
    <Button disabled={!isOnline}>
      {isOnline ? 'Submit' : 'Offline'}
    </Button>
  );
};`}
            </pre>
            <div className="mt-2">
              <Button disabled={!isOnline}>
                {isOnline ? 'Example Submit Button' : 'Offline - Cannot Submit'}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Slow Connection Warning</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Show warnings for slow connections:
            </p>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
              {`const { isSlowConnection, connectionType } = useNetworkStatusContext();

{isSlowConnection && (
  <Alert>
    Slow connection ({connectionType})
  </Alert>
)}`}
            </pre>
            {isSlowConnection && (
              <div className="mt-2 p-3 bg-warning/10 border border-warning rounded-md text-sm">
                <strong>Warning:</strong> Slow connection detected ({connectionType}). Features
                may load slower than usual.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Testing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Network Detection</CardTitle>
          <CardDescription>How to test offline functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-semibold">Chrome DevTools:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Open DevTools (F12)</li>
            <li>Go to Network tab</li>
            <li>Select "Offline" from the throttling dropdown</li>
            <li>See the NoConnection view appear automatically</li>
          </ol>

          <p className="font-semibold pt-4">Firefox:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Open DevTools (F12)</li>
            <li>Go to Network tab</li>
            <li>Click "Network Settings" (gear icon)</li>
            <li>Check "Offline"</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
