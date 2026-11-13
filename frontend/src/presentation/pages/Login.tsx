import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { Botao, Campo } from '../components';
import { mensagemErroLogin } from '../../domain/erros';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { getServerBaseUrl, setServerBaseUrl } from '../../infrastructure/api/httpClient';
import { Capacitor } from '@capacitor/core';

export function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Se já estiver autenticado, vai direto para o Hub/Início
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Configuração do Servidor Backend para Mobile / Coletor
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    setServerUrlInput(getServerBaseUrl());
  }, []);

  async function handleTestarServidor() {
    setTestStatus('testing');
    setTestMessage('Testando conexão...');
    try {
      const urlAlvo = (serverUrlInput || '').trim().replace(/\/+$/, '');
      const healthUrl = urlAlvo ? `${urlAlvo}/health` : '/health';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setTestStatus('success');
        setTestMessage('✅ Servidor alcançado com sucesso!');
      } else {
        setTestStatus('error');
        setTestMessage(`❌ Servidor respondeu com status ${res.status}.`);
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage('❌ Falha ao conectar no servidor. Verifique o IP/porta e o Wi-Fi.');
    }
  }

  function handleSalvarServidor() {
    setServerBaseUrl(serverUrlInput);
    setShowConfigModal(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(usuario, senha);
      navigate('/', { replace: true });
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
        <div className="login-panel-form" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h1 className="login-title" style={{ margin: 0 }}>Acessar Sistema</h1>
            {isNative && (
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput(getServerBaseUrl());
                  setTestStatus('idle');
                  setTestMessage('');
                  setShowConfigModal(true);
                }}
                title="Configurar Servidor Backend"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--slate-400)',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--slate-700)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--slate-400)')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            )}
          </div>
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

      {/* Modal de Configuração do Servidor Backend para Mobile / Coletor */}
      {isNative && showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowConfigModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>⚙️</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--slate-900)', fontWeight: 800 }}>
                  Servidor Backend
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: 'var(--slate-400)',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: 16, lineHeight: 1.45 }}>
              Defina o endereço e porta do servidor local onde o backend do ConferCheck está rodando na rede da sua empresa.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: 6 }}>
                URL / IP do Servidor:
              </label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="ex: http://192.168.0.94:3001"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid var(--slate-300)',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginTop: 4 }}>
                Deixe em branco para usar o endereço padrão do navegador.
              </span>
            </div>

            {testMessage && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: 16,
                  background: testStatus === 'success' ? '#ecfdf5' : testStatus === 'error' ? '#fff1f2' : '#f1f5f9',
                  color: testStatus === 'success' ? '#047857' : testStatus === 'error' ? '#e11d48' : '#334155',
                  border: `1px solid ${testStatus === 'success' ? '#a7f3d0' : testStatus === 'error' ? '#fecdd3' : '#e2e8f0'}`,
                }}
              >
                {testMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleTestarServidor}
                disabled={testStatus === 'testing'}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--slate-300)',
                  background: '#f8fafc',
                  color: 'var(--slate-700)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {testStatus === 'testing' ? 'Testando...' : '🔍 Testar Conexão'}
              </button>
              <button
                type="button"
                onClick={handleSalvarServidor}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--orange-500)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
