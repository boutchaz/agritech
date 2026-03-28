import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  voiceMode: boolean;
  isListening: boolean;
  isVoiceSupported: boolean;
  voiceDisplayValue?: string;
  onVoiceToggle?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  voiceMode,
  isListening,
  isVoiceSupported,
  voiceDisplayValue,
  onVoiceToggle,
}: ChatInputProps) {
  const { t } = useTranslation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const displayValue = voiceMode ? (voiceDisplayValue || value) : value;

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Input
          value={displayValue}
          onChange={(e) => !voiceMode && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            voiceMode
              ? t('chat.voicePlaceholder', 'Listening... Speak your question')
              : t('chat.placeholder', 'Ask about your farm, workers, accounting, inventory...')
          }
          disabled={isLoading || (voiceMode && isListening)}
          className="pr-24"
          readOnly={voiceMode}
        />
        {isVoiceSupported && !voiceMode && onVoiceToggle && (
          <Button
            size="sm"
            variant={isListening ? 'destructive' : 'ghost'}
            onClick={onVoiceToggle}
            className="absolute right-1 top-1 h-7 w-7 p-0"
            disabled={isLoading}
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
          onSend();
        }}
        disabled={isLoading || !value.trim() || isListening}
        type="button"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
