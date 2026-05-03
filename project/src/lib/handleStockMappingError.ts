import { toast } from 'sonner';

const MAPPING_ERROR_PATTERNS = [
  /stock account mappings/i,
  /no matching account mapping/i,
  /no.*stock.*mapping/i,
];

/**
 * Detects "no stock account mappings configured" backend errors and shows a
 * toast with a deep-link to /settings/stock-accounting. Returns true if the
 * mapping-error toast was shown, false if the error was something else (so
 * the caller can show its own fallback toast).
 */
export function handleStockMappingError(
  error: unknown,
  fallbackTitle: string,
): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const isMappingError = MAPPING_ERROR_PATTERNS.some((re) => re.test(message));
  if (!isMappingError) return false;

  toast.error(fallbackTitle, {
    description:
      'No stock account mappings configured. Click below to seed the defaults or configure them manually.',
    action: {
      label: 'Configure now',
      onClick: () => {
        window.location.href = '/settings/stock-accounting';
      },
    },
    duration: 10_000,
  });
  return true;
}
