import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 모든 인터페이스 바인딩
    port: 5173,       // 기본 포트
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})

