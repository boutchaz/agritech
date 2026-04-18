/** Arabic (any region) → RTL layout. Matches i18n codes like `ar` or `ar-MA`. */
export function isRTLLocale(language: string | undefined): boolean {
  if (!language) return false
  return language.toLowerCase().startsWith('ar')
}
