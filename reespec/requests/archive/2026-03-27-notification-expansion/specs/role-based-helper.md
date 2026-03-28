# Spec: Role-Based Notification Helper

## createNotificationsForRoles

### GIVEN an organization with users of different roles
### WHEN createNotificationsForRoles is called with ['organization_admin', 'farm_manager']
### THEN only users with those roles receive notifications AND the actor (excludeUserId) does not

---

### GIVEN an organization where no users match the requested roles
### WHEN createNotificationsForRoles is called
### THEN no notifications are created and no error is thrown

---

### GIVEN an organization_user with a NULL role_id
### WHEN createNotificationsForRoles is called
### THEN that user is silently excluded (no crash)

---

### GIVEN the actor is the only user matching the role filter
### WHEN createNotificationsForRoles is called with excludeUserId = actor
### THEN no notifications are created (empty recipient list)

---

## getUserIdsByRoles (private helper)

### GIVEN organization_users JOIN roles
### WHEN called with orgId and roles=['farm_manager']
### THEN returns user_ids where role.name='farm_manager' AND is_active=true

---

## Role constants

### GIVEN MANAGEMENT_ROLES, OPERATIONAL_ROLES, ADMIN_ONLY_ROLES are defined
### THEN they contain the correct role names as specified in design.md
