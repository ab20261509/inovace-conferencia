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
import { Botao, Campo, Container, Label, Painel, ModalCameraScanner } from '../components';
import { Loading } from '../components/Loading/Loading';
import { prepararAudio, tocarAlertaErro, tocarAlertaSucesso } from '../../infrastructure/audio/alertas';
import { extractFieldValue, normalizeDate } from '../../infrastructure/utils/ocrParser';

const recebimentoService = new RecebimentoApiService();

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
  const location = useLocation();
  const navigate = useNavigate();

  const navState = location.state as { nunotas?: number[]; conferenciaId?: string; nivel?: number } | null;
  const nunotas = useMemo(() => navState?.nunotas || [], [navState]);
  const nivelInicial = navState?.nivel;

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

  // Feedback Visual Pop-up
  const [feedbackVisual, setFeedbackVisual] = useState<{ codProd: number; descrProd: string } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputCodigoRef = useRef<HTMLInputElement>(null);

  const podeAcessar = temPermissao('conferencia_entrada');

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

        // Se a sessão estiver como "Em Aberto", "Aguardando N2", "Aguardando N3" ou faltam notas passadas pela seleção:
        if (
          sessaoAtual.status === 'Em Aberto' ||
          sessaoAtual.status === 'Aguardando N2' ||
          sessaoAtual.status === 'Aguardando N3' ||
          notasFaltando.length > 0
        ) {
          const nunotasParaIniciar = Array.from(new Set([...sessaoAtual.nunotas, ...(navState.nunotas || [])]));
          sessaoAtual = await recebimentoService.iniciarConferencia(nunotasParaIniciar, sessaoAtual.nivelAtual);
          const respAtualizada = await recebimentoService.obterItensConferencia(sessaoAtual.id);
          setSessao(sessaoAtual);
          setItens(respAtualizada.itens);
          setBipagens(respAtualizada.bipagens);
          return;
        }

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

  const nivelAtual = sessao?.nivelAtual || 1;

  // Estatísticas consolidadas e por nota
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

    let itensComSobra = 0;
    let itensExatos = 0;
    let itensSemBipagem = 0;
    let itensComFalta = 0;

    itens.forEach((i) => {
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
        if (conferido > 0) itensExatos++;
        else itensSemBipagem++;
      }
    });

    const itensConferidosOk = itensExatos + itensComSobra;

    // Estatísticas por Nota Fiscal individual
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
        if (conferido > 0) notasMap[nunota].itensOk++;
        else notasMap[nunota].itensSemBipagem++;
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
  }, [itens, nivelAtual]);

  const numerosNFsUnicas = useMemo(() => {
    const nfs = Array.from(new Set(itens.map((i) => i.numnota).filter(Boolean)));
    if (nfs.length > 0) return nfs.map(String);
    return sessao?.nunotas.map(String) || [];
  }, [itens, sessao]);
  const multiplasNotas = numerosNFsUnicas.length > 1;

  // Bloqueio de colar
  const handleTentativaColar = () => {
    setErro('⚠️ Bloqueio de Segurança: É obrigatório ler o código fisicamente com o leitor ou câmera!');
    tocarAlertaErro();
  };

  // Bipagem
  const handleBipar = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const codLimpo = codigo.trim();
    if (!codLimpo || !sessao) return;

    if (nivelAtual >= 2 && (!lote.trim() || !validade.trim())) {
      setErro('⚠️ No Nível N2/N3, é obrigatório preencher Lote e Validade antes de registrar!');
      tocarAlertaErro();
      return;
    }

    setProcessando(true);
    setErro(null);
    setSucesso(null);

    try {
      const resp = await recebimentoService.bipar(sessao.id, {
        codigo: codLimpo,
        quantidade: Number(quantidade) || 1,
        nivel: nivelAtual,
        lote: lote.trim() || undefined,
        validade: validade.trim() || undefined,
        fabricacao: fabricacao.trim() || undefined,
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
            };
          }
          return it;
        })
      );

      setCodigo('');
      setQuantidade('1');
      if (inputCodigoRef.current) inputCodigoRef.current.focus();
    } catch (err: any) {
      tocarAlertaErro();
      setErro(err.response?.data?.error || err.message || 'Erro ao registrar bipagem.');
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
      if (normalizado) setValidade(normalizado);
    } else if (campoOcrAlvo === 'fabricacao') {
      const extraido = extractFieldValue(textoOcrBruto, 'fabricacao');
      const normalizado = extraido ? normalizeDate(extraido) : null;
      if (normalizado) setFabricacao(normalizado);
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

      // Recarrega itens atualizados da conferência para garantir sincronia
      const respAtualizada = await recebimentoService.obterItensConferencia(sessao.id);
      setItens(respAtualizada.itens);
      setBipagens(respAtualizada.bipagens);

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
    return itens.filter((item) => {
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
      const completo = esperado !== null ? conferido >= esperado : conferido > 0;
      return !completo;
    });
  }, [itens, nivelAtual, sessao]);

  const itensConferidosVisiveis = useMemo<ItemEntradaConferidoVisivel[]>(() => {
    return itens
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
        const completo = esperado !== null ? conferido >= esperado : conferido > 0;

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
  }, [itens, bipagensValidas, nivelAtual]);

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

  if (loading && !sessao) {
    return <Loading fullscreen mensagem="Iniciando conferência de entrada..." />;
  }

  return (
    <div className="page-container">
      {/* Top Fixo: Header + Scanner Panel */}
      <div className="conferencia-top-fixo">
        <header className="page-header">
          <Botao variant="ghost" size="sm" onClick={() => navigate('/recebimento')}>
            ← Voltar
          </Botao>

          <div className="header-info">
            <h1>Conferência #{sessao?.id.slice(0, 8)}</h1>
            <span className="nota-info">
              NF(s) {numerosNFsUnicas.join(', ')} — Recebimento
            </span>
            <span className="badge-recontagem-header" title="Nível atual da conferência">
              N{nivelAtual}: {nivelAtual === 1 ? 'Contagem Cega' : nivelAtual === 2 ? 'Lote e Validade' : 'Desempate de Divergência'}
            </span>
          </div>

          <div className="header-cards">
            <Container variant="default" padding="sm" className="resumo-card-inline">
              <Label variant="value">{estatisticas.totalItensDistintos}</Label>
              <Label variant="caption">Total</Label>
            </Container>
            <Container variant="default" padding="sm" className="resumo-card-inline conferido">
              <Label variant="value" className="text-success">{estatisticas.itensConferidosOk}</Label>
              <Label variant="caption">Conferidos</Label>
            </Container>
            <Container variant="default" padding="sm" className="resumo-card-inline pendente">
              <Label variant="value" className="text-warning">{estatisticas.pendentes}</Label>
              <Label variant="caption">Pendentes</Label>
            </Container>
          </div>

          <Botao
            variant="success"
            size="sm"
            onClick={() => {
              setCienteItensFaltantes(false);
              setModalFinalizarAberto(true);
            }}
            disabled={processando || estatisticas.totalConferidoNivel === 0}
          >
            Finalizar N{nivelAtual}
          </Botao>
        </header>

        {nivelAtual === 3 && (
          <div
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
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
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>
              <strong>Reconferência Nível 3:</strong> Apenas os itens divergentes ({itens.length}) foram carregados para desempate.
            </span>
          </div>
        )}

        {/* Scanner */}
        <Painel titulo="Conferir Produto">
          <Container variant="scanner" padding="md">
            <form onSubmit={handleBipar} className="scanner-form-inner">
              <Campo
                ref={inputCodigoRef}
                variant="scanner"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Escanear ou digitar código de barras..."
                autoFocus
                bloquearColar
                onTentativaColar={handleTentativaColar}
              />

              <button
                type="button"
                className="btn-camera-scanner"
                title="Ler código de barras pela câmera"
                onClick={() => setMostrarCamera(true)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </button>

              {nivelAtual >= 2 && (
                <button
                  type="button"
                  className="btn-camera-scanner"
                  title="Extrair Lote / Validade por OCR"
                  onClick={() => handleAbrirOcr('lote')}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>OCR</span>
                </button>
              )}

              <Campo
                variant="compact"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                min="1"
                step="1"
              />

              <Botao
                type="submit"
                variant="primary"
                size="lg"
                disabled={processando || !codigo.trim()}
                loading={processando}
              >
                Conferir
              </Botao>
            </form>

            {/* Campos de Lote / Validade no N2 e N3 */}
            {nivelAtual >= 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '12px' }}>
                <Campo
                  label="Lote *"
                  value={lote}
                  onChange={(e) => setLote(e.target.value.toUpperCase())}
                  placeholder="Ex: L240501"
                />
                <Campo
                  label="Validade *"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  placeholder="DD/MM/AAAA"
                />
                <Campo
                  label="Fabricação"
                  value={fabricacao}
                  onChange={(e) => setFabricacao(e.target.value)}
                  placeholder="DD/MM/AAAA"
                />
              </div>
            )}
          </Container>
        </Painel>
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
                      >
                        <div className="item-card-header">
                          <img
                            src={`/api/crud/produto/${item.codprod}/imagem`}
                            alt={item.descrprod}
                            className="produto-img item-card-img"
                            onClick={() => setImagemAmpliada(`/api/crud/produto/${item.codprod}/imagem`)}
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
                        const temSobra = esperado !== null && conferido > esperado;
                        const temFalta = esperado !== null && conferido < esperado;
                        const temLotes = confItem.lotesDetalhes && confItem.lotesDetalhes.length > 0;

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
                                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                      title="Estornar a última bipagem registrada deste item"
                                      disabled={!confItem.ultimoBip}
                                      onClick={() => confItem.ultimoBip && setBipagemParaEstornar(confItem.ultimoBip)}
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
                                        }}
                                        title="Estornar toda a contagem deste item neste nível"
                                        onClick={() => {
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
                                        {confItem.lotesDetalhes.map((ld, lIdx) => (
                                          <tr key={lIdx}>
                                            <td>
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
                                                title={`Estornar as contagens do Lote ${ld.lote}`}
                                                onClick={() =>
                                                  setLoteParaEstornar({
                                                    descrprod: confItem.item.descrprod,
                                                    lote: ld.lote,
                                                    bipagemIds: ld.bipagemIds,
                                                    quantidade: ld.quantidade,
                                                  })
                                                }
                                              >
                                                ✕ Estornar
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
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
                  {itensConferidosVisiveis.map((confItem) => (
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
                            title="Estornar a última bipagem deste item"
                            disabled={!confItem.ultimoBip}
                            onClick={() => confItem.ultimoBip && setBipagemParaEstornar(confItem.ultimoBip)}
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
                              onClick={() => {
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
                              }}
                            >
                              ✕ Zerar Todos os Lotes
                            </button>
                          </div>

                          {confItem.lotesDetalhes.map((ld, lIdx) => (
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
                                <strong>🏷️ {ld.lote}</strong>
                                <span style={{ color: 'var(--emerald-600)', fontWeight: 800, marginLeft: '6px' }}>
                                  ({ld.quantidade} un)
                                </span>
                                {ld.validade && (
                                  <span style={{ color: 'var(--slate-500)', display: 'block', fontSize: '0.70rem' }}>
                                    Val: {ld.validade} {ld.fabricacao ? `• Fab: ${ld.fabricacao}` : ''}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setLoteParaEstornar({
                                    descrprod: confItem.item.descrprod,
                                    lote: ld.lote,
                                    bipagemIds: ld.bipagemIds,
                                    quantidade: ld.quantidade,
                                  })
                                }
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  fontSize: '0.70rem',
                                  fontWeight: 600,
                                }}
                              >
                                ✕ Estornar Lote
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
                  const is100Ok = nota.itensOk === nota.totalItens && nota.itensComSobra === 0;
                  const temSobra = nota.itensComSobra > 0;
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
                        <span>Unidades: <strong>{nota.totalConferido}/{nota.totalEsperado}</strong></span>
                        {nota.itensSemBipagem > 0 && (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>Zero bipagens: {nota.itensSemBipagem}</span>
                        )}
                        {nota.itensComSobra > 0 && (
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
            {estatisticas.itensComSobra > 0 && (
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
                : 'Identificamos divergências físicas. Veja o status atribuído a cada nota abaixo:'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
              {(resultadoFinalizacao.resumoPorNota || []).map((resNota) => {
                const isAprovada = resNota.status === 'Conferido';
                const isDivergente = resNota.status === 'Divergente';
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
                        {isAprovada ? '✅ Aprovada / 100% OK' : isDivergente ? '⚠️ Divergente → Auditoria N3' : '⏳ Aguardando N2'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                      Itens Corretos: <strong>{resNota.itensConferidosOk} de {resNota.totalItens}</strong>
                      {resNota.itensComSobra > 0 && <span style={{ color: '#dc2626' }}> • {resNota.itensComSobra} com sobra</span>}
                      {resNota.itensPendentes > 0 && <span style={{ color: '#d97706' }}> • {resNota.itensPendentes} pendentes/falta</span>}
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
              {resultadoFinalizacao.possuiDivergencias && (
                <Botao
                  variant="danger"
                  size="md"
                  onClick={() => handleAvancarParaNivel(3)}
                  loading={processando}
                >
                  🔍 Iniciar Auditoria N3 Agora
                </Botao>
              )}
              {resultadoFinalizacao.statusFinal === 'Aguardando N2' && (
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
    </div>
  );
}
