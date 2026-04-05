/**
 * If the model returned a single JSON object { text, suggestions, data_cards },
 * convert it to the same markdown + ```json:type``` blocks the UI expects.
 * Mirrors agritech-api StructuredResponseService (for history/stream edge cases).
 */
const SUPPORTED_CARD_TYPES = new Set([
  'recommendation-card',
  'diagnostic-card',
  'farm-summary',
  'plan-calendar',
  'stock-alert',
  'financial-snapshot',
]);

type StructuredCard = { type: string; data: Record<string, unknown> };

function isValidCard(card: unknown): card is StructuredCard {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return false;
  const c = card as { type?: unknown; data?: unknown };
  return (
    typeof c.type === 'string' &&
    SUPPORTED_CARD_TYPES.has(c.type) &&
    !!c.data &&
    typeof c.data === 'object' &&
    !Array.isArray(c.data)
  );
}

function formatCard(card: StructuredCard): string {
  return `\`\`\`json:${card.type}\n${JSON.stringify(card.data, null, 2)}\n\`\`\``;
}

export function unwrapStructuredAssistantJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return raw;

  try {
    const parsed = JSON.parse(trimmed) as {
      text?: string;
      suggestions?: unknown;
      data_cards?: unknown;
    };
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw;

    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    const dataCards = Array.isArray(parsed.data_cards)
      ? parsed.data_cards.filter((c): c is StructuredCard => isValidCard(c))
      : [];
    const embedded = dataCards.map((c) => formatCard(c));
    const combined = [text, ...embedded].filter(Boolean).join('\n\n').trim();
    return combined || raw;
  } catch {
    return raw;
  }
}
