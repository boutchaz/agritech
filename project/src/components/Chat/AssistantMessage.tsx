import {  useMemo  } from "react";
import { Bot, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useZaiTTS } from '@/hooks/useZaiTTS';
import { marked } from 'marked';
import { sanitizeMarkdownHtml } from '@/lib/sanitize';
import { DEEP_LINK_MAP, formatChatMessageTimestamp } from './chat-utils';
import { cardRegistry } from './cards';
import { Button } from '@/components/ui/button';
import { unwrapStructuredAssistantJson } from '@/lib/chat/unwrapStructuredAssistantJson';

interface AssistantMessageProps {
  content: string;
  timestamp: Date;
  language: string;
}

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

interface ContentSegment {
  type: 'markdown' | 'card';
  text?: string;
  cardType?: string;
  cardData?: any;
}

/**
 * Parse content into segments: markdown text + json:TYPE data card blocks.
 * Pattern: ```json:TYPE\n{...}\n```
 */
function parseContentSegments(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const cardRegex = /```json:(\S+)\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(text)) !== null) {
    // Add markdown before this card
    if (match.index > lastIndex) {
      const md = text.slice(lastIndex, match.index).trim();
      if (md) segments.push({ type: 'markdown', text: md });
    }

    const cardType = match[1];
    const jsonStr = match[2].trim();

    if (cardRegistry[cardType]) {
      try {
        const cardData = JSON.parse(jsonStr);
        segments.push({ type: 'card', cardType, cardData });
      } catch {
        // Invalid JSON → render as markdown code block
        segments.push({ type: 'markdown', text: match[0] });
      }
    } else {
      // Unknown card type → render as markdown
      segments.push({ type: 'markdown', text: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last card
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining) segments.push({ type: 'markdown', text: remaining });
  }

  // If no cards found, return single markdown segment
  if (segments.length === 0) {
    segments.push({ type: 'markdown', text });
  }

  return segments;
}

export function AssistantMessage({ content, timestamp, language }: AssistantMessageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const speechLang = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-SA' : 'en-US';
  const voice = language === 'ar' ? 'kazi' : 'jam';

  const displayContent = useMemo(() => unwrapStructuredAssistantJson(content), [content]);

  const browserTTS = useTextToSpeech({ language: speechLang, rate: 0.95, pitch: 1.0, volume: 1.0 });
  const zaiTTS = useZaiTTS({
    language,
    voice,
    speed: 0.95,
    onError: () => {
      if (browserTTS.isSupported) browserTTS.speak(displayContent);
    },
  });

  const handlePlay = async () => {
    try {
      if (browserTTS.isSupported) {
        browserTTS.speak(displayContent);
      } else {
        await zaiTTS.play(displayContent);
      }
    } catch {
      if (browserTTS.isSupported) browserTTS.speak(displayContent);
    }
  };

  const handleStop = () => {
    zaiTTS.stop();
    browserTTS.stop();
  };

  const isSpeaking = zaiTTS.isGenerating || zaiTTS.isPlaying || browserTTS.isSpeaking;
  const segments = useMemo(() => parseContentSegments(displayContent), [displayContent]);

  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {segments.map((segment) => {
              if (segment.type === 'card' && segment.cardType && segment.cardData) {
                const CardComponent = cardRegistry[segment.cardType];
                return CardComponent ? <CardComponent key={`${segment.cardType}-${JSON.stringify(segment.cardData)}`} data={segment.cardData} /> : null;
              }
              return (
                <div
                  key={segment.text ?? segment.cardType ?? segment.type}
                  className="text-sm chat-markdown"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeMarkdownHtml(addDeepLinks(marked.parse(segment.text || '') as string)),
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
              );
            })}
            <span className="text-xs opacity-70 mt-1 block">
              {formatChatMessageTimestamp(timestamp, language)}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isSpeaking ? (
              <>
                <Button
                  onClick={handleStop}
                  className="p-1.5 rounded hover:bg-muted/50 transition-colors"
                  title={t('chat.stopAudio', 'Stop audio')}
                >
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                </Button>
                {(zaiTTS.isGenerating || browserTTS.isSpeaking) && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </>
            ) : (
              <Button
                onClick={handlePlay}
                className="p-1.5 rounded hover:bg-muted/50 transition-colors"
                title={t('chat.playAudio', 'Play audio')}
              >
                <Volume2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
