import { useState } from 'react';
import { httpClient } from '../../../infrastructure/api/httpClient';
import { Botao } from '../Botao/Botao';
import './ModalCertificado.css';

interface ModalCertificadoProps {
  aberto: boolean;
  onFechar: () => void;
}

export function ModalCertificado({ aberto, onFechar }: ModalCertificadoProps) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  if (!aberto) return null;

  async function handleBaixarCertificado() {
    try {
      setBaixando(true);
      setErro(null);

      const response = await httpClient.get('/api/sistema/certificado', {
        responseType: 'blob',
      });

      // Cria blob com o tipo de certificado CA
      const blob = new Blob([response.data], { type: 'application/x-x509-ca-cert' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'conferencia-ca.crt');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSucesso(true);
    } catch (err: any) {
      console.error('Erro ao baixar certificado:', err);
      const msgErro =
        err.response?.data?.error ||
        err.message ||
        'Não foi possível baixar o certificado. Verifique se o servidor Caddy gerou o arquivo.';
      setErro(msgErro);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal-certificado-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-certificado-header">
          <div className="modal-certificado-titulo-box">
            <div className="modal-certificado-icone">🛡️</div>
            <h2>Certificado HTTPS (CA)</h2>
          </div>
          <Botao variant="ghost" size="sm" onClick={onFechar}>
            ✕
          </Botao>
        </div>

        <div className="modal-certificado-intro">
          Instale o certificado raiz no seu celular ou tablet para que o Chrome reconheça a conexão HTTPS como 100% segura, permitindo o uso da <strong>câmera para leitura de códigos de barras</strong> e instalação do <strong>aplicativo PWA</strong> sem alertas.
        </div>

        <div className="modal-certificado-download-area">
          <Botao
            variant="primary"
            onClick={handleBaixarCertificado}
            loading={baixando}
            disabled={baixando}
          >
            {baixando ? 'Baixando...' : '📥 Baixar Certificado (.crt)'}
          </Botao>

          {sucesso && (
            <div className="modal-certificado-alerta-sucesso">
              ✓ Certificado baixado com sucesso! Siga o passo a passo abaixo para instalá-lo no celular.
            </div>
          )}

          {erro && (
            <div className="error-message" style={{ margin: 0 }}>
              {erro}
            </div>
          )}
        </div>

        <div className="modal-certificado-passos">
          <h3>Como instalar no Android:</h3>
          <ul className="passos-lista">
            <li className="passo-item">
              <span className="passo-num">1</span>
              <span>Toque no botão <strong>"Baixar Certificado (.crt)"</strong> acima.</span>
            </li>
            <li className="passo-item">
              <span className="passo-num">2</span>
              <span>No celular, abra <strong>Configurações &gt; Segurança</strong> (ou <em>Biometria e segurança / Proteção do dispositivo</em>).</span>
            </li>
            <li className="passo-item">
              <span className="passo-num">3</span>
              <span>Acesse <strong>Instalar certificado &gt; Certificado CA</strong> (se surgir alerta sobre privacidade de rede, confirme <em>"Instalar mesmo assim"</em>).</span>
            </li>
            <li className="passo-item">
              <span className="passo-num">4</span>
              <span>Selecione o arquivo baixado (<code>conferencia-ca.crt</code>) na pasta Downloads.</span>
            </li>
            <li className="passo-item">
              <span className="passo-num">5</span>
              <span>Feche e reabra o Google Chrome. A conexão agora estará segura com cadeado verde!</span>
            </li>
          </ul>
        </div>

        <div className="modal-certificado-footer">
          <Botao variant="secondary" size="sm" onClick={onFechar}>
            Fechar
          </Botao>
        </div>
      </div>
    </div>
  );
}
