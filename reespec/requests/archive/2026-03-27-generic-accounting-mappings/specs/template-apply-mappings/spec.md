# Spec: Template Apply Initializes Account Mappings

## Capability

When an org applies a country chart of accounts template, org-level account mappings are created with resolved `account_id`s.

## Scenarios

### GIVEN an org with no account mappings, WHEN applying the MA template, THEN org-level account_mappings rows are created for all MA/PCEC global templates, with account_id resolved from org's accounts by matching account_code.

### GIVEN an org that already has account mappings, WHEN applying a template, THEN existing mappings are NOT overwritten (idempotent).

### GIVEN a global mapping with account_code '3420' and an org that has account code '3420', WHEN initializing mappings, THEN the org mapping's account_id points to that org's account with code '3420'.

### GIVEN a global mapping with account_code that doesn't exist in the org's chart, WHEN initializing mappings, THEN the org mapping is created with account_id = null (to be configured manually in settings).
