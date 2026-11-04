import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

const certPath = path.resolve(__dirname, 'certs/cert.pem');
const keyPath = path.resolve(__dirname, 'certs/key.pem');
const caPath = path.resolve(__dirname, 'public/rootCA.crt');
const hasCustomCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

function getActiveIpv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const ips = new Set<string>();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        ips.add(net.address);
      }
    }
  }
  return Array.from(ips);
}

function getCertSans(certFile: string): string[] {
  if (!fs.existsSync(certFile)) return [];
  try {
    const cert = new crypto.X509Certificate(fs.readFileSync(certFile));
    const san = cert.subjectAltName || '';
    return san
      .split(',')
      .map((s) => s.trim().replace(/^(IP Address|DNS):/, ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function recriarCertificados(): { sucesso: boolean; ips: string[]; mensagem: string } {
  const ipsAtivos = getActiveIpv4Addresses();
  const sansExistentes = getCertSans(certPath);
  const todosIps = Array.from(new Set(['localhost', '127.0.0.1', '::1', ...ipsAtivos, ...sansExistentes]));

  const certsDir = path.dirname(certPath);
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const comando = `mkcert -cert-file "${certPath}" -key-file "${keyPath}" ${todosIps.join(' ')}`;
  execSync(comando, { stdio: 'pipe' });

  // Sincronizar autoridade raiz (rootCA.crt) em public/
  try {
    const caRootOutput = execSync('mkcert -CAROOT', { encoding: 'utf8' }).trim();
    const sourceRootCA = path.join(caRootOutput, 'rootCA.pem');
    if (fs.existsSync(sourceRootCA)) {
      fs.copyFileSync(sourceRootCA, caPath);
    }
  } catch (err) {
    console.warn('[vite] Erro ao sincronizar rootCA.crt:', err);
  }

  return {
    sucesso: true,
    ips: todosIps,
    mensagem: `Certificado recriado com sucesso para: ${todosIps.join(', ')}`,
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ca-download-server',
      configureServer(server) {
        server.middlewares.use('/download-ca', (_req, res) => {
          if (fs.existsSync(caPath)) {
            const content = fs.readFileSync(caPath);
            res.writeHead(200, {
              'Content-Type': 'application/x-x509-ca-cert',
              'Content-Disposition': 'attachment; filename="rootCA.crt"',
              'Content-Length': content.length,
            });
            res.end(content);
          } else {
            res.writeHead(404);
            res.end('Certificado não encontrado');
          }
        });

        server.middlewares.use('/info-cert', (_req, res) => {
          const ipsAtivos = getActiveIpv4Addresses();
          const certSans = getCertSans(certPath);
          const todosPresentes = ipsAtivos.every((ip) => certSans.includes(ip));

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          });
          res.end(
            JSON.stringify({
              ipsAtivos,
              certSans,
              validoParaIpAtual: todosPresentes,
            })
          );
        });

        server.middlewares.use('/recriar-cert', async (req, res) => {
          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Método não permitido' }));
            return;
          }

          try {
            const resultado = recriarCertificados();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resultado));

            // Reinicia o servidor Vite para aplicar o novo certificado TLS em memória
            setTimeout(() => {
              server.restart().catch((e) => console.error('[vite] Erro ao reiniciar servidor:', e));
            }, 500);
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, error: err.message }));
          }
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: true,
    https: hasCustomCerts
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
