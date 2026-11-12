import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout, AppHeader } from '../../components';
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
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

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
  const [obsInput, setObsInput] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [detalhesEstoqueAbertos, setDetalhesEstoqueAbertos] = useState<Record<string, boolean>>({});

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

  const tarefasFiltradas = useMemo(() => {
    return tarefas.filter((t) => {
      // Filtro por status
      if (filtroStatus === 'PENDENTE' && t.status !== 'PENDENTE') return false;
      if (filtroStatus === 'VERIFICAR_ESTOQUE' && t.status !== 'VERIFICAR_ESTOQUE') return false;
      if (filtroStatus === 'CONCLUIDO' && t.status !== 'CONCLUIDO') return false;

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
    setObsInput('');
  };

  const handleConfirmarConclusao = async () => {
    if (!modalConcluir.tarefa || salvando) return;

    try {
      setSalvando(true);
      const res = await reabastecimentoApiService.concluir(
        modalConcluir.tarefa.id,
        qtdAtendidaInput,
        obsInput.trim() || undefined,
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
          <AppHeader
            titulo="Reabastecimento de Picking"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          {/* ═══ CARDS DE RESUMO / MÉTRICAS ═══ */}
          <div className="reabastecimento-metricas-grid">
            <div className="reabastecimento-metrica-card">
              <div className="reabastecimento-metrica-icone total">🚜</div>
              <div className="reabastecimento-metrica-info">
                <span className="reabastecimento-metrica-valor">{resumo.total}</span>
                <span className="reabastecimento-metrica-label">Total de Tarefas</span>
              </div>
            </div>

            <div className="reabastecimento-metrica-card">
              <div className="reabastecimento-metrica-icone pendente">⏳</div>
              <div className="reabastecimento-metrica-info">
                <span className="reabastecimento-metrica-valor">{resumo.pendentes}</span>
                <span className="reabastecimento-metrica-label">Aguardando Pulmão</span>
              </div>
            </div>

            <div className="reabastecimento-metrica-card">
              <div className="reabastecimento-metrica-icone sempulmao">⚠️</div>
              <div className="reabastecimento-metrica-info">
                <span className="reabastecimento-metrica-valor">{resumo.semPulmao}</span>
                <span className="reabastecimento-metrica-label">Sem Pulmão (Geral)</span>
              </div>
            </div>

            <div className="reabastecimento-metrica-card">
              <div className="reabastecimento-metrica-icone concluido">✓</div>
              <div className="reabastecimento-metrica-info">
                <span className="reabastecimento-metrica-valor">{resumo.concluidasHoje}</span>
                <span className="reabastecimento-metrica-label">Abastecidas Hoje</span>
              </div>
            </div>
          </div>

          {/* ═══ MENSAGEM DE SUCESSO ═══ */}
          {mensagemSucesso && (
            <div
              style={{
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#166534',
                padding: '12px 16px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ✓ {mensagemSucesso}
            </div>
          )}

          {/* ═══ FILTROS E BUSCA ═══ */}
          <div className="reabastecimento-filtros-bar">
            <div className="reabastecimento-chips-status">
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'TODOS' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('TODOS')}
              >
                Todas ({tarefas.length})
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'PENDENTE' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('PENDENTE')}
              >
                ⏳ Aguardando Pulmão ({resumo.pendentes})
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'VERIFICAR_ESTOQUE' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('VERIFICAR_ESTOQUE')}
              >
                ⚠️ Sem Pulmão ({resumo.semPulmao})
              </button>
              <button
                type="button"
                className={`reabastecimento-chip-btn ${filtroStatus === 'CONCLUIDO' ? 'ativo' : ''}`}
                onClick={() => setFiltroStatus('CONCLUIDO')}
              >
                ✓ Concluídas
              </button>
            </div>

            <input
              type="text"
              className="reabastecimento-busca-input"
              placeholder="Buscar por carga, produto, barras, endereço..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>

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
          ) : (
            <div className="reabastecimento-grid-tarefas">
              {tarefasFiltradas.map((t) => {
                const isConcluida = t.status === 'CONCLUIDO';
                const isSemPulmao = t.status === 'VERIFICAR_ESTOQUE';

                return (
                  <div
                    key={t.id}
                    className={`reabastecimento-card-tarefa ${isConcluida ? 'concluida' : ''}`}
                  >
                    {/* Header do Card */}
                    <div className="reabastecimento-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="reabastecimento-carga-badge">
                          Carga #{t.ordemCarga}
                        </span>

                        {t.codemp && (
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title={`Empresa ${t.codemp}${t.nomeEmpresa ? ` - ${t.nomeEmpresa}` : ''}`}
                          >
                            🏢 {t.codemp}{t.nomeEmpresa ? ` - ${t.nomeEmpresa}` : ''}
                          </span>
                        )}
                      </div>

                      <span
                        className={`reabastecimento-status-badge ${
                          isConcluida
                            ? 'concluido'
                            : isSemPulmao
                            ? 'sempulmao'
                            : 'pendente'
                        }`}
                      >
                        {isConcluida && '✓ Abastecido'}
                        {isSemPulmao && '⚠️ Sem Pulmão (Geral)'}
                        {!isConcluida && !isSemPulmao && '⏳ Aguardando Pulmão'}
                      </span>
                    </div>

                    {/* Informações do Produto */}
                    <div className="reabastecimento-produto-info">
                      <span className="reabastecimento-prod-titulo">
                        {t.codprod} - {t.descrprod}
                      </span>
                      <div className="reabastecimento-prod-sub">
                        {t.referencia && <span>Ref: {t.referencia}</span>}
                        {t.codbarra && <span>Barras: {t.codbarra}</span>}
                      </div>
                    </div>

                    {/* Rota Pulmão -> Picking */}
                    <div className="reabastecimento-rota-box">
                      <div className="reabastecimento-rota-col">
                        <span className="reabastecimento-rota-label">Origem (Pulmão)</span>
                        <span
                          className="reabastecimento-rota-end"
                          style={{ color: t.enderecoPulmao ? '#0f172a' : '#dc2626' }}
                        >
                          {t.enderecoPulmao ? `📦 ${t.enderecoPulmao}` : '⚠️ Sem Pulmão Mapeado'}
                        </span>
                        {t.descrendPulmao && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>{t.descrendPulmao}</span>
                        )}
                      </div>

                      <span className="reabastecimento-rota-seta">➜</span>

                      <div className="reabastecimento-rota-col" style={{ textAlign: 'right' }}>
                        <span className="reabastecimento-rota-label">Destino (Picking)</span>
                        <span className="reabastecimento-rota-end" style={{ justifyContent: 'flex-end' }}>
                          📍 {t.enderecoPicking || 'Picking Padrão'}
                        </span>
                        {t.descrendPicking && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>{t.descrendPicking}</span>
                        )}
                      </div>
                    </div>

                    {/* Saldo de Estoque Disponível em Tempo Real */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '8px 12px',
                        margin: '10px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                          📦 Disponível na Empresa: {t.saldoDisponivel != null ? `${t.saldoDisponivel} UN` : 'Consultando...'}
                        </span>
                        {t.detalhesEstoque && t.detalhesEstoque.length > 0 && (
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                              textDecoration: 'underline',
                            }}
                            onClick={() =>
                              setDetalhesEstoqueAbertos((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }))
                            }
                          >
                            {detalhesEstoqueAbertos[t.id] ? '▲ Ocultar locais' : `▼ Ver locais/lotes (${t.detalhesEstoque.length})`}
                          </button>
                        )}
                      </div>

                      {detalhesEstoqueAbertos[t.id] && t.detalhesEstoque && t.detalhesEstoque.length > 0 && (
                        <div style={{ marginTop: 4, borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                          {t.detalhesEstoque.map((d, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                color: '#475569',
                                padding: '2px 0',
                              }}
                            >
                              <span>
                                📍 <strong>Local {d.codLocal}:</strong> {d.local}
                                {d.controle ? ` (Lote: ${d.controle})` : ''}
                              </span>
                              <span style={{ fontWeight: 700, color: d.disponivel > 0 ? '#15803d' : '#94a3b8' }}>
                                {d.disponivel} UN disponível
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rodapé: Quantidade e Ação */}
                    <div className="reabastecimento-footer-row">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="reabastecimento-qtd-badge">
                          {isConcluida ? `${t.quantidadeAtendida} UN Abastecidas` : `${t.quantidadeSolicitada} UN a Abastecer`}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {isConcluida
                            ? `Concluído: ${formatarData(t.concluidoEm)} por ${t.concluidoPor}`
                            : `Solicitado: ${formatarData(t.solicitadoEm)} por ${t.solicitadoPor}`}
                        </span>
                      </div>

                      {!isConcluida && (
                        <button
                          type="button"
                          className="reabastecimento-btn-concluir"
                          onClick={() => handleAbrirModalConcluir(t)}
                        >
                          ✓ Confirmar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ MODAL DE CONFIRMAÇÃO DE REABASTECIMENTO ═══ */}
          {modalConcluir.aberto && modalConcluir.tarefa && (
            <div className="reabastecimento-modal-backdrop">
              <div className="reabastecimento-modal-box">
                <h3 className="reabastecimento-modal-title">
                  Confirmar Abastecimento no Picking
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

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Observações Operacionais (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Palete 12 desceu do nível 3 para o picking..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      boxSizing: 'border-box',
                    }}
                    value={obsInput}
                    onChange={(e) => setObsInput(e.target.value)}
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
        </div>
      )}
    </AppLayout>
  );
}
