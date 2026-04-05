/**
 * If the model returned a single JSON object { text, suggestions, data_cards },
 * convert it to the same markdown + ```json:type``` blocks the UI expects.
 * Mirrors agritech-api StructuredResponseService (for history/stream edge cases).
 *
 * Models often wrap JSON in ```json fences or add a short preamble — we normalize
 * before parsing so the bubble renders cards instead of raw JSON monospace.
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

/** Strip leading ``` / ```json … ``` wrapper often added by models */
export function stripMarkdownJsonFence(content: string): string {
  let s = content.trim();
  if (!s.startsWith('```')) return s;
  const open = s.match(/^```(?:json)?\s*\n?/i);
  if (!open) return content.trim();
  s = s.slice(open[0].length);
  const close = s.lastIndexOf('```');
  if (close !== -1) s = s.slice(0, close);
  return s.trim();
}

/**
 * Extract the first balanced top-level `{ ... }` substring.
 * Handles prose before/after the JSON object.
 */
export function extractOutermostJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let stringEscape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (stringEscape) {
        stringEscape = false;
      } else if (c === '\\') {
        stringEscape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function structuredJsonParseCandidates(raw: string): string[] {
  const stripped = stripMarkdownJsonFence(raw.trim());
  const t = stripped.trim();
  const slice = extractOutermostJsonObject(t);
  const out: string[] = [];
  if (t.startsWith('{')) out.push(t);
  if (slice && !out.includes(slice)) out.push(slice);
  return out;
}

export function unwrapStructuredAssistantJson(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  const candidates = structuredJsonParseCandidates(raw);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        text?: string;
        suggestions?: unknown;
        data_cards?: unknown;
      };
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;

      const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
      const dataCards = Array.isArray(parsed.data_cards)
        ? parsed.data_cards.filter((c): c is StructuredCard => isValidCard(c))
        : [];
      const embedded = dataCards.map((c) => formatCard(c));
      const combined = [text, ...embedded].filter(Boolean).join('\n\n').trim();
      if (combined) return combined;
    } catch {
      /* try next candidate */
    }
  }

  return raw;
}
