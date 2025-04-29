import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
            },
        },
    },
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
        proxy: {
            '/api': {
                target: process.env.API_URL || 'http://localhost:3001',
                changeOrigin: true,
                secure: false
            }
        }
    }
});
