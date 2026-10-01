import { defineConfig } from 'vitest/config';

// npm test: domain 단위 테스트 (보안 규칙 테스트는 npm run test:rules, 에뮬레이터 필요)
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
