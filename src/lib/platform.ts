export function isMacOS(): boolean {
  return /Mac|Macintosh|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}