import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    tsconfig: "src/tsconfig.json",
    splitting: true,
    sourcemap: true,
    target: "es2015",
    platform: "browser",
    dts: true,
    clean: true,
})
