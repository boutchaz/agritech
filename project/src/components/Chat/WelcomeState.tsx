import React from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { SUGGESTION_CHIPS } from './chat-utils';

interface WelcomeStateProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function WelcomeState({ onSend, disabled }: WelcomeStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <Bot className="w-12 h-12 opacity-50" />
      <p className="text-muted-foreground text-center">
        {t('chat.welcome', "Hello! I'm your AgriTech assistant. How can I help you today?")}
      </p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {SUGGESTION_CHIPS.map((chip) => (
          <Button
            key={chip.key}
            variant="outline"
            size="sm"
            className="justify-start gap-2 h-auto py-2.5 px-3 text-left"
            onClick={() => onSend(t(chip.key, chip.defaultText))}
            disabled={disabled}
          >
            <chip.icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-xs">{t(chip.key, chip.defaultText)}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
