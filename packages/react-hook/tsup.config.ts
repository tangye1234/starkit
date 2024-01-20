import { globSync } from 'glob'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: globSync('src/*.ts'),
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: true,
  external: ['react']
})
