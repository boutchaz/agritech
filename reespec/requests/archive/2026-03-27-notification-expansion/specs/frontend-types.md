# Spec: Frontend Notification Type Support

### GIVEN a notification with any of the 15 new types arrives
### WHEN it is rendered in NotificationItem
### THEN it displays with the correct icon, color scheme, and priority indicator (not the generic fallback)

### GIVEN a user opens the notification filters
### WHEN they look at the type filter list
### THEN all 15 new types appear as filter options with correct labels and icons

### GIVEN a notification with type=ai_recommendation_created arrives in NotificationBell
### WHEN getTypeIcon and getTypeStyle are called
### THEN they return '🤖' and emerald color scheme (not the generic fallback)

### GIVEN the NotificationTypeFilter union type
### WHEN a developer uses a new notification type string
### THEN TypeScript correctly recognizes it as a valid filter value
