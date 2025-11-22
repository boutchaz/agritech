# Batch Delete Implementation

## Overview
Implemented batch delete functionality for farms with NestJS backend endpoint and replaced all native `alert()` and `confirm()` with Sonner toast notifications.

## Backend Changes

### 1. New DTO: `BatchDeleteFarmsDto`
**File**: [agritech-api/src/modules/farms/dto/batch-delete-farms.dto.ts](agritech-api/src/modules/farms/dto/batch-delete-farms.dto.ts)

```typescript
export class BatchDeleteFarmsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  farm_ids: string[];
}

export class BatchDeleteResponseDto {
  deleted: number;           // Number of farms successfully deleted
  failed: number;            // Number of farms that failed to delete
  deleted_farms: Array<{ id: string; name: string }>;
  errors: Array<{ id: string; name: string; error: string }>;
  success: boolean;          // True if all deletions succeeded
}
```

### 2. New Service Method: `batchDeleteFarms()`
**File**: [agritech-api/src/modules/farms/farms.service.ts:612-745](agritech-api/src/modules/farms/farms.service.ts#L612-L745)

**Features**:
- ✅ Processes each farm deletion individually
- ✅ Validates permissions for each farm
- ✅ Checks subscription status
- ✅ Returns detailed results (successes and failures)
- ✅ Continues processing even if some farms fail
- ✅ CASCADE deletion handles related data automatically

**Validation per farm**:
1. Farm exists and belongs to an organization
2. User has access to the organization
3. User has required role (system_admin or organization_admin)
4. Organization has valid subscription
5. Farm can be deleted

**Example Response**:
```json
{
  "deleted": 8,
  "failed": 2,
  "deleted_farms": [
    { "id": "uuid1", "name": "Farm A" },
    { "id": "uuid2", "name": "Farm B" }
  ],
  "errors": [
    { "id": "uuid3", "name": "Farm C", "error": "Farm not found" },
    { "id": "uuid4", "name": "Farm D", "error": "Insufficient permissions" }
  ],
  "success": false
}
```

### 3. New Controller Endpoint
**File**: [agritech-api/src/modules/farms/farms.controller.ts:102-127](agritech-api/src/modules/farms/farms.controller.ts#L102-L127)

**Endpoint**: `POST /api/v1/farms/batch-delete`

**Headers**:
- `Authorization: Bearer {JWT_TOKEN}`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "farm_ids": [
    "123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174001"
  ]
}
```

**Authentication**: JWT required
**Authorization**: system_admin or organization_admin role

## Frontend Changes

### 1. Removed Native Alerts
**File**: [project/src/components/FarmHierarchy/ModernFarmHierarchy.tsx](project/src/components/FarmHierarchy/ModernFarmHierarchy.tsx)

**Before** (Line 585):
```typescript
const confirmed = window.confirm(
  t('farmHierarchy.farm.confirmBatchDelete', { count: selectedFarmIds.size })
);
```

**After** (Line 994-1028):
```typescript
<AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
  <AlertDialogContent>
    {/* Proper dialog UI with styling */}
  </AlertDialogContent>
</AlertDialog>
```

### 2. New Batch Delete Implementation

**State Management** (Line 79):
```typescript
const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
```

**Handler Functions**:

**a) Click Handler** (Line 583-586):
```typescript
const handleBatchDeleteClick = () => {
  if (selectedFarmIds.size === 0) return;
  setShowBatchDeleteConfirm(true);
};
```

**b) Confirm Handler** (Line 588-642):
```typescript
const handleBatchDeleteConfirm = async () => {
  // Call new batch delete endpoint
  const response = await fetch(`${apiUrl}/api/v1/farms/batch-delete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      farm_ids: Array.from(selectedFarmIds),
    }),
  });

  const result = await response.json();

  // Show success toast with details
  if (result.deleted > 0) {
    toast.success(
      `${result.deleted} ferme(s) supprimée(s) avec succès${result.failed > 0 ? `. ${result.failed} échec(s)` : ''}`
    );
  }

  // Show individual error toasts
  if (result.errors && result.errors.length > 0) {
    result.errors.forEach((error) => {
      toast.error(`${error.name}: ${error.error}`, { duration: 5000 });
    });
  }
};
```

### 3. Confirmation Dialog UI

**Design**:
- Clean modal dialog (not native confirm)
- Shows count of farms to delete
- Warning message about irreversible action
- Two buttons: Cancel and Confirm
- Uses Kibo UI AlertDialog component

**Example Dialog**:
```
┌────────────────────────────────────────┐
│ 🗑️ Confirmation de suppression groupée │
│                                        │
│ Vous êtes sur le point de supprimer   │
│ 3 fermes.                              │
│                                        │
│ ⚠️ Cette action est irréversible.      │
│ Toutes les données associées seront   │
│ également supprimées.                  │
│                                        │
│        [Annuler]  [Supprimer 3 fermes]│
└────────────────────────────────────────┘
```

## Toast Notifications

All notifications now use **Sonner** toast instead of native alerts:

### Success Cases
```typescript
toast.success(`${result.deleted} ferme(s) supprimée(s) avec succès`);
```

### Partial Success
```typescript
toast.success(`8 ferme(s) supprimée(s) avec succès. 2 échec(s)`);
```

### Individual Errors
```typescript
toast.error(`Farm C: Farm not found`, { duration: 5000 });
toast.error(`Farm D: Insufficient permissions`, { duration: 5000 });
```

### System Errors
```typescript
toast.error('Session non disponible');
toast.error('Erreur lors de la suppression');
```

## User Experience

### Before
1. Click "Supprimer" button
2. See ugly native browser confirm dialog
3. Wait while each farm deletes sequentially
4. See multiple native alerts for errors
5. No clear feedback on which farms succeeded/failed

### After
1. Click "Supprimer" button
2. See beautiful styled confirmation dialog
3. Click "Supprimer X fermes" to confirm
4. Single API call processes all deletions
5. See clear toast notification with summary
6. Individual error toasts for failed deletions (if any)
7. Selection automatically cleared
8. Farm list refreshes automatically

## Benefits

### Performance
- ✅ Single API call instead of N individual calls
- ✅ Reduced network overhead
- ✅ Faster execution for multiple deletions

### User Experience
- ✅ Modern, styled confirmation dialog
- ✅ Clear feedback with toast notifications
- ✅ Progress indication
- ✅ Detailed error reporting
- ✅ Non-blocking notifications

### Code Quality
- ✅ No native browser dialogs
- ✅ Consistent UI/UX
- ✅ Better error handling
- ✅ Proper validation on backend

### Security
- ✅ All validations done server-side
- ✅ Role-based access control per farm
- ✅ Subscription checking
- ✅ JWT authentication required

## Error Handling

### Frontend Errors
- Session not available → Toast error
- Network error → Toast error with message
- API error → Toast error with server message

### Backend Errors (per farm)
- Farm not found → Added to errors array
- No organization access → Added to errors array
- Insufficient permissions → Added to errors array
- Invalid subscription → Added to errors array
- Database error → Added to errors array

### Response Format
Each error includes:
- `id`: Farm UUID
- `name`: Farm name (or "Unknown")
- `error`: Human-readable error message

## Testing Checklist

- [x] Backend endpoint created
- [x] Frontend integrated with new endpoint
- [x] Native alerts removed
- [x] Toast notifications implemented
- [x] Confirmation dialog styled
- [ ] Test with single farm selection
- [ ] Test with multiple farm selections
- [ ] Test with all farms selected
- [ ] Test with permission errors
- [ ] Test with subscription errors
- [ ] Test with network errors
- [ ] Test cancel button
- [ ] Test success toast
- [ ] Test error toasts
- [ ] Verify selection clears after delete
- [ ] Verify list refreshes after delete

## API Documentation

### Endpoint
```
POST /api/v1/farms/batch-delete
```

### Authentication
```
Authorization: Bearer {JWT_TOKEN}
```

### Request
```json
{
  "farm_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### Response (Success)
```json
{
  "deleted": 3,
  "failed": 0,
  "deleted_farms": [
    { "id": "uuid1", "name": "Farm A" },
    { "id": "uuid2", "name": "Farm B" },
    { "id": "uuid3", "name": "Farm C" }
  ],
  "errors": [],
  "success": true
}
```

### Response (Partial Success)
```json
{
  "deleted": 2,
  "failed": 1,
  "deleted_farms": [
    { "id": "uuid1", "name": "Farm A" },
    { "id": "uuid2", "name": "Farm B" }
  ],
  "errors": [
    {
      "id": "uuid3",
      "name": "Farm C",
      "error": "Insufficient permissions"
    }
  ],
  "success": false
}
```

### Error Response (400)
```json
{
  "statusCode": 400,
  "message": ["Each farm ID must be a valid UUID"],
  "error": "Bad Request"
}
```

## Files Changed

### Backend
- ✅ `agritech-api/src/modules/farms/dto/batch-delete-farms.dto.ts` (NEW)
- ✅ `agritech-api/src/modules/farms/farms.service.ts` (MODIFIED)
- ✅ `agritech-api/src/modules/farms/farms.controller.ts` (MODIFIED)

### Frontend
- ✅ `project/src/components/FarmHierarchy/ModernFarmHierarchy.tsx` (MODIFIED)

## Migration Notes

No database migrations required. The batch delete uses existing CASCADE constraints on foreign keys to handle related data deletion.

## Security Considerations

1. ✅ JWT authentication required
2. ✅ Role validation per farm (not just per request)
3. ✅ Subscription checking per farm
4. ✅ Organization access verification per farm
5. ✅ Input validation (UUIDs only)
6. ✅ Rate limiting handled by NestJS guards

## Performance Considerations

- Single database transaction per farm deletion
- CASCADE deletes handle related data automatically
- No need for manual cleanup queries
- Efficient batch processing on backend
- Frontend sends single request

---

**Status**: ✅ Implementation Complete
**Ready for Testing**: Yes
**Breaking Changes**: None
**Deployment**: Backend + Frontend must be deployed together
