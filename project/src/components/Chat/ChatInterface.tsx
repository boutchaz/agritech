import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatHistory, useClearChatHistory, useStreamMessage } from '@/hooks/useChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useZaiTTS } from '@/hooks/useZaiTTS';
import {
  Send, Mic, MicOff, Loader2, Trash2, Bot, Volume2, VolumeX,
  LayoutDashboard, AlertTriangle, Cloud, DollarSign, CheckSquare, Wheat,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import UserAvatar from '@/components/ui/UserAvatar';
import { marked } from 'marked';

// Configure marked for chat
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Suggestion chips for empty state
const SUGGESTION_CHIPS = [
  { key: 'chat.suggestions.overview', icon: LayoutDashboard, defaultText: 'Farm overview' },
  { key: 'chat.suggestions.lowStock', icon: AlertTriangle, defaultText: 'Low stock alerts' },
  { key: 'chat.suggestions.weather', icon: Cloud, defaultText: 'Weather forecast' },
  { key: 'chat.suggestions.financial', icon: DollarSign, defaultText: 'Financial summary' },
  { key: 'chat.suggestions.tasks', icon: CheckSquare, defaultText: 'Worker tasks today' },
  { key: 'chat.suggestions.harvests', icon: Wheat, defaultText: 'Upcoming harvests' },
];

// Deep link mapping: module keywords → routes
const DEEP_LINK_MAP: Record<string, string> = {
  'farm management': '/farms',
  'gestion des fermes': '/farms',
  'gestion de ferme': '/farms',
  'إدارة المزارع': '/farms',
  'parcels': '/parcels',
  'parcelles': '/parcels',
  'قطع الأرض': '/parcels',
  'inventory': '/stock',
  'stock': '/stock',
  'inventaire': '/stock',
  'المخزون': '/stock',
  'workers': '/workers',
  'travailleurs': '/workers',
  'العمال': '/workers',
  'tasks': '/tasks',
  'tâches': '/tasks',
  'المهام': '/tasks',
  'accounting': '/accounting',
  'comptabilité': '/accounting',
  'المحاسبة': '/accounting',
  'invoices': '/accounting',
  'factures': '/accounting',
  'الفواتير': '/accounting',
  'settings': '/settings',
  'paramètres': '/settings',
  'الإعدادات': '/settings',
  'dashboard': '/dashboard',
  'tableau de bord': '/dashboard',
  'لوحة القيادة': '/dashboard',
  'campaigns': '/campaigns',
  'campagnes': '/campaigns',
  'الحملات': '/campaigns',
  'marketplace': '/marketplace',
  'marché': '/marketplace',
  'السوق': '/marketplace',
  'compliance': '/compliance',
  'conformité': '/compliance',
  'الامتثال': '/compliance',
  'crop cycles': '/crop-cycles',
  'cycles de culture': '/crop-cycles',
  'دورات المحاصيل': '/crop-cycles',
};

// Add deep links to rendered HTML
function addDeepLinks(html: string): string {
  let result = html;
  for (const [keyword, route] of Object.entries(DEEP_LINK_MAP)) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!["/\\w>])\\b(${escaped})\\b(?![</\\w"])`, 'gi');
    result = result.replace(
      regex,
      `<a href="#" data-route="${route}" class="text-primary underline cursor-pointer hover:text-primary/80 font-medium">$1</a>`,
    );
  }
  return result;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { data: history, isLoading: isLoadingHistory } = useChatHistory();
  const { mutate: clearHistory } = useClearChatHistory();
  const { stream: streamMessage, isStreaming, streamedContent, resetStream } = useStreamMessage();
  const isSending = isStreaming;
  
  // Get current language, defaulting to 'en' if not 'fr' or 'ar'
  const currentLanguage = i18n.language === 'fr' ? 'fr' : i18n.language === 'ar' ? 'ar' : 'en';
  
  // Map language to Web Speech API language codes
  const getSpeechRecognitionLanguage = (lang: string): string => {
    switch (lang) {
      case 'fr':
        return 'fr-FR';
      case 'ar':
        return 'ar-SA';
      case 'en':
      default:
        return 'en-US';
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false); // Live voice chat mode

  // Select best voice for language (Z.ai voices: tongtong, xiaochen, chuichui, jam, kazi, douji, luodo)
  // jam and kazi tend to sound more natural for multilingual content
  const selectedVoice = useMemo(() => {
    // Use more natural-sounding voices
    if (currentLanguage === 'ar') return 'kazi'; // Better for Arabic
    if (currentLanguage === 'fr') return 'jam'; // Better for French
    return 'jam'; // Default to jam for English and others (more natural)
  }, [currentLanguage]);

  // Browser TTS (primary for better quality in some languages)
  const browserTTS = useTextToSpeech({
    language: currentLanguage === 'fr' ? 'fr-FR' : currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
    rate: 0.95, // Slightly slower for more natural speech
    pitch: 1.0,
    volume: 1.0,
  });

  // Z.ai TTS (fallback if browser TTS not available or for specific use cases)
  const zaiTTS = useZaiTTS({
    language: currentLanguage,
    voice: selectedVoice,
    speed: 0.95, // Slightly slower for more natural speech
    onError: (error) => {
      console.error('Z.ai TTS error:', error);
      // Fallback to browser TTS on error
      if (browserTTS.isSupported) {
        browserTTS.speak(messages[messages.length - 1]?.content || '');
      }
    },
  });

  const {
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    language: getSpeechRecognitionLanguage(currentLanguage),
    continuous: voiceMode, // Continuous listening in voice mode
    onTranscript: (text) => {
      if (voiceMode) {
        // In voice mode, replace input with current transcript
        setInput(text.trim());
      } else {
        // In manual mode, append to existing input
        setInput((prev) => {
          const trimmed = text.trim();
          return prev ? `${prev} ${trimmed}` : trimmed;
        });
      }
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (history?.messages) {
      const historyMessages = history.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
      
      // Merge with local messages to avoid losing optimistic updates
      setMessages((prev) => {
        // If history is empty (after clear), always clear local messages too
        if (historyMessages.length === 0) {
          return [];
        }
        
        // If we have local messages that aren't in history yet (optimistic updates),
        // keep them and merge with history
        if (prev.length > 0 && historyMessages.length > 0) {
          // Match by content and approximate timestamp (within 5 seconds) since IDs differ
          const localMessagesNotInHistory = prev.filter((localMsg) => {
            const isInHistory = historyMessages.some((h) => {
              const timeDiff = Math.abs(
                localMsg.timestamp.getTime() - h.timestamp.getTime()
              );
              return (
                h.content === localMsg.content &&
                h.role === localMsg.role &&
                timeDiff < 5000 // Within 5 seconds
              );
            });
            return !isInHistory;
          });
          // Combine history with any local messages that haven't been saved yet
          return [...historyMessages, ...localMessagesNotInHistory];
        }
        // If history has messages, use them
        return historyMessages;
      });
    } else if (history && (!history.messages || history.messages.length === 0)) {
      // Explicitly handle empty history response (after clear or initial load)
      setMessages([]);
    }
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Stop voice input when sending
  useEffect(() => {
    if (isSending && isListening) {
      stopListening();
    }
  }, [isSending, isListening, stopListening]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isSending) {
      return;
    }

    // Stop voice input if it's active
    if (isListening) {
      stopListening();
    }

    proceedWithSend(trimmedInput);
  };

  const handleStreamError = useCallback((messageText: string, error: any) => {
    console.error('Chat error:', error);
    const errorMsg = error?.message || 'Failed to send message';
    let errorContent = '';

    if (errorMsg.includes('Connection error') || errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      errorContent = `I'm having trouble connecting to the server. Please check your internet connection and try again.`;
    } else if (errorMsg.includes('Z.ai API') || errorMsg.includes('API key')) {
      errorContent = `The AI service is currently unavailable. Please contact support if this problem persists.`;
    } else if (errorMsg.includes('Organization ID')) {
      errorContent = `There's an issue with your organization settings. Please refresh the page and try again.`;
    } else {
      errorContent = `I encountered an error: ${errorMsg}. Please try again.`;
    }

    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: errorContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
    if (!voiceMode) setInput(messageText);
    if (voiceMode && !isListening) {
      setTimeout(() => {
        resetTranscript();
        lastSentTranscriptRef.current = '';
        startListening();
      }, 1000);
    }
  }, [voiceMode, isListening, resetTranscript, startListening]);

  const proceedWithSend = useCallback((messageText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (voiceMode) {
      resetTranscript();
    }

    resetStream();

    // Use streaming
    streamMessage(
      { query: messageText, language: currentLanguage, save_history: true },
      (metadata) => {
        // On complete: finalize the streamed message with the full content
        // We need to capture the content at completion time via a ref approach
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: '__STREAM_COMPLETE__',
            timestamp: new Date(metadata.timestamp),
          },
        ]);
        // In voice mode, restart listening
        if (voiceMode && !isListening) {
          const restartDelay = browserTTS.isSpeaking || zaiTTS.isPlaying ? 2000 : 1000;
          setTimeout(() => {
            resetTranscript();
            lastSentTranscriptRef.current = '';
            startListening();
          }, restartDelay);
        }
      },
      (error) => {
        handleStreamError(messageText, error);
      },
    );
  }, [voiceMode, currentLanguage, streamMessage, resetStream, resetTranscript, isListening, startListening, handleStreamError, browserTTS.isSpeaking, zaiTTS.isPlaying]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleVoiceModeToggle = () => {
    const newVoiceMode = !voiceMode;
    setVoiceMode(newVoiceMode);
    
    if (newVoiceMode) {
      // Enable voice mode: start listening automatically
      resetTranscript();
      setInput('');
      lastSentTranscriptRef.current = '';
      lastPlayedMessageIdRef.current = '';
      // Small delay to ensure state is reset
      setTimeout(() => {
        startListening();
      }, 100);
    } else {
      // Disable voice mode: stop listening and TTS
      stopListening();
      resetTranscript();
      browserTTS.stop();
      zaiTTS.stop();
      lastSentTranscriptRef.current = '';
      lastPlayedMessageIdRef.current = '';
    }
  };

  // Track streamed content in a ref for completion callback
  const streamedContentRef = useRef(streamedContent);
  useEffect(() => {
    streamedContentRef.current = streamedContent;
  }, [streamedContent]);

  // Replace placeholder with actual streamed content when stream completes
  useEffect(() => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.content === '__STREAM_COMPLETE__');
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], content: streamedContentRef.current };
      return updated;
    });
  }, [messages.length]);  

  // Track last sent transcript to avoid duplicate sends
  const lastSentTranscriptRef = useRef<string>('');

  // Auto-send in voice mode when speech ends and we have text
  useEffect(() => {
    if (voiceMode && !isListening && transcript.trim() && !isSending) {
      const trimmedTranscript = transcript.trim();
      // Only send if we have text and it's different from what we last sent
      if (trimmedTranscript.length > 0 && trimmedTranscript !== lastSentTranscriptRef.current) {
        lastSentTranscriptRef.current = trimmedTranscript;
        // Small delay to ensure speech recognition is fully complete
        const sendTimer = setTimeout(() => {
          proceedWithSend(trimmedTranscript);
          resetTranscript();
          setInput('');
          lastSentTranscriptRef.current = '';
        }, 500);
        return () => clearTimeout(sendTimer);
      }
    }
     
  }, [voiceMode, isListening, transcript, isSending, resetTranscript, proceedWithSend]);

  // Track last played message to avoid replaying
  const lastPlayedMessageIdRef = useRef<string>('');

  // Auto-play AI response in voice mode
  useEffect(() => {
    if (voiceMode && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === 'assistant' &&
        lastMessage.content &&
        lastMessage.id !== lastPlayedMessageIdRef.current
      ) {
        lastPlayedMessageIdRef.current = lastMessage.id;
        // Auto-play the AI response with TTS
        const playResponse = async () => {
          try {
            // Prefer browser TTS for better quality, fallback to Z.ai
            if (browserTTS.isSupported) {
              browserTTS.speak(lastMessage.content);
            } else {
              await zaiTTS.play(lastMessage.content);
            }
          } catch (error) {
            console.error('TTS error:', error);
            // Final fallback to browser TTS if Z.ai fails
            if (browserTTS.isSupported) {
              browserTTS.speak(lastMessage.content);
            }
          }
        };
        // Small delay to ensure message is fully rendered
        const timer = setTimeout(playResponse, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [voiceMode, messages, zaiTTS, browserTTS]);

  const handleClearHistory = () => {
    clearHistory(undefined, {
      onSuccess: () => {
        // Clear local messages only after backend confirms deletion
        setMessages([]);
        // Reset voice input transcript if active
        if (isListening) {
          stopListening();
        }
        resetTranscript();
      },
      onError: (error) => {
        console.error('Failed to clear chat history:', error);
        // Optionally show error toast here
      },
    });
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-3 flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="w-5 h-5" />
          {t('chat.title', 'AI Assistant')}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearHistory}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('chat.clear', 'Clear')}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 p-4 pt-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4 min-h-0" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && !isLoadingHistory && (
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <Bot className="w-12 h-12 opacity-50" />
                <p className="text-muted-foreground text-center">
                  {t(
                    'chat.welcome',
                    "Hello! I'm your AgriTech assistant. How can I help you today?",
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <Button
                      key={chip.key}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 h-auto py-2.5 px-3 text-left"
                      onClick={() => proceedWithSend(t(chip.key, chip.defaultText))}
                      disabled={isSending}
                    >
                      <chip.icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className="text-xs">{t(chip.key, chip.defaultText)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {message.role === 'assistant' ? (
                        <div
                          className="text-sm chat-markdown"
                          dangerouslySetInnerHTML={{
                            __html: addDeepLinks(marked.parse(message.content) as string),
                          }}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            const route = target.getAttribute('data-route');
                            if (route) {
                              e.preventDefault();
                              navigate({ to: route });
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(zaiTTS.isGenerating || zaiTTS.isPlaying || browserTTS.isSpeaking) && (
                          <button
                            onClick={() => {
                              zaiTTS.stop();
                              browserTTS.stop();
                            }}
                            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
                            title={t('chat.stopAudio', 'Stop audio')}
                          >
                            <VolumeX className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                        {!zaiTTS.isGenerating && !zaiTTS.isPlaying && !browserTTS.isSpeaking && (
                          <button
                            onClick={async () => {
                              try {
                                // Prefer browser TTS for better quality, fallback to Z.ai
                                if (browserTTS.isSupported) {
                                  browserTTS.speak(message.content);
                                } else {
                                  await zaiTTS.play(message.content);
                                }
                              } catch (error) {
                                console.error('TTS error:', error);
                                // Final fallback
                                if (browserTTS.isSupported) {
                                  browserTTS.speak(message.content);
                                }
                              }
                            }}
                            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
                            title={t('chat.playAudio', 'Play audio')}
                          >
                            <Volume2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                        {(zaiTTS.isGenerating || browserTTS.isSpeaking) && (
                          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {message.role === 'user' && (
                  <UserAvatar
                    src={profile?.avatar_url}
                    firstName={profile?.first_name}
                    lastName={profile?.last_name}
                    email={user?.email}
                    size="sm"
                  />
                )}
              </div>
            ))}

            {isStreaming && streamedContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                  <div
                    className="text-sm chat-markdown"
                    dangerouslySetInnerHTML={{
                      __html: addDeepLinks(marked.parse(streamedContent) as string),
                    }}
                  />
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
                  <span className="text-sm text-muted-foreground animate-pulse">
                    {t('chat.loading.analyzing', 'Analyzing your question...')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Voice Status */}
        {isListening && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded px-3 py-2">
            <div className="flex gap-1">
              <span className="w-1 h-4 bg-primary animate-pulse" />
              <span className="w-1 h-4 bg-primary animate-pulse delay-75" />
              <span className="w-1 h-4 bg-primary animate-pulse delay-150" />
            </div>
            <span>{t('chat.listening', 'Listening...')}</span>
            {interimTranscript && (
              <span className="text-xs italic">
                "{transcript + interimTranscript}"
              </span>
            )}
          </div>
        )}

        {/* Voice Mode Toggle */}
        {isSupported && (
          <div className="flex items-center justify-center gap-2 pb-2">
            <Button
              size="sm"
              variant={voiceMode ? 'default' : 'outline'}
              onClick={handleVoiceModeToggle}
              disabled={isSending}
              type="button"
              className="text-xs"
            >
              <Mic className={`w-4 h-4 mr-2 ${voiceMode ? 'animate-pulse' : ''}`} />
              {voiceMode 
                ? t('chat.voiceModeOn', 'Voice Mode: ON')
                : t('chat.voiceModeOff', 'Voice Mode: OFF')
              }
            </Button>
            {voiceMode && (
              <span className="text-xs text-muted-foreground">
                {t('chat.voiceModeHint', 'Speak naturally, responses will be read aloud')}
              </span>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={voiceMode ? (transcript + interimTranscript).trim() || input : input}
              onChange={(e) => !voiceMode && setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                voiceMode
                  ? t('chat.voicePlaceholder', 'Listening... Speak your question')
                  : t(
                      'chat.placeholder',
                      'Ask about your farm, workers, accounting, inventory...',
                    )
              }
              disabled={isSending || (voiceMode && isListening)}
              className="pr-24"
              readOnly={voiceMode}
            />
            {isSupported && !voiceMode && (
              <Button
                size="sm"
                variant={isListening ? 'destructive' : 'ghost'}
                onClick={handleVoiceToggle}
                className="absolute right-1 top-1 h-7 w-7 p-0"
                disabled={isSending}
                type="button"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
          </div>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSend();
            }} 
            disabled={isSending || !input.trim() || isListening} 
            type="button"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!isSupported && (
          <p className="text-xs text-muted-foreground text-center">
            {t(
              'chat.voiceNotSupported',
              'Voice input is not supported in this browser',
            )}
          </p>
        )}

        {voiceError && (
          <p className="text-xs text-destructive text-center">{voiceError}</p>
        )}
      </CardContent>
    </Card>
  );
}
