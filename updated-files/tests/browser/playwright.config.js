import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.', testMatch: '*.spec.js', workers: 1, fullyParallel: false,
  outputDir: '../../artifacts/browser', reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3211', headless: true, screenshot: 'only-on-failure', launchOptions: process.platform === 'win32' ? { channel: 'msedge' } : {} },
  webServer: {
    command: 'node ../../server/index.js', url: 'http://127.0.0.1:3211', reuseExistingServer: false,
    env: { PORT: '3211', DATA_DIR: fileURLToPath(new URL('../../.test-data/browser', import.meta.url)), CHAT_PROVIDER: 'demo', TTS_PROVIDER: 'browser', OPENAI_API_KEY: '', EMBEDDING_PROVIDER: 'local' },
  },
});
