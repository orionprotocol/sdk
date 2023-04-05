import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  outDir: 'lib',
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
})