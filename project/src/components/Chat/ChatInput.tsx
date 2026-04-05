import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Send, Mic, MicOff, Loader2, ImagePlus, X } from 'lucide-react';
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
  image?: string;
  onImageChange: (image?: string) => void;
}

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

async function resizeImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const largestDimension = Math.max(image.width, image.height);
      const scale = largestDimension > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / largestDimension : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Failed to prepare image canvas'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => reject(new Error('Failed to process selected image'));
    image.src = dataUrl;
  });
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
  image,
  onImageChange,
}: ChatInputProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const displayValue = voiceMode ? (voiceDisplayValue || value) : value;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const rawDataUrl = await fileToDataUrl(file);
      const normalizedImage = file.size > MAX_IMAGE_SIZE_BYTES
        ? await resizeImage(rawDataUrl)
        : rawDataUrl;
      onImageChange(normalizedImage);
    } catch {
      onImageChange(undefined);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {image && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2">
          <img src={image} alt="Selected upload preview" className="h-20 w-20 rounded-md object-cover" />
          <div className="flex flex-1 items-start justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {t('chat.imageUpload', 'Upload image')}
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onImageChange(undefined)}
              disabled={isLoading}
              aria-label={t('chat.imageRemove', 'Remove image')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isListening}
          aria-label={t('chat.imageUpload', 'Upload image')}
        >
          <ImagePlus className="w-4 h-4" />
        </Button>

        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSend();
          }}
          disabled={isLoading || (!value.trim() && !image) || isListening}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
