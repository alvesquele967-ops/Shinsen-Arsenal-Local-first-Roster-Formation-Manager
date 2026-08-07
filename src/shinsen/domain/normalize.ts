export function normalizeJapaneseName(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/[\u30a1-\u30f6]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000・·、。ー_\-]/g, '')
    .replace(/[()（）「」『』【】\[\]]/g, '')
}

export function matchesJapaneseName(query: string, name: string, kana: string): boolean {
  const needle = normalizeJapaneseName(query)
  if (!needle) return true
  return normalizeJapaneseName(name).includes(needle) || normalizeJapaneseName(kana).includes(needle)
}
