# Backend Decomposition — Spec

## Capability

chat.service.ts is decomposed into focused services with no behavior changes.

### Scenario: ContextBuilder fetches and assembles module data

**GIVEN** an organization ID and a user query  
**WHEN** ContextBuilder.build() is called  
**THEN** it routes to the correct modules via ContextRouter  
**AND** it fetches module data in parallel with caching  
**AND** it returns a BuiltContext object  

### Scenario: ContextRouter determines needed modules from query

**GIVEN** a query string "how many workers do I have?"  
**WHEN** ContextRouter.analyzeQuery() is called  
**THEN** it returns ContextNeeds with worker=true  
**AND** farm=true (always loaded)  

### Scenario: ContextRouter loads all key modules for general queries

**GIVEN** a query string "good morning" or "overview"  
**WHEN** ContextRouter.analyzeQuery() is called  
**THEN** it returns ContextNeeds with accounting, inventory, production, campaigns, compliance, weather, alerts, forecast, and settings all true  

### Scenario: PromptBuilder assembles system and user prompts

**GIVEN** a BuiltContext, query, language, and conversation history  
**WHEN** PromptBuilder.buildUserPrompt() is called  
**THEN** it returns the formatted prompt with language instruction, context sections, and conversation history  

### Scenario: ConversationService manages chat history

**GIVEN** a user ID and organization ID  
**WHEN** ConversationService.saveMessage() is called  
**THEN** the message is persisted to chat_conversations table  
**AND** getRecentHistory() returns the last N messages in chronological order  

### Scenario: ChatService orchestrates without owning logic

**GIVEN** a sendMessage request  
**WHEN** ChatService.sendMessage() executes  
**THEN** it delegates to ConversationService for history  
**AND** it delegates to ContextBuilder for context  
**AND** it delegates to PromptBuilder for prompts  
**AND** it calls ZaiProvider for generation  
**AND** no module-specific DB query exists in ChatService  
