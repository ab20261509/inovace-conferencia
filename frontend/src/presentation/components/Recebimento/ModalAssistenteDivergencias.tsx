import React, { useState, useMemo, useEffect } from 'react';
import {
  ConferenciaDivergenciaGrupo,
  ItemDivergenciaResumo,
  DecisaoFiscalItem,
} from '../../../domain/models/ConferenciaEntrada';
import {
  formatarDataSimples,
  obterOcorrenciasDoItem,
  renderBadgesOcorrenciasItem,
  verificarItemEmN3,
} from './recebimentoHelpers';
import { ModalOcorrenciaSobra } from './ModalOcorrenciaSobra';
import { ModalDesmembrarItem } from './ModalDesmembrarItem';

export interface ModalAssistenteDivergenciasProps {
  isOpen: boolean;
  onClose: () => void;
  grupo: ConferenciaDivergenciaGrupo | null;
  ocorrencias?: any[];
  decisoesDoGrupo: Record<string, DecisaoFiscalItem>;
  onDefinirDecisaoFiscal: (
    grupoId: string,
    itemKey: string,
    itemInfo: { nunota: number; codprod: number; sequencia: number },
    campo: 'lote' | 'validade' | 'fabricacao',
    opcao: 'ERP' | 'BIP' | 'N2' | 'N3'
  ) => void;
  onLimparDecisaoItem?: (grupoId: string, itemKey: string) => void;
  onSelecionarNivelItem: (
    grupoId: string,
    itemKey: string,
    itemInfo: { nunota: number; codprod: number; sequencia: number },
    nivel: 'N1' | 'N2' | 'N3' | 'ERP'
  ) => void;
  onAbrirModalSobra: (item: ItemDivergenciaResumo, grupo: ConferenciaDivergenciaGrupo) => void;
  onAbrirModalDesmembrar: (item: ItemDivergenciaResumo, grupo: ConferenciaDivergenciaGrupo) => void;
  onAbrirModalRevisarDesempate: (item: ItemDivergenciaResumo, grupo: ConferenciaDivergenciaGrupo, decisaoAtual: 'N2' | 'N3' | 'ERP') => void;
  onAbrirModalDecidirN2: (item: ItemDivergenciaResumo, grupo: ConferenciaDivergenciaGrupo) => void;
  onReconferirN3: (grupo: ConferenciaDivergenciaGrupo, itens: ItemDivergenciaResumo[]) => void;
  onFinalizarResolucao: (grupo: ConferenciaDivergenciaGrupo) => void;
  executandoDesmembramento?: boolean;
  executandoOcorrenciaSobra?: boolean;
  onExecutarSobraApi?: (dados: any) => Promise<void>;
  onExecutarDesmembramentoApi?: (conferenciaId: string, dados: any) => Promise<void>;
  onExecutarN3Api?: (conferenciaId: string, itens: any[], nunota?: number) => Promise<void>;
}

export const ModalAssistenteDivergencias: React.FC<ModalAssistenteDivergenciasProps> = ({
  isOpen,
  onClose,
  grupo,
  ocorrencias = [],
  decisoesDoGrupo,
  onDefinirDecisaoFiscal,
  onLimparDecisaoItem,
  onSelecionarNivelItem,
  onAbrirModalSobra,
  onAbrirModalDesmembrar,
  onAbrirModalRevisarDesempate,
  onAbrirModalDecidirN2,
  onReconferirN3,
  onFinalizarResolucao,
  executandoDesmembramento = false,
  executandoOcorrenciaSobra = false,
  onExecutarSobraApi,
  onExecutarDesmembramentoApi,
  onExecutarN3Api,
}) => {
  const [indexAtual, setIndexAtual] = useState<number>(0);
  const [itensPulados, setItensPulados] = useState<Set<string>>(new Set());
  const [modoResumo, setModoResumo] = useState<boolean>(false);
  const [filtroPasso, setFiltroPasso] = useState<'pendentes' | 'resolvidos' | 'todos'>('pendentes');
  const [abaResumo, setAbaResumo] = useState<'pendentes' | 'resolvidos' | 'todos'>('pendentes');

  // Filas de ações agendadas para execução final em lote
  const [sobrasAgendadas, setSobrasAgendadas] = useState<Record<string, any>>({});
  const [desmembramentosAgendados, setDesmembramentosAgendados] = useState<Record<string, any>>({});
  const [itensRecontarN3, setItensRecontarN3] = useState<Set<string>>(new Set());

  // Submodais de configuração de sobra e desmembramento internos ao assistente
  const [modalSobraConfig, setModalSobraConfig] = useState<{ item: ItemDivergenciaResumo; grupo: ConferenciaDivergenciaGrupo } | null>(null);
  const [modalDesmembrarConfig, setModalDesmembrarConfig] = useState<{ item: ItemDivergenciaResumo; grupo: ConferenciaDivergenciaGrupo } | null>(null);

  // Estado de execução em lote ao final
  const [executandoLoteFinal, setExecutandoLoteFinal] = useState(false);
  const [progressoLote, setProgressoLote] = useState<{ etapaAtual: number; totalEtapas: number; descricao: string } | null>(null);

  // Reseta estado ao abrir novo grupo
  useEffect(() => {
    if (isOpen) {
      setIndexAtual(0);
      setItensPulados(new Set());
      setModoResumo(false);
      setFiltroPasso('pendentes');
      setAbaResumo('pendentes');
      setSobrasAgendadas({});
      setDesmembramentosAgendados({});
      setItensRecontarN3(new Set());
      setExecutandoLoteFinal(false);
      setProgressoLote(null);
    }
  }, [isOpen, grupo?.id]);

  // Mapeia todos os itens da nota fiscal (ou itens divergentes como fallback)
  const baseTodosItens = grupo?.todosItens && grupo.todosItens.length > 0
    ? grupo.todosItens
    : grupo?.itensDivergentes || [];

  // Mapeia a contagem de sequências faturadas por produto na nota fiscal inteira
  const contagemSeqsPorCodprod = useMemo(() => {
    return baseTodosItens.reduce<Record<number, number>>((acc, curr) => {
      acc[curr.codprod] = (acc[curr.codprod] || 0) + 1;
      return acc;
    }, {});
  }, [baseTodosItens]);

  // Consolidação de saldo por produto na nota fiscal inteira (para balanceamento e compensação de multi-item)
  const saldoConsolidadoPorProd = useMemo(() => {
    const mapa: Record<number, { esperado: number; conferido: number; saldo: number; sequencias: number[] }> = {};
    baseTodosItens.forEach((it) => {
      if (!mapa[it.codprod]) {
        mapa[it.codprod] = { esperado: 0, conferido: 0, saldo: 0, sequencias: [] };
      }
      mapa[it.codprod].esperado += it.qtdEsperada || 0;
      const c = it.qtdN3 > 0 ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1 || 0;
      mapa[it.codprod].conferido += c;
      if (!mapa[it.codprod].sequencias.includes(it.sequencia)) {
        mapa[it.codprod].sequencias.push(it.sequencia);
      }
    });
    Object.keys(mapa).forEach((cp) => {
      const num = Number(cp);
      mapa[num].saldo = mapa[num].conferido - mapa[num].esperado;
    });
    return mapa;
  }, [baseTodosItens]);

  // Lista ordenada de itens priorizando a severidade sequencial dos incidentes:
  // 1º: Sobra física real (diferença > 0 e saldo global do produto na nota > 0) -> mais crítica
  // 2º: Falta física pendente (diferença < 0 e ainda não isolada no ERP) -> Recontar N3 ou Desmembrar
  // 3º: Múltiplos lotes físicos com quantidade batendo -> requer desmembramento das frações
  // 4º: Desempate N3 apurado -> supervisor precisa adotar N3 vs N2 vs ERP
  // 5º: Divergências cadastrais puras / Itens multi-item compensados / Faltas já isoladas
  const itensParaResolver = useMemo(() => {
    if (!grupo) return [];
    // Utiliza a base de todos os itens da nota fiscal para manter visibilidade de todos os desmembramentos e frações
    const base = [...baseTodosItens];
    const numnotaStr = String(grupo.numnota || grupo.nunota || '').trim();

    const getSeveridade = (it: typeof base[0]) => {
      const c = it.qtdN3 > 0 ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1;
      const dif = c - it.qtdEsperada;
      const lotes = ((it as any).lotesConferidos || []).length;
      const temN3 = (it.qtdN3 || 0) > 0;

      const ehMultiSeq = (contagemSeqsPorCodprod[it.codprod] || 0) > 1;
      const saldoGlobal = saldoConsolidadoPorProd[it.codprod]?.saldo ?? dif;
      const temSobraReal = ehMultiSeq ? (saldoGlobal > 0 && dif > 0) : dif > 0;

      const loteOrig = String(it.controleOriginal || '').trim();
      const nunotaStr = String(it.nunota || '').trim();
      const isFaltaIsolada = Boolean(dif < 0 && loteOrig && (loteOrig === numnotaStr || loteOrig === nunotaStr));

      if (temSobraReal) return 1; // 1. Sobra Física Real
      if (dif < 0 && !isFaltaIsolada) return 2; // 2. Falta Física Pendente
      if (lotes > 1) return 3; // 3. Múltiplos Lotes
      if (temN3) return 4; // 4. Desempate N3
      return 5; // 5. Divergências Cadastrais puras / Falta Isolada / Multi-Item Compensado
    };

    return base.sort((a, b) => {
      const sevA = getSeveridade(a);
      const sevB = getSeveridade(b);
      if (sevA !== sevB) return sevA - sevB;
      return a.sequencia - b.sequencia;
    });
  }, [grupo, contagemSeqsPorCodprod, saldoConsolidadoPorProd]);

  if (!isOpen || !grupo || itensParaResolver.length === 0) {
    return null;
  }

  const totalItens = itensParaResolver.length;

  // Função unificada para apurar se um item foi resolvido no assistente
  const verificarItemResolvido = (it: ItemDivergenciaResumo) => {
    const k = `${it.nunota}-${it.codprod}-${it.sequencia}`;
    if (itensRecontarN3.has(k)) return true;
    if (desmembramentosAgendados[k]) return true;

    const d = decisoesDoGrupo[k];
    const nAtivo: 'N1' | 'N2' | 'N3' | 'ERP' =
      d?.quantidade === 'ERP' || d?.lote === 'ERP'
        ? 'ERP'
        : d?.nivelEscolhido
        ? d.nivelEscolhido === 3
          ? 'N3'
          : d.nivelEscolhido === 2
          ? 'N2'
          : 'N1'
        : it.qtdN3 > 0
        ? 'N3'
        : it.qtdN2 > 0
        ? 'N2'
        : 'N1';
    const cAtiva = nAtivo === 'ERP' ? it.qtdEsperada : nAtivo === 'N3' ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1;
    const dif = cAtiva - it.qtdEsperada;
    const lotes = ((it as any).lotesConferidos || []).length;
    const pL = Boolean(it.divergenciaLote && !d?.lote);
    const pV = Boolean(it.divergenciaValidade && !d?.validade);
    const pF = Boolean(it.divergenciaFabricacao && !d?.fabricacao);

    const numnotaG = String(grupo.numnota || it.nunota || '').trim();
    const nunotaG = String(it.nunota || '').trim();
    const loteOrig = String(it.controleOriginal || '').trim();
    const itemFaltaIsolada = Boolean(
      dif < 0 && loteOrig && (loteOrig === numnotaG || loteOrig === nunotaG)
    );

    const ehMulti = (contagemSeqsPorCodprod[it.codprod] || 0) > 1;
    const saldoProd = saldoConsolidadoPorProd[it.codprod]?.saldo ?? dif;
    const itemSobraReal = ehMulti ? (saldoProd > 0 && dif > 0) : dif > 0;

    const sobraOk = !itemSobraReal || Boolean(sobrasAgendadas[k]);
    const faltaOk = dif >= 0 || itemFaltaIsolada;
    const lotesOk = lotes <= 1;
    const cadastralOk = !(pL || pV || pF);

    return sobraOk && faltaOk && lotesOk && cadastralOk;
  };

  // Separação de itens pendentes e itens resolvidos
  const itensResolvidos = itensParaResolver.filter(verificarItemResolvido);
  const itensPendentes = itensParaResolver.filter((it) => !verificarItemResolvido(it));
  const totalPendentes = itensPendentes.length;
  const totalResolvidos = itensResolvidos.length;
  const todosResolvidos = itensResolvidos.length === totalItens;
  const percentualConcluido = Math.round((itensResolvidos.length / totalItens) * 100);

  // Lista visível no Passo a Passo conforme o filtro minimalista selecionado
  const itensAtuaisPasso =
    filtroPasso === 'pendentes'
      ? (itensPendentes.length > 0 ? itensPendentes : itensParaResolver)
      : filtroPasso === 'resolvidos'
      ? (itensResolvidos.length > 0 ? itensResolvidos : itensParaResolver)
      : itensParaResolver;

  // Índice protegido contra overflow ao alternar filtros
  const safeIndex = Math.min(Math.max(0, indexAtual), Math.max(0, itensAtuaisPasso.length - 1));
  const itemAtual = itensAtuaisPasso[safeIndex] || itensParaResolver[0];
  const itemKeyAtual = `${itemAtual.nunota}-${itemAtual.codprod}-${itemAtual.sequencia}`;
  const decisaoAtual = decisoesDoGrupo[itemKeyAtual];
  const isMultiSeqItem = (contagemSeqsPorCodprod[itemAtual.codprod] || 0) > 1;

  const temN3Grupo = (grupo.totalN3 || 0) > 0;
  const temN3Item = (itemAtual.qtdN3 || 0) > 0;
  const estaEmN3 = verificarItemEmN3(grupo, itemAtual);

  const nivelAtivoItem: 'N1' | 'N2' | 'N3' | 'ERP' =
    decisaoAtual?.quantidade === 'ERP' || decisaoAtual?.lote === 'ERP'
      ? 'ERP'
      : decisaoAtual?.nivelEscolhido
      ? decisaoAtual.nivelEscolhido === 3
        ? 'N3'
        : decisaoAtual.nivelEscolhido === 2
        ? 'N2'
        : 'N1'
      : temN3Item
      ? 'N3'
      : itemAtual.qtdN2 > 0
      ? 'N2'
      : 'N1';

  const lotesConferidos: any[] = (itemAtual as any).lotesConferidos || [];
  const temMultiplosLotes = nivelAtivoItem !== 'ERP' && lotesConferidos.length > 1;

  const contagemAtiva =
    nivelAtivoItem === 'ERP'
      ? itemAtual.qtdEsperada
      : nivelAtivoItem === 'N1'
      ? itemAtual.qtdN1
      : nivelAtivoItem === 'N3'
      ? itemAtual.qtdN3
      : itemAtual.qtdN2 > 0
      ? itemAtual.qtdN2
      : itemAtual.qtdN1;

  const diferenca = contagemAtiva - itemAtual.qtdEsperada;
  const saldoGlobalItem = saldoConsolidadoPorProd[itemAtual.codprod]?.saldo ?? diferenca;
  const temSobraReal = isMultiSeqItem ? (saldoGlobalItem > 0 && diferenca > 0) : diferenca > 0;
  const ehMultiSeqCompensado = isMultiSeqItem && diferenca > 0 && saldoGlobalItem <= 0;
  const temSobra = temSobraReal;
  const temFalta = diferenca < 0;

  const loteOriginal = String(itemAtual.controleOriginal || '').trim();
  const numnotaStr = String(grupo.numnota || itemAtual.nunota || '').trim();
  const nunotaStr = String(itemAtual.nunota || '').trim();
  const isFaltaIsolada = Boolean(
    diferenca < 0 &&
    loteOriginal &&
    (loteOriginal === numnotaStr || loteOriginal === nunotaStr)
  );

  const temDivergenciaFiscal = Boolean(
    itemAtual.divergenciaLote || itemAtual.divergenciaValidade || itemAtual.divergenciaFabricacao
  );
  const pendenteLote = Boolean(itemAtual.divergenciaLote && !decisaoAtual?.lote);
  const pendenteValidade = Boolean(itemAtual.divergenciaValidade && !decisaoAtual?.validade);
  const pendenteFabricacao = Boolean(itemAtual.divergenciaFabricacao && !decisaoAtual?.fabricacao);
  const isPendenteFiscal = temDivergenciaFiscal && (pendenteLote || pendenteValidade || pendenteFabricacao);

  const decisaoCadastralAtiva: 'BIP' | 'ERP' | null =
    decisaoAtual?.lote === 'BIP' || decisaoAtual?.validade === 'BIP' || decisaoAtual?.fabricacao === 'BIP'
      ? 'BIP'
      : decisaoAtual?.lote === 'ERP' || decisaoAtual?.validade === 'ERP' || decisaoAtual?.fabricacao === 'ERP'
      ? 'ERP'
      : null;

  const isSobraAgendadaItem = Boolean(sobrasAgendadas[itemKeyAtual]);
  const isDesmembramentoAgendadoItem = Boolean(desmembramentosAgendados[itemKeyAtual]);
  const isN3AgendadoItem = itensRecontarN3.has(itemKeyAtual);
  const isItemResolvido = verificarItemResolvido(itemAtual);

  // Lista exibida na tabela do Resumo conforme a aba minimalista selecionada
  const itensExibirResumo =
    abaResumo === 'pendentes'
      ? itensPendentes
      : abaResumo === 'resolvidos'
      ? itensResolvidos
      : itensParaResolver;

  // Execução consolidada de todas as ações agendadas ao clicar em Concluir no Resumo
  const handleExecutarTudoEFinalizar = async () => {
    if (!grupo) return;
    if (!todosResolvidos) {
      alert(
        `Ainda há itens pendentes de resolução (${totalItens - itensResolvidos.length} de ${totalItens}). Revise e resolva todos os itens antes de executar as decisões.`
      );
      return;
    }
    setExecutandoLoteFinal(true);

    try {
      const listaSobras = Object.values(sobrasAgendadas);
      const listaDesmembramentos = Object.values(desmembramentosAgendados);
      const listaItensN3 = itensParaResolver.filter((it) =>
        itensRecontarN3.has(`${it.nunota}-${it.codprod}-${it.sequencia}`)
      );
      const temItensN3 = listaItensN3.length > 0;

      const totalEtapas =
        listaSobras.length +
        listaDesmembramentos.length +
        1;
      let etapaAtual = 1;

      // 1. Executar Ocorrências de Sobra agendadas
      for (const sobra of listaSobras) {
        setProgressoLote({
          etapaAtual,
          totalEtapas,
          descricao: `Gerando ocorrência de sobra: ${sobra.descrprod || `Cód ${sobra.codprod}`} (+${sobra.quantidadeSobra})...`,
        });
        if (onExecutarSobraApi) {
          await onExecutarSobraApi(sobra);
        }
        etapaAtual++;
      }

      // 2. Executar Desmembramentos agendados no Sankhya
      for (const desmemb of listaDesmembramentos) {
        setProgressoLote({
          etapaAtual,
          totalEtapas,
          descricao: `Desmembrando item no Sankhya ERP (Seq ${desmemb.sequencia} em ${desmemb.lotes?.length || 2} lotes)...`,
        });
        if (onExecutarDesmembramentoApi) {
          await onExecutarDesmembramentoApi(grupo.conferenciaId || grupo.id, desmemb);
        }
        etapaAtual++;
      }

      // 3. Se houver itens para N3: Enviar para Reconferência N3 e NÃO concluir a nota
      if (temItensN3) {
        setProgressoLote({
          etapaAtual,
          totalEtapas,
          descricao: `Enviando ${listaItensN3.length} produto(s) para Reconferência N3...`,
        });
        if (onExecutarN3Api) {
          await onExecutarN3Api(
            grupo.conferenciaId || grupo.id,
            listaItensN3,
            grupo.nunota
          );
        } else {
          onReconferirN3(grupo, listaItensN3);
        }
        // Fecha o assistente deixando a nota aberta em N3 (não chama onFinalizarResolucao)
        onClose();
      } else {
        // 4. Se não há N3: Todos os itens foram resolvidos! Salva decisões fiscais e conclui a nota
        setProgressoLote({
          etapaAtual,
          totalEtapas,
          descricao: `Salvando decisões fiscais e finalizando resolução da nota...`,
        });
        onFinalizarResolucao(grupo);
        onClose();
      }
    } catch (err: any) {
      alert(`Erro ao executar ações no Sankhya: ${err.message || 'Falha na comunicação'}`);
    } finally {
      setExecutandoLoteFinal(false);
      setProgressoLote(null);
    }
  };

  const toggleRecontarN3 = (key: string) => {
    setItensRecontarN3((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // Exclusividade mútua: ao agendar para N3, limpa qualquer decisão fiscal cadastrada
        if (onLimparDecisaoItem) {
          onLimparDecisaoItem(grupo.id, key);
        }
      }
      return next;
    });
  };

  const removerSobraAgendada = (key: string) => {
    setSobrasAgendadas((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const removerDesmembramentoAgendado = (key: string) => {
    setDesmembramentosAgendados((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Navegações do assistente
  const irParaProximo = () => {
    if (safeIndex < itensAtuaisPasso.length - 1) {
      setIndexAtual(safeIndex + 1);
    } else {
      setModoResumo(true);
      if (totalPendentes <= 1) {
        setAbaResumo('resolvidos');
      }
    }
  };

  const irParaAnterior = () => {
    if (safeIndex > 0) {
      setIndexAtual(safeIndex - 1);
    }
  };

  const pularItem = () => {
    setItensPulados((prev) => new Set(prev).add(itemKeyAtual));
    irParaProximo();
  };

  const selecionarItemDireto = (idx: number) => {
    setIndexAtual(idx);
    setModoResumo(false);
  };

  // Abrir item específico a partir da tabela do Resumo
  const selecionarItemDoResumo = (it: ItemDivergenciaResumo) => {
    const resolvido = verificarItemResolvido(it);
    const k = `${it.nunota}-${it.codprod}-${it.sequencia}`;
    if (!resolvido) {
      setFiltroPasso('pendentes');
      const idx = itensPendentes.findIndex((x) => `${x.nunota}-${x.codprod}-${x.sequencia}` === k);
      setIndexAtual(idx >= 0 ? idx : 0);
    } else {
      setFiltroPasso('resolvidos');
      const idx = itensResolvidos.findIndex((x) => `${x.nunota}-${x.codprod}-${x.sequencia}` === k);
      setIndexAtual(idx >= 0 ? idx : 0);
    }
    setModoResumo(false);
  };

  // Aplicação rápida de decisão fiscal e avanço automático suave
  const handleDecisaoRapidaFiscal = (opcao: 'ERP' | 'BIP' | 'N2') => {
    // Exclusividade mútua: ao selecionar uma decisão fiscal, cancela o agendamento de N3
    if (itensRecontarN3.has(itemKeyAtual)) {
      setItensRecontarN3((prev) => {
        const next = new Set(prev);
        next.delete(itemKeyAtual);
        return next;
      });
    }

    const itemInfo = {
      nunota: itemAtual.nunota,
      codprod: itemAtual.codprod,
      sequencia: itemAtual.sequencia,
    };
    if (itemAtual.divergenciaLote) {
      onDefinirDecisaoFiscal(grupo.id, itemKeyAtual, itemInfo, 'lote', opcao);
    }
    if (itemAtual.divergenciaValidade) {
      onDefinirDecisaoFiscal(grupo.id, itemKeyAtual, itemInfo, 'validade', opcao);
    }
    if (itemAtual.divergenciaFabricacao) {
      onDefinirDecisaoFiscal(grupo.id, itemKeyAtual, itemInfo, 'fabricacao', opcao);
    }
    setTimeout(() => {
      if (filtroPasso === 'pendentes' && totalPendentes <= 1) {
        setModoResumo(true);
        setAbaResumo('resolvidos');
      } else {
        irParaProximo();
      }
    }, 280);
  };

  // Adoção rápida de nível de desempate (N3 vs N2 vs ERP)
  const handleAdotarNivelRapido = (nivel: 'N3' | 'N2' | 'ERP') => {
    // Exclusividade mútua: ao adotar um nível, cancela o agendamento de N3
    if (itensRecontarN3.has(itemKeyAtual)) {
      setItensRecontarN3((prev) => {
        const next = new Set(prev);
        next.delete(itemKeyAtual);
        return next;
      });
    }

    const itemInfo = {
      nunota: itemAtual.nunota,
      codprod: itemAtual.codprod,
      sequencia: itemAtual.sequencia,
    };
    onSelecionarNivelItem(grupo.id, itemKeyAtual, itemInfo, nivel);
    setTimeout(() => {
      if (filtroPasso === 'pendentes' && totalPendentes <= 1) {
        setModoResumo(true);
        setAbaResumo('resolvidos');
      } else {
        irParaProximo();
      }
    }, 280);
  };

  const ocsItem = obterOcorrenciasDoItem(
    ocorrencias,
    itemAtual.nunota,
    itemAtual.codprod,
    itemAtual.sequencia
  );

  return (
    <div
      className="gestao-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9990,
        padding: '14px',
      }}
    >
      <div
        className="modal-assistente-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: 'var(--slate-900, #0f172a)',
          borderRadius: '16px',
          maxWidth: '860px',
          width: '98%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.28)',
          border: '1px solid var(--slate-200, #e2e8f0)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Assistente */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: '1px solid #bfdbfe',
              }}
            >
              🧙
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Assistente de Resolução de Divergências
                </h3>
                <span
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: 'var(--slate-700)',
                    border: '1px solid var(--slate-300)',
                  }}
                >
                  NF #{grupo.numnota || grupo.numerosNotas}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                Fornecedor: <strong style={{ color: 'var(--slate-700)' }}>{grupo.fornecedor}</strong> • NUNOTA {grupo.nunota || itemAtual.nunota}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setModoResumo(!modoResumo)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: modoResumo ? '#eff6ff' : '#ffffff',
                color: modoResumo ? '#1d4ed8' : 'var(--slate-700)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {modoResumo ? '← Voltar ao Passo a Passo' : '📋 Ver Resumo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'var(--slate-400)',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              title="Fechar assistente"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Progresso e Stepper Horizontal */}
        <div
          style={{
            padding: '10px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                {modoResumo ? (
                  <span>Visão Geral das Resoluções da Nota Fiscal</span>
                ) : (
                  <span>
                    {filtroPasso === 'pendentes' ? 'Pendência' : filtroPasso === 'resolvidos' ? 'Resolvido' : 'Item'}{' '}
                    <strong>{safeIndex + 1}</strong> de <strong>{itensAtuaisPasso.length}</strong>
                    {itensPulados.has(itemKeyAtual) && (
                      <span style={{ color: '#b45309', marginLeft: '6px', fontSize: '0.72rem' }}>
                        (↷ Marcado como pulado)
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Pílulas Minimalistas de Filtro no Passo a Passo */}
              {!modoResumo && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setFiltroPasso('pendentes'); setIndexAtual(0); }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: filtroPasso === 'pendentes' ? '#ffffff' : 'transparent',
                      color: filtroPasso === 'pendentes' ? '#92400e' : '#64748b',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: filtroPasso === 'pendentes' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Focar apenas nos itens com pendência de resolução"
                  >
                    <span>⚠️ Pendentes ({totalPendentes})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFiltroPasso('resolvidos'); setIndexAtual(0); }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: filtroPasso === 'resolvidos' ? '#ffffff' : 'transparent',
                      color: filtroPasso === 'resolvidos' ? '#15803d' : '#64748b',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: filtroPasso === 'resolvidos' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Visualizar itens com ações já agendadas ou decididas"
                  >
                    <span>✓ Já Resolvidos ({totalResolvidos})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFiltroPasso('todos'); setIndexAtual(0); }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: filtroPasso === 'todos' ? '#ffffff' : 'transparent',
                      color: filtroPasso === 'todos' ? '#0f172a' : '#64748b',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: filtroPasso === 'todos' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Visualizar todos os produtos da nota"
                  >
                    <span>Todos ({totalItens})</span>
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--slate-800)', fontFamily: 'JetBrains Mono, monospace' }}>
              {percentualConcluido}% resolvido ({totalResolvidos}/{totalItens})
            </div>
          </div>

          {/* Barra de Progresso */}
          <div
            style={{
              width: '100%',
              height: '5px',
              background: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${percentualConcluido}%`,
                height: '100%',
                background: percentualConcluido === 100 ? '#15803d' : '#0f172a',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Bolinhas Clicáveis de Itens (Steps) */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              overflowX: 'auto',
              padding: '6px 4px',
              minHeight: '36px',
            }}
          >
            {itensAtuaisPasso.map((it, idx) => {
              const k = `${it.nunota}-${it.codprod}-${it.sequencia}`;
              const resolvido = verificarItemResolvido(it);
              const isAtual = idx === safeIndex && !modoResumo;
              const pulado = itensPulados.has(k);

              let bgColor = '#ffffff';
              let borderColor = '#e2e8f0';
              let textColor = '#94a3b8';

              if (isAtual) {
                if (resolvido) {
                  bgColor = '#15803d';
                  borderColor = '#15803d';
                  textColor = '#ffffff';
                } else {
                  bgColor = '#0f172a';
                  borderColor = '#0f172a';
                  textColor = '#ffffff';
                }
              } else if (resolvido) {
                bgColor = '#f0fdf4';
                borderColor = '#86efac';
                textColor = '#15803d';
              } else if (pulado) {
                bgColor = '#f8fafc';
                borderColor = '#94a3b8';
                textColor = '#475569';
              }

              return (
                <button
                  key={`step-${k}`}
                  type="button"
                  onClick={() => selecionarItemDireto(idx)}
                  style={{
                    width: isAtual ? '26px' : '24px',
                    height: isAtual ? '26px' : '24px',
                    borderRadius: '50%',
                    background: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    color: textColor,
                    fontSize: isAtual ? '0.72rem' : '0.68rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isAtual ? (resolvido ? '0 0 0 2px rgba(21,128,61,0.25)' : '0 0 0 2px rgba(15,23,42,0.18)') : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Item ${idx + 1}: ${it.descrprod || it.codprod} (${resolvido ? 'Resolvido' : pulado ? 'Pulado' : 'Pendente'})`}
                >
                  {resolvido ? '✓' : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corpo do Assistente (Modo Passo a Passo vs Modo Resumo) */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {modoResumo ? (
            /* TELA DE RESUMO FINAL */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--slate-200)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '2rem' }}>
                  {itensResolvidos.length === totalItens ? '🎉' : '📋'}
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                    Balanço das Divergências da Nota Fiscal
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '2px' }}>
                    {itensRecontarN3.size > 0
                      ? `${itensRecontarN3.size} produto(s) serão enviados para Reconferência N3 no coletor. A conferência permanecerá aberta para nova contagem.`
                      : itensResolvidos.length === totalItens
                      ? 'Todos os itens foram devidamente apurados e decididos! Você já pode salvar as decisões e concluir a conferência.'
                      : `${itensResolvidos.length} de ${totalItens} itens resolvidos. Revise os itens pendentes antes de aprovar.`}
                  </p>
                </div>
              </div>

              {/* CARD DE AÇÕES AGENDADAS PARA EXECUÇÃO EM LOTE */}
              {(Object.keys(sobrasAgendadas).length > 0 || Object.keys(desmembramentosAgendados).length > 0 || itensRecontarN3.size > 0) && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>⚡</span>
                  <div style={{ flex: 1, fontSize: '0.78rem', color: '#166534' }}>
                    <div style={{ fontWeight: 800, marginBottom: '2px' }}>
                      Ações Agendadas para Execução Automática ao Concluir:
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {Object.keys(sobrasAgendadas).length > 0 && (
                        <span>📦 <strong>{Object.keys(sobrasAgendadas).length}</strong> Ocorrência(s) de Sobra</span>
                      )}
                      {Object.keys(desmembramentosAgendados).length > 0 && (
                        <span>✂️ <strong>{Object.keys(desmembramentosAgendados).length}</strong> Desmembramento(s) ERP</span>
                      )}
                      {itensRecontarN3.size > 0 && (
                        <span>🔍 <strong>{itensRecontarN3.size}</strong> Item(ns) p/ Reconferência N3</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BARRA DE PROGRESSO DURANTE A EXECUÇÃO EM LOTE */}
              {executandoLoteFinal && progressoLote && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px solid #16a34a',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#15803d' }}>
                      Executando Etapa {progressoLote.etapaAtual} de {progressoLote.totalEtapas} no Sankhya...
                    </span>
                    <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#166534', fontFamily: 'JetBrains Mono, monospace' }}>
                      {Math.round((progressoLote.etapaAtual / progressoLote.totalEtapas) * 100)}%
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    {progressoLote.descricao}
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(progressoLote.etapaAtual / progressoLote.totalEtapas) * 100}%`,
                        height: '100%',
                        background: '#16a34a',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Abas Minimalistas do Resumo: Pendentes vs Já Resolvidos vs Todos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setAbaResumo('pendentes')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: abaResumo === 'pendentes' ? '1.5px solid #d97706' : '1px solid #e2e8f0',
                      background: abaResumo === 'pendentes' ? '#fffbeb' : '#ffffff',
                      color: abaResumo === 'pendentes' ? '#92400e' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>⚠️ Pendentes</span>
                    <span
                      style={{
                        background: abaResumo === 'pendentes' ? '#d97706' : '#f1f5f9',
                        color: abaResumo === 'pendentes' ? '#ffffff' : '#64748b',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                      }}
                    >
                      {totalPendentes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbaResumo('resolvidos')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: abaResumo === 'resolvidos' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                      background: abaResumo === 'resolvidos' ? '#f0fdf4' : '#ffffff',
                      color: abaResumo === 'resolvidos' ? '#15803d' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>✓ Já Resolvidos</span>
                    <span
                      style={{
                        background: abaResumo === 'resolvidos' ? '#16a34a' : '#f1f5f9',
                        color: abaResumo === 'resolvidos' ? '#ffffff' : '#64748b',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontSize: '0.66rem',
                        fontWeight: 800,
                      }}
                    >
                      {totalResolvidos}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbaResumo('todos')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: abaResumo === 'todos' ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      background: abaResumo === 'todos' ? '#0f172a' : '#ffffff',
                      color: abaResumo === 'todos' ? '#ffffff' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Todos ({totalItens})</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  Exibindo {itensExibirResumo.length} de {totalItens} itens
                </div>
              </div>

              {/* Tabela Sintética dos Itens no Resumo */}
              {itensExibirResumo.length === 0 ? (
                <div
                  style={{
                    padding: '28px 20px',
                    background: abaResumo === 'pendentes' ? '#f0fdf4' : '#f8fafc',
                    border: `1px dashed ${abaResumo === 'pendentes' ? '#86efac' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '1.6rem' }}>{abaResumo === 'pendentes' ? '🎉' : '📋'}</span>
                  <div style={{ fontWeight: 800, fontSize: '0.90rem', color: abaResumo === 'pendentes' ? '#15803d' : '#334155' }}>
                    {abaResumo === 'pendentes'
                      ? 'Nenhum item pendente! Todos os produtos foram resolvidos.'
                      : 'Nenhum item resolvido até o momento.'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: abaResumo === 'pendentes' ? '#166534' : '#64748b', maxWidth: '440px' }}>
                    {abaResumo === 'pendentes'
                      ? 'Você pode revisar as ações na aba "Já Resolvidos" ou clicar abaixo em "Executar Decisões e Concluir Nota" para gravar no Sankhya.'
                      : 'Acesse a aba "Pendentes" ou inicie o passo a passo para definir as ações desta conferência.'}
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--slate-200)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--slate-200)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '30px' }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Produto</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Esperado</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Contagem</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Saldo / Lotes</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Decisão Adotada</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensExibirResumo.map((it, idx) => {
                      const k = `${it.nunota}-${it.codprod}-${it.sequencia}`;
                      const d = decisoesDoGrupo[k];
                      const nAtivo: 'N1' | 'N2' | 'N3' | 'ERP' =
      d?.quantidade === 'ERP' || d?.lote === 'ERP'
        ? 'ERP'
        : d?.nivelEscolhido
        ? d.nivelEscolhido === 3
          ? 'N3'
          : d.nivelEscolhido === 2
          ? 'N2'
          : 'N1'
        : it.qtdN3 > 0
        ? 'N3'
        : it.qtdN2 > 0
        ? 'N2'
        : 'N1';
                      const cAtiva = nAtivo === 'ERP' ? it.qtdEsperada : nAtivo === 'N3' ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1;
                      const dif = cAtiva - it.qtdEsperada;
                      const lotes = ((it as any).lotesConferidos || []).length;
                      const pL = Boolean(it.divergenciaLote && !d?.lote);
                      const pV = Boolean(it.divergenciaValidade && !d?.validade);
                      const pF = Boolean(it.divergenciaFabricacao && !d?.fabricacao);

                      const isSobraAgendada = Boolean(sobrasAgendadas[k]);
                      const isDesmembAgendado = Boolean(desmembramentosAgendados[k]);
                      const isN3Agendado = itensRecontarN3.has(k);
                      const resolvido = verificarItemResolvido(it);

                      const numnotaG = String(grupo.numnota || it.nunota || '').trim();
                      const nunotaG = String(it.nunota || '').trim();
                      const loteOrig = String(it.controleOriginal || '').trim();
                      const itemFaltaIsolada = Boolean(
                        dif < 0 && loteOrig && (loteOrig === numnotaG || loteOrig === nunotaG)
                      );
                      const ehMulti = (contagemSeqsPorCodprod[it.codprod] || 0) > 1;
                      const saldoProd = saldoConsolidadoPorProd[it.codprod]?.saldo ?? dif;
                      const itemMultiCompensado = ehMulti && dif > 0 && saldoProd <= 0;

                      return (
                        <tr
                          key={`resumo-${k}`}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: resolvido ? '#ffffff' : '#fcfcfc',
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 700 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {it.descrprod || `Produto ${it.codprod}`}
                            </div>
                            <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                              Cód: {it.codprod} • Seq: <strong>{it.sequencia}</strong> • {it.codvol || 'UN'}
                              {it.controleOriginal ? ` • Lote NF: ${it.controleOriginal}` : ''}
                              {(contagemSeqsPorCodprod[it.codprod] || 0) > 1 && (
                                <span style={{ marginLeft: '6px', color: '#334155', fontWeight: 700 }}>
                                  (Multi-Item)
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                            {it.qtdEsperada}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                            {cAtiva} ({nAtivo})
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {itemFaltaIsolada ? (
                              <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.72rem' }}>
                                ✓ Falta Isolada
                              </span>
                            ) : itemMultiCompensado ? (
                              <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.72rem' }}>
                                ✓ Compensado na NF
                              </span>
                            ) : dif > 0 ? (
                              <span style={{ color: '#b91c1c', fontWeight: 700 }}>+{dif} (Sobra)</span>
                            ) : dif < 0 ? (
                              <span style={{ color: '#b45309', fontWeight: 700 }}>{dif} (Falta)</span>
                            ) : lotes > 1 ? (
                              <span style={{ color: '#334155', fontWeight: 700 }}>{lotes} Lotes</span>
                            ) : (
                              <span style={{ color: '#15803d', fontWeight: 700 }}>✓ Bateu</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {isN3Agendado ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                🔍 N3 Agendado
                              </span>
                            ) : isSobraAgendada ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                📦 Sobra (+{sobrasAgendadas[k]?.quantidadeSobra})
                              </span>
                            ) : isDesmembAgendado ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                ✂️ Desmembramento ({desmembramentosAgendados[k]?.lotes?.length || 2} lotes)
                              </span>
                            ) : itemFaltaIsolada ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  background: '#f0fdf4',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                ✓ Falta Isolada no ERP
                              </span>
                            ) : itemMultiCompensado ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: '#1d4ed8',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                ✓ Multi-Item Compensado
                              </span>
                            ) : temN3Grupo && (it.qtdN3 > 0 || (it as any).loteN3) ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: nAtivo === 'ERP' ? '#334155' : '#15803d',
                                  background: nAtivo === 'ERP' ? '#f1f5f9' : '#f0fdf4',
                                  border: `1px solid ${nAtivo === 'ERP' ? '#cbd5e1' : '#bbf7d0'}`,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                {nAtivo === 'N3' ? '⚖️ N3' : nAtivo === 'N2' ? '⚖️ N2' : '📄 ERP'}
                              </span>
                            ) : (d?.lote || d?.validade || d?.fabricacao) ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 700,
                                  color: (d?.lote === 'BIP' || d?.validade === 'BIP') ? '#15803d' : '#334155',
                                  background: (d?.lote === 'BIP' || d?.validade === 'BIP') ? '#f0fdf4' : '#f1f5f9',
                                  border: `1px solid ${(d?.lote === 'BIP' || d?.validade === 'BIP') ? '#bbf7d0' : '#cbd5e1'}`,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                {(d?.lote === 'BIP' || d?.validade === 'BIP') ? '📱 Coletor' : '📄 ERP'}
                              </span>
                            ) : dif > 0 ? (
                              <span style={{ fontSize: '0.70rem', color: '#b91c1c', fontWeight: 600 }}>
                                📦 Sobra Pendente
                              </span>
                            ) : lotes > 1 ? (
                              <span style={{ fontSize: '0.70rem', color: '#b45309', fontWeight: 600 }}>
                                ✂️ Desmembramento Pendente
                              </span>
                            ) : dif < 0 ? (
                              <span style={{ fontSize: '0.70rem', color: '#b45309', fontWeight: 600 }}>
                                ⚠️ Falta Pendente
                              </span>
                            ) : (pL || pV || pF) ? (
                              <span style={{ fontSize: '0.70rem', color: '#b45309', fontWeight: 600 }}>
                                ⚠️ Decisão Pendente
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 600 }}>
                                ✓ Conforme Nota
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {resolvido ? (
                              <span style={{ color: '#15803d', fontSize: '0.94rem', fontWeight: 800 }}>
                                ✓
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.80rem', fontWeight: 600 }}>
                                —
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => selecionarItemDoResumo(it)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: resolvido ? '1px solid #cbd5e1' : 'none',
                                background: resolvido ? '#f1f5f9' : '#0f172a',
                                color: resolvido ? '#334155' : '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {resolvido ? 'Revisar ✎' : 'Resolver →'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
            /* TELA PASSO A PASSO DO ITEM ATUAL */
            <>
              {/* Card Resumo do Produto (Paleta Slate Corporativa) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                      {itemAtual.descrprod || `Produto ${itemAtual.codprod}`}
                    </span>
                    {isMultiSeqItem && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.70rem',
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                        title={`Item com múltiplas sequências faturadas nesta nota fiscal (Sequência ${itemAtual.sequencia} de ${contagemSeqsPorCodprod[itemAtual.codprod]})`}
                      >
                        📑 Multi-Item na NF (Seq. {itemAtual.sequencia})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Cód: <strong style={{ color: '#334155' }}>{itemAtual.codprod}</strong>
                    {itemAtual.referencia ? ` • Ref: ${itemAtual.referencia}` : ''} • Volume: <strong>{itemAtual.codvol || 'UN'}</strong> • Sequência: <strong style={{ color: '#334155' }}>{itemAtual.sequencia}</strong>
                    {itemAtual.controleOriginal ? (
                      <span style={{ marginLeft: '6px', color: '#475569' }}>
                        • Lote NF: <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0f172a' }}>{itemAtual.controleOriginal}</strong>
                      </span>
                    ) : ''}
                  </div>
                  {renderBadgesOcorrenciasItem(ocsItem)}
                </div>

                {/* Grid Compacto de Quantidades */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                      Faturado (Seq. {itemAtual.sequencia})
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      {itemAtual.qtdEsperada}
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                      Coletor (N2)
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                      {itemAtual.qtdN2 || itemAtual.qtdN1}
                    </div>
                  </div>

                  {temN3Grupo && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                        Recontagem (N3)
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                        {itemAtual.qtdN3 > 0 ? itemAtual.qtdN3 : '—'}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.64rem',
                        textTransform: 'uppercase',
                        color: '#64748b',
                        fontWeight: 700,
                      }}
                    >
                      Diferença
                    </div>
                    <div
                      style={{
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        color: temSobra ? '#b91c1c' : temFalta ? '#b45309' : '#15803d',
                      }}
                    >
                      {diferenca > 0 ? `+${diferenca}` : diferenca}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD DE AÇÃO RECOMENDADA EM DESTAQUE (PALETA SLATE CORPORATIVA) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>⚡</span> Ação Recomendada para este Item
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    Decisão Orientada
                  </span>
                </div>

                {/* CENÁRIO 1: SOBRA FÍSICA REAL */}
                {temSobra && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.80rem', color: '#334155' }}>
                      {isSobraAgendadaItem ? (
                        <span>
                          Ocorrência de sobra física agendada para ser executada no Sankhya ao concluir:
                        </span>
                      ) : (
                        <span>
                          Configure a ocorrência de sobra física de <strong>+{diferenca} {itemAtual.codvol || 'UN'}</strong> para regularizar o saldo do estoque no ERP ao concluir:
                        </span>
                      )}
                    </div>

                    {isSobraAgendadaItem ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            background: '#f0fdf4',
                            border: '2px solid #16a34a',
                            color: '#15803d',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 1,
                          }}
                        >
                          <span>✓</span>
                          <span>
                            Sobra Agendada: +{sobrasAgendadas[itemKeyAtual]?.quantidadeSobra || diferenca} {itemAtual.codvol || 'UN'}
                            {sobrasAgendadas[itemKeyAtual]?.lote ? ` • Lote: ${sobrasAgendadas[itemKeyAtual].lote}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalSobraConfig({ item: { ...itemAtual, diferenca } as any, grupo })}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #16a34a',
                            background: '#ffffff',
                            color: '#15803d',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          title="Revalidar ou alterar dados da ocorrência de sobra"
                        >
                          🔄 Revalidar Sobra
                        </button>
                        <button
                          type="button"
                          onClick={() => removerSobraAgendada(itemKeyAtual)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#64748b',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Desfazer agendamento da ocorrência de sobra"
                        >
                          ✕ Limpar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalSobraConfig({ item: { ...itemAtual, diferenca } as any, grupo })}
                        disabled={executandoOcorrenciaSobra}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0f172a',
                          color: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                        }}
                      >
                        <span style={{ color: '#ffffff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>📦</span> Configurar Ocorrência de Sobra (+{diferenca} {itemAtual.codvol || 'UN'})
                        </span>
                      </button>
                    )}

                    {/* Decisão Cadastral do Saldo Restante quando a sobra já estiver agendada */}
                    {isSobraAgendadaItem && temDivergenciaFiscal && !temMultiplosLotes && (
                      <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ fontSize: '0.80rem', color: '#334155', marginBottom: '8px' }}>
                          A sobra física foi agendada. Agora selecione os dados cadastrais (Lote / Validade) para o saldo de <strong>{itemAtual.qtdEsperada} {itemAtual.codvol || 'UN'}</strong> restante na nota fiscal:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleDecisaoRapidaFiscal('BIP')}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: decisaoCadastralAtiva === 'BIP' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                              background: decisaoCadastralAtiva === 'BIP' ? '#f0fdf4' : '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: decisaoCadastralAtiva === 'BIP' ? '#15803d' : '#0f172a' }}>
                                📱 Coletor (Bipado)
                              </div>
                              {decisaoCadastralAtiva === 'BIP' && (
                                <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  ✓ SELECIONADO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                              Lote: <strong>{itemAtual.lote || '—'}</strong> • Val: <strong>{formatarDataSimples(itemAtual.validade) || '—'}</strong>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDecisaoRapidaFiscal('ERP')}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: decisaoCadastralAtiva === 'ERP' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                              background: decisaoCadastralAtiva === 'ERP' ? '#f0fdf4' : '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: decisaoCadastralAtiva === 'ERP' ? '#15803d' : '#0f172a' }}>
                                📄 Nota Fiscal (ERP)
                              </div>
                              {decisaoCadastralAtiva === 'ERP' && (
                                <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  ✓ SELECIONADO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                              Lote: <strong>{loteOriginal || 'Sem Lote'}</strong> • Val: <strong>{formatarDataSimples(itemAtual.validadeOriginal) || '—'}</strong>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {temMultiplosLotes && !isSobraAgendadaItem && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                        💡 Após agendar a sobra de {diferenca} {itemAtual.codvol || 'UN'}, o botão de desmembramento será desbloqueado para separar os lotes.
                      </div>
                    )}
                  </div>
                )}

                {/* CENÁRIO ESPECIAL: MULTI-ITEM COMPENSADO NA NOTA */}
                {ehMultiSeqCompensado && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      📑
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1d4ed8' }}>
                        Produto Multi-Item Compensado na NF
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#1e40af', marginTop: '2px' }}>
                        O produto possui múltiplas sequências na nota (Total Faturado: <strong>{saldoConsolidadoPorProd[itemAtual.codprod]?.esperado} {itemAtual.codvol || 'UN'}</strong>, Total Conferido: <strong>{saldoConsolidadoPorProd[itemAtual.codprod]?.conferido} {itemAtual.codvol || 'UN'}</strong>). A contagem física desta sequência compensa as sequências complementares e <strong>não configura sobra física</strong>.
                      </div>
                    </div>
                  </div>
                )}

                {/* CENÁRIO ESPECIAL: FALTA JÁ ISOLADA NO ERP */}
                {isFaltaIsolada && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '2px solid #16a34a',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#dcfce7',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#15803d' }}>
                        Falta Isolada no ERP ({Math.abs(diferenca)} {itemAtual.codvol || 'UN'})
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '2px' }}>
                        Esta falta já foi desmembrada no Sankhya e isolada com o lote da Nota Fiscal (<strong>{loteOriginal}</strong>). O item está 100% resolvido.
                      </div>
                    </div>
                  </div>
                )}

                {/* CENÁRIO 2: MÚLTIPLOS LOTES OU FALTA (SEM SOBRA OU COM SOBRA JÁ AGENDADA, E SEM FALTA JÁ ISOLADA) */}
                {(!temSobra || isSobraAgendadaItem) && !isFaltaIsolada && (temMultiplosLotes || temFalta) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {isN3AgendadoItem ? (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '2px solid #16a34a',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🔍</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#15803d' }}>
                              Item Agendado para Reconferência N3
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '2px' }}>
                              Este item em falta será recontado às cegas no Nível 3 ao concluir a nota. O desmembramento não é necessário agora.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleRecontarN3(itemKeyAtual)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #16a34a',
                            background: '#ffffff',
                            color: '#15803d',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          ✕ Cancelar N3
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.80rem', color: '#334155' }}>
                          {isDesmembramentoAgendadoItem ? (
                            <span>
                              Desmembramento{temFalta ? ' e isolamento de falta' : ' em lotes'} agendado para ser executado no Sankhya ERP ao concluir:
                            </span>
                          ) : (
                            <span>
                              {temMultiplosLotes && temFalta
                                ? `O produto possui ${lotesConferidos.length} lotes conferidos e saldo faltante de ${diferenca} ${itemAtual.codvol || 'UN'}. Configure o desmembramento das frações e o isolamento da falta no Sankhya:`
                                : temMultiplosLotes
                                ? `O produto possui ${lotesConferidos.length} lotes conferidos. Configure o desmembramento das frações no Sankhya:`
                                : `O produto possui saldo faltante de ${diferenca} ${itemAtual.codvol || 'UN'}. Isole a falta no Sankhya ou solicite recontagem N3:`}
                            </span>
                          )}
                        </div>

                        {isDesmembramentoAgendadoItem ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div
                              style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                background: '#f0fdf4',
                                border: '2px solid #16a34a',
                                color: '#15803d',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flex: 1,
                              }}
                            >
                              <span>✓</span>
                              <span>
                                Desmembramento Agendado: {desmembramentosAgendados[itemKeyAtual]?.lotes?.length || 2} frações{temFalta ? ' (incluindo isolamento da falta)' : ' definidas'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalDesmembrarConfig({ item: itemAtual, grupo })}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1px solid #16a34a',
                                background: '#ffffff',
                                color: '#15803d',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                              title="Revalidar ou alterar lotes, quantidades e locais de estoque"
                            >
                              🔄 Revalidar Desmembramento
                            </button>
                            <button
                              type="button"
                              onClick={() => removerDesmembramentoAgendado(itemKeyAtual)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#64748b',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Desfazer agendamento do desmembramento"
                            >
                              ✕ Limpar
                            </button>
                          </div>
                        ) : temFalta ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                            <button
                              type="button"
                              onClick={() => toggleRecontarN3(itemKeyAtual)}
                              style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: '1px solid #93c5fd',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.15s ease',
                              }}
                              title="Agendar recontagem física cega deste produto faltante no coletor N3"
                            >
                              <span>🔍 Solicitar Reconferência N3</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setModalDesmembrarConfig({ item: itemAtual, grupo })}
                              disabled={executandoDesmembramento}
                              style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#0f172a',
                                color: '#ffffff',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                                transition: 'all 0.15s ease',
                              }}
                              title="Confirmar a falta e desmembrar o produto no Sankhya definindo lotes e locais"
                            >
                              <span>✂️ Desmembrar no ERP (Isolar Falta)</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setModalDesmembrarConfig({ item: itemAtual, grupo })}
                            disabled={executandoDesmembramento}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#0f172a',
                              color: '#ffffff',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                            }}
                          >
                            ✂️ Configurar Desmembramento no Sankhya ERP ({lotesConferidos.length} Lotes)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* CENÁRIO 3: DESEMPATE N3 */}
                {!temSobra && !temMultiplosLotes && temN3Item && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.80rem', color: '#334155' }}>
                      Selecione qual pacote de contagem deseja adotar para este item:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {/* Opção N3 */}
                      <button
                        type="button"
                        onClick={() => handleAdotarNivelRapido('N3')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: nivelAtivoItem === 'N3' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                          background: nivelAtivoItem === 'N3' ? '#f0fdf4' : '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: nivelAtivoItem === 'N3' ? '#15803d' : '#0f172a' }}>
                            {nivelAtivoItem === 'N3' ? '✓ ' : ''}Reconferência (N3)
                          </div>
                          {nivelAtivoItem === 'N3' && (
                            <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              ✓ SELECIONADO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                          Qtd: <strong>{itemAtual.qtdN3}</strong> • Lote: <strong>{itemAtual.lote || '(Bipado N3)'}</strong>
                        </div>
                      </button>

                      {/* Opção N2 */}
                      <button
                        type="button"
                        onClick={() => handleAdotarNivelRapido('N2')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: nivelAtivoItem === 'N2' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                          background: nivelAtivoItem === 'N2' ? '#f0fdf4' : '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: nivelAtivoItem === 'N2' ? '#15803d' : '#0f172a' }}>
                            {nivelAtivoItem === 'N2' ? '✓ ' : ''}Coletor (N2)
                          </div>
                          {nivelAtivoItem === 'N2' && (
                            <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              ✓ SELECIONADO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                          Qtd: <strong>{itemAtual.qtdN2}</strong> • Lote: <strong>{(itemAtual as any).loteN2 || itemAtual.lote}</strong>
                        </div>
                      </button>

                      {/* Opção ERP */}
                      <button
                        type="button"
                        onClick={() => handleAdotarNivelRapido('ERP')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: nivelAtivoItem === 'ERP' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                          background: nivelAtivoItem === 'ERP' ? '#f0fdf4' : '#ffffff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: nivelAtivoItem === 'ERP' ? '#15803d' : '#0f172a' }}>
                            {nivelAtivoItem === 'ERP' ? '✓ ' : ''}Nota Fiscal (ERP)
                          </div>
                          {nivelAtivoItem === 'ERP' && (
                            <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              ✓ SELECIONADO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                          Qtd: <strong>{itemAtual.qtdEsperada}</strong> • Lote: <strong>{loteOriginal || 'Sem lote'}</strong>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* CENÁRIO 4: DIVERGÊNCIA CADASTRAL DE LOTE / VALIDADE (QUANTIDADE 100% OK, SEM SOBRA NEM FALTA) */}
                {!temSobra && !temFalta && !temMultiplosLotes && !temN3Item && temDivergenciaFiscal && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isN3AgendadoItem ? (
                      <div
                        style={{
                          background: '#f0fdf4',
                          border: '2px solid #16a34a',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🔍</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#15803d' }}>
                              Item Agendado para Reconferência N3
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '2px' }}>
                              Este item aguardará a nova contagem cega N3 ao concluir a nota. Nenhuma decisão cadastral é necessária.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleRecontarN3(itemKeyAtual)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #16a34a',
                            background: '#ffffff',
                            color: '#15803d',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          ✕ Cancelar N3
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.80rem', color: '#334155' }}>
                          A quantidade confere com a nota. Selecione quais dados cadastrais adotar no recebimento:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleDecisaoRapidaFiscal('BIP')}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: decisaoCadastralAtiva === 'BIP' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                              background: decisaoCadastralAtiva === 'BIP' ? '#f0fdf4' : '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: decisaoCadastralAtiva === 'BIP' ? '#15803d' : '#0f172a' }}>
                                📱 Coletor (Bipado)
                              </div>
                              {decisaoCadastralAtiva === 'BIP' && (
                                <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  ✓ SELECIONADO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                              Lote: <strong>{itemAtual.lote || '—'}</strong> • Val: <strong>{formatarDataSimples(itemAtual.validade) || '—'}</strong>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDecisaoRapidaFiscal('ERP')}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: decisaoCadastralAtiva === 'ERP' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                              background: decisaoCadastralAtiva === 'ERP' ? '#f0fdf4' : '#ffffff',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: decisaoCadastralAtiva === 'ERP' ? '#15803d' : '#0f172a' }}>
                                📄 Nota Fiscal (ERP)
                              </div>
                              {decisaoCadastralAtiva === 'ERP' && (
                                <span style={{ fontSize: '0.64rem', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                  ✓ SELECIONADO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '3px' }}>
                              Lote: <strong>{loteOriginal || 'Sem Lote'}</strong> • Val: <strong>{formatarDataSimples(itemAtual.validadeOriginal) || '—'}</strong>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* CENÁRIO 5: TUDO OK */}
                {!temSobra && !temFalta && !temMultiplosLotes && !temN3Item && !temDivergenciaFiscal && (
                  <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 700, padding: '4px 0' }}>
                    ✓ Nenhuma ação necessária para este produto. Clique em "Próximo" para avançar.
                  </div>
                )}

                {/* AÇÕES ALTERNATIVAS / SECUNDÁRIAS (Apenas quando aplicável e sem redundância com a ação recomendada principal) */}
                {((!estaEmN3 && !temFalta) || temN3Item) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #f1f5f9',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      Ações alternativas:
                    </span>

                    {!estaEmN3 && !temFalta && (
                      <button
                        type="button"
                        onClick={() => toggleRecontarN3(itemKeyAtual)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: isN3AgendadoItem ? '2px solid #16a34a' : '1px solid #cbd5e1',
                          background: isN3AgendadoItem ? '#f0fdf4' : '#f8fafc',
                          color: isN3AgendadoItem ? '#15803d' : '#334155',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        title="Agendar envio deste produto para recontagem cega N3 ao concluir"
                      >
                        {isN3AgendadoItem ? '✓ Agendado p/ N3 (Remover)' : '🔍 Recontar em N3'}
                      </button>
                    )}

                    {temN3Item && (
                      <button
                        type="button"
                        onClick={() => onAbrirModalRevisarDesempate(itemAtual, grupo, nivelAtivoItem === 'N1' ? 'N2' : nivelAtivoItem)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: 'var(--slate-700)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⚖️ Abrir Detalhes de Desempate
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Rodapé de Navegação do Assistente */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {modoResumo ? (
              <button
                type="button"
                onClick={() => setModoResumo(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: 'var(--slate-700)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ← Voltar ao Passo a Passo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={irParaAnterior}
                  disabled={safeIndex === 0}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: safeIndex === 0 ? '#f1f5f9' : '#ffffff',
                    color: safeIndex === 0 ? '#94a3b8' : 'var(--slate-700)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: safeIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← Anterior
                </button>

                <button
                  type="button"
                  onClick={pularItem}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ↷ Pular (Revisar depois)
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!modoResumo ? (
              safeIndex < itensAtuaisPasso.length - 1 ? (
                <button
                  type="button"
                  onClick={irParaProximo}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Próximo Item →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModoResumo(true)}
                  style={{
                    padding: '7px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  📋 Concluir e Ver Resumo
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleExecutarTudoEFinalizar}
                disabled={executandoLoteFinal || !todosResolvidos}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: executandoLoteFinal || !todosResolvidos ? '#94a3b8' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: executandoLoteFinal || !todosResolvidos ? 'not-allowed' : 'pointer',
                  opacity: executandoLoteFinal || !todosResolvidos ? 0.75 : 1,
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                title={
                  !todosResolvidos
                    ? `Resolva todos os ${totalItens} itens antes de executar (${itensResolvidos.length} de ${totalItens} resolvidos)`
                    : 'Executar todas as decisões e finalizar a conferência no Sankhya'
                }
              >
                {executandoLoteFinal ? (
                  <span>⏳ Executando no Sankhya...</span>
                ) : itensRecontarN3.size > 0 ? (
                  <span>✓ Executar Ações e Enviar p/ Reconferência N3</span>
                ) : (
                  <span>✓ Executar Decisões e Concluir Nota</span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Submodal de Configuração de Ocorrência de Sobra */}
        {modalSobraConfig && (
          <ModalOcorrenciaSobra
            isOpen={Boolean(modalSobraConfig)}
            onClose={() => setModalSobraConfig(null)}
            item={modalSobraConfig.item}
            grupo={modalSobraConfig.grupo}
            dadosPrevios={sobrasAgendadas[`${modalSobraConfig.item.nunota}-${modalSobraConfig.item.codprod}-${modalSobraConfig.item.sequencia}`]}
            onConfirmar={async (dados) => {
              const k = `${dados.nunota}-${dados.codprod}-${dados.sequencia || modalSobraConfig.item.sequencia}`;
              setSobrasAgendadas((prev) => ({ ...prev, [k]: dados }));
              setModalSobraConfig(null);
            }}
          />
        )}

        {/* Submodal de Configuração de Desmembramento de Item */}
        {modalDesmembrarConfig && (
          <ModalDesmembrarItem
            isOpen={Boolean(modalDesmembrarConfig)}
            onClose={() => setModalDesmembrarConfig(null)}
            item={modalDesmembrarConfig.item}
            grupo={modalDesmembrarConfig.grupo}
            dadosPrevios={desmembramentosAgendados[`${modalDesmembrarConfig.item.nunota}-${modalDesmembrarConfig.item.codprod}-${modalDesmembrarConfig.item.sequencia}`]}
            onConfirmar={async (dados) => {
              const k = `${dados.nunota}-${modalDesmembrarConfig.item.codprod}-${dados.sequencia}`;
              setDesmembramentosAgendados((prev) => ({ ...prev, [k]: dados }));
              setModalDesmembrarConfig(null);
            }}
          />
        )}
      </div>
    </div>
  );
};
