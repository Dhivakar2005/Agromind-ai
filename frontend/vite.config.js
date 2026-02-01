import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
            '/static': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
            '/ml': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            }
        }
    }
});
