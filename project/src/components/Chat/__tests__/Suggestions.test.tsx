import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeState } from '../WelcomeState';
import { FollowUpSuggestions } from '../FollowUpSuggestions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

describe('WelcomeState', () => {
  it('renders suggestion chips', () => {
    render(<WelcomeState onSend={vi.fn()} disabled={false} />);
    expect(screen.getByText('Farm overview')).toBeInTheDocument();
    expect(screen.getByText('Low stock alerts')).toBeInTheDocument();
  });
});

describe('FollowUpSuggestions', () => {
  it('renders clickable chips', () => {
    render(
      <FollowUpSuggestions
        suggestions={['Check water status', 'Show annual plan']}
        onSend={vi.fn()}
      />
    );
    expect(screen.getByText('Check water status')).toBeInTheDocument();
    expect(screen.getByText('Show annual plan')).toBeInTheDocument();
  });

  it('calls onSend when chip is clicked', () => {
    const onSend = vi.fn();
    render(
      <FollowUpSuggestions
        suggestions={['Check water status']}
        onSend={onSend}
      />
    );
    fireEvent.click(screen.getByText('Check water status'));
    expect(onSend).toHaveBeenCalledWith('Check water status');
  });
});
