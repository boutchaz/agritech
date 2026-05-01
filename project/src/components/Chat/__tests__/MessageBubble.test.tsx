import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserMessage } from '../UserMessage';
import { AssistantMessage } from '../AssistantMessage';

// Mock dependencies
vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    isSupported: true,
    isSpeaking: false,
    speak: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('@/hooks/useZaiTTS', () => ({
  useZaiTTS: () => ({
    isGenerating: false,
    isPlaying: false,
    play: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/ui/UserAvatar', () => ({
  default: ({ firstName }: any) => <div data-testid="user-avatar">{firstName}</div>,
}));

describe('UserMessage', () => {
  it('renders user text content', () => {
    render(
      <UserMessage
        content="Hello, how are my crops?"
        timestamp={new Date('2025-06-01T10:00:00')}
        avatarUrl={undefined}
        firstName="Karim"
        lastName="Benali"
        email="karim@example.com"
      />
    );
    expect(screen.getByText('Hello, how are my crops?')).toBeInTheDocument();
  });

  it('renders user avatar', () => {
    render(
      <UserMessage
        content="Test"
        timestamp={new Date()}
        firstName="Karim"
        lastName="Benali"
        email="karim@example.com"
      />
    );
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
  });
});

describe('AssistantMessage', () => {
  it('renders markdown content', () => {
    render(
      <AssistantMessage
        content="**Bold text** and normal text"
        timestamp={new Date()}
        language="en"
      />
    );
    // Markdown renders bold as <strong>
    const el = screen.getByText('Bold text');
    expect(el.tagName).toBe('STRONG');
  });

  it('renders TTS button', () => {
    render(
      <AssistantMessage
        content="Some response text"
        timestamp={new Date()}
        language="en"
      />
    );
    expect(screen.getByTitle('Play audio')).toBeInTheDocument();
  });
});
