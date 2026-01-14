import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSendMessage, useChatHistory, useClearChatHistory } from '@/hooks/useChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Send, Mic, MicOff, Loader2, Trash2, Bot, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { data: history, isLoading: isLoadingHistory } = useChatHistory();
  const { mutate: clearHistory } = useClearChatHistory();
  
  // Get current language, defaulting to 'en' if not 'fr' or 'ar'
  const currentLanguage = i18n.language === 'fr' ? 'fr' : i18n.language === 'ar' ? 'ar' : 'en';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

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
    language: 'en-US',
    onTranscript: (text) => {
      setInput((prev) => prev + text);
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
        // If history is empty and we have local messages, keep local (they're being saved)
        if (historyMessages.length === 0 && prev.length > 0) {
          return prev;
        }
        return historyMessages;
      });
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

  const proceedWithSend = (messageText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput(''); // Clear input immediately

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
            // Restore the input if there was an error
            setInput(messageText);
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
      setInput(messageText);
    }
  };

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

  const handleClearHistory = () => {
    clearHistory();
    setMessages([]);
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
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
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

        {/* Input Area */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(
                'chat.placeholder',
                'Ask about your farm, workers, accounting, inventory...',
              )}
              disabled={isSending || isListening}
              className="pr-24"
            />
            {isSupported && (
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
