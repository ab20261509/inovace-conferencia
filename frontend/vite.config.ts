import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certPath = path.resolve(__dirname, '../caddy/data/caddy/pki/authorities/local/root.crt');
const keyPath = path.resolve(__dirname, '../caddy/data/caddy/pki/authorities/local/root.key');
const hasHttpsCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Permite acesso pela rede local / celular
    https: hasHttpsCerts
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : undefined,
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
});
