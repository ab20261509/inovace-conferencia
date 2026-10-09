import { useState, useEffect, useMemo, useRef, useCallback, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import {
  SessaoConferenciaEntrada,
  ItemNotaEntrada,
  BipagemEntrada,
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

interface ItemEntradaConferidoVisivel {
  item: ItemNotaEntrada;
  conferido: number;
  esperado: number | null;
  completo: boolean;
  lote?: string;
  validade?: string;
  fabricacao?: string;
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

  // Modais
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [textoOcrBruto, setTextoOcrBruto] = useState('');
  const [campoOcrAlvo, setCampoOcrAlvo] = useState<'lote' | 'fabricacao' | 'validade'>('lote');
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false);
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

        // Se a sessão estiver com status "Aguardando N2" ou "Aguardando N3" e o operador entrou para conferir,
        // ativa a sessão para andamento
        if (sessaoAtual.status === 'Aguardando N2' || sessaoAtual.status === 'Aguardando N3') {
          sessaoAtual = await recebimentoService.iniciarConferencia(sessaoAtual.nunotas, sessaoAtual.nivelAtual);
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

  // Estatísticas
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

      // Atualiza lista de itens e bipagens
      setBipagens((prev) => [resp.bipagem, ...prev]);
      setItens((prev) =>
        prev.map((it) => {
          if (it.codprod === resp.bipagem.codprod) {
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
          if (it.codprod === bipagemParaEstornar.codprod) {
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

  // Finalizar nível
  const handleFinalizarNivel = async () => {
    if (!sessao) return;
    setProcessando(true);
    setErro(null);

    try {
      const res = await recebimentoService.finalizarNivel(sessao.id, nivelAtual);
      setModalFinalizarAberto(false);

      if (res.statusFinal === 'Conferido') {
        tocarAlertaSucesso();
        navigate('/recebimento', {
          state: {
            mensagem: `✅ Conferência finalizada com sucesso! Carga de ${res.totalItens} itens aprovada.`,
          },
        });
      } else if (nivelAtual === 1) {
        tocarAlertaSucesso();
        navigate('/recebimento', {
          state: {
            mensagem: `✅ 1ª Contagem (N1) finalizada com sucesso! A nota agora está na lista aguardando a 2ª Contagem (N2).`,
          },
        });
      } else if (nivelAtual === 2) {
        tocarAlertaSucesso();
        navigate('/recebimento', {
          state: {
            mensagem: res.possuiDivergencias
              ? `⚠️ 2ª Contagem (N2) finalizada com divergências! A nota avançou para a Auditoria (N3).`
              : `✅ 2ª Contagem (N2) finalizada com sucesso!`,
          },
        });
      } else {
        tocarAlertaSucesso();
        navigate('/recebimento', {
          state: {
            mensagem: `✅ Contagem finalizada com sucesso!`,
          },
        });
      }
    } catch (err: any) {
      tocarAlertaErro();
      setErro(err.response?.data?.error || err.message || 'Erro ao finalizar nível.');
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
      const conferido =
        nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
      const esperado = item.qtdneg !== null ? item.qtdneg : null;
      const completo = esperado !== null ? conferido >= esperado : conferido > 0;
      return !completo;
    });
  }, [itens, nivelAtual]);

  const itensConferidosVisiveis = useMemo<ItemEntradaConferidoVisivel[]>(() => {
    return itens
      .filter((item) => {
        const conferido =
          nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
        return conferido > 0;
      })
      .map((item) => {
        const conferido =
          nivelAtual === 1 ? item.qtdConferidaN1 : nivelAtual === 2 ? item.qtdConferidaN2 : item.qtdConferidaN3;
        const esperado = item.qtdneg !== null ? item.qtdneg : null;
        const completo = esperado !== null ? conferido >= esperado : conferido > 0;

        const ultimoBip = bipagensValidas.find((b) => b.codprod === item.codprod);

        return {
          item,
          conferido,
          esperado,
          completo,
          lote: ultimoBip?.lote,
          validade: ultimoBip?.validade,
          fabricacao: ultimoBip?.fabricacao,
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
              Nota(s) {sessao?.nunotas.join(', ')} — Recebimento
            </span>
            <span className="badge-recontagem-header" title="Nível atual da conferência">
              N{nivelAtual}: {nivelAtual === 1 ? 'Contagem Cega' : nivelAtual === 2 ? 'Lote e Validade' : 'Auditoria'}
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
            onClick={() => setModalFinalizarAberto(true)}
            disabled={processando || estatisticas.totalConferidoNivel === 0}
          >
            Finalizar N{nivelAtual}
          </Botao>
        </header>

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
                <div className="itens-tabela-wrapper">
                  <table className="tabela-itens">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Lote</th>
                        <th>Unidade</th>
                        <th>Qtd Conferida</th>
                        <th>Horário</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensConferidosVisiveis.map((confItem) => (
                        <tr key={`${confItem.item.nunota}-${confItem.item.sequencia}`} className="row-ok">
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
                                  Cód: {confItem.item.codprod} | Ref: {confItem.item.referencia || '—'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="num-cell">
                            {confItem.lote ? (
                              <span>
                                {confItem.lote}
                                {confItem.validade ? (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'block' }}>
                                    Val: {confItem.validade}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="num-cell">{confItem.item.codvol || 'UN'}</td>
                          <td className="num-cell" style={{ color: 'var(--emerald-600)', fontWeight: 800 }}>
                            {confItem.conferido}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                            {formatarDataHora(confItem.ultimoHorario)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-estornar-item"
                              title="Estornar a última conferência deste item"
                              disabled={!confItem.ultimoBip}
                              onClick={() => confItem.ultimoBip && setBipagemParaEstornar(confItem.ultimoBip)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                              <span>Estornar</span>
                            </button>
                          </td>
                        </tr>
                      ))}
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
                        <div className="item-card-metric-col">
                          <span className="item-metric-label">Lote</span>
                          <span className="item-metric-val">{confItem.lote || '—'}</span>
                        </div>
                        <div className="item-card-metric-col">
                          <span className="item-metric-label">Unidade</span>
                          <span className="item-metric-val">{confItem.item.codvol || 'UN'}</span>
                        </div>
                        <div className="item-card-metric-col">
                          <span className="item-metric-label">Qtd Conferida</span>
                          <span className="item-metric-val val-conferido-ok">{confItem.conferido}</span>
                        </div>
                        <div className="item-card-actions">
                          <button
                            type="button"
                            className="btn-estornar-item btn-estornar-card"
                            title="Estornar a última conferência deste item"
                            disabled={!confItem.ultimoBip}
                            onClick={() => confItem.ultimoBip && setBipagemParaEstornar(confItem.ultimoBip)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>Estornar</span>
                          </button>
                        </div>
                      </div>
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
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">Finalizar Nível N{nivelAtual}</h2>
              <button className="modal-close" onClick={() => setModalFinalizarAberto(false)} disabled={processando}>×</button>
            </div>
            <p className="modal-subtitle">
              Deseja concluir a contagem física do <strong>Nível N{nivelAtual}</strong>?
            </p>
            <div
              style={{
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '14px',
                margin: '16px 0',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}
            >
              <div><strong>Itens com Bipagem:</strong> {estatisticas.itensConferidosOk} de {estatisticas.totalItensDistintos}</div>
              <div><strong>Total de Unidades Bipadas:</strong> {estatisticas.totalConferidoNivel}</div>
              {nivelAtual === 1 && (
                <div style={{ marginTop: '8px', color: 'var(--slate-600)', fontStyle: 'italic' }}>
                  ℹ️ O sistema comparará com as notas fiscais. Havendo divergência, o lote avançará para o Nível N2 (Recontagem).
                </div>
              )}
            </div>
            <div className="modal-actions">
              <Botao variant="secondary" size="md" onClick={() => setModalFinalizarAberto(false)} disabled={processando}>
                Cancelar
              </Botao>
              <Botao variant="success" size="md" onClick={handleFinalizarNivel} loading={processando}>
                Confirmar Fechamento
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Estorno */}
      {bipagemParaEstornar && (
        <div className="modal-overlay" onClick={() => !estornando && setBipagemParaEstornar(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title" style={{ color: 'var(--rose-600)' }}>Estornar Bipagem</h2>
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
