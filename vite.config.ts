import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포 경로: '/khepi-rms/' (저장소 meaning6650/khepi-rms). 다른 경로 필요 시 VITE_BASE 로 지정
export default defineConfig({
  base: process.env.VITE_BASE ?? '/khepi-rms/',
  plugins: [react()],
});
