import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../application/contexts/AuthContext';
import { AppLayout, AppHeader } from '../../components';
import './HubPage.css';

export function HubPage() {
  const { user, temPermissao } = useAuth();
  const navigate = useNavigate();

  const podeSaida = temPermissao('conferencia_saida');
  const podeSeparacao = temPermissao('separacao');
  const podeReabastecimento = temPermissao('reabastecimento');
  const podeEnderecamento = temPermissao('enderecamento') || temPermissao('enderecamento_visualizar') || temPermissao('gerenciar_acessos');
  const podeEntrada = temPermissao('conferencia_entrada');
  const podeGestao = temPermissao('gestao_recebimento');
  const podeProdutos = temPermissao('consulta_produtos');
  const podeAcessos = temPermissao('gerenciar_acessos');

  const primeiroNome = user?.nomeUsu ? user.nomeUsu.split(' ')[0] : 'Usuário';

  return (
    <AppLayout>
      {({ openDrawer, abrirConsultaProduto }) => (
        <div className="page-container">
          <AppHeader
            titulo="ConferCheck Hub"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          <div className="hub-container">
            {/* Banner de Boas-Vindas */}
            <div className="hub-welcome-banner">
              <div className="hub-welcome-info">
                <h2 className="hub-welcome-greeting">
                  Olá, <span className="hub-welcome-user">{primeiroNome}</span>!
                </h2>
                <p className="hub-welcome-sub">
                  Selecione o módulo operacional que deseja acessar hoje:
                </p>
              </div>

              <div className="hub-user-pill">
                <span>👤 CODUSU: {user?.codUsu || '—'}</span>
              </div>
            </div>

            {/* Seção Operacional */}
            <div>
              <h3 className="hub-section-title">
                <span>📦</span> Seus Módulos Liberados
              </h3>

              <div className="hub-apps-grid">
                {/* Conferência de Saída */}
                {podeSaida && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/conferencias')}
                  >
                    <div className="hub-app-icon-wrapper saida">📦</div>
                    <span className="hub-app-label">Conferência de Saída</span>
                    <span className="hub-app-badge destaque-laranja">Expedição</span>
                  </button>
                )}

                {/* Separação de Cargas */}
                {podeSeparacao && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/separacao')}
                  >
                    <div className="hub-app-icon-wrapper separacao">🚚</div>
                    <span className="hub-app-label">Separação de Cargas</span>
                    <span className="hub-app-badge destaque-verde">Vendas</span>
                  </button>
                )}

                {/* Reabastecimento de Pulmão */}
                {podeReabastecimento && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/reabastecimento')}
                  >
                    <div className="hub-app-icon-wrapper reabastecimento">🚜</div>
                    <span className="hub-app-label">Reabastecimento</span>
                    <span className="hub-app-badge destaque-ciano">Pulmão</span>
                  </button>
                )}

                {/* Endereçamento WMS */}
                {podeEnderecamento && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/enderecamento')}
                  >
                    <div className="hub-app-icon-wrapper" style={{ background: '#fef3c7', color: '#d97706' }}>📍</div>
                    <span className="hub-app-label">Endereçamento</span>
                    <span className="hub-app-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>WMS</span>
                  </button>
                )}

                {/* Conferência de Entrada */}
                {podeEntrada && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/recebimento')}
                  >
                    <div className="hub-app-icon-wrapper entrada">📥</div>
                    <span className="hub-app-label">Conferência de Entrada</span>
                    <span className="hub-app-badge destaque-azul">Bipagem</span>
                  </button>
                )}

                {/* Gestão de Recebimento */}
                {podeGestao && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/recebimento/gestao')}
                  >
                    <div className="hub-app-icon-wrapper gestao">📋</div>
                    <span className="hub-app-label">Gestão Recebimento</span>
                    <span className="hub-app-badge destaque-roxo">Divergências</span>
                  </button>
                )}

                {/* Consulta de Produtos */}
                {podeProdutos && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => abrirConsultaProduto()}
                  >
                    <div className="hub-app-icon-wrapper produtos">🔍</div>
                    <span className="hub-app-label">Consultar Produto</span>
                    <span className="hub-app-badge">Estoque</span>
                  </button>
                )}

                {/* Gestão de Acessos */}
                {podeAcessos && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/configuracoes/acessos')}
                  >
                    <div className="hub-app-icon-wrapper acessos">🛡️</div>
                    <span className="hub-app-label">Gestão de Acessos</span>
                    <span className="hub-app-badge">Admin</span>
                  </button>
                )}

                {/* Banco de Dados */}
                {podeAcessos && (
                  <button
                    type="button"
                    className="hub-app-card"
                    onClick={() => navigate('/configuracoes/banco')}
                  >
                    <div className="hub-app-icon-wrapper banco">🗄️</div>
                    <span className="hub-app-label">Banco de Dados</span>
                    <span className="hub-app-badge">SQLite</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
