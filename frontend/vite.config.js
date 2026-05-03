import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                community: resolve(__dirname, 'community.html'),
                crop: resolve(__dirname, 'crop_recommendation.html'),
                disease: resolve(__dirname, 'disease_detection.html'),
            },
        },
    },
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
