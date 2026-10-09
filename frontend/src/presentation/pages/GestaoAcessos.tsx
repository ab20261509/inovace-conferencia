import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../application/contexts/AuthContext';
import { AcessosApiService } from '../../infrastructure/api/AcessosApiService';
import { ConfiguracaoTelasApiService } from '../../infrastructure/api/ConfiguracaoTelasApiService';
import { ConfiguracaoSistemaApiService } from '../../infrastructure/api/ConfiguracaoSistemaApiService';
import { UsuarioAcessoInfo, ModulosUsuario } from '../../domain/models/Auth';
import { CatalogoTela, CamposSensiveisConfig } from '../../domain/models/ConfiguracaoTela';
import { AppLayout, AppHeader, Campo, Container } from '../components';
import { Loading } from '../components/Loading/Loading';
import './GestaoAcessos.css';

const acessosService = new AcessosApiService();
const configTelasService = new ConfiguracaoTelasApiService();
const configSistemaService = new ConfiguracaoSistemaApiService();

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
  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'telas' | 'parametros'>('usuarios');

  // Estados Aba 1: Usuários
  const [usuarios, setUsuarios] = useState<UsuarioAcessoInfo[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  // Estados Aba 2: Campos por Tela
  const [catalogoTelas, setCatalogoTelas] = useState<CatalogoTela[]>([]);
  const [configCampos, setConfigCampos] = useState<CamposSensiveisConfig>({});
  const [telaSelecionadaId, setTelaSelecionadaId] = useState<string>('conferencia_saida');
  const [loadingTelas, setLoadingTelas] = useState(false);
  const [salvandoTela, setSalvandoTela] = useState(false);

  // Estados Aba 3: Parâmetros Operacionais
  const [paramN2Ativo, setParamN2Ativo] = useState<boolean>(true);
  const [loadingParametros, setLoadingParametros] = useState<boolean>(false);
  const [salvandoParametro, setSalvandoParametro] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const podeAcessar = temPermissao('gerenciar_acessos');

  // Carregar dados de usuários
  useEffect(() => {
    if (!podeAcessar) return;

    let cancelado = false;
    async function carregarUsuarios() {
      setLoadingUsuarios(true);
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
        if (!cancelado) setLoadingUsuarios(false);
      }
    }

    carregarUsuarios();
    return () => {
      cancelado = true;
    };
  }, [podeAcessar]);

  // Carregar dados de catálogo de telas e campos sensíveis
  useEffect(() => {
    if (!podeAcessar) return;

    let cancelado = false;
    async function carregarConfigTelas() {
      setLoadingTelas(true);
      try {
        const resp = await configTelasService.listarConfiguracaoTelas();
        if (!cancelado) {
          setCatalogoTelas(resp.catalogo);
          setConfigCampos(resp.configuracao);
          if (resp.catalogo.length > 0 && !resp.catalogo.some((t) => t.idTela === telaSelecionadaId)) {
            setTelaSelecionadaId(resp.catalogo[0].idTela);
          }
        }
      } catch (err: any) {
        if (!cancelado) {
          setFeedback({
            tipo: 'erro',
            texto: err.response?.data?.error || 'Erro ao carregar catálogo de telas e campos.',
          });
        }
      } finally {
        if (!cancelado) setLoadingTelas(false);
      }
    }

    carregarConfigTelas();
    return () => {
      cancelado = true;
    };
  }, [podeAcessar]);

  // Carregar parâmetros do sistema
  useEffect(() => {
    if (!podeAcessar) return;

    let cancelado = false;
    async function carregarParametros() {
      setLoadingParametros(true);
      try {
        const params = await configSistemaService.listarParametros();
        if (!cancelado) {
          if (params['conferencia_entrada_nivel2_ativo']) {
            setParamN2Ativo(params['conferencia_entrada_nivel2_ativo'].valor !== 'false');
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar parâmetros do sistema:', err);
      } finally {
        if (!cancelado) setLoadingParametros(false);
      }
    }

    carregarParametros();
    return () => {
      cancelado = true;
    };
  }, [podeAcessar]);

  async function handleToggleN2Param() {
    const novoValor = !paramN2Ativo;
    setParamN2Ativo(novoValor);
    setSalvandoParametro(true);
    setFeedback(null);

    try {
      await configSistemaService.salvarParametro(
        'conferencia_entrada_nivel2_ativo',
        novoValor ? 'true' : 'false',
        'Ativação da Conferência de Entrada Nível 2'
      );
      setFeedback({
        tipo: 'sucesso',
        texto: `Conferência de Entrada Nível 2 (N2) ${novoValor ? 'ativada' : 'inativada'} com sucesso!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3500);
    } catch (err: any) {
      setParamN2Ativo(!novoValor);
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao salvar configuração do Nível 2.',
      });
    } finally {
      setSalvandoParametro(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nomeUsu.toLowerCase().includes(termo) ||
        String(u.codUsu).includes(termo),
    );
  }, [usuarios, busca]);

  const telaAtual = useMemo(() => {
    return catalogoTelas.find((t) => t.idTela === telaSelecionadaId) || catalogoTelas[0];
  }, [catalogoTelas, telaSelecionadaId]);

  async function handleToggleUsuario(usuario: UsuarioAcessoInfo, modulo: keyof ModulosUsuario) {
    const novoValor = !usuario.modulos[modulo];
    const novosModulos = { ...usuario.modulos, [modulo]: novoValor };

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

  async function handleToggleCampoSensivel(idTela: string, chaveCampo: string) {
    const camposTelaAtual = configCampos[idTela] || {};
    const valorAtual = camposTelaAtual[chaveCampo] ?? true;
    const novoValor = !valorAtual;

    const novosCampos = {
      ...camposTelaAtual,
      [chaveCampo]: novoValor,
    };

    setConfigCampos((prev) => ({
      ...prev,
      [idTela]: novosCampos,
    }));

    setSalvandoTela(true);
    setFeedback(null);

    try {
      await configTelasService.salvarConfiguracaoTela(idTela, novosCampos);
      setFeedback({
        tipo: 'sucesso',
        texto: `Configuração do campo "${chaveCampo}" atualizada com sucesso!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3500);
    } catch (err: any) {
      // Reverter
      setConfigCampos((prev) => ({
        ...prev,
        [idTela]: camposTelaAtual,
      }));
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao salvar configuração do campo.',
      });
    } finally {
      setSalvandoTela(false);
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

            {/* Navegação de Abas Principais */}
            <div className="gestao-abas-nav">
              <button
                type="button"
                className={`gestao-aba-btn ${abaAtiva === 'usuarios' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('usuarios')}
              >
                <span className="gestao-aba-icone">👥</span>
                <span>Usuários & Módulos</span>
                <span className="gestao-aba-badge">{usuarios.length}</span>
              </button>
              <button
                type="button"
                className={`gestao-aba-btn ${abaAtiva === 'telas' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('telas')}
              >
                <span className="gestao-aba-icone">🛡️</span>
                <span>Campos Sensíveis por Tela</span>
                <span className="gestao-aba-badge">{catalogoTelas.length} telas</span>
              </button>
              <button
                type="button"
                className={`gestao-aba-btn ${abaAtiva === 'parametros' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('parametros')}
              >
                <span className="gestao-aba-icone">⚙️</span>
                <span>Parâmetros Operacionais</span>
                <span className={`gestao-aba-badge ${paramN2Ativo ? 'badge-n2-on' : 'badge-n2-off'}`}>
                  {paramN2Ativo ? 'N2 Ativo' : 'N2 Inativo'}
                </span>
              </button>
            </div>

            {/* ═══════════════════════════════════════════════════════
                ABA 1: USUÁRIOS & MÓDULOS
                ═══════════════════════════════════════════════════════ */}
            {abaAtiva === 'usuarios' && (
              <>
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

                {/* Loading state Usuários */}
                {loadingUsuarios ? (
                  <Loading mensagem="Carregando usuários do Sankhya..." />
                ) : (
                  <>
                    {/* Visualização Desktop: Tabela (> 1024px) */}
                    <div className="acessos-table-wrapper acessos-tabela-desktop">
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
                                      onChange={() => handleToggleUsuario(u, 'conferencia_saida')}
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
                                      onChange={() => handleToggleUsuario(u, 'conferencia_entrada')}
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
                                      onChange={() => handleToggleUsuario(u, 'consulta_produtos')}
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
                                      onChange={() => handleToggleUsuario(u, 'ver_campos_sensiveis')}
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
                                      onChange={() => handleToggleUsuario(u, 'gerenciar_acessos')}
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

                    {/* Visualização Mobile / Tablet: Cards (<= 1024px) */}
                    <div className="acessos-cards-mobile">
                      {usuariosFiltrados.map((u) => {
                        const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(u.nomeUsu.toUpperCase());
                        const ehUsuarioAtual = u.codUsu === user?.codUsu;

                        return (
                          <div key={`card-${u.codUsu}`} className="acesso-card-mobile">
                            {/* Header do Card */}
                            <div className="acesso-card-header">
                              <div className={`acessos-user-avatar ${ehAdminPadrao ? 'admin' : ''}`}>
                                {u.nomeUsu.charAt(0).toUpperCase()}
                              </div>
                              <div className="acesso-card-user-info">
                                <span className="acesso-card-user-name">
                                  {u.nomeUsu} {ehUsuarioAtual && '(Você)'}
                                </span>
                                <span className="acesso-card-user-sub">
                                  COD: {u.codUsu} {u.codGrupo ? `• Grupo: ${u.codGrupo}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Datas de Acesso */}
                            <div className="acesso-card-datas">
                              <div className="acesso-card-data-item">
                                <span className="acesso-card-data-label">1º Acesso:</span>
                                <span className="badge-data-acesso">{formatarAcesso(u.primeiroAcessoEm)}</span>
                              </div>
                              <div className="acesso-card-data-item">
                                <span className="acesso-card-data-label">Último Acesso:</span>
                                <span className="badge-ultimo-acesso">{formatarAcesso(u.ultimoAcessoEm)}</span>
                              </div>
                            </div>

                            {/* Grade de Permissões / Toggles */}
                            <div className="acesso-card-toggles">
                              <div className="acesso-card-toggle-item">
                                <span className="acesso-card-toggle-label">📦 Conf. Saída</span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={u.modulos.conferencia_saida}
                                    disabled={salvandoId === u.codUsu}
                                    onChange={() => handleToggleUsuario(u, 'conferencia_saida')}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              <div className="acesso-card-toggle-item">
                                <span className="acesso-card-toggle-label">📥 Recebimento</span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={u.modulos.conferencia_entrada}
                                    disabled={salvandoId === u.codUsu}
                                    onChange={() => handleToggleUsuario(u, 'conferencia_entrada')}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              <div className="acesso-card-toggle-item">
                                <span className="acesso-card-toggle-label">🔍 Consultar Prod.</span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={u.modulos.consulta_produtos}
                                    disabled={salvandoId === u.codUsu}
                                    onChange={() => handleToggleUsuario(u, 'consulta_produtos')}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              <div className="acesso-card-toggle-item">
                                <span className="acesso-card-toggle-label">👁️ Ver Sensíveis</span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={u.modulos.ver_campos_sensiveis}
                                    disabled={salvandoId === u.codUsu}
                                    onChange={() => handleToggleUsuario(u, 'ver_campos_sensiveis')}
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              <div className="acesso-card-toggle-item admin-toggle-row">
                                <span className="acesso-card-toggle-label">🛡️ Administrador</span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={u.modulos.gerenciar_acessos}
                                    disabled={salvandoId === u.codUsu || ehAdminPadrao}
                                    onChange={() => handleToggleUsuario(u, 'gerenciar_acessos')}
                                  />
                                  <span className="toggle-slider toggle-admin" />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {usuariosFiltrados.length === 0 && (
                        <div className="acessos-cards-vazio">
                          Nenhum usuário encontrado com o termo informado.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════
                ABA 2: CAMPOS SENSÍVEIS POR TELA
                ═══════════════════════════════════════════════════════ */}
            {abaAtiva === 'telas' && (
              <div className="gestao-telas-secao">
                {/* Seletor de Telas / Chips */}
                <div className="gestao-telas-selector">
                  {catalogoTelas.map((tela) => {
                    const isAtiva = tela.idTela === telaSelecionadaId;
                    const iconesPorTela: Record<string, string> = {
                      conferencia_saida: '📦',
                      conferencia_entrada: '📥',
                      consulta_produtos: '🔍',
                    };
                    const icone = iconesPorTela[tela.idTela] || '📄';
                    return (
                      <button
                        key={tela.idTela}
                        type="button"
                        className={`gestao-tela-chip ${isAtiva ? 'ativo' : ''}`}
                        onClick={() => setTelaSelecionadaId(tela.idTela)}
                      >
                        <span className="tela-chip-icone">{icone}</span>
                        <span className="tela-chip-nome">{tela.nomeTela}</span>
                        <span className="tela-chip-count">{tela.campos.length} campos</span>
                      </button>
                    );
                  })}
                </div>

                {/* Detalhes da Tela Selecionada */}
                {telaAtual && (
                  <div className="gestao-tela-detalhes">
                    <div className="gestao-tela-info-card">
                      <div className="gestao-tela-info-header">
                        <h3>{telaAtual.nomeTela}</h3>
                        <span className="badge-idtela">ID: {telaAtual.idTela}</span>
                      </div>
                      <p className="gestao-tela-info-desc">{telaAtual.descricao}</p>
                      <div className="gestao-tela-info-banner">
                        <span className="gestao-tela-banner-icone">ℹ️</span>
                        <div className="gestao-tela-banner-texto">
                          <strong>Regra Institucional de Proteção de Dados:</strong>
                          <span>
                            Campos ativados como <strong>Sensível</strong> nesta tela serão automaticamente mascarados e omitidos na origem para qualquer usuário que <u>NÃO</u> possua a permissão individual <em>&quot;Ver Sensíveis&quot;</em> configurada na aba de Usuários.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cards Responsivos dos Campos */}
                    {loadingTelas ? (
                      <Loading mensagem="Carregando catálogo de campos..." />
                    ) : (
                      <div className="gestao-campos-grid">
                        {telaAtual.campos.map((campo) => {
                          const ehSensivel = configCampos[telaAtual.idTela]?.[campo.chave] ?? campo.sensivelPadrao;

                          return (
                            <div
                              key={campo.chave}
                              className={`gestao-campo-card ${ehSensivel ? 'campo-sensivel-ativo' : ''}`}
                            >
                              <div className="gestao-campo-header">
                                <div className="gestao-campo-identificacao">
                                  <span className="gestao-campo-rotulo">{campo.rotulo}</span>
                                  <code className="gestao-campo-chave">{campo.chave}</code>
                                </div>
                                <div className="gestao-campo-status-badge">
                                  {ehSensivel ? (
                                    <span className="badge-sensivel">🔒 Sensível</span>
                                  ) : (
                                    <span className="badge-publico">👁️ Visível</span>
                                  )}
                                </div>
                              </div>

                              <p className="gestao-campo-descricao">{campo.descricao}</p>

                              <div className="gestao-campo-footer">
                                <span className="gestao-campo-toggle-label">
                                  {ehSensivel
                                    ? 'Oculto p/ usuários padrão'
                                    : 'Visível para todos os usuários'}
                                </span>
                                <label
                                  className="toggle-switch"
                                  title={`Definir "${campo.rotulo}" como sensível nesta tela`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={ehSensivel}
                                    disabled={salvandoTela}
                                    onChange={() => handleToggleCampoSensivel(telaAtual.idTela, campo.chave)}
                                  />
                                  <span className="toggle-slider toggle-sensivel" />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                ABA 3: PARÂMETROS OPERACIONAIS
                ═══════════════════════════════════════════════════════ */}
            {abaAtiva === 'parametros' && (
              <div className="gestao-parametros-secao">
                <div className="gestao-tela-info-card">
                  <div className="gestao-tela-info-header">
                    <h3>Parâmetros Globais do Sistema</h3>
                    <span className="badge-idtela">Configurações Operacionais</span>
                  </div>
                  <p className="gestao-tela-info-desc">
                    Regras gerais de conferência, validação de níveis e fluxos de recebimento e expedição.
                  </p>
                </div>

                {loadingParametros ? (
                  <Loading mensagem="Carregando parâmetros operacionais..." />
                ) : (
                  <div className="gestao-parametro-card">
                    <div className="gestao-parametro-header">
                      <div className="gestao-parametro-info">
                        <div className="gestao-parametro-titulo-row">
                          <span className="gestao-parametro-icone">📦</span>
                          <h4 className="gestao-parametro-titulo">Conferência de Entrada - Nível 2 (Dupla Conferência Cega)</h4>
                          <span className={`badge-parametro-status ${paramN2Ativo ? 'ativo' : 'inativo'}`}>
                            {paramN2Ativo ? '✓ Ativado' : '✕ Inativado'}
                          </span>
                        </div>
                        <p className="gestao-parametro-detalhes">
                          Quando <strong>ativado</strong>, o sistema exige dupla contagem cega independente (Nível 1 por um conferente e Nível 2 por outro).
                          Se houver divergência entre as contagens N1 e N2, o processo avança para Nível 3 (Reconferência) ou decisão gerencial.<br />
                          Quando <strong>desativado</strong>, o Nível 2 é dispensado e a conferência valida a contagem do Nível 1 diretamente contra os itens faturados da Nota Fiscal.
                        </p>
                      </div>
                      <div className="gestao-parametro-toggle-wrapper">
                        <label className="toggle-switch toggle-switch-lg" title="Ativar ou desativar Conferência de Entrada Nível 2">
                          <input
                            type="checkbox"
                            checked={paramN2Ativo}
                            disabled={salvandoParametro}
                            onChange={handleToggleN2Param}
                          />
                          <span className="toggle-slider toggle-operacao" />
                        </label>
                      </div>
                    </div>

                    <div className="gestao-parametro-fluxo-explicacao">
                      <div className={`fluxo-modo-box ${paramN2Ativo ? 'modo-destaque' : ''}`}>
                        <div className="fluxo-modo-header">
                          <span className="fluxo-icone">🔒</span>
                          <strong>Fluxo com N2 Ativado (Recomendado para Alto Risco / Dupla Validação)</strong>
                        </div>
                        <ul>
                          <li><strong>Nível 1:</strong> Conferente 1 faz contagem cega física sem ver as quantidades da nota.</li>
                          <li><strong>Nível 2:</strong> Outro conferente repete a contagem física independente.</li>
                          <li><strong>Convergência:</strong> Se N1 == N2 == Nota Fiscal, nota aprovada automaticamente.</li>
                          <li><strong>Divergência:</strong> Se N1 != N2 ou divergência com a NF, a nota vai para <em>Divergências</em> na Gestão de Recebimento.</li>
                        </ul>
                      </div>

                      <div className={`fluxo-modo-box ${!paramN2Ativo ? 'modo-destaque' : ''}`}>
                        <div className="fluxo-modo-header">
                          <span className="fluxo-icone">⚡</span>
                          <strong>Fluxo com N2 Inativado (Modo Ágil / Contagem Única)</strong>
                        </div>
                        <ul>
                          <li><strong>Nível 1:</strong> Conferente 1 faz a contagem física cega.</li>
                          <li><strong>Finalização Direta:</strong> Se N1 coincidir exatamente com a NF, a conferência é finalizada com sucesso.</li>
                          <li><strong>Divergência com a NF:</strong> Caso falte ou sobre produto em relação à NF, a conferência é marcada como <em>Divergente</em> para o gestor.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
