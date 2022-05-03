import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-polyfill-node';

import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

const LIBRARY_NAME = 'orionprotocol'; // Change with your library's name
const EXTERNAL = []; // Indicate which modules should be treated as external
const GLOBALS = {}; // https://rollupjs.org/guide/en/#outputglobals

const banner = `/*!
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version v${pkg.version}
 * @author ${pkg.author}
 * @homepage ${pkg.homepage}
 * @repository ${pkg.repository.url}
 * @license ${pkg.license}
 */`;

export default [
  {
    input: "src/index.ts",
    external: EXTERNAL,
    output: [
      {
        banner,
        name: LIBRARY_NAME,
        file: pkg.browser, // UMD
        format: 'umd',
        exports: "named",
        esModule: false,
        globals: GLOBALS
      },
      {
        banner,
        file: pkg.main, // CommonJS
        format: 'cjs',
        // We use `default` here as we are only exporting one thing using `export default`.
        // https://rollupjs.org/guide/en/#outputexports
        exports: "named",
        globals: GLOBALS
      },
      {
        banner,
        file: pkg.module, // ESM
        format: 'es',
        exports: "named",
        globals: GLOBALS
      }
    ],
    plugins: [
      babel({
        babelHelpers: 'bundled',
        exclude: ['node_modules/**']
      }),
      typescript({
        tsconfig: "tsconfig.esm.json",
        sourceMap: false
      }),
      resolve({
        preferBuiltins: false,
      }),
      nodePolyfills(),
      commonjs({
        include: 'node_modules/**',
      }),
      json(),
      terser()
    ],
  }
];