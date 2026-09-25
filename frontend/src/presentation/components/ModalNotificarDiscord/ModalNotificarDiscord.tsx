import { useState, useEffect } from 'react';
import { PedidoConferencia, NotificacaoDiscordDados } from '../../../domain/models/Conferencia';
import { ConferenciaApiService } from '../../../infrastructure/api/ConferenciaApiService';
import { Botao } from '../Botao/Botao';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import './ModalNotificarDiscord.css';

interface ModalNotificarDiscordProps {
  aberto: boolean;
  onFechar: () => void;
  pedido: PedidoConferencia | null;
  usuario?: string;
}

const service = new ConferenciaApiService();

export function ModalNotificarDiscord({
  aberto,
  onFechar,
  pedido,
  usuario,
}: ModalNotificarDiscordProps) {
  const [dados, setDados] = useState<NotificacaoDiscordDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!aberto || !pedido) {
      setDados(null);
      setErro(null);
      setSucesso(false);
      return;
    }

    let cancelado = false;
    async function carregarPrevia() {
      try {
        setCarregando(true);
        setErro(null);
        setSucesso(false);
        const res = await service.obterPreviaDiscord(pedido!.nunota, usuario);
        if (!cancelado) {
          setDados(res);
        }
      } catch (err: any) {
        if (!cancelado) {
          setErro(err.response?.data?.error || err.message || 'Erro ao carregar prévia da notificação');
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregarPrevia();
    return () => {
      cancelado = true;
    };
  }, [aberto, pedido, usuario]);

  if (!aberto || !pedido) return null;

  async function handleEnviar() {
    try {
      setEnviando(true);
      setErro(null);
      await service.notificarDiscord(pedido!.nunota, usuario);
      setSucesso(true);
      setTimeout(() => {
        onFechar();
      }, 1800);
    } catch (err: any) {
      setErro(err.response?.data?.error || err.message || 'Erro ao enviar notificação ao Discord');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !enviando && onFechar()}>
      <div className="modal-card modal-discord-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="discord-header-row">
          <div className="discord-title-wrapper">
            <span className="discord-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </span>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Notificar no Discord</h2>
              <span className="modal-subtitle">Aviso de pendência de estoque e liberação</span>
            </div>
          </div>
          <button className="modal-close" onClick={onFechar} disabled={enviando}>×</button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="error-message" style={{ margin: '10px 0' }} onClick={() => setErro(null)}>
            {erro}
          </div>
        )}

        {/* Sucesso */}
        {sucesso && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
            <h3 style={{ color: 'var(--emerald-600, #16a34a)', fontWeight: 800 }}>Notificação enviada com sucesso!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '4px' }}>A equipe foi alertada no Discord.</p>
          </div>
        )}

        {/* Carregando prévia */}
        {carregando && !dados && !sucesso && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0' }}>
            <DotLottieReact
              src="https://lottie.host/f141a079-702f-4d37-88f7-c91b33722274/yQw3d1y8TG.lottie"
              autoplay
              loop
              style={{ width: '120px', height: '120px' }}
            />
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '8px' }}>
              Carregando itens pendentes do pedido...
            </p>
          </div>
        )}

        {/* Prévia dos dados formatados */}
        {!carregando && dados && !sucesso && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '8px' }}>
              A seguinte mensagem será enviada no canal do Discord:
            </p>
            <div className="discord-preview-box">
              <div><strong>Usuário SNK:</strong> {dados.usuarioSnk}</div>
              <div><strong>Razão Social:</strong> {dados.razaoSocial}</div>
              <div><strong>Pedido :</strong> {dados.pedido}</div>
              <div><strong>OC :</strong> {dados.oc}</div>
              <div style={{ marginTop: '8px' }}>
                <strong>Itens Pendentes:</strong>
              </div>
              <div style={{ color: '#f38ba8' }}>
                {dados.itensPendentes.join('\n')}
              </div>
              <div style={{ marginTop: '8px' }}>
                <strong>Estoque:</strong> {dados.estoque}
              </div>
              <div className="discord-preview-alert" style={{ marginTop: '10px' }}>
                {dados.mensagemFormatada.split('\n').pop()}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <Botao variant="secondary" size="md" onClick={onFechar} disabled={enviando}>
                Cancelar
              </Botao>
              <Botao
                variant="primary"
                size="md"
                className="btn-discord-action"
                onClick={handleEnviar}
                loading={enviando}
              >
                Enviar ao Discord
              </Botao>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
