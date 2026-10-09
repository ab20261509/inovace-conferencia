import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import {
  ConferenciaDivergenciaGrupo,
  NotaEntrada,
  ObterItensConferenciaResponse,
} from '../../domain/models/ConferenciaEntrada';
import { AppLayout, AppHeader, Container } from '../components';
import { Loading } from '../components/Loading/Loading';
import './GestaoRecebimento.css';

const recebimentoService = new RecebimentoApiService();

export function GestaoRecebimentoPage() {
  const { temPermissao } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<'divergencias' | 'aprovacao_sankhya'>('divergencias');

  // Estados de dados
  const [divergencias, setDivergencias] = useState<ConferenciaDivergenciaGrupo[]>([]);
  const [conferenciasProntas, setConferenciasProntas] = useState<NotaEntrada[]>([]);
  const [detalhesProntas, setDetalhesProntas] = useState<Record<string, ObterItensConferenciaResponse>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState<string | null>(null);

  // Estados de feedback e modais
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalAcao, setModalAcao] = useState<{
    tipo: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3' | 'REINICIAR' | 'ENVIAR_SANKHYA';
    conferenciaId: string;
    titulo: string;
    descricao: string;
    placeholder: string;
  } | null>(null);
  const [observacaoModal, setObservacaoModal] = useState('');
  const [processandoAcao, setProcessandoAcao] = useState(false);

  const podeAcessar = temPermissao('conferencia_entrada') || temPermissao('gerenciar_acessos');

  // Carregar dados
  const carregarDados = useCallback(async () => {
    if (!podeAcessar) return;
    setLoading(true);
    setFeedback(null);
    try {
      // 1. Carregar divergências
      const divs = await recebimentoService.listarDivergencias();
      setDivergencias(divs);

      // 2. Carregar notas prontas para envio (Conferido / Aguardando Aprovação / Enviado ao Sankhya)
      const todasNotas = await recebimentoService.listarNotas();
      const prontas = todasNotas.filter(
        (n) =>
          n.statusConferencia === 'Conferido' ||
          n.statusConferencia === 'Aguardando Aprovação' ||
          n.statusConferencia === 'Enviado ao Sankhya'
      );
      setConferenciasProntas(prontas);
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao carregar dados de gestão de recebimento.',
      });
    } finally {
      setLoading(false);
    }
  }, [podeAcessar]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Carregar itens detalhados para envio Sankhya ao expandir
  const carregarDetalhesNota = async (conferenciaId: string, nunotas: number[]) => {
    if (detalhesProntas[conferenciaId]) return;
    setLoadingDetalhes(conferenciaId);
    try {
      const resp = await recebimentoService.obterItensConferencia(conferenciaId, nunotas);
      setDetalhesProntas((prev) => ({ ...prev, [conferenciaId]: resp }));
    } catch (err: any) {
      console.error('Erro ao obter detalhes da conferência:', err);
    } finally {
      setLoadingDetalhes(null);
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
          texto: 'Conferência reiniciada! Bipagens anteriores foram anuladas e retornou ao Nível 1.',
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
            subtitulo="Tratamento de divergências de entrada, reconferências e aprovação de envio ao ERP"
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

            {/* Navegação de Abas */}
            <div className="gestao-rec-nav">
              <button
                type="button"
                className={`gestao-rec-tab-btn ${abaAtiva === 'divergencias' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('divergencias')}
              >
                <span>⚠️ Divergências de Entrada</span>
                <span className="gestao-rec-tab-badge">{divergencias.length}</span>
              </button>
              <button
                type="button"
                className={`gestao-rec-tab-btn ${abaAtiva === 'aprovacao_sankhya' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('aprovacao_sankhya')}
              >
                <span>🚀 Aprovação & Envio ao Sankhya</span>
                <span className="gestao-rec-tab-badge">{conferenciasProntasAgrupadas.length}</span>
              </button>
            </div>

            {/* Toolbar com Atualização */}
            <div className="gestao-rec-toolbar">
              <span className="gestao-rec-toolbar-titulo">
                {abaAtiva === 'divergencias'
                  ? `Conferências Divergentes (${divergencias.length})`
                  : `Conferências Prontas / Enviadas ao Sankhya (${conferenciasProntasAgrupadas.length})`}
              </span>
              <button
                type="button"
                className="gestao-rec-btn-refresh"
                onClick={carregarDados}
                disabled={loading}
              >
                <span>🔄 Atualizar Dados</span>
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <Loading mensagem="Carregando dados da gestão de recebimento..." />
            ) : (
              <>
                {/* ═══════════════════════════════════════════════════════
                    ABA 1: DIVERGÊNCIAS DE ENTRADA
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
                                  descricao: `ATENÇÃO: Todas as bipagens registradas nos Níveis 1, 2 e 3 da(s) nota(s) ${grupo.numerosNotas} serão anuladas e a conferência voltará ao início (Nível 1).`,
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
                    ABA 2: APROVAÇÃO E ENVIO AO SANKHYA
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
                        const detalhes = grupo.conferenciaId ? detalhesProntas[grupo.conferenciaId] : null;
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
                                    onClick={() => carregarDetalhesNota(grupo.conferenciaId, grupo.nunotas)}
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

            {/* Modal de Ações / Justificativa */}
            {modalAcao && (
              <div className="gestao-modal-backdrop">
                <div className="gestao-modal-box">
                  <h3 className="gestao-modal-titulo">{modalAcao.titulo}</h3>
                  <p className="gestao-modal-desc">{modalAcao.descricao}</p>

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
