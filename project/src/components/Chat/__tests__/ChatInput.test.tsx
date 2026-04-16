import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

describe('ChatInput', () => {
  it('renders input and send button', () => {
    render(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isLoading={false}
        voiceMode={false}
        isListening={false}
        isVoiceSupported={false}
        onImageChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/Ask about your farm/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onSend on Enter key', () => {
    const onSend = vi.fn();
    render(
      <ChatInput
        value="test message"
        onChange={vi.fn()}
        onSend={onSend}
        isLoading={false}
        voiceMode={false}
        isListening={false}
        isVoiceSupported={false}
        onImageChange={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByPlaceholderText(/Ask about your farm/), { key: 'Enter' });
    expect(onSend).toHaveBeenCalled();
  });

  it('disables send when empty or loading', () => {
    render(
      <ChatInput
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        isLoading={true}
        voiceMode={false}
        isListening={false}
        isVoiceSupported={false}
        onImageChange={vi.fn()}
      />
    );
    const sendBtn = screen.getByRole('button');
    expect(sendBtn).toBeDisabled();
  });
});
