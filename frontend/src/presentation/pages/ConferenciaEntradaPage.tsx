import { useState, useEffect, useMemo, useRef, useCallback, FormEvent, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import {
  SessaoConferenciaEntrada,
  ItemNotaEntrada,
  BipagemEntrada,
  FinalizarNivelResponse,
} from '../../domain/models/ConferenciaEntrada';
import { Botao, Campo, Container, Label, Painel, ModalCameraScanner, ModalFolhaBipagem } from '../components';
import { Loading } from '../components/Loading/Loading';
import { prepararAudio, tocarAlertaErro, tocarAlertaSucesso } from '../../infrastructure/audio/alertas';
import { extractFieldValue, normalizeDate } from '../../infrastructure/utils/ocrParser';
import { aplicarMascaraData, completarAnoData, validarData, checarStatusValidade } from '../utils/dateMaskHelper';
import { ModalRegistrarOcorrencia } from '../components/Recebimento/ModalRegistrarOcorrencia';
import { ModalListaOcorrenciasSessao, getStatusOcorrenciaInfo } from '../components/Recebimento/ModalListaOcorrenciasSessao';
import { TipoOcorrenciaRecebimento, OcorrenciaRecebimento, obterTermosOcorrencia } from '../../domain/models/OcorrenciaRecebimento';
import { ConfiguracaoSistemaApiService } from '../../infrastructure/api/ConfiguracaoSistemaApiService';
import { podeVerCamposSensiveis } from '../../domain/permissions';
import './ConferenciaEntradaPage.css';

const recebimentoService = new RecebimentoApiService();
const configSistemaService = new ConfiguracaoSistemaApiService();

function formatarDataHora(val?: string | null): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  } catch {
    // fallback
  }
  return val;
}

function formatarDataApenas(val?: string | null): string {
  if (!val) return '—';
  try {
    if (val.includes('-')) {
      const partes = val.split('T')[0].split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
    }
  } catch {
    // fallback
  }
  return val;
}

interface ItemEntradaConferidoVisivel {
  item: ItemNotaEntrada;
  conferido: number;
  esperado: number | null;
  completo: boolean;
  lote?: string;
  validade?: string;
  fabricacao?: string;
  lotesDetalhes: Array<{
    lote: string;
    validade?: string;
    fabricacao?: string;
    quantidade: number;
    ultimoHorario?: string;
    bipagemRecente?: BipagemEntrada;
    bipagemIds: string[];
  }>;
  ultimoHorario?: string;
  ultimoBip?: BipagemEntrada;
}

export function ConferenciaEntradaPage() {
  const { temPermissao, user } = useAuth();
  const verCamposSensiveis = podeVerCamposSensiveis(user?.nomeUsu);
  const ehAdmin =
    ['SUP', 'ANTONY', 'ANTONY.B'].includes((user?.nomeUsu || '').toUpperCase()) ||
    temPermissao('gerenciar_acessos');
  const location = useLocation();
  const navigate = useNavigate();

  const navState = location.state as { nunotas?: number[]; conferenciaId?: string; nivel?: number } | null;
  const nunotas = useMemo(() => navState?.nunotas || [], [navState]);
  const nivelInicial = navState?.nivel;

  const [sessao, setSessao] = useState<SessaoConferenciaEntrada | null>(null);
  const [itens, setItens] = useState<ItemNotaEntrada[]>([]);
  const [bipagens, setBipagens] = useState<BipagemEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFolhaBipagemModal, setShowFolhaBipagemModal] = useState(false);

  // Filtro de nota individual na conferência (para conferências com múltiplas notas agrupadas)
  const [notaFiltro, setNotaFiltro] = useState<number | 'todas'>(() => {
    if (navState?.nunotas && navState.nunotas.length === 1) {
      return navState.nunotas[0];
    }
    return 'todas';
  });

  // Se o usuário navegou especificando 1 única nota, assegura que o filtro acompanhe
  useEffect(() => {
    if (navState?.nunotas && navState.nunotas.length === 1) {
      setNotaFiltro(navState.nunotas[0]);
    }
  }, [navState]);

  // Itens da nota atualmente em foco (ou todos caso o usuário selecione "todas")
  const itensExibidos = useMemo(() => {
    if (notaFiltro === 'todas') return itens;
    return itens.filter((it) => it.nunota === notaFiltro);
  }, [itens, notaFiltro]);

  const itensFolhaNormalizados = useMemo(() => {
    return itensExibidos.map((it) => {
      let lotes: Array<{
        lote: string;
        validade?: string | null;
        fabricacao?: string | null;
        origem: 'ERP' | 'BIP';
        quantidade?: number;
      }> = [];

      if (it.lotesConferidos && it.lotesConferidos.length > 0) {
        lotes = it.lotesConferidos.map((l) => ({
          lote: l.lote,
          validade: l.validade || null,
          fabricacao: l.fabricacao || null,
          origem: 'BIP' as const,
          quantidade: l.quantidade,
        }));
      } else if (it.lote && it.lote.trim() !== '') {
        lotes = [
          {
            lote: it.lote,
            validade: it.validade || null,
            fabricacao: it.fabricacao || null,
            origem: 'ERP' as const,
          },
        ];
      }

      const codBarraPrincipal =
        it.codbarra && it.codbarra.trim() !== ''
          ? it.codbarra.trim()
          : it.codigosAlternativos && it.codigosAlternativos.length > 0
          ? it.codigosAlternativos[0].codbarra
          : null;

      return {
        sequencia: it.sequencia,
        codProd: it.codprod,
        descrProd: it.descrprod,
        referencia: it.referencia,
        numnota: it.numnota,
        nunota: it.nunota,
        nomeparc: it.nomeparc,
        codBarra: codBarraPrincipal,
        qtd: it.qtdneg,
        lotes,
      };
    });
  }, [itensExibidos]);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Scanner & Inputs
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');
  const [fabricacao, setFabricacao] = useState('');
  const [erroValidade, setErroValidade] = useState<string | null>(null);
  const [erroFabricacao, setErroFabricacao] = useState<string | null>(null);
  const [mostrarCamera, setMostrarCamera] = useState(false);
  const [scannerRecolhido, setScannerRecolhido] = useState(false);
  const [tecladoVirtualAtivo, setTecladoVirtualAtivo] = useState(false);
  const [isDispositivoMovel, setIsDispositivoMovel] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDispositivoMovel(window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const alternarTecladoVirtual = () => {
    setTecladoVirtualAtivo((prev) => {
      const novo = !prev;
      setTimeout(() => {
        if (inputCodigoRef.current) {
          inputCodigoRef.current.focus();
        }
      }, 50);
      return novo;
    });
  };

  // Navegação de Abas
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'conferidos'>('pendentes');
  const [lotesExpandidos, setLotesExpandidos] = useState<Record<string, boolean>>({});
  const [loteParaEstornar, setLoteParaEstornar] = useState<{
    descrprod: string;
    lote: string;
    bipagemIds: string[];
    quantidade: number;
  } | null>(null);

  // Modais
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [textoOcrBruto, setTextoOcrBruto] = useState('');
  const [campoOcrAlvo, setCampoOcrAlvo] = useState<'lote' | 'fabricacao' | 'validade'>('lote');
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
  const [cienteItensFaltantes, setCienteItensFaltantes] = useState(false);
  const [resultadoFinalizacao, setResultadoFinalizacao] = useState<FinalizarNivelResponse | null>(null);
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const [bipagemParaEstornar, setBipagemParaEstornar] = useState<BipagemEntrada | null>(null);
  const [estornando, setEstornando] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);

  // Ocorrências e Avarias
  const [modalOcorrenciaAberto, setModalOcorrenciaAberto] = useState(false);
  const [modalListaOcorrenciasAberto, setModalListaOcorrenciasAberto] = useState(false);
  const [itemParaOcorrencia, setItemParaOcorrencia] = useState<any>(null);
  const [tipoOcorrenciaModal, setTipoOcorrenciaModal] = useState<TipoOcorrenciaRecebimento>('AVARIA');
  const [modoAvariaAtivo, setModoAvariaAtivo] = useState(false);
  const [ocorrenciasSessao, setOcorrenciasSessao] = useState<OcorrenciaRecebimento[]>([]);
  const [codigoNaoEncontradoOcorr, setCodigoNaoEncontradoOcorr] = useState<string | null>(null);
  const [diasShelfLife, setDiasShelfLife] = useState<number>(90);

  // Feedback Visual Pop-up
  const [feedbackVisual, setFeedbackVisual] = useState<{ codProd: number; descrProd: string } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputCodigoRef = useRef<HTMLInputElement>(null);

  const podeAcessar = temPermissao('conferencia_entrada');

  const podeAcessarNivel = useMemo(() => {
    if (!sessao) return true;
    const n = sessao.nivelAtual;
    if (n === 1) return temPermissao('conferencia_entrada_n1');
    if (n === 2) return temPermissao('conferencia_entrada_n2');
    if (n === 3) return temPermissao('conferencia_entrada_n3');
    return true;
  }, [sessao, temPermissao]);

  const podeAcessarStatus = useMemo(() => {
    if (!sessao) return true;
    if (
      (sessao.status === 'Divergente' || sessao.status === 'Em Reconferência') &&
      !temPermissao('conferencia_entrada_divergente')
    ) {
      // Se a conferência estiver no Nível 3 (recontagem N3) e o conferente tiver permissão N3, libera o acesso para reconferência!
      if (sessao.nivelAtual === 3 && temPermissao('conferencia_entrada_n3')) {
        return true;
      }
      return false;
    }
    if (
      (sessao.status === 'Conferido' || sessao.status === 'Enviado ao Sankhya') &&
      !temPermissao('conferencia_entrada_conferido')
    ) {
      return false;
    }
    return true;
  }, [sessao, temPermissao]);

  const carregarOcorrencias = useCallback(async (confId: string) => {
    try {
      const res = await recebimentoService.listarOcorrencias({ conferenciaId: confId });
      setOcorrenciasSessao(res);
    } catch (e) {
      console.warn('Erro ao carregar ocorrências:', e);
    }
  }, []);

  // Inicializar sessão
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

        const notasFaltando = (navState.nunotas || []).filter((n) => !sessaoAtual.nunotas.includes(n));

        // Se a sessão estiver como "Em Aberto", "Aguardando N2", "Aguardando N3", "Divergente" no Nível 3, ou faltam notas passadas pela seleção:
        if (
          sessaoAtual.status === 'Em Aberto' ||
          sessaoAtual.status === 'Aguardando N2' ||
          sessaoAtual.status === 'Aguardando N3' ||
          sessaoAtual.status === 'Aguardando Recontagem N1' ||
          sessaoAtual.status === 'Aguardando Recontagem N2' ||
          sessaoAtual.status === 'Aguardando Recontagem N3' ||
          (sessaoAtual.status === 'Divergente' && sessaoAtual.nivelAtual === 3) ||
          notasFaltando.length > 0
        ) {
          const nunotasParaIniciar = Array.from(new Set([...sessaoAtual.nunotas, ...(navState.nunotas || [])]));
          sessaoAtual = await recebimentoService.iniciarConferencia(nunotasParaIniciar, sessaoAtual.nivelAtual);
          const respAtualizada = await recebimentoService.obterItensConferencia(sessaoAtual.id);
          setSessao(sessaoAtual);
          setItens(respAtualizada.itens);
          setBipagens(respAtualizada.bipagens);
          await carregarOcorrencias(sessaoAtual.id);
          return;
        }

        setSessao(sessaoAtual);
        setItens(resp.itens);
        setBipagens(resp.bipagens);
        await carregarOcorrencias(sessaoAtual.id);
      } else {
        sessaoAtual = await recebimentoService.iniciarConferencia(nunotas, nivelInicial);
        setSessao(sessaoAtual);
        const resp = await recebimentoService.obterItensConferencia(sessaoAtual.id);
        setItens(resp.itens);
        setBipagens(resp.bipagens);
        await carregarOcorrencias(sessaoAtual.id);
      }
    } catch (err: any) {
      setErro(err.response?.data?.error || err.message || 'Erro ao inicializar conferência de entrada.');
    } finally {
      setLoading(false);
    }
  }, [nunotas, navState, nivelInicial, carregarOcorrencias]);

  useEffect(() => {
    prepararAudio();
    if (!podeAcessar) return;
    inicializar();
  }, [podeAcessar, inicializar]);

  useEffect(() => {
    if (!loading && inputCodigoRef.current) {
      inputCodigoRef.current.focus();
    }
  }, [loading]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Carrega parâmetro de dias para shelf-life configurado no sistema
  useEffect(() => {
    let ativo = true;
    configSistemaService
      .listarParametros()
      .then((params) => {
        if (!ativo) return;
        const paramDias = params?.recebimento_shelf_life_dias_alerta?.valor;
        if (paramDias && !isNaN(Number(paramDias))) {
          setDiasShelfLife(Number(paramDias));
        }
      })
      .catch((e) => console.warn('Erro ao carregar parâmetro de shelf-life:', e));
    return () => {
      ativo = false;
    };
  }, []);

  const nivelAtual = sessao?.nivelAtual || 1;
  const isEnviadoSankhya = sessao?.status === 'Enviado ao Sankhya';
  const isConferido = sessao?.status === 'Conferido';
  const isDivergentePendente = sessao?.status === 'Divergente' && sessao?.nivelAtual !== 3;
  const isSomenteLeitura = isEnviadoSankhya || isConferido || isDivergentePendente;
  const isRecontagem = Boolean(sessao?.status?.includes('Recontagem') || (sessao?.itensRecontagem && sessao.itensRecontagem.length > 0));
  const isCega = useMemo(() => itens.length > 0 && itens.some((i) => i.qtdneg === null), [itens]);

  // Lista de notas distintas da sessão para o seletor de NF
  const listaNotasDisponiveis = useMemo(() => {
    const mapa = new Map<number, { nunota: number; numnota: number; countItens: number; conferidosOk: number }>();
    itens.forEach((it) => {
      const nunota = it.nunota;
      const numnota = it.numnota || nunota;
      if (!mapa.has(nunota)) {
        mapa.set(nunota, { nunota, numnota, countItens: 0, conferidosOk: 0 });
      }
      const entry = mapa.get(nunota)!;
      entry.countItens++;
      const conferido =
        nivelAtual === 1 ? it.qtdConferidaN1 : nivelAtual === 2 ? it.qtdConferidaN2 : it.qtdConferidaN3;
      const completo =
        it.conferidoCompleto !== undefined
          ? it.conferidoCompleto
          : it.qtdneg !== null
          ? conferido >= it.qtdneg
          : false;
      if (completo) {
        entry.conferidosOk++;
      }
    });
    return Array.from(mapa.values());
  }, [itens, nivelAtual]);

  // Estatísticas da nota em foco (ou consolidadas)
  const estatisticas = useMemo(() => {
    const baseItens = itensExibidos;
    const totalItensDistintos = baseItens.length;
    let totalEsperado = 0;
    let totalConferidoNivel = 0;

    baseItens.forEach((item) => {
      if (item.qtdneg !== null) {
        totalEsperado += item.qtdneg;
      }
      if (nivelAtual === 1) totalConferidoNivel += item.qtdConferidaN1;
      else if (nivelAtual === 2) totalConferidoNivel += item.qtdConferidaN2;
      else if (nivelAtual === 3) totalConferidoNivel += item.qtdConferidaN3;
    });

    let itensComSobra = 0;
    let itensExatos = 0;
    let itensSemBipagem = 0;
    let itensComFalta = 0;

    baseItens.forEach((i) => {
      const conferido =
        nivelAtual === 1 ? i.qtdConferidaN1 : nivelAtual === 2 ? i.qtdConferidaN2 : i.qtdConferidaN3;
      if (i.qtdneg !== null) {
        if (conferido === i.qtdneg) itensExatos++;
        else if (conferido > i.qtdneg) itensComSobra++;
        else {
          itensComFalta++;
          if (conferido === 0) itensSemBipagem++;
        }
      } else {
        const completo = i.conferidoCompleto !== undefined ? i.conferidoCompleto : false;
        if (completo) itensExatos++;
        else {
          itensComFalta++;
          if (conferido === 0) itensSemBipagem++;
        }
      }
    });

    const itensConferidosOk = itensExatos + itensComSobra;

    // Estatísticas por Nota Fiscal individual (calculadas com todos os itens da conferência)
    const notasMap: Record<number, {
      nunota: number;
      numnota: number;
      totalItens: number;
      totalEsperado: number;
      totalConferido: number;
      itensOk: number;
      itensComSobra: number;
      itensSemBipagem: number;
      itensComFalta: number;
      percentualConferido: number;
    }> = {};

    itens.forEach((it) => {
      const nunota = it.nunota;
      const numnota = it.numnota || nunota;
      if (!notasMap[nunota]) {
        notasMap[nunota] = {
          nunota,
          numnota,
          totalItens: 0,
          totalEsperado: 0,
          totalConferido: 0,
          itensOk: 0,
          itensComSobra: 0,
          itensSemBipagem: 0,
          itensComFalta: 0,
          percentualConferido: 0,
        };
      }
      const conferido =
        nivelAtual === 1 ? it.qtdConferidaN1 : nivelAtual === 2 ? it.qtdConferidaN2 : it.qtdConferidaN3;
      const esperado = it.qtdneg !== null ? it.qtdneg : 0;

      notasMap[nunota].totalItens++;
      notasMap[nunota].totalEsperado += esperado;
      notasMap[nunota].totalConferido += conferido;

      if (it.qtdneg !== null) {
        if (conferido === esperado) {
          notasMap[nunota].itensOk++;
        } else if (conferido > esperado) {
          notasMap[nunota].itensComSobra++;
        } else {
          notasMap[nunota].itensComFalta++;
          if (conferido === 0) {
            notasMap[nunota].itensSemBipagem++;
          }
        }
      } else {
        const completo = it.conferidoCompleto !== undefined ? it.conferidoCompleto : false;
        if (completo) {
          notasMap[nunota].itensOk++;
        } else {
          notasMap[nunota].itensComFalta++;
          if (conferido === 0) {
            notasMap[nunota].itensSemBipagem++;
          }
        }
      }
    });

    const porNota = Object.values(notasMap).map((n) => ({
      ...n,
      percentualConferido: n.totalEsperado > 0 ? Math.min(100, Math.round((n.totalConferido / n.totalEsperado) * 100)) : 0,
    }));

    return {
      totalItensDistintos,
      totalEsperado,
      totalConferidoNivel,
      itensConferidosOk,
      itensExatos,
      itensComSobra,
      itensSemBipagem,
      itensComFalta,
      pendentes: Math.max(0, totalItensDistintos - itensConferidosOk),
      porNota,
    };
  }, [itensExibidos, itens, nivelAtual]);

  const numerosNFsUnicas = useMemo(() => {
    const nfs = Array.from(new Set(itens.map((i) => i.numnota).filter(Boolean)));
    if (nfs.length > 0) return nfs.map(String);
    return sessao?.nunotas.map(String) || [];
  }, [itens, sessao]);
  const multiplasNotas = numerosNFsUnicas.length > 1;

  const notaSelecionadaObj = useMemo(() => {
    if (notaFiltro === 'todas') return null;
    return listaNotasDisponiveis.find((n) => n.nunota === notaFiltro) || null;
  }, [notaFiltro, listaNotasDisponiveis]);

  // Bloqueio de colar
  const handleTentativaColar = () => {
    setErro('⚠️ Bloqueio de Segurança: É obrigatório ler o código fisicamente com o leitor ou câmera!');
    tocarAlertaErro();
  };

  // Abrir Modal de Ocorrência para um Item Específico
  const handleAbrirOcorrenciaItem = (
    it?: ItemNotaEntrada,
    tipoPadrao: TipoOcorrenciaRecebimento = 'AVARIA'
  ) => {
    if (it) {
      setItemParaOcorrencia({
        nunota: it.nunota,
        numnota: it.numnota,
        codprod: it.codprod,
        descrprod: it.descrprod,
        sequencia: it.sequencia,
        lote: lote || undefined,
        validade: validade || undefined,
        fabricacao: fabricacao || undefined,
        qtdEsperada: it.qtdneg || undefined,
      });
    } else {
      setItemParaOcorrencia(null);
    }
    setTipoOcorrenciaModal(tipoPadrao);
    setModalOcorrenciaAberto(true);
  };

  // Função para verificar validade vencida ou shelf-life próximo e abrir modal de ocorrência automaticamente
  const verificarValidadeEObrirOcorrencia = (
    valStr: string,
    fabStr?: string,
    loteStr?: string,
    qtdSugerida?: string | number
  ): boolean => {
    if (!valStr || !valStr.trim()) return false;
    const valComp = completarAnoData(valStr.trim());
    const res = validarData(valComp, true);
    if (!res.valida) return false;

    const checagem = checarStatusValidade(valComp, diasShelfLife);
    if (checagem.status === 'VENCIDO' || checagem.status === 'VALIDADE_PROXIMA') {
      const codLimpo = codigo.trim();
      const itemEncontrado = itens.find(
        (it) =>
          it.codbarra === codLimpo ||
          String(it.codprod) === codLimpo ||
          (it.referencia && it.referencia.toUpperCase() === codLimpo.toUpperCase())
      );

      setItemParaOcorrencia({
        nunota: itemEncontrado?.nunota || sessao?.nunotas[0],
        numnota: itemEncontrado?.numnota,
        codprod: itemEncontrado?.codprod,
        descrprod: itemEncontrado?.descrprod || (codLimpo ? `Item [${codLimpo}]` : 'Produto em Conferência'),
        sequencia: itemEncontrado?.sequencia,
        lote: loteStr?.trim() || lote.trim() || undefined,
        validade: valComp,
        fabricacao: fabStr?.trim() ? completarAnoData(fabStr.trim()) : (fabricacao.trim() ? completarAnoData(fabricacao.trim()) : undefined),
        qtdEsperada: itemEncontrado?.qtdneg || undefined,
        quantidadeSugerida: Number(qtdSugerida || quantidade) || 1,
      });
      setTipoOcorrenciaModal(checagem.status);
      setModalOcorrenciaAberto(true);
      return true;
    }
    return false;
  };

  // Renderiza tags visuais de ocorrências registradas para o item ou lote, agrupando e contabilizando por tipo
  const renderTagsOcorrencia = (ocorrencias: OcorrenciaRecebimento[]) => {
    if (!ocorrencias || ocorrencias.length === 0) return null;

    // Agrupa ocorrências por tipo somando as quantidades
    const mapaGrupos = new Map<
      TipoOcorrenciaRecebimento,
      { tipo: TipoOcorrenciaRecebimento; quantidadeTotal: number; statuses: Set<string> }
    >();

    for (const oc of ocorrencias) {
      const atual = mapaGrupos.get(oc.tipo);
      const qtd = Number(oc.quantidade) || 1;
      if (atual) {
        atual.quantidadeTotal += qtd;
        if (oc.status) atual.statuses.add(oc.status);
      } else {
        mapaGrupos.set(oc.tipo, {
          tipo: oc.tipo,
          quantidadeTotal: qtd,
          statuses: new Set(oc.status ? [oc.status] : ['PENDENTE']),
        });
      }
    }

    const grupos = Array.from(mapaGrupos.values());

    return (
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '5px', marginTop: '3px', alignItems: 'center' }}>
        {grupos.map((g) => {
          const isVencido = g.tipo === 'VENCIDO';
          const isAvaria = g.tipo === 'AVARIA';
          const isValidadeProx = g.tipo === 'VALIDADE_PROXIMA';

          // Cores suaves e elegantes (estilo clean e agradável aos olhos)
          const bg = isVencido ? '#fef2f2' : isAvaria ? '#fff1f2' : isValidadeProx ? '#fffbeb' : '#f8fafc';
          const border = isVencido ? '#fca5a5' : isAvaria ? '#fda4af' : isValidadeProx ? '#fde68a' : '#e2e8f0';
          const color = isVencido ? '#b91c1c' : isAvaria ? '#be123c' : isValidadeProx ? '#b45309' : '#334155';
          const emoji = isVencido ? '⛔' : isAvaria ? '💥' : isValidadeProx ? '⚠️' : 'ℹ️';
          const label =
            isVencido ? 'Vencido' : isAvaria ? 'Avaria' : isValidadeProx ? 'Validade Próx.' : g.tipo;

          const temResolvido = g.statuses.has('RESOLVIDO') || g.statuses.has('INTEGRADO_ERP');
          const statusTxt = temResolvido ? 'Resolvido' : 'Pendente';

          return (
            <span
              key={`tag-oc-grupo-${g.tipo}`}
              onClick={(e) => {
                e.stopPropagation();
                setModalListaOcorrenciasAberto(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.70rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: bg,
                border: `1px solid ${border}`,
                color: color,
                cursor: 'pointer',
                lineHeight: '1.25',
                transition: 'all 0.15s ease',
              }}
              title={`${label}: ${g.quantidadeTotal} un (${statusTxt}) — Clique para ver detalhes`}
            >
              <span>{emoji}</span>
              <span>
                {label} ({g.quantidadeTotal} un)
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  // Salvar Ocorrência
  const handleSalvarOcorrencia = async (dados: any) => {
    await recebimentoService.registrarOcorrencia(dados);
    tocarAlertaSucesso();

    const termos = obterTermosOcorrencia(dados.tipo);

    // Se o operador indicou que a unidade JÁ FOI BIPADA previamente na conferência:
    if (dados.jaBipado === true) {
      if (sessao) await carregarOcorrencias(sessao.id);
      setSucesso(
        `Ocorrência de ${termos.nome.toUpperCase()} registrada com sucesso! A unidade foi marcada como ${termos.marcadaComo} sem alterar a contagem física.`
      );
      setCodigo('');
      setQuantidade('1');
      setLote('');
      setValidade('');
      setFabricacao('');
      return;
    }

    // Se for AVARIA, VENCIDO ou VALIDADE_PROXIMA e NÃO foi bipada ainda (dados.jaBipado === false ou ausente),
    // contabiliza também na conferência física da sessão
    if (sessao && ['AVARIA', 'VENCIDO', 'VALIDADE_PROXIMA'].includes(dados.tipo)) {
      const codIdentificador = dados.codprod ? String(dados.codprod) : codigo.trim();
      const qtdNum = Number(dados.quantidade) || 1;
      if (codIdentificador) {
        try {
          const resp = await recebimentoService.bipar(sessao.id, {
            codigo: codIdentificador,
            quantidade: qtdNum,
            nivel: nivelAtual,
            lote: dados.lote || lote.trim() || undefined,
            validade: dados.validade || validade.trim() || undefined,
            fabricacao: dados.fabricacao || fabricacao.trim() || undefined,
            nunota: notaFiltro !== 'todas' ? notaFiltro : undefined,
          });

          // Atualiza status da sessão local se retornado
          if (resp.statusSessao) {
            setSessao((prev) => (prev ? { ...prev, status: resp.statusSessao as any } : prev));
          } else {
            const statusEsperado =
              nivelAtual === 2 ? 'N2 em Andamento' : nivelAtual === 3 ? 'N3 em Andamento' : 'N1 em Andamento';
            setSessao((prev) => (prev && prev.status !== statusEsperado && prev.status !== 'Conferido' ? { ...prev, status: statusEsperado } : prev));
          }

          // Atualiza lista de itens e bipagens
          setBipagens((prev) => [resp.bipagem, ...prev]);
          setItens((prev) =>
            prev.map((it) => {
              if (
                it.nunota === resp.bipagem.nunota &&
                it.sequencia === resp.bipagem.sequencia &&
                it.codprod === resp.bipagem.codprod
              ) {
                const add = resp.bipagem.qtdConferida;
                return {
                  ...it,
                  qtdConferidaN1: nivelAtual === 1 ? it.qtdConferidaN1 + add : it.qtdConferidaN1,
                  qtdConferidaN2: nivelAtual === 2 ? it.qtdConferidaN2 + add : it.qtdConferidaN2,
                  qtdConferidaN3: nivelAtual === 3 ? it.qtdConferidaN3 + add : it.qtdConferidaN3,
                  conferidoCompleto: resp.conferidoCompleto !== undefined ? resp.conferidoCompleto : it.conferidoCompleto,
                };
              }
              return it;
            })
          );

          setSucesso(
            `Ocorrência de ${termos.nome.toUpperCase()} registrada e ADICIONADA à conferência física (+${resp.bipagem.qtdConferida} un)!`
          );
          setCodigo('');
          setQuantidade('1');
          setLote('');
          setValidade('');
          setFabricacao('');
        } catch (bipErr: any) {
          console.warn('Aviso: Falha ao contabilizar bipagem física para a ocorrência:', bipErr);
          setSucesso(`Ocorrência de ${termos.nome.toUpperCase()} registrada com sucesso.`);
        }
      } else {
        setSucesso(`Ocorrência de ${termos.nome.toUpperCase()} registrada com sucesso.`);
      }
    } else {
      setSucesso(`Ocorrência de ${termos.nome.toUpperCase()} registrada com sucesso.`);
    }

    if (sessao) {
      await carregarOcorrencias(sessao.id);
    }
    setCodigoNaoEncontradoOcorr(null);
  };

  // Bipagem
  const handleBipar = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const codLimpo = codigo.trim();
    if (!codLimpo || !sessao) return;

    if (isSomenteLeitura) {
      setErro(`⚠️ Conferência com status "${sessao.status}". Modo somente leitura, não é permitido registrar bipagens.`);
      tocarAlertaErro();
      return;
    }

    // Se o Modo Avaria estiver ativo, direciona o bip diretamente para o registro de ocorrência
    if (modoAvariaAtivo) {
      const itemEncontrado = itens.find(
        (it) =>
          it.codbarra === codLimpo ||
          String(it.codprod) === codLimpo ||
          (it.referencia && it.referencia.toUpperCase() === codLimpo.toUpperCase())
      );

      setItemParaOcorrencia({
        nunota: itemEncontrado?.nunota || sessao?.nunotas[0],
        numnota: itemEncontrado?.numnota,
        codprod: itemEncontrado?.codprod,
        descrprod: itemEncontrado?.descrprod || `Item [${codLimpo}]`,
        sequencia: itemEncontrado?.sequencia,
        lote: lote.trim() || undefined,
        validade: validade.trim() ? completarAnoData(validade) : undefined,
        fabricacao: fabricacao.trim() ? completarAnoData(fabricacao) : undefined,
        qtdEsperada: itemEncontrado?.qtdneg || undefined,
        quantidadeSugerida: Number(quantidade) || 1,
      });
      setTipoOcorrenciaModal('AVARIA');
      setModalOcorrenciaAberto(true);
      return;
    }

    let validadeFinal = validade.trim();
    let fabricacaoFinal = fabricacao.trim();

    if (nivelAtual >= 2) {
      if (!lote.trim() || !validadeFinal || !fabricacaoFinal) {
        setErro('⚠️ No Nível N2/N3, é obrigatório preencher Lote, Validade e Fabricação antes de registrar!');
        tocarAlertaErro();
        return;
      }

      validadeFinal = completarAnoData(validadeFinal);
      const resVal = validarData(validadeFinal, true);
      if (!resVal.valida) {
        setErroValidade(resVal.erro || 'Data de validade inválida');
        setErro(`⚠️ Validade inválida: ${resVal.erro}`);
        tocarAlertaErro();
        return;
      }
      setValidade(validadeFinal);

      fabricacaoFinal = completarAnoData(fabricacaoFinal);
      const resFab = validarData(fabricacaoFinal, true);
      if (!resFab.valida) {
        setErroFabricacao(resFab.erro || 'Data de fabricação inválida');
        setErro(`⚠️ Fabricação inválida: ${resFab.erro}`);
        tocarAlertaErro();
        return;
      }
      setFabricacao(fabricacaoFinal);

      // Validação de Integridade de Lote: No Sankhya, um mesmo produto não pode ter o mesmo Lote com datas diferentes
      const loteLimpo = lote.trim().toUpperCase();
      const itemAlvo = itens.find(
        (it) =>
          it.codbarra === codLimpo ||
          String(it.codprod) === codLimpo ||
          (it.referencia && it.referencia.toUpperCase() === codLimpo.toUpperCase())
      );

      if (itemAlvo) {
        const bipExistente = bipagens.find(
          (b) =>
            !b.anulado &&
            b.codprod === itemAlvo.codprod &&
            b.lote &&
            b.lote.trim().toUpperCase() === loteLimpo
        );

        if (bipExistente) {
          const valExistenteFmt = bipExistente.validade ? formatarDataApenas(bipExistente.validade) : null;
          const fabExistenteFmt = bipExistente.fabricacao ? formatarDataApenas(bipExistente.fabricacao) : null;

          const valAtualFmt = formatarDataApenas(validadeFinal);
          const fabAtualFmt = formatarDataApenas(fabricacaoFinal);

          const validadeDiverge = valExistenteFmt && valAtualFmt && valExistenteFmt !== valAtualFmt;
          const fabricacaoDiverge = fabExistenteFmt && fabAtualFmt && fabExistenteFmt !== fabAtualFmt;

          if (validadeDiverge || fabricacaoDiverge) {
            setErro(
              `⚠️ Divergência de Lote: O lote "${lote.trim()}" já foi registrado para este produto com Validade ${valExistenteFmt || '—'} e Fabricação ${fabExistenteFmt || '—'}. No Sankhya, um mesmo lote não pode possuir datas diferentes. Verifique a digitação na embalagem ou estorne o lote anterior caso tenha sido digitado incorretamente.`
            );
            tocarAlertaErro();
            return;
          }
        }
      }
    }

    // Checagem de Validade (Vencido ou Validade Próxima / Shelf-life)
    if (validadeFinal) {
      const abriuOcorrencia = verificarValidadeEObrirOcorrencia(
        validadeFinal,
        fabricacaoFinal,
        lote,
        quantidade
      );
      if (abriuOcorrencia) {
        return;
      }
    }

    // Validação de nota selecionada em conferências conjuntas
    const itemEmOutraNota = itens.find(
      (it) =>
        it.codbarra === codLimpo ||
        String(it.codprod) === codLimpo ||
        (it.referencia && it.referencia.toUpperCase() === codLimpo.toUpperCase())
    );

    if (itemEmOutraNota && notaFiltro !== 'todas' && itemEmOutraNota.nunota !== notaFiltro) {
      const notaAlvo = listaNotasDisponiveis.find((n) => n.nunota === itemEmOutraNota.nunota);
      const numNotaStr = notaAlvo ? `NF ${notaAlvo.numnota}` : `Nota Fiscal #${itemEmOutraNota.nunota}`;
      setErro(
        `⚠️ O produto "${itemEmOutraNota.descrprod}" pertence à ${numNotaStr} desta conferência conjunta. Alterne para essa nota no seletor para conferi-lo.`
      );
      tocarAlertaErro();
      return;
    }

    setProcessando(true);
    setErro(null);
    setSucesso(null);
    setCodigoNaoEncontradoOcorr(null);

    try {
      const resp = await recebimentoService.bipar(sessao.id, {
        codigo: codLimpo,
        quantidade: Number(quantidade) || 1,
        nivel: nivelAtual,
        lote: lote.trim() || undefined,
        validade: validadeFinal || undefined,
        fabricacao: fabricacaoFinal || undefined,
        nunota: notaFiltro !== 'todas' ? notaFiltro : undefined,
      });

      tocarAlertaSucesso();
      setSucesso(`Bipagem registrada: ${resp.descrprod} (+${resp.bipagem.qtdConferida})`);
      setFeedbackVisual({ codProd: resp.bipagem.codprod, descrProd: resp.descrprod });
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedbackVisual(null), 2500);

      // Atualiza status da sessão local se retornado ou se ainda estiver Em Aberto
      if (resp.statusSessao) {
        setSessao((prev) => (prev ? { ...prev, status: resp.statusSessao as any } : prev));
      } else {
        const statusEsperado =
          nivelAtual === 2 ? 'N2 em Andamento' : nivelAtual === 3 ? 'N3 em Andamento' : 'N1 em Andamento';
        setSessao((prev) => (prev && prev.status !== statusEsperado && prev.status !== 'Conferido' ? { ...prev, status: statusEsperado } : prev));
      }

      // Atualiza lista de itens e bipagens
      setBipagens((prev) => [resp.bipagem, ...prev]);
      setItens((prev) =>
        prev.map((it) => {
          if (
            it.nunota === resp.bipagem.nunota &&
            it.sequencia === resp.bipagem.sequencia &&
            it.codprod === resp.bipagem.codprod
          ) {
            const add = resp.bipagem.qtdConferida;
            return {
              ...it,
              qtdConferidaN1: nivelAtual === 1 ? it.qtdConferidaN1 + add : it.qtdConferidaN1,
              qtdConferidaN2: nivelAtual === 2 ? it.qtdConferidaN2 + add : it.qtdConferidaN2,
              qtdConferidaN3: nivelAtual === 3 ? it.qtdConferidaN3 + add : it.qtdConferidaN3,
              conferidoCompleto: resp.conferidoCompleto !== undefined ? resp.conferidoCompleto : it.conferidoCompleto,
            };
          }
          return it;
        })
      );

      setCodigo('');
      setQuantidade('1');
      setErroValidade(null);
      setErroFabricacao(null);
      setTecladoVirtualAtivo(false);
      if (inputCodigoRef.current) inputCodigoRef.current.focus();
    } catch (err: any) {
      tocarAlertaErro();
      const msgErro = err.response?.data?.error || err.message || 'Erro ao registrar bipagem.';
      setErro(msgErro);

      // Se o código não pertence a nenhum item da nota, sugere apontamento de produto trocado/não identificado
      if (msgErro.includes('não encontrado nos itens desta carga')) {
        setCodigoNaoEncontradoOcorr(codLimpo);
      }
    } finally {
      setProcessando(false);
    }
  };

  const handleScanCamera = (scannedCode: string) => {
    setCodigo(scannedCode);
    setMostrarCamera(false);
  };

  // OCR
  const handleAbrirOcr = (campo: 'lote' | 'fabricacao' | 'validade') => {
    setCampoOcrAlvo(campo);
    setTextoOcrBruto('');
    setModalOcrAberto(true);
  };

  const handleAplicarOcr = () => {
    if (!textoOcrBruto.trim()) {
      setModalOcrAberto(false);
      return;
    }

    if (campoOcrAlvo === 'lote') {
      const extraido = extractFieldValue(textoOcrBruto, 'lote');
      if (extraido) setLote(extraido);
    } else if (campoOcrAlvo === 'validade') {
      const extraido = extractFieldValue(textoOcrBruto, 'validade');
      const normalizado = extraido ? normalizeDate(extraido) : null;
      if (normalizado) {
        const formatado = completarAnoData(aplicarMascaraData(normalizado));
        setValidade(formatado);
        setErroValidade(null);
      }
    } else if (campoOcrAlvo === 'fabricacao') {
      const extraido = extractFieldValue(textoOcrBruto, 'fabricacao');
      const normalizado = extraido ? normalizeDate(extraido) : null;
      if (normalizado) {
        const formatado = completarAnoData(aplicarMascaraData(normalizado));
        setFabricacao(formatado);
        setErroFabricacao(null);
      }
    }

    setModalOcrAberto(false);
    tocarAlertaSucesso();
  };

  // Estorno de Bipagem
  const handleConfirmarEstorno = async () => {
    if (!bipagemParaEstornar) return;
    setEstornando(true);
    setErro(null);

    try {
      await recebimentoService.anularBipagem(bipagemParaEstornar.id);
      tocarAlertaSucesso();
      setSucesso('Bipagem estornada com sucesso.');

      setBipagens((prev) =>
        prev.map((b) => (b.id === bipagemParaEstornar.id ? { ...b, anulado: true } : b))
      );

      setItens((prev) =>
        prev.map((it) => {
          if (
            it.nunota === bipagemParaEstornar.nunota &&
            it.sequencia === bipagemParaEstornar.sequencia &&
            it.codprod === bipagemParaEstornar.codprod
          ) {
            const sub = bipagemParaEstornar.qtdConferida;
            return {
              ...it,
              qtdConferidaN1:
                bipagemParaEstornar.nivel === 1 ? Math.max(0, it.qtdConferidaN1 - sub) : it.qtdConferidaN1,
              qtdConferidaN2:
                bipagemParaEstornar.nivel === 2 ? Math.max(0, it.qtdConferidaN2 - sub) : it.qtdConferidaN2,
              qtdConferidaN3:
                bipagemParaEstornar.nivel === 3 ? Math.max(0, it.qtdConferidaN3 - sub) : it.qtdConferidaN3,
            };
          }
          return it;
        })
      );

      setBipagemParaEstornar(null);

      // Remove ocorrência pendente vinculada ao bip estornado se houver
      if (bipagemParaEstornar.lote && sessao) {
        const loteLimpo = bipagemParaEstornar.lote.trim().toUpperCase();
        const ocsBip = ocorrenciasSessao.filter(
          (oc) =>
            oc.status === 'PENDENTE' &&
            oc.codprod === bipagemParaEstornar.codprod &&
            oc.lote &&
            oc.lote.trim().toUpperCase() === loteLimpo
        );
        for (const oc of ocsBip) {
          try {
            await recebimentoService.removerOcorrencia(oc.id);
          } catch (e) {
            console.warn('Erro ao remover ocorrência vinculada ao bip estornado:', e);
          }
        }
        await carregarOcorrencias(sessao.id);
      }
    } catch (err: any) {
      tocarAlertaErro();
      setErro(err.response?.data?.error || err.message || 'Erro ao anular bipagem.');
    } finally {
      setEstornando(false);
    }
  };

  // Estorno do Lote Específico Completo
  const handleConfirmarEstornoLoteCompleto = async () => {
    if (!loteParaEstornar || !sessao) return;
    setEstornando(true);
    setErro(null);

    try {
      // Anula todas as bipagens pertencentes a este lote
      for (const id of loteParaEstornar.bipagemIds) {
        await recebimentoService.anularBipagem(id);
      }

      tocarAlertaSucesso();
      setSucesso(`Lote ${loteParaEstornar.lote} (${loteParaEstornar.quantidade} un) estornado com sucesso.`);

      // Atualiza estado de bipagens
      const idsAnulados = new Set(loteParaEstornar.bipagemIds);
      setBipagens((prev) =>
        prev.map((b) => (idsAnulados.has(b.id) ? { ...b, anulado: true } : b))
      );

      // Remove ocorrências pendentes vinculadas a este lote nesta conferência
      const ocorrenciasVinculadas = ocorrenciasSessao.filter(
        (oc) =>
          oc.status === 'PENDENTE' &&
          (loteParaEstornar.lote === 'TODOS OS LOTES / TOTAL' ||
            (oc.lote && oc.lote.trim().toUpperCase() === loteParaEstornar.lote.trim().toUpperCase()))
      );

      for (const oc of ocorrenciasVinculadas) {
        try {
          await recebimentoService.removerOcorrencia(oc.id);
        } catch (e) {
          console.warn('Erro ao remover ocorrência vinculada ao lote estornado:', e);
        }
      }

      // Recarrega itens atualizados da conferência para garantir sincronia
      const respAtualizada = await recebimentoService.obterItensConferencia(sessao.id);
      setItens(respAtualizada.itens);
      setBipagens(respAtualizada.bipagens);
      await carregarOcorrencias(sessao.id);

      setLoteParaEstornar(null);
    } catch (err: any) {
      tocarAlertaErro();
      setErro(err.response?.data?.error || err.message || 'Erro ao anular lote.');
    } finally {
      setEstornando(false);
    }
  };

  // Finalizar nível
  const handleFinalizarNivel = async () => {
    if (!sessao) return;
    setProcessando(true);
    setErro(null);

    try {
      const res = await recebimentoService.finalizarNivel(sessao.id, nivelAtual);
      setModalFinalizarAberto(false);
      setResultadoFinalizacao(res);
      setModalResultadoAberto(true);

      if (res.possuiDivergencias) {
        tocarAlertaErro();
      } else {
        tocarAlertaSucesso();
      }
    } catch (err: any) {
      tocarAlertaErro();
      setErro(err.response?.data?.error || err.message || 'Erro ao finalizar nível.');
    } finally {
      setProcessando(false);
    }
  };

  // Avançar diretamente para o próximo nível a partir do modal de resultado
  const handleAvancarParaNivel = async (novoNivel: number) => {
    if (!sessao) return;
    setProcessando(true);
    setErro(null);
    try {
      await recebimentoService.iniciarConferencia(sessao.nunotas, novoNivel);
      setModalResultadoAberto(false);
      await inicializar();
      tocarAlertaSucesso();
    } catch (err: any) {
      tocarAlertaErro();
      setErro(err.response?.data?.error || err.message || `Erro ao avançar para N${novoNivel}.`);
    } finally {
      setProcessando(false);
    }
  };

  const bipagensValidas = useMemo(
    () => bipagens.filter((b) => !b.anulado && b.nivel === nivelAtual),
    [bipagens, nivelAtual]
  );

  const itensPendentesVisiveis = useMemo(() => {
    return itensExibidos.filter((item) => {
      // No Nível 3, se uma nota já estiver aprovada/conferida, seus itens não aparecem para conferência
      if (nivelAtual === 3 && sessao?.statusPorNota) {
        const statusNota = sessao.statusPorNota[item.nunota];
        if (statusNota === 'Conferido' || statusNota === 'Enviado ao Sankhya') {
          return false;
        }
      }
      const conferido =
        nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
      const esperado = item.qtdneg !== null ? item.qtdneg : null;
      const completo =
        item.conferidoCompleto !== undefined
          ? item.conferidoCompleto
          : esperado !== null
          ? conferido >= esperado
          : false;
      return !completo;
    });
  }, [itensExibidos, nivelAtual, sessao]);

  const itensConferidosVisiveis = useMemo<ItemEntradaConferidoVisivel[]>(() => {
    return itensExibidos
      .filter((item) => {
        // No Nível 3, não polui a visualização com itens de notas que já foram aprovadas
        if (nivelAtual === 3 && sessao?.statusPorNota) {
          const statusNota = sessao.statusPorNota[item.nunota];
          if (statusNota === 'Conferido' || statusNota === 'Enviado ao Sankhya') {
            return false;
          }
        }
        const conferido =
          nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
        return conferido > 0;
      })
      .map((item) => {
        const conferido =
          nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
        const esperado = item.qtdneg !== null ? item.qtdneg : null;
        const completo =
          item.conferidoCompleto !== undefined
            ? item.conferidoCompleto
            : esperado !== null
            ? conferido >= esperado
            : false;

        // Agrupar bipagens deste item por Lote + Validade + Fabricação
        const bipsDesteItem = bipagensValidas.filter(
          (b) =>
            b.codprod === item.codprod &&
            (b.nunota === item.nunota ? b.sequencia === item.sequencia : true)
        );

        const mapaLotesItem: Record<
          string,
          {
            lote: string;
            validade?: string;
            fabricacao?: string;
            quantidade: number;
            ultimoHorario?: string;
            bipagemRecente?: BipagemEntrada;
            bipagemIds: string[];
          }
        > = {};

        for (const b of bipsDesteItem) {
          const lNome = (b.lote && b.lote.trim()) ? b.lote.trim() : 'Sem lote';
          const subChave = `${lNome.toUpperCase()}|${b.validade || ''}|${b.fabricacao || ''}`;
          if (!mapaLotesItem[subChave]) {
            mapaLotesItem[subChave] = {
              lote: lNome,
              validade: b.validade?.trim() || undefined,
              fabricacao: b.fabricacao?.trim() || undefined,
              quantidade: 0,
              ultimoHorario: b.timestamp,
              bipagemRecente: b,
              bipagemIds: [],
            };
          }
          mapaLotesItem[subChave].quantidade += b.qtdConferida || 0;
          mapaLotesItem[subChave].bipagemIds.push(b.id);
          mapaLotesItem[subChave].ultimoHorario = b.timestamp;
        }

        const lotesDetalhes = Object.values(mapaLotesItem);

        const ultimoBip = bipsDesteItem[0];

        return {
          item,
          conferido,
          esperado,
          completo,
          lote: lotesDetalhes.length === 1 ? lotesDetalhes[0].lote : ultimoBip?.lote,
          validade: lotesDetalhes.length === 1 ? lotesDetalhes[0].validade : ultimoBip?.validade,
          fabricacao: lotesDetalhes.length === 1 ? lotesDetalhes[0].fabricacao : ultimoBip?.fabricacao,
          lotesDetalhes,
          ultimoHorario: ultimoBip?.timestamp,
          ultimoBip,
        };
      });
  }, [itensExibidos, bipagensValidas, nivelAtual, sessao]);

  if (!podeAcessar) {
    return (
      <div className="page-container">
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito</h2>
            <p style={{ color: 'var(--slate-500)', marginTop: '8px' }}>
              Seu usuário não possui permissão para acessar o módulo de Conferência de Entrada (Recebimento).
            </p>
          </div>
        </Container>
      </div>
    );
  }

  if (sessao && !podeAcessarNivel) {
    return (
      <div className="page-container">
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito ao Nível {sessao.nivelAtual}</h2>
            <p style={{ color: 'var(--slate-500)', marginTop: '8px' }}>
              Seu usuário não possui permissão para conferir o Nível {sessao.nivelAtual} desta nota/conferência.
            </p>
            <div style={{ marginTop: '20px' }}>
              <Botao variant="primary" onClick={() => navigate('/recebimento')}>
                Voltar para Lista de Notas
              </Botao>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (sessao && !podeAcessarStatus) {
    return (
      <div className="page-container">
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h2 style={{ marginTop: '16px', color: 'var(--slate-800)' }}>Acesso Restrito ao Status</h2>
            <p style={{ color: 'var(--slate-500)', marginTop: '8px' }}>
              Seu usuário não possui permissão para visualizar conferências com status "{sessao.status}".
            </p>
            <div style={{ marginTop: '20px' }}>
              <Botao variant="primary" onClick={() => navigate('/recebimento')}>
                Voltar para Lista de Notas
              </Botao>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (loading && !sessao) {
    return <Loading fullscreen mensagem="Iniciando conferência de entrada..." />;
  }

  return (
    <div className="page-container conferencia-entrada-page">
      {/* Top Fixo: Header + Scanner Panel */}
      <div className="conferencia-top-fixo">
        {scannerRecolhido ? (
          <div className="conferencia-topo-compacto-wrapper">
            <div className="conferencia-topo-compacto-info">
              <span className="mini-info-nf">
                {notaSelecionadaObj ? `NF ${notaSelecionadaObj.numnota}` : `NF(s) ${numerosNFsUnicas.join(', ')}`}
              </span>
              <span className="mini-info-badge">
                {isEnviadoSankhya
                  ? 'Enviado'
                  : isConferido
                  ? 'Conferido'
                  : isDivergentePendente
                  ? 'Divergente'
                  : isRecontagem
                  ? `Recontagem N${nivelAtual}`
                  : `N${nivelAtual}`}
              </span>
              <span className="mini-info-kpis">
                {estatisticas.totalItensDistintos} Tot • {estatisticas.itensConferidosOk} Conf • {estatisticas.pendentes} Pend
              </span>
            </div>
            <div className="conferencia-topo-compacto">
              <Botao variant="ghost" size="sm" onClick={() => navigate('/recebimento')} className="mini-btn-voltar">
                ←
              </Botao>
              <form onSubmit={handleBipar} className="scanner-mini-form">
                <input
                  ref={inputCodigoRef}
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder={isSomenteLeitura ? 'Finalizada...' : 'Bipar código de barras...'}
                  disabled={isSomenteLeitura}
                  className="scanner-mini-input"
                  inputMode={isDispositivoMovel ? (tecladoVirtualAtivo ? 'text' : 'none') : undefined}
                />
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  min="1"
                  disabled={isSomenteLeitura}
                  className="scanner-mini-qtd"
                />
                <button
                  type="submit"
                  disabled={processando || !codigo.trim() || isSomenteLeitura}
                  className="scanner-mini-btn"
                >
                  {processando ? '...' : 'Bipar'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setScannerRecolhido(false)}
                className="btn-toggle-scanner-expandir"
                title="Expandir cabeçalho e formulário completo"
              >
                <span>▼ Topo</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="page-header conferencia-header-resp">
              <div className="header-linha-superior">
                <Botao
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/recebimento')}
                  className="header-btn-voltar"
                >
                  ← Voltar
                </Botao>

                <div className="header-info-centro">
                  <h1>Conferência #{sessao?.id.slice(0, 8)}</h1>
                  <span className="nota-info">
                    {notaSelecionadaObj
                      ? `Nota Fiscal ${notaSelecionadaObj.numnota} — Recebimento`
                      : `NF(s) ${numerosNFsUnicas.join(', ')} — Recebimento`}
                  </span>
                  {multiplasNotas && (
                    <span className="conferencia-conjunta-tag" title="Esta conferência agrupa múltiplas Notas Fiscais">
                      📦 Conferência Conjunta ({numerosNFsUnicas.length} Notas)
                    </span>
                  )}
                </div>

                <div className="header-btn-finalizar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {ehAdmin && (
                    <Botao
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowFolhaBipagemModal(true)}
                      title="Gerar Folha de Bipagem com Códigos de Barras e Lotes para leitura ótica"
                    >
                      📄 Folha de Bipagem
                    </Botao>
                  )}
                  <Botao
                    variant="success"
                    size="sm"
                    onClick={() => {
                      if (isSomenteLeitura) return;
                      setCienteItensFaltantes(false);
                      setModalFinalizarAberto(true);
                    }}
                    disabled={processando || estatisticas.totalConferidoNivel === 0 || isSomenteLeitura}
                    style={isSomenteLeitura ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
                    className="btn-finalizar-n"
                  >
                    {isEnviadoSankhya ? 'Enviado Sankhya' : isConferido ? 'Conferido' : isRecontagem ? `Finalizar Recontagem N${nivelAtual}` : `Finalizar N${nivelAtual}`}
                  </Botao>
                </div>
              </div>

              <div className="header-linha-inferior">
                <div className="header-status-badge">
                  {isEnviadoSankhya ? (
                    <span
                      className="badge-recontagem-header"
                      style={{
                        background: '#f3e8ff',
                        color: '#7e22ce',
                        border: '1px solid #d8b4fe',
                        fontWeight: 700,
                      }}
                      title="Conferência já enviada e integrada ao Sankhya"
                    >
                      🚀 Enviado ao Sankhya
                    </span>
                  ) : isConferido ? (
                    <span
                      className="badge-recontagem-header"
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        fontWeight: 700,
                      }}
                      title="Conferência 100% conferida e aprovada"
                    >
                      ✓ Conferido
                    </span>
                  ) : isDivergentePendente ? (
                    <span
                      className="badge-recontagem-header"
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        fontWeight: 700,
                      }}
                      title="Conferência finalizada com divergências (aguardando parecer do gestor)"
                    >
                      ⚠️ Divergente
                    </span>
                  ) : isRecontagem ? (
                    <span
                      className="badge-recontagem-header"
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fcd34d',
                        fontWeight: 800,
                      }}
                      title="Esta conferência está em processo de recontagem"
                    >
                      {`🔁 RECONTAGEM N${nivelAtual}: ${nivelAtual === 1 ? 'CONTAGEM CEGA' : nivelAtual === 2 ? 'LOTE E VALIDADE' : 'DESEMPATE'}`}
                    </span>
                  ) : (
                    <span
                      className="badge-recontagem-header"
                      style={
                        nivelAtual === 3
                          ? {
                              background: '#fff1f2',
                              color: 'var(--rose-500, #e11d48)',
                              border: '1px solid #fecdd3',
                              fontWeight: 800,
                            }
                          : {
                              background: '#f3e8ff',
                              color: '#6b21a8',
                              border: '1px solid #d8b4fe',
                              fontWeight: 800,
                            }
                      }
                      title="Nível atual da conferência"
                    >
                      {nivelAtual === 3
                        ? 'N3: RECONFERÊNCIA (DESEMPATE)'
                        : `N${nivelAtual}: ${nivelAtual === 1 ? 'CONTAGEM CEGA' : 'LOTE E VALIDADE'}`}
                    </span>
                  )}
                </div>

                <div className="header-cards-grid">
                  <div className="resumo-card-mini total">
                    <span className="resumo-card-val">{estatisticas.totalItensDistintos}</span>
                    <span className="resumo-card-lbl">Total</span>
                  </div>
                  <div className="resumo-card-mini conferido">
                    <span className="resumo-card-val" style={{ color: '#15803d' }}>{estatisticas.itensConferidosOk}</span>
                    <span className="resumo-card-lbl" style={{ color: '#16a34a' }}>Conf</span>
                  </div>
                  <div className="resumo-card-mini pendente">
                    <span className="resumo-card-val" style={{ color: '#b45309' }}>{estatisticas.pendentes}</span>
                    <span className="resumo-card-lbl" style={{ color: '#d97706' }}>Pend</span>
                  </div>
                </div>
              </div>
            </header>

            {isSomenteLeitura && (
              <div
                style={{
                  background: isEnviadoSankhya ? '#f5f3ff' : isConferido ? '#f0fdf4' : '#fff1f2',
                  color: isEnviadoSankhya ? '#6b21a8' : isConferido ? '#166534' : '#991b1b',
                  border: `1px solid ${isEnviadoSankhya ? '#ddd6fe' : isConferido ? '#bbf7d0' : '#fecdd3'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  margin: '0 0 10px 0',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{isEnviadoSankhya ? '🔒' : isConferido ? '✓' : '⚠️'}</span>
                <span>
                  {isEnviadoSankhya
                    ? 'Conferência finalizada e enviada ao Sankhya. Modo somente consulta (bipagem e alterações desabilitadas).'
                    : isConferido
                    ? 'Conferência finalizada e conferida com sucesso. Modo somente consulta.'
                    : 'Conferência finalizada com divergência aguardando parecer na Gestão de Recebimento. Modo somente consulta.'}
                </span>
              </div>
            )}

            {nivelAtual === 3 && !isSomenteLeitura && (
              <div
                style={{
                  background: '#fff1f2',
                  color: '#9f1239',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  margin: '0 0 10px 0',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🚨</span>
                <span>
                  <strong>Reconferência Nível 3:</strong> Apenas os itens divergentes ({itens.length}) foram carregados para desempate.
                </span>
              </div>
            )}

            {/* Scanner */}
            <Painel
              titulo="Conferir Produto"
              acoes={
                <button
                  type="button"
                  onClick={() => setScannerRecolhido(true)}
                  className="btn-toggle-scanner"
                  title="Ocultar cabeçalho e formulário de bipagem e mostrar lista de produtos"
                >
                  <span>▲ Ocultar Topo / Ver Lista</span>
                </button>
              }
            >
              <Container variant="scanner" padding="md">
                {/* Barra de Modos e Ocorrências Rápidas */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--slate-200, #e2e8f0)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setModoAvariaAtivo((prev) => !prev)}
                      disabled={isSomenteLeitura}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${modoAvariaAtivo ? '#dc2626' : '#cbd5e1'}`,
                        background: modoAvariaAtivo ? '#fef2f2' : '#ffffff',
                        color: modoAvariaAtivo ? '#b91c1c' : '#334155',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isSomenteLeitura ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: modoAvariaAtivo ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title="Quando ativo, o próximo bip registrará diretamente uma ocorrência/avaria"
                    >
                      <span>💥</span>
                      <span>{modoAvariaAtivo ? 'Modo Avaria ATIVO' : 'Modo Avaria'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAbrirOcorrenciaItem(undefined, 'AVARIA')}
                      disabled={isSomenteLeitura}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid #fde68a',
                        background: '#fffbeb',
                        color: '#b45309',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isSomenteLeitura ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Apontar avaria, vencido, sobra ou divergência avulsa"
                    >
                      <span>⚠️</span>
                      <span>+ Apontar Ocorrência</span>
                    </button>
                  </div>

                  {ocorrenciasSessao.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalListaOcorrenciasAberto(true)}
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        borderRadius: '12px',
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        transition: 'all 0.15s ease',
                      }}
                      title="Clique para ver a lista detalhada de ocorrências desta conferência"
                    >
                      <span>⚠️</span>
                      <span>{ocorrenciasSessao.length} Ocorrência(s)</span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          background: '#fde68a',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 800,
                        }}
                      >
                        Ver Lista
                      </span>
                    </button>
                  )}
                </div>

                {/* Aviso de Modo Avaria Ligado */}
                {modoAvariaAtivo && !isSomenteLeitura && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '10px',
                      fontSize: '0.78rem',
                      color: '#991b1b',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>💥</span>
                    <span>
                      <strong>Atenção:</strong> O Modo Avaria está ativado. O próximo bip abrirá o registro de ocorrência para desmembrar o produto no local de avaria.
                    </span>
                  </div>
                )}

                {/* Banner de Produto Não Encontrado */}
                {codigoNaoEncontradoOcorr && !isSomenteLeitura && (
                  <div
                    style={{
                      background: '#fefce8',
                      border: '1px solid #fef08a',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '0.80rem', color: '#854d0e' }}>
                      <span>⚠️ O código <strong>"{codigoNaoEncontradoOcorr}"</strong> não pertence a nenhum item desta nota.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItemParaOcorrencia({
                          nunota: sessao?.nunotas[0],
                          numnota: itens[0]?.numnota,
                          descrprod: `Produto Trocado / Divergente (${codigoNaoEncontradoOcorr})`,
                        });
                        setTipoOcorrenciaModal('PRODUTO_TROCADO');
                        setModalOcorrenciaAberto(true);
                      }}
                      style={{
                        padding: '4px 10px',
                        background: '#eab308',
                        color: '#713f12',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🔄 Registrar Produto Trocado / Não Identificado
                    </button>
                  </div>
                )}

                <form onSubmit={handleBipar} className="scanner-form-inner">
                  <div className="scanner-row-codigo">
                    <Campo
                      ref={inputCodigoRef}
                      variant="scanner"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      placeholder={isSomenteLeitura ? 'Conferência finalizada (somente leitura)...' : 'Escanear ou digitar código de barras...'}
                      autoFocus={!isSomenteLeitura}
                      disabled={isSomenteLeitura}
                      bloquearColar
                      onTentativaColar={handleTentativaColar}
                      inputMode={isDispositivoMovel ? (tecladoVirtualAtivo ? 'text' : 'none') : undefined}
                    />

                    {isDispositivoMovel && (
                      <button
                        type="button"
                        className={`btn-teclado-scanner ${tecladoVirtualAtivo ? 'ativo' : ''}`}
                        title={tecladoVirtualAtivo ? 'Desativar teclado virtual (Modo Coletor ativo)' : 'Abrir teclado virtual para digitação manual'}
                        onClick={alternarTecladoVirtual}
                        disabled={isSomenteLeitura}
                        style={isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                          <line x1="6" y1="8" x2="6" y2="8"></line>
                          <line x1="10" y1="8" x2="10" y2="8"></line>
                          <line x1="14" y1="8" x2="14" y2="8"></line>
                          <line x1="18" y1="8" x2="18" y2="8"></line>
                          <line x1="6" y1="12" x2="6" y2="12"></line>
                          <line x1="10" y1="12" x2="10" y2="12"></line>
                          <line x1="14" y1="12" x2="14" y2="12"></line>
                          <line x1="18" y1="12" x2="18" y2="12"></line>
                          <line x1="7" y1="16" x2="17" y2="16"></line>
                        </svg>
                      </button>
                    )}

                    <Campo
                      variant="compact"
                      type="number"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      min="1"
                      max="9999"
                      step="1"
                      placeholder="Qtd"
                      title="Quantidade a conferir (até 4 números)"
                      disabled={isSomenteLeitura}
                    />
                  </div>

                  {/* Campos de Lote / Validade no N2 e N3 */}
                  {nivelAtual >= 2 && (
                    <div className="conferencia-lote-grid">
                      <Campo
                        label="Lote *"
                        value={lote}
                        onChange={(e) => setLote(e.target.value.toUpperCase())}
                        placeholder="Ex: L2405"
                        disabled={isSomenteLeitura}
                      />
                      <Campo
                        label="Validade *"
                        value={validade}
                        onChange={(e) => {
                          setValidade(aplicarMascaraData(e.target.value));
                          if (erroValidade) setErroValidade(null);
                        }}
                        onBlur={() => {
                          const dataCompletada = completarAnoData(validade);
                          setValidade(dataCompletada);
                          const res = validarData(dataCompletada, true);
                          setErroValidade(res.valida ? null : res.erro || 'Data inválida');
                          if (res.valida && dataCompletada.length === 10) {
                            verificarValidadeEObrirOcorrencia(dataCompletada, fabricacao, lote, quantidade);
                          }
                        }}
                        placeholder="DD/MM/AAAA"
                        disabled={isSomenteLeitura}
                        error={erroValidade || undefined}
                      />
                      <Campo
                        label="Fabricação *"
                        value={fabricacao}
                        onChange={(e) => {
                          setFabricacao(aplicarMascaraData(e.target.value));
                          if (erroFabricacao) setErroFabricacao(null);
                        }}
                        onBlur={() => {
                          const dataCompletada = completarAnoData(fabricacao);
                          setFabricacao(dataCompletada);
                          if (dataCompletada.trim()) {
                            const res = validarData(dataCompletada, true);
                            setErroFabricacao(res.valida ? null : res.erro || 'Data inválida');
                          } else {
                            setErroFabricacao(null);
                          }
                        }}
                        placeholder="DD/MM/AAAA"
                        disabled={isSomenteLeitura}
                        error={erroFabricacao || undefined}
                      />
                    </div>
                  )}

                  {/* Botão Conferir Produto - Abaixo dos inputs de Lote, Validade e Fabricação */}
                  <div className="scanner-row-botao-conferir">
                    <Botao
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={processando || !codigo.trim() || isSomenteLeitura}
                      loading={processando}
                      style={isSomenteLeitura ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
                      className="btn-conferir-principal"
                    >
                      {processando ? 'Conferindo...' : 'Conferir Produto'}
                    </Botao>
                  </div>
                </form>

                {/* Rodapé para recolher e ver lista em 1 clique */}
                <div className="scanner-recolher-footer">
                  <button
                    type="button"
                    onClick={() => setScannerRecolhido(true)}
                    className="btn-recolher-footer"
                  >
                    ▲ Ocultar Topo e Ver Lista ({itensPendentesVisiveis.length} pendentes)
                  </button>
                </div>
              </Container>
            </Painel>
          </>
        )}
      </div>

      {/* Feedbacks de Operação */}
      {erro && (
        <div className="error-message" onClick={() => setErro(null)}>
          {erro}
        </div>
      )}

      {sucesso && (
        <Container variant="default" padding="sm" className="feedback-success">
          <strong>{sucesso}</strong>
        </Container>
      )}

      {/* Feedback Visual de Conferência com Foto */}
      {feedbackVisual && (
        <div className="feedback-overlay">
          <div className="feedback-card">
            <div className="feedback-img-wrapper">
              <span className="feedback-check">&#10003;</span>
              <img
                src={`/api/crud/produto/${feedbackVisual.codProd}/imagem`}
                alt={feedbackVisual.descrProd}
                className="feedback-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span className="feedback-nome">{feedbackVisual.descrProd}</span>
          </div>
        </div>
      )}

      {/* Listagem com Abas */}
      <Painel>
        <div className="tabs-container">
          <button
            type="button"
            className={`tab-button ${abaAtiva === 'pendentes' ? 'tab-active' : ''}`}
            onClick={() => setAbaAtiva('pendentes')}
          >
            Itens Pendentes <span className="tab-count">{itensPendentesVisiveis.length}</span>
          </button>
          <button
            type="button"
            className={`tab-button ${abaAtiva === 'conferidos' ? 'tab-active' : ''}`}
            onClick={() => setAbaAtiva('conferidos')}
          >
            Itens Conferidos <span className="tab-count">{itensConferidosVisiveis.length}</span>
          </button>
        </div>

        {/* Conteúdo da Aba 1: Itens Pendentes */}
        {abaAtiva === 'pendentes' && (
          <Container variant="outlined" padding="none">
            {itensPendentesVisiveis.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', textAlign: 'center' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', margin: 0 }}>
                  Todos os itens do Nível N{nivelAtual} foram conferidos!
                </p>
                <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                  Revise os produtos na aba "Itens Conferidos" ou conclua a contagem clicando no botão "Finalizar N{nivelAtual}" acima.
                </span>
              </div>
            ) : (
              <>
                {/* Visualização Desktop: Tabela */}
                <div className="itens-tabela-wrapper">
                  <table className="tabela-itens">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Volume</th>
                        <th>Esperado</th>
                        <th>Conferido N{nivelAtual}</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensPendentesVisiveis.map((item) => {
                        const conferido =
                          nivelAtual === 1
                            ? item.qtdConferidaN1
                            : nivelAtual === 2
                            ? item.qtdConferidaN2
                            : item.qtdConferidaN3;
                        const esperado = item.qtdneg !== null ? item.qtdneg : null;
                        const parcial = conferido > 0;

                        return (
                          <tr
                            key={`${item.nunota}-${item.sequencia}`}
                            className={parcial ? 'row-parcial' : ''}
                          >
                            <td>
                              <div className="produto-cell">
                                <img
                                  src={`/api/crud/produto/${item.codprod}/imagem`}
                                  alt={item.descrprod}
                                  className="produto-img"
                                  onClick={() => setImagemAmpliada(`/api/crud/produto/${item.codprod}/imagem`)}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div>
                                  <span className="produto-desc">{item.descrprod}</span>
                                  <span className="produto-barra">
                                    {multiplasNotas && (
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          background: '#e0f2fe',
                                          color: '#0369a1',
                                          fontWeight: 700,
                                          fontSize: '0.70rem',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          marginRight: '6px',
                                        }}
                                      >
                                        NF {item.numnota || item.nunota}
                                      </span>
                                    )}
                                    Cód: {item.codprod} | Ref: {item.referencia || '—'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="num-cell">{item.codvol || 'UN'}</td>
                            <td className="num-cell">{esperado !== null ? esperado : '— (Cega)'}</td>
                            <td className="num-cell">{conferido}</td>
                            <td>
                              {parcial ? (
                                <span className="status-parcial">Parcial</span>
                              ) : (
                                <span className="status-pendente">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visualização Mobile / Tablet: Cards */}
                <div className="itens-cards-mobile">
                  {itensPendentesVisiveis.map((item) => {
                    const conferido =
                      nivelAtual === 1
                        ? item.qtdConferidaN1
                        : nivelAtual === 2
                        ? item.qtdConferidaN2
                        : item.qtdConferidaN3;
                    const esperado = item.qtdneg !== null ? item.qtdneg : null;
                    const parcial = conferido > 0;

                    return (
                      <div
                        key={`card-${item.nunota}-${item.sequencia}`}
                        className={`item-card-mobile ${parcial ? 'item-card-parcial' : ''}`}
                        onClick={() => {
                          if (isSomenteLeitura) return;
                          const cod = item.codbarra || (item as any).referencia || String(item.codprod);
                          setCodigo(cod);
                          if (inputCodigoRef.current) inputCodigoRef.current.focus();
                        }}
                        style={{ cursor: isSomenteLeitura ? 'default' : 'pointer' }}
                        title={isSomenteLeitura ? undefined : 'Toque para selecionar este produto no leitor'}
                      >
                        <div className="item-card-header">
                          <img
                            src={`/api/crud/produto/${item.codprod}/imagem`}
                            alt={item.descrprod}
                            className="produto-img item-card-img"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImagemAmpliada(`/api/crud/produto/${item.codprod}/imagem`);
                            }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div className="item-card-info">
                            <span className="produto-desc item-card-title">{item.descrprod}</span>
                            <span className="produto-barra item-card-sub">
                              {multiplasNotas && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    fontWeight: 700,
                                    fontSize: '0.70rem',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    marginRight: '6px',
                                  }}
                                >
                                  NF {item.numnota || item.nunota}
                                </span>
                              )}
                              Cód: {item.codprod} | Ref: {item.referencia || '—'}
                            </span>
                          </div>
                          <div className="item-card-badge">
                            {parcial ? (
                              <span className="status-parcial">Parcial</span>
                            ) : (
                              <span className="status-pendente">Pendente</span>
                            )}
                          </div>
                        </div>

                        <div className="item-card-metrics">
                          <div className="item-card-metric-col">
                            <span className="item-metric-label">Embalagem</span>
                            <span className="item-metric-val">{item.codvol || 'UN'}</span>
                          </div>
                          <div className="item-card-metric-col">
                            <span className="item-metric-label">Esperado</span>
                            <span className="item-metric-val">{esperado !== null ? esperado : '— (Cega)'}</span>
                          </div>
                          <div className="item-card-metric-col">
                            <span className="item-metric-label">Conferido</span>
                            <span className="item-metric-val val-conferido">{conferido}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Container>
        )}

        {/* Conteúdo da Aba 2: Itens Conferidos */}
        {abaAtiva === 'conferidos' && (
          <Container variant="outlined" padding="none">
            {itensConferidosVisiveis.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--slate-500)', margin: 0 }}>
                  Nenhum item conferido no Nível N{nivelAtual} até o momento.
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                  Bipe um produto para registrar a primeira conferência.
                </span>
              </div>
            ) : (
              <>
                {/* Visualização Desktop: Tabela */}
                {/* Visualização Desktop: Tabela Padronizada com Colunas: Produto | Volume | Esperado | Conferido N{nivel} | Status */}
                <div className="itens-tabela-wrapper">
                  <table className="tabela-itens">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Volume</th>
                        <th>Esperado</th>
                        <th>Conferido N{nivelAtual}</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensConferidosVisiveis.map((confItem) => {
                        const chave = `${confItem.item.nunota}-${confItem.item.sequencia}`;
                        const isExpandido = !!lotesExpandidos[chave];
                        const esperado = confItem.item.qtdneg !== null ? confItem.item.qtdneg : null;
                        const conferido = confItem.conferido;
                        const temSobra = !isCega && esperado !== null && conferido > esperado;
                        const temFalta = !isCega && esperado !== null && conferido < esperado;
                        const temLotes = confItem.lotesDetalhes && confItem.lotesDetalhes.length > 0;
                        const ocorrenciasDoItem = ocorrenciasSessao.filter(
                          (oc) =>
                            oc.codprod === confItem.item.codprod &&
                            (oc.sequencia ? oc.sequencia === confItem.item.sequencia : true)
                        );

                        return (
                          <Fragment key={`frag-conf-${confItem.item.nunota}-${confItem.item.sequencia}`}>
                            <tr className="row-ok">
                              <td>
                                <div className="produto-cell">
                                  <img
                                    src={`/api/crud/produto/${confItem.item.codprod}/imagem`}
                                    alt={confItem.item.descrprod}
                                    className="produto-img"
                                    onClick={() => setImagemAmpliada(`/api/crud/produto/${confItem.item.codprod}/imagem`)}
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                  <div>
                                    <span className="produto-desc">{confItem.item.descrprod}</span>
                                    <span className="produto-barra">
                                      {multiplasNotas && (
                                        <span
                                          style={{
                                            display: 'inline-block',
                                            background: '#e0f2fe',
                                            color: '#0369a1',
                                            fontWeight: 700,
                                            fontSize: '0.70rem',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            marginRight: '6px',
                                          }}
                                        >
                                          NF {confItem.item.numnota || confItem.item.nunota}
                                        </span>
                                      )}
                                      Cód: {confItem.item.codprod} | Ref: {confItem.item.referencia || '—'}
                                    </span>
                                    {renderTagsOcorrencia(ocorrenciasDoItem)}
                                  </div>
                                </div>
                              </td>

                              <td className="num-cell">{confItem.item.codvol || 'UN'}</td>

                              <td className="num-cell">{esperado !== null ? esperado : '— (Cega)'}</td>

                              <td
                                className="num-cell"
                                style={{
                                  color: temSobra ? 'var(--rose-600)' : 'var(--emerald-600)',
                                  fontWeight: 800,
                                }}
                              >
                                <div>
                                  <span style={{ fontSize: '1.05rem' }}>{conferido}</span>
                                  {temSobra && (
                                    <span
                                      style={{
                                        display: 'block',
                                        fontSize: '0.70rem',
                                        color: 'var(--rose-600)',
                                        fontWeight: 700,
                                      }}
                                    >
                                      Sobra (+{conferido - esperado!})
                                    </span>
                                  )}
                                  {temLotes && (
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setLotesExpandidos((prev) => ({ ...prev, [chave]: !prev[chave] }))
                                        }
                                        className={`chip-dropdown-lote ${isExpandido ? 'ativo' : ''}`}
                                        title="Clique para ver ou ocultar os lotes, validades e fabricações"
                                      >
                                        <span>
                                          🏷️ {confItem.lotesDetalhes.length}{' '}
                                          {confItem.lotesDetalhes.length > 1 ? 'Lotes' : 'Lote'}
                                        </span>
                                        <span>{isExpandido ? '▲' : '▼'}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                  {temSobra ? (
                                    <span className="status-parcial" style={{ background: '#ffe4e6', color: '#be123c' }}>
                                      Sobra (+{conferido - esperado!})
                                    </span>
                                  ) : temFalta ? (
                                    <span className="status-parcial">
                                      Parcial ({conferido}/{esperado})
                                    </span>
                                  ) : (
                                    <span className="status-ok">✓ Conferido</span>
                                  )}

                                  <div style={{ display: 'inline-flex', gap: '4px' }}>
                                    <button
                                      type="button"
                                      className="btn-estornar-item"
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.72rem',
                                        background: '#fffbeb',
                                        borderColor: '#fde68a',
                                        color: '#b45309',
                                        ...(isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}),
                                      }}
                                      title={isSomenteLeitura ? 'Conferência finalizada (somente leitura)' : 'Apontar avaria, vencido ou divergência para este item'}
                                      disabled={isSomenteLeitura}
                                      onClick={() => !isSomenteLeitura && handleAbrirOcorrenciaItem(confItem.item)}
                                    >
                                      <span>⚠️ Ocorrência</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn-estornar-item"
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.72rem',
                                        ...(isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}),
                                      }}
                                      title={isSomenteLeitura ? 'Conferência finalizada (somente leitura)' : 'Estornar a última bipagem registrada deste item'}
                                      disabled={isSomenteLeitura || !confItem.ultimoBip}
                                      onClick={() => !isSomenteLeitura && confItem.ultimoBip && setBipagemParaEstornar(confItem.ultimoBip)}
                                    >
                                      <span>↺ Bip</span>
                                    </button>

                                    {confItem.conferido > 0 && (
                                      <button
                                        type="button"
                                        className="btn-estornar-item"
                                        style={{
                                          padding: '3px 8px',
                                          fontSize: '0.72rem',
                                          background: '#fff1f2',
                                          borderColor: '#fecdd3',
                                          color: '#dc2626',
                                          ...(isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}),
                                        }}
                                        title={isSomenteLeitura ? 'Conferência finalizada (somente leitura)' : 'Estornar toda a contagem deste item neste nível'}
                                        disabled={isSomenteLeitura}
                                        onClick={() => {
                                          if (isSomenteLeitura) return;
                                          const todosBipIds = confItem.lotesDetalhes.flatMap((l) => l.bipagemIds);
                                          setLoteParaEstornar({
                                            descrprod: confItem.item.descrprod,
                                            lote: 'TODOS OS LOTES / TOTAL',
                                            bipagemIds: todosBipIds,
                                            quantidade: confItem.conferido,
                                          });
                                        }}
                                      >
                                        <span>✕ Zerar</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {/* Sub-linha Gaveta (Dropdown Accordion) com Colunas Separadas: Lote | Quantidade | Validade | Fabricação | Ações */}
                            {isExpandido && temLotes && (
                              <tr className="subrow-lotes-drawer">
                                <td colSpan={5}>
                                  <div className="drawer-lotes-wrapper">
                                    <div className="drawer-lotes-header">
                                      <span>
                                        Detalhamento dos Lotes ({confItem.lotesDetalhes.length}{' '}
                                        {confItem.lotesDetalhes.length > 1 ? 'Lotes' : 'Lote'} • Total:{' '}
                                        {confItem.conferido} {confItem.item.codvol || 'UN'})
                                      </span>
                                      <span style={{ fontSize: '0.70rem', color: 'var(--slate-500)', textTransform: 'none' }}>
                                        Última bipagem: {formatarDataHora(confItem.ultimoHorario)}
                                      </span>
                                    </div>

                                    <table className="mini-tabela-lotes">
                                      <thead>
                                        <tr>
                                          <th style={{ width: '25%' }}>Lote</th>
                                          <th style={{ width: '20%' }}>Quantidade</th>
                                          <th style={{ width: '25%' }}>Data de Validade</th>
                                          <th style={{ width: '20%' }}>Data de Fabricação</th>
                                          <th style={{ width: '10%', textAlign: 'right' }}>Ação</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {confItem.lotesDetalhes.map((ld, lIdx) => {
                                          const ocorrenciasDoLote = ocorrenciasSessao.filter((oc) => {
                                            if (oc.codprod !== confItem.item.codprod) return false;
                                            if (!oc.lote || !ld.lote) return false;
                                            if (oc.lote.trim().toUpperCase() !== ld.lote.trim().toUpperCase()) return false;
                                            if (oc.validade && ld.validade) {
                                              return formatarDataApenas(oc.validade) === formatarDataApenas(ld.validade);
                                            }
                                            return true;
                                          });
                                          return (
                                          <tr key={lIdx}>
                                            <td>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <span
                                                  style={{
                                                    fontFamily: 'JetBrains Mono, monospace',
                                                    fontWeight: 700,
                                                    color: 'var(--slate-900)',
                                                    background: '#f1f5f9',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--slate-200)',
                                                  }}
                                                >
                                                  🏷️ {ld.lote}
                                                </span>
                                                {renderTagsOcorrencia(ocorrenciasDoLote)}
                                              </div>
                                            </td>
                                            <td>
                                              <strong style={{ color: 'var(--emerald-600)', fontFamily: 'JetBrains Mono, monospace' }}>
                                                {ld.quantidade} {confItem.item.codvol || 'UN'}
                                              </strong>
                                            </td>
                                            <td>
                                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem' }}>
                                                {ld.validade ? `📅 ${formatarDataApenas(ld.validade)}` : '—'}
                                              </span>
                                            </td>
                                            <td>
                                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem' }}>
                                                {ld.fabricacao ? `🏭 ${formatarDataApenas(ld.fabricacao)}` : '—'}
                                              </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                              <button
                                                type="button"
                                                className="btn-estorno-lote-clean"
                                                title={isSomenteLeitura ? 'Conferência finalizada (somente leitura)' : `Estornar as contagens do Lote ${ld.lote}`}
                                                disabled={isSomenteLeitura}
                                                style={isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
                                                onClick={() => {
                                                  if (isSomenteLeitura) return;
                                                  setLoteParaEstornar({
                                                    descrprod: confItem.item.descrprod,
                                                    lote: ld.lote,
                                                    bipagemIds: ld.bipagemIds,
                                                    quantidade: ld.quantidade,
                                                  });
                                                }}
                                              >
                                                ✕ Estornar
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visualização Mobile / Tablet: Cards */}
                <div className="itens-cards-mobile">
                  {itensConferidosVisiveis.map((confItem) => {
                    const ocorrenciasDoItem = ocorrenciasSessao.filter(
                      (oc) =>
                        oc.codprod === confItem.item.codprod &&
                        (oc.sequencia ? oc.sequencia === confItem.item.sequencia : true)
                    );

                    return (
                    <div key={`card-conf-${confItem.item.nunota}-${confItem.item.sequencia}`} className="item-card-mobile item-card-conferido">
                      <div className="item-card-header">
                        <img
                          src={`/api/crud/produto/${confItem.item.codprod}/imagem`}
                          alt={confItem.item.descrprod}
                          className="produto-img item-card-img"
                          onClick={() => setImagemAmpliada(`/api/crud/produto/${confItem.item.codprod}/imagem`)}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="item-card-info">
                          <span className="produto-desc item-card-title">{confItem.item.descrprod}</span>
                          <span className="produto-barra item-card-sub">
                            {multiplasNotas && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  fontWeight: 700,
                                  fontSize: '0.70rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  marginRight: '6px',
                                }}
                              >
                                NF {confItem.item.numnota || confItem.item.nunota}
                              </span>
                            )}
                            Cód: {confItem.item.codprod} | Ref: {confItem.item.referencia || '—'}
                          </span>
                          {renderTagsOcorrencia(ocorrenciasDoItem)}
                        </div>
                        <div className="item-card-time">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>{formatarDataHora(confItem.ultimoHorario)}</span>
                        </div>
                      </div>

                      <div className="item-card-metrics">
                        <div className="item-card-metric-col" style={{ flex: 1.5 }}>
                          <span className="item-metric-label">Lote(s)</span>
                          {confItem.lotesDetalhes.length > 1 ? (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  const chave = `mob-${confItem.item.nunota}-${confItem.item.sequencia}`;
                                  setLotesExpandidos((prev) => ({ ...prev, [chave]: !prev[chave] }));
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                }}
                              >
                                <span>🏷️ {confItem.lotesDetalhes.length} Lotes</span>
                                <span>{lotesExpandidos[`mob-${confItem.item.nunota}-${confItem.item.sequencia}`] ? '▲' : '▼'}</span>
                              </button>
                            </div>
                          ) : confItem.lotesDetalhes.length === 1 ? (
                            <span className="item-metric-val">
                              {confItem.lotesDetalhes[0].lote}
                              {confItem.lotesDetalhes[0].validade ? (
                                <small style={{ display: 'block', fontSize: '0.68rem', color: 'var(--slate-500)' }}>
                                  Val: {confItem.lotesDetalhes[0].validade}
                                </small>
                              ) : null}
                            </span>
                          ) : (
                            <span className="item-metric-val">{confItem.lote || '—'}</span>
                          )}
                        </div>

                        <div className="item-card-metric-col">
                          <span className="item-metric-label">Unidade</span>
                          <span className="item-metric-val">{confItem.item.codvol || 'UN'}</span>
                        </div>

                        <div className="item-card-metric-col">
                          <span className="item-metric-label">Qtd Conferida</span>
                          <span
                            className={`item-metric-val ${
                              confItem.item.qtdneg !== null && confItem.conferido > confItem.item.qtdneg
                                ? 'text-danger'
                                : 'val-conferido-ok'
                            }`}
                          >
                            {confItem.conferido}
                            {confItem.item.qtdneg !== null && confItem.conferido > confItem.item.qtdneg && (
                              <small style={{ display: 'block', fontSize: '0.7rem', color: 'var(--rose-600)' }}>
                                Sobra (+{confItem.conferido - confItem.item.qtdneg})
                              </small>
                            )}
                          </span>
                        </div>

                        <div className="item-card-actions">
                          <button
                            type="button"
                            className="btn-estornar-item btn-estornar-card"
                            title={isSomenteLeitura ? 'Conferência finalizada (somente leitura)' : 'Apontar avaria, vencido ou divergência para este item'}
                            disabled={isSomenteLeitura}
                            style={{
                              background: '#fffbeb',
                              borderColor: '#fde68a',
                              color: '#b45309',
                              marginRight: '6px',
                              ...(isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}),
                            }}
                            onClick={() => !isSomenteLeitura && handleAbrirOcorrenciaItem(confItem.item)}
                          >
                            <span>⚠️ Ocorrência</span>
                          </button>

                          <button
                            type="button"
                            className="btn-estornar-item btn-estornar-card"
                            title={isSomenteLeitura ? 'Conferência finalizada (somente leitura)' : 'Estornar a última bipagem deste item'}
                            disabled={isSomenteLeitura || !confItem.ultimoBip}
                            style={isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : undefined}
                            onClick={() => !isSomenteLeitura && confItem.ultimoBip && setBipagemParaEstornar(confItem.ultimoBip)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>Último</span>
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Mobile de Lotes */}
                      {confItem.lotesDetalhes.length > 1 && lotesExpandidos[`mob-${confItem.item.nunota}-${confItem.item.sequencia}`] && (
                        <div
                          style={{
                            marginTop: '8px',
                            background: 'var(--slate-50)',
                            padding: '8px',
                            borderRadius: '6px',
                            border: '1px solid var(--slate-200)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                              Detalhamento de Lotes Conferidos:
                            </span>
                            <button
                              type="button"
                              disabled={isSomenteLeitura}
                              onClick={() => {
                                if (isSomenteLeitura) return;
                                const todosBipIds = confItem.lotesDetalhes.flatMap((l) => l.bipagemIds);
                                setLoteParaEstornar({
                                  descrprod: confItem.item.descrprod,
                                  lote: 'TODOS OS LOTES / TOTAL',
                                  bipagemIds: todosBipIds,
                                  quantidade: confItem.conferido,
                                });
                              }}
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.70rem',
                                fontWeight: 700,
                                ...(isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}),
                              }}
                            >
                              ✕ Zerar Todos os Lotes
                            </button>
                          </div>

                          {confItem.lotesDetalhes.map((ld, lIdx) => {
                            const ocorrenciasDoLote = ocorrenciasSessao.filter((oc) => {
                              if (oc.codprod !== confItem.item.codprod) return false;
                              if (!oc.lote || !ld.lote) return false;
                              if (oc.lote.trim().toUpperCase() !== ld.lote.trim().toUpperCase()) return false;
                              if (oc.validade && ld.validade) {
                                return formatarDataApenas(oc.validade) === formatarDataApenas(ld.validade);
                              }
                              return true;
                            });
                            return (
                            <div
                              key={lIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#ffffff',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--slate-200)',
                                fontSize: '0.75rem',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <strong>🏷️ {ld.lote}</strong>
                                  <span style={{ color: 'var(--emerald-600)', fontWeight: 800 }}>
                                    ({ld.quantidade} un)
                                  </span>
                                  {renderTagsOcorrencia(ocorrenciasDoLote)}
                                </div>
                                {ld.validade && (
                                  <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.70rem', marginTop: '2px' }}>
                                    Val: {ld.validade} {ld.fabricacao ? `• Fab: ${ld.fabricacao}` : ''}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={isSomenteLeitura}
                                onClick={() => {
                                  if (isSomenteLeitura) return;
                                  setLoteParaEstornar({
                                    descrprod: confItem.item.descrprod,
                                    lote: ld.lote,
                                    bipagemIds: ld.bipagemIds,
                                    quantidade: ld.quantidade,
                                  });
                                }}
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  fontSize: '0.70rem',
                                  fontWeight: 600,
                                  ...(isSomenteLeitura ? { opacity: 0.4, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}),
                                }}
                              >
                                ✕ Estornar
                              </button>
                            </div>
                          );
                          })}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              </>
            )}
          </Container>
        )}
      </Painel>

      {/* Modal Câmera Scanner */}
      <ModalCameraScanner
        aberto={mostrarCamera}
        onFechar={() => setMostrarCamera(false)}
        onScan={handleScanCamera}
      />

      {/* Modal OCR */}
      {modalOcrAberto && (
        <div className="modal-overlay" onClick={() => setModalOcrAberto(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">Extração OCR da Etiqueta</h2>
              <button className="modal-close" onClick={() => setModalOcrAberto(false)}>×</button>
            </div>
            <p className="modal-subtitle">
              Cole o texto da etiqueta ou capture pela câmera para preencher {campoOcrAlvo.toUpperCase()}.
            </p>
            <div style={{ margin: '16px 0' }}>
              <textarea
                className="ocr-textarea"
                rows={5}
                placeholder="Ex: LOTE: L240501 VAL: 10/12/2026..."
                value={textoOcrBruto}
                onChange={(e) => setTextoOcrBruto(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <Botao variant="secondary" size="md" onClick={() => setModalOcrAberto(false)}>
                Cancelar
              </Botao>
              <Botao variant="primary" size="md" onClick={handleAplicarOcr} disabled={!textoOcrBruto.trim()}>
                Extrair e Aplicar
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal Finalizar Nível */}
      {modalFinalizarAberto && (
        <div className="modal-overlay" onClick={() => !processando && setModalFinalizarAberto(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">Finalizar Nível N{nivelAtual}</h2>
              <button className="modal-close" onClick={() => setModalFinalizarAberto(false)} disabled={processando}>×</button>
            </div>
            <p className="modal-subtitle">
              Confira o resumo da contagem física do <strong>Nível N{nivelAtual}</strong> antes de confirmar o fechamento:
            </p>

            {/* Resumo consolidado */}
            <div
              style={{
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '12px 14px',
                margin: '12px 0 8px 0',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Itens com Bipagem:</strong> {estatisticas.itensConferidosOk} de {estatisticas.totalItensDistintos}</span>
                <span><strong>Total de Unidades Bipadas:</strong> {estatisticas.totalConferidoNivel}</span>
              </div>
            </div>

            {/* Resumo individual por Nota Fiscal */}
            {estatisticas.porNota.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-600)', textTransform: 'uppercase' }}>
                  Detalhamento por Nota Fiscal ({estatisticas.porNota.length}):
                </div>
                {estatisticas.porNota.map((nota) => {
                  const is100Ok = nota.itensOk === nota.totalItens && (!isCega ? nota.itensComSobra === 0 : true);
                  const temSobra = !isCega && nota.itensComSobra > 0;
                  const temFalta = nota.itensComFalta > 0;

                  return (
                    <div
                      key={nota.nunota}
                      style={{
                        background: is100Ok ? '#f0fdf4' : temSobra ? '#fef2f2' : '#fffbeb',
                        border: `1px solid ${is100Ok ? '#bbf7d0' : temSobra ? '#fecaca' : '#fde68a'}`,
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-800)' }}>
                          Nota {nota.numnota} <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--slate-500)' }}>(#{nota.nunota})</span>
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: is100Ok ? '#dcfce7' : temSobra ? '#fee2e2' : '#fef3c7',
                            color: is100Ok ? '#166534' : temSobra ? '#991b1b' : '#92400e',
                          }}
                        >
                          {is100Ok ? '✅ 100% OK' : temSobra ? '⚠️ Com Sobra' : `⏳ ${nota.itensComFalta} pendente(s)`}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>Itens: <strong>{nota.itensOk}/{nota.totalItens} OK</strong></span>
                        {isCega ? (
                          <span>Unidades Bipadas: <strong>{nota.totalConferido}</strong></span>
                        ) : (
                          <span>Unidades: <strong>{nota.totalConferido}/{nota.totalEsperado}</strong></span>
                        )}
                        {nota.itensSemBipagem > 0 && (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>Zero bipagens: {nota.itensSemBipagem}</span>
                        )}
                        {!isCega && nota.itensComSobra > 0 && (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Sobras: {nota.itensComSobra}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alerta de Itens Sem Bipagem (Falta Física) */}
            {estatisticas.itensSemBipagem > 0 && (
              <div
                style={{
                  margin: '10px 0',
                  padding: '10px 12px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  color: '#92400e',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                  ⚠️ Atenção: {estatisticas.itensSemBipagem} produto(s) não receberam nenhuma bipagem e serão apontados como FALTA física.
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    checked={cienteItensFaltantes}
                    onChange={(e) => setCienteItensFaltantes(e.target.checked)}
                    style={{ marginTop: '2px', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-800)', fontWeight: 500 }}>
                    Estou ciente de que existem itens não conferidos e confirmo o encerramento da contagem com falta.
                  </span>
                </label>
              </div>
            )}

            {/* Alerta de Sobra */}
            {!isCega && estatisticas.itensComSobra > 0 && (
              <div
                style={{
                  margin: '8px 0',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                ⚠️ <strong>Atenção:</strong> {estatisticas.itensComSobra} produto(s) possuem quantidade bipada <u>maior</u> que a nota fiscal (sobra). Se confirmar agora, a conferência dessa nota será finalizada com status <strong>Divergente</strong>.
              </div>
            )}

            {nivelAtual === 1 && (
              <div style={{ margin: '8px 0', color: 'var(--slate-600)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                ℹ️ O sistema comparará com as notas fiscais. Havendo divergência, a nota avançará para o Nível N2 (Recontagem).
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '14px' }}>
              <Botao variant="secondary" size="md" onClick={() => setModalFinalizarAberto(false)} disabled={processando}>
                Cancelar
              </Botao>
              <Botao
                variant="success"
                size="md"
                onClick={handleFinalizarNivel}
                loading={processando}
                disabled={processando || (estatisticas.itensSemBipagem > 0 && !cienteItensFaltantes)}
              >
                Confirmar Fechamento
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resultado Pós-Fechamento */}
      {modalResultadoAberto && resultadoFinalizacao && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">
                {resultadoFinalizacao.possuiDivergencias
                  ? '⚠️ Fechamento com Divergências'
                  : resultadoFinalizacao.statusFinal === 'Conferido'
                  ? '✅ Carga Aprovada com Sucesso!'
                  : `✅ Nível N${nivelAtual} Concluído`}
              </h2>
            </div>
            <p className="modal-subtitle">
              {resultadoFinalizacao.statusFinal === 'Conferido'
                ? 'Todas as notas foram conferidas com 100% de exatidão e estão liberadas para envio ao ERP Sankhya.'
                : resultadoFinalizacao.statusFinal === 'Aguardando N2'
                ? 'A 1ª Contagem (N1) foi finalizada. As notas estão prontas para a 2ª Contagem física (N2 com Lote e Validade).'
                : resultadoFinalizacao.possuiDivergenciasQtd
                ? 'Identificamos divergências físicas de quantidade. Veja o status atribuído a cada nota abaixo:'
                : 'Quantidade física 100% conferida, porém com divergência de Lote/Validade em relação ao cadastro da nota. Encaminhado para a Gerência de Recebimento para autorização do gestor.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
              {(resultadoFinalizacao.resumoPorNota || []).map((resNota) => {
                const isAprovada = resNota.status === 'Conferido';
                const isDivergente = resNota.status === 'Divergente';
                const isLotePuro = isDivergente && resNota.itensComSobra === 0 && resNota.itensPendentes === 0;

                return (
                  <div
                    key={resNota.nunota}
                    style={{
                      background: isAprovada ? '#f0fdf4' : isDivergente ? '#fef2f2' : '#eff6ff',
                      border: `1px solid ${isAprovada ? '#bbf7d0' : isDivergente ? '#fecaca' : '#bfdbfe'}`,
                      borderRadius: '8px',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--slate-800)' }}>
                        Nota {resNota.numnota} <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--slate-500)' }}>(#{resNota.nunota})</span>
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isAprovada ? '#dcfce7' : isDivergente ? '#fee2e2' : '#dbeafe',
                          color: isAprovada ? '#166534' : isDivergente ? '#991b1b' : '#1e40af',
                        }}
                      >
                        {isAprovada
                          ? '✅ Aprovada / 100% OK'
                          : isDivergente
                          ? isLotePuro
                            ? '⚠️ Lote Divergente → Gerência'
                            : '⚠️ Divergente → Auditoria N3'
                          : '⏳ Aguardando N2'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                      Itens Corretos: <strong>{resNota.itensConferidosOk} de {resNota.totalItens}</strong>
                      {resNota.itensComSobra > 0 && <span style={{ color: '#dc2626' }}> • {resNota.itensComSobra} com sobra</span>}
                      {resNota.itensPendentes > 0 && <span style={{ color: '#d97706' }}> • {resNota.itensPendentes} pendentes/falta</span>}
                      {isLotePuro && <span style={{ color: '#b45309' }}> • Divergência de Lote/Validade</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <Botao
                variant="secondary"
                size="md"
                onClick={() => {
                  setModalResultadoAberto(false);
                  navigate('/recebimento');
                }}
              >
                Voltar ao Recebimento
              </Botao>
              {resultadoFinalizacao.statusFinal === 'Aguardando N2' && temPermissao('conferencia_entrada_n2') && (
                <Botao
                  variant="primary"
                  size="md"
                  onClick={() => handleAvancarParaNivel(2)}
                  loading={processando}
                >
                  Iniciar 2ª Contagem (N2)
                </Botao>
              )}
              {resultadoFinalizacao.statusFinal === 'Conferido' && (
                <Botao
                  variant="success"
                  size="md"
                  onClick={() => {
                    setModalResultadoAberto(false);
                    navigate('/recebimento');
                  }}
                >
                  Concluir
                </Botao>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Estorno de Bipagem Única */}
      {bipagemParaEstornar && (
        <div className="modal-overlay" onClick={() => !estornando && setBipagemParaEstornar(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title" style={{ color: 'var(--rose-600)' }}>Estornar Último Bip</h2>
              <button className="modal-close" onClick={() => setBipagemParaEstornar(null)} disabled={estornando}>×</button>
            </div>
            <p className="modal-subtitle">Deseja realmente anular esta bipagem?</p>
            <div
              style={{
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '12px 16px',
                margin: '16px 0',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}
            >
              <div><strong>Código:</strong> {bipagemParaEstornar.codbarra} (Cód: {bipagemParaEstornar.codprod})</div>
              <div><strong>Quantidade a Estornar:</strong> -{bipagemParaEstornar.qtdConferida}</div>
              <div><strong>Lote:</strong> {bipagemParaEstornar.lote || 'Sem lote'}</div>
              <div><strong>Nível:</strong> N{bipagemParaEstornar.nivel}</div>
            </div>
            <div className="modal-actions">
              <Botao variant="secondary" size="md" onClick={() => setBipagemParaEstornar(null)} disabled={estornando}>
                Cancelar
              </Botao>
              <Botao variant="danger" size="md" onClick={handleConfirmarEstorno} loading={estornando}>
                Confirmar Estorno
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Estorno de Lote Específico / Zerar Item */}
      {loteParaEstornar && (
        <div className="modal-overlay" onClick={() => !estornando && setLoteParaEstornar(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title" style={{ color: 'var(--rose-600)' }}>
                {loteParaEstornar.lote.startsWith('TODOS') ? 'Zerar Contagem do Item' : 'Estornar Lote Específico'}
              </h2>
              <button className="modal-close" onClick={() => setLoteParaEstornar(null)} disabled={estornando}>×</button>
            </div>
            <p className="modal-subtitle">
              {loteParaEstornar.lote.startsWith('TODOS')
                ? 'Todas as bipagens e lotes deste produto registradas neste nível serão anuladas.'
                : 'Todas as bipagens registradas especificamente para este lote serão anuladas.'}
            </p>
            <div
              style={{
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '12px 16px',
                margin: '16px 0',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}
            >
              <div><strong>Produto:</strong> {loteParaEstornar.descrprod}</div>
              <div><strong>Lote:</strong> {loteParaEstornar.lote}</div>
              <div><strong>Quantidade a Estornar:</strong> -{loteParaEstornar.quantidade} un ({loteParaEstornar.bipagemIds.length} bipagens)</div>
            </div>
            <div className="modal-actions">
              <Botao variant="secondary" size="md" onClick={() => setLoteParaEstornar(null)} disabled={estornando}>
                Cancelar
              </Botao>
              <Botao variant="danger" size="md" onClick={handleConfirmarEstornoLoteCompleto} loading={estornando}>
                Confirmar Estorno
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Imagem Ampliada */}
      {imagemAmpliada && (
        <div className="modal-overlay" onClick={() => setImagemAmpliada(null)}>
          <div className="modal-card" style={{ maxWidth: '420px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={imagemAmpliada}
              alt="Produto ampliado"
              style={{ width: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain' }}
            />
            <div style={{ marginTop: '14px', textAlign: 'right' }}>
              <Botao variant="secondary" size="sm" onClick={() => setImagemAmpliada(null)}>
                Fechar
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Ocorrência / Avaria */}
      {modalOcorrenciaAberto && (
        <ModalRegistrarOcorrencia
          isOpen={modalOcorrenciaAberto}
          onClose={() => setModalOcorrenciaAberto(false)}
          conferenciaId={sessao?.id || ''}
          nunota={itemParaOcorrencia?.nunota || sessao?.nunotas[0] || 0}
          numnota={itemParaOcorrencia?.numnota || itens.find((i) => i.nunota === (itemParaOcorrencia?.nunota || sessao?.nunotas[0]))?.numnota}
          item={itemParaOcorrencia}
          tipoPredefinido={tipoOcorrenciaModal}
          origem="COLETOR"
          bipagensSessao={bipagens}
          onSalvar={handleSalvarOcorrencia}
        />
      )}

      {/* Modal de Lista de Ocorrências da Sessão */}
      {modalListaOcorrenciasAberto && (
        <ModalListaOcorrenciasSessao
          isOpen={modalListaOcorrenciasAberto}
          onClose={() => setModalListaOcorrenciasAberto(false)}
          ocorrencias={ocorrenciasSessao}
          isSomenteLeitura={isSomenteLeitura}
          onRemoverOcorrencia={async (id) => {
            await recebimentoService.removerOcorrencia(id);
            if (sessao) await carregarOcorrencias(sessao.id);
          }}
        />
      )}

      {/* Modal Folha de Bipagem (PDF / Impressão A4) */}
      {showFolhaBipagemModal && (
        <ModalFolhaBipagem
          modulo="RECEBIMENTO"
          identificadorNota={`NF(s) ${numerosNFsUnicas.join(', ')}`}
          nunota={sessao?.nunotas?.join(', ')}
          parceiro={itens.find((i) => i.nomeparc)?.nomeparc || '—'}
          itens={itensFolhaNormalizados}
          verCamposSensiveis={verCamposSensiveis}
          onClose={() => setShowFolhaBipagemModal(false)}
        />
      )}
    </div>
  );
}
