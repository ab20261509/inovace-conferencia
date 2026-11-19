import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout, AppHeader } from '../../components';
import { ProdutoImagem } from '../../components/common/ProdutoImagem';
import { useAuth } from '../../../application/contexts/AuthContext';
import {
  TarefaReabastecimento,
  ReabastecimentoResumo,
  StatusReabastecimento,
} from '../../../domain/models/Reabastecimento';
import { reabastecimentoApiService } from '../../../infrastructure/api/ReabastecimentoApiService';
import './ReabastecimentoPage.css';

function tocarSom(tipo: 'sucesso' | 'erro') {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (tipo === 'sucesso') {
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch {
    // Silencioso
  }
}

export function ReabastecimentoPage() {
  const { isAuthenticated, temPermissao } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const podeConfirmar = temPermissao('reabastecimento_confirmar');
  const podeCancelar = temPermissao('reabastecimento_cancelar');
  const podeFinalizarFalta = temPermissao('reabastecimento_finalizar_falta');

  const [tarefas, setTarefas] = useState<TarefaReabastecimento[]>([]);
  const [resumo, setResumo] = useState<ReabastecimentoResumo>({
    total: 0,
    pendentes: 0,
    semPulmao: 0,
    concluidasHoje: 0,
  });
  const [carregando, setCarregando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [termoBusca, setTermoBusca] = useState('');
  const [modalConcluir, setModalConcluir] = useState<{
    aberto: boolean;
    tarefa?: TarefaReabastecimento;
  }>({ aberto: false });
  const [qtdAtendidaInput, setQtdAtendidaInput] = useState<number>(1);
  const [salvando, setSalvando] = useState(false);

  const [modalCancelar, setModalCancelar] = useState<{
    aberto: boolean;
    tarefa?: TarefaReabastecimento;
  }>({ aberto: false });
  const [motivoCancelar, setMotivoCancelar] = useState('');
  const [cancelando, setCancelando] = useState(false);

  const [modalFalta, setModalFalta] = useState<{
    aberto: boolean;
    tarefa?: TarefaReabastecimento;
  }>({ aberto: false });
  const [motivoFalta, setMotivoFalta] = useState('');
  const [salvandoFalta, setSalvandoFalta] = useState(false);

  const [modalFinalizarFalta, setModalFinalizarFalta] = useState<{
    aberto: boolean;
    tarefa?: TarefaReabastecimento;
  }>({ aberto: false });
  const [obsFinalizarFalta, setObsFinalizarFalta] = useState('');
  const [finalizandoFalta, setFinalizandoFalta] = useState(false);

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [detalhesEstoqueAbertos, setDetalhesEstoqueAbertos] = useState<Record<string, boolean>>({});
  const [saldoHoverId, setSaldoHoverId] = useState<string | null>(null);
  const [tooltipHoverId, setTooltipHoverId] = useState<string | null>(null);
  const [tooltipAberto, setTooltipAberto] = useState<Record<string, boolean>>({});
  const [tooltipModalHover, setTooltipModalHover] = useState(false);
  const [tooltipModalAberto, setTooltipModalAberto] = useState(false);
  const [modoVisualizacao, setModoVisualizacao] = useState<'CARD' | 'LISTA'>('CARD');
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const res = await reabastecimentoApiService.listar();
      setTarefas(res.tarefas);
      setResumo(res.resumo);
    } catch (err: any) {
      console.error('Erro ao carregar tarefas de reabastecimento:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const totalFaltasPulmao = useMemo(() => {
    return tarefas.filter((t) => t.status === 'FALTA_PULMAO').length;
  }, [tarefas]);

  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      // Filtro por status
      if (filtroStatus === 'PENDENTE' && t.status !== 'PENDENTE') return false;
      if (filtroStatus === 'VERIFICAR_ESTOQUE' && t.status !== 'VERIFICAR_ESTOQUE') return false;
      if (filtroStatus === 'CONCLUIDO' && t.status !== 'CONCLUIDO') return false;
      if (filtroStatus === 'FALTA_PULMAO' && t.status !== 'FALTA_PULMAO') return false;

      // Filtro por termo de busca
      if (termoBusca.trim()) {
        const termo = termoBusca.trim().toLowerCase();
        const matchesCarga = String(t.ordemCarga).includes(termo);
        const matchesProd = String(t.codprod).includes(termo);
        const matchesDescr = t.descrprod?.toLowerCase().includes(termo);
        const matchesBarra = t.codbarra?.toLowerCase().includes(termo);
        const matchesEnd = t.enderecoPulmao?.toLowerCase().includes(termo) || t.enderecoPicking?.toLowerCase().includes(termo);

        if (!matchesCarga && !matchesProd && !matchesDescr && !matchesBarra && !matchesEnd) {
          return false;
        }
      }

      return true;
    });
  }, [tarefas, filtroStatus, termoBusca]);

  const handleAbrirModalConcluir = (tarefa: TarefaReabastecimento) => {
    setModalConcluir({ aberto: true, tarefa });
    setQtdAtendidaInput(tarefa.quantidadeSolicitada);
    setTooltipModalHover(false);
    setTooltipModalAberto(false);
  };

  const handleConfirmarConclusao = async () => {
    if (!modalConcluir.tarefa || salvando) return;

    try {
      setSalvando(true);
      const res = await reabastecimentoApiService.concluir(
        modalConcluir.tarefa.id,
        qtdAtendidaInput,
      );

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalConcluir({ aberto: false });
      setTimeout(() => setMensagemSucesso(null), 5000);
      await carregarDados();
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao confirmar reabastecimento.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirModalCancelar = (tarefa: TarefaReabastecimento) => {
    setModalCancelar({ aberto: true, tarefa });
    setMotivoCancelar('');
  };

  const handleConfirmarCancelamento = async () => {
    if (!modalCancelar.tarefa || cancelando) return;

    try {
      setCancelando(true);
      const res = await reabastecimentoApiService.cancelar(
        modalCancelar.tarefa.id,
        motivoCancelar.trim() || undefined,
      );

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalCancelar({ aberto: false });
      setTimeout(() => setMensagemSucesso(null), 5000);
      await carregarDados();
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao cancelar reabastecimento.');
    } finally {
      setCancelando(false);
    }
  };

  const handleAbrirModalFalta = (tarefa: TarefaReabastecimento) => {
    setModalFalta({ aberto: true, tarefa });
    setMotivoFalta('');
  };

  const handleConfirmarFalta = async () => {
    if (!modalFalta.tarefa || salvandoFalta) return;

    try {
      setSalvandoFalta(true);
      const res = await reabastecimentoApiService.registrarFalta(
        modalFalta.tarefa.id,
        motivoFalta.trim() || undefined,
      );

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalFalta({ aberto: false });
      setTimeout(() => setMensagemSucesso(null), 5000);
      await carregarDados();
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao registrar falta no pulmão.');
    } finally {
      setSalvandoFalta(false);
    }
  };

  const handleAbrirModalFinalizarFalta = (tarefa: TarefaReabastecimento) => {
    setModalFinalizarFalta({ aberto: true, tarefa });
    setObsFinalizarFalta('');
  };

  const handleConfirmarFinalizacaoFalta = async () => {
    if (!modalFinalizarFalta.tarefa || finalizandoFalta) return;

    try {
      setFinalizandoFalta(true);
      const res = await reabastecimentoApiService.finalizarFalta(
        modalFinalizarFalta.tarefa.id,
        'CORTAR',
        obsFinalizarFalta.trim() || undefined,
      );

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalFinalizarFalta({ aberto: false });
      setTimeout(() => setMensagemSucesso(null), 5000);
      await carregarDados();
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao finalizar falta no pulmão.');
    } finally {
      setFinalizandoFalta(false);
    }
  };

  const formatarData = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <AppLayout>
      {({ openDrawer, abrirConsultaProduto }) => (
        <div className="reabastecimento-container">
          {/* ═══ CABEÇALHO FIXO: TÍTULO + KPIS EM LINHA + BUSCA COM ALTERNADOR DE MODO ═══ */}
          <div className="reabastecimento-header-sticky">
            <AppHeader
              titulo="Reabastecimento de Picking"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />

            {/* Linha única de KPIs compactos com ícone no topo */}
            <div className="reabastecimento-kpis-row">
              <button
                type="button"
                className={`reabastecimento-kpi-pill total ${filtroStatus === 'TODOS' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('TODOS')}
                title="Filtrar todas as tarefas"
              >
                <span className="kpi-icon">🚜</span>
                <span className="kpi-dados">
                  <strong className="kpi-num">{resumo.total}</strong>
                  <span className="kpi-rotulo">Total</span>
                </span>
              </button>

              <button
                type="button"
                className={`reabastecimento-kpi-pill pendente ${filtroStatus === 'PENDENTE' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('PENDENTE')}
                title="Filtrar tarefas aguardando pulmão"
              >
                <span className="kpi-icon">⏳</span>
                <span className="kpi-dados">
                  <strong className="kpi-num">{resumo.pendentes}</strong>
                  <span className="kpi-rotulo">Aguard.</span>
                </span>
              </button>

              <button
                type="button"
                className={`reabastecimento-kpi-pill sempulmao ${filtroStatus === 'VERIFICAR_ESTOQUE' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('VERIFICAR_ESTOQUE')}
                title="Filtrar sem pulmão cadastrado"
              >
                <span className="kpi-icon">⚠️</span>
                <span className="kpi-dados">
                  <strong className="kpi-num">{resumo.semPulmao}</strong>
                  <span className="kpi-rotulo">S/ Pulm</span>
                </span>
              </button>

              <button
                type="button"
                className={`reabastecimento-kpi-pill concluido ${filtroStatus === 'CONCLUIDO' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('CONCLUIDO')}
                title="Filtrar tarefas concluídas hoje"
              >
                <span className="kpi-icon">✓</span>
                <span className="kpi-dados">
                  <strong className="kpi-num">{resumo.concluidasHoje}</strong>
                  <span className="kpi-rotulo">Hoje</span>
                </span>
              </button>

              <button
                type="button"
                className={`reabastecimento-kpi-pill falta ${filtroStatus === 'FALTA_PULMAO' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('FALTA_PULMAO')}
                title="Filtrar tarefas com falta de pulmão"
              >
                <span className="kpi-icon">⚠️</span>
                <span className="kpi-dados">
                  <strong className="kpi-num">{totalFaltasPulmao}</strong>
                  <span className="kpi-rotulo">Faltas</span>
                </span>
              </button>
            </div>

            {/* Linha de Busca + Alternador de Modo (Cards / Lista) */}
            <div className="reabastecimento-search-row">
              <div className="reabastecimento-search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="reabastecimento-busca-input"
                  placeholder="Buscar carga, produto, barras, endereço..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                />
                {termoBusca && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setTermoBusca('')}
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                className="reabastecimento-btn-modo-toggle"
                onClick={() => setModoVisualizacao(modoVisualizacao === 'CARD' ? 'LISTA' : 'CARD')}
                title={modoVisualizacao === 'CARD' ? 'Alternar para Modo Lista' : 'Alternar para Modo Cards'}
              >
                {modoVisualizacao === 'CARD' ? (
                  <>
                    <span>📋</span>
                    <span className="toggle-rotulo">Lista</span>
                  </>
                ) : (
                  <>
                    <span>🗂️</span>
                    <span className="toggle-rotulo">Cards</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ═══ MENSAGEM DE SUCESSO ═══ */}
          {mensagemSucesso && (
            <div
              style={{
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '10px 14px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ✓ {mensagemSucesso}
            </div>
          )}

          {/* ═══ LISTA / GRADE DE TAREFAS ═══ */}
          {carregando && tarefas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              Carregando fila de reabastecimento...
            </div>
          ) : tarefasFiltradas.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 48,
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                color: '#64748b',
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#334155' }}>
                Nenhuma tarefa de reabastecimento encontrada.
              </p>
              <p style={{ fontSize: 13, margin: '6px 0 0 0' }}>
                Quando uma carga de separação for finalizada com falta, as tarefas de busca no pulmão aparecerão aqui.
              </p>
            </div>
          ) : modoVisualizacao === 'LISTA' ? (
            /* ═══ MODO LISTA COMPACTA ═══ */
            <div className="reabastecimento-lista-tarefas">
              {tarefasFiltradas.map((t) => {
                const isConcluida = t.status === 'CONCLUIDO';
                const isSemPulmao = t.status === 'VERIFICAR_ESTOQUE';
                const isFaltaPulmao = t.status === 'FALTA_PULMAO';
                const isFaltaConfirmada = t.status === 'FALTA_CONFIRMADA';

                return (
                  <div
                    key={t.id}
                    className={`reabastecimento-item-lista ${isConcluida ? 'concluida' : ''} ${
                      isFaltaPulmao ? 'falta-pulmao' : ''
                    }`}
                  >
                    {/* Topo do Item Lista: Carga, Empresa, Badges e Quantidade */}
                    <div className="reabastecimento-item-lista-topo">
                      <div className="reabastecimento-item-lista-origem">
                        <span className="reabastecimento-carga-badge">Carga #{t.ordemCarga}</span>
                        {t.codemp && (
                          <span className="reabastecimento-empresa-badge">
                            🏢 Emp {t.codemp}
                          </span>
                        )}
                        {isFaltaPulmao && (
                          <span className="reabastecimento-falta-badge">⚠️ Falta Pulmão</span>
                        )}
                        {isFaltaConfirmada && (
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#64748b',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            ✂️ Corte
                          </span>
                        )}
                      </div>

                      <span
                        className={`reabastecimento-header-qtd-badge ${
                          isConcluida ? 'concluido' : ''
                        }`}
                        style={{ fontSize: 12, padding: '3px 8px' }}
                      >
                        {isConcluida
                          ? `✓ ${t.quantidadeAtendida} UN`
                          : isFaltaConfirmada
                          ? `✂️ ${t.quantidadeSolicitada} UN`
                          : `${t.quantidadeSolicitada} UN`}
                      </span>
                    </div>

                    {/* Descrição do Produto */}
                    <div>
                      <div className="reabastecimento-item-lista-prod">
                        {t.codprod} - {t.descrprod}
                      </div>
                      <div className="reabastecimento-item-lista-sub">
                        {t.referencia && <span>Ref: {t.referencia}</span>}
                        {t.codbarra && <span>Barras: {t.codbarra}</span>}
                      </div>
                    </div>

                    {/* Rota Pulmão ➔ Picking + Saldo */}
                    <div className="reabastecimento-item-lista-rota">
                      <span>📦 <strong>{t.enderecoPulmao || 'Sem Pulmão'}</strong></span>
                      <span style={{ color: '#94a3b8' }}>➔</span>
                      <span>📍 <strong>{t.enderecoPicking || 'Sem Picking'}</strong></span>
                      <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 11 }}>
                        Saldo: <strong>{t.saldoDisponivel != null ? `${t.saldoDisponivel} UN` : '—'}</strong>
                      </span>
                    </div>

                    {/* Ações e Metadados do Item: (i) e Solicitado à esquerda, Ações à direita */}
                    <div className="reabastecimento-item-lista-acoes">
                      <div className="reabastecimento-item-lista-meta-esq">
                        {t.observacao && (
                          <div className="reabastecimento-tooltip-wrapper">
                            <button
                              type="button"
                              className="reabastecimento-btn-info"
                              style={{ width: 24, height: 24, fontSize: 12, flexShrink: 0 }}
                              title="Ver observação"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTooltipAberto((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
                              }}
                            >
                              ℹ️
                            </button>
                            {(tooltipHoverId === t.id || tooltipAberto[t.id]) && (
                              <div className="reabastecimento-tooltip-box">
                                <span className="tooltip-titulo">Observação da Solicitação:</span>
                                <span>{t.observacao}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <span className="reabastecimento-meta-info" style={{ fontSize: 11 }}>
                          {isConcluida
                            ? `✓ Concluído: ${formatarData(t.concluidoEm)}${t.concluidoPor ? ` • ${t.concluidoPor}` : ''}`
                            : isFaltaConfirmada
                            ? `✂️ Cortado: ${formatarData(t.concluidoEm)}${t.concluidoPor ? ` • ${t.concluidoPor}` : ''}`
                            : `Solicitado: ${formatarData(t.solicitadoEm)}${t.solicitadoPor ? ` • ${t.solicitadoPor}` : ''}`}
                        </span>
                      </div>

                      {!isConcluida && !isFaltaConfirmada && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {isFaltaPulmao ? (
                            <>
                              {podeConfirmar && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-concluir"
                                  style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                                  onClick={() => handleAbrirModalConcluir(t)}
                                >
                                  🚜 Abastecer
                                </button>
                              )}
                              {podeFinalizarFalta && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-finalizar-falta"
                                  style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                                  onClick={() => handleAbrirModalFinalizarFalta(t)}
                                >
                                  ✂️ Corte
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {podeCancelar && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-cancelar"
                                  style={{ minHeight: 32, padding: '4px 8px', fontSize: 12 }}
                                  onClick={() => handleAbrirModalCancelar(t)}
                                >
                                  ✕
                                </button>
                              )}
                              <button
                                type="button"
                                className="reabastecimento-btn-nao-encontrado"
                                style={{ minHeight: 32, padding: '4px 10px', fontSize: 12 }}
                                onClick={() => handleAbrirModalFalta(t)}
                              >
                                ⚠️ Falta
                              </button>
                              {podeConfirmar && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-concluir"
                                  style={{ minHeight: 32, padding: '4px 12px', fontSize: 12 }}
                                  onClick={() => handleAbrirModalConcluir(t)}
                                >
                                  🚜 Abastecer
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ═══ MODO CARDS COM SNAP SCROLL ═══ */
            <div className="reabastecimento-grid-tarefas modo-cards">
              {tarefasFiltradas.map((t) => {
                const isConcluida = t.status === 'CONCLUIDO';
                const isSemPulmao = t.status === 'VERIFICAR_ESTOQUE';
                const isFaltaPulmao = t.status === 'FALTA_PULMAO';
                const isFaltaConfirmada = t.status === 'FALTA_CONFIRMADA';

                return (
                  <div
                    key={t.id}
                    className={`reabastecimento-card-tarefa snap-item ${isConcluida ? 'concluida' : ''} ${
                      isFaltaPulmao ? 'falta-pulmao' : ''
                    }`}
                  >
                    {/* Header do Card */}
                    <div className="reabastecimento-card-header">
                      <div className="reabastecimento-header-origem">
                        <span className="reabastecimento-carga-badge">
                          Carga #{t.ordemCarga}
                        </span>

                        {t.codemp && (
                          <span
                            className="reabastecimento-empresa-badge"
                            title={`Empresa ${t.codemp}${t.nomeEmpresa ? ` - ${t.nomeEmpresa}` : ''}`}
                          >
                            🏢 {t.codemp}{t.nomeEmpresa ? ` - ${t.nomeEmpresa}` : ''}
                          </span>
                        )}

                        {isFaltaPulmao && (
                          <span className="reabastecimento-falta-badge">
                            ⚠️ Falta de Pulmão
                          </span>
                        )}

                        {isFaltaConfirmada && (
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#64748b',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            ✂️ Corte Confirmado
                          </span>
                        )}
                      </div>

                      <span
                        className={`reabastecimento-header-qtd-badge ${
                          isConcluida ? 'concluido' : ''
                        }`}
                      >
                        {isConcluida
                          ? `✓ ${t.quantidadeAtendida} UN Abastecidas`
                          : isFaltaConfirmada
                          ? `✂️ ${t.quantidadeSolicitada} UN Cortadas`
                          : `${t.quantidadeSolicitada} UN a Abastecer`}
                      </span>
                    </div>

                    {/* Imagem do Produto Centralizada */}
                    <div className="reabastecimento-card-imagem-wrapper">
                      <ProdutoImagem
                        codProd={t.codprod}
                        alt={t.descrprod || undefined}
                        className="reabastecimento-card-imagem"
                        onFotoClick={(url) => setImagemAmpliada(url)}
                      />
                    </div>

                    {/* Informações do Produto */}
                    <div className="reabastecimento-produto-info">
                      <span className="reabastecimento-prod-titulo">
                        {t.codprod} - {t.descrprod}
                      </span>
                      <div className="reabastecimento-prod-sub">
                        {t.referencia && <span>Ref: {t.referencia}</span>}
                        {t.referencia && t.codbarra && <span style={{ color: '#cbd5e1' }}>•</span>}
                        {t.codbarra && <span>Barras: {t.codbarra}</span>}
                      </div>
                    </div>

                    {/* Rota Pulmão -> Picking em 2 Colunas com Rótulo e Endereço */}
                    <div className="reabastecimento-rota-compacta">
                      <div className="rota-coluna origem">
                        <span className="rota-rotulo">📦 Pulmão</span>
                        <span className={`rota-endereco ${t.enderecoPulmao ? '' : 'sem-endereco'}`}>
                          {t.enderecoPulmao || 'Sem endereço'}
                        </span>
                      </div>

                      <span className="rota-seta">➔</span>

                      <div className="rota-coluna destino">
                        <span className="rota-rotulo">📍 Picking</span>
                        <span className={`rota-endereco ${t.enderecoPicking ? '' : 'sem-endereco'}`}>
                          {t.enderecoPicking || 'Sem endereço'}
                        </span>
                      </div>
                    </div>

                    {/* Saldo de Estoque Disponível com Popover Flutuante */}
                    <div className="reabastecimento-saldo-wrapper">
                      <button
                        type="button"
                        className={`reabastecimento-saldo-trigger ${
                          t.detalhesEstoque && t.detalhesEstoque.length > 0 ? 'tem-detalhes' : ''
                        }`}
                        title={
                          t.detalhesEstoque && t.detalhesEstoque.length > 0
                            ? 'Clique ou passe o mouse para ver locais e lotes disponíveis'
                            : undefined
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (t.detalhesEstoque && t.detalhesEstoque.length > 0) {
                            setDetalhesEstoqueAbertos((prev) => ({
                              ...prev,
                              [t.id]: !prev[t.id],
                            }));
                          }
                        }}
                        onMouseEnter={() => {
                          if (t.detalhesEstoque && t.detalhesEstoque.length > 0) {
                            setSaldoHoverId(t.id);
                          }
                        }}
                        onMouseLeave={() => setSaldoHoverId(null)}
                      >
                        <span className="saldo-texto">
                          📦 Saldo Estoque: <strong>{t.saldoDisponivel != null ? `${t.saldoDisponivel} UN` : 'Consultando...'}</strong>
                        </span>
                        {t.detalhesEstoque && t.detalhesEstoque.length > 0 && (
                          <span className="saldo-indicador-badge">
                            locais ({t.detalhesEstoque.length}) ▾
                          </span>
                        )}
                      </button>

                      {/* Popover Escuro Flutuante de Estoque por Local / Lote */}
                      {(saldoHoverId === t.id || detalhesEstoqueAbertos[t.id]) &&
                        t.detalhesEstoque &&
                        t.detalhesEstoque.length > 0 && (
                          <div
                            className="reabastecimento-saldo-popover"
                            onMouseEnter={() => setSaldoHoverId(t.id)}
                            onMouseLeave={() => setSaldoHoverId(null)}
                          >
                            <div className="saldo-popover-header">
                              <span className="saldo-popover-titulo">ESTOQUE POR LOCAL / LOTE</span>
                              <span className="saldo-popover-total">Total: {t.saldoDisponivel} UN</span>
                            </div>
                            <div className="saldo-popover-lista">
                              {t.detalhesEstoque.map((d, i) => (
                                <div key={i} className="saldo-popover-item">
                                  <div className="saldo-popover-local-info">
                                    <div className="saldo-popover-linha1">
                                      <span className="saldo-badge-local">Local {d.codLocal}</span>
                                      <span className="saldo-nome-local">{d.local}</span>
                                    </div>
                                    {d.controle && (
                                      <span className="saldo-lote-info">Lote: {d.controle}</span>
                                    )}
                                  </div>
                                  <span
                                    className={`saldo-popover-qtd ${
                                      d.disponivel > 0 ? 'positivo' : 'zerado'
                                    }`}
                                  >
                                    {d.disponivel} UN
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Rodapé: Metadados da Solicitação e Ações Compactas */}
                    <div className="reabastecimento-footer-row">
                      <div className="reabastecimento-meta-wrapper">
                        {t.observacao && (
                          <div className="reabastecimento-tooltip-wrapper">
                            <button
                              type="button"
                              className="reabastecimento-btn-info"
                              title="Clique ou passe o mouse para ver observações"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTooltipAberto((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
                              }}
                              onMouseEnter={() => setTooltipHoverId(t.id)}
                              onMouseLeave={() => setTooltipHoverId(null)}
                            >
                              ℹ️
                            </button>
                            {(tooltipHoverId === t.id || tooltipAberto[t.id]) && (
                              <div className="reabastecimento-tooltip-box">
                                <span className="tooltip-titulo">Observação da Solicitação:</span>
                                <span>{t.observacao}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <span className="reabastecimento-meta-info">
                          {isConcluida
                            ? `Concluído: ${formatarData(t.concluidoEm)} • ${t.concluidoPor}`
                            : isFaltaConfirmada
                            ? `Cortado: ${formatarData(t.concluidoEm)} • ${t.concluidoPor}`
                            : `Solicitado: ${formatarData(t.solicitadoEm)} • ${t.solicitadoPor}`}
                        </span>
                      </div>

                      {!isConcluida && !isFaltaConfirmada && (
                        <div className="reabastecimento-acoes-botoes">
                          {isFaltaPulmao ? (
                            <>
                              {podeConfirmar && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-concluir"
                                  onClick={() => handleAbrirModalConcluir(t)}
                                  title="Produto foi encontrado: abastecer o picking agora"
                                >
                                  🚜 Abastecer
                                </button>
                              )}
                              {podeFinalizarFalta && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-finalizar-falta"
                                  onClick={() => handleAbrirModalFinalizarFalta(t)}
                                  title="Finalizar falta no pulmão e confirmar corte no pedido da carga"
                                >
                                  ✂️ Confirmar Corte Definitivo
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {podeCancelar && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-cancelar"
                                  onClick={() => handleAbrirModalCancelar(t)}
                                  title="Recusar ou cancelar tarefa"
                                >
                                  ✕ Recusar
                                </button>
                              )}
                              <button
                                type="button"
                                className="reabastecimento-btn-nao-encontrado"
                                onClick={() => handleAbrirModalFalta(t)}
                                title="Informar que o produto não foi encontrado fisicamente no estoque/pulmão"
                              >
                                ⚠️ Não Encontrado
                              </button>
                              {podeConfirmar && (
                                <button
                                  type="button"
                                  className="reabastecimento-btn-concluir"
                                  onClick={() => handleAbrirModalConcluir(t)}
                                >
                                  🚜 Abastecer
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ RODAPÉ FIXO: FILTROS DE STATUS SEM ROLAGEM HORIZONTAL ═══ */}
          <div className="reabastecimento-footer-fixed">
            <div className="reabastecimento-chips-status">
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'TODOS' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('TODOS')}
              >
                <span className="chip-icon">📦</span>
                <span className="chip-texto">Todas ({tarefas.length})</span>
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'PENDENTE' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('PENDENTE')}
              >
                <span className="chip-icon">⏳</span>
                <span className="chip-texto">Aguard. ({resumo.pendentes})</span>
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'VERIFICAR_ESTOQUE' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('VERIFICAR_ESTOQUE')}
              >
                <span className="chip-icon">⚠️</span>
                <span className="chip-texto">S/ Pulm ({resumo.semPulmao})</span>
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'CONCLUIDO' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('CONCLUIDO')}
              >
                <span className="chip-icon">✓</span>
                <span className="chip-texto">Hoje ({resumo.concluidasHoje})</span>
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'FALTA_PULMAO' ? 'ativo' : ''}`}
                style={filtroStatus === 'FALTA_PULMAO' ? { background: '#ea580c', borderColor: '#ea580c', color: '#fff' } : { color: '#c2410c' }}
                onClick={() => setFiltroStatus('FALTA_PULMAO')}
              >
                <span className="chip-icon">⚠️</span>
                <span className="chip-texto">Faltas ({totalFaltasPulmao})</span>
              </button>
            </div>
          </div>

          {/* ═══ MODAL DE CONFIRMAÇÃO DE REABASTECIMENTO ═══ */}
          {modalConcluir.aberto && modalConcluir.tarefa && (
            <div className="reabastecimento-modal-backdrop">
              <div className="reabastecimento-modal-box">
                <h3 className="reabastecimento-modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span>Confirmar Abastecimento no Picking</span>
                  {modalConcluir.tarefa.status === 'FALTA_PULMAO' && (
                    <div className="reabastecimento-tooltip-wrapper" style={{ display: 'inline-flex' }}>
                      <button
                        type="button"
                        className="reabastecimento-btn-info"
                        style={{ background: '#dbeafe', borderColor: '#93c5fd', color: '#1d4ed8' }}
                        title="Clique ou passe o mouse para ver detalhes"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTooltipModalAberto((prev) => !prev);
                        }}
                        onMouseEnter={() => setTooltipModalHover(true)}
                        onMouseLeave={() => setTooltipModalHover(false)}
                      >
                        ℹ️
                      </button>
                      {(tooltipModalHover || tooltipModalAberto) && (
                        <div className="reabastecimento-tooltip-box" style={{ width: 280, left: 'auto', right: 0, top: '120%' }}>
                          <span className="tooltip-titulo">Correção de Falta:</span>
                          <span>O produto havia sido marcado como não encontrado. Ao abastecer agora, a ocorrência de falta será encerrada e a separação da carga será liberada!</span>
                        </div>
                      )}
                    </div>
                  )}
                </h3>

                <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                  Produto: <strong>{modalConcluir.tarefa.codprod} - {modalConcluir.tarefa.descrprod}</strong>
                </p>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 13,
                    color: '#475569',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div>
                    Origem:{' '}
                    <strong>
                      {modalConcluir.tarefa.enderecoPulmao
                        ? `Pulmão ${modalConcluir.tarefa.enderecoPulmao}`
                        : 'Estoque Geral / Outros Endereços'}
                    </strong>
                  </div>
                  <div>
                    Destino:{' '}
                    <strong>
                      {modalConcluir.tarefa.enderecoPicking
                        ? `Picking ${modalConcluir.tarefa.enderecoPicking}`
                        : 'Picking Padrão'}
                    </strong>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 6,
                    }}
                  >
                    Quantidade Abastecida no Picking (UN):
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: 16,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box',
                    }}
                    value={qtdAtendidaInput}
                    onChange={(e) => setQtdAtendidaInput(Number(e.target.value))}
                    autoFocus
                  />
                </div>

                <div className="reabastecimento-modal-footer">
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setModalConcluir({ aberto: false })}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={handleConfirmarConclusao}
                    disabled={salvando || qtdAtendidaInput <= 0}
                  >
                    {salvando ? 'Salvando...' : '✓ Confirmar Abastecimento'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL DE CANCELAMENTO / RECUSA DE TAREFA ═══ */}
          {modalCancelar.aberto && modalCancelar.tarefa && (
            <div className="reabastecimento-modal-backdrop">
              <div className="reabastecimento-modal-box">
                <h3 className="reabastecimento-modal-title" style={{ color: '#dc2626' }}>
                  Recusar / Cancelar Tarefa de Reabastecimento
                </h3>

                <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                  Produto: <strong>{modalCancelar.tarefa.codprod} - {modalCancelar.tarefa.descrprod}</strong>
                </p>

                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 12px 0' }}>
                  Quantidade Solicitada: <strong>{modalCancelar.tarefa.quantidadeSolicitada} UN</strong> | Carga: <strong>#{modalCancelar.tarefa.ordemCarga}</strong>
                </p>

                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Motivo da Recusa / Observação:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pulmão vazio, produto avariado ou endereço inacessível..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box',
                    }}
                    value={motivoCancelar}
                    onChange={(e) => setMotivoCancelar(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="reabastecimento-modal-footer">
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setModalCancelar({ aberto: false })}
                    disabled={cancelando}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={handleConfirmarCancelamento}
                    disabled={cancelando}
                  >
                    {cancelando ? 'Cancelando...' : '✕ Confirmar Recusa'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL DE REGISTRO DE FALTA NO PULMÃO (NÃO ENCONTRADO) ═══ */}
          {modalFalta.aberto && modalFalta.tarefa && (
            <div className="reabastecimento-modal-backdrop">
              <div className="reabastecimento-modal-box">
                <h3 className="reabastecimento-modal-title" style={{ color: '#ea580c' }}>
                  ⚠️ Registrar Produto Não Encontrado no Pulmão
                </h3>

                <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                  Produto: <strong>{modalFalta.tarefa.codprod} - {modalFalta.tarefa.descrprod}</strong>
                </p>

                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 13,
                    color: '#9a3412',
                    marginTop: 10,
                  }}
                >
                  <p style={{ margin: '0 0 6px 0', fontWeight: 700 }}>
                    Endereço de Pulmão Indicado: {modalFalta.tarefa.enderecoPulmao || 'Sem endereço fixo'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12 }}>
                    Esta ação registrará uma <strong>Falta de Pulmão</strong> no módulo. A separação da Carga #{modalFalta.tarefa.ordemCarga} continuará retida aguardando a decisão de corte definitivo.
                  </p>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Observação do Operador (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Posição A-04 vazia no mezanino, sem paletes no nível..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box',
                    }}
                    value={motivoFalta}
                    onChange={(e) => setMotivoFalta(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="reabastecimento-modal-footer">
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setModalFalta({ aberto: false })}
                    disabled={salvandoFalta}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#ea580c',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={handleConfirmarFalta}
                    disabled={salvandoFalta}
                  >
                    {salvandoFalta ? 'Registrando...' : '⚠️ Confirmar que Não Encontrou'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL DE FINALIZAÇÃO DE FALTA / CORTE DEFINITIVO ═══ */}
          {modalFinalizarFalta.aberto && modalFinalizarFalta.tarefa && (
            <div className="reabastecimento-modal-backdrop">
              <div className="reabastecimento-modal-box">
                <h3 className="reabastecimento-modal-title" style={{ color: '#dc2626' }}>
                  ✂️ Confirmar Corte Definitivo no Pedido
                </h3>

                <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>
                  Produto: <strong>{modalFinalizarFalta.tarefa.codprod} - {modalFinalizarFalta.tarefa.descrprod}</strong>
                </p>

                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 10px 0' }}>
                  Quantidade a Cortar: <strong>{modalFinalizarFalta.tarefa.quantidadeSolicitada} UN</strong> | Carga: <strong>#{modalFinalizarFalta.tarefa.ordemCarga}</strong>
                </p>

                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 13,
                    color: '#991b1b',
                  }}
                >
                  <p style={{ margin: 0 }}>
                    Ao confirmar o corte definitivo, a falta no pulmão será encerrada e os itens pendentes deste produto na <strong>Carga #{modalFinalizarFalta.tarefa.ordemCarga}</strong> serão marcados como <strong>CORTADO DEFINITIVO</strong>, liberando a carga para conclusão pelo separador.
                  </p>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Justificativa do Corte (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Estoque físico zerado constatado pelo supervisor..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box',
                    }}
                    value={obsFinalizarFalta}
                    onChange={(e) => setObsFinalizarFalta(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="reabastecimento-modal-footer">
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => setModalFinalizarFalta({ aberto: false })}
                    disabled={finalizandoFalta}
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={handleConfirmarFinalizacaoFalta}
                    disabled={finalizandoFalta}
                  >
                    {finalizandoFalta ? 'Finalizando...' : '✂️ Confirmar Corte Definitivo'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Modal de Zoom da Imagem do Produto */}
          {imagemAmpliada && (
            <div className="img-modal-overlay" onClick={() => setImagemAmpliada(null)}>
              <img src={imagemAmpliada} alt="Produto Ampliado" className="img-modal" />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
