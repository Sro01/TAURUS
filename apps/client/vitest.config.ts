import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 순수 함수 전용: utils/jam, utils/teamNameHint, utils/adminSlots (React·DOM 없음)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/utils/jam/**/*.test.ts', 'src/utils/teamNameHint.test.ts', 'src/utils/adminSlots.test.ts'],
    passWithNoTests: true,
  },
})
