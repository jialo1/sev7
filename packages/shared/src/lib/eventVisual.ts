/** Variante stable par id (0..mod-1) pour dégradés de secours. */
export function visualVariant(id: string, mod: number): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) % mod
}
