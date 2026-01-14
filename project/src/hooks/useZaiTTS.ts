import { useState, useCallback, useRef } from 'react';
import { chatApi } from '@/lib/api/chat';
import { useAuth } from '@/components/MultiTenantAuthProvider';

interface UseZaiTTSOptions {
  language?: string;
  voice?: string;
  speed?: number;
  onError?: (error: Error) => void;
}

interface UseZaiTTSReturn {
  isGenerating: boolean;
  isPlaying: boolean;
  play: (text: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useZaiTTS(options: UseZaiTTSOptions = {}): UseZaiTTSReturn {
  const { language = 'fr', voice, speed = 1.0, onError } = options;
  const { currentOrganization } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(
    async (text: string) => {
      if (!currentOrganization?.id) {
        const err = new Error('No organization selected');
        setError(err.message);
        onError?.(err);
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Fetch audio from Z.ai TTS API
        const audioBlob = await chatApi.textToSpeech(
          text,
          language,
          voice,
          speed,
          currentOrganization.id,
        );

        // Create audio element and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
          setIsPlaying(true);
          setIsGenerating(false);
        };

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onerror = (e) => {
          setIsPlaying(false);
          setIsGenerating(false);
          const err = new Error('Audio playback failed');
          setError(err.message);
          onError?.(err);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audioRef.current = audio;
        await audio.play();
      } catch (err) {
        setIsGenerating(false);
        setIsPlaying(false);
        const error = err instanceof Error ? err : new Error('Failed to generate speech');
        setError(error.message);
        onError?.(error);
      }
    },
    [currentOrganization?.id, language, voice, speed, onError],
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
  }, []);

  return {
    isGenerating,
    isPlaying,
    play,
    stop,
    error,
  };
}
