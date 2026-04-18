# Spec: Payment Posting via Account Mappings

## Capability

Payment posting resolves all GL accounts through `account_mappings` instead of hardcoded account codes.

## Scenarios

### GIVEN a Moroccan org with mappings initialized, WHEN posting a received payment, THEN journal entry uses: Dr. cash/bank mapping (5141), Cr. receivable/trade mapping (3420).

### GIVEN a Moroccan org with mappings initialized, WHEN posting a made payment, THEN journal entry uses: Dr. payable/trade mapping (4410), Cr. cash/bank mapping (5141).

### GIVEN an org with NO cash/bank mapping, WHEN posting a payment, THEN a BadRequestException is thrown with descriptive message about missing cash account mapping.
