# Context Summarization — Spec

## Capability

Module data is summarized into concise, AI-readable text before prompt injection, reducing token waste and improving response quality.

### Scenario: Farm context is summarized concisely

**GIVEN** farm context with 5 farms, 20 parcels, and 8 crop cycles  
**WHEN** ContextSummarizer.summarizeFarms() is called  
**THEN** the output is a compact string like "5 farms: Meknes (300ha, olive), Fes (150ha, citrus), +3 more. 20 parcels, 8 crop cycles (5 active)."  
**AND** UUIDs are stripped  
**AND** the output is under 200 tokens  

### Scenario: Empty module context produces minimal output

**GIVEN** farm context with 0 farms  
**WHEN** ContextSummarizer.summarizeFarms() is called  
**THEN** the output is "No farms registered."  

### Scenario: Inventory context highlights low-stock items

**GIVEN** inventory context with 3 low-stock items out of 50 total  
**WHEN** ContextSummarizer.summarizeInventory() is called  
**THEN** low-stock items are listed by name with current vs minimum levels  
**AND** non-critical items are summarized as a count only  

### Scenario: Full context summarization reduces total prompt size

**GIVEN** a BuiltContext with all modules populated  
**WHEN** ContextSummarizer.summarizeAll() is called  
**THEN** the total summarized context is at least 40% smaller than the raw dump  
**AND** all key counts and recent items are preserved  
