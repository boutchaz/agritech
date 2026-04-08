# Spec: Mandatory journal entry creation

## Capability

All cost/revenue creation must produce a journal entry. Missing account mappings must fail the operation.

## Scenarios

### S1: createCost fails if account mappings are missing

**GIVEN** an organization with no account_mappings configured for cost_type 'MATERIALS'
**WHEN** `createCost()` is called with cost_type 'MATERIALS'
**THEN** the operation throws BadRequestException
**AND** no cost record is inserted into the costs table

### S2: createCost succeeds and creates journal entry when mappings exist

**GIVEN** an organization with account_mappings for cost_type 'MATERIALS' and cash 'bank'
**WHEN** `createCost()` is called with cost_type 'MATERIALS', amount 500
**THEN** a cost record is inserted
**AND** a journal_entry is created with reference_type 'cost', status 'posted'
**AND** journal_items has a debit of 500 on the expense account and credit of 500 on the cash account

### S3: createRevenue fails if account mappings are missing

**GIVEN** an organization with no account_mappings configured for revenue_type 'HARVEST'
**WHEN** `createRevenue()` is called with revenue_type 'HARVEST'
**THEN** the operation throws BadRequestException
**AND** no revenue record is inserted into the revenues table

### S4: createRevenue succeeds and creates journal entry when mappings exist

**GIVEN** an organization with account_mappings for revenue_type 'HARVEST' and cash 'bank'
**WHEN** `createRevenue()` is called with revenue_type 'HARVEST', amount 1000
**THEN** a revenue record is inserted
**AND** a journal_entry is created with reference_type 'revenue', status 'posted'
**AND** journal_items has a debit of 1000 on the cash account and credit of 1000 on the revenue account
