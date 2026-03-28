# Follow-Up Suggestions — Spec

## Capability

Every AI response includes 2-3 contextual follow-up suggestions. Users can click them to continue the conversation.

### Scenario: AI response includes follow-up suggestions

**GIVEN** a user sends a message  
**WHEN** the AI response completes  
**THEN** the response includes a `suggestions` array with 2-3 strings  
**AND** suggestions are relevant to the response content  
**AND** suggestions are in the same language as the response  

### Scenario: Follow-ups are stripped from displayed response

**GIVEN** the AI generates a response with `---SUGGESTIONS---` block  
**WHEN** the backend processes the response  
**THEN** the suggestions JSON is parsed and moved to the `suggestions` field  
**AND** the `---SUGGESTIONS---` block is removed from the response text  

### Scenario: Streaming response delivers suggestions at completion

**GIVEN** a streaming response is in progress  
**WHEN** the stream completes  
**THEN** the SSE `done` event includes a `suggestions` array  
**AND** the streamed text does not contain the `---SUGGESTIONS---` block  

### Scenario: FollowUpSuggestions component renders clickable chips

**GIVEN** an assistant message has associated suggestions  
**WHEN** FollowUpSuggestions renders  
**THEN** it shows 2-3 clickable chip buttons  
**AND** clicking a chip sends that text as a new user message  

### Scenario: Follow-up suggestions only show on last assistant message

**GIVEN** a conversation with multiple assistant messages  
**WHEN** the message list renders  
**THEN** only the most recent assistant message shows follow-up chips  

### Scenario: Graceful fallback when AI doesn't produce suggestions

**GIVEN** the AI response doesn't contain a `---SUGGESTIONS---` block  
**WHEN** the backend processes the response  
**THEN** `suggestions` is an empty array  
**AND** the response text is returned unchanged  
**AND** no follow-up chips are shown in the frontend  
