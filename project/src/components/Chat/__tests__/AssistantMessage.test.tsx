import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssistantMessage } from '../AssistantMessage';

vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({ isSupported: true, isSpeaking: false, speak: vi.fn(), stop: vi.fn() }),
}));
vi.mock('@/hooks/useZaiTTS', () => ({
  useZaiTTS: () => ({ isGenerating: false, isPlaying: false, play: vi.fn(), stop: vi.fn() }),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback || key }),
}));

describe('AssistantMessage - Data Cards', () => {
  it('renders recommendation-card from json:recommendation-card code block', () => {
    const content = `Here is a recommendation:

\`\`\`json:recommendation-card
{"constat":"Nitrogen deficiency","action":"Apply 50 units/ha","priority":"high"}
\`\`\`

That's all.`;

    render(<AssistantMessage content={content} timestamp={new Date()} language="en" />);
    expect(screen.getByText('Nitrogen deficiency')).toBeInTheDocument();
    expect(screen.getByText('Apply 50 units/ha')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('falls back to code block for unknown card types', () => {
    const content = `\`\`\`json:unknown-type
{"foo":"bar"}
\`\`\``;

    render(<AssistantMessage content={content} timestamp={new Date()} language="en" />);
    // Should not crash, renders as regular markdown
    expect(screen.getByText(/foo/)).toBeInTheDocument();
  });

  it('renders mixed text + card in correct order', () => {
    const content = `Before card.

\`\`\`json:farm-summary
{"farms_count":3,"parcels_count":12,"workers_count":25,"pending_tasks":8}
\`\`\`

After card.`;

    render(<AssistantMessage content={content} timestamp={new Date()} language="en" />);
    expect(screen.getByText('Before card.')).toBeInTheDocument();
    expect(screen.getByText('After card.')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
