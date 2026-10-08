import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import {
  SessaoConferenciaEntrada,
  ItemNotaEntrada,
  BipagemEntrada,
} from '../../domain/models/ConferenciaEntrada';
import { AppLayout, AppHeader, Botao, Campo, Container, ModalCameraScanner } from '../components';
import { Loading } from '../components/Loading/Loading';
import { extractFieldValue, normalizeDate } from '../../infrastructure/utils/ocrParser';
import './ConferenciaEntradaPage.css';

const recebimentoService = new RecebimentoApiService();

export function ConferenciaEntradaPage() {
  const { temPermissao, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navState = location.state as { nunotas?: number[]; conferenciaId?: string; nivel?: number } | null;
  const nunotas = useMemo(() => navState?.nunotas || [], [navState]);
  const nivelInicial = navState?.nivel || 1;

  const [sessao, setSessao] = useState<SessaoConferenciaEntrada | null>(null);
  const [itens, setItens] = useState<ItemNotaEntrada[]>([]);
  const [bipagens, setBipagens] = useState<BipagemEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Scanner & Inputs
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');
  const [fabricacao, setFabricacao] = useState('');
  const [mostrarCamera, setMostrarCamera] = useState(false);
  const [bloqueioColagem, setBloqueioColagem] = useState(false);

  // Modal OCR
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [textoOcrBruto, setTextoOcrBruto] = useState('');
  const [campoOcrAlvo, setCampoOcrAlvo] = useState<'lote' | 'fabricacao' | 'validade'>('lote');

  // Modal de Finalização
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);

  const inputCodigoRef = useRef<HTMLInputElement>(null);

  const podeAcessar = temPermissao('conferencia_entrada');

  // Inicializar conferência
  const inicializar = useCallback(async () => {
    if (nunotas.length === 0 && !navState?.conferenciaId) {
      setErro('Nenhuma nota informada para conferência.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      let sessaoAtual: SessaoConferenciaEntrada;
      if (navState?.conferenciaId) {
        const resp = await recebimentoService.obterItensConferencia(navState.conferenciaId);
        if (!resp.sessao) throw new Error('Sessão não encontrada.');
        sessaoAtual = resp.sessao;
        setSessao(sessaoAtual);
        setItens(resp.itens);
        setBipagens(resp.bipagens);
      } else {
        sessaoAtual = await recebimentoService.iniciarConferencia(nunotas, nivelInicial);
        setSessao(sessaoAtual);
        const resp = await recebimentoService.obterItensConferencia(sessaoAtual.id);
        setItens(resp.itens);
        setBipagens(resp.bipagens);
      }
    } catch (err: any) {
      setErro(err.response?.data?.error || err.message || 'Erro ao inicializar conferência de entrada.');
    } finally {
      setLoading(false);
    }
  }, [nunotas, navState, nivelInicial]);

  useEffect(() => {
    if (!podeAcessar) return;
    inicializar();
  }, [podeAcessar, inicializar]);

  const nivelAtual = sessao?.nivelAtual || 1;

  // Totais do nível
  const estatisticas = useMemo(() => {
    const totalItensDistintos = itens.length;
    let totalEsperado = 0;
    let totalConferidoNivel = 0;

    itens.forEach((item) => {
      if (item.qtdneg !== null) {
        totalEsperado += item.qtdneg;
      }
      if (nivelAtual === 1) totalConferidoNivel += item.qtdConferidaN1;
      else if (nivelAtual === 2) totalConferidoNivel += item.qtdConferidaN2;
      else if (nivelAtual === 3) totalConferidoNivel += item.qtdConferidaN3;
    });

    const itensConferidosOk = itens.filter((i) => {
      const conferido =
        nivelAtual === 1 ? i.qtdConferidaN1 : nivelAtual === 2 ? i.qtdConferidaN2 : i.qtdConferidaN3;
      return i.qtdneg !== null ? conferido >= i.qtdneg : conferido > 0;
    }).length;

    return {
      totalItensDistintos,
      totalEsperado,
      totalConferidoNivel,
      itensConferidosOk,
      pendentes: Math.max(0, totalItensDistintos - itensConferidosOk),
    };
  }, [itens, nivelAtual]);

  // Bloqueio de Colagem (Anti-colagem)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setBloqueioColagem(true);
    setErro('⚠️ Bloqueio de Segurança: É obrigatório ler o código fisicamente com o leitor ou câmera!');
    setTimeout(() => {
      setBloqueioColagem(false);
    }, 2500);
  };

  // Submeter Bipagem
  const handleBipar = async (codigoParaBipar?: string) => {
    const cod = (codigoParaBipar || codigo).trim();
    if (!cod || !sessao) return;

    setProcessando(true);
    setErro(null);
    setSucesso(null);

    try {
      const qtdNum = Number(quantidade) > 0 ? Number(quantidade) : 1;
      const resp = await recebimentoService.bipar(sessao.id, {
        codigo: cod,
        quantidade: qtdNum,
        nivel: nivelAtual,
        lote: lote || undefined,
        validade: validade || undefined,
        fabricacao: fabricacao || undefined,
      });

      setSucesso(
        `✓ ${resp.referencia || 'Item'} registrado! (+${resp.bipagem.qtdConferida} un)${
          resp.fatorAplicado > 1 ? ` [Fator Caixa: ${resp.fatorAplicado}x]` : ''
        }`
      );

      // Limpar campos
      setCodigo('');
      setQuantidade('1');
      if (nivelAtual === 1) {
        setLote('');
        setValidade('');
        setFabricacao('');
      }

      // Recarregar itens atualizados
      const dadosAtualizados = await recebimentoService.obterItensConferencia(sessao.id);
      setItens(dadosAtualizados.itens);
      setBipagens(dadosAtualizados.bipagens);

      setTimeout(() => setSucesso(null), 3000);
    } catch (err: any) {
      setErro(err.response?.data?.error || err.message || 'Código não encontrado na carga.');
    } finally {
      setProcessando(false);
      inputCodigoRef.current?.focus();
    }
  };

  // Anular Bipagem
  const handleAnularBipagem = async (bipagemId: string) => {
    if (!confirm('Deseja realmente anular esta bipagem?')) return;
    try {
      await recebimentoService.anularBipagem(bipagemId);
      if (sessao) {
        const dadosAtualizados = await recebimentoService.obterItensConferencia(sessao.id);
        setItens(dadosAtualizados.itens);
        setBipagens(dadosAtualizados.bipagens);
      }
      setSucesso('Bipagem anulada com sucesso.');
      setTimeout(() => setSucesso(null), 2500);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao anular bipagem.');
    }
  };

  // Finalizar Nível
  const handleConfirmarFinalizarNivel = async () => {
    if (!sessao) return;
    setProcessando(true);
    try {
      const resp = await recebimentoService.finalizarNivel(sessao.id, nivelAtual);
      setModalFinalizarAberto(false);

      if (resp.statusFinal === 'Conferido') {
        alert('🎉 Conferência de Entrada Finalizada com Sucesso!');
        navigate('/recebimento');
      } else {
        alert(
          `Nível ${nivelAtual} concluído! Novo status: ${resp.statusFinal}. Avançando para a próxima etapa.`
        );
        setSessao(resp.sessao);
        const dados = await recebimentoService.obterItensConferencia(resp.sessao.id);
        setItens(dados.itens);
        setBipagens(dados.bipagens);
      }
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao finalizar nível.');
    } finally {
      setProcessando(false);
    }
  };

  // OCR Modal handlers
  const handleAbrirOcr = (alvo: 'lote' | 'fabricacao' | 'validade') => {
    setCampoOcrAlvo(alvo);
    setTextoOcrBruto('');
    setModalOcrAberto(true);
  };

  const handleProcessarOcr = () => {
    if (!textoOcrBruto.trim()) return;
    const valorExtraido = extractFieldValue(textoOcrBruto, campoOcrAlvo);

    if (campoOcrAlvo === 'lote') {
      setLote(valorExtraido);
    } else if (campoOcrAlvo === 'validade') {
      setValidade(normalizeDate(valorExtraido));
    } else if (campoOcrAlvo === 'fabricacao') {
      setFabricacao(normalizeDate(valorExtraido));
    }

    setModalOcrAberto(false);
  };

  if (!podeAcessar) {
    return (
      <AppLayout>
        {({ openDrawer, abrirConsultaProduto }) => (
          <div className="page-container">
            <AppHeader
              titulo="Conferência de Entrada"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />
            <Container variant="default" padding="lg">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span style={{ fontSize: '3rem' }}>🔒</span>
                <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito</h2>
              </div>
            </Container>
          </div>
        )}
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        {({ openDrawer, abrirConsultaProduto }) => (
          <div className="page-container">
            <AppHeader
              titulo="Conferência de Entrada"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />
            <Loading mensagem="Carregando sessão de conferência e catálogo da carga..." />
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
            titulo={`Conferência de Entrada — Nível N${nivelAtual}`}
            subtitulo={`Notas: ${sessao?.nunotas.map((n) => `NUNOTA ${n}`).join(', ')}`}
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          <div className="conf-entrada-container">
            {/* Feedback Alerts */}
            {erro && <div className="conf-entrada-alerta erro">{erro}</div>}
            {sucesso && <div className="conf-entrada-alerta sucesso">{sucesso}</div>}

            {/* Header de Resumo & Nível */}
            <div className="conf-entrada-header-card">
              <div className="conf-header-top">
                <div className="conf-header-nivel-info">
                  <span className={`badge-nivel-destaque nivel-n${nivelAtual}`}>
                    N{nivelAtual}
                  </span>
                  <div className="conf-header-nivel-text">
                    <strong>
                      {nivelAtual === 1
                        ? '1ª Contagem Cega (N1)'
                        : nivelAtual === 2
                        ? '2ª Contagem com Lote e Validade (N2)'
                        : 'Auditoria de Divergências (N3)'}
                    </strong>
                    <span>Conferente: {user?.nomeUsu || 'Operador'}</span>
                  </div>
                </div>

                <div className="conf-header-acoes">
                  <Botao
                    variant="primary"
                    size="md"
                    onClick={() => setModalFinalizarAberto(true)}
                    disabled={processando}
                  >
                    🏁 Finalizar N{nivelAtual}
                  </Botao>
                </div>
              </div>

              {/* Cards de Métricas */}
              <div className="conf-header-metrics">
                <div className="metric-box">
                  <span className="metric-label">Itens na Carga</span>
                  <span className="metric-value">{estatisticas.totalItensDistintos}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Conferidos OK</span>
                  <span className="metric-value metric-ok">{estatisticas.itensConferidosOk}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Pendentes</span>
                  <span className="metric-value metric-pendente">{estatisticas.pendentes}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Total Bipado (N{nivelAtual})</span>
                  <span className="metric-value">{estatisticas.totalConferidoNivel}</span>
                </div>
              </div>
            </div>

            {/* Scanner de Bipagem */}
            <Container variant="default" padding="md" className="conf-scanner-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBipar();
                }}
                className="conf-scanner-form"
              >
                <div className="scanner-inputs-grid">
                  {/* Código de barras */}
                  <div className="scanner-field-codigo">
                    <label className="scanner-label">Código de Barras ou Referência</label>
                    <div className="scanner-input-wrapper">
                      <input
                        ref={inputCodigoRef}
                        type="text"
                        className={`scanner-input ${bloqueioColagem ? 'input-bloqueado' : ''}`}
                        placeholder="Bipe ou digite o código de barras..."
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onPaste={handlePaste}
                        autoFocus
                        disabled={processando}
                      />
                      <button
                        type="button"
                        className="btn-camera-scan"
                        onClick={() => setMostrarCamera(true)}
                        title="Ler com câmera do celular"
                      >
                        📷
                      </button>
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div className="scanner-field-qtd">
                    <label className="scanner-label">Qtd</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="scanner-input"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                    />
                  </div>
                </div>

                {/* Campos adicionais de N2/N3 (Lote, Validade, Fabricação) */}
                {nivelAtual >= 2 && (
                  <div className="scanner-n2-campos-grid">
                    <div className="scanner-field-extra">
                      <div className="extra-label-wrapper">
                        <label className="scanner-label">Lote</label>
                        <button
                          type="button"
                          className="btn-ocr-trigger"
                          onClick={() => handleAbrirOcr('lote')}
                          title="Extrair lote via OCR"
                        >
                          🔍 OCR
                        </button>
                      </div>
                      <input
                        type="text"
                        className="scanner-input"
                        placeholder="Ex: L240501"
                        value={lote}
                        onChange={(e) => setLote(e.target.value.toUpperCase())}
                      />
                    </div>

                    <div className="scanner-field-extra">
                      <div className="extra-label-wrapper">
                        <label className="scanner-label">Validade</label>
                        <button
                          type="button"
                          className="btn-ocr-trigger"
                          onClick={() => handleAbrirOcr('validade')}
                          title="Extrair validade via OCR"
                        >
                          🔍 OCR
                        </button>
                      </div>
                      <input
                        type="text"
                        className="scanner-input"
                        placeholder="DD/MM/AAAA"
                        value={validade}
                        onChange={(e) => setValidade(e.target.value)}
                      />
                    </div>

                    <div className="scanner-field-extra">
                      <div className="extra-label-wrapper">
                        <label className="scanner-label">Fabricação</label>
                        <button
                          type="button"
                          className="btn-ocr-trigger"
                          onClick={() => handleAbrirOcr('fabricacao')}
                          title="Extrair fabricação via OCR"
                        >
                          🔍 OCR
                        </button>
                      </div>
                      <input
                        type="text"
                        className="scanner-input"
                        placeholder="DD/MM/AAAA"
                        value={fabricacao}
                        onChange={(e) => setFabricacao(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="scanner-submit-row">
                  <Botao variant="primary" size="md" type="submit" disabled={processando || !codigo.trim()}>
                    {processando ? 'Registrando...' : '➕ Registrar Bipagem (Enter)'}
                  </Botao>
                </div>
              </form>
            </Container>

            {/* Listagem de Itens da Carga */}
            <div className="conf-itens-secao">
              <div className="conf-itens-header">
                <h3>Itens da Carga ({itens.length})</h3>
                <span className="conf-itens-sub">
                  {nivelAtual === 3 ? 'Exibindo comparativo com auditoria' : 'Acompanhamento do progresso físico'}
                </span>
              </div>

              {/* Tabela Desktop (> 1024px) */}
              <div className="conf-tabela-desktop">
                <table className="conf-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Ref. / SKU</th>
                      <th>Unidade</th>
                      <th title="Quantidade faturada na nota">Qtd Nota</th>
                      <th title="Quantidade contada em N1">N1</th>
                      <th title="Quantidade contada em N2">N2</th>
                      {nivelAtual === 3 && <th title="Quantidade contada em N3">N3</th>}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item) => {
                      const conferidoNivel =
                        nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
                      const statusOk = item.qtdneg !== null ? conferidoNivel >= item.qtdneg : conferidoNivel > 0;

                      return (
                        <tr
                          key={`${item.nunota}-${item.codprod}-${item.sequencia}`}
                          className={item.divergente && nivelAtual === 3 ? 'linha-divergente' : ''}
                        >
                          <td>
                            <div className="item-prod-cell">
                              <span className="item-prod-nome">{item.descrprod}</span>
                              <span className="item-prod-cod">Cód: {item.codprod} • NUNOTA {item.nunota}</span>
                            </div>
                          </td>
                          <td>
                            <code className="item-ref-badge">{item.referencia}</code>
                          </td>
                          <td>
                            <span className="item-un-badge">{item.codvol}</span>
                          </td>
                          <td>
                            <strong className="item-qtd-esperada">
                              {item.qtdneg !== null ? item.qtdneg : '—'}
                            </strong>
                          </td>
                          <td>
                            <span className="badge-qtd-nivel">{item.qtdConferidaN1}</span>
                          </td>
                          <td>
                            <span className="badge-qtd-nivel">{item.qtdConferidaN2}</span>
                          </td>
                          {nivelAtual === 3 && (
                            <td>
                              <span className="badge-qtd-nivel destaque">{item.qtdConferidaN3}</span>
                            </td>
                          )}
                          <td>
                            {statusOk ? (
                              <span className="badge-conf-ok">✓ Completo</span>
                            ) : (
                              <span className="badge-conf-pendente">Pendente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visualização Mobile / Tablet: Cards (<= 1024px) */}
              <div className="conf-cards-mobile">
                {itens.map((item) => {
                  const conferidoNivel =
                    nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
                  const statusOk = item.qtdneg !== null ? conferidoNivel >= item.qtdneg : conferidoNivel > 0;

                  return (
                    <div
                      key={`card-item-${item.nunota}-${item.codprod}-${item.sequencia}`}
                      className={`conf-card-item-mobile ${
                        item.divergente && nivelAtual === 3 ? 'card-divergente' : ''
                      }`}
                    >
                      <div className="card-item-top">
                        <div className="card-item-identificacao">
                          <span className="card-item-nome">{item.descrprod}</span>
                          <span className="card-item-sub">
                            Cód: {item.codprod} • Ref: {item.referencia} • Un: {item.codvol}
                          </span>
                        </div>
                        {statusOk ? (
                          <span className="badge-conf-ok">✓ OK</span>
                        ) : (
                          <span className="badge-conf-pendente">Pendente</span>
                        )}
                      </div>

                      <div className="card-item-metrics-grid">
                        <div className="card-item-metric">
                          <span className="card-metric-label">Nota</span>
                          <span className="card-metric-val">{item.qtdneg !== null ? item.qtdneg : '—'}</span>
                        </div>
                        <div className="card-item-metric">
                          <span className="card-metric-label">N1</span>
                          <span className="card-metric-val">{item.qtdConferidaN1}</span>
                        </div>
                        <div className="card-item-metric">
                          <span className="card-metric-label">N2</span>
                          <span className="card-metric-val">{item.qtdConferidaN2}</span>
                        </div>
                        {nivelAtual === 3 && (
                          <div className="card-item-metric destaque">
                            <span className="card-metric-label">N3</span>
                            <span className="card-metric-val">{item.qtdConferidaN3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bipagens Recentes & Auditoria */}
            {bipagens.length > 0 && (
              <Container variant="default" padding="sm" className="conf-bipagens-historico">
                <div className="bipagens-header">
                  <h4>Últimas Bipagens Registradas ({bipagens.filter((b) => !b.anulado).length})</h4>
                  <span className="bipagens-sub">Registro imutável com auditoria</span>
                </div>

                <div className="bipagens-lista">
                  {bipagens
                    .slice(-6)
                    .reverse()
                    .map((b) => (
                      <div key={b.id} className={`bipagem-item-row ${b.anulado ? 'anulada' : ''}`}>
                        <div className="bipagem-item-info">
                          <span className="bipagem-cod">
                            {b.codbarra} {b.lote ? `• Lote: ${b.lote}` : ''}
                          </span>
                          <span className="bipagem-meta">
                            +{b.qtdConferida} un • N{b.nivel} • {b.conferente} •{' '}
                            {new Date(b.timestamp).toLocaleTimeString('pt-BR')}
                          </span>
                        </div>
                        {!b.anulado && (
                          <button
                            type="button"
                            className="btn-anular-bipagem"
                            onClick={() => handleAnularBipagem(b.id)}
                            title="Anular esta bipagem"
                          >
                            🗑️ Estornar
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </Container>
            )}
          </div>

          {/* Scanner de Câmera */}
          <ModalCameraScanner
            aberto={mostrarCamera}
            onFechar={() => setMostrarCamera(false)}
            onScan={(scanned: string) => {
              setMostrarCamera(false);
              handleBipar(scanned);
            }}
          />

          {/* Modal OCR para Extração de Lote / Datas */}
          {modalOcrAberto && (
            <div className="modal-backdrop">
              <div className="modal-content ocr-modal">
                <div className="modal-header">
                  <h3>🔍 Extração OCR — Campo {campoOcrAlvo.toUpperCase()}</h3>
                  <button type="button" className="btn-modal-close" onClick={() => setModalOcrAberto(false)}>
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  <p className="ocr-modal-desc">
                    Cole ou digite o texto OCR extraído da etiqueta do fornecedor para análise inteligente:
                  </p>
                  <textarea
                    className="ocr-textarea"
                    rows={4}
                    placeholder="Ex: LOTE: 240501 VAL: 25/12/2026 FAB: 10/01/2024"
                    value={textoOcrBruto}
                    onChange={(e) => setTextoOcrBruto(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <Botao variant="secondary" onClick={() => setModalOcrAberto(false)}>
                    Cancelar
                  </Botao>
                  <Botao variant="primary" onClick={handleProcessarOcr}>
                    Aplicar no Campo
                  </Botao>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Confirmação de Finalização */}
          {modalFinalizarAberto && (
            <div className="modal-backdrop">
              <div className="modal-content">
                <div className="modal-header">
                  <h3>🏁 Finalizar Nível N{nivelAtual}</h3>
                  <button
                    type="button"
                    className="btn-modal-close"
                    onClick={() => setModalFinalizarAberto(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  <p>
                    Deseja concluir a contagem física do <strong>Nível N{nivelAtual}</strong>?
                  </p>
                  <div className="finalizar-resumo-box">
                    <div>
                      <strong>Itens Verificados:</strong> {estatisticas.itensConferidosOk} de{' '}
                      {estatisticas.totalItensDistintos}
                    </div>
                    <div>
                      <strong>Total Contado neste nível:</strong> {estatisticas.totalConferidoNivel} un
                    </div>
                  </div>
                  {estatisticas.pendentes > 0 && (
                    <div className="finalizar-alerta-aviso">
                      ⚠️ Atenção: Existem {estatisticas.pendentes} item(ns) com quantidade não atingida. A finalização
                      poderá exigir N3 ou apontar divergência!
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <Botao variant="secondary" onClick={() => setModalFinalizarAberto(false)}>
                    Voltar
                  </Botao>
                  <Botao variant="primary" onClick={handleConfirmarFinalizarNivel} disabled={processando}>
                    {processando ? 'Finalizando...' : 'Confirmar e Concluir'}
                  </Botao>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
