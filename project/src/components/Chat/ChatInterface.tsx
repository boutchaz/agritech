import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatHistory, useClearChatHistory, useStreamMessage } from '@/hooks/useChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useZaiTTS } from '@/hooks/useZaiTTS';
import { Bot, Mic, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ChatInput } from './ChatInput';
import { WelcomeState } from './WelcomeState';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { AiQuotaExceededModal, useAiQuotaError } from '@/components/ai/AiQuotaExceededModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const { data: history, isLoading: isLoadingHistory } = useChatHistory();
  const { mutate: clearHistory } = useClearChatHistory();
  const { stream: streamMessage, isStreaming, streamedContent, streamSuggestions, resetStream } = useStreamMessage();
  const isSending = isStreaming;

  const currentLanguage = i18n.language === 'fr' ? 'fr' : i18n.language === 'ar' ? 'ar' : 'en';
  const speechLang = currentLanguage === 'fr' ? 'fr-FR' : currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
  const selectedVoice = useMemo(() => currentLanguage === 'ar' ? 'kazi' : 'jam', [currentLanguage]);

  const browserTTS = useTextToSpeech({ language: speechLang, rate: 0.95, pitch: 1.0, volume: 1.0 });
  const zaiTTS = useZaiTTS({
    language: currentLanguage,
    voice: selectedVoice,
    speed: 0.95,
    onError: () => { if (browserTTS.isSupported) browserTTS.speak(messages[messages.length - 1]?.content || ''); },
  });

  const { quotaError, handleError: handleQuotaError, closeModal: closeQuotaModal } = useAiQuotaError();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);

  const {
    isListening, transcript, interimTranscript, error: voiceError,
    isSupported, startListening, stopListening, resetTranscript,
  } = useVoiceInput({
    language: speechLang,
    continuous: voiceMode,
    onTranscript: (text) => {
      if (voiceMode) setInput(text.trim());
      else setInput((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const streamedContentRef = useRef(streamedContent);
  const lastSentTranscriptRef = useRef('');
  const lastPlayedMessageIdRef = useRef('');

  // Sync history
  useEffect(() => {
    if (history?.messages) {
      const hm = history.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
      setMessages((prev) => {
        if (hm.length === 0) return [];
        if (prev.length > 0) {
          const localOnly = prev.filter((lm) => !hm.some((h) => h.content === lm.content && h.role === lm.role && Math.abs(lm.timestamp.getTime() - h.timestamp.getTime()) < 5000));
          return [...hm, ...localOnly];
        }
        return hm;
      });
    } else if (history && !history.messages?.length) setMessages([]);
  }, [history]);

  // Auto-scroll
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages]);

  // Stop voice when sending
  useEffect(() => { if (isSending && isListening) stopListening(); }, [isSending, isListening, stopListening]);

  // Track streamed content ref
  useEffect(() => { streamedContentRef.current = streamedContent; }, [streamedContent]);

  // Replace placeholder with final content
  useEffect(() => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.content === '__STREAM_COMPLETE__');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], content: streamedContentRef.current, suggestions: streamSuggestions };
      return updated;
    });
  }, [messages.length, streamSuggestions]);

  const handleStreamError = useCallback((messageText: string, error: any) => {
    // Check for quota exceeded error first
    if (handleQuotaError(error)) return;

    const errorMsg = error?.message || 'Failed to send message';
    let errorContent = errorMsg.includes('AI quota exceeded') || errorMsg.includes('AI_QUOTA_EXCEEDED')
      ? "You've reached your AI usage limit for this month."
      : errorMsg.includes('Connection error') || errorMsg.includes('Failed to fetch')
      ? "I'm having trouble connecting to the server."
      : errorMsg.includes('Z.ai API') ? 'The AI service is currently unavailable.'
      : `I encountered an error: ${errorMsg}. Please try again.`;
    setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorContent, timestamp: new Date() }]);
    if (!voiceMode) setInput(messageText);
  }, [voiceMode, handleQuotaError]);

  const proceedWithSend = useCallback((messageText: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date() }]);
    setInput('');
    if (voiceMode) resetTranscript();
    resetStream();

    streamMessage(
      { query: messageText, language: currentLanguage, save_history: true },
      (metadata) => {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: '__STREAM_COMPLETE__', timestamp: new Date(metadata.timestamp), suggestions: metadata.suggestions }]);
        if (voiceMode && !isListening) {
          setTimeout(() => { resetTranscript(); lastSentTranscriptRef.current = ''; startListening(); }, browserTTS.isSpeaking || zaiTTS.isPlaying ? 2000 : 1000);
        }
      },
      (error) => handleStreamError(messageText, error),
    );
  }, [voiceMode, currentLanguage, streamMessage, resetStream, resetTranscript, isListening, startListening, handleStreamError, browserTTS.isSpeaking, zaiTTS.isPlaying]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    if (isListening) stopListening();
    proceedWithSend(trimmed);
  };

  // Voice mode auto-send
  useEffect(() => {
    if (voiceMode && !isListening && transcript.trim() && !isSending) {
      const trimmed = transcript.trim();
      if (trimmed.length > 0 && trimmed !== lastSentTranscriptRef.current) {
        lastSentTranscriptRef.current = trimmed;
        const timer = setTimeout(() => { proceedWithSend(trimmed); resetTranscript(); setInput(''); lastSentTranscriptRef.current = ''; }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [voiceMode, isListening, transcript, isSending, resetTranscript, proceedWithSend]);

  // Voice mode auto-play TTS
  useEffect(() => {
    if (voiceMode && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && last.content && last.id !== lastPlayedMessageIdRef.current) {
        lastPlayedMessageIdRef.current = last.id;
        const timer = setTimeout(() => {
          if (browserTTS.isSupported) browserTTS.speak(last.content);
          else zaiTTS.play(last.content).catch(() => browserTTS.isSupported && browserTTS.speak(last.content));
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [voiceMode, messages, zaiTTS, browserTTS]);

  const handleVoiceModeToggle = () => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    if (newMode) { resetTranscript(); setInput(''); lastSentTranscriptRef.current = ''; lastPlayedMessageIdRef.current = ''; setTimeout(() => startListening(), 100); }
    else { stopListening(); resetTranscript(); browserTTS.stop(); zaiTTS.stop(); lastSentTranscriptRef.current = ''; lastPlayedMessageIdRef.current = ''; }
  };

  const handleClearHistory = () => clearHistory(undefined, {
    onSuccess: () => { setMessages([]); if (isListening) stopListening(); resetTranscript(); },
  });

  // Find last assistant message with suggestions (for follow-ups)
  const lastSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].suggestions?.length) return messages[i].suggestions!;
    }
    return streamSuggestions.length ? streamSuggestions : [];
  }, [messages, streamSuggestions]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5" />
          {t('chat.title', 'AI Assistant')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4 mr-1" />
          {t('chat.clear', 'Clear')}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1 pr-4 min-h-0" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && !isLoadingHistory && (
              <WelcomeState onSend={proceedWithSend} disabled={isSending} />
            )}

            {messages.map((message) =>
              message.role === 'user' ? (
                <UserMessage
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                  avatarUrl={profile?.avatar_url}
                  firstName={profile?.first_name}
                  lastName={profile?.last_name}
                  email={user?.email}
                />
              ) : (
                <AssistantMessage
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                  language={currentLanguage}
                />
              ),
            )}

            {isStreaming && streamedContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                  <div className="text-sm chat-markdown" dangerouslySetInnerHTML={{ __html: streamedContent }} />
                  <div className="flex items-center gap-1 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t('chat.loading.generating', 'Generating...')}</span>
                  </div>
                </div>
              </div>
            )}

            {isSending && !streamedContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground animate-pulse">{t('chat.loading.analyzing', 'Analyzing your question...')}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Follow-up suggestions */}
        {!isStreaming && lastSuggestions.length > 0 && (
          <FollowUpSuggestions suggestions={lastSuggestions} onSend={proceedWithSend} disabled={isSending} />
        )}

        {/* Voice status */}
        {isListening && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1 h-4 bg-primary animate-pulse" />
              <span className="w-1 h-4 bg-primary animate-pulse delay-75" />
              <span className="w-1 h-4 bg-primary animate-pulse delay-150" />
            </div>
            <span>{t('chat.listening', 'Listening...')}</span>
            {interimTranscript && <span className="text-xs italic">"{transcript + interimTranscript}"</span>}
          </div>
        )}

        {/* Voice mode toggle */}
        {isSupported && (
          <div className="flex items-center justify-center gap-2 pb-2">
            <Button size="sm" variant={voiceMode ? 'default' : 'outline'} onClick={handleVoiceModeToggle} disabled={isSending} type="button" className="text-xs">
              <Mic className={`w-4 h-4 mr-2 ${voiceMode ? 'animate-pulse' : ''}`} />
              {voiceMode ? t('chat.voiceModeOn', 'Voice Mode: ON') : t('chat.voiceModeOff', 'Voice Mode: OFF')}
            </Button>
            {voiceMode && <span className="text-xs text-muted-foreground">{t('chat.voiceModeHint', 'Speak naturally, responses will be read aloud')}</span>}
          </div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={isSending}
          voiceMode={voiceMode}
          isListening={isListening}
          isVoiceSupported={isSupported}
          voiceDisplayValue={(transcript + interimTranscript).trim() || input}
          onVoiceToggle={() => isListening ? stopListening() : startListening()}
        />

        {!isSupported && <p className="text-xs text-muted-foreground text-center">{t('chat.voiceNotSupported', 'Voice input is not supported in this browser')}</p>}
        {voiceError && <p className="text-xs text-destructive text-center">{voiceError}</p>}
      </CardContent>

      <AiQuotaExceededModal
        open={quotaError.open}
        onClose={closeQuotaModal}
        limit={quotaError.limit}
        used={quotaError.used}
        resetDate={quotaError.resetDate}
      />
    </Card>
  );
}
