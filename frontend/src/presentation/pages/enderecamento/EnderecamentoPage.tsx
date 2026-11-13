import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout, AppHeader } from '../../components';
import { useAuth } from '../../../application/contexts/AuthContext';
import {
  ProdutoEnderecamentoDetalhe,
  EnderecoAnaliticoItem,
  RegistroHistoricoEnderecamento,
  TipoEnderecoWMS,
  enderecamentoApiService,
} from '../../../infrastructure/api/EnderecamentoApiService';
import './EnderecamentoPage.css';

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

export function EnderecamentoPage() {
  const { isAuthenticated, temPermissao } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const podeManipular = temPermissao('enderecamento_manipular') || temPermissao('gerenciar_acessos');

  // Abas: Invertidas conforme solicitado (1º Endereço, 2º Produto, 3º Histórico)
  const [abaAtiva, setAbaAtiva] = useState<'ENDERECO' | 'PRODUTO' | 'HISTORICO'>('ENDERECO');

  // ═══ ESTADOS: ABA POR ENDEREÇO (ANALÍTICO) ═══
  const [buscaEndereco, setBuscaEndereco] = useState('');
  const [filtroTipoEnd, setFiltroTipoEnd] = useState<'TODOS' | 'PICKING' | 'PULMAO'>('TODOS');
  const [filtroOcupacao, setFiltroOcupacao] = useState<'TODOS' | 'LIVRES' | 'OCUPADOS'>('TODOS');
  const [enderecosAnaliticos, setEnderecosAnaliticos] = useState<EnderecoAnaliticoItem[]>([]);
  const [carregandoAnalitico, setCarregandoAnalitico] = useState(false);

  // ═══ ESTADOS: ABA POR PRODUTO ═══
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtos, setProdutos] = useState<ProdutoEnderecamentoDetalhe[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [enderecoSelecionadoContexto, setEnderecoSelecionadoContexto] = useState<{
    codend: number;
    endereco: string;
  } | null>(null);

  // ═══ ESTADOS: ABA HISTÓRICO ═══
  const [historico, setHistorico] = useState<RegistroHistoricoEnderecamento[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Mensagens
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Modais
  const [modalMover, setModalMover] = useState<{
    aberto: boolean;
    codprod?: number;
    descrprod?: string;
    codendOrigem?: number;
    enderecoOrigem?: string;
    controle?: string;
  }>({ aberto: false });
  const [destinoMoverInput, setDestinoMoverInput] = useState('');
  const [motivoMoverInput, setMotivoMoverInput] = useState('');
  const [salvandoMover, setSalvandoMover] = useState(false);

  const [modalVincular, setModalVincular] = useState<{
    aberto: boolean;
    codprod?: number;
    descrprod?: string;
    tipo?: TipoEnderecoWMS;
    tipconrest?: string | null;
  }>({ aberto: false });
  const [novoEndInput, setNovoEndInput] = useState('');
  const [loteInput, setLoteInput] = useState('');
  const [tipoVincularInput, setTipoVincularInput] = useState<TipoEnderecoWMS>('PULMAO');
  const [salvandoVincular, setSalvandoVincular] = useState(false);

  const [modalRetirar, setModalRetirar] = useState<{
    aberto: boolean;
    codprod?: number;
    descrprod?: string;
    codend?: number;
    endereco?: string;
    controle?: string;
  }>({ aberto: false });
  const [motivoRetirarInput, setMotivoRetirarInput] = useState('');
  const [salvandoRetirar, setSalvandoRetirar] = useState(false);

  // Carregar Lista Analítica de Endereços
  const carregarEnderecosAnaliticos = useCallback(async () => {
    try {
      setCarregandoAnalitico(true);
      setMensagemErro(null);
      const res = await enderecamentoApiService.listarAnalitico({
        termo: buscaEndereco.trim() || undefined,
        tipo: filtroTipoEnd,
        ocupacao: filtroOcupacao,
        limite: 150,
      });
      setEnderecosAnaliticos(res);
    } catch (err: any) {
      console.error('Erro ao listar analítico de endereços:', err);
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao carregar endereços.');
    } finally {
      setCarregandoAnalitico(false);
    }
  }, [buscaEndereco, filtroTipoEnd, filtroOcupacao]);

  // Carregar analítico ao abrir a aba ou mudar filtros
  useEffect(() => {
    if (abaAtiva === 'ENDERECO') {
      carregarEnderecosAnaliticos();
    }
  }, [abaAtiva, carregarEnderecosAnaliticos]);

  // Ao clicar em um endereço da lista analítica -> Ir para aba Produtos
  const handleSelecionarEnderecoParaProdutos = async (item: EnderecoAnaliticoItem) => {
    try {
      setCarregandoProdutos(true);
      setEnderecoSelecionadoContexto({ codend: item.codend, endereco: item.endereco });
      setBuscaProduto('');

      // Buscar produtos que estão nesse endereço pela chave primária (codend)
      const ocupacao = await enderecamentoApiService.buscarPorEndereco(String(item.codend));
      if (ocupacao && ocupacao.produtos && ocupacao.produtos.length > 0) {
        // Obter detalhes de cada produto no endereço diretamente pelos códigos exatos
        const cods = Array.from(new Set(ocupacao.produtos.map((p) => p.codprod)));
        const prods = await enderecamentoApiService.buscarPorCodprods(cods);
        setProdutos(prods);
      } else {
        setProdutos([]);
      }

      setAbaAtiva('PRODUTO');
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao carregar produtos do endereço.');
    } finally {
      setCarregandoProdutos(false);
    }
  };

  // Buscar produtos normalmente por texto
  const handlePesquisarProdutos = async (termo = buscaProduto) => {
    if (!termo.trim()) return;
    try {
      setCarregandoProdutos(true);
      setMensagemErro(null);
      setEnderecoSelecionadoContexto(null); // Limpa filtro de endereço se pesquisou livre
      const res = await enderecamentoApiService.buscarPorProduto(termo.trim());
      setProdutos(res);
      if (res.length === 0) {
        setMensagemErro(`Nenhum produto localizado com o termo '${termo}'.`);
      }
    } catch (err: any) {
      tocarSom('erro');
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao buscar produtos.');
    } finally {
      setCarregandoProdutos(false);
    }
  };

  // Carregar histórico
  const carregarHistorico = useCallback(async () => {
    try {
      setCarregandoHistorico(true);
      const res = await enderecamentoApiService.listarHistorico({ limite: 100 });
      setHistorico(res);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  useEffect(() => {
    if (abaAtiva === 'HISTORICO') {
      carregarHistorico();
    }
  }, [abaAtiva, carregarHistorico]);

  // Ações de confirmação
  const handleConfirmarMover = async () => {
    if (!modalMover.codprod || !modalMover.codendOrigem || !destinoMoverInput.trim()) return;
    try {
      setSalvandoMover(true);
      const res = await enderecamentoApiService.movimentar({
        codprod: modalMover.codprod,
        codendOrigem: modalMover.codendOrigem,
        codigoEnderecoDestino: destinoMoverInput.trim(),
        controle: modalMover.controle,
        motivo: motivoMoverInput.trim() || undefined,
      });

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalMover({ aberto: false });
      setDestinoMoverInput('');
      setMotivoMoverInput('');
      setTimeout(() => setMensagemSucesso(null), 5000);

      if (abaAtiva === 'PRODUTO') {
        if (buscaProduto.trim()) handlePesquisarProdutos();
      } else {
        carregarEnderecosAnaliticos();
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao movimentar endereço.');
    } finally {
      setSalvandoMover(false);
    }
  };

  const handleConfirmarVincular = async () => {
    if (!modalVincular.codprod || !novoEndInput.trim()) return;
    try {
      setSalvandoVincular(true);
      const res = await enderecamentoApiService.vincular({
        codprod: modalVincular.codprod,
        codigoEndereco: novoEndInput.trim(),
        controle: loteInput.trim() || undefined,
        tipoEndereco: tipoVincularInput,
      });

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalVincular({ aberto: false });
      setNovoEndInput('');
      setLoteInput('');
      setTimeout(() => setMensagemSucesso(null), 5000);

      if (abaAtiva === 'PRODUTO') {
        if (buscaProduto.trim()) handlePesquisarProdutos();
      } else {
        carregarEnderecosAnaliticos();
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao vincular endereço.');
    } finally {
      setSalvandoVincular(false);
    }
  };

  const handleConfirmarRetirar = async () => {
    if (!modalRetirar.codprod || !modalRetirar.codend) return;
    try {
      setSalvandoRetirar(true);
      const res = await enderecamentoApiService.desenderecar({
        codprod: modalRetirar.codprod,
        codend: modalRetirar.codend,
        controle: modalRetirar.controle,
        motivo: motivoRetirarInput.trim() || undefined,
      });

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalRetirar({ aberto: false });
      setMotivoRetirarInput('');
      setTimeout(() => setMensagemSucesso(null), 5000);

      if (abaAtiva === 'PRODUTO') {
        if (buscaProduto.trim()) handlePesquisarProdutos();
      } else {
        carregarEnderecosAnaliticos();
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao desendereçar produto.');
    } finally {
      setSalvandoRetirar(false);
    }
  };

  // Contadores da lista analítica
  const totalListados = enderecosAnaliticos.length;
  const totalOcupados = enderecosAnaliticos.filter((e) => e.totalProdutos > 0).length;
  const totalLivres = enderecosAnaliticos.filter((e) => e.totalProdutos === 0).length;

  return (
    <AppLayout>
      {({ openDrawer, abrirConsultaProduto }) => (
        <div className="enderecamento-container">
          <AppHeader
            titulo="Endereçamento WMS"
            onOpenDrawer={openDrawer}
            onAbrirConsultaProduto={abrirConsultaProduto}
          />

          {/* Banner de Mensagens */}
          {mensagemSucesso && (
            <div
              style={{
                background: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: 12,
                padding: '12px 16px',
                color: '#15803d',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ✓ {mensagemSucesso}
            </div>
          )}

          {mensagemErro && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '12px 16px',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ⚠️ {mensagemErro}
            </div>
          )}

          {/* Abas Superiores (Ordem Invertida: 1º Endereço, 2º Produto, 3º Histórico) */}
          <div className="enderecamento-tabs-nav">
            <button
              type="button"
              className={`enderecamento-tab-btn ${abaAtiva === 'ENDERECO' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('ENDERECO')}
            >
              📍 Por Endereço
            </button>
            <button
              type="button"
              className={`enderecamento-tab-btn ${abaAtiva === 'PRODUTO' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('PRODUTO')}
            >
              📦 Por Produto
            </button>
            <button
              type="button"
              className={`enderecamento-tab-btn ${abaAtiva === 'HISTORICO' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('HISTORICO')}
            >
              🕒 Histórico de Movimentações
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ABA 1: POR ENDEREÇO (LISTA ANALÍTICA COM FILTROS RÁPIDOS)
             ══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'ENDERECO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Card de Pesquisa e Filtros */}
              <div className="enderecamento-scanner-card">
                <div className="enderecamento-scanner-header">
                  <span className="enderecamento-scanner-title">
                    📍 Mapa Analítico de Endereços WMS
                  </span>
                  <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    Total: <strong>{totalListados}</strong> (<strong>{totalOcupados}</strong> ocupados |{' '}
                    <strong style={{ color: '#15803d' }}>{totalLivres}</strong> livres)
                  </div>
                </div>

                <form
                  className="enderecamento-scanner-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    carregarEnderecosAnaliticos();
                  }}
                >
                  <div className="enderecamento-scanner-input-wrapper">
                    <input
                      type="text"
                      className="enderecamento-scanner-input"
                      placeholder="Escanear ou digitar código, máscara ou descrição da rua..."
                      value={buscaEndereco}
                      onChange={(e) => setBuscaEndereco(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="enderecamento-scanner-btn"
                    disabled={carregandoAnalitico}
                  >
                    {carregandoAnalitico ? 'Carregando...' : '🔍 Filtrar'}
                  </button>
                </form>

                {/* Chips de Filtro Rápido */}
                <div className="enderecamento-filtros-chips">
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Tipo:</span>
                  <div className="enderecamento-filtro-grupo">
                    <button
                      type="button"
                      className={`enderecamento-chip ${filtroTipoEnd === 'TODOS' ? 'active active-laranja' : ''}`}
                      onClick={() => setFiltroTipoEnd('TODOS')}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className={`enderecamento-chip ${filtroTipoEnd === 'PICKING' ? 'active active-laranja' : ''}`}
                      onClick={() => setFiltroTipoEnd('PICKING')}
                    >
                      Picking
                    </button>
                    <button
                      type="button"
                      className={`enderecamento-chip ${filtroTipoEnd === 'PULMAO' ? 'active active-laranja' : ''}`}
                      onClick={() => setFiltroTipoEnd('PULMAO')}
                    >
                      Pulmão
                    </button>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginLeft: 8 }}>
                    Ocupação:
                  </span>
                  <div className="enderecamento-filtro-grupo">
                    <button
                      type="button"
                      className={`enderecamento-chip ${filtroOcupacao === 'TODOS' ? 'active active-laranja' : ''}`}
                      onClick={() => setFiltroOcupacao('TODOS')}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className={`enderecamento-chip ${filtroOcupacao === 'LIVRES' ? 'active active-laranja' : ''}`}
                      onClick={() => setFiltroOcupacao('LIVRES')}
                    >
                      🟢 Livres / Vazios
                    </button>
                    <button
                      type="button"
                      className={`enderecamento-chip ${filtroOcupacao === 'OCUPADOS' ? 'active active-laranja' : ''}`}
                      onClick={() => setFiltroOcupacao('OCUPADOS')}
                    >
                      🔴 Ocupados
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid / Lista Analítica de Endereços */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {enderecosAnaliticos.length > 0 ? (
                  enderecosAnaliticos.map((item) => (
                    <div
                      key={item.codend}
                      className="enderecamento-analitico-item"
                      onClick={() => handleSelecionarEnderecoParaProdutos(item)}
                      title="Clique para abrir os produtos alocados neste endereço"
                    >
                      {/* Coluna Código e Endereço */}
                      <div className="enderecamento-analitico-col-end">
                        <span className={`enderecamento-tipo-badge ${item.tipo.toLowerCase()}`}>
                          {item.tipo}
                        </span>
                        <div className="enderecamento-analitico-col-info">
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            {item.endereco}
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            Cód: <strong>{item.codend}</strong>
                            {item.descrend ? ` • ${item.descrend}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Coluna Status de Ocupação & Ações */}
                      <div className="enderecamento-analitico-col-status" onClick={(e) => e.stopPropagation()}>
                        {item.totalProdutos > 0 ? (
                          <span className="enderecamento-badge-ocupacao ocupado">
                            📦 {item.totalProdutos} {item.totalProdutos === 1 ? 'produto' : 'produtos'}
                          </span>
                        ) : (
                          <span className="enderecamento-badge-ocupacao livre">
                            🟢 Livre / Vazio
                          </span>
                        )}

                        <button
                          type="button"
                          className="enderecamento-btn-acao"
                          style={{ borderColor: '#f97316', color: '#ea580c', fontWeight: 800 }}
                          onClick={() => handleSelecionarEnderecoParaProdutos(item)}
                        >
                          👁️ Ver Produtos
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 32,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    {carregandoAnalitico
                      ? 'Carregando lista analítica de endereços...'
                      : 'Nenhum endereço localizado com os critérios selecionados.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ABA 2: POR PRODUTO (COM BANNER DE CONTEXTO DO ENDEREÇO)
             ══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'PRODUTO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Banner de Contexto se veio de clique no Endereço */}
              {enderecoSelecionadoContexto && (
                <div className="enderecamento-banner-contexto">
                  <div className="enderecamento-banner-texto">
                    <span>📍</span>
                    <span>
                      Exibindo produtos do endereço:{' '}
                      <strong style={{ fontSize: 16 }}>{enderecoSelecionadoContexto.endereco}</strong>{' '}
                      ({produtos.length} {produtos.length === 1 ? 'produto encontrado' : 'produtos encontrados'})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="enderecamento-banner-btn-limpar"
                    onClick={() => {
                      setEnderecoSelecionadoContexto(null);
                      setProdutos([]);
                    }}
                  >
                    ✕ Limpar Filtro de Endereço
                  </button>
                </div>
              )}

              {/* Barra de Pesquisa de Produto */}
              <div className="enderecamento-scanner-card">
                <div className="enderecamento-scanner-header">
                  <span className="enderecamento-scanner-title">
                    🔍 Pesquisar Produto
                  </span>
                </div>
                <form
                  className="enderecamento-scanner-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePesquisarProdutos();
                  }}
                >
                  <div className="enderecamento-scanner-input-wrapper">
                    <input
                      type="text"
                      className="enderecamento-scanner-input"
                      placeholder="Escanear código de barras ou digitar código / nome do produto..."
                      value={buscaProduto}
                      onChange={(e) => setBuscaProduto(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="enderecamento-scanner-btn"
                    disabled={carregandoProdutos || !buscaProduto.trim()}
                  >
                    {carregandoProdutos ? 'Buscando...' : '🔍 Buscar'}
                  </button>
                </form>
              </div>

              {/* Lista de Resultados de Produtos */}
              <div className="enderecamento-grid">
                {produtos.map((p) => (
                  <div key={p.codprod} className="enderecamento-card">
                    <div className="enderecamento-card-header">
                      <div className="enderecamento-prod-info">
                        <div className="enderecamento-prod-titulo">
                          {p.codprod} - {p.descrprod}
                        </div>
                        <div className="enderecamento-prod-meta">
                          {p.referencia && <span>Ref: <strong>{p.referencia}</strong></span>}
                          {p.codbarra && <span>EAN: <strong>{p.codbarra}</strong></span>}
                          <span>Unidade: <strong>{p.codvol}</strong></span>
                        </div>
                      </div>
                      <div className="enderecamento-saldo-badge">
                        📦 Saldo Disponível: {p.estoqueTotal} {p.codvol}
                      </div>
                    </div>

                    {/* Seções de Picking e Pulmão */}
                    <div className="enderecamento-locais-wrapper">
                      {/* Linha do Picking */}
                      <div className="enderecamento-linha-local">
                        <div className="enderecamento-local-tag">
                          <span className="enderecamento-tipo-badge picking">Picking</span>
                          {p.picking ? (
                            <>
                              <span className="enderecamento-codigo-end">{p.picking.endereco}</span>
                              {p.picking.descrend && (
                                <span className="enderecamento-descrend">({p.picking.descrend})</span>
                              )}
                              {p.picking.controle && p.picking.controle.trim() !== '' && (
                                <span style={{ fontSize: 11, background: '#fef3c7', padding: '2px 6px', borderRadius: 4, color: '#92400e' }}>
                                  Lote: {p.picking.controle}
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                              ⚠️ Sem endereço de picking cadastrado
                            </span>
                          )}
                        </div>

                        {podeManipular && (
                          <div className="enderecamento-acoes-linha">
                            {p.picking ? (
                              <>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao mover"
                                  title="Mover picking para outro endereço"
                                  onClick={() => {
                                    setModalMover({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codendOrigem: p.picking!.codend,
                                      enderecoOrigem: p.picking!.endereco,
                                      controle: p.picking!.controle,
                                    });
                                    setDestinoMoverInput('');
                                    setMotivoMoverInput('');
                                  }}
                                >
                                  ↔️ Mover
                                </button>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao retirar"
                                  title="Retirar produto do picking"
                                  onClick={() => {
                                    setModalRetirar({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codend: p.picking!.codend,
                                      endereco: p.picking!.endereco,
                                      controle: p.picking!.controle,
                                    });
                                    setMotivoRetirarInput('');
                                  }}
                                >
                                  🗑️ Retirar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="enderecamento-btn-acao promover"
                                onClick={() => {
                                  setModalVincular({
                                    aberto: true,
                                    codprod: p.codprod,
                                    descrprod: p.descrprod,
                                    tipo: 'PICKING',
                                    tipconrest: p.tipconrest,
                                  });
                                  setTipoVincularInput('PICKING');
                                  setNovoEndInput(enderecoSelecionadoContexto?.endereco || '');
                                  setLoteInput('');
                                }}
                              >
                                ➕ Definir Picking
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Linha dos Pulmões */}
                      {p.pulmoes.length > 0 ? (
                        p.pulmoes.map((pulmao) => (
                          <div key={pulmao.codend} className="enderecamento-linha-local">
                            <div className="enderecamento-local-tag">
                              <span className="enderecamento-tipo-badge pulmao">Pulmão</span>
                              <span className="enderecamento-codigo-end">{pulmao.endereco}</span>
                              {pulmao.descrend && (
                                <span className="enderecamento-descrend">({pulmao.descrend})</span>
                              )}
                              {pulmao.controle && pulmao.controle.trim() !== '' && (
                                <span style={{ fontSize: 11, background: '#fef3c7', padding: '2px 6px', borderRadius: 4, color: '#92400e' }}>
                                  Lote: {pulmao.controle}
                                </span>
                              )}
                            </div>

                            {podeManipular && (
                              <div className="enderecamento-acoes-linha">
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao promover"
                                  title="Promover este pulmão para ser o novo Picking oficial"
                                  onClick={() => {
                                    setModalVincular({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      tipo: 'PICKING',
                                      tipconrest: p.tipconrest,
                                    });
                                    setTipoVincularInput('PICKING');
                                    setNovoEndInput(pulmao.endereco);
                                    setLoteInput(pulmao.controle || '');
                                  }}
                                >
                                  📍 Tornar Picking
                                </button>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao mover"
                                  title="Mover produto para outro pulmão"
                                  onClick={() => {
                                    setModalMover({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codendOrigem: pulmao.codend,
                                      enderecoOrigem: pulmao.endereco,
                                      controle: pulmao.controle,
                                    });
                                    setDestinoMoverInput('');
                                    setMotivoMoverInput('');
                                  }}
                                >
                                  ↔️ Mover
                                </button>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao retirar"
                                  title="Desendereçar produto deste pulmão"
                                  onClick={() => {
                                    setModalRetirar({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codend: pulmao.codend,
                                      endereco: pulmao.endereco,
                                      controle: pulmao.controle,
                                    });
                                    setMotivoRetirarInput('');
                                  }}
                                >
                                  🗑️ Retirar
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', padding: '6px 4px' }}>
                          Nenhum pulmão adicional vinculado a este produto.
                        </div>
                      )}

                      {podeManipular && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                          <button
                            type="button"
                            className="enderecamento-btn-acao"
                            style={{ borderColor: '#0284c7', color: '#0284c7' }}
                            onClick={() => {
                              setModalVincular({
                                aberto: true,
                                codprod: p.codprod,
                                descrprod: p.descrprod,
                                tipo: 'PULMAO',
                                tipconrest: p.tipconrest,
                              });
                              setTipoVincularInput('PULMAO');
                              setNovoEndInput(enderecoSelecionadoContexto?.endereco || '');
                              setLoteInput('');
                            }}
                          >
                            ➕ Vincular Novo Pulmão
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {produtos.length === 0 && !carregandoProdutos && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 32,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    {enderecoSelecionadoContexto
                      ? `Nenhum produto cadastrado atualmente no endereço ${enderecoSelecionadoContexto.endereco}.`
                      : 'Digite o código ou nome de um produto acima para visualizar e manipular seus endereços.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ABA 3: HISTÓRICO DE MOVIMENTAÇÕES
             ══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'HISTORICO' && (
            <div className="enderecamento-historico-card">
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                  🕒 Rastreabilidade e Auditoria de Movimentações
                </span>
                <button
                  type="button"
                  className="enderecamento-btn-acao"
                  onClick={carregarHistorico}
                  disabled={carregandoHistorico}
                >
                  {carregandoHistorico ? 'Atualizando...' : '🔄 Atualizar'}
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="enderecamento-tabela">
                  <thead>
                    <tr>
                      <th>Data / Hora</th>
                      <th>Operador</th>
                      <th>Ação</th>
                      <th>Produto</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th>Motivo / Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.length > 0 ? (
                      historico.map((h) => (
                        <tr key={h.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {new Date(h.criadoEm).toLocaleString('pt-BR')}
                          </td>
                          <td style={{ fontWeight: 600 }}>{h.usuario}</td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                background:
                                  h.tipoAcao === 'MOVER'
                                    ? '#e0f2fe'
                                    : h.tipoAcao === 'RETIRAR'
                                    ? '#fee2e2'
                                    : '#dcfce7',
                                color:
                                  h.tipoAcao === 'MOVER'
                                    ? '#0369a1'
                                    : h.tipoAcao === 'RETIRAR'
                                    ? '#b91c1c'
                                    : '#15803d',
                              }}
                            >
                              {h.tipoAcao}
                            </span>
                          </td>
                          <td>
                            <strong>{h.codprod}</strong> {h.descrprod ? `- ${h.descrprod}` : ''}
                            {h.controle && h.controle.trim() !== '' && (
                              <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>
                                Lote: {h.controle}
                              </span>
                            )}
                          </td>
                          <td>
                            {h.enderecoOrigem ? (
                              <span>
                                <strong>{h.enderecoOrigem}</strong>{' '}
                                <small style={{ color: '#64748b' }}>({h.tipoOrigem || '—'})</small>
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td>
                            {h.enderecoDestino ? (
                              <span>
                                <strong>{h.enderecoDestino}</strong>{' '}
                                <small style={{ color: '#64748b' }}>({h.tipoDestino || '—'})</small>
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12 }}>
                            {h.motivo || '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                          {carregandoHistorico ? 'Carregando auditoria...' : 'Nenhuma movimentação registrada até o momento.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ MODAL: MOVER PARA OUTRO ENDEREÇO ═══ */}
          {modalMover.aberto && (
            <div className="enderecamento-modal-backdrop">
              <div className="enderecamento-modal-box">
                <h3 className="enderecamento-modal-title">↔️ Mover Produto para Outro Endereço</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                  Produto: <strong>{modalMover.codprod} - {modalMover.descrprod}</strong>
                </p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, fontSize: 13, color: '#475569' }}>
                  Origem Atual: <strong>{modalMover.enderecoOrigem}</strong>
                  {modalMover.controle && modalMover.controle.trim() !== '' && (
                    <span> | Lote: <strong>{modalMover.controle}</strong></span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Endereço Destino (Escanear ou digitar):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 01.02.03.01 ou código reduzido..."
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '2px solid #38bdf8',
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 700,
                      fontSize: 15,
                      boxSizing: 'border-box',
                    }}
                    value={destinoMoverInput}
                    onChange={(e) => setDestinoMoverInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Motivo da Movimentação (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Otimização de corredor, descida para picking..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                    value={motivoMoverInput}
                    onChange={(e) => setMotivoMoverInput(e.target.value)}
                  />
                </div>

                <div className="enderecamento-modal-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-acao"
                    onClick={() => setModalMover({ aberto: false })}
                    disabled={salvandoMover}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="enderecamento-scanner-btn"
                    onClick={handleConfirmarMover}
                    disabled={salvandoMover || !destinoMoverInput.trim()}
                  >
                    {salvandoMover ? 'Movimentando...' : '✓ Confirmar Mudança'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL: VINCULAR NOVO ENDEREÇO ═══ */}
          {modalVincular.aberto && (
            <div className="enderecamento-modal-backdrop">
              <div className="enderecamento-modal-box">
                <h3 className="enderecamento-modal-title">
                  ➕ {tipoVincularInput === 'PICKING' ? 'Definir Endereço de Picking' : 'Vincular Novo Pulmão'}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                  Produto: <strong>{modalVincular.codprod} - {modalVincular.descrprod}</strong>
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Tipo de Endereçamento:
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        fontWeight: 700,
                        border: tipoVincularInput === 'PICKING' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: tipoVincularInput === 'PICKING' ? '#dcfce7' : '#ffffff',
                        color: tipoVincularInput === 'PICKING' ? '#15803d' : '#475569',
                        cursor: 'pointer',
                      }}
                      onClick={() => setTipoVincularInput('PICKING')}
                    >
                      📍 Picking (Único)
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        fontWeight: 700,
                        border: tipoVincularInput === 'PULMAO' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: tipoVincularInput === 'PULMAO' ? '#e0f2fe' : '#ffffff',
                        color: tipoVincularInput === 'PULMAO' ? '#0369a1' : '#475569',
                        cursor: 'pointer',
                      }}
                      onClick={() => setTipoVincularInput('PULMAO')}
                    >
                      📦 Pulmão (Reserva)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Código ou Máscara do Endereço:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 01.02.03.01 ou código numérico..."
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '2px solid #f97316',
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 700,
                      fontSize: 15,
                      boxSizing: 'border-box',
                    }}
                    value={novoEndInput}
                    onChange={(e) => setNovoEndInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Lote / Controle (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Digitar ou escanear lote (se aplicável)..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                    value={loteInput}
                    onChange={(e) => setLoteInput(e.target.value)}
                  />
                </div>

                <div className="enderecamento-modal-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-acao"
                    onClick={() => setModalVincular({ aberto: false })}
                    disabled={salvandoVincular}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="enderecamento-scanner-btn"
                    onClick={handleConfirmarVincular}
                    disabled={salvandoVincular || !novoEndInput.trim()}
                  >
                    {salvandoVincular ? 'Salvando...' : '✓ Vincular Endereço'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL: RETIRAR / DESENDEREÇAR ═══ */}
          {modalRetirar.aberto && (
            <div className="enderecamento-modal-backdrop">
              <div className="enderecamento-modal-box">
                <h3 className="enderecamento-modal-title" style={{ color: '#dc2626' }}>
                  🗑️ Confirmar Retirada de Endereço
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                  Tem certeza que deseja desvincular o produto{' '}
                  <strong>{modalRetirar.codprod} - {modalRetirar.descrprod}</strong> do endereço{' '}
                  <strong>{modalRetirar.endereco}</strong>?
                </p>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 10, borderRadius: 10, fontSize: 12, color: '#b91c1c' }}>
                  ⚠️ A posição física será liberada no sistema e inativada na tabela de endereçamento WMS do Sankhya (TGWEXP).
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Motivo da Retirada (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Esgotamento físico, avaria, mudança de layout..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                    value={motivoRetirarInput}
                    onChange={(e) => setMotivoRetirarInput(e.target.value)}
                  />
                </div>

                <div className="enderecamento-modal-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-acao"
                    onClick={() => setModalRetirar({ aberto: false })}
                    disabled={salvandoRetirar}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    style={{
                      height: 42,
                      padding: '0 18px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={handleConfirmarRetirar}
                    disabled={salvandoRetirar}
                  >
                    {salvandoRetirar ? 'Retirando...' : 'Sim, Retirar do Endereço'}
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
