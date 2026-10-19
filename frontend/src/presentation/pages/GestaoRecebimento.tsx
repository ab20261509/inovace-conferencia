import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../application/contexts/AuthContext';
import { RecebimentoApiService } from '../../infrastructure/api/RecebimentoApiService';
import { ConfiguracaoSistemaApiService } from '../../infrastructure/api/ConfiguracaoSistemaApiService';
import {
  ConferenciaDivergenciaGrupo,
  ConferenciaEntradaResumo,
  NotaEntrada,
  ObterItensConferenciaResponse,
  ItemDivergenciaResumo,
} from '../../domain/models/ConferenciaEntrada';
import { AppLayout, AppHeader, Container } from '../components';
import { Loading } from '../components/Loading/Loading';
import { ModalGerenciarLotes, FracaoLote } from '../components/Recebimento/ModalGerenciarLotes';
import { ModalImportarLotesExcel } from '../components/Recebimento/ModalImportarLotesExcel';
import { LoteImportadoExcel } from '../components/Recebimento/loteExcelHelper';
import {
  AbaConferenciasView,
  FiltroStatusConferencia,
} from '../components/Recebimento/AbaConferenciasView';
import { AbaDivergenciasView } from '../components/Recebimento/AbaDivergenciasView';
import {
  AbaEnvioSankhyaView,
  GrupoConferenciaPronta,
} from '../components/Recebimento/AbaEnvioSankhyaView';
import { ModalRestaurarBackup } from '../components/Recebimento/ModalRestaurarBackup';
import {
  ModalConfirmarEnvioImediato,
  DadosNotaEnvioImediato,
} from '../components/Recebimento/ModalConfirmarEnvioImediato';
import { AbaOcorrenciasView } from '../components/Recebimento/AbaOcorrenciasView';
import { OcorrenciaRecebimento } from '../../domain/models/OcorrenciaRecebimento';
import './GestaoRecebimento.css';

const recebimentoService = new RecebimentoApiService();
const configSistemaService = new ConfiguracaoSistemaApiService();

export function GestaoRecebimentoPage() {
  const { user, temPermissao } = useAuth();
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<'conferencias' | 'divergencias' | 'aprovacao_sankhya' | 'ocorrencias'>('conferencias');

  // Parâmetros operacionais de níveis (N1 / N2)
  const [paramN1Ativo, setParamN1Ativo] = useState<boolean>(true);
  const [paramN2Ativo, setParamN2Ativo] = useState<boolean>(true);

  // Estados de dados
  const [todasConferencias, setTodasConferencias] = useState<ConferenciaEntradaResumo[]>([]);
  const [divergencias, setDivergencias] = useState<ConferenciaDivergenciaGrupo[]>([]);
  const [conferenciasProntas, setConferenciasProntas] = useState<NotaEntrada[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRecebimento[]>([]);
  const [detalhesConferencias, setDetalhesConferencias] = useState<Record<string, ObterItensConferenciaResponse>>({});
  const [conferenciasExpandidas, setConferenciasExpandidas] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState<string | null>(null);

  // Filtros do Painel de Conferências
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusConferencia>('todas');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Estados para Gerenciamento de Lotes e Importação Excel com persistência em sessionStorage
  const [lotesCustomizadosPorConferencia, setLotesCustomizadosPorConferencia] = useState<
    Record<string, Record<number, FracaoLote[]>>
  >({});

  const [origemExcelPorConferencia, setOrigemExcelPorConferencia] = useState<
    Record<string, Set<number>>
  >(() => {
    try {
      const salvo = sessionStorage.getItem('confercheck_origem_excel');
      if (salvo) {
        const obj = JSON.parse(salvo);
        const res: Record<string, Set<number>> = {};
        for (const [k, v] of Object.entries(obj)) {
          res[k] = new Set(v as number[]);
        }
        return res;
      }
    } catch (_) {}
    return {};
  });

  useEffect(() => {
    try {
      const serializavel: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(origemExcelPorConferencia)) {
        serializavel[k] = Array.from(v);
      }
      sessionStorage.setItem('confercheck_origem_excel', JSON.stringify(serializavel));
    } catch (_) {}
  }, [origemExcelPorConferencia]);

  const [modalGerenciarLotesAberto, setModalGerenciarLotesAberto] = useState(false);
  const [produtoEdicaoLotes, setProdutoEdicaoLotes] = useState<{
    nunota: number;
    sequencia: number;
    codprod: number;
    descrprod: string;
    qtdEsperada: number;
    conferenciaId: string;
  } | null>(null);
  const [modalImportarExcelAberto, setModalImportarExcelAberto] = useState(false);
  const [conferenciaParaExcel, setConferenciaParaExcel] = useState<{
    conferenciaId: string;
    nunotas: number[];
  } | null>(null);

  // Seleção múltipla para envio em lote (Aba 3)
  const [selecionadasEnvio, setSelecionadasEnvio] = useState<Set<string>>(new Set());

  // Controle de exibição (esconder/exibir) e filtro por card de divergência (Aba 2)
  const [itensDivergenciaExpandidos, setItensDivergenciaExpandidos] = useState<Record<string, boolean>>({});
  const [filtroItensDivergencia, setFiltroItensDivergencia] = useState<Record<string, 'divergentes' | 'todos'>>({});

  const toggleItensDivergencia = (grupoId: string) => {
    setItensDivergenciaExpandidos((prev) => ({
      ...prev,
      [grupoId]: !prev[grupoId],
    }));
  };

  const obterLotesItem = (conferenciaId: string, item: any, bipagens: any[] = []): FracaoLote[] => {
    const custom = lotesCustomizadosPorConferencia[conferenciaId]?.[item.codprod];
    if (custom && custom.length > 0) return custom;

    // Se o item possui sequência definida e existem bipagens correspondentes a ela, filtra especificamente por sequência
    const bipagensSeq = bipagens.filter(
      (b) =>
        b.codprod === item.codprod &&
        Boolean(b.sequencia) &&
        Boolean(item.sequencia) &&
        Number(b.sequencia) === Number(item.sequencia) &&
        !b.anulado &&
        b.lote
    );

    const bipagensProd =
      bipagensSeq.length > 0
        ? bipagensSeq
        : bipagens.filter(
            (b) => b.codprod === item.codprod && !b.anulado && b.lote
          );

    if (bipagensProd.length > 0) {
      const mapa = new Map<string, FracaoLote>();
      for (const b of bipagensProd) {
        const key = b.lote.trim();
        if (!mapa.has(key)) {
          mapa.set(key, {
            lote: key,
            qtd: 0,
            validade: b.validade || item.validade,
            fabricacao: b.fabricacao || item.fabricacao,
          });
        }
        mapa.get(key)!.qtd += b.qtdConferida || 0;
      }
      return Array.from(mapa.values());
    }

    if (item.lotesConferidos && item.lotesConferidos.length > 0) {
      return item.lotesConferidos.map((lc: any) => ({
        lote: lc.lote,
        qtd: lc.quantidade ?? lc.qtd ?? item.qtdneg ?? 0,
        validade: lc.validade || item.validade,
        fabricacao: lc.fabricacao || item.fabricacao,
      }));
    }

    if (item.lote) {
      return [
        {
          lote: item.lote,
          qtd: item.qtdneg || 0,
          validade: item.validade,
          fabricacao: item.fabricacao,
        },
      ];
    }

    return [];
  };

  const handleSalvarLotesCustomizados = (lotes: FracaoLote[]) => {
    if (!produtoEdicaoLotes) return;
    const { conferenciaId, codprod } = produtoEdicaoLotes;
    setLotesCustomizadosPorConferencia((prev) => ({
      ...prev,
      [conferenciaId]: {
        ...(prev[conferenciaId] || {}),
        [codprod]: lotes,
      },
    }));
    setFeedback({
      tipo: 'sucesso',
      texto: `Lotes do produto ${codprod} atualizados (${lotes.length} frações configuradas).`,
    });
  };

  const handleAplicarImportacaoExcel = (lotesImportados: LoteImportadoExcel[]) => {
    if (!conferenciaParaExcel) return;
    const { conferenciaId } = conferenciaParaExcel;

    const mapaProd: Record<number, FracaoLote[]> = {};
    const prodsExcel = new Set<number>();

    for (const l of lotesImportados) {
      if (!mapaProd[l.codprod]) {
        mapaProd[l.codprod] = [];
      }
      prodsExcel.add(l.codprod);

      const itemExistente = detalhesConferencias[conferenciaId]?.itens.find((i) => i.codprod === l.codprod);
      const qtdBase = itemExistente?.qtdneg || 0;

      mapaProd[l.codprod].push({
        lote: l.lote,
        qtd: qtdBase,
        validade: l.validade,
        fabricacao: l.fabricacao,
      });
    }

    setLotesCustomizadosPorConferencia((prev) => ({
      ...prev,
      [conferenciaId]: {
        ...(prev[conferenciaId] || {}),
        ...mapaProd,
      },
    }));

    setOrigemExcelPorConferencia((prev) => ({
      ...prev,
      [conferenciaId]: new Set([
        ...Array.from(prev[conferenciaId] || []),
        ...Array.from(prodsExcel),
      ]),
    }));

    setFeedback({
      tipo: 'sucesso',
      texto: `Importação concluída! ${lotesImportados.length} lotes importados para ${prodsExcel.size} produto(s).`,
    });
  };

  // Estados de feedback e modais
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalAcao, setModalAcao] = useState<{
    tipo: 'APROVAR_DIVERGENCIA' | 'RECONFERIR_N3' | 'REINICIAR' | 'SOLICITAR_RECONTAGEM' | 'RECUPERAR_CONTAGEM';
    conferenciaId: string;
    titulo: string;
    descricao: string;
    placeholder: string;
    dadosExtras?: any;
  } | null>(null);

  const [nivelRecontagemModal, setNivelRecontagemModal] = useState<number>(2);
  const [itensRecontagemModal, setItensRecontagemModal] = useState<Array<{ nunota: number; sequencia: number; codprod: number }>>([]);
  const [nunotaReiniciarModal, setNunotaReiniciarModal] = useState<number | undefined>(undefined);
  const [observacaoModal, setObservacaoModal] = useState('');
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [processandoDesmembramento, setProcessandoDesmembramento] = useState<string | null>(null);
  const [conferenciaParaRestaurar, setConferenciaParaRestaurar] = useState<ConferenciaEntradaResumo | null>(null);
  const [processandoRestauracao, setProcessandoRestauracao] = useState(false);
  const [notaParaEnvioImediato, setNotaParaEnvioImediato] = useState<DadosNotaEnvioImediato | null>(null);

  const handleConfirmarRestauracaoBackup = async (
    conferenciaId: string,
    motivo?: string,
    backupConferenciaId?: string
  ) => {
    setProcessandoRestauracao(true);
    try {
      await recebimentoService.recuperarContagem(conferenciaId, motivo, backupConferenciaId);
      setFeedback({
        tipo: 'sucesso',
        texto: 'Contagem restaurada com sucesso! As bipagens e status do backup foram restabelecidos.',
      });
      setConferenciaParaRestaurar(null);
      await carregarDados();
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || err.message || 'Falha ao restaurar backup da contagem.',
      });
    } finally {
      setProcessandoRestauracao(false);
    }
  };

  const handleExecutarEnvioImediato = async (nota: DadosNotaEnvioImediato) => {
    if (nota.isLote && nota.grupos) {
      let totalItensAtualizados = 0;
      let totalEstoqueAtualizado = 0;
      const protocolos: string[] = [];

      for (const grp of nota.grupos) {
        const lotesCust = lotesCustomizadosPorConferencia[grp.conferenciaId];
        let detalhes = detalhesConferencias[grp.conferenciaId];
        if (!detalhes || !detalhes.itens || detalhes.itens.length === 0) {
          try {
            detalhes = await recebimentoService.obterItensConferencia(grp.conferenciaId, grp.nunotas);
            setDetalhesConferencias((prev) => ({ ...prev, [grp.conferenciaId]: detalhes }));
          } catch (e) {
            // prossegue
          }
        }

        const resp = await recebimentoService.enviarSankhya(grp.conferenciaId, {
          observacao: 'Envio em lote pelo gestor do recebimento.',
          nunotas: grp.nunotas,
          itensCustomizados: lotesCust
            ? Object.entries(lotesCust).flatMap(([codprodStr, fracoes]) => {
                const codprod = Number(codprodStr);
                const itemRef = detalhes?.itens.find((i) => i.codprod === codprod);
                const nunota = itemRef?.nunota || 0;
                const sequencia = itemRef?.sequencia ?? 1;
                return fracoes
                  .filter((f) => f.lote?.trim())
                  .map((f) => ({
                    nunota,
                    sequencia,
                    codprod,
                    lote: f.lote.trim(),
                    validade: f.validade,
                    fabricacao: f.fabricacao,
                    qtdConferida: f.qtd || (itemRef?.qtdneg || 0),
                  }));
              })
            : undefined,
        });

        totalItensAtualizados += resp.itensAtualizados || 0;
        totalEstoqueAtualizado += resp.estoqueAtualizado || 0;
        if (resp.protocolo) protocolos.push(resp.protocolo);
      }

      setSelecionadasEnvio(new Set());
      setFeedback({
        tipo: 'sucesso',
        texto: `Envio em lote concluído com sucesso ao Sankhya! ${nota.grupos.length} notas processadas, ${totalItensAtualizados} itens da nota e ${totalEstoqueAtualizado} registros de estoque atualizados.`,
      });
      await carregarDados();

      return {
        protocolos,
        protocolo: protocolos[0],
        itensAtualizados: totalItensAtualizados,
        estoqueAtualizado: totalEstoqueAtualizado,
        totalNotasProcessadas: nota.grupos.length,
      };
    }

    // Envio individual
    const nunotasEnvio =
      nota.nunotas && nota.nunotas.length > 0
        ? nota.nunotas
        : nota.nunota
        ? [nota.nunota]
        : undefined;

    let detalhes = detalhesConferencias[nota.conferenciaId];
    if (!detalhes || !detalhes.itens || detalhes.itens.length === 0) {
      detalhes = await recebimentoService.obterItensConferencia(
        nota.conferenciaId,
        nunotasEnvio || []
      );
      setDetalhesConferencias((prev) => ({ ...prev, [nota.conferenciaId]: detalhes }));
    }

    const lotesCust = lotesCustomizadosPorConferencia[nota.conferenciaId];
    const resp = await recebimentoService.enviarSankhya(nota.conferenciaId, {
      observacao: 'Envio para o Sankhya pelo gestor do recebimento.',
      nunotas: nunotasEnvio,
      itensCustomizados: lotesCust
        ? Object.entries(lotesCust).flatMap(([codprodStr, fracoes]) => {
            const codprod = Number(codprodStr);
            const itemRef = detalhes?.itens.find((i) => i.codprod === codprod);
            const nunota = itemRef?.nunota || (nunotasEnvio ? nunotasEnvio[0] : 0);
            const sequencia = itemRef?.sequencia ?? 1;
            return fracoes
              .filter((f) => f.lote?.trim())
              .map((f) => ({
                nunota,
                sequencia,
                codprod,
                lote: f.lote.trim(),
                validade: f.validade,
                fabricacao: f.fabricacao,
                qtdConferida: f.qtd || (itemRef?.qtdneg || 0),
              }));
          })
        : undefined,
    });

    setFeedback({
      tipo: 'sucesso',
      texto: `Envio concluído com sucesso ao Sankhya! ${resp.itensAtualizados || 0} itens da nota e ${resp.estoqueAtualizado || 0} registros de estoque atualizados. Protocolo: ${resp.protocolo || 'N/A'}.`,
    });

    await carregarDados();

    return {
      protocolo: resp.protocolo || `REC-${Date.now()}`,
      itensAtualizados: resp.itensAtualizados || 0,
      estoqueAtualizado: resp.estoqueAtualizado || 0,
    };
  };

  const handleSincronizarDesmembramento = async (
    conferenciaId: string,
    nunota: number,
    codprod?: number,
    sequencia?: number
  ) => {
    const chaveProcesso = `${conferenciaId}-${nunota}-${codprod || 'all'}`;
    setProcessandoDesmembramento(chaveProcesso);
    try {
      const res = await recebimentoService.sincronizarDesmembramento(conferenciaId, {
        nunota,
        codprod,
        sequencia,
      });

      if (res.divergencias) {
        setDivergencias(res.divergencias);
      } else {
        await carregarDados();
      }

      setFeedback({
        tipo: res.alterado ? 'sucesso' : 'erro',
        texto: res.mensagem,
      });
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || err.message || 'Erro ao sincronizar desmembramento com o Sankhya.',
      });
    } finally {
      setProcessandoDesmembramento(null);
    }
  };

  const handleExecutarDesmembramento = async (
    conferenciaId: string,
    dados: {
      nunota: number;
      sequencia: number;
      lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string; codlocal?: number }>;
    }
  ) => {
    try {
      const res = await recebimentoService.desmembrarItem(conferenciaId, dados);

      if (res.divergencias) {
        setDivergencias(res.divergencias);
      } else {
        await carregarDados();
      }

      setFeedback({
        tipo: 'sucesso',
        texto: res.mensagem || 'Item desmembrado com sucesso no Sankhya!',
      });
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || err.message || 'Erro ao desmembrar item no Sankhya.',
      });
      throw err;
    }
  };

  const handleLocalAlteradoDivergencia = (nunota: number, sequencia: number, novoCodlocal: number) => {
    setDivergencias((prev) =>
      prev.map((grupo) => {
        const atualizarItem = (item: ItemDivergenciaResumo): ItemDivergenciaResumo =>
          item.nunota === nunota && item.sequencia === sequencia
            ? { ...item, codlocalorig: novoCodlocal }
            : item;

        return {
          ...grupo,
          itensDivergentes: (grupo.itensDivergentes || []).map(atualizarItem),
          todosItens: (grupo.todosItens || []).map(atualizarItem),
        };
      })
    );
  };

  const podeAcessar =
    temPermissao('gestao_recebimento') ||
    temPermissao('conferencia_entrada') ||
    temPermissao('gerenciar_acessos');

  const ehAdmin =
    ['SUP', 'ANTONY', 'ANTONY.B'].includes((user?.nomeUsu || '').toUpperCase()) ||
    temPermissao('gerenciar_acessos');

  const podeAbaDivergencias = ehAdmin || temPermissao('gestao_recebimento_aba_divergencias');
  const podeAbaEnvioSankhya = ehAdmin || temPermissao('gestao_recebimento_aba_envio_sankhya');
  const podeAbaOcorrencias = ehAdmin || temPermissao('gestao_recebimento_aba_ocorrencias');

  // Redirecionamento automático caso a aba ativa não seja permitida
  useEffect(() => {
    if (abaAtiva === 'divergencias' && !podeAbaDivergencias) {
      setAbaAtiva('conferencias');
    } else if (abaAtiva === 'aprovacao_sankhya' && !podeAbaEnvioSankhya) {
      setAbaAtiva('conferencias');
    } else if (abaAtiva === 'ocorrencias' && !podeAbaOcorrencias) {
      setAbaAtiva('conferencias');
    }
  }, [abaAtiva, podeAbaDivergencias, podeAbaEnvioSankhya, podeAbaOcorrencias]);

  // Carregar dados
  const carregarDados = useCallback(async () => {
    if (!podeAcessar) return;
    setLoading(true);
    setFeedback(null);
    const erros: string[] = [];

    try {
      const params = await configSistemaService.listarParametros();
      if (params['conferencia_entrada_nivel1_ativo']) {
        setParamN1Ativo(params['conferencia_entrada_nivel1_ativo'].valor !== 'false');
      }
      if (params['conferencia_entrada_nivel2_ativo']) {
        setParamN2Ativo(params['conferencia_entrada_nivel2_ativo'].valor !== 'false');
      }
    } catch (err: any) {
      console.warn('Aviso ao carregar parâmetros dos níveis:', err);
    }

    try {
      const confs = await recebimentoService.listarTodasConferencias();
      setTodasConferencias(confs);
    } catch (err: any) {
      console.error('Erro ao carregar todas as conferências:', err);
      erros.push(err.response?.data?.error || 'Falha ao carregar lista de conferências');
    }

    try {
      const divs = await recebimentoService.listarDivergencias();
      setDivergencias(divs);
    } catch (err: any) {
      console.error('Erro ao carregar divergências:', err);
      erros.push(err.response?.data?.error || 'Falha ao carregar divergências');
    }

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

    try {
      const ocs = await recebimentoService.listarOcorrencias();
      setOcorrencias(ocs);
    } catch (err: any) {
      console.warn('Aviso ao carregar ocorrências:', err);
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

  const carregarDetalhesConferencia = async (conferenciaId: string, nunotas: number[], cardKey?: string) => {
    const key = cardKey || conferenciaId;
    const confIdReal = conferenciaId.includes('_') ? conferenciaId.split('_')[0] : conferenciaId;
    setLoadingDetalhes(key);
    try {
      const resp = await recebimentoService.obterItensConferencia(confIdReal, nunotas, 'gestao');
      setDetalhesConferencias((prev) => ({ ...prev, [key]: resp }));
    } catch (err: any) {
      console.error('Erro ao obter detalhes da conferência:', err);
    } finally {
      setLoadingDetalhes(null);
    }
  };

  const toggleDetalhesConferencia = async (conferenciaId: string, nunotas: number[], cardKey?: string) => {
    const key = cardKey || conferenciaId;
    const jaExpandido = !!conferenciasExpandidas[key];
    if (jaExpandido) {
      setConferenciasExpandidas((prev) => ({ ...prev, [key]: false }));
      return;
    }

    const detalhesAtuais = detalhesConferencias[key];
    if (!detalhesAtuais || !detalhesAtuais.itens || detalhesAtuais.itens.length === 0) {
      await carregarDetalhesConferencia(conferenciaId, nunotas, key);
    }
    setConferenciasExpandidas((prev) => ({ ...prev, [key]: true }));
  };

  const handleConfirmarAcaoModal = async () => {
    if (!modalAcao) return;
    setProcessandoAcao(true);
    try {
      const confIdReal = modalAcao.dadosExtras?.conferenciaIdOrig || modalAcao.conferenciaId;
      const nunotaExtra = modalAcao.dadosExtras?.nunota;

      if (modalAcao.tipo === 'APROVAR_DIVERGENCIA') {
        await recebimentoService.resolverDivergencia(confIdReal, {
          acao: 'APROVAR_DIVERGENCIA',
          observacao: observacaoModal,
          nunota: nunotaExtra,
          decisoesFiscais: modalAcao.dadosExtras?.decisoesFiscais,
        });
        setFeedback({
          tipo: 'sucesso',
          texto: `Divergência resolvida e aprovada para a NF ${modalAcao.dadosExtras?.numnota || ''}!`,
        });

        const nunotaResolvida = nunotaExtra || (modalAcao.dadosExtras?.nunotas && modalAcao.dadosExtras?.nunotas[0]);
        if (nunotaResolvida) {
          setNotaParaEnvioImediato({
            conferenciaId: confIdReal,
            nunota: nunotaResolvida,
            numnota: modalAcao.dadosExtras?.numnota || modalAcao.dadosExtras?.numerosNotas || '',
            numerosNotas: modalAcao.dadosExtras?.numerosNotas,
            fornecedor: modalAcao.dadosExtras?.fornecedor,
          });
        }
      } else if (modalAcao.tipo === 'RECONFERIR_N3') {
        await recebimentoService.resolverDivergencia(confIdReal, {
          acao: 'RECONFERIR_N3',
          observacao: observacaoModal,
          nunota: nunotaExtra,
        });
        setFeedback({
          tipo: 'sucesso',
          texto: `Reconferência Nível 3 (N3) solicitada com sucesso para a NF ${modalAcao.dadosExtras?.numnota || ''}!`,
        });
      } else if (modalAcao.tipo === 'REINICIAR') {
        const nunotaParaReiniciar = nunotaReiniciarModal !== undefined ? nunotaReiniciarModal : modalAcao.dadosExtras?.nunota;
        await recebimentoService.reiniciarConferencia(confIdReal, observacaoModal, nunotaParaReiniciar);
        setFeedback({
          tipo: 'sucesso',
          texto: nunotaParaReiniciar
            ? `Nota desmembrada e reiniciada com sucesso! Uma conferência individual exclusiva foi iniciada no Nível 2.`
            : 'Conferência reiniciada! Bipagens anteriores foram arquivadas em backup de segurança e a sessão voltou ao início.',
        });
      } else if (modalAcao.tipo === 'SOLICITAR_RECONTAGEM') {
        await recebimentoService.solicitarRecontagem(modalAcao.conferenciaId, {
          nivel: nivelRecontagemModal,
          motivo: observacaoModal,
          itens: itensRecontagemModal.length > 0 ? itensRecontagemModal : undefined,
        });
        setFeedback({
          tipo: 'sucesso',
          texto: itensRecontagemModal.length > 0
            ? `Recontagem Nível ${nivelRecontagemModal} solicitada com sucesso para ${itensRecontagemModal.length} item(ns) selecionado(s)!`
            : `Recontagem Nível ${nivelRecontagemModal} solicitada com sucesso! Sessão disponibilizada aos conferentes.`,
        });
      } else if (modalAcao.tipo === 'RECUPERAR_CONTAGEM') {
        await recebimentoService.recuperarContagem(modalAcao.conferenciaId, observacaoModal);
        setFeedback({
          tipo: 'sucesso',
          texto: 'Contagem restaurada com sucesso! As bipagens salvas e status anterior foram restabelecidos.',
        });
      }

      setModalAcao(null);
      setObservacaoModal('');
      setItensRecontagemModal([]);
      setDetalhesConferencias({});
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
    let emAberto = 0;
    let emAndamento = 0;
    let recontagem = 0;
    let concluidas = 0;
    let comBackup = 0;

    for (const c of todasConferencias) {
      if (c.status === 'Em Aberto') {
        emAberto++;
      } else if (['Iniciado', 'N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento'].includes(c.status)) {
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
      emAberto,
      emAndamento,
      recontagem,
      concluidas,
      comBackup,
    };
  }, [todasConferencias]);

  // Filtro de texto e status para a Aba 1
  const conferenciasFiltradas = useMemo(() => {
    return todasConferencias.filter((c) => {
      if (filtroStatus === 'em_aberto') {
        if (c.status !== 'Em Aberto') return false;
      } else if (filtroStatus === 'em_andamento') {
        if (!['Iniciado', 'N1 em Andamento', 'N2 em Andamento', 'N3 em Andamento'].includes(c.status)) return false;
      } else if (filtroStatus === 'recontagem') {
        if (!['Aguardando N2', 'Aguardando N3', 'Divergente'].includes(c.status)) return false;
      } else if (filtroStatus === 'concluidas') {
        if (!['Conferido', 'Aguardando Aprovação', 'Enviado ao Sankhya'].includes(c.status)) return false;
      } else if (filtroStatus === 'com_backup') {
        if (!c.temBackupContagem) return false;
      }

      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase();
        const nfMatch = c.numerosNotas.toLowerCase().includes(termo);
        const fornMatch = c.fornecedor.toLowerCase().includes(termo);
        const confMatch = (c.conferente || '').toLowerCase().includes(termo);
        return nfMatch || fornMatch || confMatch;
      }

      return true;
    });
  }, [todasConferencias, filtroStatus, buscaTexto]);

  // Agrupamento para a Aba 3 (Envio ao Sankhya)
  const conferenciasProntasAgrupadas = useMemo((): GrupoConferenciaPronta[] => {
    const mapa = new Map<string, NotaEntrada[]>();
    for (const nota of conferenciasProntas) {
      const key = nota.conferenciaId ? `${nota.conferenciaId}_${nota.nunota}` : `sem_id_${nota.nunota}`;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(nota);
    }
    return Array.from(mapa.entries()).map(([key, notas]) => {
      const confId = notas[0]?.conferenciaId || '';
      return {
        key,
        conferenciaId: confId,
        notas,
        numerosNotas: notas.map((n) => n.numnota).join(', '),
        fornecedor: notas[0]?.nomeparc || '—',
        status: notas[0]?.statusConferencia || 'Conferido',
        nunotas: notas.map((n) => n.nunota),
      };
    });
  }, [conferenciasProntas]);

  const totalPendentesEnvio = useMemo(() => {
    return conferenciasProntasAgrupadas.filter((g) => g.status !== 'Enviado ao Sankhya').length;
  }, [conferenciasProntasAgrupadas]);

  const handleToggleSelecionarEnvio = (chave: string) => {
    setSelecionadasEnvio((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) {
        novo.delete(chave);
      } else {
        novo.add(chave);
      }
      return novo;
    });
  };

  const handleToggleSelecionarTodasEnvio = (chavesAptas?: string[]) => {
    const chavesAlvo = chavesAptas && chavesAptas.length > 0
      ? chavesAptas
      : conferenciasProntasAgrupadas.filter((g) => g.status !== 'Enviado ao Sankhya').map((g) => g.key);

    if (chavesAlvo.length === 0) return;
    const todasJaMarcadas = chavesAlvo.every((chave) => selecionadasEnvio.has(chave));
    setSelecionadasEnvio((prev) => {
      const novo = new Set(prev);
      if (todasJaMarcadas) {
        chavesAlvo.forEach((chave) => novo.delete(chave));
      } else {
        chavesAlvo.forEach((chave) => novo.add(chave));
      }
      return novo;
    });
  };

  const handleAbrirModalEnvioLote = () => {
    if (selecionadasEnvio.size === 0) return;
    const gruposParaEnviar = conferenciasProntasAgrupadas.filter(
      (g) => selecionadasEnvio.has(g.key) && g.status !== 'Enviado ao Sankhya'
    );
    if (gruposParaEnviar.length === 0) return;

    setNotaParaEnvioImediato({
      conferenciaId: 'LOTE',
      isLote: true,
      totalNotas: gruposParaEnviar.length,
      numnota: gruposParaEnviar.map((g) => g.numerosNotas).join(', '),
      numerosNotas: gruposParaEnviar.map((g) => g.numerosNotas).join(', '),
      grupos: gruposParaEnviar,
    });
  };

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

            {/* 1. Cockpit de KPIs (Resumo Executivo Minimalista em Linha Única) */}
            <div className="gestao-rec-kpis">
              {/* Card 1: Em Aberto */}
              <div
                className="gestao-kpi-card"
                onClick={() => {
                  setAbaAtiva('conferencias');
                  setFiltroStatus('em_aberto');
                }}
                title="Filtrar notas de compra pendentes de início no Sankhya"
              >
                <div className="gestao-kpi-header">
                  <span className="gestao-kpi-label">Em Aberto</span>
                  <span className="gestao-kpi-tag cinza">Aguardando</span>
                </div>
                <div className="gestao-kpi-valor" style={{ color: '#64748b' }}>
                  {contagensFiltros.emAberto}
                </div>
                <div className="gestao-kpi-sub">
                  <span>📥</span>
                  <span>Aguardando início</span>
                </div>
              </div>

              {/* Card 2: Em Conferência */}
              <div
                className="gestao-kpi-card"
                onClick={() => {
                  setAbaAtiva('conferencias');
                  setFiltroStatus('em_andamento');
                }}
                title="Filtrar conferências ativas (N1 / N2 / N3)"
              >
                <div className="gestao-kpi-header">
                  <span className="gestao-kpi-label">Em Conferência</span>
                  <span className="gestao-kpi-tag azul">N1/N2</span>
                </div>
                <div className="gestao-kpi-valor">{contagensFiltros.emAndamento}</div>
                <div className="gestao-kpi-sub">
                  <span>⏱️</span>
                  <span>Contagem física</span>
                </div>
              </div>

              {/* Card 3: Divergências */}
              {podeAbaDivergencias && (
                <div
                  className={`gestao-kpi-card ${divergencias.length > 0 ? 'alerta-ativo' : ''}`}
                  onClick={() => setAbaAtiva('divergencias')}
                  title="Acessar divergências pendentes de resolução gerencial"
                >
                  <div className="gestao-kpi-header">
                    <span className="gestao-kpi-label">Divergências</span>
                    <span className={`gestao-kpi-tag ${divergencias.length > 0 ? 'ambar' : 'cinza'}`}>
                      {divergencias.length > 0 ? 'Atenção' : 'Zero'}
                    </span>
                  </div>
                  <div
                    className="gestao-kpi-valor"
                    style={{ color: divergencias.length > 0 ? '#b45309' : undefined }}
                  >
                    {divergencias.length}
                  </div>
                  <div className="gestao-kpi-sub">
                    <span>⚠️</span>
                    <span>Decisão gerencial</span>
                  </div>
                </div>
              )}

              {/* Card 4: Prontas p/ Envio */}
              {podeAbaEnvioSankhya && (
                <div
                  className="gestao-kpi-card"
                  onClick={() => setAbaAtiva('aprovacao_sankhya')}
                  title="Acessar notas concluídas e aptas para integração"
                >
                  <div className="gestao-kpi-header">
                    <span className="gestao-kpi-label">Prontas Envio</span>
                    <span className="gestao-kpi-tag verde">Aptas</span>
                  </div>
                  <div className="gestao-kpi-valor" style={{ color: '#15803d' }}>
                    {conferenciasProntasAgrupadas.filter((g) => g.status !== 'Enviado ao Sankhya').length}
                  </div>
                  <div className="gestao-kpi-sub">
                    <span>✓</span>
                    <span>Envio ao ERP</span>
                  </div>
                </div>
              )}

              {/* Card 5: Integradas no ERP */}
              <div
                className="gestao-kpi-card"
                onClick={() => {
                  setAbaAtiva('conferencias');
                  setFiltroStatus('concluidas');
                }}
                title="Visualizar notas já integradas ao Sankhya"
              >
                <div className="gestao-kpi-header">
                  <span className="gestao-kpi-label">Integradas</span>
                  <span className="gestao-kpi-tag cinza">Hoje</span>
                </div>
                <div className="gestao-kpi-valor">
                  {todasConferencias.filter((c) => c.status === 'Enviado ao Sankhya').length}
                </div>
                <div className="gestao-kpi-sub">
                  <span>🚀</span>
                  <span>No estoque ERP</span>
                </div>
              </div>

              {/* Card 6: Ocorrências & Avarias */}
              {podeAbaOcorrencias && (
                <div
                  className={`gestao-kpi-card ${ocorrencias.some((o) => o.status === 'PENDENTE') ? 'alerta-ativo' : ''}`}
                  onClick={() => setAbaAtiva('ocorrencias')}
                  title="Acessar avarias, produtos vencidos e desvios de recebimento"
                >
                  <div className="gestao-kpi-header">
                    <span className="gestao-kpi-label">Ocorrências</span>
                    <span
                      className={`gestao-kpi-tag ${
                        ocorrencias.some((o) => o.status === 'PENDENTE') ? 'alerta' : 'cinza'
                      }`}
                    >
                      {ocorrencias.filter((o) => o.status === 'PENDENTE').length > 0 ? 'Pendentes' : 'Total'}
                    </span>
                  </div>
                  <div
                    className="gestao-kpi-valor"
                    style={{
                      color: ocorrencias.some((o) => o.status === 'PENDENTE') ? '#dc2626' : undefined,
                    }}
                  >
                    {ocorrencias.length}
                  </div>
                  <div className="gestao-kpi-sub">
                    <span>💥</span>
                    <span>Desvios e avarias</span>
                  </div>
                </div>
              )}
            </div>

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

                {podeAbaDivergencias && (
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
                )}

                {podeAbaEnvioSankhya && (
                  <button
                    type="button"
                    className={`gestao-rec-tab-btn ${abaAtiva === 'aprovacao_sankhya' ? 'ativa' : ''}`}
                    onClick={() => setAbaAtiva('aprovacao_sankhya')}
                  >
                    <span>Envio Sankhya</span>
                    <span className={`gestao-rec-tab-badge ${totalPendentesEnvio > 0 ? 'alerta' : ''}`}>
                      {totalPendentesEnvio}
                    </span>
                  </button>
                )}

                {podeAbaOcorrencias && (
                  <button
                    type="button"
                    className={`gestao-rec-tab-btn ${abaAtiva === 'ocorrencias' ? 'ativa' : ''}`}
                    onClick={() => setAbaAtiva('ocorrencias')}
                  >
                    <span>Ocorrências</span>
                    <span
                      className={`gestao-rec-tab-badge ${
                        ocorrencias.filter((o) => o.status === 'PENDENTE').length > 0 ? 'alerta' : ''
                      }`}
                    >
                      {ocorrencias.length}
                    </span>
                  </button>
                )}
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

            {/* Loading Geral */}
            {loading ? (
              <Loading mensagem="Carregando dados da gestão de recebimento..." />
            ) : (
              <>
                {/* ABA 1: PAINEL GERAL DE CONFERÊNCIAS */}
                {abaAtiva === 'conferencias' && (
                  <AbaConferenciasView
                    conferenciasFiltradas={conferenciasFiltradas}
                    filtroStatus={filtroStatus}
                    setFiltroStatus={setFiltroStatus}
                    contagensFiltros={contagensFiltros}
                    buscaTexto={buscaTexto}
                    setBuscaTexto={setBuscaTexto}
                    conferenciasExpandidas={conferenciasExpandidas}
                    detalhesConferencias={detalhesConferencias}
                    loadingDetalhes={loadingDetalhes}
                    toggleDetalhesConferencia={toggleDetalhesConferencia}
                    onSolicitarRecontagem={(conf, itensSelecionados) => {
                      const itens = itensSelecionados || [];
                      const confIdReal = conf.conferenciaIdOrig || conf.id;
                      setNivelRecontagemModal(2);
                      setItensRecontagemModal(itens);
                      setModalAcao({
                        tipo: 'SOLICITAR_RECONTAGEM',
                        conferenciaId: confIdReal,
                        titulo: itens.length > 0
                          ? `Solicitar Recontagem na N2 (${itens.length} produto(s) selecionado(s))`
                          : 'Solicitar Recontagem da Conferência',
                        descricao: itens.length > 0
                          ? `A recontagem será realizada no Nível 2 apenas para os ${itens.length} item(ns) selecionado(s) da nota ${conf.numerosNotas}. Os demais itens já conferidos serão mantidos intactos e consolidados ao final.`
                          : `Defina o nível para recontagem da nota ${conf.numerosNotas}. A conferência ficará disponível para os operadores realizarem a nova contagem cega.`,
                        placeholder: 'Instrução ou motivo da recontagem para a equipe...',
                        dadosExtras: {
                          conferenciaIdOrig: confIdReal,
                          nunota: conf.nunotas[0],
                          numnota: conf.numerosNotas,
                        },
                      });
                    }}
                    onReiniciar={(conf) => {
                      const confIdReal = conf.conferenciaIdOrig || conf.id;
                      const nunotaAlvo = conf.sessaoConjunta ? conf.nunotas[0] : undefined;
                      setNunotaReiniciarModal(nunotaAlvo);
                      setModalAcao({
                        tipo: 'REINICIAR',
                        conferenciaId: confIdReal,
                        titulo: `Reiniciar Conferência (NF ${conf.numerosNotas})`,
                        descricao: conf.sessaoConjunta
                          ? `ATENÇÃO: Todas as bipagens ativas da nota ${conf.numerosNotas} serão arquivadas em um backup seguro e ela voltará ao Nível 2. Como ela pertence a uma conferência conjunta, ela será desmembrada para uma conferência exclusiva sem afetar as demais notas.`
                          : `ATENÇÃO: Todas as bipagens ativas da nota ${conf.numerosNotas} serão arquivadas em um backup seguro e a conferência voltará ao Nível 2. Você poderá recuperar esta contagem a qualquer momento usando a opção "Recuperar Contagem".`,
                        placeholder: 'Motivo obrigatório do reinício...',
                        dadosExtras: {
                          conferenciaIdOrig: confIdReal,
                          nunota: conf.nunotas[0],
                          numnota: conf.numerosNotas,
                          notasDetalhadas: conf.notasDetalhadas,
                        },
                      });
                    }}
                    onRecuperarContagem={(conf) => {
                      setConferenciaParaRestaurar(conf);
                    }}
                    onAbrirColetor={(conf) => {
                      const confIdReal = conf.conferenciaIdOrig || conf.id;
                      navigate('/recebimento/conferencia', {
                        state: {
                          conferenciaId: confIdReal,
                          nunotas: conf.nunotas,
                          nivel: conf.nivelAtual,
                        },
                      });
                    }}
                    nivel1Ativo={paramN1Ativo}
                    nivel2Ativo={paramN2Ativo}
                  />
                )}

                {/* ABA 2: DIVERGÊNCIAS DE ENTRADA */}
                {abaAtiva === 'divergencias' && podeAbaDivergencias && (
                  <AbaDivergenciasView
                    divergencias={divergencias}
                    todasConferencias={todasConferencias}
                    itensDivergenciaExpandidos={itensDivergenciaExpandidos}
                    filtroItensDivergencia={filtroItensDivergencia}
                    toggleItensDivergencia={toggleItensDivergencia}
                    setFiltroItensDivergencia={setFiltroItensDivergencia}
                    onResolverDivergencia={(grupo, decisoesFiscais) => {
                      setModalAcao({
                        tipo: 'APROVAR_DIVERGENCIA',
                        conferenciaId: grupo.conferenciaId || grupo.id,
                        titulo: `Resolver e Aceitar Divergência (NF ${grupo.numnota || grupo.numerosNotas})`,
                        descricao: `Você está prestes a aprovar a conferência da nota ${grupo.numnota || grupo.numerosNotas} aceitando a contagem física atual como definitiva para o estoque com as decisões selecionadas.`,
                        placeholder: 'Insira a justificativa gerencial para aprovar esta divergência (ex: fornecedor confirmou envio a menor com carta de correção)...',
                        dadosExtras: {
                          conferenciaIdOrig: grupo.conferenciaId || grupo.id,
                          nunota: grupo.nunota || (grupo.nunotas && grupo.nunotas[0]),
                          numnota: grupo.numnota || grupo.numerosNotas,
                          numerosNotas: grupo.numerosNotas || String(grupo.numnota || ''),
                          fornecedor: grupo.fornecedor,
                          decisoesFiscais,
                        },
                      });
                    }}
                    onReconferirN3={(grupo) => {
                      setModalAcao({
                        tipo: 'RECONFERIR_N3',
                        conferenciaId: grupo.conferenciaId || grupo.id,
                        titulo: `Solicitar Reconferência Nível 3 (N3) - NF ${grupo.numnota || grupo.numerosNotas}`,
                        descricao: `Disponibiliza exclusivamente a nota ${grupo.numnota || grupo.numerosNotas} para uma terceira contagem cega de desempate por outro conferente. Notas já conferidas não serão impactadas.`,
                        placeholder: 'Instrução para a reconferência (opcional)...',
                        dadosExtras: {
                          conferenciaIdOrig: grupo.conferenciaId || grupo.id,
                          nunota: grupo.nunota,
                          numnota: grupo.numnota || grupo.numerosNotas,
                        },
                      });
                    }}
                    onReiniciar={(grupo) => {
                      setNunotaReiniciarModal(grupo.nunota);
                      setModalAcao({
                        tipo: 'REINICIAR',
                        conferenciaId: grupo.conferenciaId || grupo.id,
                        titulo: `Reiniciar Conferência (NF ${grupo.numnota || grupo.numerosNotas})`,
                        descricao: `ATENÇÃO: As bipagens registradas da nota ${grupo.numnota || grupo.numerosNotas} serão salvas em backup e ela voltará ao início (Nível 2). Se ela fazia parte de uma conferência conjunta, será desmembrada para uma sessão individual exclusiva.`,
                        placeholder: 'Motivo obrigatório do cancelamento e reinício...',
                        dadosExtras: {
                          conferenciaIdOrig: grupo.conferenciaId || grupo.id,
                          nunota: grupo.nunota,
                          numnota: grupo.numnota || grupo.numerosNotas,
                        },
                      });
                    }}
                    onRecuperarContagem={(conf) => {
                      setConferenciaParaRestaurar(conf);
                    }}
                    onSincronizarDesmembramento={handleSincronizarDesmembramento}
                    onExecutarDesmembramento={handleExecutarDesmembramento}
                    processandoDesmembramento={processandoDesmembramento}
                    onLocalAlterado={handleLocalAlteradoDivergencia}
                  />
                )}

                {/* ABA 3: APROVAÇÃO E ENVIO AO SANKHYA */}
                {abaAtiva === 'aprovacao_sankhya' && podeAbaEnvioSankhya && (
                  <AbaEnvioSankhyaView
                    conferenciasProntasAgrupadas={conferenciasProntasAgrupadas}
                    todasConferencias={todasConferencias}
                    detalhesConferencias={detalhesConferencias}
                    loadingDetalhes={loadingDetalhes}
                    conferenciasExpandidas={conferenciasExpandidas}
                    lotesCustomizadosPorConferencia={lotesCustomizadosPorConferencia}
                    origemExcelPorConferencia={origemExcelPorConferencia}
                    selecionadasEnvio={selecionadasEnvio}
                    onToggleSelecionar={handleToggleSelecionarEnvio}
                    onToggleSelecionarTodas={handleToggleSelecionarTodasEnvio}
                    onEnviarLote={handleAbrirModalEnvioLote}
                    carregarDetalhesConferencia={carregarDetalhesConferencia}
                    toggleDetalhesConferencia={toggleDetalhesConferencia}
                    onAbrirImportarExcel={(conferenciaId, nunotas) => {
                      setConferenciaParaExcel({ conferenciaId, nunotas });
                      setModalImportarExcelAberto(true);
                    }}
                    onEditarLotesItem={(itemInfo) => {
                      setProdutoEdicaoLotes(itemInfo);
                      setModalGerenciarLotesAberto(true);
                    }}
                    onEnviarSankhya={(conferenciaId, numerosNotas, nunotas) => {
                      const conf = todasConferencias?.find((c) => c.id === conferenciaId);
                      setNotaParaEnvioImediato({
                        conferenciaId,
                        numnota: numerosNotas,
                        numerosNotas,
                        nunotas,
                        nunota: nunotas && nunotas.length === 1 ? nunotas[0] : undefined,
                        fornecedor: conf?.fornecedor,
                      });
                    }}
                    onRecuperarContagem={(conf) => {
                      setConferenciaParaRestaurar(conf);
                    }}
                    onExecutarDesmembramento={handleExecutarDesmembramento}
                    obterLotesItem={obterLotesItem}
                    nivel1Ativo={paramN1Ativo}
                    nivel2Ativo={paramN2Ativo}
                  />
                )}

                {/* ABA 4: OCORRÊNCIAS & PENDÊNCIAS */}
                {abaAtiva === 'ocorrencias' && podeAbaOcorrencias && (
                  <AbaOcorrenciasView
                    ocorrencias={ocorrencias}
                    onRecarregar={carregarDados}
                    usuarioAtual={user?.nomeUsu || 'Gestor'}
                  />
                )}
              </>
            )}

            {/* Modal de Gerenciamento / Divisão de Lotes */}
            {modalGerenciarLotesAberto && produtoEdicaoLotes && (
              <ModalGerenciarLotes
                isOpen={modalGerenciarLotesAberto}
                onClose={() => {
                  setModalGerenciarLotesAberto(false);
                  setProdutoEdicaoLotes(null);
                }}
                produto={produtoEdicaoLotes}
                lotesIniciais={
                  lotesCustomizadosPorConferencia[produtoEdicaoLotes.conferenciaId]?.[produtoEdicaoLotes.codprod] || []
                }
                onSalvar={handleSalvarLotesCustomizados}
              />
            )}

            {/* Modal de Importação de Lotes via Planilha Excel */}
            {modalImportarExcelAberto && conferenciaParaExcel && (
              <ModalImportarLotesExcel
                isOpen={modalImportarExcelAberto}
                onClose={() => {
                  setModalImportarExcelAberto(false);
                  setConferenciaParaExcel(null);
                }}
                itensConferencia={
                  (detalhesConferencias[conferenciaParaExcel.conferenciaId]?.itens || []).map((i) => ({
                    nunota: i.nunota,
                    sequencia: i.sequencia,
                    codprod: i.codprod,
                    descrprod: i.descrprod,
                    referencia: i.referencia,
                    refforn: i.refforn,
                    codbarra: i.codbarra,
                    lote: i.lote,
                    validade: i.validade,
                    fabricacao: i.fabricacao,
                    codigosAlternativos: i.codigosAlternativos,
                  }))
                }
                onAplicarImportacao={handleAplicarImportacaoExcel}
              />
            )}

            {/* Modal de Ações / Justificativa / Configuração */}
            {modalAcao && (
              <div className="gestao-modal-backdrop">
                <div className="gestao-modal-box">
                  <h3 className="gestao-modal-titulo">{modalAcao.titulo}</h3>
                  <p className="gestao-modal-desc">{modalAcao.descricao}</p>

                  {/* Detalhes para Recontagem */}
                  {modalAcao.tipo === 'SOLICITAR_RECONTAGEM' && (
                    <>
                      {itensRecontagemModal.length > 0 && (
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '8px',
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.85rem',
                            color: '#065f46',
                          }}
                        >
                          <span style={{ fontSize: '1.25rem' }}>🎯</span>
                          <div>
                            <strong>Recontagem Seletiva N2 ({itensRecontagemModal.length} produto(s) selecionado(s))</strong>
                            <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                              Apenas os itens marcados ficarão visíveis para nova contagem no coletor. As bipagens dos demais itens permanecem preservadas.
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="gestao-modal-niveis-recontagem">
                        <label
                          className={`gestao-modal-nivel-opcao ${nivelRecontagemModal === 1 ? 'selecionado' : ''} ${itensRecontagemModal.length > 0 ? 'desabilitado' : ''}`}
                          style={itensRecontagemModal.length > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          <input
                            type="radio"
                            name="nivelRecontagem"
                            value={1}
                            checked={nivelRecontagemModal === 1}
                            onChange={() => setNivelRecontagemModal(1)}
                            disabled={itensRecontagemModal.length > 0}
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

                        <label
                          className={`gestao-modal-nivel-opcao ${nivelRecontagemModal === 3 ? 'selecionado' : ''} ${itensRecontagemModal.length > 0 ? 'desabilitado' : ''}`}
                          style={itensRecontagemModal.length > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          <input
                            type="radio"
                            name="nivelRecontagem"
                            value={3}
                            checked={nivelRecontagemModal === 3}
                            onChange={() => setNivelRecontagemModal(3)}
                            disabled={itensRecontagemModal.length > 0}
                          />
                          <div className="gestao-modal-nivel-info">
                            <strong>Nível 3 - Reconferência de Desempate (N3)</strong>
                            <span>Para casos onde N1 e N2 divergiram e necessita de um 3º conferente para desempate.</span>
                          </div>
                        </label>
                      </div>
                    </>
                  )}

                  {/* Opções de Escopo para Reiniciar Conferência Conjunta */}
                  {modalAcao.tipo === 'REINICIAR' && modalAcao.dadosExtras?.nunotas && modalAcao.dadosExtras.nunotas.length > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                        Selecione o escopo do reinício:
                      </div>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${nunotaReiniciarModal === undefined ? 'var(--blue-500)' : 'var(--slate-200)'}`,
                          background: nunotaReiniciarModal === undefined ? '#eff6ff' : 'var(--slate-50)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="opcaoReiniciar"
                          checked={nunotaReiniciarModal === undefined}
                          onChange={() => setNunotaReiniciarModal(undefined)}
                        />
                        <div>
                          <strong>Reiniciar toda a conferência conjunta</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                            Mantém todas as {modalAcao.dadosExtras.nunotas.length} notas juntas e zera as contagens de todas.
                          </div>
                        </div>
                      </label>

                      {(() => {
                        const listaNotas: Array<{ nunota: number; numnota: number }> =
                          modalAcao.dadosExtras.notasDetalhadas &&
                          modalAcao.dadosExtras.notasDetalhadas.length > 0
                            ? modalAcao.dadosExtras.notasDetalhadas
                            : (() => {
                                const nums = String(modalAcao.dadosExtras.numerosNotas || '')
                                  .split(',')
                                  .map((s) => Number(s.trim()))
                                  .filter((n) => !isNaN(n) && n > 0);
                                return modalAcao.dadosExtras.nunotas.map((n: number, idx: number) => ({
                                  nunota: n,
                                  numnota: nums[idx] || n,
                                }));
                              })();

                        return listaNotas.map((item) => (
                          <label
                            key={item.nunota}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${nunotaReiniciarModal === item.nunota ? 'var(--blue-500)' : 'var(--slate-200)'}`,
                              background: nunotaReiniciarModal === item.nunota ? '#eff6ff' : 'var(--slate-50)',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="radio"
                              name="opcaoReiniciar"
                              checked={nunotaReiniciarModal === item.nunota}
                              onChange={() => setNunotaReiniciarModal(item.nunota)}
                            />
                            <div>
                              <strong>Desmembrar e reiniciar apenas a NF #{item.numnota}</strong>
                              <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                                Separa esta nota em uma conferência própria zerada, mantendo as outras notas na conferência atual.
                              </div>
                            </div>
                          </label>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Detalhes do Backup a Restaurar */}
                  {modalAcao.tipo === 'RECUPERAR_CONTAGEM' && modalAcao.dadosExtras && (
                    <div className="gestao-card-backup-aviso" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '1.2rem' }}>📋</span>
                      <div>
                        <div>
                          <strong>Status a restabelecer:</strong> {modalAcao.dadosExtras.statusAnterior} (N{modalAcao.dadosExtras.nivelAnterior})
                        </div>
                        <div>
                          <strong>Bipagens a restaurar:</strong> {modalAcao.dadosExtras.totalBipagensAnuladas} itens
                        </div>
                        <div>
                          <strong>Reiniciado em:</strong> {new Date(modalAcao.dadosExtras.reiniciadoEm).toLocaleString('pt-BR')} por {modalAcao.dadosExtras.reiniciadoPor}
                        </div>
                        {modalAcao.dadosExtras.motivo && (
                          <div>
                            <strong>Motivo do reinício registrado:</strong> "{modalAcao.dadosExtras.motivo}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}


                  <div className="gestao-modal-acoes">
                    <button
                      type="button"
                      className="gestao-modal-btn-cancelar"
                      onClick={() => {
                        setModalAcao(null);
                        setObservacaoModal('');
                        setItensRecontagemModal([]);
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

            {/* Modal de Restauração de Backup de Contagem */}
            {conferenciaParaRestaurar && (
              <ModalRestaurarBackup
                isOpen={Boolean(conferenciaParaRestaurar)}
                onClose={() => setConferenciaParaRestaurar(null)}
                conferencia={conferenciaParaRestaurar}
                onConfirmar={handleConfirmarRestauracaoBackup}
                loading={processandoRestauracao}
              />
            )}

            {/* Modal de Confirmação de Envio ao Sankhya com Barra de Progresso */}
            {notaParaEnvioImediato && (
              <ModalConfirmarEnvioImediato
                isOpen={Boolean(notaParaEnvioImediato)}
                onClose={() => setNotaParaEnvioImediato(null)}
                dadosNota={notaParaEnvioImediato}
                onEnviarAgora={handleExecutarEnvioImediato}
              />
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
