import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const output = new URL('../dist/server/', import.meta.url)
await mkdir(output, { recursive: true })
await build({
  entryPoints: [fileURLToPath(new URL('../src/server/worker.ts', import.meta.url))],
  outfile: fileURLToPath(new URL('index.js', output)),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: false,
})
console.log('[worker] Sites 用の配信・公式共有URL取得エントリを生成しました。')
