import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import {
  ConferenciaDivergenciaGrupo,
  ConferenciaEntradaResumo,
  NotaEntrada,
  ObterItensConferenciaResponse,
} from '../../domain/models/ConferenciaEntrada';
import { AppLayout, AppHeader, Container } from '../components';
import { Loading } from '../components/Loading/Loading';
import './GestaoRecebimento.css';

const recebimentoService = new RecebimentoApiService();

function getStatusBadgeClass(status: string): string {
  if (status === 'Divergente') return 'divergente';
  if (status.includes('Aguardando N') || status.includes('Reconferência')) return 'reconferencia';
  if (status === 'Conferido') return 'conferido';
  if (status === 'Aguardando Aprovação') return 'aguardando';
  if (status === 'Enviado ao Sankhya') return 'enviado';
  if (status.includes('em Andamento') || status === 'Iniciado') return 'andamento';
  if (status === 'Cancelado') return 'cancelado';
  return 'andamento';
}

export function GestaoRecebimentoPage() {
  const { temPermissao } = useAuth();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<'conferencias' | 'divergencias' | 'aprovacao_sankhya'>('conferencias');

  // Estados de dados
  const [todasConferencias, setTodasConferencias] = useState<ConferenciaEntradaResumo[]>([]);
  const [divergencias, setDivergencias] = useState<ConferenciaDivergenciaGrupo[]>([]);
  const [conferenciasProntas, setConferenciasProntas] = useState<NotaEntrada[]>([]);
  const [detalhesConferencias, setDetalhesConferencias] = useState<Record<string, ObterItensConferenciaResponse>>({});
  const [conferenciasExpandidas, setConferenciasExpandidas] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState<string | null>(null);

  // Filtros do Painel de Conferências
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'em_andamento' | 'recontagem' | 'concluidas' | 'com_backup'>('todas');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Estados de feedback e modais
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalAcao, setModalAcao] = useState<{
    tipo: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3' | 'REINICIAR' | 'SOLICITAR_RECONTAGEM' | 'RECUPERAR_CONTAGEM' | 'ENVIAR_SANKHYA';
    conferenciaId: string;
    titulo: string;
    descricao: string;
    placeholder: string;
    dadosExtras?: any;
  } | null>(null);
  const [nivelRecontagemModal, setNivelRecontagemModal] = useState<number>(2);
  const [observacaoModal, setObservacaoModal] = useState('');
  const [processandoAcao, setProcessandoAcao] = useState(false);

  const podeAcessar = temPermissao('conferencia_entrada') || temPermissao('gerenciar_acessos');

  // Carregar dados
  const carregarDados = useCallback(async () => {
    if (!podeAcessar) return;
    setLoading(true);
    setFeedback(null);
    const erros: string[] = [];

    // 1. Carregar todas as conferências (histórico e em andamento)
    try {
      const confs = await recebimentoService.listarTodasConferencias();
      setTodasConferencias(confs);
    } catch (err: any) {
      console.error('Erro ao carregar todas as conferências:', err);
      erros.push(err.response?.data?.error || 'Falha ao carregar lista de conferências');
    }

    // 2. Carregar divergências
    try {
      const divs = await recebimentoService.listarDivergencias();
      setDivergencias(divs);
    } catch (err: any) {
      console.error('Erro ao carregar divergências:', err);
      erros.push(err.response?.data?.error || 'Falha ao carregar divergências');
    }

    // 3. Carregar notas prontas para envio (Conferido / Aguardando Aprovação / Enviado ao Sankhya)
    try {
      const todasNotas = await recebimentoService.listarNotas();
      const prontas = todasNotas.filter(
        (n) =>
          n.statusConferencia === 'Conferido' ||
          n.statusConferencia === 'Aguardando Aprovação' ||
          n.statusConferencia === 'Enviado ao Sankhya'
      );
      setConferenciasProntas(prontas);
    } catch (err: any) {
      console.error('Erro ao carregar notas prontas para envio:', err);
      erros.push(err.response?.data?.error || 'Falha ao carregar notas para envio ao Sankhya');
    }

    if (erros.length > 0) {
      setFeedback({
        tipo: 'erro',
        texto: `Aviso no carregamento: ${erros.join(' | ')}`,
      });
    }

    setLoading(false);
  }, [podeAcessar]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Carregar itens detalhados para visualização ao expandir
  const carregarDetalhesConferencia = async (conferenciaId: string, nunotas: number[]) => {
    setLoadingDetalhes(conferenciaId);
    try {
      const resp = await recebimentoService.obterItensConferencia(conferenciaId, nunotas);
      setDetalhesConferencias((prev) => ({ ...prev, [conferenciaId]: resp }));
    } catch (err: any) {
      console.error('Erro ao obter detalhes da conferência:', err);
    } finally {
      setLoadingDetalhes(null);
    }
  };

  const toggleDetalhesConferencia = async (conferenciaId: string, nunotas: number[]) => {
    if (conferenciasExpandidas[conferenciaId]) {
      setConferenciasExpandidas((prev) => ({ ...prev, [conferenciaId]: false }));
      return;
    }
    setConferenciasExpandidas((prev) => ({ ...prev, [conferenciaId]: true }));
    if (!detalhesConferencias[conferenciaId]) {
      await carregarDetalhesConferencia(conferenciaId, nunotas);
    }
  };

  // Exportar CSV de divergências
  const handleExportarCSV = (grupo: ConferenciaDivergenciaGrupo) => {
    const cabecalho = [
      'Nota',
      'Codigo',
      'Descricao',
      'Referencia',
      'Unidade',
      'Qtd_Esperada',
      'Qtd_N1',
      'Qtd_N2',
      'Qtd_N3',
      'Diferenca',
      'Lote',
      'Validade',
      'Fabricacao',
      'Conferente_N1',
      'Conferente_N2',
      'Conferente_N3',
    ].join(';');

    const linhas = grupo.itensDivergentes.map((item) =>
      [
        item.nunota,
        item.codprod,
        `"${(item.descrprod || '').replace(/"/g, '""')}"`,
        `"${(item.referencia || '').replace(/"/g, '""')}"`,
        item.codvol,
        item.qtdEsperada,
        item.qtdN1,
        item.qtdN2,
        item.qtdN3,
        item.diferenca,
        `"${item.lote || ''}"`,
        item.validade || '',
        item.fabricacao || '',
        `"${item.conferenteN1 || ''}"`,
        `"${item.conferenteN2 || ''}"`,
        `"${item.conferenteN3 || ''}"`,
      ].join(';')
    );

    const conteudoCSV = '\uFEFF' + [cabecalho, ...linhas].join('\r\n');
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Divergencias_Notas_${grupo.numerosNotas}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirmação de ações pelo modal
  const handleConfirmarAcaoModal = async () => {
    if (!modalAcao) return;
    setProcessandoAcao(true);
    try {
      if (modalAcao.tipo === 'APROVAR_DIVERGENCIA') {
        await recebimentoService.resolverDivergencia(modalAcao.conferenciaId, {
          acao: 'APROVAR_DIVERGENCIA',
          observacao: observacaoModal,
        });
        setFeedback({
          tipo: 'sucesso',
          texto: 'Divergência resolvida e aprovada! Conferência movida para fila de envio ao Sankhya.',
        });
      } else if (modalAcao.tipo === 'RECONFERIR_N3') {
        await recebimentoService.resolverDivergencia(modalAcao.conferenciaId, {
          acao: 'RECONFERIR_N3',
          observacao: observacaoModal,
        });
        setFeedback({
          tipo: 'sucesso',
          texto: 'Reconferência Nível 3 (N3) solicitada com sucesso para a conferência!',
        });
      } else if (modalAcao.tipo === 'REINICIAR') {
        await recebimentoService.reiniciarConferencia(modalAcao.conferenciaId, observacaoModal);
        setFeedback({
          tipo: 'sucesso',
          texto: 'Conferência reiniciada! Bipagens anteriores foram arquivadas em backup de segurança e a sessão voltou ao início.',
        });
      } else if (modalAcao.tipo === 'SOLICITAR_RECONTAGEM') {
        await recebimentoService.solicitarRecontagem(modalAcao.conferenciaId, {
          nivel: nivelRecontagemModal,
          motivo: observacaoModal,
        });
        setFeedback({
          tipo: 'sucesso',
          texto: `Recontagem Nível ${nivelRecontagemModal} solicitada com sucesso! Sessão disponibilizada aos conferentes.`,
        });
      } else if (modalAcao.tipo === 'RECUPERAR_CONTAGEM') {
        await recebimentoService.recuperarContagem(modalAcao.conferenciaId, observacaoModal);
        setFeedback({
          tipo: 'sucesso',
          texto: 'Contagem restaurada com sucesso! As bipagens salvas e status anterior foram restabelecidos.',
        });
      } else if (modalAcao.tipo === 'ENVIAR_SANKHYA') {
        const resp = await recebimentoService.enviarSankhya(modalAcao.conferenciaId, observacaoModal);
        setFeedback({
          tipo: 'sucesso',
          texto: `Envio concluído com sucesso ao Sankhya! ${resp.itensAtualizados} itens da nota e ${resp.estoqueAtualizado} registros de estoque atualizados.`,
        });
      }

      setModalAcao(null);
      setObservacaoModal('');
      await carregarDados();
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || err.message || 'Erro ao processar ação solicitada.',
      });
    } finally {
      setProcessandoAcao(false);
    }
  };

  // Contagens dos filtros da aba Todas as Conferências
  const contagensFiltros = useMemo(() => {
    let emAndamento = 0;
    let recontagem = 0;
    let concluidas = 0;
    let comBackup = 0;

    for (const c of todasConferencias) {
      if (['Iniciado', 'N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento'].includes(c.status)) {
        emAndamento++;
      }
      if (['Aguardando N2', 'Aguardando N3', 'Divergente'].includes(c.status)) {
        recontagem++;
      }
      if (['Conferido', 'Aguardando Aprovação', 'Enviado ao Sankhya'].includes(c.status)) {
        concluidas++;
      }
      if (c.temBackupContagem) {
        comBackup++;
      }
    }

    return {
      todas: todasConferencias.length,
      emAndamento,
      recontagem,
      concluidas,
      comBackup,
    };
  }, [todasConferencias]);

  // Filtro dinâmico das conferências
  const conferenciasFiltradas = useMemo(() => {
    return todasConferencias.filter((c) => {
      // 1. Categoria de status
      if (filtroStatus === 'em_andamento') {
        const emAnd = ['Iniciado', 'N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento'];
        if (!emAnd.includes(c.status)) return false;
      } else if (filtroStatus === 'recontagem') {
        const recon = ['Aguardando N2', 'Aguardando N3', 'Divergente'];
        if (!recon.includes(c.status)) return false;
      } else if (filtroStatus === 'concluidas') {
        const conc = ['Conferido', 'Aguardando Aprovação', 'Enviado ao Sankhya'];
        if (!conc.includes(c.status)) return false;
      } else if (filtroStatus === 'com_backup') {
        if (!c.temBackupContagem) return false;
      }

      // 2. Busca por texto
      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase().trim();
        const matchNota = (c.numerosNotas || '').toLowerCase().includes(termo);
        const matchFornec = (c.fornecedor || '').toLowerCase().includes(termo);
        const matchConf = (c.conferente || '').toLowerCase().includes(termo);
        const matchId = (c.id || '').toLowerCase().includes(termo);
        if (!matchNota && !matchFornec && !matchConf && !matchId) return false;
      }

      return true;
    });
  }, [todasConferencias, filtroStatus, buscaTexto]);

  // Agrupamento de notas prontas por conferência
  const conferenciasProntasAgrupadas = useMemo(() => {
    const mapa = new Map<string, NotaEntrada[]>();
    for (const nota of conferenciasProntas) {
      const key = nota.conferenciaId || `sem_id_${nota.nunota}`;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(nota);
    }
    return Array.from(mapa.entries()).map(([confId, notas]) => ({
      conferenciaId: confId,
      notas,
      numerosNotas: notas.map((n) => n.numnota).join(', '),
      fornecedor: notas[0]?.nomeparc || '—',
      status: notas[0]?.statusConferencia || 'Conferido',
      nunotas: notas.map((n) => n.nunota),
    }));
  }, [conferenciasProntas]);

  if (!podeAcessar) {
    return (
      <AppLayout>
        {({ openDrawer, abrirConsultaProduto }) => (
          <div className="page-container">
            <AppHeader
              titulo="Gestão de Recebimento"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />
            <Container variant="default" padding="lg">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span style={{ fontSize: '3rem' }}>🔒</span>
                <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito</h2>
                <p style={{ color: 'var(--slate-500)', marginTop: '8px' }}>
                  Seu usuário não possui permissão para acessar a Gestão de Recebimento e Envio ao Sankhya.
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
            titulo="Gestão de Recebimento & Sankhya"
            subtitulo="Acompanhamento geral de conferências, tratamento de divergências e envio ao ERP"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          <div className="gestao-rec-container">
            {/* Feedback Alert */}
            {feedback && (
              <div className={`gestao-rec-feedback ${feedback.tipo}`}>
                {feedback.tipo === 'sucesso' ? '✓' : '⚠'} {feedback.texto}
              </div>
            )}

            {/* Navegação de Abas Minimalista */}
            <div className="gestao-rec-nav-wrapper">
              <div className="gestao-rec-nav">
                <button
                  type="button"
                  className={`gestao-rec-tab-btn ${abaAtiva === 'conferencias' ? 'ativa' : ''}`}
                  onClick={() => setAbaAtiva('conferencias')}
                >
                  <span>Conferências</span>
                  <span className="gestao-rec-tab-badge">{todasConferencias.length}</span>
                </button>
                <button
                  type="button"
                  className={`gestao-rec-tab-btn ${abaAtiva === 'divergencias' ? 'ativa' : ''}`}
                  onClick={() => setAbaAtiva('divergencias')}
                >
                  <span>Divergências</span>
                  <span className={`gestao-rec-tab-badge ${divergencias.length > 0 ? 'alerta' : ''}`}>
                    {divergencias.length}
                  </span>
                </button>
                <button
                  type="button"
                  className={`gestao-rec-tab-btn ${abaAtiva === 'aprovacao_sankhya' ? 'ativa' : ''}`}
                  onClick={() => setAbaAtiva('aprovacao_sankhya')}
                >
                  <span>Envio Sankhya</span>
                  <span className="gestao-rec-tab-badge">{conferenciasProntasAgrupadas.length}</span>
                </button>
              </div>

              <button
                type="button"
                className="gestao-rec-btn-refresh"
                onClick={carregarDados}
                disabled={loading}
                title="Atualizar dados"
              >
                <span>🔄 Atualizar</span>
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <Loading mensagem="Carregando dados da gestão de recebimento..." />
            ) : (
              <>
                {/* ═══════════════════════════════════════════════════════
                    ABA 1: PAINEL GERAL DE CONFERÊNCIAS
                    ═══════════════════════════════════════════════════════ */}
                {abaAtiva === 'conferencias' && (
                  <div className="gestao-rec-lista">
                    {/* Filtros e Barra de Busca */}
                    <div className="gestao-rec-filtro-bar">
                      <div className="gestao-rec-filtros-chips">
                        <button
                          type="button"
                          className={`gestao-filtro-chip ${filtroStatus === 'todas' ? 'ativo' : ''}`}
                          onClick={() => setFiltroStatus('todas')}
                        >
                          Todas <span className="chip-count">{contagensFiltros.todas}</span>
                        </button>
                        <button
                          type="button"
                          className={`gestao-filtro-chip ${filtroStatus === 'em_andamento' ? 'ativo' : ''}`}
                          onClick={() => setFiltroStatus('em_andamento')}
                        >
                          Em Andamento <span className="chip-count">{contagensFiltros.emAndamento}</span>
                        </button>
                        <button
                          type="button"
                          className={`gestao-filtro-chip ${filtroStatus === 'recontagem' ? 'ativo' : ''}`}
                          onClick={() => setFiltroStatus('recontagem')}
                        >
                          Recontagem / Pendente <span className="chip-count">{contagensFiltros.recontagem}</span>
                        </button>
                        <button
                          type="button"
                          className={`gestao-filtro-chip ${filtroStatus === 'concluidas' ? 'ativo' : ''}`}
                          onClick={() => setFiltroStatus('concluidas')}
                        >
                          Concluídas <span className="chip-count">{contagensFiltros.concluidas}</span>
                        </button>
                        <button
                          type="button"
                          className={`gestao-filtro-chip ${filtroStatus === 'com_backup' ? 'ativo' : ''}`}
                          onClick={() => setFiltroStatus('com_backup')}
                          title="Conferências que foram reiniciadas e possuem contagem anterior recuperável"
                        >
                          💾 Com Backup <span className="chip-count">{contagensFiltros.comBackup}</span>
                        </button>
                      </div>

                      <input
                        type="text"
                        className="gestao-rec-busca-input"
                        placeholder="Buscar por NF, fornecedor ou conferente..."
                        value={buscaTexto}
                        onChange={(e) => setBuscaTexto(e.target.value)}
                      />
                    </div>

                    {conferenciasFiltradas.length === 0 ? (
                      <Container variant="default" padding="lg">
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
                          <span style={{ fontSize: '2.5rem' }}>🔍</span>
                          <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
                            Nenhuma conferência encontrada
                          </h3>
                          <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                            Nenhuma conferência corresponde aos filtros ou critério de busca selecionados.
                          </p>
                        </div>
                      </Container>
                    ) : (
                      conferenciasFiltradas.map((conf) => {
                        const statusClasse = getStatusBadgeClass(conf.status);
                        const isExpandido = !!conferenciasExpandidas[conf.id];
                        const isCarregandoDetalhes = loadingDetalhes === conf.id;
                        const detalhes = detalhesConferencias[conf.id];

                        return (
                          <div key={conf.id} className="gestao-rec-card">
                            {/* Cabeçalho */}
                            <div className="gestao-rec-card-header">
                              <div className="gestao-rec-card-info">
                                <div className="gestao-rec-card-notas">
                                  <span>📄 NF(s): {conf.numerosNotas}</span>
                                </div>
                                <span className="gestao-rec-card-fornecedor">
                                  Fornecedor: {conf.fornecedor}
                                </span>
                                <span className="gestao-rec-card-meta">
                                  Conferente: {conf.conferente || '—'} • Iniciado em:{' '}
                                  {new Date(conf.criadoEm).toLocaleString('pt-BR')}
                                  {conf.finalizadoEm && ` • Concluído em: ${new Date(conf.finalizadoEm).toLocaleString('pt-BR')}`}
                                </span>
                              </div>

                              <div className="gestao-rec-card-badges">
                                <span className="badge-nivel-rec">Nível Atual: N{conf.nivelAtual}</span>
                                <span className={`badge-status-rec ${statusClasse}`}>
                                  {conf.status}
                                </span>
                                {conf.temBackupContagem && (
                                  <span
                                    className="badge-backup-recuperavel"
                                    title={`Contagem anterior arquivada com ${conf.backupContagem?.totalBipagensAnuladas || 0} itens. Pode ser recuperada a qualquer momento.`}
                                  >
                                    💾 Backup Recuperável ({conf.backupContagem?.totalBipagensAnuladas || 0})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Aviso de Backup Disponível */}
                            {conf.temBackupContagem && conf.backupContagem && (
                              <div className="gestao-card-backup-aviso">
                                <span style={{ fontSize: '1.2rem' }}>💾</span>
                                <div>
                                  <strong>Backup de Contagem Disponível:</strong> Esta conferência foi reiniciada em{' '}
                                  {new Date(conf.backupContagem.reiniciadoEm).toLocaleString('pt-BR')} por{' '}
                                  <strong>{conf.backupContagem.reiniciadoPor}</strong>. Status anterior:{' '}
                                  <em>{conf.backupContagem.statusAnterior} (N{conf.backupContagem.nivelAnterior})</em>. Foram
                                  guardadas <strong>{conf.backupContagem.totalBipagensAnuladas} bipagens</strong>.
                                  {conf.backupContagem.motivo && (
                                    <div>Motivo registrado: "{conf.backupContagem.motivo}"</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Resumo de Contagem */}
                            <div className="gestao-rec-contagem-resumo">
                              <div className="contagem-box">
                                <span className="contagem-rotulo">Itens Faturados</span>
                                <span className="contagem-valor">{conf.totalItens}</span>
                              </div>
                              <div className="contagem-box">
                                <span className="contagem-rotulo">Contagem N1</span>
                                <span className="contagem-valor">{conf.totalBipadoN1}</span>
                              </div>
                              <div className="contagem-box">
                                <span className="contagem-rotulo">Contagem N2</span>
                                <span className="contagem-valor">{conf.totalBipadoN2}</span>
                              </div>
                              {conf.totalBipadoN3 > 0 && (
                                <div className="contagem-box">
                                  <span className="contagem-rotulo">Contagem N3</span>
                                  <span className="contagem-valor">{conf.totalBipadoN3}</span>
                                </div>
                              )}
                              {conf.temBackupContagem && conf.backupContagem && (
                                <div className="contagem-box">
                                  <span className="contagem-rotulo">Itens em Backup</span>
                                  <span className="contagem-valor" style={{ color: '#854d0e' }}>
                                    {conf.backupContagem.totalBipagensAnuladas}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Tabela de Detalhes / Bipagens Expandida */}
                            {isExpandido && (
                              <div style={{ marginTop: '8px' }}>
                                {isCarregandoDetalhes ? (
                                  <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', padding: '12px' }}>
                                    Carregando dados dos itens e bipagens...
                                  </div>
                                ) : detalhes ? (
                                  <div className="gestao-rec-tabela-desktop">
                                    <table className="gestao-rec-tabela">
                                      <thead>
                                        <tr>
                                          <th>Cód. Produto</th>
                                          <th>Descrição</th>
                                          <th>Qtd Bipada</th>
                                          <th>Nível</th>
                                          <th>Lote Bipado</th>
                                          <th>Validade</th>
                                          <th>Data / Hora</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detalhes.bipagens.length === 0 ? (
                                          <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--slate-400)' }}>
                                              Nenhuma bipagem ativa nesta sessão no momento.
                                            </td>
                                          </tr>
                                        ) : (
                                          detalhes.bipagens.map((b) => (
                                            <tr key={b.id}>
                                              <td><strong>{b.codprod}</strong></td>
                                              <td>Item {b.sequencia}</td>
                                              <td><strong>{b.qtdConferida}</strong></td>
                                              <td>N{b.nivel}</td>
                                              <td>{b.lote || <span style={{ color: 'var(--slate-400)' }}>Sem lote</span>}</td>
                                              <td>{b.validade || '—'}</td>
                                              <td>{new Date(b.timestamp).toLocaleTimeString('pt-BR')}</td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Ações da Conferência */}
                            <div className="gestao-rec-card-acoes">
                              {/* 1. Solicitar Recontagem */}
                              <button
                                type="button"
                                className="gestao-btn-acao gestao-btn-recontar"
                                onClick={() => {
                                  setNivelRecontagemModal(conf.nivelAtual === 1 ? 2 : conf.nivelAtual);
                                  setModalAcao({
                                    tipo: 'SOLICITAR_RECONTAGEM',
                                    conferenciaId: conf.id,
                                    titulo: 'Solicitar Recontagem da Conferência',
                                    descricao: `Defina o nível para recontagem da(s) nota(s) ${conf.numerosNotas}. A conferência ficará disponível para os operadores realizarem a nova contagem cega.`,
                                    placeholder: 'Instrução ou motivo da recontagem para a equipe...',
                                  });
                                }}
                              >
                                <span>🔁 Solicitar Recontagem</span>
                              </button>

                              {/* 2. Reiniciar Conferência */}
                              <button
                                type="button"
                                className="gestao-btn-acao gestao-btn-reiniciar"
                                onClick={() => {
                                  setModalAcao({
                                    tipo: 'REINICIAR',
                                    conferenciaId: conf.id,
                                    titulo: 'Reiniciar Conferência (com Backup de Segurança)',
                                    descricao: `ATENÇÃO: Todas as bipagens ativas da(s) nota(s) ${conf.numerosNotas} serão arquivadas em um backup seguro e a conferência voltará ao Nível 1. Você poderá recuperar esta contagem a qualquer momento usando a opção "Recuperar Contagem".`,
                                    placeholder: 'Motivo obrigatório do reinício...',
                                  });
                                }}
                              >
                                <span>↺ Reiniciar</span>
                              </button>

                              {/* 3. Recuperar Contagem Anterior (se houver backup) */}
                              {conf.temBackupContagem && (
                                <button
                                  type="button"
                                  className="gestao-btn-acao gestao-btn-recuperar"
                                  onClick={() => {
                                    setModalAcao({
                                      tipo: 'RECUPERAR_CONTAGEM',
                                      conferenciaId: conf.id,
                                      titulo: 'Recuperar Contagem Anterior',
                                      descricao: `Deseja restaurar as ${conf.backupContagem?.totalBipagensAnuladas || 0} bipagens arquivadas da(s) nota(s) ${conf.numerosNotas}? A sessão retornará ao status anterior (${conf.backupContagem?.statusAnterior}).`,
                                      placeholder: 'Justificativa da recuperação (opcional)...',
                                      dadosExtras: conf.backupContagem,
                                    });
                                  }}
                                >
                                  <span>💾 Recuperar Contagem ({conf.backupContagem?.totalBipagensAnuladas})</span>
                                </button>
                              )}

                              {/* 4. Ver / Ocultar Itens */}
                              <button
                                type="button"
                                className="gestao-btn-acao gestao-btn-csv"
                                onClick={() => toggleDetalhesConferencia(conf.id, conf.nunotas)}
                              >
                                <span>{isExpandido ? '▲ Ocultar Itens' : '🔍 Ver Bipagens'}</span>
                              </button>

                              {/* 5. Abrir no Coletor */}
                              <button
                                type="button"
                                className="gestao-btn-acao gestao-btn-coletor"
                                onClick={() => {
                                  navigate('/recebimento/conferencia', {
                                    state: {
                                      conferenciaId: conf.id,
                                      nunotas: conf.nunotas,
                                      nivel: conf.nivelAtual,
                                    },
                                  });
                                }}
                              >
                                <span>📱 Abrir no Coletor</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    ABA 2: DIVERGÊNCIAS DE ENTRADA
                    ═══════════════════════════════════════════════════════ */}
                {abaAtiva === 'divergencias' && (
                  <div className="gestao-rec-lista">
                    {divergencias.length === 0 ? (
                      <Container variant="default" padding="lg">
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
                          <span style={{ fontSize: '2.5rem' }}>✨</span>
                          <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
                            Nenhuma divergência pendente!
                          </h3>
                          <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                            Todas as conferências de entrada estão finalizadas sem discordâncias de contagem.
                          </p>
                        </div>
                      </Container>
                    ) : (
                      divergencias.map((grupo) => (
                        <div key={grupo.id} className="gestao-rec-card">
                          {/* Cabeçalho do Card */}
                          <div className="gestao-rec-card-header">
                            <div className="gestao-rec-card-info">
                              <div className="gestao-rec-card-notas">
                                <span>📄 NF(s): {grupo.numerosNotas}</span>
                              </div>
                              <span className="gestao-rec-card-fornecedor">
                                Fornecedor: {grupo.fornecedor}
                              </span>
                              <span className="gestao-rec-card-meta">
                                Conferente: {grupo.conferente || '—'} • Atualizado em:{' '}
                                {new Date(grupo.atualizadoEm).toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className="gestao-rec-card-badges">
                              <span className="badge-nivel-rec">Nível Atual: {grupo.nivelAtual}</span>
                              <span
                                className={`badge-status-rec ${
                                  grupo.status === 'Divergente'
                                    ? 'divergente'
                                    : grupo.status.includes('Reconferência')
                                    ? 'reconferencia'
                                    : 'aguardando'
                                }`}
                              >
                                {grupo.status}
                              </span>
                            </div>
                          </div>

                          {/* Resumo Quantitativo de Contagem */}
                          <div className="gestao-rec-contagem-resumo">
                            <div className="contagem-box">
                              <span className="contagem-rotulo">Faturado (NF)</span>
                              <span className="contagem-valor">{grupo.totalEsperado}</span>
                            </div>
                            <div className="contagem-box">
                              <span className="contagem-rotulo">Contagem N1</span>
                              <span className="contagem-valor">{grupo.totalN1}</span>
                            </div>
                            <div className="contagem-box">
                              <span className="contagem-rotulo">Contagem N2</span>
                              <span className="contagem-valor">{grupo.totalN2}</span>
                            </div>
                            {grupo.totalN3 > 0 && (
                              <div className="contagem-box">
                                <span className="contagem-rotulo">Contagem N3</span>
                                <span className="contagem-valor">{grupo.totalN3}</span>
                              </div>
                            )}
                            <div className="contagem-box divergente">
                              <span className="contagem-rotulo">Itens Divergentes</span>
                              <span className="contagem-valor">{grupo.itensDivergentes.length}</span>
                            </div>
                          </div>

                          {/* Tabela Desktop (> 1024px) */}
                          <div className="gestao-rec-tabela-desktop">
                            <table className="gestao-rec-tabela">
                              <thead>
                                <tr>
                                  <th>Cód. / Ref.</th>
                                  <th>Descrição</th>
                                  <th>Vol.</th>
                                  <th>Esperado</th>
                                  <th>N1</th>
                                  <th>N2</th>
                                  {grupo.totalN3 > 0 && <th>N3</th>}
                                  <th>Diferença</th>
                                  <th>Lote / Validade</th>
                                  <th>Conferentes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.itensDivergentes.map((item) => {
                                  const diferenca = item.diferenca;
                                  const classeDif =
                                    diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                                  return (
                                    <tr key={`${item.nunota}-${item.codprod}-${item.sequencia}`}>
                                      <td>
                                        <strong>{item.codprod}</strong>
                                        {item.referencia && (
                                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                            {item.referencia}
                                          </div>
                                        )}
                                      </td>
                                      <td>{item.descrprod}</td>
                                      <td>{item.codvol}</td>
                                      <td><strong>{item.qtdEsperada}</strong></td>
                                      <td>{item.qtdN1}</td>
                                      <td>{item.qtdN2}</td>
                                      {grupo.totalN3 > 0 && <td>{item.qtdN3}</td>}
                                      <td>
                                        <span className={`diferenca-badge ${classeDif}`}>
                                          {diferenca > 0 ? `+${diferenca}` : diferenca}
                                        </span>
                                      </td>
                                      <td>
                                        {item.lote ? (
                                          <div>
                                            <strong>Lote:</strong> {item.lote}
                                            {item.validade && <div>Val: {item.validade}</div>}
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--slate-400)' }}>Sem lote</span>
                                        )}
                                      </td>
                                      <td style={{ fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                                        {item.conferenteN1 && <div>N1: {item.conferenteN1}</div>}
                                        {item.conferenteN2 && <div>N2: {item.conferenteN2}</div>}
                                        {item.conferenteN3 && <div>N3: {item.conferenteN3}</div>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Cards Mobile (<= 1024px) */}
                          <div className="gestao-rec-itens-mobile">
                            {grupo.itensDivergentes.map((item) => {
                              const diferenca = item.diferenca;
                              const classeDif =
                                diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                              return (
                                <div
                                  key={`mob-${item.nunota}-${item.codprod}-${item.sequencia}`}
                                  className="gestao-item-card-mobile"
                                >
                                  <div className="gestao-item-mobile-header">
                                    <div>
                                      <span className="gestao-item-mobile-codprod">
                                        {item.codprod} - {item.descrprod}
                                      </span>
                                      {item.referencia && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                                          Ref: {item.referencia} • Vol: {item.codvol}
                                        </div>
                                      )}
                                    </div>
                                    <span className={`diferenca-badge ${classeDif}`}>
                                      {diferenca > 0 ? `+${diferenca}` : diferenca}
                                    </span>
                                  </div>

                                  <div className="gestao-item-mobile-grid">
                                    <div>Esperado: <strong>{item.qtdEsperada}</strong></div>
                                    <div>N1: <strong>{item.qtdN1}</strong></div>
                                    <div>N2: <strong>{item.qtdN2}</strong></div>
                                    {grupo.totalN3 > 0 && <div>N3: <strong>{item.qtdN3}</strong></div>}
                                  </div>

                                  {item.lote && (
                                    <div className="gestao-item-mobile-lote-info">
                                      Lote: {item.lote} {item.validade ? `• Val: ${item.validade}` : ''}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Barra de Ações da Conferência */}
                          <div className="gestao-rec-card-acoes">
                            <button
                              type="button"
                              className="gestao-btn-acao gestao-btn-resolver"
                              onClick={() => {
                                setModalAcao({
                                  tipo: 'APROVAR_DIVERGENCIA',
                                  conferenciaId: grupo.id,
                                  titulo: 'Resolver e Aceitar Divergência',
                                  descricao: `Você está prestes a aprovar a conferência da(s) nota(s) ${grupo.numerosNotas} aceitando a contagem física atual como definitiva para o estoque.`,
                                  placeholder: 'Insira a justificativa gerencial para aprovar esta divergência (ex: fornecedor confirmou envio a menor com carta de correção)...',
                                });
                              }}
                            >
                              <span>✓ Resolver Divergência</span>
                            </button>

                            <button
                              type="button"
                              className="gestao-btn-acao gestao-btn-n3"
                              onClick={() => {
                                setModalAcao({
                                  tipo: 'RECONFERIR_N3',
                                  conferenciaId: grupo.id,
                                  titulo: 'Solicitar Reconferência Nível 3 (N3)',
                                  descricao: `Disponibiliza a(s) nota(s) ${grupo.numerosNotas} para uma terceira contagem cega de desempate por outro conferente.`,
                                  placeholder: 'Instrução para a reconferência (opcional)...',
                                });
                              }}
                            >
                              <span>🔍 Reconferir (N3)</span>
                            </button>

                            <button
                              type="button"
                              className="gestao-btn-acao gestao-btn-reiniciar"
                              onClick={() => {
                                setModalAcao({
                                  tipo: 'REINICIAR',
                                  conferenciaId: grupo.id,
                                  titulo: 'Reiniciar Conferência Completa',
                                  descricao: `ATENÇÃO: Todas as bipagens registradas nos Níveis 1, 2 e 3 da(s) nota(s) ${grupo.numerosNotas} serão salvas em backup e a conferência voltará ao início (Nível 1).`,
                                  placeholder: 'Motivo obrigatório do cancelamento e reinício...',
                                });
                              }}
                            >
                              <span>↺ Reiniciar</span>
                            </button>

                            <button
                              type="button"
                              className="gestao-btn-acao gestao-btn-csv"
                              onClick={() => handleExportarCSV(grupo)}
                            >
                              <span>📊 Exportar CSV</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    ABA 3: APROVAÇÃO E ENVIO AO SANKHYA
                    ═══════════════════════════════════════════════════════ */}
                {abaAtiva === 'aprovacao_sankhya' && (
                  <div className="gestao-rec-lista">
                    {conferenciasProntasAgrupadas.length === 0 ? (
                      <Container variant="default" padding="lg">
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
                          <span style={{ fontSize: '2.5rem' }}>📦</span>
                          <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
                            Nenhuma conferência aguardando envio
                          </h3>
                          <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
                            Assim que as conferências forem concluídas ou aprovadas pelo gestor, aparecerão aqui para envio direto ao Sankhya.
                          </p>
                        </div>
                      </Container>
                    ) : (
                      conferenciasProntasAgrupadas.map((grupo) => {
                        const jaEnviado = grupo.status === 'Enviado ao Sankhya';
                        const detalhes = grupo.conferenciaId ? detalhesConferencias[grupo.conferenciaId] : null;
                        const isCarregandoDetalhes = loadingDetalhes === grupo.conferenciaId;

                        return (
                          <div key={grupo.conferenciaId} className="gestao-rec-card">
                            <div className="gestao-rec-card-header">
                              <div className="gestao-rec-card-info">
                                <div className="gestao-rec-card-notas">
                                  <span>📄 NF(s): {grupo.numerosNotas}</span>
                                </div>
                                <span className="gestao-rec-card-fornecedor">
                                  Fornecedor: {grupo.fornecedor}
                                </span>
                                <span className="gestao-rec-card-meta">
                                  Total de Itens Faturados: {grupo.notas.reduce((acc, n) => acc + (n.qtdItens || 0), 0)}
                                </span>
                              </div>

                              <div className="gestao-rec-card-badges">
                                <span
                                  className={`badge-status-rec ${
                                    jaEnviado
                                      ? 'enviado'
                                      : grupo.status === 'Aguardando Aprovação'
                                      ? 'aguardando'
                                      : 'conferido'
                                  }`}
                                >
                                  {grupo.status}
                                </span>
                              </div>
                            </div>

                            {/* Botão de Ver Cruzamento de Itens */}
                            {grupo.conferenciaId && (
                              <div>
                                {!detalhes && !isCarregandoDetalhes ? (
                                  <button
                                    type="button"
                                    className="gestao-btn-acao gestao-btn-csv"
                                    onClick={() => carregarDetalhesConferencia(grupo.conferenciaId, grupo.nunotas)}
                                  >
                                    <span>🔍 Ver Cruzamento de Lotes & Itens da NF</span>
                                  </button>
                                ) : isCarregandoDetalhes ? (
                                  <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                                    Carregando dados dos lotes e itens...
                                  </div>
                                ) : detalhes ? (
                                  <div className="gestao-rec-tabela-desktop" style={{ marginTop: '8px' }}>
                                    <table className="gestao-rec-tabela">
                                      <thead>
                                        <tr>
                                          <th>Cód. Produto</th>
                                          <th>Descrição</th>
                                          <th>Qtd Bipada</th>
                                          <th>Lote Bipado</th>
                                          <th>Validade</th>
                                          <th>Fabricação</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detalhes.bipagens.map((b) => (
                                          <tr key={b.id}>
                                            <td><strong>{b.codprod}</strong></td>
                                            <td>Item {b.sequencia}</td>
                                            <td><strong>{b.qtdConferida}</strong></td>
                                            <td>{b.lote || <span style={{ color: 'var(--slate-400)' }}>Sem lote</span>}</td>
                                            <td>{b.validade || '—'}</td>
                                            <td>{b.fabricacao || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Ações de Envio */}
                            <div className="gestao-rec-card-acoes">
                              {!jaEnviado ? (
                                <button
                                  type="button"
                                  className="gestao-btn-acao gestao-btn-enviar-sankhya"
                                  onClick={() => {
                                    setModalAcao({
                                      tipo: 'ENVIAR_SANKHYA',
                                      conferenciaId: grupo.conferenciaId,
                                      titulo: 'Aprovar e Integrar ao Sankhya',
                                      descricao: `Confirma a integração dos lotes e atualização do estoque (TGFITE / TGFLOT / TGFEST) da(s) nota(s) ${grupo.numerosNotas}?`,
                                      placeholder: 'Observação opcional gravada na nota do Sankhya...',
                                    });
                                  }}
                                >
                                  <span>🚀 Aprovar & Enviar ao Sankhya</span>
                                </button>
                              ) : (
                                <div style={{ fontSize: '0.85rem', color: '#6d28d9', fontWeight: 600 }}>
                                  ✓ Esta conferência já foi sincronizada com o ERP Sankhya com sucesso.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}

            {/* Modal de Ações / Justificativa / Configuração */}
            {modalAcao && (
              <div className="gestao-modal-backdrop">
                <div className="gestao-modal-box">
                  <h3 className="gestao-modal-titulo">{modalAcao.titulo}</h3>
                  <p className="gestao-modal-desc">{modalAcao.descricao}</p>

                  {/* Detalhes para Recontagem */}
                  {modalAcao.tipo === 'SOLICITAR_RECONTAGEM' && (
                    <div className="gestao-modal-niveis-recontagem">
                      <label className={`gestao-modal-nivel-opcao ${nivelRecontagemModal === 1 ? 'selecionado' : ''}`}>
                        <input
                          type="radio"
                          name="nivelRecontagem"
                          value={1}
                          checked={nivelRecontagemModal === 1}
                          onChange={() => setNivelRecontagemModal(1)}
                        />
                        <div className="gestao-modal-nivel-info">
                          <strong>Nível 1 - Recontagem Cega Simples</strong>
                          <span>Recontagem rápida pelo código de barras/produto sem exigir lote e validade.</span>
                        </div>
                      </label>

                      <label className={`gestao-modal-nivel-opcao ${nivelRecontagemModal === 2 ? 'selecionado' : ''}`}>
                        <input
                          type="radio"
                          name="nivelRecontagem"
                          value={2}
                          checked={nivelRecontagemModal === 2}
                          onChange={() => setNivelRecontagemModal(2)}
                        />
                        <div className="gestao-modal-nivel-info">
                          <strong>Nível 2 - Recontagem com Lote e Validade (Recomendado)</strong>
                          <span>Recontagem cega completa registrando código, lote e data de validade por produto.</span>
                        </div>
                      </label>

                      <label className={`gestao-modal-nivel-opcao ${nivelRecontagemModal === 3 ? 'selecionado' : ''}`}>
                        <input
                          type="radio"
                          name="nivelRecontagem"
                          value={3}
                          checked={nivelRecontagemModal === 3}
                          onChange={() => setNivelRecontagemModal(3)}
                        />
                        <div className="gestao-modal-nivel-info">
                          <strong>Nível 3 - Reconferência de Desempate (N3)</strong>
                          <span>Para casos onde N1 e N2 divergiram e necessita de um 3º conferente para desempate.</span>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Detalhes do Backup a Restaurar */}
                  {modalAcao.tipo === 'RECUPERAR_CONTAGEM' && modalAcao.dadosExtras && (
                    <div className="gestao-card-backup-aviso" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '1.2rem' }}>📋</span>
                      <div>
                        <div><strong>Status a restabelecer:</strong> {modalAcao.dadosExtras.statusAnterior} (N{modalAcao.dadosExtras.nivelAnterior})</div>
                        <div><strong>Bipagens a restaurar:</strong> {modalAcao.dadosExtras.totalBipagensAnuladas} itens</div>
                        <div><strong>Reiniciado em:</strong> {new Date(modalAcao.dadosExtras.reiniciadoEm).toLocaleString('pt-BR')} por {modalAcao.dadosExtras.reiniciadoPor}</div>
                        {modalAcao.dadosExtras.motivo && (
                          <div><strong>Motivo do reinício registrado:</strong> "{modalAcao.dadosExtras.motivo}"</div>
                        )}
                      </div>
                    </div>
                  )}

                  <textarea
                    className="gestao-modal-textarea"
                    placeholder={modalAcao.placeholder}
                    value={observacaoModal}
                    onChange={(e) => setObservacaoModal(e.target.value)}
                  />

                  <div className="gestao-modal-acoes">
                    <button
                      type="button"
                      className="gestao-modal-btn-cancelar"
                      onClick={() => {
                        setModalAcao(null);
                        setObservacaoModal('');
                      }}
                      disabled={processandoAcao}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="gestao-modal-btn-confirmar"
                      onClick={handleConfirmarAcaoModal}
                      disabled={processandoAcao}
                    >
                      {processandoAcao ? 'Processando...' : 'Confirmar Ação'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
