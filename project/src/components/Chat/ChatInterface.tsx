import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useChatHistory, useClearChatHistory, useStreamMessage } from '@/hooks/useChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useZaiTTS } from '@/hooks/useZaiTTS';
import { Bot, Mic, Loader2, Trash2, ChevronDown } from 'lucide-react';
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
  image?: string;
}

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
  } = useChatHistory();
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
  const [selectedImage, setSelectedImage] = useState<string | undefined>();
  const [voiceMode, setVoiceMode] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamedContentRef = useRef(streamedContent);
  const lastSentTranscriptRef = useRef('');
  const lastPlayedMessageIdRef = useRef('');
  const isLoadingOlderRef = useRef(false);
  const initialScrollDoneRef = useRef(false);

  // Helper: get the scrollable viewport element
  const getViewport = useCallback((): HTMLElement | null => {
    return scrollContainerRef.current;
  }, []);

  // Helper: scroll to bottom
  const scrollToBottom = useCallback((_behavior: ScrollBehavior = 'auto') => {
    const el = getViewport();
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [getViewport]);

  // Helper: check if user is near bottom
  const isNearBottom = useCallback(() => {
    const el = getViewport();
    if (!el) return true;
    const threshold = 100;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, [getViewport]);

  // Sync history from infinite query pages → messages
  useEffect(() => {
    if (!historyData?.pages) return;
    // Flatten all pages (oldest first) — pages are stored in reverse order by TanStack
    const allMessages: ChatMessage[] = [];
    // Pages: index 0 = latest page, previous pages are prepended
    // We need to combine them in chronological order
    const pages = [...historyData.pages].reverse();
      for (const page of pages) {
        for (const m of page.messages) {
          allMessages.push({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.timestamp),
            suggestions: m.suggestions,
          });
        }
      }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync server history into local state
      setMessages((prev) => {
        const withImages = allMessages.map((historyMessage) => {
          const matchingLocalImage = prev.find((localMessage) =>
            localMessage.role === 'user' &&
            !!localMessage.image &&
            localMessage.content === historyMessage.content &&
            Math.abs(localMessage.timestamp.getTime() - historyMessage.timestamp.getTime()) < 5000,
          )?.image;

          return matchingLocalImage ? { ...historyMessage, image: matchingLocalImage } : historyMessage;
        });

        // Keep local-only messages (sent but not yet in server history)
        const localOnly = prev.filter((lm) =>
          !withImages.some((h) =>
            h.content === lm.content && h.role === lm.role &&
            Math.abs(lm.timestamp.getTime() - h.timestamp.getTime()) < 5000
          )
        );
        return [...withImages, ...localOnly];
      });
  }, [historyData]);

  // Initial scroll to bottom once history loads
  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      // Double RAF to ensure DOM has rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
    }
  }, [isLoadingHistory, messages.length, scrollToBottom]);

  // Reset initial scroll flag when history is cleared
  useEffect(() => {
    if (messages.length === 0) {
      initialScrollDoneRef.current = false;
    }
  }, [messages.length]);

  // Auto-scroll on new messages / streaming (only if user is near bottom)
  useEffect(() => {
    void messages.length;
    void streamedContent;
    if (shouldAutoScroll) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages.length, streamedContent, shouldAutoScroll, scrollToBottom]);

  // Scroll event handler: detect scroll-to-top for loading older + track position
  useEffect(() => {
    const el = getViewport();
    if (!el) return;

    const handleScroll = () => {
      // Show/hide "scroll to bottom" button
      const nearBottom = isNearBottom();
      setShowScrollToBottom(!nearBottom);
      setShouldAutoScroll(nearBottom);

      // Load older messages when scrolled near top
      if (
        el.scrollTop < 80 &&
        hasPreviousPage &&
        !isFetchingPreviousPage &&
        !isLoadingOlderRef.current
      ) {
        isLoadingOlderRef.current = true;
        const prevScrollHeight = el.scrollHeight;

        fetchPreviousPage().then(() => {
          // Preserve scroll position after prepending older messages
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight;
            el.scrollTop = newScrollHeight - prevScrollHeight;
            isLoadingOlderRef.current = false;
          });
        }).catch(() => {
          isLoadingOlderRef.current = false;
        });
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [getViewport, isNearBottom, hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage]);

  // Stop voice when sending
  useEffect(() => { if (isSending && isListening) stopListening(); }, [isSending, isListening, stopListening]);

  // Track streamed content ref
  useEffect(() => { streamedContentRef.current = streamedContent; }, [streamedContent]);

  // Replace placeholder with final content
  useEffect(() => {
    void messages.length;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.content === '__STREAM_COMPLETE__');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], content: streamedContentRef.current, suggestions: streamSuggestions };
      return updated;
    });
  }, [messages.length, streamSuggestions]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- setMessages is a stable React setter
  const handleStreamError = useCallback((messageText: string, error: unknown) => {
    if (handleQuotaError(error)) return;

    const errorMsg = (error as Error)?.message || 'Failed to send message';
    const errorContent = errorMsg.includes('AI quota exceeded') || errorMsg.includes('AI_QUOTA_EXCEEDED')
      ? "You've reached your AI usage limit for this month."
      : errorMsg.includes('Connection error') || errorMsg.includes('Failed to fetch')
      ? "I'm having trouble connecting to the server."
      : errorMsg.includes('Z.ai API') ? 'The AI service is currently unavailable.'
      : `I encountered an error: ${errorMsg}. Please try again.`;
    setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorContent, timestamp: new Date() }]);
    if (!voiceMode) setInput(messageText);
  }, [voiceMode, handleQuotaError]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- setMessages/setInput/setShouldAutoScroll are stable React setters
  const proceedWithSend = useCallback((messageText: string, image?: string) => {
    // Always auto-scroll when user sends a message
    setShouldAutoScroll(true);
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: messageText, timestamp: new Date(), image }]);
    setInput('');
    setSelectedImage(undefined);
    if (voiceMode) resetTranscript();
    resetStream();

    streamMessage(
      { query: messageText, language: currentLanguage, save_history: true, image },
      (metadata) => {
        const typedMetadata = metadata as {
          timestamp: string;
          suggestions?: string[];
          /** Server-normalized markdown + card blocks (avoids showing raw model JSON in the bubble) */
          cleanText?: string;
        };
        const assistantContent =
          typeof typedMetadata.cleanText === 'string' ? typedMetadata.cleanText : '__STREAM_COMPLETE__';
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date(typedMetadata.timestamp),
            suggestions: typedMetadata.suggestions,
          },
        ]);
        if (voiceMode && !isListening) {
          setTimeout(() => { resetTranscript(); lastSentTranscriptRef.current = ''; startListening(); }, browserTTS.isSpeaking || zaiTTS.isPlaying ? 2000 : 1000);
        }
      },
      (error) => handleStreamError(messageText, error),
    );
  }, [voiceMode, currentLanguage, streamMessage, resetStream, resetTranscript, isListening, startListening, handleStreamError, browserTTS.isSpeaking, zaiTTS.isPlaying]);

  const handleSend = () => {
    const trimmed = input.trim();
    if ((!trimmed && !selectedImage) || isSending) return;
    if (isListening) stopListening();
    proceedWithSend(trimmed || t('chat.analyzingImage', 'Analyzing image...'), selectedImage);
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

  const handleScrollToBottom = () => {
    setShouldAutoScroll(true);
    scrollToBottom('smooth');
  };

  // Find last assistant message with suggestions (for follow-ups)
  const lastSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].suggestions?.length) return messages[i].suggestions!;
    }
    return streamSuggestions.length ? streamSuggestions : [];
  }, [messages, streamSuggestions]);

  return (
    /* overflow-y visible: overflow-hidden clips the composer when the flex chain is loose on tablet */
    <Card className="flex h-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-visible">
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

      {/* min-h-0 is required: default min-height:auto would size this to all messages + composer,
          preventing shrink so the scroll region eats the viewport and hides the input */}
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
        {/* Scrollable chat area — native div instead of ScrollArea for reliable scroll control */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto pr-2 scroll-smooth"
          >
            <div className="space-y-4 py-2">
              {/* Loading older messages indicator */}
              {isFetchingPreviousPage && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                  <span className="text-xs text-muted-foreground">
                    {t('chat.loadingOlder', 'Loading older messages...')}
                  </span>
                </div>
              )}

              {/* "Load more" indicator when there are older messages */}
              {hasPreviousPage && !isFetchingPreviousPage && (
                <div className="flex items-center justify-center py-2">
                  <span className="text-xs text-muted-foreground">
                    {t('chat.scrollForMore', '↑ Scroll up to load older messages')}
                  </span>
                </div>
              )}

              {messages.length === 0 && !isLoadingHistory && (
                <WelcomeState onSend={proceedWithSend} disabled={isSending} />
              )}

              {isLoadingHistory && messages.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {messages.map((message) =>
                message.role === 'user' ? (
                    <UserMessage
                      key={message.id}
                      content={message.content}
                      timestamp={message.timestamp}
                      image={message.image}
                      avatarUrl={profile?.avatar_url ?? undefined}
                      firstName={profile?.first_name ?? undefined}
                      lastName={profile?.last_name ?? undefined}
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
                <div className="space-y-2">
                  <AssistantMessage
                    content={streamedContent}
                    timestamp={new Date()}
                    language={currentLanguage}
                  />
                  <div className="flex gap-3 justify-start pl-11">
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{selectedImage ? t('chat.analyzingImage', 'Analyzing image...') : t('chat.loading.generating', 'Generating...')}</span>
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
                    <span className="text-sm text-muted-foreground animate-pulse">{selectedImage ? t('chat.analyzingImage', 'Analyzing image...') : t('chat.loading.analyzing', 'Analyzing your question...')}</span>
                  </div>
                </div>
              )}

              {/* Invisible anchor at the bottom */}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Scroll to bottom FAB */}
          {showScrollToBottom && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-2 right-4 rounded-full shadow-lg z-10 h-8 w-8"
              onClick={handleScrollToBottom}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="sticky bottom-0 z-20 flex shrink-0 flex-col gap-4 border-t border-border/40 bg-card pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-6px_20px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_-6px_20px_-6px_rgba(0,0,0,0.35)]">
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
          image={selectedImage}
          onImageChange={setSelectedImage}
          isLoading={isSending}
          voiceMode={voiceMode}
          isListening={isListening}
          isVoiceSupported={isSupported}
          voiceDisplayValue={(transcript + interimTranscript).trim() || input}
          onVoiceToggle={() => isListening ? stopListening() : startListening()}
        />

        {!isSupported && <p className="text-xs text-muted-foreground text-center">{t('chat.voiceNotSupported', 'Voice input is not supported in this browser')}</p>}
        {voiceError && <p className="text-xs text-destructive text-center">{voiceError}</p>}
        </div>
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
