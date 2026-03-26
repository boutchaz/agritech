# Frontend Decomposition — Spec

## Capability

ChatInterface.tsx is decomposed into focused components with no behavior changes.

### Scenario: ChatInterface renders with decomposed components

**GIVEN** the chat page loads  
**WHEN** ChatInterface mounts  
**THEN** it renders ChatHeader, MessageList, VoiceModeToggle, VoiceStatusBar, and ChatInput as separate components  
**AND** no component exceeds 150 lines  

### Scenario: MessageBubble renders user messages

**GIVEN** a message with role "user"  
**WHEN** MessageBubble renders  
**THEN** it shows the message text, user avatar, and timestamp  
**AND** it does NOT show TTS controls  

### Scenario: MessageBubble renders assistant messages with markdown

**GIVEN** a message with role "assistant" containing markdown  
**WHEN** AssistantMessage renders  
**THEN** it renders parsed markdown with deep links  
**AND** it shows TTS play/stop controls  

### Scenario: Streaming message displays live tokens

**GIVEN** a stream is in progress with accumulated content  
**WHEN** StreamingMessage renders  
**THEN** it shows the streamed content with a "Generating..." indicator  

### Scenario: WelcomeState shows when no messages

**GIVEN** no messages exist and history is loaded  
**WHEN** MessageList renders  
**THEN** it shows the WelcomeState with bot icon, welcome text, and suggestion chips  

### Scenario: ChatInput handles send and voice toggle

**GIVEN** the user has typed text  
**WHEN** they click Send or press Enter  
**THEN** the onSend callback fires with the input text  
**AND** the input clears  
