import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppLayout, AppHeader } from '../../components';
import { ProdutoImagem } from '../../components/common/ProdutoImagem';
import { separacaoApiService } from '../../../infrastructure/api/SeparacaoApiService';
import {
  CargaPendente,
  Separacao,
  SeparacaoItem,
  SeparacaoItemConsolidado,
  AlteracaoErpItem,
} from '../../../domain/models/Separacao';
import { EnderecoChips, parseEndereco } from './EnderecoChips';
import { useAuth } from '../../../application/contexts/AuthContext';
import './SeparacaoPage.css';

// Componente expansível para códigos de barras e multiplicadores de embalagem
interface CampoBarrasExpansivelProps {
  codbarraStr?: string | null;
  referencia?: string | null;
  onSelect?: (codigo: string) => void;
}

function CampoBarrasExpansivel({
  codbarraStr,
  referencia,
  onSelect,
}: CampoBarrasExpansivelProps) {
  const [expandido, setExpandido] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandido) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpandido(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expandido]);

  const barras = useMemo(() => {
    return codbarraStr
      ? codbarraStr
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean)
      : [];
  }, [codbarraStr]);

  if (barras.length === 0 && !referencia) {
    return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
  }

  // Se houver apenas 1 código e nenhuma referência distinta, exibe direto sem dropdown
  if (barras.length === 1 && !referencia) {
    const b = barras[0];
    const matchEmbalagem = b.match(/^(.*?)\s*(\(.*?\))$/);
    const codigoPuro = matchEmbalagem ? matchEmbalagem[1].trim() : b;
    const embalagem = matchEmbalagem ? matchEmbalagem[2].replace(/[()]/g, '').trim() : null;

    return (
      <div className="separacao-barras-container">
        <span
          className="separacao-barcode-chip"
          title={`Código: ${codigoPuro}${embalagem ? ` (${embalagem})` : ''} - Clique para preencher no leitor`}
          onClick={() => onSelect?.(codigoPuro)}
        >
          <span>🏷️ {codigoPuro}</span>
          {embalagem && (
            <span
              style={{
                marginLeft: 4,
                padding: '1px 5px',
                background:
                  embalagem.endsWith('x1') || embalagem.endsWith('/1')
                    ? '#f1f5f9'
                    : '#fef3c7',
                color:
                  embalagem.endsWith('x1') || embalagem.endsWith('/1')
                    ? '#475569'
                    : '#92400e',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 10,
                border:
                  embalagem.endsWith('x1') || embalagem.endsWith('/1')
                    ? '1px solid #cbd5e1'
                    : '1px solid #fde68a',
                display: 'inline-block',
              }}
            >
              {embalagem.endsWith('x1') || embalagem.endsWith('/1')
                ? `(${embalagem})`
                : `📦 ${embalagem}`}
            </span>
          )}
        </span>
      </div>
    );
  }

  const totalCodigos = barras.length + (referencia ? 1 : 0);

  return (
    <div className="separacao-barras-expansivel" ref={containerRef}>
      <button
        type="button"
        className={`separacao-barras-trigger ${expandido ? 'expandido' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setExpandido((prev) => !prev);
        }}
        title={
          expandido
            ? 'Clique para recolher os códigos de barras'
            : 'Clique para expandir os códigos de barras disponíveis deste produto'
        }
      >
        <span>🏷️</span>
        <span>
          {barras.length > 1
            ? `${barras.length} códigos de barras`
            : `${totalCodigos} códigos`}
        </span>
        <span className="separacao-barras-trigger-seta">
          {expandido ? '▲' : '▼'}
        </span>
      </button>

      {expandido && (
        <div className="separacao-barras-painel-expandido">
          <div className="separacao-barras-painel-header">
            Códigos de barras disponíveis (toque para preencher):
          </div>
          <div className="separacao-barras-painel-chips">
            {referencia && (
              <span
                className="separacao-barcode-chip"
                style={{ background: '#e0f2fe', borderColor: '#7dd3fc', color: '#0369a1' }}
                onClick={() => {
                  onSelect?.(referencia);
                  setExpandido(false);
                }}
                title="Referência comercial do produto - Clique para preencher no leitor"
              >
                Ref: {referencia}
              </span>
            )}
            {barras.map((b, idx) => {
              const matchEmbalagem = b.match(/^(.*?)\s*(\(.*?\))$/);
              const codigoPuro = matchEmbalagem ? matchEmbalagem[1].trim() : b;
              const embalagem = matchEmbalagem ? matchEmbalagem[2].replace(/[()]/g, '').trim() : null;

              return (
                <span
                  key={idx}
                  className="separacao-barcode-chip"
                  title={`Código: ${codigoPuro}${embalagem ? ` (${embalagem})` : ''} - Clique para preencher no leitor`}
                  onClick={() => {
                    onSelect?.(codigoPuro);
                    setExpandido(false);
                  }}
                >
                  <span>🏷️ {codigoPuro}</span>
                  {embalagem ? (
                    <span
                      style={{
                        marginLeft: 4,
                        padding: '1px 5px',
                        background:
                          embalagem.endsWith('x1') || embalagem.endsWith('/1')
                            ? '#f1f5f9'
                            : '#fef3c7',
                        color:
                          embalagem.endsWith('x1') || embalagem.endsWith('/1')
                            ? '#475569'
                            : '#92400e',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 10,
                        border:
                          embalagem.endsWith('x1') || embalagem.endsWith('/1')
                            ? '1px solid #cbd5e1'
                            : '1px solid #fde68a',
                        display: 'inline-block',
                      }}
                    >
                      {embalagem.endsWith('x1') || embalagem.endsWith('/1')
                        ? `(${embalagem})`
                        : `📦 ${embalagem}`}
                    </span>
                  ) : (
                    <span
                      style={{
                        marginLeft: 4,
                        padding: '1px 5px',
                        background: '#f1f5f9',
                        color: '#475569',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 10,
                        border: '1px solid #cbd5e1',
                        display: 'inline-block',
                      }}
                    >
                      (1x)
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function tocarSom(tipo: 'sucesso' | 'erro' | 'alerta') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === 'sucesso') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      navigator.vibrate?.([60]);
    } else if (tipo === 'erro') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      navigator.vibrate?.([150, 80, 150]);
    } else if (tipo === 'alerta') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      navigator.vibrate?.([200, 100, 200]);
    }
  } catch {
    // AudioContext pode ser bloqueado antes do primeiro clique do usuário
  }
}

export function SeparacaoPage() {
  const { temPermissao } = useAuth();
  const podeIniciar = temPermissao('separacao_iniciar');
  const podeBipar = temPermissao('separacao_bipar');
  const podeFinalizar = temPermissao('separacao_finalizar');
  const podeCortar = temPermissao('separacao_cortar');

  // Estados de navegação e dados
  const [cargas, setCargas] = useState<CargaPendente[]>([]);
  const [filtroOrdemCarga, setFiltroOrdemCarga] = useState('');
  const [tipoOrdenacao, setTipoOrdenacao] = useState<'PRIORIDADE' | 'CARGA_DESC' | 'CARGA_ASC' | 'VOLUME_DESC' | 'VOLUME_ASC' | 'ITENS_DESC'>('PRIORIDADE');

  const cargasOrdenadas = useMemo(() => {
    const lista = [...cargas];
    switch (tipoOrdenacao) {
      case 'PRIORIDADE':
        return lista.sort((a, b) => {
          const getPeso = (st?: string) => {
            if (st === 'REABASTECIDO') return 1;
            if (st === 'EM_ANDAMENTO') return 2;
            if (st === 'AGUARDANDO_REABASTECIMENTO') return 3;
            if (st === 'FINALIZADA') return 5;
            return 4; // Aguardando
          };
          const pesoDiff = getPeso(a.statusLocal) - getPeso(b.statusLocal);
          if (pesoDiff !== 0) return pesoDiff;
          return b.ordemCarga - a.ordemCarga;
        });
      case 'CARGA_DESC':
        return lista.sort((a, b) => b.ordemCarga - a.ordemCarga);
      case 'CARGA_ASC':
        return lista.sort((a, b) => a.ordemCarga - b.ordemCarga);
      case 'VOLUME_DESC':
        return lista.sort((a, b) => (b.qtdUnidades || 0) - (a.qtdUnidades || 0));
      case 'VOLUME_ASC':
        return lista.sort((a, b) => (a.qtdUnidades || 0) - (b.qtdUnidades || 0));
      case 'ITENS_DESC':
        return lista.sort((a, b) => (b.qtdItens || 0) - (a.qtdItens || 0));
      default:
        return lista;
    }
  }, [cargas, tipoOrdenacao]);
  const [sessaoAtiva, setSessaoAtiva] = useState<Separacao | null>(null);
  const [itens, setItens] = useState<SeparacaoItem[]>([]);
  const [itensConsolidados, setItensConsolidados] = useState<SeparacaoItemConsolidado[]>([]);
  const [progresso, setProgresso] = useState({
    totalEsperado: 0,
    totalSeparado: 0,
    percentual: 0,
    itensPendentes: 0,
    itensSeparados: 0,
  });

  // Visão e filtros
  const [modoVisao, setModoVisao] = useState<'ROTA_GUIADA' | 'CONSOLIDADO' | 'PEDIDO' | 'FALTAS'>('ROTA_GUIADA');
  const [pedidoFiltro, setPedidoFiltro] = useState<number | null>(null);
  const [itemAtualRotaIndex, setItemAtualRotaIndex] = useState(0);

  // Bipagem
  const [codigoBarras, setCodigoBarras] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [lote, setLote] = useState('');
  const [bipando, setBipando] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Sincronização ERP e Alertas
  const [sincronizando, setSincronizando] = useState(false);
  const [alteracoesErp, setAlteracoesErp] = useState<AlteracaoErpItem[]>([]);
  const [ultimoSyncEm, setUltimoSyncEm] = useState<string>('');

  // Modais de Finalização e Histórico
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [modalBipagensAberto, setModalBipagensAberto] = useState(false);
  const [bipagens, setBipagens] = useState<any[]>([]);
  const [justificativa, setJustificativa] = useState('');
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [painelAcoesAberto, setPainelAcoesAberto] = useState(false);

  // Modais de Endereçamento, Falta e Re-separação
  const [modalEndereco, setModalEndereco] = useState<{ aberto: boolean; item?: SeparacaoItemConsolidado }>({ aberto: false });
  const [codigoEnderecoInput, setCodigoEnderecoInput] = useState('');
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);

  const [modalFalta, setModalFalta] = useState<{ aberto: boolean; item?: SeparacaoItemConsolidado }>({ aberto: false });
  const [motivoFaltaSelecionado, setMotivoFaltaSelecionado] = useState('Não localizado no endereço de picking');
  const [motivoFaltaCustom, setMotivoFaltaCustom] = useState('');
  const [salvandoFalta, setSalvandoFalta] = useState(false);
  const [proximoIndiceAposFalta, setProximoIndiceAposFalta] = useState<number | null>(null);

  // Modal de Estorno de Bipagens por Produto
  const [modalEstornoProduto, setModalEstornoProduto] = useState<{
    aberto: boolean;
    item?: SeparacaoItemConsolidado;
    bipes: any[];
    carregando: boolean;
  }>({ aberto: false, bipes: [], carregando: false });

  const [modalReseparar, setModalReseparar] = useState<{ aberto: boolean; item?: SeparacaoItemConsolidado }>({ aberto: false });
  const [qtdResepararInput, setQtdResepararInput] = useState<number>(1);
  const [loteResepararInput, setLoteResepararInput] = useState('');
  const [salvandoReseparar, setSalvandoReseparar] = useState(false);

  const inputCodigoRef = useRef<HTMLInputElement>(null);
  const inputEndRef = useRef<HTMLInputElement>(null);

  const itensComFalta = useMemo(() => {
    return itensConsolidados.filter(
      (i) => (i.qtdFaltaTotal && i.qtdFaltaTotal > 0) || i.statusConsolidado === 'FALTA' || i.statusConsolidado === 'CORTADO_DEFINITIVO'
    );
  }, [itensConsolidados]);

  const itemAtualRota = useMemo(() => {
    if (itensConsolidados.length === 0) return null;
    const idx = Math.min(Math.max(0, itemAtualRotaIndex), itensConsolidados.length - 1);
    return itensConsolidados[idx] || null;
  }, [itensConsolidados, itemAtualRotaIndex]);

  // Interceptar avanço quando o item atual da rota estiver incompleto
  const tentarAvancarItem = useCallback((destinoIdx?: number) => {
    if (!itemAtualRota) return;

    const proximoIndice =
      destinoIdx !== undefined
        ? destinoIdx
        : Math.min(itensConsolidados.length - 1, itemAtualRotaIndex + 1);

    if (destinoIdx === undefined && itemAtualRotaIndex >= itensConsolidados.length - 1) {
      return;
    }

    const estaIncompleto =
      itemAtualRota.qtdSeparadaTotal < itemAtualRota.qtdEsperadaTotal &&
      itemAtualRota.statusConsolidado !== 'FALTA' &&
      itemAtualRota.statusConsolidado !== 'CORTADO_DEFINITIVO';

    if (estaIncompleto) {
      tocarSom('alerta');
      setProximoIndiceAposFalta(proximoIndice);
      setModalFalta({ aberto: true, item: itemAtualRota });
      setMotivoFaltaSelecionado('Não localizado no endereço de picking');
      setMotivoFaltaCustom('');
      return;
    }

    setItemAtualRotaIndex(proximoIndice);
  }, [itemAtualRota, itensConsolidados.length, itemAtualRotaIndex, tocarSom]);

  // Gestos de toque lateral (Swipe) para mobile na Rota Guiada
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);

  const handleCardTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setTouchDeltaX(0);
  };

  const handleCardTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Se o movimento for predominantemente horizontal, aplica translação visual suave
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      const limited = Math.max(-60, Math.min(60, diffX));
      setTouchDeltaX(limited);
    }
  };

  const handleCardTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartXRef.current;
    const diffY = endY - (touchStartYRef.current || 0);

    // Se o arraste horizontal passou de 45px e superou o movimento vertical
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        // Deslizou para a ESQUERDA ➔ Tenta avançar (ou aciona falta se incompleto)
        tentarAvancarItem();
      } else {
        // Deslizou para a DIREITA ➔ ITEM ANTERIOR
        setItemAtualRotaIndex((prev) => Math.max(0, prev - 1));
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setTouchDeltaX(0);
  };

  const handleSelecionarCodigo = useCallback((codigo: string) => {
    setCodigoBarras(codigo);
    if (inputCodigoRef.current) {
      inputCodigoRef.current.focus();
    }
  }, []);

  // 1. Carregar lista inicial de cargas
  const carregarCargas = useCallback(async (ordem?: number) => {
    try {
      setCarregando(true);
      const res = await separacaoApiService.listarCargas(ordem);
      setCargas(res);
    } catch (err: any) {
      setMensagemStatus({ tipo: 'erro', texto: err.response?.data?.error || err.message });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCargas();
  }, [carregarCargas]);

  // 2. Iniciar / Retomar sessão de separação
  const handleIniciarSeparacao = async (ordemCarga: number) => {
    if (!podeIniciar) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Acesso negado: seu usuário não possui permissão para iniciar ou continuar separações de carga.',
      });
      tocarSom('erro');
      return;
    }

    try {
      setCarregando(true);
      setMensagemStatus(null);
      const res = await separacaoApiService.iniciarSeparacao(ordemCarga);

      // Se a sessão foi recuperada (já estava em andamento), verifica se houve alterações no Sankhya
      if (res.recuperada) {
        try {
          const syncRes = await separacaoApiService.sincronizar(res.separacao.id);
          if (syncRes.temAlteracoes && syncRes.alteracoes.length > 0) {
            setAlteracoesErp(syncRes.alteracoes);
            tocarSom('alerta');
          }
        } catch (_) {}
      }

      const dados = await separacaoApiService.obterSeparacao(res.separacao.id);
      setSessaoAtiva(dados.separacao);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);
      setUltimoSyncEm(new Date().toLocaleTimeString());
      setTimeout(() => inputCodigoRef.current?.focus(), 200);
    } catch (err: any) {
      tocarSom('erro');
      setMensagemStatus({ tipo: 'erro', texto: err.response?.data?.error || err.message });
    } finally {
      setCarregando(false);
    }
  };

  // 3. Sincronização periódica com Sankhya ERP (a cada 30 segundos)
  const executarSincronizacao = useCallback(async (separacaoId: string, manual: boolean = false) => {
    try {
      if (manual) setSincronizando(true);
      const res = await separacaoApiService.sincronizar(separacaoId);
      setUltimoSyncEm(new Date().toLocaleTimeString());

      if (res.temAlteracoes && res.alteracoes.length > 0) {
        setAlteracoesErp(res.alteracoes);
        tocarSom('alerta');
      }

      // Atualizar lista completa de itens e métricas
      const dados = await separacaoApiService.obterSeparacao(separacaoId);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);
    } catch (err: any) {
      console.warn('[Separação] Falha no polling de sincronização:', err.message);
    } finally {
      if (manual) setSincronizando(false);
    }
  }, []);

  useEffect(() => {
    if (!sessaoAtiva || sessaoAtiva.status === 'FINALIZADA') return;

    const interval = setInterval(() => {
      executarSincronizacao(sessaoAtiva.id, false);
    }, 30000);

    return () => clearInterval(interval);
  }, [sessaoAtiva, executarSincronizacao]);

  // 4. Bipagem de item
  const handleBipar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessaoAtiva || !codigoBarras.trim() || bipando) return;

    if (!podeBipar) {
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Acesso negado: seu usuário não possui permissão para bipar itens na separação.',
      });
      tocarSom('erro');
      return;
    }

    try {
      setBipando(true);
      setMensagemStatus(null);

      const res = await separacaoApiService.bipar(
        sessaoAtiva.id,
        codigoBarras.trim(),
        quantidade,
        lote.trim() || undefined,
        pedidoFiltro || undefined
      );

      tocarSom('sucesso');
      setMensagemStatus({ tipo: 'sucesso', texto: res.mensagem });
      setCodigoBarras('');
      setLote('');
      setQuantidade(1);

      // Atualizar dados na tela
      const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);

      // Mantém o foco no produto atual para o operador conferir o status concluído.
      // A navegação entre itens é controlada manualmente pelo operador via swipe ou botões de navegação.

      setTimeout(() => inputCodigoRef.current?.focus(), 100);
    } catch (err: any) {
      tocarSom('erro');
      const msg = err.response?.data?.error || err.message || 'Falha ao bipar item.';
      setMensagemStatus({ tipo: 'erro', texto: msg });
      setTimeout(() => inputCodigoRef.current?.select(), 100);
    } finally {
      setBipando(false);
    }
  };

  // 4.1 Salvar / Vincular Endereço de Picking (TGWEXP / TGWEND)
  const handleSalvarEndereco = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessaoAtiva || !modalEndereco.item || !codigoEnderecoInput.trim() || salvandoEndereco) return;

    try {
      setSalvandoEndereco(true);
      const res = await separacaoApiService.atualizarEndereco(
        sessaoAtiva.id,
        modalEndereco.item.codprod,
        codigoEnderecoInput.trim()
      );

      tocarSom('sucesso');
      setMensagemStatus({ tipo: 'sucesso', texto: res.mensagem });
      setModalEndereco({ aberto: false });
      setCodigoEnderecoInput('');

      const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);

      // Manter a visualização no mesmo produto que acabou de ser endereçado
      if (modalEndereco.item?.codprod) {
        const prodId = modalEndereco.item.codprod;
        const novoIdx = dados.itensConsolidados.findIndex((c) => c.codprod === prodId);
        if (novoIdx !== -1) {
          setItemAtualRotaIndex(novoIdx);
        }
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao vincular endereço.');
    } finally {
      setSalvandoEndereco(false);
    }
  };

  // 4.2 Registrar Falta Física no Picking
  const handleConfirmarFalta = async () => {
    if (!sessaoAtiva || !modalFalta.item || salvandoFalta) return;

    if (!podeCortar) {
      alert('Acesso negado: seu usuário não possui permissão para registrar falta ou corte de itens.');
      tocarSom('erro');
      return;
    }

    try {
      setSalvandoFalta(true);
      const motivoFinal =
        motivoFaltaSelecionado === 'Outro' && motivoFaltaCustom.trim()
          ? motivoFaltaCustom.trim()
          : motivoFaltaSelecionado;

      const res = await separacaoApiService.registrarFalta(
        sessaoAtiva.id,
        modalFalta.item.codprod,
        motivoFinal
      );

      tocarSom('alerta');
      setMensagemStatus({ tipo: 'sucesso', texto: res.mensagem });
      setModalFalta({ aberto: false });
      setMotivoFaltaCustom('');

      const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);

      // Avançar para o destino agendado ou próximo pendente na rota
      if (proximoIndiceAposFalta !== null && proximoIndiceAposFalta !== undefined) {
        setItemAtualRotaIndex(proximoIndiceAposFalta);
        setProximoIndiceAposFalta(null);
      } else {
        const proxIdx = dados.itensConsolidados.findIndex(
          (c, idx) => idx > itemAtualRotaIndex && c.qtdSeparadaTotal < c.qtdEsperadaTotal && c.statusConsolidado !== 'CORTADO_DEFINITIVO'
        );
        if (proxIdx !== -1) {
          setItemAtualRotaIndex(proxIdx);
        }
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao registrar falta.');
    } finally {
      setSalvandoFalta(false);
      setProximoIndiceAposFalta(null);
    }
  };

  // 4.3 Resolver Falta: Re-separar do Pulmão
  const handleConfirmarReseparacao = async () => {
    if (!sessaoAtiva || !modalReseparar.item || salvandoReseparar) return;

    try {
      setSalvandoReseparar(true);
      const res = await separacaoApiService.resolverFalta(sessaoAtiva.id, {
        codprod: modalReseparar.item.codprod,
        acao: 'RESEPARAR',
        quantidade: qtdResepararInput,
        lote: loteResepararInput.trim() || undefined,
      });

      tocarSom('sucesso');
      setMensagemStatus({ tipo: 'sucesso', texto: res.mensagem });
      setModalReseparar({ aberto: false });

      const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao re-separar item.');
    } finally {
      setSalvandoReseparar(false);
    }
  };

  // 4.4 Resolver Falta: Confirmar Corte Definitivo
  const handleConfirmarCorte = async (cons: SeparacaoItemConsolidado) => {
    if (!sessaoAtiva) return;

    if (!podeCortar) {
      alert('Acesso negado: seu usuário não possui permissão para registrar corte definitivo de itens.');
      tocarSom('erro');
      return;
    }

    const falta = cons.qtdFaltaTotal || Math.max(0, cons.qtdEsperadaTotal - cons.qtdSeparadaTotal);
    if (!confirm(`Confirma o corte definitivo de ${falta} UN do produto ${cons.codprod} - ${cons.descrprod}? O saldo faltante não bloqueará a conclusão da carga.`)) {
      return;
    }

    try {
      setCarregando(true);
      const res = await separacaoApiService.resolverFalta(sessaoAtiva.id, {
        codprod: cons.codprod,
        acao: 'CORTAR',
      });

      tocarSom('alerta');
      setMensagemStatus({ tipo: 'sucesso', texto: res.mensagem });

      const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao confirmar corte.');
    } finally {
      setCarregando(false);
    }
  };

  // 5. Finalizar separação
  const handleFinalizar = async (permitirParcial: boolean = false) => {
    if (!sessaoAtiva) return;

    if (!podeFinalizar) {
      alert('Acesso negado: seu usuário não possui permissão para finalizar separações.');
      tocarSom('erro');
      return;
    }

    try {
      setCarregando(true);
      const res = await separacaoApiService.finalizar(
        sessaoAtiva.id,
        permitirParcial,
        justificativa.trim() || undefined
      );
      tocarSom('sucesso');
      alert(res.mensagem);
      setModalFinalizarAberto(false);
      setSessaoAtiva(null);
      carregarCargas();
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message);
    } finally {
      setCarregando(false);
    }
  };

  // 5.1 Solicitar Reabastecimento para a equipe de empilhadeira
  const [solicitandoReabastecimento, setSolicitandoReabastecimento] = useState(false);

  const handleSolicitarReabastecimento = async (codprod?: number) => {
    if (!sessaoAtiva) return;

    try {
      setSolicitandoReabastecimento(true);
      const res = await separacaoApiService.solicitarReabastecimento(sessaoAtiva.id, {
        codprod,
      });
      tocarSom('sucesso');
      setMensagemStatus({
        tipo: 'sucesso',
        texto: res.mensagem,
      });
      const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
      setSessaoAtiva(dados.separacao);
      setItens(dados.itens);
      setItensConsolidados(dados.itensConsolidados);
      setProgresso(dados.progresso);
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao solicitar reabastecimento.');
    } finally {
      setSolicitandoReabastecimento(false);
    }
  };

  // 6. Consultar e estornar bipagens
  const abrirModalBipagens = async () => {
    if (!sessaoAtiva) return;
    try {
      const res = await separacaoApiService.listarBipagens(sessaoAtiva.id);
      setBipagens(res);
      setModalBipagensAberto(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEstornarBipagem = async (bipId: string) => {
    if (!confirm('Deseja realmente estornar esta bipagem?')) return;
    try {
      await separacaoApiService.anularBipagem(bipId);
      tocarSom('sucesso');
      if (sessaoAtiva) {
        const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
        setItens(dados.itens);
        setItensConsolidados(dados.itensConsolidados);
        setProgresso(dados.progresso);
        const resBips = await separacaoApiService.listarBipagens(sessaoAtiva.id);
        setBipagens(resBips);
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.message);
    }
  };

  // 6.1 Modal de Estorno de Bipagens por Produto
  const handleAbrirModalEstornoProduto = async (item: SeparacaoItemConsolidado) => {
    if (!sessaoAtiva) return;
    try {
      setModalEstornoProduto({ aberto: true, item, bipes: [], carregando: true });
      const resBips = await separacaoApiService.listarBipagens(sessaoAtiva.id);
      const bipesItem = (resBips || []).filter(
        (b: any) => b.codprod === item.codprod && (b.anulado === 0 || !b.anulado)
      );
      setModalEstornoProduto({ aberto: true, item, bipes: bipesItem, carregando: false });
    } catch (err: any) {
      tocarSom('erro');
      alert('Erro ao consultar bipagens do produto: ' + (err.message || err));
      setModalEstornoProduto({ aberto: false, bipes: [], carregando: false });
    }
  };

  const handleEstornarBipagemItem = async (bipId: string) => {
    if (!confirm('Deseja estornar esta bipagem? A quantidade será subtraída da contagem deste produto.')) return;
    try {
      const res = await separacaoApiService.anularBipagem(bipId);
      tocarSom('alerta');
      setMensagemStatus({ tipo: 'sucesso', texto: res.mensagem });

      if (sessaoAtiva) {
        const dados = await separacaoApiService.obterSeparacao(sessaoAtiva.id);
        setItens(dados.itens);
        setItensConsolidados(dados.itensConsolidados);
        setProgresso(dados.progresso);

        const resBips = await separacaoApiService.listarBipagens(sessaoAtiva.id);
        setBipagens(resBips);

        const itemAtual = modalEstornoProduto.item;
        const bipesRestantes = (resBips || []).filter(
          (b: any) => b.codprod === itemAtual?.codprod && (b.anulado === 0 || !b.anulado)
        );

        const itemAtualizado = dados.itensConsolidados.find((c) => c.codprod === itemAtual?.codprod);

        if (bipesRestantes.length === 0) {
          setModalEstornoProduto({ aberto: false, bipes: [], carregando: false });
        } else {
          setModalEstornoProduto((prev) => ({
            ...prev,
            item: itemAtualizado || prev.item,
            bipes: bipesRestantes,
            carregando: false,
          }));
        }
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Falha ao estornar bipagem.');
    }
  };

  const pedidosUnicos = Array.from(new Set(itens.map((i) => i.nunota))).sort((a, b) => a - b);

  return (
    <AppLayout>
      {({ openDrawer }) => (
        <div className="page-container separacao-page-container">
          {/* Header Fixo no Topo no Mobile (AppHeader + Métricas e Abas) */}
          <div className={`separacao-header-sticky-wrapper ${sessaoAtiva ? 'sessao-ativa' : ''}`}>
            <AppHeader
              titulo="Separação de Cargas"
              onOpenDrawer={openDrawer}
            />

            {sessaoAtiva && (
              <div className="separacao-metrics-card separacao-metrics-sticky">
                {/* Resumo Mobile (Linha Única com Carga no Centro) */}
                <div className="separacao-mobile-stats-row">
                  <span className="separacao-mobile-stats-main">
                    Progresso: <strong>{progresso.percentual}%</strong> ({progresso.totalSeparado}/{progresso.totalEsperado} UN)
                  </span>
                  <span
                    className="separacao-mobile-stats-carga"
                    title={`Empresa: ${sessaoAtiva.codemp || ''} • Operador: ${sessaoAtiva.usuario || ''}`}
                  >
                    🚚 #{sessaoAtiva.ordemCarga}{sessaoAtiva.codemp ? ` • Emp ${sessaoAtiva.codemp}` : ''}
                  </span>
                  <span className="separacao-mobile-stats-sub">
                    {progresso.itensSeparados}/{itensConsolidados.length} itens
                  </span>
                </div>

                {/* Resumo Desktop */}
                <div className="separacao-metrics-row separacao-desktop-stats">
                  <div className="separacao-stat-box">
                    <span className="separacao-stat-label">Progresso da Carga</span>
                    <span className="separacao-stat-val">
                      {progresso.percentual}% ({progresso.totalSeparado} / {progresso.totalEsperado} UN)
                    </span>
                  </div>
                  <div className="separacao-stat-box">
                    <span className="separacao-stat-label">Itens Separados</span>
                    <span className="separacao-stat-val" style={{ color: '#16a34a' }}>
                      {progresso.itensSeparados} concluídos
                    </span>
                  </div>
                  <div className="separacao-stat-box">
                    <span className="separacao-stat-label">Itens Pendentes</span>
                    <span className="separacao-stat-val" style={{ color: '#d97706' }}>
                      {progresso.itensPendentes} pendentes
                    </span>
                  </div>
                </div>

                {/* Alternância de Visão (Pílulas Deslizantes) */}
                <div className="separacao-view-toggle">
                  <button
                    type="button"
                    className={`separacao-toggle-btn ${modoVisao === 'ROTA_GUIADA' ? 'ativo' : ''}`}
                    onClick={() => {
                      setModoVisao('ROTA_GUIADA');
                      setPedidoFiltro(null);
                    }}
                  >
                    🧭 Rota Guiada
                  </button>
                  <button
                    type="button"
                    className={`separacao-toggle-btn ${modoVisao === 'CONSOLIDADO' ? 'ativo' : ''}`}
                    onClick={() => {
                      setModoVisao('CONSOLIDADO');
                      setPedidoFiltro(null);
                    }}
                  >
                    📦 Consolidado
                  </button>
                  <button
                    type="button"
                    className={`separacao-toggle-btn ${modoVisao === 'PEDIDO' ? 'ativo' : ''}`}
                    onClick={() => {
                      setModoVisao('PEDIDO');
                      if (pedidosUnicos.length > 0 && !pedidoFiltro) {
                        setPedidoFiltro(pedidosUnicos[0]);
                      }
                    }}
                  >
                    📄 Por Pedido
                  </button>
                  <button
                    type="button"
                    className={`separacao-toggle-btn ${modoVisao === 'FALTAS' ? 'ativo' : ''}`}
                    style={
                      itensComFalta.length > 0
                        ? { color: modoVisao === 'FALTAS' ? '#ffffff' : '#e11d48', fontWeight: 700 }
                        : {}
                    }
                    onClick={() => {
                      setModoVisao('FALTAS');
                      setPedidoFiltro(null);
                    }}
                  >
                    ⚠️ Faltas {itensComFalta.length > 0 ? `(${itensComFalta.length})` : ''}
                  </button>
                </div>

                <div className="separacao-progress-bar-bg" style={{ height: 4, margin: '2px 0 0 0' }}>
                  <div
                    className="separacao-progress-bar-fill"
                    style={{ width: `${progresso.percentual}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="separacao-page-wrapper">
            {/* Card Extra de Cabeçalho Interno */}
            <div className={`separacao-page-header ${sessaoAtiva ? 'sessao-ativa' : ''}`}>
              <div className="separacao-header-title">
                <span className="separacao-header-icon">🚚</span>
                <div>
                  <h1>Separação de Cargas (Vendas)</h1>
                  <p className="separacao-header-subtitle">
                    {sessaoAtiva
                      ? `Ordem de Carga: #${sessaoAtiva.ordemCarga}${sessaoAtiva.codemp ? ` — Empresa: ${sessaoAtiva.codemp}${sessaoAtiva.nomeEmpresa ? ` - ${sessaoAtiva.nomeEmpresa}` : ''}` : ''} — Operador: ${sessaoAtiva.usuario}`
                      : 'Selecione ou escaneie uma Ordem de Carga pendente no Sankhya'}
                  </p>
                  {sessaoAtiva && sessaoAtiva.status === 'AGUARDANDO_REABASTECIMENTO' && (
                    <div style={{ marginTop: 4 }}>
                      <span className="separacao-badge-status aguardando-reabastecimento">
                        ⏳ Aguardando Reabastecimento no Picking
                      </span>
                    </div>
                  )}
                  {sessaoAtiva && sessaoAtiva.status === 'REABASTECIDO' && (
                    <div style={{ marginTop: 4 }}>
                      <span className="separacao-badge-status reabastecido">
                        ⚡ Pick Reabastecido pela Empilhadeira
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`separacao-header-actions ${sessaoAtiva ? 'separacao-header-actions-sessao' : ''}`}>
                {sessaoAtiva ? (
                  <>
                    <button
                      type="button"
                      className="separacao-btn"
                      style={{ background: '#f59e0b', color: '#ffffff', fontWeight: 700 }}
                      onClick={() => handleSolicitarReabastecimento()}
                      disabled={solicitandoReabastecimento || progresso.itensPendentes === 0}
                      title={
                        progresso.itensPendentes === 0
                          ? 'Não há itens pendentes para solicitar reabastecimento'
                          : 'Acionar equipe de empilhadeira para buscar produtos no estoque/pulmão'
                      }
                    >
                      {solicitandoReabastecimento ? '🚜 Solicitando...' : '🚜 Solicitar Reabastecimento'}
                    </button>
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => executarSincronizacao(sessaoAtiva.id, true)}
                      disabled={sincronizando}
                      title={`Última verificação: ${ultimoSyncEm}`}
                    >
                      {sincronizando ? '🔄 Sincronizando...' : '🔄 Sincronizar ERP'}
                    </button>
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={abrirModalBipagens}
                    >
                      📋 Histórico ({bipagens.length || 'Bipes'})
                    </button>
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-success"
                      onClick={() => setModalFinalizarAberto(true)}
                      disabled={!podeFinalizar}
                      title={!podeFinalizar ? 'Acesso negado: seu usuário não possui permissão para finalizar separação' : undefined}
                      style={{
                        opacity: podeFinalizar ? 1 : 0.6,
                        cursor: podeFinalizar ? 'pointer' : 'not-allowed',
                      }}
                    >
                      ✓ Concluir Carga
                    </button>
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => {
                        if (confirm('Deseja retornar à listagem de cargas?')) {
                          setSessaoAtiva(null);
                          carregarCargas();
                        }
                      }}
                    >
                      Voltar às Cargas
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="separacao-btn separacao-btn-primary separacao-btn-atualizar-cargas"
                    onClick={() => carregarCargas(filtroOrdemCarga ? Number(filtroOrdemCarga) : undefined)}
                    disabled={carregando}
                    title="Atualizar listagem de ordens de carga do ERP"
                  >
                    {carregando ? 'Buscando...' : '🔄 Atualizar Cargas'}
                  </button>
                )}
              </div>
            </div>

            {/* ═══ TELA 1: SELEÇÃO DE ORDEM DE CARGA ═══ */}
            {!sessaoAtiva && (
              <div>
                {/* Campo Rápido de Busca de Carga (Inline no fluxo normal) */}
                <div className="separacao-busca-carga-card">
                  <form
                    className="separacao-busca-carga-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (filtroOrdemCarga.trim()) {
                        handleIniciarSeparacao(Number(filtroOrdemCarga.trim()));
                      }
                    }}
                  >
                    <div className="separacao-busca-carga-input-wrapper">
                      <input
                        type="number"
                        className="separacao-busca-carga-input"
                        placeholder="Nº da Ordem de Carga..."
                        value={filtroOrdemCarga}
                        onChange={(e) => setFiltroOrdemCarga(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="separacao-btn-iniciar-busca"
                      disabled={!filtroOrdemCarga.trim() || carregando}
                    >
                      {carregando ? 'Iniciando...' : 'Iniciar Separação'}
                    </button>
                  </form>
                </div>

                {/* Mensagem de Feedback */}
                {mensagemStatus && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      marginBottom: 16,
                      fontWeight: 600,
                      background: mensagemStatus.tipo === 'erro' ? '#fee2e2' : '#dcfce7',
                      color: mensagemStatus.tipo === 'erro' ? '#991b1b' : '#166534',
                    }}
                  >
                    {mensagemStatus.texto}
                  </div>
                )}

                {/* Grade de Cargas Pendentes com Ordenador */}
                <div className="separacao-cargas-topo-lista">
                  <h2 className="separacao-cargas-titulo">
                    Ordens de Carga Pendentes ({cargasOrdenadas.length})
                  </h2>

                  <div className="separacao-cargas-sort-wrapper">
                    <label htmlFor="select-ordenar-cargas" className="separacao-cargas-sort-label">
                      Ordenar:
                    </label>
                    <select
                      id="select-ordenar-cargas"
                      className="separacao-cargas-sort-select"
                      value={tipoOrdenacao}
                      onChange={(e) => setTipoOrdenacao(e.target.value as any)}
                    >
                      <option value="PRIORIDADE">⚡ Prioridade (Reabastecidas / Em Andamento)</option>
                      <option value="CARGA_DESC">🔢 Carga # (Mais recente)</option>
                      <option value="CARGA_ASC">🔢 Carga # (Menor número)</option>
                      <option value="VOLUME_DESC">📦 Volume Total (Maior primeiro)</option>
                      <option value="VOLUME_ASC">📦 Volume Total (Menor primeiro)</option>
                      <option value="ITENS_DESC">🏷️ Mais Itens Distintos</option>
                    </select>
                  </div>
                </div>

                {cargasOrdenadas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 36, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <p style={{ color: '#64748b', fontSize: 14 }}>
                      {carregando ? 'Buscando cargas no Sankhya...' : 'Nenhuma ordem de carga de venda pendente encontrada.'}
                    </p>
                  </div>
                ) : (
                  <div className="separacao-cargas-grid">
                    {cargasOrdenadas.map((c) => (
                      <div key={c.ordemCarga} className="separacao-carga-card">
                        <div>
                          <div className="separacao-carga-card-header">
                            <span className="separacao-carga-num">Carga #{c.ordemCarga}</span>
                            <span
                              className={`separacao-badge-status ${
                                c.statusLocal === 'REABASTECIDO'
                                  ? 'reabastecido'
                                  : c.statusLocal === 'AGUARDANDO_REABASTECIMENTO'
                                  ? 'aguardando-reabastecimento'
                                  : c.statusLocal === 'FINALIZADA'
                                  ? 'separado'
                                  : c.statusLocal === 'EM_ANDAMENTO'
                                  ? 'parcial'
                                  : 'pendente'
                              }`}
                            >
                              {c.statusLocal === 'REABASTECIDO'
                                ? '⚡ Pick Reabastecido'
                                : c.statusLocal === 'AGUARDANDO_REABASTECIMENTO'
                                ? '⏳ Aguardando Reabastecimento'
                                : c.statusLocal === 'FINALIZADA'
                                ? 'Finalizada'
                                : c.statusLocal === 'EM_ANDAMENTO'
                                ? 'Em Andamento'
                                : 'Aguardando'}
                            </span>
                          </div>

                          {c.codemp && (
                            <div className="separacao-carga-info-row">
                              <span>Empresa:</span>
                              <span className="separacao-carga-info-val" style={{ color: '#0f172a', fontWeight: 600 }}>
                                {c.codemp}{c.nomeEmpresa ? ` - ${c.nomeEmpresa}` : ''}
                              </span>
                            </div>
                          )}
                          <div className="separacao-carga-info-row">
                            <span>Pedidos de Venda:</span>
                            <span className="separacao-carga-info-val">{c.qtdPedidos} pedidos</span>
                          </div>
                          <div className="separacao-carga-info-row">
                            <span>Produtos Distintos:</span>
                            <span className="separacao-carga-info-val">{c.qtdItens} itens</span>
                          </div>
                          <div className="separacao-carga-info-row">
                            <span>Volume Total:</span>
                            <span className="separacao-carga-info-val">{c.qtdUnidades} UN</span>
                          </div>
                          <div className="separacao-carga-info-row">
                            <span>Clientes da Carga:</span>
                            <span className="separacao-carga-info-val">{c.qtdClientes}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="separacao-btn separacao-btn-primary"
                          style={{
                            marginTop: 14,
                            width: '100%',
                            minHeight: 44,
                            opacity: podeIniciar ? 1 : 0.6,
                            cursor: podeIniciar ? 'pointer' : 'not-allowed',
                          }}
                          disabled={!podeIniciar}
                          title={!podeIniciar ? 'Acesso negado: seu usuário não possui permissão para iniciar separações' : undefined}
                          onClick={() => handleIniciarSeparacao(c.ordemCarga)}
                        >
                          {c.statusLocal === 'REABASTECIDO'
                            ? 'Continuar Separação (Reabastecido) ⚡'
                            : c.statusLocal === 'AGUARDANDO_REABASTECIMENTO'
                            ? 'Acompanhar Separação ➔'
                            : c.statusLocal === 'EM_ANDAMENTO'
                            ? 'Continuar Separação ➔'
                            : 'Separar Carga ➔'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ TELA 2: PAINEL OPERACIONAL DE BIPAGEM ═══ */}
            {sessaoAtiva && (
              <div>
                {/* Banner de Alerta de Alterações no Sankhya */}
                {alteracoesErp.length > 0 && (
                  <div className="separacao-alerta-erp">
                    <div className="separacao-alerta-erp-header">
                      <div className="separacao-alerta-erp-title">
                        <span>⚠️</span>
                        <span>ALTERAÇÃO DETECTADA NO SANKHYA DURANTE A SEPARAÇÃO ({alteracoesErp.length})</span>
                      </div>
                      <button
                        type="button"
                        className="separacao-btn separacao-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => setAlteracoesErp([])}
                      >
                        Entendido / Dispensar
                      </button>
                    </div>
                    <ul className="separacao-alerta-erp-list">
                      {alteracoesErp.map((alt, idx) => (
                        <li key={idx} className="separacao-alerta-erp-item">
                          <span>• {alt.mensagem}</span>
                          {alt.exigeAcaoFisica && (
                            <span className="separacao-badge-acao-fisica">Ação Física Obrigatória</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mensagem de Feedback de Bipagem */}
                {mensagemStatus && (
                  <div
                    className="separacao-mensagem-feedback-status"
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      marginBottom: 12,
                      fontWeight: 600,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: mensagemStatus.tipo === 'erro' ? '#fee2e2' : '#dcfce7',
                      color: mensagemStatus.tipo === 'erro' ? '#991b1b' : '#166534',
                      border: mensagemStatus.tipo === 'erro' ? '1px solid #fca5a5' : '1px solid #86efac',
                    }}
                  >
                    <span>{mensagemStatus.tipo === 'erro' ? '⚠️' : '✓'}</span>
                    <span>{mensagemStatus.texto}</span>
                  </div>
                )}

                {/* ═══ Barra de Bipagem Fixa no Rodapé (Mobile) com Aba de Ações Retrátil ═══ */}
                <div className="separacao-docked-container">
                  {/* Backdrop para fechar a gaveta ao tocar fora */}
                  {painelAcoesAberto && (
                    <div
                      className="separacao-actions-backdrop"
                      onClick={() => setPainelAcoesAberto(false)}
                    />
                  )}

                  {/* Gaveta Retrátil (Bottom Sheet) de Ações Sobrepondo a Tela */}
                  <div className={`separacao-actions-sheet ${painelAcoesAberto ? 'aberto' : ''}`}>
                    <div className="separacao-actions-sheet-header">
                      <div className="separacao-actions-sheet-title">
                        <span style={{ fontSize: 18 }}>🚚</span>
                        <div>
                          <strong>Ações da Carga #{sessaoAtiva.ordemCarga}</strong>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                            Operador: {sessaoAtiva.usuario}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="separacao-actions-sheet-close"
                        onClick={() => setPainelAcoesAberto(false)}
                        title="Fechar painel de ações"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="separacao-actions-sheet-body">
                      <button
                        type="button"
                        className="separacao-sheet-btn"
                        style={{ background: '#f59e0b', color: '#ffffff' }}
                        onClick={() => {
                          setPainelAcoesAberto(false);
                          handleSolicitarReabastecimento();
                        }}
                        disabled={solicitandoReabastecimento || progresso.itensPendentes === 0}
                      >
                        <span className="separacao-sheet-btn-icon">🚜</span>
                        <div className="separacao-sheet-btn-info">
                          <strong>{solicitandoReabastecimento ? 'Solicitando...' : 'Solicitar Reabastecimento'}</strong>
                          <small>Acionar equipe de empilhadeira para buscar produtos no pulmão</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="separacao-sheet-btn separacao-sheet-btn-secondary"
                        onClick={() => {
                          setPainelAcoesAberto(false);
                          executarSincronizacao(sessaoAtiva.id, true);
                        }}
                        disabled={sincronizando}
                      >
                        <span className="separacao-sheet-btn-icon">🔄</span>
                        <div className="separacao-sheet-btn-info">
                          <strong>{sincronizando ? 'Sincronizando...' : 'Sincronizar ERP'}</strong>
                          <small>Última verificação: {ultimoSyncEm || 'Agora'}</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="separacao-sheet-btn separacao-sheet-btn-secondary"
                        onClick={() => {
                          setPainelAcoesAberto(false);
                          abrirModalBipagens();
                        }}
                      >
                        <span className="separacao-sheet-btn-icon">📋</span>
                        <div className="separacao-sheet-btn-info">
                          <strong>Histórico de Bipagens</strong>
                          <small>{bipagens.length || 0} bip(es) registrados nesta carga</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="separacao-sheet-btn separacao-sheet-btn-success"
                        onClick={() => {
                          setPainelAcoesAberto(false);
                          setModalFinalizarAberto(true);
                        }}
                        disabled={!podeFinalizar}
                        style={{ opacity: podeFinalizar ? 1 : 0.6 }}
                      >
                        <span className="separacao-sheet-btn-icon">✓</span>
                        <div className="separacao-sheet-btn-info">
                          <strong>Concluir Carga</strong>
                          <small>Finalizar conferência da ordem de carga</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="separacao-sheet-btn separacao-sheet-btn-outline"
                        onClick={() => {
                          setPainelAcoesAberto(false);
                          if (confirm('Deseja retornar à listagem de cargas?')) {
                            setSessaoAtiva(null);
                            carregarCargas();
                          }
                        }}
                      >
                        <span className="separacao-sheet-btn-icon">←</span>
                        <div className="separacao-sheet-btn-info">
                          <strong>Voltar às Cargas</strong>
                          <small>Retornar à lista de ordens pendentes</small>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Alça / Aba retrátil com ícone '^' acima do código de barras */}
                  <div className="separacao-sheet-handle-wrapper">
                    <button
                      type="button"
                      className="separacao-sheet-handle-btn"
                      onClick={() => setPainelAcoesAberto((prev) => !prev)}
                      title={painelAcoesAberto ? 'Fechar ações' : 'Abrir ações da carga'}
                      aria-label="Ações da carga"
                    >
                      <span className="separacao-sheet-handle-icon">
                        {painelAcoesAberto ? '▼' : '▲'}
                      </span>
                      <span className="separacao-sheet-handle-text">
                        {painelAcoesAberto ? 'Fechar Ações' : 'Ações da Carga'}
                      </span>
                    </button>
                  </div>

                  {/* Barra de Bipagem */}
                  <div className="separacao-scanner-card separacao-scanner-docked">
                    <form className="separacao-scanner-form" onSubmit={handleBipar}>
                      <div className="separacao-scanner-input-wrapper">
                        <input
                          ref={inputCodigoRef}
                          type="text"
                          className="separacao-scanner-input"
                          placeholder={
                            podeBipar
                              ? 'Bipar ou digitar Código / Ref...'
                              : 'Sem permissão para bipar'
                          }
                          value={codigoBarras}
                          onChange={(e) => setCodigoBarras(e.target.value)}
                          disabled={bipando || !podeBipar}
                          autoFocus={podeBipar}
                        />
                      </div>

                      <div className="separacao-scanner-qtd-wrapper">
                        <input
                          type="number"
                          min="1"
                          className="separacao-scanner-qtd-input"
                          value={quantidade}
                          onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
                          disabled={bipando || !podeBipar}
                          title="Quantidade a bipar"
                        />
                      </div>

                      <div className="separacao-scanner-lote-wrapper">
                        <input
                          type="text"
                          className="separacao-scanner-lote-input"
                          placeholder="Lote (opcional)"
                          value={lote}
                          onChange={(e) => setLote(e.target.value)}
                          disabled={bipando || !podeBipar}
                        />
                      </div>

                      <button
                        type="submit"
                        className="separacao-btn-bipar"
                        disabled={!codigoBarras.trim() || bipando || !podeBipar}
                        title={!podeBipar ? 'Sem permissão para bipar' : undefined}
                      >
                        {bipando ? 'Gravando...' : 'Conferir Bip'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Seletor de Pedido caso modo 'Por Pedido' esteja ativo */}
                {modoVisao === 'PEDIDO' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 6 }}>
                    {pedidosUnicos.map((nunota) => {
                      const itensDoPed = itens.filter((i) => i.nunota === nunota);
                      const sepDoPed = itensDoPed.filter((i) => i.statusItem === 'SEPARADO').length;
                      const isAtivo = pedidoFiltro === nunota;
                      return (
                        <button
                          key={nunota}
                          type="button"
                          className={`separacao-toggle-btn ${isAtivo ? 'ativo' : ''}`}
                          style={{
                            padding: '8px 14px',
                            background: isAtivo ? '#0f172a' : '#ffffff',
                            color: isAtivo ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                          }}
                          onClick={() => setPedidoFiltro(nunota)}
                        >
                          Pedido #{nunota} ({sepDoPed}/{itensDoPed.length})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ═══ MODO 1: ROTA GUIADA (ITEM DA VEZ) ═══ */}
                {modoVisao === 'ROTA_GUIADA' && (
                  <div className="separacao-rota-container">
                    {!itemAtualRota ? (
                      <div className="separacao-faltas-vazio">
                        <h3>🎉 Todos os produtos foram concluídos ou não há itens nesta carga!</h3>
                        <p style={{ marginTop: 8 }}>
                          Utilize o botão "Concluir Carga" acima para finalizar a separação.
                        </p>
                      </div>
                    ) : (
                      <div
                        className="separacao-rota-card"
                        onTouchStart={handleCardTouchStart}
                        onTouchMove={handleCardTouchMove}
                        onTouchEnd={handleCardTouchEnd}
                        style={{
                          transform: touchDeltaX !== 0 ? `translateX(${touchDeltaX}px)` : undefined,
                          transition: touchDeltaX === 0 ? 'transform 0.18s ease-out' : 'none',
                          touchAction: 'pan-y',
                        }}
                      >
                        {/* Cabeçalho de Navegação de Rota */}
                        <div className="separacao-rota-header">
                          <div className="separacao-rota-passo-badge">
                            <span>🧭</span>
                            <span>
                              Item {itemAtualRotaIndex + 1} de {itensConsolidados.length}
                            </span>
                            <span style={{ opacity: 0.7 }}>• Rota Lógica</span>
                          </div>

                          <span className="separacao-rota-swipe-hint">
                            ↔️ Deslize o card para mudar
                          </span>

                          <div className="separacao-rota-nav-botoes">
                            <button
                              type="button"
                              className="separacao-rota-btn-nav"
                              disabled={itemAtualRotaIndex <= 0}
                              onClick={() => setItemAtualRotaIndex((prev) => Math.max(0, prev - 1))}
                              title="Item Anterior"
                            >
                              ← Anterior
                            </button>
                            <button
                              type="button"
                              className="separacao-rota-btn-nav"
                              disabled={itemAtualRotaIndex >= itensConsolidados.length - 1}
                              onClick={() => tentarAvancarItem()}
                              title="Próximo Item"
                            >
                              Próximo →
                            </button>
                            <button
                              type="button"
                              className="separacao-rota-btn-nav"
                              style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                              onClick={() => {
                                const proxIdx = itensConsolidados.findIndex(
                                  (c, idx) =>
                                    idx > itemAtualRotaIndex &&
                                    c.qtdSeparadaTotal < c.qtdEsperadaTotal &&
                                    c.statusConsolidado !== 'CORTADO_DEFINITIVO'
                                );
                                if (proxIdx !== -1) {
                                  tentarAvancarItem(proxIdx);
                                } else {
                                  const primeiroPendente = itensConsolidados.findIndex(
                                    (c) =>
                                      c.qtdSeparadaTotal < c.qtdEsperadaTotal &&
                                      c.statusConsolidado !== 'CORTADO_DEFINITIVO'
                                  );
                                  if (primeiroPendente !== -1) tentarAvancarItem(primeiroPendente);
                                }
                              }}
                              title="Pular para o próximo pendente da rota"
                            >
                              ⏭️ Pular Pendente
                            </button>
                          </div>
                        </div>

                        {/* Banner de Endereço Físico de Picking */}
                        {(() => {
                          const detalheEnd = itemAtualRota.endereco || itemAtualRota.descrend
                            ? parseEndereco(itemAtualRota.endereco, itemAtualRota.descrend, itemAtualRota.lado)
                            : null;

                          return (
                            <div
                              className={`separacao-rota-endereco-banner ${
                                itemAtualRota.endereco ? '' : 'sem-endereco'
                              }`}
                            >
                              {/* Linha 1: Cabeçalho com Ícone + PICKING: + LADO na esquerda e Botão Alterar à direita */}
                              <div className="separacao-rota-header-linha">
                                <div className="separacao-rota-header-esquerda">
                                  <span className="separacao-rota-endereco-icone">
                                    {itemAtualRota.endereco ? '📍' : '⚠️'}
                                  </span>
                                  <span className="separacao-rota-titulo-picking">PICKING:</span>
                                  {detalheEnd && (
                                    <span
                                      className={`separacao-chip-lado ${
                                        detalheEnd.lado === 'ESQUERDA' ? 'lado-esq' : 'lado-dir'
                                      }`}
                                    >
                                      {detalheEnd.lado === 'ESQUERDA' ? (
                                        <>
                                          <span className="chip-arrow">⬅️</span> ESQUERDA
                                        </>
                                      ) : (
                                        <>
                                          DIREITA <span className="chip-arrow">➡️</span>
                                        </>
                                      )}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  className="separacao-rota-btn-alterar-end"
                                  onClick={() => {
                                    setModalEndereco({ aberto: true, item: itemAtualRota });
                                    setCodigoEnderecoInput(itemAtualRota.endereco || '');
                                    setTimeout(() => inputEndRef.current?.focus(), 150);
                                  }}
                                  title={itemAtualRota.endereco ? 'Alterar endereço de picking' : 'Vincular endereço de picking'}
                                >
                                  📍 {itemAtualRota.endereco ? 'Alterar Endereço' : 'Vincular Endereço'}
                                </button>
                              </div>

                              {/* Linha 2: Os 4 chips de coordenadas em Grid de 4 colunas proporcionais */}
                              {detalheEnd ? (
                                <div className="separacao-rota-coords-grid">
                                  <div className="separacao-coord-card">
                                    <span className="separacao-coord-rotulo">RUA</span>
                                    <span className="separacao-coord-valor">{detalheEnd.rua}</span>
                                  </div>
                                  <div className="separacao-coord-card">
                                    <span className="separacao-coord-rotulo">TORRE</span>
                                    <span className="separacao-coord-valor">{detalheEnd.torre}</span>
                                  </div>
                                  <div className="separacao-coord-card">
                                    <span className="separacao-coord-rotulo">NÍVEL</span>
                                    <span className="separacao-coord-valor">{detalheEnd.nivel}</span>
                                  </div>
                                  <div className="separacao-coord-card destacada">
                                    <span className="separacao-coord-rotulo">POS</span>
                                    <span className="separacao-coord-valor">{detalheEnd.pos}</span>
                                  </div>
                                </div>
                              ) : itemAtualRota.endereco ? (
                                <div className="separacao-coord-fallback-box">
                                  📍 {itemAtualRota.descrend || itemAtualRota.endereco}
                                </div>
                              ) : (
                                <div className="separacao-chip-sem-endereco-box">
                                  ⚠️ Endereço de Picking Não Mapeado no Sankhya
                                </div>
                              )}

                              {/* Linha 3 / Rodapé: Subtítulo e Pulmão */}
                              <div className="separacao-rota-endereco-rodape">
                                <div className="separacao-rota-endereco-sub">
                                  {itemAtualRota.endereco
                                    ? 'Dirija-se a esta posição física para iniciar a separação.'
                                    : 'Este produto ainda não possui endereço físico de picking na tabela TGWEXP do Sankhya.'}
                                </div>

                                {itemAtualRota.enderecoPulmao && (
                                  <div className="separacao-rota-pulmao-linha">
                                    <span className="separacao-rota-pulmao-label">📦 Pulmão:</span>
                                    <EnderecoChips
                                      endereco={itemAtualRota.enderecoPulmao}
                                      descrend={itemAtualRota.descrendPulmao}
                                      lado={itemAtualRota.ladoPulmao}
                                      tipo="PULMAO"
                                      tamanho="compacto"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Corpo do Produto: Foto + Descrição + Barras */}
                        <div className="separacao-rota-corpo">
                          <div className="separacao-rota-foto-wrapper">
                            <ProdutoImagem
                              codProd={itemAtualRota.codprod}
                              alt={itemAtualRota.descrprod || ''}
                              className="separacao-rota-foto"
                              onFotoClick={(url) => setImagemAmpliada(url)}
                            />
                          </div>

                          <div className="separacao-rota-detalhes">
                            <div className="separacao-rota-prod-title">
                              {itemAtualRota.codprod} - {itemAtualRota.descrprod}
                              {itemAtualRota.codvol && (
                                <span className="separacao-rota-vol-badge">
                                  ({itemAtualRota.codvol})
                                </span>
                              )}
                            </div>

                            <div style={{ marginTop: 4 }}>
                              <CampoBarrasExpansivel
                                codbarraStr={itemAtualRota.codbarra}
                                referencia={itemAtualRota.referencia}
                                onSelect={handleSelecionarCodigo}
                              />
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                marginTop: 4,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                className={`separacao-badge-status ${
                                  itemAtualRota.statusConsolidado === 'SEPARADO'
                                    ? 'separado'
                                    : itemAtualRota.statusConsolidado === 'REABASTECIDO'
                                    ? 'reabastecido'
                                    : itemAtualRota.statusConsolidado === 'PARCIAL'
                                    ? 'parcial'
                                    : itemAtualRota.statusConsolidado === 'FALTA'
                                    ? 'removido_erp'
                                    : 'pendente'
                                }`}
                              >
                                {itemAtualRota.statusConsolidado === 'REABASTECIDO'
                                  ? '⚡ Pick Reabastecido'
                                  : itemAtualRota.statusConsolidado}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                Presente em {itemAtualRota.pedidos.length} pedido(s)
                              </span>
                              {itemAtualRota.qtdFaltaTotal && itemAtualRota.qtdFaltaTotal > 0 ? (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: '#e11d48',
                                    fontWeight: 700,
                                    background: '#ffe4e6',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                  }}
                                >
                                  ⚠️ Falta: {itemAtualRota.qtdFaltaTotal} UN
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Placar de Contagem e Ações */}
                        <div className="separacao-rota-placar">
                          <div>
                            <span style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 2 }}>
                              Progresso no Lote / Carga:
                            </span>
                            <div
                              className={`separacao-rota-placar-contagem ${
                                itemAtualRota.qtdSeparadaTotal >= itemAtualRota.qtdEsperadaTotal
                                  ? 'concluido'
                                  : itemAtualRota.qtdSeparadaTotal > 0
                                  ? 'parcial'
                                  : ''
                              }`}
                            >
                              {itemAtualRota.qtdSeparadaTotal} / {itemAtualRota.qtdEsperadaTotal} UN
                              {itemAtualRota.qtdSeparadaTotal >= itemAtualRota.qtdEsperadaTotal && (
                                <span style={{ fontSize: 16, marginLeft: 8, color: '#16a34a' }}>✓ CONCLUÍDO</span>
                              )}
                            </div>
                          </div>

                          <div className="separacao-rota-placar-acoes">
                            {itemAtualRota.qtdSeparadaTotal > 0 && (
                              <button
                                type="button"
                                className="separacao-rota-btn-estornar"
                                onClick={() => handleAbrirModalEstornoProduto(itemAtualRota)}
                                title="Estornar bipagens deste produto"
                              >
                                🗑️ Estornar Bipagem
                              </button>
                            )}

                            {itemAtualRota.qtdSeparadaTotal < itemAtualRota.qtdEsperadaTotal &&
                              itemAtualRota.statusConsolidado !== 'FALTA' &&
                              podeCortar && (
                                <button
                                  type="button"
                                  className="separacao-rota-btn-falta"
                                  onClick={() => {
                                    setModalFalta({ aberto: true, item: itemAtualRota });
                                    setMotivoFaltaSelecionado('Não localizado no endereço de picking');
                                    setMotivoFaltaCustom('');
                                  }}
                                >
                                  ⚠️ Finalizar com Falta
                                </button>
                              )}
                          </div>
                        </div>

                        {/* Barra de progresso individual */}
                        <div className="separacao-progress-bar-bg" style={{ height: 6 }}>
                          <div
                            className="separacao-progress-bar-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (itemAtualRota.qtdSeparadaTotal / itemAtualRota.qtdEsperadaTotal) * 100
                                )
                              )}%`,
                              background:
                                itemAtualRota.qtdSeparadaTotal >= itemAtualRota.qtdEsperadaTotal
                                  ? '#16a34a'
                                  : '#0284c7',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ MODO 2: GRADE CONSOLIDADA ═══ */}
                {modoVisao === 'CONSOLIDADO' && (
                  <>
                    {/* Visualização Desktop: Tabela */}
                    <div className="separacao-desktop-table separacao-grid-card">
                      <table className="separacao-table">
                        <thead>
                          <tr>
                            <th style={{ width: 100 }}>Status</th>
                            <th>Produto, Códigos de Barras & Endereço</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Qtd Carga</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Separado</th>
                            <th style={{ textAlign: 'center', width: 90 }}>Pedidos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensConsolidados.map((cons) => (
                            <tr key={cons.codprod}>
                              <td>
                                <span
                                  className={`separacao-badge-status ${
                                    cons.statusConsolidado === 'SEPARADO'
                                      ? 'separado'
                                      : cons.statusConsolidado === 'REABASTECIDO'
                                      ? 'reabastecido'
                                      : cons.statusConsolidado === 'PARCIAL'
                                      ? 'parcial'
                                      : cons.statusConsolidado === 'FALTA'
                                      ? 'removido_erp'
                                      : cons.statusConsolidado === 'CORTADO_DEFINITIVO'
                                      ? 'removido_erp'
                                      : 'pendente'
                                  }`}
                                >
                                  {cons.statusConsolidado === 'REABASTECIDO'
                                    ? '⚡ Pick Reabastecido'
                                    : cons.statusConsolidado}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <ProdutoImagem
                                    codProd={cons.codprod}
                                    alt={cons.descrprod || ''}
                                    className="separacao-produto-thumb"
                                    onFotoClick={(url) => setImagemAmpliada(url)}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                                      {cons.codprod} - {cons.descrprod}
                                      {cons.codvol && (
                                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                                          ({cons.codvol})
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginTop: 5,
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <CampoBarrasExpansivel
                                        codbarraStr={cons.codbarra}
                                        referencia={cons.referencia}
                                        onSelect={handleSelecionarCodigo}
                                      />
                                      {cons.endereco ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                          <EnderecoChips
                                            endereco={cons.endereco}
                                            descrend={cons.descrend}
                                            lado={cons.lado}
                                            tamanho="compacto"
                                          />
                                          {cons.enderecoPulmao && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#047857' }}>📦 Pulmão:</span>
                                              <EnderecoChips
                                                endereco={cons.enderecoPulmao}
                                                descrend={cons.descrendPulmao}
                                                lado={cons.ladoPulmao}
                                                tipo="PULMAO"
                                                tamanho="compacto"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className="separacao-btn"
                                          style={{
                                            padding: '2px 8px',
                                            fontSize: 11,
                                            background: '#fff7ed',
                                            color: '#c2410c',
                                            border: '1px solid #fdba74',
                                            borderRadius: 6,
                                          }}
                                          onClick={() => {
                                            setModalEndereco({ aberto: true, item: cons });
                                            setCodigoEnderecoInput('');
                                            setTimeout(() => inputEndRef.current?.focus(), 150);
                                          }}
                                        >
                                          📍 + Vincular
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                {cons.qtdEsperadaTotal}
                              </td>
                              <td
                                style={{
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  color:
                                    cons.qtdSeparadaTotal >= cons.qtdEsperadaTotal ? '#16a34a' : '#d97706',
                                }}
                              >
                                {cons.qtdSeparadaTotal}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: '#475569',
                                    background: '#f1f5f9',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  {cons.pedidos.length} pedido(s)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Visualização Android: Cards Compactos */}
                    <div className="separacao-mobile-cards">
                      {itensConsolidados.map((cons) => (
                        <div key={cons.codprod} className="separacao-item-mobile-card">
                          <div className="separacao-item-mobile-card-header">
                            <span
                              className={`separacao-badge-status ${
                                cons.statusConsolidado === 'SEPARADO'
                                  ? 'separado'
                                  : cons.statusConsolidado === 'REABASTECIDO'
                                  ? 'reabastecido'
                                  : cons.statusConsolidado === 'PARCIAL'
                                  ? 'parcial'
                                  : cons.statusConsolidado === 'FALTA'
                                  ? 'removido_erp'
                                  : 'pendente'
                              }`}
                            >
                              {cons.statusConsolidado === 'REABASTECIDO'
                                ? '⚡ Pick Reabastecido'
                                : cons.statusConsolidado}
                            </span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                              {cons.pedidos.length} pedido(s)
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                            <ProdutoImagem
                              codProd={cons.codprod}
                              alt={cons.descrprod || ''}
                              className="separacao-produto-thumb"
                              style={{ width: 52, height: 52 }}
                              onFotoClick={(url) => setImagemAmpliada(url)}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="separacao-item-mobile-prod-title">
                                {cons.codprod} - {cons.descrprod}
                                {cons.codvol && (
                                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                                    ({cons.codvol})
                                  </span>
                                )}
                              </div>
                              {cons.endereco && (
                                <div style={{ marginTop: 4 }}>
                                  <EnderecoChips
                                    endereco={cons.endereco}
                                    descrend={cons.descrend}
                                    lado={cons.lado}
                                    tamanho="compacto"
                                  />
                                </div>
                              )}
                              <div style={{ marginTop: 4 }}>
                                <CampoBarrasExpansivel
                                  codbarraStr={cons.codbarra}
                                  referencia={cons.referencia}
                                  onSelect={handleSelecionarCodigo}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="separacao-item-mobile-row">
                            <span style={{ fontSize: 13, color: '#64748b' }}>Progresso no lote:</span>
                            <span
                              className="separacao-item-mobile-contagem"
                              style={{
                                color:
                                  cons.qtdSeparadaTotal >= cons.qtdEsperadaTotal ? '#16a34a' : '#d97706',
                              }}
                            >
                              {cons.qtdSeparadaTotal} / {cons.qtdEsperadaTotal} UN
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ═══ MODO 3: GRADE POR PEDIDO ═══ */}
                {modoVisao === 'PEDIDO' && (
                  <>
                    {/* Visualização Desktop: Tabela */}
                    <div className="separacao-desktop-table separacao-grid-card">
                      <table className="separacao-table">
                        <thead>
                          <tr>
                            <th style={{ width: 100 }}>Status</th>
                            <th style={{ width: 60 }}>Seq.</th>
                            <th>Produto, Códigos de Barras & Endereço</th>
                            <th style={{ width: 130 }}>Lote Reservado</th>
                            <th style={{ textAlign: 'center', width: 85 }}>Esperado</th>
                            <th style={{ textAlign: 'center', width: 85 }}>Separado</th>
                            <th>Observação / ERP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itens
                            .filter((i) => !pedidoFiltro || i.nunota === pedidoFiltro)
                            .map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <span
                                    className={`separacao-badge-status ${
                                      item.statusItem === 'SEPARADO'
                                        ? 'separado'
                                        : item.statusItem === 'PARCIAL'
                                        ? 'parcial'
                                        : item.statusItem === 'FALTA'
                                        ? 'removido_erp'
                                        : item.statusItem === 'REMOVIDO_ERP'
                                        ? 'removido_erp'
                                        : item.statusItem === 'NOVO_ERP'
                                        ? 'novo_erp'
                                        : 'pendente'
                                    }`}
                                  >
                                    {item.statusItem}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600, color: '#64748b' }}>#{item.sequencia}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <ProdutoImagem
                                      codProd={item.codprod}
                                      alt={item.descrprod || ''}
                                      className="separacao-produto-thumb"
                                      onFotoClick={(url) => setImagemAmpliada(url)}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                                        {item.codprod} - {item.descrprod}
                                      </div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          marginTop: 5,
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        <CampoBarrasExpansivel
                                          codbarraStr={item.codbarra}
                                          referencia={item.referencia}
                                          onSelect={handleSelecionarCodigo}
                                        />
                                        {item.endereco ? (
                                          <EnderecoChips
                                            endereco={item.endereco}
                                            descrend={item.descrend}
                                            lado={item.lado}
                                            tamanho="compacto"
                                          />
                                        ) : (
                                          <span style={{ fontSize: 11, color: '#94a3b8' }}>📍 Sem endereço</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {item.controle ? (
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: 12,
                                      }}
                                    >
                                      {item.controle}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: 12 }}>Livre</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                  {item.qtdEsperada}
                                </td>
                                <td
                                  style={{
                                    textAlign: 'center',
                                    fontWeight: 800,
                                    color: item.qtdSeparada >= item.qtdEsperada ? '#16a34a' : '#d97706',
                                  }}
                                >
                                  {item.qtdSeparada}
                                </td>
                                <td>
                                  {item.observacaoAlteracao ? (
                                    <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                                      ⚠️ {item.observacaoAlteracao}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Visualização Android: Cards Compactos */}
                    <div className="separacao-mobile-cards">
                      {itens
                        .filter((i) => !pedidoFiltro || i.nunota === pedidoFiltro)
                        .map((item) => (
                          <div key={item.id} className="separacao-item-mobile-card">
                            <div className="separacao-item-mobile-card-header">
                              <span
                                className={`separacao-badge-status ${
                                  item.statusItem === 'SEPARADO'
                                    ? 'separado'
                                    : item.statusItem === 'PARCIAL'
                                    ? 'parcial'
                                    : item.statusItem === 'FALTA'
                                    ? 'removido_erp'
                                    : item.statusItem === 'REMOVIDO_ERP'
                                    ? 'removido_erp'
                                    : item.statusItem === 'NOVO_ERP'
                                    ? 'novo_erp'
                                    : 'pendente'
                                }`}
                              >
                                {item.statusItem}
                              </span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                Seq #{item.sequencia}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                              <ProdutoImagem
                                codProd={item.codprod}
                                alt={item.descrprod || ''}
                                className="separacao-produto-thumb"
                                style={{ width: 52, height: 52 }}
                                onFotoClick={(url) => setImagemAmpliada(url)}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="separacao-item-mobile-prod-title">
                                  {item.codprod} - {item.descrprod}
                                  {item.controle ? (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        marginLeft: 6,
                                      }}
                                    >
                                      Lote: {item.controle}
                                    </span>
                                  ) : null}
                                </div>
                                {item.endereco && (
                                  <div style={{ marginTop: 4 }}>
                                    <EnderecoChips
                                      endereco={item.endereco}
                                      descrend={item.descrend}
                                      lado={item.lado}
                                      tamanho="compacto"
                                    />
                                  </div>
                                )}
                                <div style={{ marginTop: 4 }}>
                                  <CampoBarrasExpansivel
                                    codbarraStr={item.codbarra}
                                    referencia={item.referencia}
                                    onSelect={handleSelecionarCodigo}
                                  />
                                </div>
                              </div>
                            </div>

                            {item.observacaoAlteracao && (
                              <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, marginTop: 4 }}>
                                ⚠️ {item.observacaoAlteracao}
                              </div>
                            )}

                            <div className="separacao-item-mobile-row">
                              <span style={{ fontSize: 13, color: '#64748b' }}>Separado:</span>
                              <span
                                className="separacao-item-mobile-contagem"
                                style={{
                                  color: item.qtdSeparada >= item.qtdEsperada ? '#16a34a' : '#d97706',
                                }}
                              >
                                {item.qtdSeparada} / {item.qtdEsperada} UN
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                {/* ═══ MODO 4: ABA FALTAS & AVARIAS ═══ */}
                {modoVisao === 'FALTAS' && (
                  <div>
                    {itensComFalta.length === 0 ? (
                      <div className="separacao-faltas-vazio">
                        <h3>✓ Nenhuma falta ou avaria registrada nesta carga!</h3>
                        <p style={{ marginTop: 8 }}>
                          Caso não encontre a quantidade total no picking físico durante a separação, utilize o
                          botão "Finalizar com Falta" no produto.
                        </p>
                      </div>
                    ) : (
                      <div className="separacao-faltas-grid">
                        <div
                          style={{
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 8,
                          }}
                        >
                          <p style={{ color: '#9f1239', fontWeight: 700, margin: '0 0 4px 0', fontSize: 14 }}>
                            ⚠️ Gestão de Faltas & Avarias da Carga #{sessaoAtiva.ordemCarga}
                          </p>
                          <p style={{ color: '#be123c', fontSize: 12, margin: 0 }}>
                            Verifique as posições de Pulmão (Reserva) abaixo para re-separar as unidades
                            faltantes, ou confirme o corte definitivo para liberar a carga.
                          </p>
                        </div>

                        {itensComFalta.map((cons) => {
                          const saldoFalta =
                            cons.qtdFaltaTotal ||
                            Math.max(0, cons.qtdEsperadaTotal - cons.qtdSeparadaTotal);
                          const isCortado = cons.statusConsolidado === 'CORTADO_DEFINITIVO';
                          const motivo =
                            cons.pedidos.find((p) => p.motivoFalta)?.motivoFalta ||
                            'Falta física informada no picking';

                          return (
                            <div
                              key={cons.codprod}
                              className={`separacao-falta-card ${isCortado ? 'cortado' : ''}`}
                            >
                              <div className="separacao-falta-header">
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                  <ProdutoImagem
                                    codProd={cons.codprod}
                                    alt={cons.descrprod || ''}
                                    className="separacao-produto-thumb"
                                    style={{ width: 56, height: 56 }}
                                    onFotoClick={(url) => setImagemAmpliada(url)}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                                      {cons.codprod} - {cons.descrprod}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                                      Esperado: <strong>{cons.qtdEsperadaTotal} UN</strong> | Bipado:{' '}
                                      <strong>{cons.qtdSeparadaTotal} UN</strong> | Falta:{' '}
                                      <strong style={{ color: '#e11d48' }}>{saldoFalta} UN</strong>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#be123c', marginTop: 4 }}>
                                      Motivo registrado: <em>"{motivo}"</em>
                                    </div>
                                  </div>
                                </div>

                                <div className="separacao-falta-acoes">
                                  {!isCortado && (
                                    <>
                                      <button
                                        type="button"
                                        className="separacao-btn-reseparar"
                                        onClick={() => {
                                          setModalReseparar({ aberto: true, item: cons });
                                          setQtdResepararInput(saldoFalta);
                                          setLoteResepararInput('');
                                        }}
                                      >
                                        🔄 Re-separar do Pulmão
                                      </button>
                                      {podeCortar && (
                                        <button
                                          type="button"
                                          className="separacao-btn-cortar"
                                          onClick={() => handleConfirmarCorte(cons)}
                                        >
                                          ✂️ Confirmar Corte
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {isCortado && (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#64748b',
                                        background: '#f1f5f9',
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                      }}
                                    >
                                      ✓ Corte Definitivo Autorizado
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Banner de Pulmão */}
                              <div
                                className={`separacao-falta-banner-pulmao ${
                                  cons.enderecoPulmao ? '' : 'sem-pulmao'
                                }`}
                              >
                                <span>📦</span>
                                <div>
                                  {cons.enderecoPulmao ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <span>Endereço de Pulmão (Reserva):</span>
                                      <EnderecoChips
                                        endereco={cons.enderecoPulmao}
                                        descrend={cons.descrendPulmao}
                                        lado={cons.ladoPulmao}
                                        tipo="PULMAO"
                                        tamanho="normal"
                                      />
                                      <span>. Buscar reposição nesta posição.</span>
                                    </div>
                                  ) : (
                                    <span>Sem endereço de Pulmão mapeado no Sankhya para este produto.</span>
                                  )}
                                </div>
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

            {/* ═══ MODAL DE FINALIZAÇÃO ═══ */}
            {modalFinalizarAberto && sessaoAtiva && (
              <div className="separacao-modal-backdrop">
                <div className="separacao-modal-box">
                  <h2 className="separacao-modal-title">Finalizar Separação da Carga #{sessaoAtiva.ordemCarga}</h2>

                  <p style={{ fontSize: 14, color: '#475569', marginBottom: 14 }}>
                    Total de itens separados: <strong>{progresso.totalSeparado}</strong> de <strong>{progresso.totalEsperado} UN</strong> ({progresso.percentual}%).
                  </p>

                  {progresso.itensPendentes > 0 ? (
                    <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                      <p style={{ color: '#92400e', fontWeight: 700, fontSize: 14, margin: '0 0 6px 0' }}>
                        ⚠️ Atenção: Existem {progresso.itensPendentes} produto(s) pendente(s) nesta carga!
                      </p>
                      <p style={{ color: '#b45309', fontSize: 13, margin: 0 }}>
                        As justificativas de falta ou cortes já foram registradas nos itens correspondentes. Deseja confirmar a finalização da carga?
                      </p>
                    </div>
                  ) : (
                    <div style={{ background: '#dcfce7', border: '1px solid #22c55e', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                      <p style={{ color: '#15803d', fontWeight: 700, fontSize: 14, margin: 0 }}>
                        ✓ Todos os produtos foram 100% conferidos e separados!
                      </p>
                    </div>
                  )}

                  <div className="separacao-modal-footer">
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => setModalFinalizarAberto(false)}
                    >
                      Cancelar
                    </button>
                    {progresso.itensPendentes > 0 && (
                      <button
                        type="button"
                        className="separacao-btn"
                        style={{ background: '#f59e0b', color: '#ffffff', fontWeight: 700 }}
                        onClick={async () => {
                          await handleSolicitarReabastecimento();
                          setModalFinalizarAberto(false);
                        }}
                        disabled={solicitandoReabastecimento}
                      >
                        {solicitandoReabastecimento ? '🚜 Solicitando...' : '🚜 Solicitar Reabastecimento e Aguardar'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-success"
                      onClick={() => handleFinalizar(progresso.itensPendentes > 0)}
                      disabled={carregando || solicitandoReabastecimento}
                    >
                      Confirmar Finalização
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ MODAL DE HISTÓRICO DE BIPAGENS ═══ */}
            {modalBipagensAberto && (
              <div className="separacao-modal-backdrop">
                <div className="separacao-modal-box" style={{ maxWidth: 650 }}>
                  <h2 className="separacao-modal-title">Histórico de Bipagens da Carga</h2>

                  {bipagens.length === 0 ? (
                    <p style={{ color: '#64748b' }}>Nenhuma bipagem registrada até o momento.</p>
                  ) : (
                    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                      <table className="separacao-table">
                        <thead>
                          <tr>
                            <th>Hora</th>
                            <th>Produto</th>
                            <th>Qtd</th>
                            <th>Barras</th>
                            <th>Operador</th>
                            <th>Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bipagens.map((b) => (
                            <tr key={b.id}>
                              <td style={{ fontSize: 12 }}>{new Date(b.timestamp).toLocaleTimeString()}</td>
                              <td style={{ fontWeight: 600 }}>{b.codprod}</td>
                              <td style={{ fontWeight: 700, color: '#16a34a' }}>+{b.quantidade}</td>
                              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{b.codbarra}</td>
                              <td style={{ fontSize: 12 }}>{b.usuario}</td>
                              <td>
                                <button
                                  type="button"
                                  className="separacao-btn"
                                  style={{ padding: '4px 8px', fontSize: 11, background: '#fee2e2', color: '#dc2626' }}
                                  onClick={() => handleEstornarBipagem(b.id)}
                                >
                                  Estornar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="separacao-modal-footer">
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => setModalBipagensAberto(false)}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ MODAL DE ESTORNO DE BIPAGENS DO PRODUTO ═══ */}
            {modalEstornoProduto.aberto && modalEstornoProduto.item && (
              <div className="separacao-modal-backdrop">
                <div className="separacao-modal-box" style={{ maxWidth: 620 }}>
                  <h2 className="separacao-modal-title" style={{ color: '#dc2626' }}>
                    🗑️ Estornar Bipagem do Produto
                  </h2>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      {modalEstornoProduto.item.codprod} - {modalEstornoProduto.item.descrprod}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                      Separado atualmente: <strong style={{ color: '#0f172a' }}>{modalEstornoProduto.item.qtdSeparadaTotal}</strong> de <strong>{modalEstornoProduto.item.qtdEsperadaTotal} UN</strong>
                    </div>
                  </div>

                  {modalEstornoProduto.carregando ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Carregando bipagens...</p>
                  ) : modalEstornoProduto.bipes.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
                      <p>Nenhuma bipagem ativa encontrada para este produto.</p>
                    </div>
                  ) : (
                    <>
                      {/* Atalho para Desfazer Último Bipe */}
                      {modalEstornoProduto.bipes.length > 0 && (
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="separacao-btn"
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              fontWeight: 600,
                              fontSize: 12,
                              padding: '6px 12px',
                            }}
                            onClick={() => handleEstornarBipagemItem(modalEstornoProduto.bipes[0].id)}
                          >
                            ↺ Desfazer Último Bipe (+{modalEstornoProduto.bipes[0].quantidade} UN)
                          </button>
                        </div>
                      )}

                      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                        <table className="separacao-table">
                          <thead>
                            <tr>
                              <th>Horário</th>
                              <th>Qtd</th>
                              <th>Código Lido</th>
                              <th>Pedido</th>
                              <th style={{ textAlign: 'center' }}>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modalEstornoProduto.bipes.map((b) => (
                              <tr key={b.id}>
                                <td style={{ fontSize: 12 }}>
                                  {new Date(b.timestamp).toLocaleTimeString()}
                                </td>
                                <td style={{ fontWeight: 700, color: '#16a34a' }}>
                                  +{b.quantidade} UN
                                </td>
                                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                  {b.codbarra}
                                </td>
                                <td style={{ fontSize: 12 }}>
                                  {b.nunota || '—'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="separacao-btn"
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: 12,
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: '1px solid #fca5a5',
                                    }}
                                    onClick={() => handleEstornarBipagemItem(b.id)}
                                  >
                                    🗑️ Excluir
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="separacao-modal-footer">
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => setModalEstornoProduto({ aberto: false, bipes: [], carregando: false })}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Foto Ampliada do Produto */}
            {imagemAmpliada && (
              <div
                className="separacao-img-modal-overlay"
                onClick={() => setImagemAmpliada(null)}
                title="Clique para fechar"
              >
                <img
                  src={imagemAmpliada}
                  alt="Foto do Produto"
                  className="separacao-img-modal"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* ═══ MODAL DE VINCULAR / ALTERAR ENDEREÇO ═══ */}
            {modalEndereco.aberto && modalEndereco.item && (
              <div className="separacao-modal-backdrop">
                <div className="separacao-modal-box">
                  <h2 className="separacao-modal-title">📍 Vincular Endereço de Picking</h2>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                    Produto: <strong>{modalEndereco.item.codprod} - {modalEndereco.item.descrprod}</strong>
                  </p>
                  <form onSubmit={handleSalvarEndereco}>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Escanear ou digitar código do endereço físico (Ex: 01.01.01.01.01 ou código reduzido):
                      </label>
                      <input
                        ref={inputEndRef}
                        type="text"
                        className="separacao-scanner-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        placeholder="Ex: 01.01.01.01.01 ou 5"
                        value={codigoEnderecoInput}
                        onChange={(e) => setCodigoEnderecoInput(e.target.value)}
                        disabled={salvandoEndereco}
                        autoFocus
                      />
                    </div>

                    <div className="separacao-modal-footer">
                      <button
                        type="button"
                        className="separacao-btn separacao-btn-secondary"
                        onClick={() => setModalEndereco({ aberto: false })}
                        disabled={salvandoEndereco}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="separacao-btn separacao-btn-primary"
                        disabled={!codigoEnderecoInput.trim() || salvandoEndereco}
                      >
                        {salvandoEndereco ? 'Salvando...' : 'Confirmar Endereço'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ═══ MODAL DE REGISTRAR FALTA ═══ */}
            {modalFalta.aberto && modalFalta.item && (
              <div className="separacao-modal-backdrop">
                <div className="separacao-modal-box">
                  <h2 className="separacao-modal-title" style={{ color: '#e11d48' }}>⚠️ Finalizar Produto com Falta</h2>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
                    Produto: <strong>{modalFalta.item.codprod} - {modalFalta.item.descrprod}</strong>
                  </p>
                  <div
                    style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 14,
                      fontSize: 13,
                      color: '#9f1239',
                    }}
                  >
                    Falta calculada:{' '}
                    <strong>{modalFalta.item.qtdEsperadaTotal - modalFalta.item.qtdSeparadaTotal} UN</strong>{' '}
                    (Separado: {modalFalta.item.qtdSeparadaTotal} de {modalFalta.item.qtdEsperadaTotal} UN)
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Selecione o motivo da falta:
                    </label>
                    <select
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                      value={motivoFaltaSelecionado}
                      onChange={(e) => setMotivoFaltaSelecionado(e.target.value)}
                    >
                      <option value="Não localizado no endereço de picking">Não localizado no endereço de picking</option>
                      <option value="Quantidade física insuficiente na gôndola">Quantidade física insuficiente na gôndola</option>
                      <option value="Produto avariado / danificado">Produto avariado / danificado</option>
                      <option value="Lote com validade vencida">Lote com validade vencida</option>
                      <option value="Outro">Outro motivo (especificar abaixo)...</option>
                    </select>
                  </div>

                  {motivoFaltaSelecionado === 'Outro' && (
                    <div style={{ marginBottom: 14 }}>
                      <textarea
                        rows={2}
                        style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        placeholder="Descreva o motivo..."
                        value={motivoFaltaCustom}
                        onChange={(e) => setMotivoFaltaCustom(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="separacao-modal-footer">
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => {
                        setModalFalta({ aberto: false });
                        setProximoIndiceAposFalta(null);
                      }}
                      disabled={salvandoFalta}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="separacao-btn"
                      style={{ background: '#e11d48', color: '#ffffff' }}
                      onClick={handleConfirmarFalta}
                      disabled={salvandoFalta}
                    >
                      {salvandoFalta ? 'Registrando...' : 'Confirmar Falta ➔'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ MODAL DE RE-SEPARAR DO PULMÃO ═══ */}
            {modalReseparar.aberto && modalReseparar.item && (
              <div className="separacao-modal-backdrop">
                <div className="separacao-modal-box">
                  <h2 className="separacao-modal-title" style={{ color: '#16a34a' }}>🔄 Re-separar do Pulmão (Reserva)</h2>
                  <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
                    Produto: <strong>{modalReseparar.item.codprod} - {modalReseparar.item.descrprod}</strong>
                  </p>

                  {modalReseparar.item.enderecoPulmao && (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 14,
                        fontSize: 13,
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>📍 Posição Pulmão (Reserva):</span>
                      <EnderecoChips
                        endereco={modalReseparar.item.enderecoPulmao}
                        descrend={modalReseparar.item.descrendPulmao}
                        lado={modalReseparar.item.ladoPulmao}
                        tipo="PULMAO"
                        tamanho="normal"
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Quantidade Re-separada (UN):
                    </label>
                    <input
                      type="number"
                      min="1"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                      value={qtdResepararInput}
                      onChange={(e) => setQtdResepararInput(Math.max(1, Number(e.target.value)))}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Lote (opcional):
                    </label>
                    <input
                      type="text"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                      placeholder="Lote do pulmão (se aplicável)"
                      value={loteResepararInput}
                      onChange={(e) => setLoteResepararInput(e.target.value)}
                    />
                  </div>

                  <div className="separacao-modal-footer">
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-secondary"
                      onClick={() => setModalReseparar({ aberto: false })}
                      disabled={salvandoReseparar}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="separacao-btn separacao-btn-success"
                      onClick={handleConfirmarReseparacao}
                      disabled={salvandoReseparar}
                    >
                      {salvandoReseparar ? 'Gravando...' : 'Confirmar Re-separação'}
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
