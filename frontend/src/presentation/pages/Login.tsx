import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { Botao, Campo } from '../components';
import { mensagemErroLogin } from '../../domain/erros';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const perms = await login(usuario, senha);
      if (perms?.conferencia_saida) {
        navigate('/conferencias');
      } else if (perms?.conferencia_entrada) {
        navigate('/recebimento');
      } else if (perms?.gerenciar_acessos) {
        navigate('/configuracoes/acessos');
      } else {
        navigate('/recebimento');
      }
    } catch (err: unknown) {
      setError(mensagemErroLogin(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Painel escuro */}
        <div className="login-panel-dark">
          <div className="login-brand">
            <div className="login-brand-logo">
              <div className="login-brand-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M9 17H5a2 2 0 0 0-2 2v1h18v-1a2 2 0 0 0-2-2h-4"/>
                  <path d="M12 17V3"/>
                  <path d="m8 7 4-4 4 4"/>
                  <rect x="7" y="11" width="10" height="6" rx="1"/>
                </svg>
              </div>
              <span>Confer<span style={{color: 'var(--orange-500)'}}>Check</span></span>
            </div>
            <h2>
              Controle total da sua<br/>
              <span>conferência de saída.</span>
            </h2>
            <p>Sistema de conferência cega integrado ao Sankhya para gestão de expedição em tempo real.</p>

            <div style={{ width: '200px', height: '200px', margin: '24px auto 0' }}>
              <DotLottieReact
                src="https://lottie.host/9ea946f2-11b8-4c08-8a5c-ef92d7583abe/GDn1GXbgRO.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
          <div className="login-footer-dark">
            © 2026 ConferCheck. Integrado ao ERP Sankhya.
          </div>
        </div>

        {/* Painel do formulário */}
        <div className="login-panel-form">
          <h1 className="login-title">Acessar Sistema</h1>
          <p className="login-subtitle">Insira suas credenciais do Sankhya para continuar.</p>

          <form onSubmit={handleSubmit}>
            <Campo
              label="Usuário"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Digite o seu login"
              autoComplete="username"
              required
              autoFocus
            />

            <div style={{ marginTop: 20 }}>
              <Campo
                label="Senha de acesso"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Erro em bloco próprio: a mensagem pode ser longa (ERP fora do
                ar, credencial de integração) e não caberia sob o campo. */}
            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginTop: 28 }}>
              <Botao type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                Entrar no Sistema
              </Botao>
            </div>
          </form>

          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--slate-100)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
              Problemas com o acesso?<br/>
              <strong style={{ color: 'var(--slate-900)' }}>Contate o Supervisor</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
