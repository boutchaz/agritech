/**
 * Sanitize a user-provided search string for use in Supabase PostgREST `.or()` filter strings.
 *
 * PostgREST filter syntax uses commas, dots, and parentheses as operators.
 * If these characters appear in the interpolated value, an attacker can inject
 * additional filter clauses (e.g., `id.eq.<uuid>`) to leak data.
 *
 * This function strips all PostgREST-significant characters from the input.
 *
 * @example
 * ```ts
 * const safe = sanitizeSearch(userInput);
 * query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
 * ```
 */
export function sanitizeSearch(input: string): string {
  if (!input) return '';
  // Remove characters that can inject PostgREST filter operators:
  // commas (,) separate OR clauses
  // dots (.) separate field.operator.value
  // parentheses () group expressions
  // quotes (' ") can break value boundaries
  // backslash (\) escape sequences
  // percent (%) and underscore (_) are LIKE wildcards — we add our own
  return input.replace(/[\\%_,.()'"`]/g, '');
}
