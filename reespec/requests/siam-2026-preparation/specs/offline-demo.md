# Spec: Offline Demo Reliability

## GIVEN the app has been loaded once with network access and the demo org seeded
## WHEN the user goes offline (airplane mode or WiFi disconnected)
## AND the user navigates between dashboard, parcels, satellite, calibration, and recommendations pages
## THEN all pages render with cached data and the `OfflineIndicator` shows offline status

### GIVEN the app is offline and was previously loaded online
### WHEN the user performs a hard reload (Ctrl+Shift+R)
### THEN the app shell loads from the service worker cache and renders the last-viewed page
### AND no full-page error or blank screen appears

### GIVEN the service worker has cached the app shell
### WHEN the `OfflineIndicator` component is visible
### THEN it shows a clear "Offline" badge with the WifiOff icon
