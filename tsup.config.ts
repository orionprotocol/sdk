import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    sourcemap: true,
    platform: 'neutral',
    minify: true,
    outDir: 'lib',
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    shims: true,
  },
  {
    entry: ['src/index.ts'],
    globalName: 'orion',
    sourcemap: true,
    platform: 'browser',
    minify: true,
    outDir: 'lib',
    format: 'iife',
    dts: true,
    clean: true,
    shims: true,

    // Suppress all 'node:' imports
    esbuildPlugins: [
      {
        name: 'resolve-node-polyfill',
        setup(build) {
          build.onResolve({ filter: /^node:/ }, (args) => {
            return {
              path: args.path,
              namespace: 'node-polyfill',
            }
          })
          build.onLoad({ filter: /.*/, namespace: 'node-polyfill' }, (args) => {
            return {
              contents: 'undefined',
            }
          })
        },
      },
    ],
  }
])