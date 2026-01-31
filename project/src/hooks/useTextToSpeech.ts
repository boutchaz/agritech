import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextToSpeechOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useTextToSpeech(
  options: UseTextToSpeechOptions = {},
): UseTextToSpeechReturn {
  const {
    language = 'fr-FR',
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onEnd,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);

      // Wait for voices to load
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || [];
        if (voices.length > 0) {
          console.log(`Loaded ${voices.length} voices`);
        }
      };

      // Voices may load asynchronously
      if (synthRef.current.onvoiceschanged !== undefined) {
        synthRef.current.onvoiceschanged = loadVoices;
      }

      // Try loading immediately
      loadVoices();
    }

    return () => {
      // Cleanup: stop any ongoing speech
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const selectBestVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (!synthRef.current) return null;

    const voices = synthRef.current.getVoices();
    if (voices.length === 0) return null;

    // Filter voices by language
    const langVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));

    // Prioritize high-quality voices
    const priorities = [
      // Neural/Premium voices (best quality)
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('neural'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('premium'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('enhanced'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('natural'),
      // Google voices (good quality)
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('google'),
      // Microsoft voices (good quality)
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('microsoft'),
      // Female voices (often sound more natural)
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('female'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('samantha'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('amelie'),
      (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('zira'),
      // Local voices (faster, no network)
      (v: SpeechSynthesisVoice) => v.localService,
    ];

    // Try each priority
    for (const priority of priorities) {
      const voice = langVoices.find(priority);
      if (voice) return voice;
    }

    // Fallback to first voice for language
    return langVoices[0] || voices[0];
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current || !isSupported) {
        onError?.(new Error('Speech synthesis is not supported'));
        return;
      }

      // Stop any ongoing speech
      if (synthRef.current.speaking) {
        synthRef.current.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      
      // Select best voice
      const bestVoice = selectBestVoice(language);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // Optimize for natural speech
      utterance.rate = rate !== 1.0 ? rate : 0.95; // Default to slightly slower if not specified
      utterance.pitch = pitch !== 1.0 ? pitch : 1.0; // Normal pitch
      utterance.volume = volume;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        onEnd?.();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        const error = new Error(
          `Speech synthesis error: ${event.error}`,
        );
        onError?.(error);
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    },
    [language, rate, pitch, volume, isSupported, onEnd, onError],
  );

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
      setIsSpeaking(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
      setIsSpeaking(true);
    }
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    pause,
    resume,
  };
}
