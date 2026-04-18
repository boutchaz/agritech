# Structured Data Cards — Spec

## Capability

AI responses containing structured data render as rich visual cards instead of raw markdown code blocks.

### Scenario: Farm summary renders as a card

**GIVEN** the AI response contains a `json:farm-summary` code block  
**WHEN** AssistantMessage renders  
**THEN** it renders a FarmSummaryCard with farm count, parcel count, and cycle count  
**AND** each stat has an appropriate icon  
**AND** the raw JSON code block is NOT shown  

### Scenario: Stock alert renders as a warning card

**GIVEN** the AI response contains a `json:stock-alert` code block  
**WHEN** AssistantMessage renders  
**THEN** it renders a StockAlertCard with item names, current levels, and minimum levels  
**AND** items below minimum show a warning indicator  

### Scenario: Financial snapshot renders as a card

**GIVEN** the AI response contains a `json:financial-snapshot` code block  
**WHEN** AssistantMessage renders  
**THEN** it renders a FinancialCard with revenue, expenses, and net amounts  
**AND** amounts are formatted with the organization's currency  

### Scenario: Unknown card type falls back to code block

**GIVEN** the AI response contains a `json:unknown-type` code block  
**WHEN** AssistantMessage renders  
**THEN** it renders as a standard formatted code block  
**AND** no error is thrown  

### Scenario: Mixed narrative and cards render correctly

**GIVEN** the AI response contains text, then a card block, then more text  
**WHEN** AssistantMessage renders  
**THEN** all three sections render in order  
**AND** the card is embedded inline between the text sections  

### Scenario: Invalid JSON in card block falls back gracefully

**GIVEN** the AI response contains a `json:farm-summary` block with invalid JSON  
**WHEN** AssistantMessage renders  
**THEN** it renders as a standard code block  
**AND** no error is thrown  
