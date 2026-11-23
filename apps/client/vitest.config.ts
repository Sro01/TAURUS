import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// utils/jam 순수 함수 전용 (React·DOM 없음)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/utils/jam/**/*.test.ts'],
    passWithNoTests: true,
  },
})
