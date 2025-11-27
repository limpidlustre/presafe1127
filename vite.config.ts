import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // 删除 define 部分，直接使用 Vite 默认注入
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});