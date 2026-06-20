/**
 * useTranslate — RF Perfume (Arabic-first, always returns Arabic)
 * Since the store is Arabic-only, tc always returns the Arabic string.
 */

export function tc(ar: string, _en: string): string {
  return ar;
}

export function useTranslate() {
  return (ar: string, _en: string): string => ar;
}

export default useTranslate;
