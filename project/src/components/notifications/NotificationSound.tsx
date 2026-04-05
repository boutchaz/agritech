import { useEffect, useRef, useState } from 'react';

interface NotificationSoundProps {
  enabled?: boolean;
  onPlay?: () => void;
}

// Generate a subtle notification sound using Web Audio API
function playNotificationSound(): void {
  try {
    const AudioContextConstructor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a pleasant, subtle "ding" sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

     oscillator.start(audioContext.currentTime);
     oscillator.stop(audioContext.currentTime + 0.15);
   } catch (_error) {
     // Failed to play notification sound
   }
}

// Trigger haptic feedback on mobile devices
function triggerHapticFeedback(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(50); // 50ms vibration
  }
}

/**
 * NotificationSound component handles audio and haptic feedback for notifications.
 * It provides a hook-like interface for triggering notification effects.
 */
export function useNotificationSound(enabled: boolean = true) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(enabled);
  const playCountRef = useRef(0);

  useEffect(() => {
    // Load user preference from localStorage
    const stored = localStorage.getItem('notification-sound-enabled');
    if (stored !== null) {
      setIsSoundEnabled(stored === 'true');
    }
  }, []);

  const toggleSound = (value?: boolean) => {
    const newValue = value ?? !isSoundEnabled;
    setIsSoundEnabled(newValue);
    localStorage.setItem('notification-sound-enabled', String(newValue));
  };

  const play = () => {
    if (!isSoundEnabled) return;

    // Prevent too many sounds in quick succession
    const now = Date.now();
    if (now - playCountRef.current < 500) return;
    playCountRef.current = now;

    playNotificationSound();
    triggerHapticFeedback();
  };

  return { isSoundEnabled, toggleSound, play };
}

/**
 * NotificationSound component - placeholder for component usage
 * This component can be used to add sound controls to settings pages
 */
export function NotificationSound({ enabled, onPlay }: NotificationSoundProps) {
   const { toggleSound, play } = useNotificationSound(enabled);

  useEffect(() => {
    if (enabled !== undefined) {
      toggleSound(enabled);
    }
  }, [enabled, toggleSound]);

  useEffect(() => {
    if (onPlay) {
      const handlePlay = () => {
        play();
        onPlay();
      };
      // Listen for custom event to play sound
      window.addEventListener('notification-play', handlePlay);
      return () => window.removeEventListener('notification-play', handlePlay);
    }
  }, [play, onPlay]);

  // This component doesn't render anything visible
  // It's used for its side effects and can be imported for the useNotificationSound hook
  return null;
}

/**
 * Dispatch a notification sound event from anywhere in the app
 */
export function triggerNotificationSound(): void {
  window.dispatchEvent(new CustomEvent('notification-play'));
}

export default NotificationSound;
