import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const production = process.env.NODE_ENV === 'production';

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: true,
    },
    external: ['axios'],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      production && terser(),
    ],
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external: ['axios'],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      production && terser(),
    ],
  },
  // UMD build for browsers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'WeTransferDownloader',
      sourcemap: true,
      globals: {
        axios: 'axios',
      },
    },
    external: ['axios'],
    plugins: [
      nodeResolve({ browser: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      production && terser(),
    ],
  },
];