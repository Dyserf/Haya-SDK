import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

const banner = `/*!
 * Haya Analytics SDK v1.0.0
 * https://haya.ai
 * MIT License
 */`;

const basePlugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs(),
  typescript({ tsconfig: "./tsconfig.json", declaration: false }),
];

export default [
  // ESM build — for bundlers (webpack, vite, etc.)
  {
    input: "src/index.ts",
    output: {
      file: "dist/haya.esm.js",
      format: "esm",
      banner,
      sourcemap: true,
    },
    plugins: basePlugins,
  },

  // UMD build — for Node / direct script tag (non-minified)
  {
    input: "src/index.ts",
    output: {
      file: "dist/haya.umd.js",
      format: "umd",
      name: "Haya",
      exports: "named",
      banner,
      sourcemap: true,
    },
    plugins: basePlugins,
  },

  // Minified CDN build — for <script src="...haya.min.js">
  {
    input: "src/index.ts",
    output: {
      file: "dist/haya.min.js",
      format: "iife",
      name: "Haya",
      exports: "named",
      banner,
      sourcemap: true,
    },
    plugins: [
      ...basePlugins,
      terser({
        compress: { drop_console: true, passes: 2 },
        mangle: true,
        format: { comments: /^!/ },
      }),
    ],
  },

  // TypeScript declarations bundle
  {
    input: "src/index.ts",
    output: { file: "dist/index.d.ts", format: "es" },
    plugins: [dts()],
  },
];
