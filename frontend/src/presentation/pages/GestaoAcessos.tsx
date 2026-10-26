import { useState, useEffect, useMemo, ReactNode } from 'react';
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
  const { temPermissao, user, carregarPermissoes } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'telas' | 'parametros'>('usuarios');

  // Estados Aba 1: Usuários
  const [usuarios, setUsuarios] = useState<UsuarioAcessoInfo[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [usuarioDrawerId, setUsuarioDrawerId] = useState<number | null>(null);

  const usuarioDrawer = useMemo(() => {
    return usuarios.find((u) => u.codUsu === usuarioDrawerId) || null;
  }, [usuarios, usuarioDrawerId]);

  // Fechar gaveta lateral ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && usuarioDrawerId !== null) {
        setUsuarioDrawerId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usuarioDrawerId]);

  // Estados Aba 2: Campos por Tela
  const [catalogoTelas, setCatalogoTelas] = useState<CatalogoTela[]>([]);
  const [configCampos, setConfigCampos] = useState<CamposSensiveisConfig>({});
  const [telaSelecionadaId, setTelaSelecionadaId] = useState<string>('conferencia_saida');
  const [loadingTelas, setLoadingTelas] = useState(false);
  const [salvandoTela, setSalvandoTela] = useState(false);

  // Estados Aba 3: Parâmetros Operacionais
  const [paramN1Ativo, setParamN1Ativo] = useState<boolean>(true);
  const [paramN2Ativo, setParamN2Ativo] = useState<boolean>(true);
  const [paramShelfLifeDias, setParamShelfLifeDias] = useState<number>(90);
  const [loadingParametros, setLoadingParametros] = useState<boolean>(false);
  const [salvandoParametro, setSalvandoParametro] = useState<boolean>(false);
  const [salvandoShelfLife, setSalvandoShelfLife] = useState<boolean>(false);
  const [descricoesAbertas, setDescricoesAbertas] = useState<{ n1: boolean; n2: boolean; shelfLife: boolean }>({
    n1: false,
    n2: false,
    shelfLife: false,
  });

  const toggleDescricao = (nivel: 'n1' | 'n2' | 'shelfLife') => {
    setDescricoesAbertas((prev) => ({
      ...prev,
      [nivel]: !prev[nivel],
    }));
  };

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
          if (params['conferencia_entrada_nivel1_ativo']) {
            setParamN1Ativo(params['conferencia_entrada_nivel1_ativo'].valor !== 'false');
          }
          if (params['conferencia_entrada_nivel2_ativo']) {
            setParamN2Ativo(params['conferencia_entrada_nivel2_ativo'].valor !== 'false');
          }
          if (params['recebimento_shelf_life_dias_alerta']) {
            const n = parseInt(params['recebimento_shelf_life_dias_alerta'].valor, 10);
            if (!isNaN(n) && n > 0) {
              setParamShelfLifeDias(n);
            }
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

  async function handleToggleN1Param() {
    const novoValor = !paramN1Ativo;

    // Regra de segurança: não permitir desativar ambos N1 e N2
    if (!novoValor && !paramN2Ativo) {
      setFeedback({
        tipo: 'erro',
        texto: 'Atenção: Pelo menos um nível de conferência (N1 ou N2) deve permanecer ativo no sistema.',
      });
      return;
    }

    setParamN1Ativo(novoValor);
    setSalvandoParametro(true);
    setFeedback(null);

    try {
      await configSistemaService.salvarParametro(
        'conferencia_entrada_nivel1_ativo',
        novoValor ? 'true' : 'false',
        'Ativa a 1ª contagem cega simples no Recebimento de Mercadorias'
      );
      setFeedback({
        tipo: 'sucesso',
        texto: `Conferência de Entrada Nível 1 (N1) ${novoValor ? 'ativada' : 'inativada'} com sucesso!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3500);
    } catch (err: any) {
      setParamN1Ativo(!novoValor);
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao salvar configuração do Nível 1.',
      });
    } finally {
      setSalvandoParametro(false);
    }
  }

  async function handleToggleN2Param() {
    const novoValor = !paramN2Ativo;

    // Regra de segurança: não permitir desativar ambos N1 e N2
    if (!novoValor && !paramN1Ativo) {
      setFeedback({
        tipo: 'erro',
        texto: 'Atenção: Pelo menos um nível de conferência (N1 ou N2) deve permanecer ativo no sistema.',
      });
      return;
    }

    setParamN2Ativo(novoValor);
    setSalvandoParametro(true);
    setFeedback(null);

    try {
      await configSistemaService.salvarParametro(
        'conferencia_entrada_nivel2_ativo',
        novoValor ? 'true' : 'false',
        'Ativa a 2ª contagem obrigatória (N2 com Lote e Validade) no Recebimento de Mercadorias'
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

  async function handleSalvarShelfLife() {
    if (paramShelfLifeDias <= 0 || isNaN(paramShelfLifeDias)) {
      setFeedback({
        tipo: 'erro',
        texto: 'Por favor, informe uma quantidade válida de dias (número maior que zero).',
      });
      return;
    }

    setSalvandoShelfLife(true);
    setFeedback(null);

    try {
      await configSistemaService.salvarParametro(
        'recebimento_shelf_life_dias_alerta',
        String(paramShelfLifeDias),
        'Tolerância de shelf-life em dias para alerta de validade próxima no recebimento'
      );
      setFeedback({
        tipo: 'sucesso',
        texto: `Tolerância de Validade Próxima atualizada para ${paramShelfLifeDias} dias com sucesso!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3500);
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao salvar parâmetro de shelf-life.',
      });
    } finally {
      setSalvandoShelfLife(false);
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
    const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(usuario.nomeUsu.toUpperCase());
    const ehAdmin = ehAdminPadrao || !!usuario.modulos.gerenciar_acessos;

    if (ehAdminPadrao && modulo === 'gerenciar_acessos') {
      setFeedback({
        tipo: 'erro',
        texto: 'Administrador nativo não pode ter o acesso de gestão revogado.',
      });
      return;
    }

    let valorAtual: boolean;
    if (modulo === 'conferencia_entrada_n1' || modulo === 'conferencia_entrada_n2' || modulo === 'conferencia_entrada_n3') {
      valorAtual = usuario.modulos[modulo] !== false;
    } else if (modulo === 'conferencia_entrada_divergente' || modulo === 'conferencia_entrada_conferido') {
      valorAtual = usuario.modulos[modulo] === true || (ehAdmin && usuario.modulos[modulo] !== false);
    } else {
      valorAtual = !!usuario.modulos[modulo];
    }

    const novoValor = !valorAtual;
    const novosModulos: ModulosUsuario = { ...usuario.modulos, [modulo]: novoValor };

    if (ehAdminPadrao) {
      novosModulos.gerenciar_acessos = true;
    }

    setUsuarios((atuais) =>
      atuais.map((u) => (u.codUsu === usuario.codUsu ? { ...u, modulos: novosModulos } : u)),
    );

    setSalvandoId(usuario.codUsu);
    setFeedback(null);

    try {
      await acessosService.salvarAcessos(usuario.codUsu, novosModulos);
      if (user && (usuario.codUsu === user.codUsu || usuario.nomeUsu.toUpperCase() === user.nomeUsu.toUpperCase())) {
        await carregarPermissoes();
      }
      setFeedback({
        tipo: 'sucesso',
        texto: `Permissão de ${usuario.nomeUsu} atualizada com sucesso!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3000);
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

  async function handleAplicarPerfil(
    usuario: UsuarioAcessoInfo,
    perfil: 'conferente' | 'gestor' | 'admin' | 'limpar'
  ) {
    const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(usuario.nomeUsu.toUpperCase());

    let novosModulos: ModulosUsuario;
    if (perfil === 'conferente') {
      novosModulos = {
        conferencia_saida: true,
        conferencia_entrada: true,
        gestao_recebimento: false,
        gestao_recebimento_aba_divergencias: false,
        gestao_recebimento_aba_envio_sankhya: false,
        gestao_recebimento_aba_ocorrencias: false,
        gestao_recebimento_backup: false,
        conferencia_entrada_n1: true,
        conferencia_entrada_n2: true,
        conferencia_entrada_n3: true,
        conferencia_entrada_divergente: false,
        conferencia_entrada_conferido: false,
        consulta_produtos: true,
        ver_campos_sensiveis: false,
        gerenciar_acessos: false,
        bipar_por_codprod: false,
      };
    } else if (perfil === 'gestor') {
      novosModulos = {
        conferencia_saida: true,
        conferencia_entrada: true,
        gestao_recebimento: true,
        gestao_recebimento_aba_divergencias: true,
        gestao_recebimento_aba_envio_sankhya: true,
        gestao_recebimento_aba_ocorrencias: true,
        gestao_recebimento_backup: true,
        conferencia_entrada_n1: true,
        conferencia_entrada_n2: true,
        conferencia_entrada_n3: true,
        conferencia_entrada_divergente: true,
        conferencia_entrada_conferido: true,
        consulta_produtos: true,
        ver_campos_sensiveis: true,
        gerenciar_acessos: false,
        bipar_por_codprod: false,
      };
    } else if (perfil === 'admin') {
      novosModulos = {
        conferencia_saida: true,
        conferencia_entrada: true,
        gestao_recebimento: true,
        gestao_recebimento_aba_divergencias: true,
        gestao_recebimento_aba_envio_sankhya: true,
        gestao_recebimento_aba_ocorrencias: true,
        gestao_recebimento_backup: true,
        conferencia_entrada_n1: true,
        conferencia_entrada_n2: true,
        conferencia_entrada_n3: true,
        conferencia_entrada_divergente: true,
        conferencia_entrada_conferido: true,
        consulta_produtos: true,
        ver_campos_sensiveis: true,
        gerenciar_acessos: true,
        bipar_por_codprod: true,
      };
    } else {
      novosModulos = {
        conferencia_saida: false,
        conferencia_entrada: false,
        gestao_recebimento: false,
        gestao_recebimento_aba_divergencias: false,
        gestao_recebimento_aba_envio_sankhya: false,
        gestao_recebimento_aba_ocorrencias: false,
        gestao_recebimento_backup: false,
        conferencia_entrada_n1: false,
        conferencia_entrada_n2: false,
        conferencia_entrada_n3: false,
        conferencia_entrada_divergente: false,
        conferencia_entrada_conferido: false,
        consulta_produtos: false,
        ver_campos_sensiveis: false,
        gerenciar_acessos: false,
        bipar_por_codprod: false,
      };
    }

    if (ehAdminPadrao) {
      novosModulos.gerenciar_acessos = true;
    }

    setUsuarios((atuais) =>
      atuais.map((u) => (u.codUsu === usuario.codUsu ? { ...u, modulos: novosModulos } : u))
    );

    setSalvandoId(usuario.codUsu);
    setFeedback(null);

    try {
      await acessosService.salvarAcessos(usuario.codUsu, novosModulos);
      if (
        user &&
        (usuario.codUsu === user.codUsu || usuario.nomeUsu.toUpperCase() === user.nomeUsu.toUpperCase())
      ) {
        await carregarPermissoes();
      }
      setFeedback({
        tipo: 'sucesso',
        texto: `Perfil aplicado com sucesso para ${usuario.nomeUsu}!`,
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.tipo === 'sucesso' ? null : prev));
      }, 3000);
    } catch (err: any) {
      setUsuarios((atuais) =>
        atuais.map((u) => (u.codUsu === usuario.codUsu ? { ...u, modulos: usuario.modulos } : u))
      );
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao aplicar perfil no usuário.',
      });
    } finally {
      setSalvandoId(null);
    }
  }

  function renderBadgesUsuario(u: UsuarioAcessoInfo) {
    const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(u.nomeUsu.toUpperCase());
    const ehAdmin = ehAdminPadrao || !!u.modulos.gerenciar_acessos;
    const divAtivo =
      u.modulos.conferencia_entrada_divergente === true ||
      (ehAdmin && u.modulos.conferencia_entrada_divergente !== false);
    const confAtivo =
      u.modulos.conferencia_entrada_conferido === true ||
      (ehAdmin && u.modulos.conferencia_entrada_conferido !== false);

    const badges: ReactNode[] = [];

    if (ehAdmin) {
      badges.push(
        <span key="admin" className="badge-flag badge-admin" title="Administrador do Sistema">
          🛡️ Admin
        </span>
      );
    }
    if (u.modulos.conferencia_saida) {
      badges.push(
        <span key="saida" className="badge-flag badge-saida" title="Conferência de Saída">
          📦 Saída
        </span>
      );
    }
    if (u.modulos.conferencia_entrada) {
      badges.push(
        <span key="entrada" className="badge-flag badge-entrada" title="Conferência de Entrada (Bipagem)">
          📥 Entrada
        </span>
      );
    }
    if (u.modulos.gestao_recebimento) {
      const abasGestao: string[] = [];
      if (ehAdmin || u.modulos.gestao_recebimento_aba_divergencias) abasGestao.push('Div');
      if (ehAdmin || u.modulos.gestao_recebimento_aba_envio_sankhya) abasGestao.push('Envio');
      if (ehAdmin || u.modulos.gestao_recebimento_aba_ocorrencias) abasGestao.push('Ocorr');
      if (ehAdmin || u.modulos.gestao_recebimento_backup) abasGestao.push('Bkp');

      const detalheAbas = abasGestao.length > 0 ? ` (${abasGestao.join('·')})` : ' (Conf)';
      badges.push(
        <span
          key="gestao"
          className="badge-flag badge-gestao"
          title={`Gestão de Recebimento. Abas ativas: Conferências${abasGestao.length > 0 ? ', ' + abasGestao.join(', ') : ''}`}
        >
          📋 Gestão{detalheAbas}
        </span>
      );
    }
    if (u.modulos.consulta_produtos) {
      badges.push(
        <span key="prod" className="badge-flag badge-produtos" title="Consulta de Produtos">
          🔍 Produtos
        </span>
      );
    }
    if (u.modulos.ver_campos_sensiveis) {
      badges.push(
        <span key="sens" className="badge-flag badge-sensiveis" title="Visualiza Campos Sensíveis">
          👁️ Sensíveis
        </span>
      );
    }
    if (u.modulos.bipar_por_codprod) {
      badges.push(
        <span key="codprod" className="badge-flag" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }} title="Pode Bipar por Código do Produto (CODPROD)">
          🔢 CODPROD
        </span>
      );
    }

    if (u.modulos.conferencia_entrada || u.modulos.gestao_recebimento) {
      const niveis: string[] = [];
      if (u.modulos.conferencia_entrada_n1 !== false) niveis.push('N1');
      if (u.modulos.conferencia_entrada_n2 !== false) niveis.push('N2');
      if (u.modulos.conferencia_entrada_n3 !== false) niveis.push('N3');
      if (divAtivo) niveis.push('Div');
      if (confAtivo) niveis.push('Conf');

      if (niveis.length > 0) {
        badges.push(
          <span
            key="niveis"
            className="badge-flag badge-niveis-resumo"
            title={`Níveis e Visão: ${niveis.join(', ')}`}
          >
            {niveis.join(' · ')}
          </span>
        );
      }
    }

    if (badges.length === 0) {
      return <span className="badge-sem-flags">Nenhuma permissão ativa</span>;
    }

    return <div className="acessos-badges-list">{badges}</div>;
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
                <span className="gestao-aba-badges-wrapper">
                  <span className={`gestao-aba-badge ${paramN1Ativo ? 'badge-n2-on' : 'badge-n2-off'}`}>
                    {paramN1Ativo ? 'N1 Ativo' : 'N1 Inativo'}
                  </span>
                  <span className={`gestao-aba-badge ${paramN2Ativo ? 'badge-n2-on' : 'badge-n2-off'}`}>
                    {paramN2Ativo ? 'N2 Ativo' : 'N2 Inativo'}
                  </span>
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
                    {/* Visualização Desktop: Tabela Compacta (> 1024px) */}
                    <div className="acessos-table-wrapper acessos-tabela-desktop">
                      <table className="acessos-table acessos-table-compacta">
                        <thead>
                          <tr>
                            <th style={{ width: '280px' }}>Usuário</th>
                            <th style={{ width: '200px' }} title="Último login e primeiro acesso no sistema">Acessos</th>
                            <th>Módulos & Flags Ativas</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuariosFiltrados.map((u) => {
                            const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(u.nomeUsu.toUpperCase());
                            const ehUsuarioAtual = u.codUsu === user?.codUsu;
                            const isDrawerAbertoParaEsse = usuarioDrawerId === u.codUsu;

                            return (
                              <tr
                                key={u.codUsu}
                                className={`acessos-linha-clicavel ${isDrawerAbertoParaEsse ? 'linha-selecionada' : ''}`}
                                onClick={() => setUsuarioDrawerId(u.codUsu)}
                              >
                                <td>
                                  <div className="acessos-user-cell">
                                    <div className={`acessos-user-avatar ${ehAdminPadrao ? 'admin' : ''}`}>
                                      {u.nomeUsu.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="acessos-user-details">
                                      <span className="acessos-user-name">
                                        {u.nomeUsu} {ehUsuarioAtual && <span className="tag-voce">(Você)</span>}
                                      </span>
                                      <span className="acessos-user-meta">
                                        COD: {u.codUsu} {u.codGrupo ? `• Grupo: ${u.codGrupo}` : ''}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Acessos */}
                                <td className="acessos-data-cell">
                                  <div className="acessos-datas-col">
                                    <span className="badge-ultimo-acesso" title={`Último: ${u.ultimoAcessoEm || 'Nunca'}`}>
                                      Último: {formatarAcesso(u.ultimoAcessoEm)}
                                    </span>
                                    {u.primeiroAcessoEm && (
                                      <span className="badge-data-sub" title={`1º Acesso: ${u.primeiroAcessoEm}`}>
                                        1º: {formatarAcesso(u.primeiroAcessoEm)}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Módulos Ativos */}
                                <td>
                                  {renderBadgesUsuario(u)}
                                </td>

                                {/* Ação de Gerenciar */}
                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className={`btn-gerenciar-flags ${isDrawerAbertoParaEsse ? 'ativo' : ''}`}
                                    onClick={() => setUsuarioDrawerId(u.codUsu)}
                                    title="Abrir gaveta lateral de permissões"
                                  >
                                    <span className="btn-gerenciar-icone">⚙️</span>
                                    <span>Gerenciar</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {usuariosFiltrados.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--slate-400)' }}>
                                Nenhum usuário encontrado com o termo informado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Visualização Mobile / Tablet: Cards Compactos (<= 1024px) */}
                    <div className="acessos-cards-mobile">
                      {usuariosFiltrados.map((u) => {
                        const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(u.nomeUsu.toUpperCase());
                        const ehUsuarioAtual = u.codUsu === user?.codUsu;
                        const isDrawerAbertoParaEsse = usuarioDrawerId === u.codUsu;

                        return (
                          <div
                            key={`card-${u.codUsu}`}
                            className={`acesso-card-mobile-compacto ${isDrawerAbertoParaEsse ? 'card-selecionado' : ''}`}
                            onClick={() => setUsuarioDrawerId(u.codUsu)}
                          >
                            <div className="acesso-card-header">
                              <div className={`acessos-user-avatar ${ehAdminPadrao ? 'admin' : ''}`}>
                                {u.nomeUsu.charAt(0).toUpperCase()}
                              </div>
                              <div className="acesso-card-user-info">
                                <span className="acesso-card-user-name">
                                  {u.nomeUsu} {ehUsuarioAtual && <span className="tag-voce">(Você)</span>}
                                </span>
                                <span className="acesso-card-user-sub">
                                  COD: {u.codUsu} {u.codGrupo ? `• Grupo: ${u.codGrupo}` : ''}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="btn-gerenciar-flags btn-mobile"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUsuarioDrawerId(u.codUsu);
                                }}
                              >
                                ⚙️ Editar
                              </button>
                            </div>

                            <div className="acesso-card-badges-wrapper">
                              {renderBadgesUsuario(u)}
                            </div>

                            <div className="acesso-card-footer-datas">
                              <span>Último login: {formatarAcesso(u.ultimoAcessoEm)}</span>
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
                  <div className="gestao-parametros-lista">
                    {/* CARD 1: NÍVEL 1 */}
                    <div className="gestao-parametro-card">
                      <div className="gestao-parametro-header">
                        <div className="gestao-parametro-info">
                          <div className="gestao-parametro-titulo-row">
                            <span className="gestao-parametro-icone">📦</span>
                            <h4 className="gestao-parametro-titulo">Conferência de Entrada - Nível 1 (1ª Contagem Cega)</h4>
                            <span className={`badge-parametro-status ${paramN1Ativo ? 'ativo' : 'inativo'}`}>
                              {paramN1Ativo ? '✓ Ativado' : '✕ Inativado'}
                            </span>
                          </div>
                          <p className="gestao-parametro-resumo-curto">
                            Primeira contagem física simples sem exibição prévia das quantidades faturadas da nota.
                          </p>
                          <button
                            type="button"
                            className="gestao-parametro-btn-toggle"
                            onClick={() => toggleDescricao('n1')}
                            title={descricoesAbertas.n1 ? 'Ocultar detalhes' : 'Exibir detalhes da rotina'}
                          >
                            <span>{descricoesAbertas.n1 ? '▲ Ocultar detalhes da rotina' : 'ℹ️ Ver detalhes da rotina ▼'}</span>
                          </button>
                        </div>
                        <div className="gestao-parametro-toggle-wrapper">
                          <label className="toggle-switch toggle-switch-lg" title="Ativar ou desativar Conferência de Entrada Nível 1">
                            <input
                              type="checkbox"
                              checked={paramN1Ativo}
                              disabled={salvandoParametro}
                              onChange={handleToggleN1Param}
                            />
                            <span className="toggle-slider toggle-operacao" />
                          </label>
                        </div>
                      </div>

                      {descricoesAbertas.n1 && (
                        <div className="gestao-parametro-detalhes-container">
                          <p className="gestao-parametro-detalhes">
                            Quando <strong>ativado</strong>, o sistema inicia novas conferências exigindo a 1ª contagem cega física (N1).<br />
                            Quando <strong>desativado</strong>, a 1ª contagem cega é dispensada, iniciando o fluxo de recebimento diretamente no Nível 2 (com coleta de Lote e Validade).
                          </p>

                          <div className="gestao-parametro-fluxo-explicacao">
                            <div className={`fluxo-modo-box ${paramN1Ativo ? 'modo-destaque' : ''}`}>
                              <div className="fluxo-modo-header">
                                <span className="fluxo-icone">🔒</span>
                                <strong>Fluxo com N1 Ativado (Padrão)</strong>
                              </div>
                              <ul>
                                <li><strong>Início no N1:</strong> Conferente faz a contagem cega inicial das mercadorias.</li>
                                <li><strong>Continuidade:</strong> Se N2 estiver ativo, avança para N2; se N2 estiver inativo, valida e finaliza diretamente contra a NF.</li>
                              </ul>
                            </div>

                            <div className={`fluxo-modo-box ${!paramN1Ativo ? 'modo-destaque' : ''}`}>
                              <div className="fluxo-modo-header">
                                <span className="fluxo-icone">⚡</span>
                                <strong>Fluxo com N1 Inativado (Início Direto em N2)</strong>
                              </div>
                              <ul>
                                <li><strong>Início no N2:</strong> Operadores pulam a contagem cega inicial e iniciam direto na conferência com Lote e Validade.</li>
                                <li><strong>Validação com a NF:</strong> O N2 valida as quantidades diretamente com a Nota Fiscal. Se bater, finaliza como <em>Conferido</em>. Se divergir, avança para N3.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CARD 2: NÍVEL 2 */}
                    <div className="gestao-parametro-card">
                      <div className="gestao-parametro-header">
                        <div className="gestao-parametro-info">
                          <div className="gestao-parametro-titulo-row">
                            <span className="gestao-parametro-icone">🏷️</span>
                            <h4 className="gestao-parametro-titulo">Conferência de Entrada - Nível 2 (Dupla Conferência Cega)</h4>
                            <span className={`badge-parametro-status ${paramN2Ativo ? 'ativo' : 'inativo'}`}>
                              {paramN2Ativo ? '✓ Ativado' : '✕ Inativado'}
                            </span>
                          </div>
                          <p className="gestao-parametro-resumo-curto">
                            Segunda contagem física independente com exigência de Lote, Validade e Fabricação.
                          </p>
                          <button
                            type="button"
                            className="gestao-parametro-btn-toggle"
                            onClick={() => toggleDescricao('n2')}
                            title={descricoesAbertas.n2 ? 'Ocultar detalhes' : 'Exibir detalhes da rotina'}
                          >
                            <span>{descricoesAbertas.n2 ? '▲ Ocultar detalhes da rotina' : 'ℹ️ Ver detalhes da rotina ▼'}</span>
                          </button>
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

                      {descricoesAbertas.n2 && (
                        <div className="gestao-parametro-detalhes-container">
                          <p className="gestao-parametro-detalhes">
                            Quando <strong>ativado</strong>, o sistema exige dupla contagem cega independente (Nível 1 por um conferente e Nível 2 por outro).
                            Se houver divergência entre as contagens N1 e N2, o processo avança para Nível 3 (Reconferência) ou decisão gerencial.<br />
                            Quando <strong>desativado</strong>, o Nível 2 é dispensado e a conferência valida a contagem do Nível 1 diretamente contra os itens faturados da Nota Fiscal.
                          </p>

                          <div className="gestao-parametro-fluxo-explicacao">
                            <div className={`fluxo-modo-box ${paramN2Ativo ? 'modo-destaque' : ''}`}>
                              <div className="fluxo-modo-header">
                                <span className="fluxo-icone">🔒</span>
                                <strong>Fluxo com N2 Ativado (Recomendado para Alto Risco / Dupla Validação)</strong>
                              </div>
                              <ul>
                                <li><strong>Nível 1:</strong> Conferente 1 faz contagem cega física sem ver as quantidades da nota.</li>
                                <li><strong>Nível 2:</strong> Outro conferente repete a contagem física independente com Lote e Validade.</li>
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
                                <li><strong>Nível 1:</strong> Conferente faz a contagem física cega.</li>
                                <li><strong>Finalização Direta:</strong> Se N1 coincidir exatamente com a NF, a conferência é finalizada com sucesso.</li>
                                <li><strong>Divergência com a NF:</strong> Caso falte ou sobre produto em relação à NF, a conferência é marcada como <em>Divergente</em> para o gestor.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CARD 3: SHELF-LIFE (VALIDADE PRÓXIMA) NO RECEBIMENTO */}
                    <div className="gestao-parametro-card">
                      <div className="gestao-parametro-header">
                        <div className="gestao-parametro-info">
                          <div className="gestao-parametro-titulo-row">
                            <span className="gestao-parametro-icone">⏳</span>
                            <h4 className="gestao-parametro-titulo">
                              Tolerância de Validade Próxima (Shelf-Life) no Recebimento
                            </h4>
                            <span className="badge-parametro-status ativo">
                              {paramShelfLifeDias} dias configurados
                            </span>
                          </div>
                          <p className="gestao-parametro-resumo-curto">
                            Prazo mínimo em dias até o vencimento. Lotes que vencerem dentro desta margem abrem automaticamente ocorrência de Validade Próxima no coletor.
                          </p>
                          <button
                            type="button"
                            className="gestao-parametro-btn-toggle"
                            onClick={() => toggleDescricao('shelfLife')}
                            title={descricoesAbertas.shelfLife ? 'Ocultar detalhes' : 'Exibir detalhes da rotina'}
                          >
                            <span>{descricoesAbertas.shelfLife ? '▲ Ocultar detalhes da rotina' : 'ℹ️ Ver detalhes da rotina ▼'}</span>
                          </button>
                        </div>

                        {/* Campo de input e botão salvar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px' }}>
                            <input
                              type="number"
                              min="1"
                              max="9999"
                              value={paramShelfLifeDias}
                              onChange={(e) => setParamShelfLifeDias(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              disabled={salvandoShelfLife}
                              style={{
                                width: '70px',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '1rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                outline: 'none',
                                color: '#0f172a',
                              }}
                            />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>dias</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleSalvarShelfLife}
                            disabled={salvandoShelfLife}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: salvandoShelfLife ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {salvandoShelfLife ? '⏳ Salvando...' : '💾 Salvar Alteração'}
                          </button>
                        </div>
                      </div>

                      {descricoesAbertas.shelfLife && (
                        <div className="gestao-parametro-detalhes-container">
                          <p className="gestao-parametro-detalhes">
                            Ao conferir no Nível 2 ou Nível 3 (onde Lote e Validade são obrigatórios), o sistema calcula os dias restantes entre a data atual e o vencimento digitado pelo operador.<br />
                            Se o lote vencer em menos de <strong>{paramShelfLifeDias} dias</strong>, o sistema detecta shelf-life curto e abre automaticamente o modal de ocorrência com tipo <strong>Validade Próxima</strong>.
                          </p>

                          <div className="gestao-parametro-fluxo-explicacao">
                            <div className="fluxo-modo-box modo-destaque">
                              <div className="fluxo-modo-header">
                                <span className="fluxo-icone">📦</span>
                                <strong>Contabilização na Conferência Física</strong>
                              </div>
                              <ul>
                                <li>Ao confirmar a ocorrência, a quantidade <strong>contabiliza na conferência física</strong> da carga (não trava o conferente).</li>
                                <li>A ocorrência é gravada com status <em>Pendente</em> para o gestor atuar.</li>
                              </ul>
                            </div>

                            <div className="fluxo-modo-box modo-destaque">
                              <div className="fluxo-modo-header">
                                <span className="fluxo-icone">🏢</span>
                                <strong>Definição do Local de Estoque pelo Gestor</strong>
                              </div>
                              <ul>
                                <li>O coletor <strong>não define local</strong> no momento da conferência (permanece pendente).</li>
                                <li>O gestor define o local correto de armazenagem na <strong>Aba Ocorrências</strong> ou faz o desdobramento de linhas na <strong>Aba Divergências</strong> antes de enviar ao Sankhya.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                GAVETA LATERAL (DRAWER DE PERMISSÕES DO USUÁRIO)
                ═══════════════════════════════════════════════════════ */}
            {usuarioDrawer && (
              <>
                <div
                  className="permissoes-drawer-backdrop open"
                  onClick={() => setUsuarioDrawerId(null)}
                  aria-hidden="false"
                />

                <aside className="permissoes-drawer open" aria-label="Gerenciador de Permissões">
                  {/* Header do Drawer */}
                  <div className="permissoes-drawer-header">
                    <div className="permissoes-drawer-header-topo">
                      <div className="permissoes-drawer-user-info">
                        <div
                          className={`permissoes-drawer-avatar ${
                            ['SUP', 'ANTONY', 'ANTONY.B'].includes(usuarioDrawer.nomeUsu.toUpperCase())
                              ? 'admin'
                              : ''
                          }`}
                        >
                          {usuarioDrawer.nomeUsu.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="permissoes-drawer-username">
                            {usuarioDrawer.nomeUsu}{' '}
                            {usuarioDrawer.codUsu === user?.codUsu && (
                              <span className="tag-voce">(Você)</span>
                            )}
                          </h3>
                          <span className="permissoes-drawer-usermeta">
                            CODUSU: {usuarioDrawer.codUsu}{' '}
                            {usuarioDrawer.codGrupo ? `• Grupo: ${usuarioDrawer.codGrupo}` : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="permissoes-drawer-close-btn"
                        onClick={() => setUsuarioDrawerId(null)}
                        title="Fechar (Esc)"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Status de Salvamento */}
                    {salvandoId === usuarioDrawer.codUsu ? (
                      <div className="permissoes-drawer-status salvando">
                        <span className="drawer-status-spinner" /> Salvando alterações...
                      </div>
                    ) : (
                      <div className="permissoes-drawer-status pronto">
                        <span>✓</span> Alterações salvas instantaneamente
                      </div>
                    )}

                    {/* Barra de Perfis Rápidos */}
                    <div className="permissoes-drawer-perfis">
                      <span className="perfis-title">Atalhos de Perfil:</span>
                      <div className="perfis-botoes">
                        <button
                          type="button"
                          className="perfil-btn perfil-conferente"
                          onClick={() => handleAplicarPerfil(usuarioDrawer, 'conferente')}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          title="Ativa Saída, Entrada, N1/N2/N3 e Consulta de Produtos"
                        >
                          📦 Conferente
                        </button>
                        <button
                          type="button"
                          className="perfil-btn perfil-gestor"
                          onClick={() => handleAplicarPerfil(usuarioDrawer, 'gestor')}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          title="Ativa Gestão de Recebimento, Divergências, Campos Sensíveis e Módulos"
                        >
                          📋 Gestor
                        </button>
                        <button
                          type="button"
                          className="perfil-btn perfil-admin"
                          onClick={() => handleAplicarPerfil(usuarioDrawer, 'admin')}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          title="Acesso completo a todas as funções e administração"
                        >
                          🛡️ Admin
                        </button>
                        <button
                          type="button"
                          className="perfil-btn perfil-limpar"
                          onClick={() => handleAplicarPerfil(usuarioDrawer, 'limpar')}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          title="Desativa todas as permissões do usuário"
                        >
                          🚫 Bloquear
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Drawer */}
                  <div className="permissoes-drawer-body">
                    {/* SEÇÃO 1: Módulos Operacionais */}
                    <div className="drawer-section">
                      <h4 className="drawer-section-title">
                        <span>📦</span> Módulos Operacionais
                      </h4>
                      <div className="drawer-items-list">
                        {/* Conferência de Saída */}
                        <div className="drawer-toggle-row">
                          <div className="drawer-toggle-desc">
                            <span className="drawer-toggle-label">Conferência de Saída</span>
                            <span className="drawer-toggle-sub">
                              Separação e conferência de pedidos de venda
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={usuarioDrawer.modulos.conferencia_saida}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onChange={() => handleToggleUsuario(usuarioDrawer, 'conferencia_saida')}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        {/* Conferência de Entrada (Bipagem) */}
                        <div className="drawer-toggle-row">
                          <div className="drawer-toggle-desc">
                            <span className="drawer-toggle-label">Conferência de Entrada (Bipagem)</span>
                            <span className="drawer-toggle-sub">
                              Contagem cega, leitura de código de barras e N1/N2/N3
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={usuarioDrawer.modulos.conferencia_entrada}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onChange={() =>
                                handleToggleUsuario(usuarioDrawer, 'conferencia_entrada')
                              }
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        {/* Gestão de Recebimento (NOVA FLAG) */}
                        <div className="drawer-toggle-row destaque-gestao">
                          <div className="drawer-toggle-desc">
                            <div className="drawer-toggle-label-with-badge">
                              <span className="drawer-toggle-label">Gestão de Recebimento</span>
                              <span className="badge-flag-nova">Nova Flag</span>
                            </div>
                            <span className="drawer-toggle-sub">
                              Acompanhamento geral, divergências, desmembramentos e envio Sankhya
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={!!usuarioDrawer.modulos.gestao_recebimento}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onChange={() =>
                                handleToggleUsuario(usuarioDrawer, 'gestao_recebimento')
                              }
                            />
                            <span className="toggle-slider toggle-roxo" />
                          </label>
                        </div>

                        {/* Sub-painel de abas autorizadas na Gestão de Recebimento */}
                        {usuarioDrawer.modulos.gestao_recebimento && (
                          <div className="drawer-subpainel-gestao">
                            <div className="drawer-subpainel-header">
                              <span className="drawer-subpainel-titulo">Abas Autorizadas na Gestão de Recebimento</span>
                              <span className="drawer-subpainel-aviso">Conferências é a visão base fixa</span>
                            </div>
                            <div className="drawer-subpainel-lista">
                              {/* Aba Divergências */}
                              <div className="drawer-subtoggle-row">
                                <div className="drawer-toggle-desc">
                                  <span className="drawer-toggle-label">⚠️ Aba Divergências</span>
                                  <span className="drawer-toggle-sub">
                                    Resolução de divergências, aprovação fiscal e desmembramentos
                                  </span>
                                </div>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={!!usuarioDrawer.modulos.gestao_recebimento_aba_divergencias}
                                    disabled={salvandoId === usuarioDrawer.codUsu}
                                    onChange={() =>
                                      handleToggleUsuario(usuarioDrawer, 'gestao_recebimento_aba_divergencias')
                                    }
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              {/* Aba Envio Sankhya */}
                              <div className="drawer-subtoggle-row">
                                <div className="drawer-toggle-desc">
                                  <span className="drawer-toggle-label">🚀 Aba Envio Sankhya</span>
                                  <span className="drawer-toggle-sub">
                                    Aprovação final de conferências e integração de estoque ao ERP
                                  </span>
                                </div>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={!!usuarioDrawer.modulos.gestao_recebimento_aba_envio_sankhya}
                                    disabled={salvandoId === usuarioDrawer.codUsu}
                                    onChange={() =>
                                      handleToggleUsuario(usuarioDrawer, 'gestao_recebimento_aba_envio_sankhya')
                                    }
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              {/* Aba Ocorrências */}
                              <div className="drawer-subtoggle-row">
                                <div className="drawer-toggle-desc">
                                  <span className="drawer-toggle-label">💥 Aba Ocorrências</span>
                                  <span className="drawer-toggle-sub">
                                    Gestão de avarias, lotes com validade próxima e produtos divergentes
                                  </span>
                                </div>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={!!usuarioDrawer.modulos.gestao_recebimento_aba_ocorrencias}
                                    disabled={salvandoId === usuarioDrawer.codUsu}
                                    onChange={() =>
                                      handleToggleUsuario(usuarioDrawer, 'gestao_recebimento_aba_ocorrencias')
                                    }
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>

                              {/* Rotina de Backup */}
                              <div className="drawer-subtoggle-row">
                                <div className="drawer-toggle-desc">
                                  <span className="drawer-toggle-label">📦 Rotina de Backup</span>
                                  <span className="drawer-toggle-sub">
                                    Visualização de contagens arquivadas e restauração de backups de conferência
                                  </span>
                                </div>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={!!usuarioDrawer.modulos.gestao_recebimento_backup}
                                    disabled={salvandoId === usuarioDrawer.codUsu}
                                    onChange={() =>
                                      handleToggleUsuario(usuarioDrawer, 'gestao_recebimento_backup')
                                    }
                                  />
                                  <span className="toggle-slider" />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Consulta de Produtos */}
                        <div className="drawer-toggle-row">
                          <div className="drawer-toggle-desc">
                            <span className="drawer-toggle-label">Consulta de Produtos</span>
                            <span className="drawer-toggle-sub">
                              Busca rápida de estoque, referências e código de barras
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={usuarioDrawer.modulos.consulta_produtos}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onChange={() =>
                                handleToggleUsuario(usuarioDrawer, 'consulta_produtos')
                              }
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 2: Níveis e Status de Entrada */}
                    <div className="drawer-section">
                      <h4 className="drawer-section-title">
                        <span>🔢</span> Níveis e Visibilidade na Entrada
                      </h4>
                      <p className="drawer-section-sub">
                        Define quais contagens e quais status de notas fiscais o usuário pode visualizar.
                      </p>
                      <div className="drawer-chips-grid">
                        {/* N1 */}
                        <button
                          type="button"
                          className={`drawer-chip-card ${
                            usuarioDrawer.modulos.conferencia_entrada_n1 !== false ? 'ativo' : ''
                          }`}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          onClick={() =>
                            handleToggleUsuario(usuarioDrawer, 'conferencia_entrada_n1')
                          }
                        >
                          <div className="drawer-chip-card-header">
                            <span className="chip-code">N1</span>
                            <span className="chip-status-tag">
                              {usuarioDrawer.modulos.conferencia_entrada_n1 !== false
                                ? 'Ativo'
                                : 'Inativo'}
                            </span>
                          </div>
                          <span className="chip-card-title">1ª Contagem Cega</span>
                          <span className="chip-card-desc">Contagem inicial rápida de volumes</span>
                        </button>

                        {/* N2 */}
                        <button
                          type="button"
                          className={`drawer-chip-card ${
                            usuarioDrawer.modulos.conferencia_entrada_n2 !== false ? 'ativo' : ''
                          }`}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          onClick={() =>
                            handleToggleUsuario(usuarioDrawer, 'conferencia_entrada_n2')
                          }
                        >
                          <div className="drawer-chip-card-header">
                            <span className="chip-code">N2</span>
                            <span className="chip-status-tag">
                              {usuarioDrawer.modulos.conferencia_entrada_n2 !== false
                                ? 'Ativo'
                                : 'Inativo'}
                            </span>
                          </div>
                          <span className="chip-card-title">2ª Contagem Lote/Val</span>
                          <span className="chip-card-desc">Contagem com lote e validade</span>
                        </button>

                        {/* N3 */}
                        <button
                          type="button"
                          className={`drawer-chip-card ${
                            usuarioDrawer.modulos.conferencia_entrada_n3 !== false ? 'ativo' : ''
                          }`}
                          disabled={salvandoId === usuarioDrawer.codUsu}
                          onClick={() =>
                            handleToggleUsuario(usuarioDrawer, 'conferencia_entrada_n3')
                          }
                        >
                          <div className="drawer-chip-card-header">
                            <span className="chip-code">N3</span>
                            <span className="chip-status-tag">
                              {usuarioDrawer.modulos.conferencia_entrada_n3 !== false
                                ? 'Ativo'
                                : 'Inativo'}
                            </span>
                          </div>
                          <span className="chip-card-title">3ª Contagem Desempate</span>
                          <span className="chip-card-desc">Recontagem de divergências</span>
                        </button>

                        {/* Divergentes */}
                        {(() => {
                          const ehAdmin =
                            ['SUP', 'ANTONY', 'ANTONY.B'].includes(
                              usuarioDrawer.nomeUsu.toUpperCase()
                            ) || !!usuarioDrawer.modulos.gerenciar_acessos;
                          const divAtivo =
                            usuarioDrawer.modulos.conferencia_entrada_divergente === true ||
                            (ehAdmin &&
                              usuarioDrawer.modulos.conferencia_entrada_divergente !== false);
                          return (
                            <button
                              type="button"
                              className={`drawer-chip-card chip-card-divergente ${
                                divAtivo ? 'ativo' : ''
                              }`}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onClick={() =>
                                handleToggleUsuario(
                                  usuarioDrawer,
                                  'conferencia_entrada_divergente'
                                )
                              }
                            >
                              <div className="drawer-chip-card-header">
                                <span className="chip-code">DIV</span>
                                <span className="chip-status-tag">
                                  {divAtivo ? 'Visível' : 'Oculto'}
                                </span>
                              </div>
                              <span className="chip-card-title">Ver Divergentes</span>
                              <span className="chip-card-desc">Notas divergentes no painel</span>
                            </button>
                          );
                        })()}

                        {/* Conferidos */}
                        {(() => {
                          const ehAdmin =
                            ['SUP', 'ANTONY', 'ANTONY.B'].includes(
                              usuarioDrawer.nomeUsu.toUpperCase()
                            ) || !!usuarioDrawer.modulos.gerenciar_acessos;
                          const confAtivo =
                            usuarioDrawer.modulos.conferencia_entrada_conferido === true ||
                            (ehAdmin &&
                              usuarioDrawer.modulos.conferencia_entrada_conferido !== false);
                          return (
                            <button
                              type="button"
                              className={`drawer-chip-card chip-card-conferido ${
                                confAtivo ? 'ativo' : ''
                              }`}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onClick={() =>
                                handleToggleUsuario(
                                  usuarioDrawer,
                                  'conferencia_entrada_conferido'
                                )
                              }
                            >
                              <div className="drawer-chip-card-header">
                                <span className="chip-code">CONF</span>
                                <span className="chip-status-tag">
                                  {confAtivo ? 'Visível' : 'Oculto'}
                                </span>
                              </div>
                              <span className="chip-card-title">Ver Conferidos</span>
                              <span className="chip-card-desc">Notas concluídas no painel</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {/* SEÇÃO 3: Segurança & Administração */}
                    <div className="drawer-section">
                      <h4 className="drawer-section-title">
                        <span>🛡️</span> Segurança e Administração
                      </h4>
                      <div className="drawer-items-list">
                        {/* Ver Campos Sensíveis */}
                        <div className="drawer-toggle-row">
                          <div className="drawer-toggle-desc">
                            <span className="drawer-toggle-label">Visualizar Campos Sensíveis</span>
                            <span className="drawer-toggle-sub">
                              Exibe campos confidenciais configurados na aba 'Campos Sensíveis'
                              (ex: qtd esperada, código de barras)
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={usuarioDrawer.modulos.ver_campos_sensiveis}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onChange={() =>
                                handleToggleUsuario(usuarioDrawer, 'ver_campos_sensiveis')
                              }
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        {/* Bipar por Código do Produto */}
                        <div className="drawer-toggle-row">
                          <div className="drawer-toggle-desc">
                            <span className="drawer-toggle-label">Bipar por Código do Produto (CODPROD)</span>
                            <span className="drawer-toggle-sub">
                              Permite buscar o item pelo código interno na TGFPRO/TGFITE. Quando desativado, bloqueia essa consulta e obriga o leitor no código de barras cadastrado.
                            </span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={Boolean(usuarioDrawer.modulos.bipar_por_codprod)}
                              disabled={salvandoId === usuarioDrawer.codUsu}
                              onChange={() =>
                                handleToggleUsuario(usuarioDrawer, 'bipar_por_codprod')
                              }
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        {/* Administrador do Sistema */}
                        {(() => {
                          const ehAdminPadrao = ['SUP', 'ANTONY', 'ANTONY.B'].includes(
                            usuarioDrawer.nomeUsu.toUpperCase()
                          );
                          return (
                            <div
                              className={`drawer-toggle-row ${
                                ehAdminPadrao ? 'admin-padrao-row' : ''
                              }`}
                            >
                              <div className="drawer-toggle-desc">
                                <div className="drawer-toggle-label-with-badge">
                                  <span className="drawer-toggle-label">
                                    Administrador do Sistema
                                  </span>
                                  {ehAdminPadrao && (
                                    <span className="badge-admin-nativo">Admin Nativo</span>
                                  )}
                                </div>
                                <span className="drawer-toggle-sub">
                                  {ehAdminPadrao
                                    ? 'Administrador raiz protegido (permissão permanente para evitar bloqueio)'
                                    : 'Acesso total à gestão de usuários, parâmetros operacionais e configurações'}
                                </span>
                              </div>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={
                                    usuarioDrawer.modulos.gerenciar_acessos || ehAdminPadrao
                                  }
                                  disabled={
                                    salvandoId === usuarioDrawer.codUsu || ehAdminPadrao
                                  }
                                  onChange={() =>
                                    handleToggleUsuario(usuarioDrawer, 'gerenciar_acessos')
                                  }
                                />
                                <span className="toggle-slider toggle-admin" />
                              </label>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Footer do Drawer */}
                  <div className="permissoes-drawer-footer">
                    <button
                      type="button"
                      className="drawer-btn-fechar"
                      onClick={() => setUsuarioDrawerId(null)}
                    >
                      Concluir e Fechar
                    </button>
                  </div>
                </aside>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
