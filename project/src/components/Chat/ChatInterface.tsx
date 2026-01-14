import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSendMessage, useChatHistory, useClearChatHistory } from '@/hooks/useChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useZaiTTS } from '@/hooks/useZaiTTS';
import { Send, Mic, MicOff, Loader2, Trash2, Bot, User, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { data: history, isLoading: isLoadingHistory } = useChatHistory();
  const { mutate: clearHistory } = useClearChatHistory();
  
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

  // Browser TTS (fallback)
  const browserTTS = useTextToSpeech({
    language: currentLanguage === 'fr' ? 'fr-FR' : currentLanguage === 'ar' ? 'ar-SA' : 'en-US',
  });

  // Z.ai TTS (preferred)
  const zaiTTS = useZaiTTS({
    language: currentLanguage,
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
      console.log('Cannot send:', { trimmedInput, isSending });
      return;
    }

    // Stop voice input if it's active
    if (isListening) {
      console.log('Stopping voice input before sending');
      stopListening();
    }

    proceedWithSend(trimmedInput);
  };

  const proceedWithSend = useCallback((messageText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput(''); // Clear input immediately
    if (voiceMode) {
      resetTranscript(); // Reset transcript in voice mode
    }

    console.log('Sending message:', messageText);

    try {
      sendMessage(
        { query: messageText, language: currentLanguage, save_history: true },
        {
          onSuccess: (data) => {
            console.log('Message sent successfully:', data);
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date(data.metadata.timestamp),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            
            // In voice mode, restart listening after response
            if (voiceMode && !isListening) {
              setTimeout(() => {
                resetTranscript();
                startListening();
              }, 1000); // Small delay to allow TTS to start
            }
          },
          onError: (error: any) => {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `Error: ${error?.message || 'Failed to send message. Please try again.'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            // Restore the input if there was an error (only in manual mode)
            if (!voiceMode) {
              setInput(messageText);
            }
            // In voice mode, restart listening even on error
            if (voiceMode && !isListening) {
              setTimeout(() => {
                resetTranscript();
                startListening();
              }, 1000);
            }
          },
        },
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error?.message || 'Failed to send message. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      if (!voiceMode) {
        setInput(messageText);
      }
      // In voice mode, restart listening even on error
      if (voiceMode && !isListening) {
        setTimeout(() => {
          resetTranscript();
          startListening();
        }, 1000);
      }
    }
  }, [voiceMode, currentLanguage, sendMessage, resetTranscript, isListening, startListening]);

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
      startListening();
    } else {
      // Disable voice mode: stop listening
      stopListening();
      resetTranscript();
    }
  };

  // Auto-send in voice mode when speech ends and we have text
  useEffect(() => {
    if (voiceMode && !isListening && transcript.trim() && !isSending) {
      const trimmedTranscript = transcript.trim();
      if (trimmedTranscript.length > 0) {
        // Auto-send the transcript
        proceedWithSend(trimmedTranscript);
        resetTranscript();
        setInput('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode, isListening, transcript, isSending, resetTranscript, proceedWithSend]);

  // Auto-play AI response in voice mode
  useEffect(() => {
    if (voiceMode && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        // Auto-play the AI response with TTS
        const playResponse = async () => {
          try {
            await zaiTTS.play(lastMessage.content);
          } catch (error) {
            // Fallback to browser TTS
            if (browserTTS.isSupported) {
              browserTTS.speak(lastMessage.content);
            }
          }
        };
        // Small delay to ensure message is fully rendered
        const timer = setTimeout(playResponse, 500);
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
              <div className="text-center text-muted-foreground py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {t(
                    'chat.welcome',
                    "Hello! I'm your AgriTech assistant. How can I help you today?",
                  )}
                </p>
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
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
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
                                // Try Z.ai TTS first
                                await zaiTTS.play(message.content);
                              } catch (error) {
                                // Fallback to browser TTS
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
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
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
