# Spec: Invoice Posting via Account Mappings

## Capability

Invoice posting resolves all GL accounts through `account_mappings` instead of hardcoded account codes.

## Scenarios

### GIVEN a Moroccan org with template applied and account mappings initialized, WHEN posting a sales invoice, THEN journal entry is created with: Dr. account from receivable/trade mapping (3420), Cr. per-item account_id or revenue/default mapping, Cr. tax/collected mapping if tax > 0.

### GIVEN a Moroccan org with template applied and account mappings initialized, WHEN posting a purchase invoice, THEN journal entry is created with: Dr. per-item account_id or expense/default mapping, Dr. tax/deductible mapping if tax > 0, Cr. account from payable/trade mapping (4410).

### GIVEN an org with NO account mappings for receivable/trade, WHEN posting a sales invoice, THEN a BadRequestException is thrown with message containing "account mapping missing" and "receivable".

### GIVEN a French org with PCG template applied, WHEN posting a sales invoice, THEN journal entry uses French account codes (411 for AR, not 3420 or 1200).

### GIVEN an invoice item with account_id set, WHEN posting, THEN that item's account_id is used instead of the default revenue/expense mapping.

### GIVEN an invoice item with NO account_id and NO default mapping, WHEN posting, THEN a BadRequestException is thrown with descriptive message.
