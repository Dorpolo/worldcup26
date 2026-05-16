import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  dts: false,
  // Bundle workspace packages inline so the runner doesn't need pnpm symlinks
  noExternal: [/^@worldcup26\//],
})
