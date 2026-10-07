import { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Controller de Sistema
 * Operações e configurações globais do sistema, como download de certificados CA
 */
export class SistemaController {
  /**
   * Localiza o arquivo root.crt gerado pelo Caddy em diferentes ambientes
   */
  private encontrarCertificado(): string | null {
    const candidatePaths = [
      '/certs/root.crt',
      '/caddy-data/caddy/pki/authorities/local/root.crt',
      path.resolve(__dirname, '../../../../caddy/data/caddy/pki/authorities/local/root.crt'),
      path.resolve(__dirname, '../../../../../caddy/data/caddy/pki/authorities/local/root.crt'),
      path.resolve(process.cwd(), '../caddy/data/caddy/pki/authorities/local/root.crt'),
      path.resolve(process.cwd(), 'caddy/data/caddy/pki/authorities/local/root.crt'),
    ];

    for (const certPath of candidatePaths) {
      if (fs.existsSync(certPath)) {
        return certPath;
      }
    }

    return null;
  }

  /**
   * GET /api/sistema/certificado
   * Faz o download do certificado raiz CA do Caddy para instalação nos clientes/celulares
   */
  async baixarCertificado(_req: Request, res: Response): Promise<void> {
    try {
      const certPath = this.encontrarCertificado();

      if (!certPath) {
        res.status(404).json({
          error: 'Certificado raiz (root.crt) ainda não foi gerado pelo Caddy ou não foi encontrado.',
        });
        return;
      }

      res.setHeader('Content-Type', 'application/x-x509-ca-cert');
      res.download(certPath, 'conferencia-ca.crt', (err) => {
        if (err && !res.headersSent) {
          console.error('❌ Erro ao enviar certificado:', err);
          res.status(500).json({ error: 'Falha ao baixar o arquivo de certificado' });
        }
      });
    } catch (error: any) {
      console.error('❌ Erro em /sistema/certificado:', error.message);
      res.status(500).json({ error: error.message || 'Erro interno ao processar certificado' });
    }
  }
}
