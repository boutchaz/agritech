# Spec: Operational modules create journal entries

## Capability

Work records, product applications, harvest records, and metayage settlements must create journal entries via AccountingAutomationService.

## Scenarios

### S1: Work record creation creates a labor cost journal entry

**GIVEN** an organization with account_mappings for cost_type 'labor' and cash 'bank'
**AND** a task linked to a parcel
**WHEN** `completeTask()` creates work records with total_payment > 0
**THEN** a journal_entry is created with reference_type 'cost'
**AND** journal_items debits the labor expense account and credits the cash account
**AND** journal_items include parcel_id from the task's parcel

### S2: Work record creation fails if labor account mapping missing

**GIVEN** an organization with NO account_mappings for cost_type 'labor'
**WHEN** `completeTask()` attempts to create work records
**THEN** the operation throws BadRequestException
**AND** no work record is inserted

### S3: Product application creates a materials cost journal entry

**GIVEN** an organization with account_mappings for cost_type 'materials' and cash 'bank'
**WHEN** `createProductApplication()` is called with cost > 0
**THEN** a journal_entry is created with reference_type 'cost'
**AND** journal_items debits the materials expense account and credits the cash account
**AND** journal_items include parcel_id from the application

### S4: Product application fails if materials account mapping missing

**GIVEN** an organization with NO account_mappings for cost_type 'materials'
**WHEN** `createProductApplication()` is called
**THEN** the operation throws BadRequestException
**AND** no product_application record is inserted

### S5: Harvest record creates a harvest revenue journal entry

**GIVEN** an organization with account_mappings for revenue_type 'harvest' and cash 'bank'
**WHEN** `create()` harvest is called with estimated_revenue > 0
**THEN** a journal_entry is created with reference_type 'revenue'
**AND** journal_items debits the cash account and credits the harvest revenue account
**AND** journal_items include parcel_id from the harvest

### S6: Harvest record fails if harvest account mapping missing

**GIVEN** an organization with NO account_mappings for revenue_type 'harvest'
**WHEN** `create()` harvest is called
**THEN** the operation throws BadRequestException
**AND** no harvest record is inserted

### S7: Metayage settlement creates a revenue journal entry

**GIVEN** an organization with account_mappings for revenue_type 'metayage' and cash 'bank'
**WHEN** `createMetayageSettlement()` is called with amount > 0
**THEN** a journal_entry is created with reference_type 'revenue'
**AND** journal_items debits the cash account and credits the metayage revenue account

### S8: Metayage settlement fails if metayage account mapping missing

**GIVEN** an organization with NO account_mappings for revenue_type 'metayage'
**WHEN** `createMetayageSettlement()` is called
**THEN** the operation throws BadRequestException
**AND** no metayage_settlement record is inserted
