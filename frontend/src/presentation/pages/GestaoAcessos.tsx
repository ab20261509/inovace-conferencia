import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../application/contexts/AuthContext';
import { AcessosApiService } from '../../infrastructure/api/AcessosApiService';
import { UsuarioAcessoInfo, ModulosUsuario } from '../../domain/models/Auth';
import { AppLayout, AppHeader, Botao, Campo, Container } from '../components';
import { Loading } from '../components/Loading/Loading';
import './GestaoAcessos.css';

const acessosService = new AcessosApiService();

function formatarAcesso(isoDate?: string): string {
  if (!isoDate) return 'Aguardando 1º login';
  try {
    const data = new Date(isoDate);
    const agora = new Date();
    const ehHoje = data.toDateString() === agora.toDateString();
    const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (ehHoje) {
      return `Hoje às ${hora}`;
    }
    const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${dia} às ${hora}`;
  } catch {
    return isoDate;
  }
}

export function GestaoAcessosPage() {
  const { temPermissao, user } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAcessoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const podeAcessar = temPermissao('gerenciar_acessos');

  useEffect(() => {
    if (!podeAcessar) return;

    let cancelado = false;
    async function carregar() {
      setLoading(true);
      try {
        const dados = await acessosService.listarUsuarios();
        if (!cancelado) {
          setUsuarios(dados);
        }
      } catch (err: any) {
        if (!cancelado) {
          setFeedback({
            tipo: 'erro',
            texto: err.response?.data?.error || 'Erro ao carregar lista de usuários.',
          });
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [podeAcessar]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nomeUsu.toLowerCase().includes(termo) ||
        String(u.codUsu).includes(termo),
    );
  }, [usuarios, busca]);

  async function handleToggle(usuario: UsuarioAcessoInfo, modulo: keyof ModulosUsuario) {
    const novoValor = !usuario.modulos[modulo];
    const novosModulos = { ...usuario.modulos, [modulo]: novoValor };

    // Atualização otimista na tela
    setUsuarios((atuais) =>
      atuais.map((u) => (u.codUsu === usuario.codUsu ? { ...u, modulos: novosModulos } : u)),
    );

    setSalvandoId(usuario.codUsu);
    setFeedback(null);

    try {
      await acessosService.salvarAcessos(usuario.codUsu, novosModulos);
      setFeedback({
        tipo: 'sucesso',
        texto: `Acessos do usuário ${usuario.nomeUsu} salvos com sucesso!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3500);
    } catch (err: any) {
      // Reverter alteração otimista em caso de erro
      setUsuarios((atuais) =>
        atuais.map((u) => (u.codUsu === usuario.codUsu ? { ...u, modulos: usuario.modulos } : u)),
      );
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao salvar alterações de permissão.',
      });
    } finally {
      setSalvandoId(null);
    }
  }

  if (!podeAcessar) {
    return (
      <AppLayout>
        {({ openDrawer, abrirConsultaProduto }) => (
          <div className="page-container">
            <AppHeader
              titulo="Gestão de Acessos"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />
            <Container variant="default" padding="lg">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span style={{ fontSize: '3rem' }}>🔒</span>
                <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito</h2>
                <p style={{ color: 'var(--slate-500)', marginTop: '8px' }}>
                  Seu usuário não possui permissão para gerenciar os acessos e módulos do sistema.
                </p>
              </div>
            </Container>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {({ openDrawer, abrirConsultaProduto }) => (
        <div className="page-container">
          <AppHeader
            titulo="Gestão de Acessos"
            subtitulo="Configuração de módulos e visibilidade por usuário"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          <div className="acessos-container">
            {/* Feedback alert */}
            {feedback && (
              <div className={`acessos-feedback ${feedback.tipo}`}>
                {feedback.tipo === 'sucesso' ? '✓' : '⚠'} {feedback.texto}
              </div>
            )}

            {/* Barra de Ferramentas / Busca */}
            <Container variant="default" padding="sm" className="acessos-toolbar">
              <div className="acessos-search">
                <Campo
                  type="text"
                  placeholder="Buscar por nome do usuário ou CODUSU..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="acessos-count">
                {usuariosFiltrados.length} usuário(s) encontrado(s)
              </div>
            </Container>

            {/* Loading state */}
            {loading ? (
              <Loading mensagem="Carregando usuários do Sankhya..." />
            ) : (
              <div className="acessos-table-wrapper">
                <table className="acessos-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th title="Data e hora do primeiro acesso do usuário no sistema">1º Acesso</th>
                      <th title="Data e hora do último acesso do usuário no sistema">Último Acesso</th>
                      <th title="Acesso ao módulo de conferência de pedidos de saída">Conf. Saída</th>
                      <th title="Acesso ao módulo de conferência de notas de entrada (recebimento)">Recebimento</th>
                      <th title="Permissão para consultar cadastro de produtos e estoque">Consultar Prod.</th>
                      <th title="Exibe campos sensíveis: quantidade pedida, código de barras e referência">Ver Sensíveis</th>
                      <th title="Permite acessar esta tela e alterar permissões">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u) => {
                      const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(u.nomeUsu.toUpperCase());
                      const ehUsuarioAtual = u.codUsu === user?.codUsu;

                      return (
                        <tr key={u.codUsu}>
                          <td>
                            <div className="acessos-user-cell">
                              <div className={`acessos-user-avatar ${ehAdminPadrao ? 'admin' : ''}`}>
                                {u.nomeUsu.charAt(0).toUpperCase()}
                              </div>
                              <div className="acessos-user-details">
                                <span className="acessos-user-name">
                                  {u.nomeUsu} {ehUsuarioAtual && '(Você)'}
                                </span>
                                <span className="acessos-user-meta">
                                  COD: {u.codUsu} {u.codGrupo ? `• Grupo: ${u.codGrupo}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 1º Acesso */}
                          <td className="acessos-data-cell" title={u.primeiroAcessoEm || ''}>
                            <span className="badge-data-acesso">
                              {formatarAcesso(u.primeiroAcessoEm)}
                            </span>
                          </td>

                          {/* Último Acesso */}
                          <td className="acessos-data-cell" title={u.ultimoAcessoEm || ''}>
                            <span className="badge-ultimo-acesso">
                              {formatarAcesso(u.ultimoAcessoEm)}
                            </span>
                          </td>

                          {/* Conferência Saída */}
                          <td>
                            <label className="toggle-switch" title="Conferência de Saída">
                              <input
                                type="checkbox"
                                checked={u.modulos.conferencia_saida}
                                disabled={salvandoId === u.codUsu}
                                onChange={() => handleToggle(u, 'conferencia_saida')}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </td>

                          {/* Conferência Entrada (Recebimento) */}
                          <td>
                            <label className="toggle-switch" title="Conferência de Entrada (Recebimento)">
                              <input
                                type="checkbox"
                                checked={u.modulos.conferencia_entrada}
                                disabled={salvandoId === u.codUsu}
                                onChange={() => handleToggle(u, 'conferencia_entrada')}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </td>

                          {/* Consulta Produtos */}
                          <td>
                            <label className="toggle-switch" title="Consulta de Produtos">
                              <input
                                type="checkbox"
                                checked={u.modulos.consulta_produtos}
                                disabled={salvandoId === u.codUsu}
                                onChange={() => handleToggle(u, 'consulta_produtos')}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </td>

                          {/* Ver Campos Sensíveis */}
                          <td>
                            <label className="toggle-switch" title="Ver campos sensíveis (qtd pedida, cód. barras)">
                              <input
                                type="checkbox"
                                checked={u.modulos.ver_campos_sensiveis}
                                disabled={salvandoId === u.codUsu}
                                onChange={() => handleToggle(u, 'ver_campos_sensiveis')}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </td>

                          {/* Gerenciar Acessos (Admin) */}
                          <td>
                            <label className="toggle-switch" title="Gerenciar Acessos">
                              <input
                                type="checkbox"
                                checked={u.modulos.gerenciar_acessos}
                                disabled={salvandoId === u.codUsu || ehAdminPadrao}
                                onChange={() => handleToggle(u, 'gerenciar_acessos')}
                              />
                              <span className="toggle-slider toggle-admin" />
                            </label>
                          </td>
                        </tr>
                      );
                    })}

                    {usuariosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--slate-400)' }}>
                          Nenhum usuário encontrado com o termo informado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
