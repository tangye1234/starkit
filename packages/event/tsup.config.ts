import { globSync } from 'glob'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: globSync('src/*.ts'),
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true
})
