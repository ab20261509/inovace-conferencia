import React, { useState } from 'react';
import {
  ConferenciaDivergenciaGrupo,
  ConferenciaEntradaResumo,
  DecisaoFiscalItem,
  ItemDivergenciaResumo,
} from '../../../domain/models/ConferenciaEntrada';
import { Container } from '../Container/Container';
import {
  getStatusBadgeClass,
  verificarItemEmN3,
  ehStatusEmAndamento,
  formatarConferentes,
  formatarDataSimples,
  obterOcorrenciasDoItem,
  renderBadgesOcorrenciasItem,
} from './recebimentoHelpers';
import { ModalDesmembrarItem } from './ModalDesmembrarItem';
import { ModalRevisarDesempate } from './ModalRevisarDesempate';
import { ModalDecidirDivergenciaN2 } from './ModalDecidirDivergenciaN2';
import { ModalPesquisaLocalEstoque } from './ModalPesquisaLocalEstoque';
import { ModalOcorrenciaSobra } from './ModalOcorrenciaSobra';
import { ModalAssistenteDivergencias } from './ModalAssistenteDivergencias';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';

export interface AbaDivergenciasViewProps {
  divergencias: ConferenciaDivergenciaGrupo[];
  todasConferencias?: ConferenciaEntradaResumo[];
  ocorrencias?: any[];
  itensDivergenciaExpandidos: Record<string, boolean>;
  filtroItensDivergencia: Record<string, 'divergentes' | 'todos'>;
  toggleItensDivergencia: (grupoId: string) => void;
  setFiltroItensDivergencia: React.Dispatch<
    React.SetStateAction<Record<string, 'divergentes' | 'todos'>>
  >;
  onResolverDivergencia: (
    grupo: ConferenciaDivergenciaGrupo,
    decisoesFiscais?: Record<string, DecisaoFiscalItem>
  ) => void;
  onReconferirN3: (grupo: ConferenciaDivergenciaGrupo, itensSelecionados: ItemDivergenciaResumo[]) => void;
  onReiniciar: (grupo: ConferenciaDivergenciaGrupo) => void;
  onRecuperarContagem?: (conf: ConferenciaEntradaResumo) => void;
  onSincronizarDesmembramento?: (
    conferenciaId: string,
    nunota: number,
    codprod?: number,
    sequencia?: number
  ) => void;
  onExecutarDesmembramento?: (
    conferenciaId: string,
    dados: {
      nunota: number;
      sequencia: number;
      lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string; codlocal?: number }>;
    }
  ) => Promise<void>;
  processandoDesmembramento?: string | null;
  onLocalAlterado?: (nunota: number, sequencia: number, novoCodlocal: number) => void;
  onRegistrarOcorrenciaSobra?: (dados: {
    conferenciaId: string;
    nunota: number;
    numnota?: number;
    sequencia?: number;
    codprod: number;
    descrprod?: string;
    quantidadeSobra: number;
    lote?: string;
    validade?: string;
    fabricacao?: string;
    motivo?: string;
    codlocalDestino?: number;
    fotos?: string[];
  }) => Promise<void>;
  onExecutarN3Api?: (conferenciaId: string, itens: any[], nunota?: number) => Promise<void>;
  onBloqueioEmAndamento?: (info: { conferente?: string; numnota?: string | number; status?: string }) => void;
}

export const AbaDivergenciasView: React.FC<AbaDivergenciasViewProps> = ({
  divergencias,
  todasConferencias,
  ocorrencias,
  itensDivergenciaExpandidos,
  filtroItensDivergencia,
  toggleItensDivergencia,
  setFiltroItensDivergencia,
  onResolverDivergencia,
  onReconferirN3,
  onReiniciar,
  onRecuperarContagem,
  onSincronizarDesmembramento,
  onExecutarDesmembramento,
  processandoDesmembramento,
  onLocalAlterado,
  onRegistrarOcorrenciaSobra,
  onExecutarN3Api,
  onBloqueioEmAndamento,
}) => {
  const recebimentoService = React.useMemo(() => new RecebimentoApiService(), []);
  const [locaisAlterados, setLocaisAlterados] = useState<Record<string, number>>({});
  const [modalLocalAberto, setModalLocalAberto] = useState(false);
  const [itemParaAlterarLocal, setItemParaAlterarLocal] = useState<{
    nunota: number;
    sequencia: number;
    codprod?: number;
    descrprod?: string;
    codlocalorig?: number;
    conferenciaId: string;
  } | null>(null);
  const [salvandoLocal, setSalvandoLocal] = useState(false);

  const handleAbrirAlterarLocal = (
    item: ItemDivergenciaResumo,
    conferenciaId: string
  ) => {
    const itemChave = `${item.nunota}-${item.sequencia}`;
    const codlocalAtual = locaisAlterados[itemChave] !== undefined ? locaisAlterados[itemChave] : item.codlocalorig;
    setItemParaAlterarLocal({
      nunota: item.nunota,
      sequencia: item.sequencia,
      codprod: item.codprod,
      descrprod: item.descrprod || `Produto ${item.codprod}`,
      codlocalorig: codlocalAtual,
      conferenciaId,
    });
    setModalLocalAberto(true);
  };

  const handleConfirmarAlterarLocal = async (novoCodlocal?: number) => {
    if (!itemParaAlterarLocal || novoCodlocal === undefined || novoCodlocal === null) return;
    setSalvandoLocal(true);
    try {
      await recebimentoService.alterarLocalItem({
        nunota: itemParaAlterarLocal.nunota,
        sequencia: itemParaAlterarLocal.sequencia,
        codlocal: novoCodlocal,
        conferenciaId: itemParaAlterarLocal.conferenciaId,
      });
      const itemChave = `${itemParaAlterarLocal.nunota}-${itemParaAlterarLocal.sequencia}`;
      if (novoCodlocal !== undefined && novoCodlocal !== null) {
        setLocaisAlterados((prev) => ({ ...prev, [itemChave]: novoCodlocal }));
      }
      if (onLocalAlterado && novoCodlocal !== undefined && novoCodlocal !== null) {
        onLocalAlterado(itemParaAlterarLocal.nunota, itemParaAlterarLocal.sequencia, novoCodlocal);
      }
      setModalLocalAberto(false);
      setItemParaAlterarLocal(null);
    } catch (err: any) {
      alert(`Erro ao alterar local no Sankhya: ${err?.message || 'Falha na comunicação'}`);
    } finally {
      setSalvandoLocal(false);
    }
  };

  const [modalDesmembrarItem, setModalDesmembrarItem] = useState<{
    item: ItemDivergenciaResumo;
    grupo: ConferenciaDivergenciaGrupo;
  } | null>(null);
  const [executandoDesmembramento, setExecutandoDesmembramento] = useState(false);
  const [modalOcorrenciaSobra, setModalOcorrenciaSobra] = useState<{
    item: ItemDivergenciaResumo;
    grupo: ConferenciaDivergenciaGrupo;
  } | null>(null);
  const [modalRevisarDesempateItem, setModalRevisarDesempateItem] = useState<{
    item: ItemDivergenciaResumo;
    grupo: ConferenciaDivergenciaGrupo;
    decisaoAtual?: 'N1' | 'N2' | 'N3' | 'ERP';
  } | null>(null);
  const [modalDecidirN2Item, setModalDecidirN2Item] = useState<{
    item: ItemDivergenciaResumo;
    grupo: ConferenciaDivergenciaGrupo;
  } | null>(null);
  const [executandoOcorrenciaSobra, setExecutandoOcorrenciaSobra] = useState(false);
  const [grupoAssistenteId, setGrupoAssistenteId] = useState<string | null>(null);
  const [lotesExpandidosDiv, setLotesExpandidosDiv] = useState<Record<string, boolean>>({});
  const [decisoesFiscaisPorGrupo, setDecisoesFiscaisPorGrupo] = useState<
    Record<string, Record<string, DecisaoFiscalItem>>
  >({});
  const [itensSelecionadosPorGrupo, setItensSelecionadosPorGrupo] = useState<
    Record<string, Set<string>>
  >({});

  const toggleLotesDiv = (itemKey: string) => {
    setLotesExpandidosDiv((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const toggleSelecionarItem = (grupoId: string, itemKey: string) => {
    setItensSelecionadosPorGrupo((prev) => {
      const atual = new Set(prev[grupoId] || []);
      if (atual.has(itemKey)) {
        atual.delete(itemKey);
      } else {
        atual.add(itemKey);
      }
      return {
        ...prev,
        [grupoId]: atual,
      };
    });
  };

  const toggleSelecionarTodos = (grupoId: string, todosItemKeys: string[]) => {
    setItensSelecionadosPorGrupo((prev) => {
      const atual = prev[grupoId] || new Set();
      const todosJaEstao = todosItemKeys.length > 0 && todosItemKeys.every((k) => atual.has(k));
      return {
        ...prev,
        [grupoId]: todosJaEstao ? new Set() : new Set(todosItemKeys),
      };
    });
  };

  const handleSelecionarNivelItem = (
    grupoId: string,
    itemKey: string,
    itemInfo: { nunota: number; codprod: number; sequencia: number },
    nivel: 'N1' | 'N2' | 'N3' | 'ERP'
  ) => {
    setDecisoesFiscaisPorGrupo((prev) => {
      const grupoDecisoes = prev[grupoId] || {};
      const decisaoAtual: DecisaoFiscalItem = grupoDecisoes[itemKey] || {
        nunota: itemInfo.nunota,
        codprod: itemInfo.codprod,
        sequencia: itemInfo.sequencia,
      };

      const novaDecisao: DecisaoFiscalItem =
        nivel === 'N3'
          ? {
              ...decisaoAtual,
              nivelEscolhido: 3,
              lote: 'N3',
              validade: 'N3',
              fabricacao: 'N3',
              quantidade: 'N3',
            }
          : nivel === 'N2'
          ? {
              ...decisaoAtual,
              nivelEscolhido: 2,
              lote: 'N2',
              validade: 'N2',
              fabricacao: 'N2',
              quantidade: 'N2',
            }
          : nivel === 'N1'
          ? {
              ...decisaoAtual,
              nivelEscolhido: 1,
              lote: 'N1',
              validade: 'N1',
              fabricacao: 'N1',
              quantidade: 'N1',
            }
          : {
              ...decisaoAtual,
              lote: 'ERP',
              validade: 'ERP',
              fabricacao: 'ERP',
              quantidade: 'ERP',
            };

      return {
        ...prev,
        [grupoId]: {
          ...grupoDecisoes,
          [itemKey]: novaDecisao,
        },
      };
    });
  };

  const handleAplicarNivelEmMassa = (
    grupoId: string,
    nivel: 'N2' | 'N3' | 'ERP',
    itensAlvo: any[]
  ) => {
    const selecionados = itensSelecionadosPorGrupo[grupoId];
    const temSelecao = Boolean(selecionados && selecionados.size > 0);

    setDecisoesFiscaisPorGrupo((prev) => {
      const grupoDecisoes: Record<string, DecisaoFiscalItem> = { ...(prev[grupoId] || {}) };

      for (const item of itensAlvo) {
        const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
        if (temSelecao && !selecionados!.has(itemKey)) {
          continue;
        }

        // Se estiver aplicando N3 em massa, só aplica se o item de fato teve N3
        if (nivel === 'N3' && !(item.qtdN3 > 0 || (item.loteN3 && item.loteN3.trim() !== ''))) {
          continue;
        }

        const decisaoAtual: DecisaoFiscalItem = grupoDecisoes[itemKey] || {
          nunota: item.nunota,
          codprod: item.codprod,
          sequencia: item.sequencia,
        };

        const novaDecisao: DecisaoFiscalItem =
          nivel === 'N3'
            ? {
                ...decisaoAtual,
                nivelEscolhido: 3,
                lote: 'N3',
                validade: 'N3',
                fabricacao: 'N3',
                quantidade: 'N3',
              }
            : nivel === 'N2'
            ? {
                ...decisaoAtual,
                nivelEscolhido: 2,
                lote: 'N2',
                validade: 'N2',
                fabricacao: 'N2',
                quantidade: 'N2',
              }
            : {
                ...decisaoAtual,
                lote: 'ERP',
                validade: 'ERP',
                fabricacao: 'ERP',
                quantidade: 'ERP',
              };

        grupoDecisoes[itemKey] = novaDecisao;
      }

      return {
        ...prev,
        [grupoId]: grupoDecisoes,
      };
    });
  };

  const handleSetDecisao = (
    grupoId: string,
    itemKey: string,
    itemInfo: { nunota: number; codprod: number; sequencia: number },
    campo: 'lote' | 'validade' | 'fabricacao',
    opcao: 'ERP' | 'BIP' | 'N2' | 'N3'
  ) => {
    setDecisoesFiscaisPorGrupo((prev) => {
      const grupoDecisoes = prev[grupoId] || {};
      const decisaoAtual = grupoDecisoes[itemKey] || {
        nunota: itemInfo.nunota,
        codprod: itemInfo.codprod,
        sequencia: itemInfo.sequencia,
      };

      return {
        ...prev,
        [grupoId]: {
          ...grupoDecisoes,
          [itemKey]: {
            ...decisaoAtual,
            [campo]: opcao,
          },
        },
      };
    });
  };

  const handleLimparDecisaoItem = (grupoId: string, itemKey: string) => {
    setDecisoesFiscaisPorGrupo((prev) => {
      const grupoDecisoes = { ...(prev[grupoId] || {}) };
      delete grupoDecisoes[itemKey];
      return {
        ...prev,
        [grupoId]: grupoDecisoes,
      };
    });
  };

  const handleAplicarDecisaoEmMassa = (
    grupoId: string,
    campo: 'lote' | 'validade' | 'fabricacao',
    opcao: 'ERP' | 'BIP' | 'N2' | 'N3',
    itensAlvo: any[]
  ) => {
    const selecionados = itensSelecionadosPorGrupo[grupoId];
    const temSelecao = Boolean(selecionados && selecionados.size > 0);

    setDecisoesFiscaisPorGrupo((prev) => {
      const grupoDecisoes = { ...(prev[grupoId] || {}) };

      for (const item of itensAlvo) {
        const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
        // Se houver itens selecionados via checkbox, aplica exclusivamente a eles
        if (temSelecao && !selecionados!.has(itemKey)) {
          continue;
        }

        // Aplica apenas aos itens que de fato possuem divergência cadastral/fiscal no campo
        const possuiDivCampo =
          campo === 'lote'
            ? item.divergenciaLote
            : campo === 'validade'
            ? item.divergenciaValidade
            : item.divergenciaFabricacao;

        if (possuiDivCampo) {
          const decisaoAtual = grupoDecisoes[itemKey] || {
            nunota: item.nunota,
            codprod: item.codprod,
            sequencia: item.sequencia,
          };
          grupoDecisoes[itemKey] = {
            ...decisaoAtual,
            [campo]: opcao,
          };
        }
      }

      return {
        ...prev,
        [grupoId]: grupoDecisoes,
      };
    });
  };

  const grupoAssistente = divergencias.find((g) => g.id === grupoAssistenteId) || null;

  return (
    <div className="gestao-rec-lista">
      {divergencias.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '2.5rem' }}>✨</span>
            <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
              Nenhuma divergência pendente!
            </h3>
            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
              Todas as conferências de entrada estão finalizadas sem discordâncias de contagem.
            </p>
          </div>
        </Container>
      ) : (
        divergencias.map((grupo) => {
          const isExpandido = itensDivergenciaExpandidos[grupo.id] === true;
          const filtroAtivo = filtroItensDivergencia[grupo.id] || 'divergentes';
          const todosDisponiveis = grupo.todosItens && grupo.todosItens.length > 0;
          const itensParaExibir =
            filtroAtivo === 'todos' && todosDisponiveis
              ? grupo.todosItens
              : grupo.itensDivergentes;

          // Mapeia a contagem de sequências faturadas por produto na nota fiscal
          const contagemSeqsPorCodprod = (grupo.todosItens && grupo.todosItens.length > 0
            ? grupo.todosItens
            : grupo.itensDivergentes || []
          ).reduce<Record<number, number>>((acc, curr) => {
            acc[curr.codprod] = (acc[curr.codprod] || 0) + 1;
            return acc;
          }, {});

          const houveN1 = grupo.totalN1 > 0 || ((grupo.conferentesN1?.length ?? 0) > 0);
          const houveN2 = grupo.totalN2 > 0 || ((grupo.conferentesN2?.length ?? 0) > 0);
          const exibirN1 = grupo.nivel1Ativo !== undefined ? (grupo.nivel1Ativo || houveN1) : houveN1;
          const exibirN2 = grupo.nivel2Ativo !== undefined ? (grupo.nivel2Ativo || houveN2) : true;

          const estaAguardandoOuEmN3 = [
            'Aguardando N3',
            'N3 em Andamento',
            'Em Reconferência',
            'Aguardando Recontagem N3',
            'Recontagem N3 em Andamento',
          ].includes(grupo.status) || (grupo.status.toLowerCase().includes('reconferência') && grupo.status.includes('3'));

          const decisoesDoGrupo = decisoesFiscaisPorGrupo[grupo.id] || {};

          // Mapeia todos os itens e calcula com precisão quantos itens realmente estão pendentes de resolução
          const baseTodosItensGrupo = (grupo.todosItens && grupo.todosItens.length > 0)
            ? grupo.todosItens
            : grupo.itensDivergentes || [];

          const saldoConsolidadoPorProd = baseTodosItensGrupo.reduce<Record<number, { esperado: number; conferido: number; saldo: number }>>((acc, curr) => {
            if (!acc[curr.codprod]) acc[curr.codprod] = { esperado: 0, conferido: 0, saldo: 0 };
            acc[curr.codprod].esperado += curr.qtdEsperada || 0;
            const c = curr.qtdN3 > 0 ? curr.qtdN3 : curr.qtdN2 > 0 ? curr.qtdN2 : curr.qtdN1 || 0;
            acc[curr.codprod].conferido += c;
            acc[curr.codprod].saldo = acc[curr.codprod].conferido - acc[curr.codprod].esperado;
            return acc;
          }, {});

          const totalPendentesAssistente = baseTodosItensGrupo.filter((it) => {
            if (verificarItemEmN3(grupo, it)) return false;
            const k = `${it.nunota}-${it.codprod}-${it.sequencia}`;
            const d = decisoesDoGrupo[k];
            const c = it.qtdN3 > 0 ? it.qtdN3 : it.qtdN2 > 0 ? it.qtdN2 : it.qtdN1;
            const dif = c - it.qtdEsperada;
            const numnotaG = String(grupo.numnota || it.nunota || '').trim();
            const nunotaG = String(it.nunota || '').trim();
            const loteOrig = String(it.controleOriginal || '').trim();
            const isFaltaIsolada = Boolean(it.isFaltaIsolada || (loteOrig && (loteOrig === numnotaG || loteOrig === nunotaG)));
            if (isFaltaIsolada) return false;
            const ehMulti = (contagemSeqsPorCodprod[it.codprod] || 0) > 1;
            const saldoProd = (saldoConsolidadoPorProd[it.codprod]?.saldo ?? dif);
            const itemSobraReal = ehMulti ? (saldoProd > 0 && dif > 0) : dif > 0;

            const sobraPendente = itemSobraReal;
            const faltaPendente = dif < 0 && !isFaltaIsolada;
            const lotesPendentes = ((it as any).lotesConferidos || []).length > 1;
            const cadastralPendente = Boolean(
              (it.divergenciaLote && !d?.lote) ||
              (it.divergenciaValidade && !d?.validade) ||
              (it.divergenciaFabricacao && !d?.fabricacao)
            );

            return sobraPendente || faltaPendente || lotesPendentes || cadastralPendente;
          }).length;

          const itensFiscais = (grupo.itensDivergentes || []).filter(
            (i) => i.divergenciaLote || i.divergenciaValidade || i.divergenciaFabricacao
          );
          const totalItensFiscais = itensFiscais.length;
          const totalFiscaisPendentes = itensFiscais.filter((i) => {
            if (verificarItemEmN3(grupo, i)) return false;
            const k = `${i.nunota}-${i.codprod}-${i.sequencia}`;
            const d = decisoesDoGrupo[k];
            const pL = Boolean(i.divergenciaLote && !d?.lote);
            const pV = Boolean(i.divergenciaValidade && !d?.validade);
            const pF = Boolean(i.divergenciaFabricacao && !d?.fabricacao);
            return pL || pV || pF;
          }).length;
          const podeResolverDivergencia =
            totalPendentesAssistente === 0 && totalFiscaisPendentes === 0 && !estaAguardandoOuEmN3;

          const selecionadosDoGrupo = itensSelecionadosPorGrupo[grupo.id] || new Set();
          const itensElegiveisParaSelecao = itensParaExibir.filter((i) => !verificarItemEmN3(grupo, i));
          const todosItemKeys = itensElegiveisParaSelecao.map((i) => `${i.nunota}-${i.codprod}-${i.sequencia}`);
          const qtdSelecionados = selecionadosDoGrupo.size;
          const todosSelecionados =
            todosItemKeys.length > 0 && todosItemKeys.every((k) => selecionadosDoGrupo.has(k));

          return (
            <div key={grupo.id} className="gestao-rec-card">
              {/* Ribbon de Backup na Aba Divergências */}
              {(() => {
                const conf = todasConferencias?.find((c) => c.id === grupo.conferenciaId);
                const temBkp = conf?.temBackupContagem || Boolean(conf?.backupContagem) || Boolean(conf?.backupsDisponiveis?.length);
                if (!temBkp || !conf) return null;

                const backups = conf.backupsDisponiveis || [];
                const bkp = backups[0] || conf.backupContagem;

                return (
                  <div className="gestao-card-backup-ribbon">
                    <div className="gestao-backup-ribbon-texto">
                      <span>
                        💾 <strong>Backup disponível:</strong>{' '}
                        {backups.length > 1 ? (
                          <>Existem <strong>{backups.length} backups disponíveis</strong> para esta nota / chave NF-e.</>
                        ) : bkp ? (
                          <>
                            Reiniciada por <em>{bkp.reiniciadoPor}</em> em{' '}
                            {new Date(bkp.reiniciadoEm).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(bkp.reiniciadoEm).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            ({bkp.totalBipagensAnuladas} bipagens guardadas).
                            {bkp.motivo && ` Motivo: "${bkp.motivo}"`}
                          </>
                        ) : (
                          <>Backup de contagem disponível para recuperação.</>
                        )}
                      </span>
                    </div>
                    {onRecuperarContagem && (
                      <button
                        type="button"
                        className="gestao-backup-ribbon-btn"
                        onClick={() => onRecuperarContagem(conf)}
                        title="Visualizar e recuperar as bipagens arquivadas desta conferência"
                      >
                        Restaurar Contagem
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Cabeçalho do Card */}
              <div className="gestao-rec-card-header">
                <div className="gestao-rec-card-info">
                  <div className="gestao-rec-card-notas">
                    <span>📄 Nota {grupo.numnota || grupo.numerosNotas}</span>
                    {grupo.nunota && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginLeft: '6px' }}>
                        (#{grupo.nunota})
                      </span>
                    )}
                    {(() => {
                      const ocsNota = (ocorrencias || []).filter(
                        (o: any) => o.status !== 'CANCELADO' && (grupo.nunota ? Number(o.nunota) === Number(grupo.nunota) : false)
                      );
                      if (ocsNota.length === 0) return null;
                      return (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            marginLeft: '8px',
                          }}
                          title={`${ocsNota.length} ocorrência(s) ativa(s) registrada(s) para esta nota fiscal`}
                        >
                          ⚠️ {ocsNota.length} Ocorrência(s)
                        </span>
                      );
                    })()}
                  </div>
                  <span className="gestao-rec-card-fornecedor">
                    Fornecedor: {grupo.fornecedor}
                  </span>
                  {/* Rastreabilidade de quem conferiu */}
                  <div
                    style={{
                      margin: '4px 0',
                      fontSize: '0.82rem',
                      color: 'var(--slate-700)',
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                      background: 'var(--slate-100)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <span><strong>👤 Conferentes:</strong></span>
                    {exibirN1 && (
                      <span>N1: <strong>{grupo.conferentesN1 && grupo.conferentesN1.length > 0 ? grupo.conferentesN1.join(', ') : '—'}</strong></span>
                    )}
                    {exibirN2 && (
                      <span>N2: <strong>{grupo.conferentesN2 && grupo.conferentesN2.length > 0 ? grupo.conferentesN2.join(', ') : '—'}</strong></span>
                    )}
                    {grupo.conferentesN3 && grupo.conferentesN3.length > 0 && (
                      <span style={{ color: '#dc2626' }}>N3: <strong>{grupo.conferentesN3.join(', ')}</strong></span>
                    )}
                  </div>
                  <span className="gestao-rec-card-meta">
                    Atualizado em: {new Date(grupo.atualizadoEm).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="gestao-rec-card-header-direita">
                  {/* Mini-cards minimalistas de contagem */}
                  <div className="gestao-mini-metricas-header">
                    <div className="gestao-mini-metrica-box">
                      <span className="gestao-mini-metrica-rotulo">Faturado</span>
                      <span className="gestao-mini-metrica-valor">{grupo.totalEsperado}</span>
                    </div>
                    {exibirN1 && (
                      <div className="gestao-mini-metrica-box">
                        <span className="gestao-mini-metrica-rotulo">N1</span>
                        <span className="gestao-mini-metrica-valor">{grupo.totalN1}</span>
                      </div>
                    )}
                    {exibirN2 && (
                      <div className="gestao-mini-metrica-box">
                        <span className="gestao-mini-metrica-rotulo">N2</span>
                        <span className="gestao-mini-metrica-valor">{grupo.totalN2}</span>
                      </div>
                    )}
                    {grupo.totalN3 > 0 && (
                      <div className="gestao-mini-metrica-box">
                        <span className="gestao-mini-metrica-rotulo">N3</span>
                        <span className="gestao-mini-metrica-valor">{grupo.totalN3}</span>
                      </div>
                    )}
                    {Boolean(
                      grupo.itensRecontagem &&
                      grupo.itensRecontagem.length > 0 &&
                      ['Aguardando N3', 'N3 em Andamento', 'Em Reconferência', 'Aguardando Recontagem N3', 'Recontagem N3 em Andamento'].includes(grupo.status)
                    ) && (
                      <div className="gestao-mini-metrica-box n3-info">
                        <span className="gestao-mini-metrica-rotulo">Em N3</span>
                        <span className="gestao-mini-metrica-valor">
                          {`${grupo.itensRecontagem!.length} ${grupo.itensRecontagem!.length === 1 ? 'item' : 'itens'}`}
                        </span>
                      </div>
                    )}
                    <div className={`gestao-mini-metrica-box ${totalFiscaisPendentes > 0 ? 'divergente' : 'ok'}`}>
                      <span className="gestao-mini-metrica-rotulo">
                        {totalItensFiscais > 0 ? (totalFiscaisPendentes > 0 ? 'Pendentes' : 'Decididos') : 'Divergentes'}
                      </span>
                      <span className="gestao-mini-metrica-valor">
                        {totalItensFiscais > 0
                          ? `${grupo.itensDivergentes.length} (${totalFiscaisPendentes} pend)`
                          : grupo.itensDivergentes.length}
                      </span>
                    </div>
                  </div>

                  {/* Badges de Nível e Status */}
                  <div className="gestao-rec-card-badges">
                    <span className="badge-nivel-rec">Nível Atual: {grupo.nivelAtual}</span>
                    <span className={`badge-status-rec ${getStatusBadgeClass(grupo.status)}`}>
                      {grupo.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sugestão Inteligente de Decisão (Decision Assist) */}
              {(() => {
                const itensDiv = grupo.itensDivergentes || [];
                if (itensDiv.length === 0) return null;

                // 0. Se a nota já foi enviada para N3 e está aguardando bipagem no coletor
                if (estaAguardandoOuEmN3) {
                  return (
                    <div className="gestao-dica-decisao concordante" style={{ background: '#f8fafc', borderColor: '#94a3b8', color: '#1e293b' }}>
                      <span style={{ fontSize: '1.2rem' }}>⏳</span>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Reconferência N3 em Andamento no Coletor:</strong> Esta conferência foi enviada para reconferência cega (Nível 3). Aguarde os conferentes realizarem a bipagem no coletor para avaliar o desempate ou aprovar.
                      </div>
                    </div>
                  );
                }

                // 1. Caso todas as contagens físicas batam 100% com a nota (diferença zero), divergindo apenas em Lote, Validade ou Fabricação
                const apenasDivergenciaFiscal = itensDiv.every((i) => {
                  const qtdFinal = i.qtdN3 > 0 ? i.qtdN3 : i.qtdN2 > 0 ? i.qtdN2 : i.qtdN1;
                  return qtdFinal === i.qtdEsperada && (i.divergenciaLote || i.divergenciaValidade || i.divergenciaFabricacao);
                });

                if (apenasDivergenciaFiscal) {
                  return (
                    <div className="gestao-dica-decisao concordante">
                      <span>🏷️</span>
                      <div>
                        <strong>Dica Gerencial (Lote / Validade Divergente):</strong> A contagem física atingiu 100% dos itens faturados, divergindo apenas nas informações fiscais de Lote ou Validade. Sugestão: <em>Aprovar Divergência</em> para atualizar no Sankhya.
                      </div>
                    </div>
                  );
                }

                // 2. Se houve contagem em N3 (desempate)
                const houveN3 = grupo.totalN3 > 0 || ((grupo.conferentesN3?.length ?? 0) > 0);
                if (houveN3) {
                  const todosBatemN3 = itensDiv.every((i) => i.qtdN3 === i.qtdEsperada);
                  if (todosBatemN3) {
                    return (
                      <div className="gestao-dica-decisao concordante">
                        <span>💡</span>
                        <div>
                          <strong>Dica Gerencial (Reconferência N3 Concluída):</strong> O desempate em N3 atingiu 100% das quantidades faturadas. Sugestão: <em>Aprovar Divergência</em> para concluir o recebimento.
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="gestao-dica-decisao discordante">
                      <span>⚠️</span>
                      <div>
                        <strong>Dica Gerencial (Reconferência N3 Concluída):</strong> Terceira contagem realizada. Analise as quantidades apuradas na coluna N3 antes de Aprovar ou Recusar.
                      </div>
                    </div>
                  );
                }

                // 3. Se ambos os níveis N1 e N2 foram realizados (dupla contagem cega)
                if (houveN1 && houveN2) {
                  const todosConcordamFalta =
                    itensDiv.every((i) => i.qtdN1 === i.qtdN2 && i.qtdN1 < i.qtdEsperada);
                  const todosConcordamSobra =
                    itensDiv.every((i) => i.qtdN1 === i.qtdN2 && i.qtdN1 > i.qtdEsperada);
                  const discordamN1N2 = itensDiv.some((i) => i.qtdN1 !== i.qtdN2);

                  if (todosConcordamFalta) {
                    return (
                      <div className="gestao-dica-decisao concordante">
                        <span>💡</span>
                        <div>
                          <strong>Dica Gerencial (Consistência N1 = N2):</strong> Os conferentes contaram exatamente a mesma quantidade em todos os itens divergentes. Há forte indício de falta física originária da fábrica/fornecedor. Sugestão: <em>Aprovar Divergência</em> para liberar estoque ou acionar compras.
                        </div>
                      </div>
                    );
                  }

                  if (todosConcordamSobra) {
                    return (
                      <div className="gestao-dica-decisao concordante">
                        <span>💡</span>
                        <div>
                          <strong>Dica Gerencial (Sobra Confirmada N1 = N2):</strong> Ambos os conferentes identificaram sobra física em relação à nota faturada. Sugestão: Verificar bonificação ou contatar fornecedor antes de aceitar.
                        </div>
                      </div>
                    );
                  }

                  if (discordamN1N2) {
                    return (
                      <div className="gestao-dica-decisao discordante">
                        <span>⚠️</span>
                        <div>
                          <strong>Dica Gerencial (Discordância N1 ≠ N2):</strong> Houve discordância de contagem cega entre os conferentes N1 e N2. Sugestão: <em>Solicitar Reconferência N3</em> para um terceiro operador desempatar antes da aprovação.
                        </div>
                      </div>
                    );
                  }
                }

                // 4. Se foi realizada conferência em nível único (apenas N2 ou apenas N1)
                const todosFalta = itensDiv.every((i) => {
                  const qtd = i.qtdN2 > 0 ? i.qtdN2 : i.qtdN1;
                  return qtd < i.qtdEsperada;
                });
                const todosSobra = itensDiv.every((i) => {
                  const qtd = i.qtdN2 > 0 ? i.qtdN2 : i.qtdN1;
                  return qtd > i.qtdEsperada;
                });

                if (todosFalta) {
                  return (
                    <div className="gestao-dica-decisao discordante">
                      <span>💡</span>
                      <div>
                        <strong>Dica Gerencial (Falta Física Apurada):</strong> O conferente registrou quantidade menor que a nota faturada. Sugestão: <em>Solicitar Reconferência N3</em> para confirmação cega ou <em>Aprovar Divergência</em> se a falta já for atestada.
                      </div>
                    </div>
                  );
                }

                if (todosSobra) {
                  return (
                    <div className="gestao-dica-decisao discordante">
                      <span>💡</span>
                      <div>
                        <strong>Dica Gerencial (Sobra Física Apurada):</strong> O conferente registrou quantidade maior que a nota faturada. Sugestão: Verificar bonificação física ou solicitar Reconferência N3.
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="gestao-dica-decisao discordante">
                    <span>⚠️</span>
                    <div>
                      <strong>Dica Gerencial (Divergências Encontradas):</strong> Foram apuradas divergências nos itens listados. Avalie as quantidades e lotes antes de aprovar ou reconferir em N3.
                    </div>
                  </div>
                );
              })()}

              {/* Barra de Controle de Exibição / Esconder Itens */}
              <div className="gestao-rec-itens-header" style={{ marginTop: '10px' }}>
                <div className="gestao-rec-itens-filtros">
                  {estaAguardandoOuEmN3 ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f1f5f9',
                        color: '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'not-allowed',
                        opacity: 0.85,
                      }}
                      title="Esta conferência já foi enviada para reconferência N3 no coletor. Aguarde a conclusão da contagem física para novas decisões."
                    >
                      <span>⏳</span> Enviado para N3 (Aguardando Coletor)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGrupoAssistenteId(grupo.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: '1px solid #0f172a',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Abrir o assistente passo a passo para resolver as divergências com decisões guiadas"
                    >
                      <span>🧙</span>{' '}
                      {totalPendentesAssistente > 0
                        ? `Iniciar Assistente (${totalPendentesAssistente} pendente${totalPendentesAssistente > 1 ? 's' : ''})`
                        : 'Assistente (Pronto p/ Concluir)'}
                    </button>
                  )}

                  <button
                    type="button"
                    className={`gestao-rec-item-chip ${filtroAtivo === 'divergentes' ? 'ativo' : ''}`}
                    onClick={() =>
                      setFiltroItensDivergencia((prev) => ({
                        ...prev,
                        [grupo.id]: 'divergentes',
                      }))
                    }
                  >
                    <span>⚠️ Divergentes</span>
                    <span className="chip-count">
                      {totalFiscaisPendentes > 0
                        ? `${grupo.itensDivergentes.length} (${totalFiscaisPendentes} pend)`
                        : grupo.itensDivergentes.length}
                    </span>
                  </button>
                  {todosDisponiveis && (
                    <button
                      type="button"
                      className={`gestao-rec-item-chip ${filtroAtivo === 'todos' ? 'ativo' : ''}`}
                      onClick={() =>
                        setFiltroItensDivergencia((prev) => ({
                          ...prev,
                          [grupo.id]: 'todos',
                        }))
                      }
                    >
                      <span>📋 Todos os Itens</span>
                      <span className="chip-count">{grupo.todosItens.length}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="gestao-rec-btn-toggle-itens"
                  onClick={() => toggleItensDivergencia(grupo.id)}
                >
                  <span>
                    {isExpandido
                      ? '▲ Ocultar Tabela'
                      : `▼ Exibir Tabela Completa (${itensParaExibir.length})`}
                  </span>
                </button>
              </div>

              {isExpandido && (
                <>
                  {qtdSelecionados > 0 && (
                    <div className="toolbar-massa-aviso">
                      <span>
                        ☑️ <strong>{qtdSelecionados}</strong> produto(s) selecionado(s) para aplicação em massa.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setItensSelecionadosPorGrupo((prev) => ({
                            ...prev,
                            [grupo.id]: new Set(),
                          }))
                        }
                      >
                        Limpar seleção
                      </button>
                    </div>
                  )}

                  {/* Tabela Desktop (> 1024px) */}
                  <div className="gestao-rec-tabela-desktop" style={{ marginTop: '8px' }}>
                    <table className="gestao-rec-tabela">
                      <thead>
                        <tr>
                          <th style={{ width: '38px', textAlign: 'center', padding: '6px 4px' }}>
                            <input
                              type="checkbox"
                              className="gestao-checkbox-select"
                              title={todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos os itens'}
                              checked={todosSelecionados}
                              onChange={() => toggleSelecionarTodos(grupo.id, todosItemKeys)}
                            />
                          </th>
                          <th>Produto</th>
                          <th>Vol.</th>
                          <th>Qtd Nota</th>
                          {exibirN1 && <th>Qtd N1</th>}
                          {exibirN2 && <th>Qtd N2</th>}
                          {grupo.totalN3 > 0 && <th>Qtd N3</th>}
                          <th>Diferença</th>
                          <th>Local</th>
                          <th className="th-grupo-comparativo lote">LOTE</th>
                          <th className="th-grupo-comparativo fabricacao">FABRICAÇÃO</th>
                          <th className="th-grupo-comparativo validade">VALIDADE</th>
                          <th>Conferente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensParaExibir.map((item) => {
                          const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
                          const decisaoItem = decisoesDoGrupo[itemKey];
                          const temN3Grupo = grupo.totalN3 > 0;
                          const temN3Item = Boolean(item.qtdN3 > 0 || ((item as any).loteN3 && (item as any).loteN3.trim() !== ''));

                          // Nível ativo do item (se gestor escolheu N1, N2, N3 ou ERP; padrão N3 se houver desempate, senão N2)
                          const nivelAtivoItem: 'N1' | 'N2' | 'N3' | 'ERP' =
                            decisaoItem?.lote === 'ERP' || decisaoItem?.quantidade === 'ERP'
                              ? 'ERP'
                              : decisaoItem?.lote === 'N1' || decisaoItem?.nivelEscolhido === 1
                              ? 'N1'
                              : decisaoItem?.lote === 'N2' || decisaoItem?.nivelEscolhido === 2
                              ? 'N2'
                              : decisaoItem?.lote === 'N3' || decisaoItem?.nivelEscolhido === 3
                              ? 'N3'
                              : temN3Item
                              ? 'N3'
                              : 'N2';

                          // Lotes conferidos isolados por nível (NUNCA misturar N1, N2 com N3)
                          const lotesConferidosN1: any[] = (item as any).lotesConferidosN1 || [];
                          const lotesConferidosN2: any[] = (item as any).lotesConferidosN2 || (item as any).lotesConferidos || [];
                          const lotesConferidosN3: any[] = (item as any).lotesConferidosN3 || [];
                          const lotesConferidos: any[] =
                            nivelAtivoItem === 'N1'
                              ? lotesConferidosN1
                              : nivelAtivoItem === 'N3'
                              ? lotesConferidosN3
                              : lotesConferidosN2;

                          const temMultiplosLotes = nivelAtivoItem !== 'ERP' && lotesConferidos.length > 1;
                          const isLotesAberto = Boolean(lotesExpandidosDiv[itemKey]);

                          const loteAtivo =
                            nivelAtivoItem === 'N1'
                              ? (item as any).loteN1 || item.lote
                              : nivelAtivoItem === 'N3'
                              ? (item as any).loteN3 || item.lote
                              : (item as any).loteN2 || item.lote;

                          const validadeAtiva =
                            nivelAtivoItem === 'N1'
                              ? (item as any).validadeN1 || item.validade
                              : nivelAtivoItem === 'N3'
                              ? (item as any).validadeN3 || item.validade
                              : (item as any).validadeN2 || item.validade;

                          const fabricacaoAtiva =
                            nivelAtivoItem === 'N1'
                              ? (item as any).fabricacaoN1 || item.fabricacao
                              : nivelAtivoItem === 'N3'
                              ? (item as any).fabricacaoN3 || item.fabricacao
                              : (item as any).fabricacaoN2 || item.fabricacao;

                          const contagemAtiva =
                            nivelAtivoItem === 'ERP'
                              ? item.qtdEsperada
                              : nivelAtivoItem === 'N1'
                              ? item.qtdN1
                              : nivelAtivoItem === 'N3'
                              ? item.qtdN3
                              : item.qtdN2 > 0
                              ? item.qtdN2
                              : item.qtdN1;

                          let totalColunasDiv = 9;
                          if (exibirN1) totalColunasDiv++;
                          if (exibirN2) totalColunasDiv++;
                          if (temN3Grupo) totalColunasDiv++;

                          const diferenca = contagemAtiva - item.qtdEsperada;
                          const classeDif =
                            diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                          const numnotaStr = String(grupo.numnota || item.nunota || '').trim();
                          const nunotaStr = String(item.nunota || '').trim();
                          const loteOriginal = String(item.controleOriginal || loteAtivo || '').trim();
                          const isFaltaIsolada = Boolean(
                            item.isFaltaIsolada ||
                            (loteOriginal && (loteOriginal === numnotaStr || loteOriginal === nunotaStr))
                          );
                          const diferencaEfetiva = isFaltaIsolada ? 0 : diferenca;
                          const classeDifEfetiva = isFaltaIsolada ? 'ok' : classeDif;

                          const temDivergenciaFiscal = Boolean(
                            item.divergenciaLote || item.divergenciaValidade || item.divergenciaFabricacao
                          );
                          const pendenteLote = Boolean(item.divergenciaLote && !decisaoItem?.lote);
                          const pendenteValidade = Boolean(item.divergenciaValidade && !decisaoItem?.validade);
                          const pendenteFabricacao = Boolean(item.divergenciaFabricacao && !decisaoItem?.fabricacao);
                          const estaEmN3 = verificarItemEmN3(grupo, item);
                          const isItemPendente = !estaEmN3 && temDivergenciaFiscal && (pendenteLote || pendenteValidade || pendenteFabricacao);
                          const isItemDecidido = !estaEmN3 && temDivergenciaFiscal && !isItemPendente;

                          const diffLote = Boolean(
                            item.divergenciaLote ||
                            (item.controleOriginal && loteAtivo && item.controleOriginal.trim().toUpperCase() !== loteAtivo.trim().toUpperCase())
                          );
                          const diffValidade = Boolean(
                            item.divergenciaValidade ||
                            (item.validadeOriginal && validadeAtiva && formatarDataSimples(item.validadeOriginal) !== formatarDataSimples(validadeAtiva))
                          );
                          const diffFabricacao = Boolean(
                            item.divergenciaFabricacao ||
                            (item.fabricacaoOriginal && fabricacaoAtiva && formatarDataSimples(item.fabricacaoOriginal) !== formatarDataSimples(fabricacaoAtiva))
                          );

                          const isPendenteLote = diffLote && (temN3Grupo ? (!isItemDecidido && nivelAtivoItem !== 'ERP') : pendenteLote);
                          const isDecididoLote = diffLote && (temN3Grupo ? (isItemDecidido || nivelAtivoItem === 'ERP') : Boolean(decisaoItem?.lote));

                          const isPendenteValidade = diffValidade && (temN3Grupo ? (!isItemDecidido && nivelAtivoItem !== 'ERP') : pendenteValidade);
                          const isDecididoValidade = diffValidade && (temN3Grupo ? (isItemDecidido || nivelAtivoItem === 'ERP') : Boolean(decisaoItem?.validade));

                          const isPendenteFabricacao = diffFabricacao && (temN3Grupo ? (!isItemDecidido && nivelAtivoItem !== 'ERP') : pendenteFabricacao);
                          const isDecididoFabricacao = diffFabricacao && (temN3Grupo ? (isItemDecidido || nivelAtivoItem === 'ERP') : Boolean(decisaoItem?.fabricacao));

                          const temN1Item = Boolean(exibirN1 && (item.qtdN1 > 0 || (item as any).loteN1 || lotesConferidosN1.length > 0));
                          const temN2Item = Boolean(exibirN2 && (item.qtdN2 > 0 || (item as any).loteN2 || item.lote || lotesConferidosN2.length > 0));

                          const loteN1Str = String((item as any).loteN1 || (lotesConferidosN1.length === 1 ? lotesConferidosN1[0].lote : '')).trim();
                          const loteN2Str = String((item as any).loteN2 || item.lote || (lotesConferidosN2.length === 1 ? lotesConferidosN2[0].lote : '')).trim();
                          const loteN3Str = String((item as any).loteN3 || (lotesConferidosN3.length === 1 ? lotesConferidosN3[0].lote : '')).trim();

                          const valN1Str = formatarDataSimples((item as any).validadeN1 || (lotesConferidosN1.length === 1 ? lotesConferidosN1[0].validade : ''));
                          const valN2Str = formatarDataSimples((item as any).validadeN2 || item.validade || (lotesConferidosN2.length === 1 ? lotesConferidosN2[0].validade : ''));
                          const valN3Str = formatarDataSimples((item as any).validadeN3 || (lotesConferidosN3.length === 1 ? lotesConferidosN3[0].validade : ''));

                          const fabN1Str = formatarDataSimples((item as any).fabricacaoN1 || (lotesConferidosN1.length === 1 ? lotesConferidosN1[0].fabricacao : ''));
                          const fabN2Str = formatarDataSimples((item as any).fabricacaoN2 || item.fabricacao || (lotesConferidosN2.length === 1 ? lotesConferidosN2[0].fabricacao : ''));
                          const fabN3Str = formatarDataSimples((item as any).fabricacaoN3 || (lotesConferidosN3.length === 1 ? lotesConferidosN3[0].fabricacao : ''));

                          const multiplosLotesN1 = lotesConferidosN1.length > 1;
                          const multiplosLotesN2 = lotesConferidosN2.length > 1;
                          const multiplosLotesN3 = lotesConferidosN3.length > 1;

                          const getEstiloBoxDivergencia = (isPendente: boolean, isDecidido: boolean) => {
                            if (isPendente) {
                              return {
                                display: 'inline-flex' as const,
                                flexDirection: 'column' as const,
                                border: '1.5px solid #ef4444',
                                backgroundColor: '#fef2f2',
                                borderRadius: '6px',
                                gap: '3px',
                                padding: '4px 6px',
                                minWidth: '78px',
                                transition: 'all 0.15s ease',
                              };
                            }
                            if (isDecidido) {
                              return {
                                display: 'inline-flex' as const,
                                flexDirection: 'column' as const,
                                border: '1px solid #bbf7d0',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '6px',
                                gap: '3px',
                                padding: '4px 6px',
                                minWidth: '78px',
                                transition: 'all 0.15s ease',
                              };
                            }
                            return {
                              display: 'inline-flex' as const,
                              flexDirection: 'column' as const,
                              gap: '3px',
                              padding: '4px 6px',
                              minWidth: '78px',
                            };
                          };

                          const classeLinhaDecisao = isItemPendente
                            ? 'linha-pendente-decisao'
                            : isItemDecidido
                            ? 'linha-decisao-concluida'
                            : '';

                          return (
                            <React.Fragment key={`div-frag-${itemKey}`}>
                              <tr key={`div-${itemKey}`} className={classeLinhaDecisao}>
                                <td style={{ textAlign: 'center', width: '38px', padding: '6px 4px' }}>
                                  <input
                                    type="checkbox"
                                    className="gestao-checkbox-select"
                                    checked={selecionadosDoGrupo.has(itemKey)}
                                    onChange={() => toggleSelecionarItem(grupo.id, itemKey)}
                                    disabled={estaEmN3}
                                    title={estaEmN3 ? 'Este produto já está em fila de reconferência N3.' : 'Selecionar produto para ação em massa'}
                                  />
                                </td>
                                <td>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color: 'var(--slate-900)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '280px',
                                    }}
                                    title={item.descrprod}
                                  >
                                    {item.descrprod || `Produto ${item.codprod}`}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.70rem',
                                      color: 'var(--slate-500)',
                                      whiteSpace: 'nowrap',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span>Cód: {item.codprod}</span>
                                    <span>•</span>
                                    {(() => {
                                      const ehMultiSeq = contagemSeqsPorCodprod[item.codprod] > 1;
                                      return (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '2px',
                                            fontSize: '0.68rem',
                                            background: ehMultiSeq ? '#eff6ff' : '#f1f5f9',
                                            color: ehMultiSeq ? '#1d4ed8' : '#334155',
                                            border: `1px solid ${ehMultiSeq ? '#bfdbfe' : '#e2e8f0'}`,
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                          }}
                                          title={
                                            ehMultiSeq
                                              ? `Item com múltiplas sequências na nota fiscal (Linha de Sequência ${item.sequencia} de ${contagemSeqsPorCodprod[item.codprod]})`
                                              : `Sequência ${item.sequencia} no Sankhya`
                                          }
                                        >
                                          {ehMultiSeq && <span style={{ fontSize: '0.65rem' }}>📑</span>}
                                          Seq: {item.sequencia}
                                        </span>
                                      );
                                    })()}
                                    {item.referencia ? <span>• Ref: {item.referencia}</span> : null}
                                  </div>
                                  {renderBadgesOcorrenciasItem(
                                    obterOcorrenciasDoItem(ocorrencias, item.nunota, item.codprod, item.sequencia)
                                  )}

                                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                    {estaEmN3 ? (
                                      <span
                                        className="badge-n3-solicitado"
                                        style={{
                                          background: '#eff6ff',
                                          color: '#1d4ed8',
                                          border: '1px solid #bfdbfe',
                                          borderRadius: '4px',
                                          padding: '2px 8px',
                                          fontSize: '0.70rem',
                                          fontWeight: 700,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        🔍 Aguardando N3
                                      </span>
                                    ) : isItemPendente && !temMultiplosLotes ? (
                                      <span className="badge-pendente-aviso">
                                        ⚠️ Pendente de Decisão
                                      </span>
                                    ) : isItemDecidido ? (
                                      <span className="badge-decidido-ok">
                                        ✓ Decisão: {nivelAtivoItem}
                                      </span>
                                    ) : null}

                                    </div>
                                </td>
                                <td>{item.codvol || 'UN'}</td>
                                <td>
                                  <strong>{item.qtdEsperada}</strong>
                                </td>
                                {exibirN1 && <td>{item.qtdN1}</td>}
                                {exibirN2 && (
                                  <td
                                    className={`celula-comparativa ${temN3Grupo ? 'clicavel' : ''} ${nivelAtivoItem === 'N2' ? 'selecionada' : ''}`}
                                    onClick={() => temN3Grupo && handleSelecionarNivelItem(grupo.id, itemKey, item, 'N2')}
                                    title={temN3Grupo ? 'Clique para adotar a conferência N2' : undefined}
                                  >
                                    {temN3Grupo && nivelAtivoItem === 'N2' ? (
                                      <span className="celula-comparativa selecionada-badge">✓ {item.qtdN2}</span>
                                    ) : (
                                      item.qtdN2
                                    )}
                                  </td>
                                )}
                                {temN3Grupo && (
                                  <td
                                    className={`celula-comparativa ${temN3Item ? 'clicavel' : 'neutra'} ${nivelAtivoItem === 'N3' ? 'selecionada' : ''}`}
                                    onClick={() => temN3Item && handleSelecionarNivelItem(grupo.id, itemKey, item, 'N3')}
                                    title={temN3Item ? 'Clique para adotar a conferência N3 (Desempate)' : 'Não enviado para N3'}
                                  >
                                    {temN3Item ? (
                                      nivelAtivoItem === 'N3' ? (
                                        <span className="celula-comparativa selecionada-badge">✓ {item.qtdN3}</span>
                                      ) : (
                                        item.qtdN3
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--slate-400)' }}>—</span>
                                    )}
                                  </td>
                                )}
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                                    {isFaltaIsolada ? (
                                      <span
                                        className="pill-contagem-status ok"
                                        style={{
                                          background: '#ecfdf5',
                                          color: '#047857',
                                          border: '1px solid #a7f3d0',
                                          display: 'inline-flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          padding: '2px 8px',
                                          lineHeight: 1.2,
                                        }}
                                        title="Item desmembrado como Falta no ERP (contagem física 0)"
                                      >
                                        <span>✓ OK</span>
                                        <span style={{ fontSize: '0.66rem', fontWeight: 600, opacity: 0.9 }}>
                                          Falta Isolada ERP
                                        </span>
                                      </span>
                                    ) : (
                                      <span className={`pill-contagem-status ${classeDifEfetiva}`}>
                                        {diferencaEfetiva === 0
                                          ? '✓ OK'
                                          : diferencaEfetiva < 0
                                          ? `⚠️ ${diferencaEfetiva} (Falta)`
                                          : `+${diferencaEfetiva} (Sobra)`}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* LOCAL DE ESTOQUE */}
                                <td>
                                  {(() => {
                                    const itemChave = `${item.nunota}-${item.sequencia}`;
                                    const codlocalEfetivo =
                                      locaisAlterados[itemChave] !== undefined
                                        ? locaisAlterados[itemChave]
                                        : item.codlocalorig;

                                    return (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAbrirAlterarLocal(
                                            item,
                                            grupo.conferenciaId || grupo.id
                                          )
                                        }
                                        title="Clique para alterar o Local de Estoque (CODLOCALORIG)"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          fontSize: '0.70rem',
                                          fontWeight: 600,
                                          padding: '2px 8px',
                                          borderRadius: '5px',
                                          border:
                                            codlocalEfetivo !== undefined &&
                                            codlocalEfetivo !== null
                                              ? '1px solid var(--slate-300)'
                                              : '1px solid #fca5a5',
                                          background:
                                            codlocalEfetivo !== undefined &&
                                            codlocalEfetivo !== null
                                              ? '#ffffff'
                                              : '#fef2f2',
                                          color:
                                            codlocalEfetivo !== undefined &&
                                            codlocalEfetivo !== null
                                              ? 'var(--slate-800)'
                                              : '#b91c1c',
                                          transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.borderColor =
                                            'var(--primary-500, #3b82f6)';
                                          e.currentTarget.style.backgroundColor =
                                            '#eff6ff';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.borderColor =
                                            codlocalEfetivo !== undefined &&
                                            codlocalEfetivo !== null
                                              ? 'var(--slate-300)'
                                              : '#fca5a5';
                                          e.currentTarget.style.backgroundColor =
                                            codlocalEfetivo !== undefined &&
                                            codlocalEfetivo !== null
                                              ? '#ffffff'
                                              : '#fef2f2';
                                        }}
                                      >
                                        <span>
                                          {codlocalEfetivo !== undefined &&
                                          codlocalEfetivo !== null
                                            ? codlocalEfetivo
                                            : 'Sem Local'}
                                        </span>
                                      </button>
                                    );
                                  })()}
                                </td>

                                {/* LOTE - COMPARAÇÃO NOTA VS CONFERIDO (NF -> N1 -> N2 -> N3) */}
                                <td>
                                  <div style={getEstiloBoxDivergencia(isPendenteLote, isDecididoLote)}>
                                    {/* 1. NF */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                                        NF
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          fontFamily: 'JetBrains Mono, monospace',
                                          color: nivelAtivoItem === 'ERP' ? '#047857' : isPendenteLote ? '#b91c1c' : '#334155',
                                          fontWeight: nivelAtivoItem === 'ERP' ? 700 : 500,
                                        }}
                                        title={`Lote na Nota Fiscal: ${item.controleOriginal || 'Sem Lote'}`}
                                      >
                                        {nivelAtivoItem === 'ERP' ? '✓ ' : ''}{item.controleOriginal || 'Sem Lote'}
                                      </span>
                                    </div>

                                    {/* 2. N1 (se existir) */}
                                    {temN1Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                          N1
                                        </span>
                                        {multiplosLotesN1 ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleLotesDiv(itemKey)}
                                            style={{
                                              background: isLotesAberto ? '#fef3c7' : '#fffbeb',
                                              color: '#b45309',
                                              border: '1px solid #fde68a',
                                              borderRadius: '3px',
                                              padding: '1px 5px',
                                              fontSize: '0.64rem',
                                              fontWeight: 700,
                                              fontFamily: 'JetBrains Mono, monospace',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title={`Clique para ${isLotesAberto ? 'recolher' : 'expandir'} os ${lotesConferidosN1.length} lotes`}
                                          >
                                            <span>{lotesConferidosN1.length} Lotes</span>
                                            <span style={{ fontSize: '0.50rem' }}>{isLotesAberto ? '▲' : '▼'}</span>
                                          </button>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: '0.68rem',
                                              fontFamily: 'JetBrains Mono, monospace',
                                              color: nivelAtivoItem === 'N1' ? (isItemDecidido ? '#047857' : isPendenteLote ? '#b91c1c' : '#1e293b') : '#475569',
                                              fontWeight: nivelAtivoItem === 'N1' ? 700 : 500,
                                            }}
                                          >
                                            {nivelAtivoItem === 'N1' && (isItemDecidido ? '✓ ' : '')}{loteN1Str || 'Sem Lote'}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* 3. N2 (se existir) */}
                                    {temN2Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                          N2
                                        </span>
                                        {multiplosLotesN2 ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleLotesDiv(itemKey)}
                                            style={{
                                              background: isLotesAberto ? '#fef3c7' : '#fffbeb',
                                              color: '#b45309',
                                              border: '1px solid #fde68a',
                                              borderRadius: '3px',
                                              padding: '1px 5px',
                                              fontSize: '0.64rem',
                                              fontWeight: 700,
                                              fontFamily: 'JetBrains Mono, monospace',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title={`Clique para ${isLotesAberto ? 'recolher' : 'expandir'} os ${lotesConferidosN2.length} lotes`}
                                          >
                                            <span>{lotesConferidosN2.length} Lotes</span>
                                            <span style={{ fontSize: '0.50rem' }}>{isLotesAberto ? '▲' : '▼'}</span>
                                          </button>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: '0.68rem',
                                              fontFamily: 'JetBrains Mono, monospace',
                                              color: nivelAtivoItem === 'N2' ? (isItemDecidido ? '#047857' : isPendenteLote ? '#b91c1c' : '#0f172a') : '#475569',
                                              fontWeight: nivelAtivoItem === 'N2' ? 700 : 500,
                                            }}
                                          >
                                            {nivelAtivoItem === 'N2' && (isItemDecidido ? '✓ ' : '')}{loteN2Str || 'Sem Lote'}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* 4. N3 (se existir) */}
                                    {temN3Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                                          N3
                                        </span>
                                        {multiplosLotesN3 ? (
                                          <button
                                            type="button"
                                            onClick={() => toggleLotesDiv(itemKey)}
                                            style={{
                                              background: isLotesAberto ? '#fef3c7' : '#fffbeb',
                                              color: '#b45309',
                                              border: '1px solid #fde68a',
                                              borderRadius: '3px',
                                              padding: '1px 5px',
                                              fontSize: '0.64rem',
                                              fontWeight: 700,
                                              fontFamily: 'JetBrains Mono, monospace',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title={`Clique para ${isLotesAberto ? 'recolher' : 'expandir'} os ${lotesConferidosN3.length} lotes`}
                                          >
                                            <span>{lotesConferidosN3.length} Lotes</span>
                                            <span style={{ fontSize: '0.50rem' }}>{isLotesAberto ? '▲' : '▼'}</span>
                                          </button>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: '0.68rem',
                                              fontFamily: 'JetBrains Mono, monospace',
                                              color: nivelAtivoItem === 'N3' ? (isItemDecidido ? '#047857' : isPendenteLote ? '#b91c1c' : '#0f172a') : '#475569',
                                              fontWeight: nivelAtivoItem === 'N3' ? 700 : 500,
                                            }}
                                          >
                                            {nivelAtivoItem === 'N3' && (isItemDecidido ? '✓ ' : '')}{loteN3Str || 'Sem Lote'}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* FABRICAÇÃO - COMPARAÇÃO NOTA VS CONFERIDO (NF -> N1 -> N2 -> N3) */}
                                <td>
                                  <div style={getEstiloBoxDivergencia(isPendenteFabricacao, isDecididoFabricacao)}>
                                    {/* 1. NF */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                                        NF
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          fontFamily: 'JetBrains Mono, monospace',
                                          color: nivelAtivoItem === 'ERP' ? '#047857' : isPendenteFabricacao ? '#b91c1c' : '#334155',
                                          fontWeight: nivelAtivoItem === 'ERP' ? 700 : 500,
                                        }}
                                        title={`Fabricação na Nota Fiscal: ${formatarDataSimples(item.fabricacaoOriginal) || '—'}`}
                                      >
                                        {nivelAtivoItem === 'ERP' ? '✓ ' : ''}{formatarDataSimples(item.fabricacaoOriginal) || '—'}
                                      </span>
                                    </div>

                                    {/* 2. N1 (se existir) */}
                                    {temN1Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                          N1
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: nivelAtivoItem === 'N1' ? (isItemDecidido ? '#047857' : isPendenteFabricacao ? '#b91c1c' : '#1e293b') : '#475569',
                                            fontWeight: nivelAtivoItem === 'N1' ? 700 : 500,
                                          }}
                                        >
                                          {nivelAtivoItem === 'N1' && (isItemDecidido ? '✓ ' : '')}{multiplosLotesN1 ? 'Múltiplas' : (fabN1Str || '—')}
                                        </span>
                                      </div>
                                    )}

                                    {/* 3. N2 (se existir) */}
                                    {temN2Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                          N2
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: nivelAtivoItem === 'N2' ? (isItemDecidido ? '#047857' : isPendenteFabricacao ? '#b91c1c' : '#0f172a') : '#475569',
                                            fontWeight: nivelAtivoItem === 'N2' ? 700 : 500,
                                          }}
                                        >
                                          {nivelAtivoItem === 'N2' && (isItemDecidido ? '✓ ' : '')}{multiplosLotesN2 ? 'Múltiplas' : (fabN2Str || '—')}
                                        </span>
                                      </div>
                                    )}

                                    {/* 4. N3 (se existir) */}
                                    {temN3Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                                          N3
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: nivelAtivoItem === 'N3' ? (isItemDecidido ? '#047857' : isPendenteFabricacao ? '#b91c1c' : '#0f172a') : '#475569',
                                            fontWeight: nivelAtivoItem === 'N3' ? 700 : 500,
                                          }}
                                        >
                                          {nivelAtivoItem === 'N3' && (isItemDecidido ? '✓ ' : '')}{multiplosLotesN3 ? 'Múltiplas' : (fabN3Str || '—')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {/* VALIDADE - COMPARAÇÃO NOTA VS CONFERIDO (NF -> N1 -> N2 -> N3) */}
                                <td>
                                  <div style={getEstiloBoxDivergencia(isPendenteValidade, isDecididoValidade)}>
                                    {/* 1. NF */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                      <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                                        NF
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          fontFamily: 'JetBrains Mono, monospace',
                                          color: nivelAtivoItem === 'ERP' ? '#047857' : isPendenteValidade ? '#b91c1c' : '#334155',
                                          fontWeight: nivelAtivoItem === 'ERP' ? 700 : 500,
                                        }}
                                        title={`Validade na Nota Fiscal: ${formatarDataSimples(item.validadeOriginal) || '—'}`}
                                      >
                                        {nivelAtivoItem === 'ERP' ? '✓ ' : ''}{formatarDataSimples(item.validadeOriginal) || '—'}
                                      </span>
                                    </div>

                                    {/* 2. N1 (se existir) */}
                                    {temN1Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                          N1
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: nivelAtivoItem === 'N1' ? (isItemDecidido ? '#047857' : isPendenteValidade ? '#b91c1c' : '#1e293b') : '#475569',
                                            fontWeight: nivelAtivoItem === 'N1' ? 700 : 500,
                                          }}
                                        >
                                          {nivelAtivoItem === 'N1' && (isItemDecidido ? '✓ ' : '')}{multiplosLotesN1 ? 'Múltiplas' : (valN1Str || '—')}
                                        </span>
                                      </div>
                                    )}

                                    {/* 3. N2 (se existir) */}
                                    {temN2Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                          N2
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: nivelAtivoItem === 'N2' ? (isItemDecidido ? '#047857' : isPendenteValidade ? '#b91c1c' : '#0f172a') : '#475569',
                                            fontWeight: nivelAtivoItem === 'N2' ? 700 : 500,
                                          }}
                                        >
                                          {nivelAtivoItem === 'N2' && (isItemDecidido ? '✓ ' : '')}{multiplosLotesN2 ? 'Múltiplas' : (valN2Str || '—')}
                                        </span>
                                      </div>
                                    )}

                                    {/* 4. N3 (se existir) */}
                                    {temN3Item && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 3px', borderRadius: '3px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                                          N3
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            color: nivelAtivoItem === 'N3' ? (isItemDecidido ? '#047857' : isPendenteValidade ? '#b91c1c' : '#0f172a') : '#475569',
                                            fontWeight: nivelAtivoItem === 'N3' ? 700 : 500,
                                          }}
                                        >
                                          {nivelAtivoItem === 'N3' && (isItemDecidido ? '✓ ' : '')}{multiplosLotesN3 ? 'Múltiplas' : (valN3Str || '—')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td
                                  style={{
                                    fontSize: '0.70rem',
                                    color: 'var(--slate-600)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {formatarConferentes(item)}
                                </td>
                              </tr>

                              {/* Sub-Linha Gaveta: Mini-tabela Direta de Lotes (Oculta por padrão, abre diretamente sem barra de cabeçalho) */}
                              {temMultiplosLotes && isLotesAberto && (
                                <tr key={`div-lotes-${itemKey}`} className="subrow-lotes-drawer aberta">
                                  <td colSpan={totalColunasDiv}>
                                    <div className="drawer-lotes-wrapper" style={{ margin: '4px 8px 10px 8px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px' }}>
                                      <table className="mini-tabela-lotes" style={{ margin: 0 }}>
                                        <thead>
                                          <tr>
                                            <th>Lote</th>
                                            <th style={{ textAlign: 'center' }}>Quantidade</th>
                                            <th>Data de Fabricação</th>
                                            <th>Data de Validade</th>
                                            <th>Conferente</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {lotesConferidos.map((fracao, fIdx) => (
                                            <tr key={`div-f-${itemKey}-${fracao.lote}-${fIdx}`}>
                                              <td>
                                                <span className="gestao-lote-pill" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                                  🏷️ {fracao.lote}
                                                </span>
                                              </td>
                                              <td style={{ textAlign: 'center' }}>
                                                <strong>{fracao.quantidade}</strong> {item.codvol || 'UN'}
                                              </td>
                                              <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-600)' }}>
                                                {formatarDataSimples(fracao.fabricacao)}
                                              </td>
                                              <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--slate-800)' }}>
                                                {formatarDataSimples(fracao.validade)}
                                              </td>
                                              <td style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                                                {fracao.conferente ? `👤 ${fracao.conferente}` : '—'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards Mobile (<= 1024px) */}
                  <div className="gestao-rec-itens-mobile" style={{ marginTop: '8px' }}>
                    {itensParaExibir.map((item) => {
                      const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
                      const decisaoItem = decisoesDoGrupo[itemKey];
                      const temN3Grupo = grupo.totalN3 > 0;
                      const temN3Item = Boolean(item.qtdN3 > 0 || ((item as any).loteN3 && (item as any).loteN3.trim() !== ''));

                      // Nível ativo do item
                      const nivelAtivoItem: 'N2' | 'N3' | 'ERP' =
                        decisaoItem?.lote === 'ERP' || decisaoItem?.quantidade === 'ERP'
                          ? 'ERP'
                          : decisaoItem?.lote === 'N2' || decisaoItem?.nivelEscolhido === 2
                          ? 'N2'
                          : decisaoItem?.lote === 'N3' || decisaoItem?.nivelEscolhido === 3
                          ? 'N3'
                          : temN3Item
                          ? 'N3'
                          : 'N2';

                      const lotesConferidos: any[] =
                        nivelAtivoItem === 'N3'
                          ? (item as any).lotesConferidosN3 || []
                          : (item as any).lotesConferidosN2 || (item as any).lotesConferidos || [];

                      const temMultiplosLotes = nivelAtivoItem !== 'ERP' && lotesConferidos.length > 1;
                      const isLotesAberto = Boolean(lotesExpandidosDiv[itemKey]);

                      const loteAtivo =
                        nivelAtivoItem === 'N3'
                          ? (item as any).loteN3 || item.lote
                          : (item as any).loteN2 || item.lote;

                      const validadeAtiva =
                        nivelAtivoItem === 'N3'
                          ? (item as any).validadeN3 || item.validade
                          : (item as any).validadeN2 || item.validade;

                      const fabricacaoAtiva =
                        nivelAtivoItem === 'N3'
                          ? (item as any).fabricacaoN3 || item.fabricacao
                          : (item as any).fabricacaoN2 || item.fabricacao;

                      const contagemAtiva =
                        nivelAtivoItem === 'ERP'
                          ? item.qtdEsperada
                          : nivelAtivoItem === 'N3'
                          ? item.qtdN3
                          : item.qtdN2 > 0
                          ? item.qtdN2
                          : item.qtdN1;

                      const diferenca = contagemAtiva - item.qtdEsperada;
                      const classeDif =
                        diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                      const numnotaStr = String(grupo.numnota || item.nunota || '').trim();
                      const nunotaStr = String(item.nunota || '').trim();
                      const loteOriginal = String(item.controleOriginal || loteAtivo || '').trim();
                      const isFaltaIsolada = Boolean(
                        item.isFaltaIsolada ||
                        (loteOriginal && (loteOriginal === numnotaStr || loteOriginal === nunotaStr))
                      );
                      const diferencaEfetiva = isFaltaIsolada ? 0 : diferenca;
                      const classeDifEfetiva = isFaltaIsolada ? 'ok' : classeDif;

                      const temDivergenciaFiscal = Boolean(
                        item.divergenciaLote || item.divergenciaValidade || item.divergenciaFabricacao
                      );
                      const pendenteLote = Boolean(item.divergenciaLote && !decisaoItem?.lote);
                      const pendenteValidade = Boolean(item.divergenciaValidade && !decisaoItem?.validade);
                      const pendenteFabricacao = Boolean(item.divergenciaFabricacao && !decisaoItem?.fabricacao);
                      const estaEmN3 = verificarItemEmN3(grupo, item);
                      const isItemPendente = !estaEmN3 && temDivergenciaFiscal && (pendenteLote || pendenteValidade || pendenteFabricacao);
                      const isItemDecidido = !estaEmN3 && temDivergenciaFiscal && !isItemPendente;

                      const classeCardMobile = isItemPendente
                        ? 'card-mobile-pendente-decisao'
                        : isItemDecidido
                        ? 'card-mobile-decisao-concluida'
                        : '';

                      return (
                        <div
                          key={`mob-${itemKey}`}
                          className={`gestao-item-card-mobile ${classeCardMobile}`}
                        >
                          <div className="gestao-item-mobile-header">
                            <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
                              <input
                                type="checkbox"
                                className="gestao-checkbox-select"
                                checked={selecionadosDoGrupo.has(itemKey)}
                                onChange={() => toggleSelecionarItem(grupo.id, itemKey)}
                                disabled={estaEmN3}
                                title={estaEmN3 ? 'Este produto já está em fila de reconferência N3.' : 'Selecionar produto para ação em massa'}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="gestao-item-mobile-descr">
                                {item.descrprod || `Produto ${item.codprod}`}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.70rem',
                                  color: 'var(--slate-500)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span>Cód: {item.codprod}</span>
                                <span>•</span>
                                {(() => {
                                  const ehMultiSeq = contagemSeqsPorCodprod[item.codprod] > 1;
                                  return (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        fontSize: '0.68rem',
                                        background: ehMultiSeq ? '#eff6ff' : '#f1f5f9',
                                        color: ehMultiSeq ? '#1d4ed8' : '#334155',
                                        border: `1px solid ${ehMultiSeq ? '#bfdbfe' : '#e2e8f0'}`,
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        fontWeight: 700,
                                      }}
                                      title={
                                        ehMultiSeq
                                          ? `Item com múltiplas sequências na nota fiscal (Linha de Sequência ${item.sequencia} de ${contagemSeqsPorCodprod[item.codprod]})`
                                          : `Sequência ${item.sequencia} no Sankhya`
                                      }
                                    >
                                      {ehMultiSeq && <span style={{ fontSize: '0.65rem' }}>📑</span>}
                                      Seq: {item.sequencia}
                                    </span>
                                  );
                                })()}
                                {item.referencia ? <span>• Ref: {item.referencia}</span> : null}
                                <span>• Vol: {item.codvol || 'UN'}</span>
                                
                              </div>
                              {renderBadgesOcorrenciasItem(
                                obterOcorrenciasDoItem(ocorrencias, item.nunota, item.codprod, item.sequencia)
                              )}

                              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                {estaEmN3 ? (
                                  <span
                                    className="badge-n3-solicitado"
                                    style={{
                                      background: '#eff6ff',
                                      color: '#1d4ed8',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: '4px',
                                      padding: '2px 8px',
                                      fontSize: '0.70rem',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    🔍 Aguardando N3
                                  </span>
                                ) : isItemPendente && !temMultiplosLotes ? (
                                  <span className="badge-pendente-aviso">
                                    ⚠️ Pendente de Decisão
                                  </span>
                                ) : isItemDecidido ? (
                                  <span className="badge-decidido-ok">
                                    ✓ Decisão Definida
                                  </span>
                                ) : null}

                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                  {isFaltaIsolada ? (
                                    <span
                                      className="pill-contagem-status ok"
                                      style={{
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0',
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        padding: '2px 6px',
                                        lineHeight: 1.2,
                                      }}
                                      title="Item desmembrado como Falta no ERP (contagem física 0)"
                                    >
                                      <span>✓ OK</span>
                                      <span style={{ fontSize: '0.64rem', fontWeight: 600, opacity: 0.9 }}>
                                        Falta Isolada ERP
                                      </span>
                                    </span>
                                  ) : (
                                    <span className={`pill-contagem-status ${classeDifEfetiva}`}>
                                      {diferencaEfetiva === 0
                                        ? '✓ OK'
                                        : diferencaEfetiva < 0
                                        ? `⚠️ ${diferencaEfetiva} (Falta)`
                                        : `+${diferencaEfetiva} (Sobra)`}
                                    </span>
                                  )}
                            </div>
                          </div>

                          <div className="gestao-item-mobile-grid">
                            <div>
                              Nota: <strong>{item.qtdEsperada}</strong>
                            </div>
                            {exibirN1 && (
                              <div>
                                N1: <strong>{item.qtdN1}</strong>
                              </div>
                            )}
                            {exibirN2 && (
                              <div>
                                N2: <strong>{item.qtdN2}</strong>
                              </div>
                            )}
                            {grupo.totalN3 > 0 && (
                              <div>
                                N3: <strong>{item.qtdN3}</strong>
                              </div>
                            )}
                            <div>
                              Local:{' '}
                              {(() => {
                                const itemChave = `${item.nunota}-${item.sequencia}`;
                                const codlocalEfetivo =
                                  locaisAlterados[itemChave] !== undefined
                                    ? locaisAlterados[itemChave]
                                    : item.codlocalorig;

                                return (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAbrirAlterarLocal(
                                        item,
                                        grupo.conferenciaId || grupo.id
                                      )
                                    }
                                    style={{
                                      cursor: 'pointer',
                                      fontSize: '0.70rem',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border:
                                        codlocalEfetivo !== undefined &&
                                        codlocalEfetivo !== null
                                          ? '1px solid var(--slate-300)'
                                          : '1px solid #fca5a5',
                                      background:
                                        codlocalEfetivo !== undefined &&
                                        codlocalEfetivo !== null
                                          ? '#ffffff'
                                          : '#fef2f2',
                                      color:
                                        codlocalEfetivo !== undefined &&
                                        codlocalEfetivo !== null
                                          ? 'var(--slate-800)'
                                          : '#b91c1c',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <span>
                                      {codlocalEfetivo !== undefined &&
                                      codlocalEfetivo !== null
                                        ? codlocalEfetivo
                                        : 'Sem Local'}
                                    </span>
                                  </button>
                                );
                              })()}
                            </div>
                          </div>

                          <div
                            className="gestao-item-mobile-lote-info"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            {temMultiplosLotes ? (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className={`chip-dropdown-lote ${isLotesAberto ? 'ativo' : ''}`}
                                    onClick={() => toggleLotesDiv(itemKey)}
                                  >
                                    <span>🏷️ {lotesConferidos.length} Lotes</span>
                                    <span style={{ fontSize: '0.65rem' }}>{isLotesAberto ? '▲ recolher' : '▼ expandir'}</span>
                                  </button>
                                  {(item.conferenteN1 || item.conferenteN2 || item.conferenteN3) && (
                                    <div style={{ fontSize: '0.70rem', color: 'var(--slate-500)' }}>
                                      {formatarConferentes(item)}
                                    </div>
                                  )}
                                </div>

                                {isLotesAberto && (
                                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {lotesConferidos.map((fracao, fIdx) => (
                                      <div
                                        key={`mob-div-${itemKey}-${fracao.lote}-${fIdx}`}
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid var(--slate-200)',
                                          borderRadius: '6px',
                                          padding: '6px 8px',
                                          fontSize: '0.72rem',
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-900)' }}>
                                            🏷️ {fracao.lote}
                                          </span>
                                          <span style={{ background: 'var(--slate-100)', padding: '1px 5px', borderRadius: '4px' }}>
                                            {fracao.quantidade} {item.codvol || 'UN'}
                                          </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                                          <span>Fab: {formatarDataSimples(fracao.fabricacao)}</span>
                                          <span>Val: {formatarDataSimples(fracao.validade)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                }}
                              >
                                <div>
                                  {temN3Grupo ? (
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', marginTop: '4px' }}>
                                      <div style={{ color: 'var(--slate-800)', fontWeight: 700, fontSize: '0.72rem', marginBottom: '4px' }}>
                                        ⚖️ Escolher Conferência / Desempate:
                                      </div>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        <button
                                          type="button"
                                          className={`btn-decisao-fiscal ${nivelAtivoItem === 'ERP' ? 'ativo-erp' : ''}`}
                                          onClick={() => handleSelecionarNivelItem(grupo.id, itemKey, item, 'ERP')}
                                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.70rem' }}
                                        >
                                          {nivelAtivoItem === 'ERP' && '✓ '}ERP ({item.controleOriginal || 'S/ Lote'})
                                        </button>
                                        <button
                                          type="button"
                                          className={`btn-decisao-fiscal ${nivelAtivoItem === 'N2' ? 'ativo-bip' : ''}`}
                                          onClick={() => handleSelecionarNivelItem(grupo.id, itemKey, item, 'N2')}
                                          style={{ flex: 1, padding: '4px 6px', fontSize: '0.70rem' }}
                                        >
                                          {nivelAtivoItem === 'N2' && '✓ '}N2 ({(item as any).loteN2 || item.lote || 'S/ Lote'})
                                        </button>
                                        {temN3Item && (
                                          <button
                                            type="button"
                                            className={`btn-decisao-fiscal ${nivelAtivoItem === 'N3' ? 'ativo-bip' : ''}`}
                                            onClick={() => handleSelecionarNivelItem(grupo.id, itemKey, item, 'N3')}
                                            style={{
                                              flex: 1,
                                              padding: '4px 6px',
                                              fontSize: '0.70rem',
                                              background: nivelAtivoItem === 'N3' ? '#4338ca' : '#e0e7ff',
                                              color: nivelAtivoItem === 'N3' ? '#ffffff' : '#4338ca',
                                              borderColor: '#c7d2fe',
                                            }}
                                          >
                                            {nivelAtivoItem === 'N3' && '✓ '}N3 ({(item as any).loteN3 || 'S/ Lote'})
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : item.divergenciaLote || item.divergenciaValidade || item.divergenciaFabricacao ? (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '4px 6px', marginTop: '2px' }}>
                                      <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.70rem' }}>
                                        ⚠️ Divergência Fiscal/Cadastro:
                                      </div>
                                      {item.divergenciaLote && (
                                        <div style={{ fontSize: '0.68rem', color: '#991b1b', marginTop: '2px' }}>
                                          <div>Lote Bip: <strong>{item.lote || 'Sem lote'}</strong> (NF: {item.controleOriginal})</div>
                                          <div className="grupo-botoes-decisao-fiscal">
                                            <button
                                              type="button"
                                              className={`btn-decisao-fiscal ${decisaoItem?.lote === 'ERP' ? 'ativo-erp' : ''}`}
                                              onClick={() => handleSetDecisao(grupo.id, itemKey, item, 'lote', 'ERP')}
                                            >
                                              {decisaoItem?.lote === 'ERP' && '✓ '}ERP
                                            </button>
                                            <button
                                              type="button"
                                              className={`btn-decisao-fiscal ${decisaoItem?.lote === 'BIP' ? 'ativo-bip' : ''}`}
                                              onClick={() => handleSetDecisao(grupo.id, itemKey, item, 'lote', 'BIP')}
                                            >
                                              {decisaoItem?.lote === 'BIP' && '✓ '}BIP
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {item.divergenciaFabricacao && (
                                        <div style={{ fontSize: '0.68rem', color: '#991b1b', marginTop: '4px' }}>
                                          <div>Fab Bip: <strong>{formatarDataSimples(item.fabricacao)}</strong> (Orig: {item.fabricacaoOriginal})</div>
                                          <div className="grupo-botoes-decisao-fiscal">
                                            <button
                                              type="button"
                                              className={`btn-decisao-fiscal ${decisaoItem?.fabricacao === 'ERP' ? 'ativo-erp' : ''}`}
                                              onClick={() => handleSetDecisao(grupo.id, itemKey, item, 'fabricacao', 'ERP')}
                                            >
                                              {decisaoItem?.fabricacao === 'ERP' && '✓ '}ERP
                                            </button>
                                            <button
                                              type="button"
                                              className={`btn-decisao-fiscal ${decisaoItem?.fabricacao === 'BIP' ? 'ativo-bip' : ''}`}
                                              onClick={() => handleSetDecisao(grupo.id, itemKey, item, 'fabricacao', 'BIP')}
                                            >
                                              {decisaoItem?.fabricacao === 'BIP' && '✓ '}BIP
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {item.divergenciaValidade && (
                                        <div style={{ fontSize: '0.68rem', color: '#991b1b', marginTop: '4px' }}>
                                          <div>Val Bip: <strong>{formatarDataSimples(item.validade)}</strong> (Orig: {item.validadeOriginal})</div>
                                          <div className="grupo-botoes-decisao-fiscal">
                                            <button
                                              type="button"
                                              className={`btn-decisao-fiscal ${decisaoItem?.validade === 'ERP' ? 'ativo-erp' : ''}`}
                                              onClick={() => handleSetDecisao(grupo.id, itemKey, item, 'validade', 'ERP')}
                                            >
                                              {decisaoItem?.validade === 'ERP' && '✓ '}ERP
                                            </button>
                                            <button
                                              type="button"
                                              className={`btn-decisao-fiscal ${decisaoItem?.validade === 'BIP' ? 'ativo-bip' : ''}`}
                                              onClick={() => handleSetDecisao(grupo.id, itemKey, item, 'validade', 'BIP')}
                                            >
                                              {decisaoItem?.validade === 'BIP' && '✓ '}BIP
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : item.lote ? (
                                    <>
                                      Lote: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.lote}</strong>
                                      {item.fabricacao
                                        ? ` • Fab: ${formatarDataSimples(item.fabricacao)}`
                                        : ''}
                                      {item.validade ? ` • Val: ${formatarDataSimples(item.validade)}` : ''}
                                    </>
                                  ) : (
                                    <span style={{ color: 'var(--slate-400)' }}>Sem lote</span>
                                  )}
                                </div>
                                {(item.conferenteN1 || item.conferenteN2 || item.conferenteN3) && (
                                  <div style={{ fontSize: '0.70rem', color: 'var(--slate-500)' }}>
                                    {formatarConferentes(item)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Barra de Ações da Conferência */}
              <div className="gestao-rec-card-acoes">
                {estaAguardandoOuEmN3 ? (
                  <button
                    type="button"
                    className="gestao-btn-acao"
                    disabled
                    style={{
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      cursor: 'not-allowed',
                      fontWeight: 700,
                      borderRadius: '6px',
                      opacity: 0.85,
                    }}
                    title="Esta conferência já foi enviada para reconferência N3 no coletor."
                  >
                    <span>⏳ Aguardando Coletor N3</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="gestao-btn-acao"
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 700,
                      border: '1px solid #0f172a',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setGrupoAssistenteId(grupo.id)}
                    title="Abrir o assistente passo a passo para resolver as divergências com decisões guiadas"
                  >
                    <span>🧙 Iniciar Assistente</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`gestao-btn-acao gestao-btn-resolver ${!podeResolverDivergencia || estaAguardandoOuEmN3 ? 'disabled' : ''}`}
                  disabled={!podeResolverDivergencia || estaAguardandoOuEmN3}
                  onClick={() => onResolverDivergencia(grupo, decisoesDoGrupo)}
                  title={
                    estaAguardandoOuEmN3
                      ? 'Aguarde a finalização da reconferência N3 no coletor para resolver a divergência.'
                      : !podeResolverDivergencia
                      ? `Existem ${totalPendentesAssistente || totalFiscaisPendentes} pendência(s) não resolvidas (desmembramento, sobras/faltas ou cadastrais) antes de aprovar.`
                      : 'Resolver e aprovar divergência'
                  }
                >
                  <span>
                    {estaAguardandoOuEmN3
                      ? '⏳ Aguardando N3'
                      : podeResolverDivergencia
                      ? '✓ Resolver Divergência'
                      : `⚠️ Resolver Divergência (${totalPendentesAssistente || totalFiscaisPendentes} pendente${(totalPendentesAssistente || totalFiscaisPendentes) > 1 ? 's' : ''})`}
                  </span>
                </button>

                <button
                  type="button"
                  className={`gestao-btn-acao gestao-btn-n3 ${estaAguardandoOuEmN3 ? 'disabled' : ''}`}
                  disabled={estaAguardandoOuEmN3}
                  onClick={() => {
                    if (estaAguardandoOuEmN3) return;
                    const statusAtual = grupo.status || '';
                    if (ehStatusEmAndamento(statusAtual)) {
                      const conferenteAtivo =
                        (grupo.conferentesN3 && grupo.conferentesN3[0]) ||
                        (grupo.conferentesN2 && grupo.conferentesN2[0]) ||
                        (grupo.conferentesN1 && grupo.conferentesN1[0]) ||
                        grupo.conferente;
                      if (onBloqueioEmAndamento) {
                        onBloqueioEmAndamento({
                          conferente: conferenteAtivo,
                          numnota: grupo.numnota || grupo.numerosNotas,
                          status: grupo.status,
                        });
                      } else {
                        alert(
                          `Ação bloqueada: a conferência da nota já está em andamento${
                            conferenteAtivo ? ` pelo conferente ${conferenteAtivo}` : ''
                          }. Só é permitido enviar para reconferência quando a conferência estiver finalizada ou aguardando.`
                        );
                      }
                      return;
                    }

                    const selecionados = selecionadosDoGrupo;
                    if (!selecionados || selecionados.size === 0) {
                      if (!isExpandido) {
                        toggleItensDivergencia(grupo.id);
                      }
                      alert('Selecione ao menos um produto na tabela com o checkbox para enviar para a Reconferência N3.');
                      return;
                    }
                    const itensMapeados = grupo.todosItens.filter((i) =>
                      selecionados.has(`${i.nunota}-${i.codprod}-${i.sequencia}`) && !verificarItemEmN3(grupo, i)
                    );
                    if (itensMapeados.length === 0) {
                      alert('Todos os itens selecionados já estão em reconferência N3.');
                      return;
                    }
                    onReconferirN3(grupo, itensMapeados);
                  }}
                  title={
                    estaAguardandoOuEmN3
                      ? 'Esta nota já está com reconferência N3 em andamento no coletor.'
                      : 'Enviar os produtos selecionados para reconferência cega de desempate (N3)'
                  }
                >
                  <span>
                    {estaAguardandoOuEmN3 ? '✓ Em N3 (Coletor)' : '🔍 Reconferir (N3)'}
                    {!estaAguardandoOuEmN3 && (selecionadosDoGrupo?.size || 0) > 0 ? ` (${selecionadosDoGrupo.size})` : ''}
                  </span>
                </button>

                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-reiniciar"
                  onClick={() => onReiniciar(grupo)}
                >
                  <span>↺ Reiniciar</span>
                </button>
              </div>
            </div>
          );
        })
      )}

      {modalDesmembrarItem && (
        <ModalDesmembrarItem
          isOpen={Boolean(modalDesmembrarItem)}
          onClose={() => setModalDesmembrarItem(null)}
          item={modalDesmembrarItem.item}
          grupo={modalDesmembrarItem.grupo}
          loading={executandoDesmembramento}
          onConfirmar={async (dados) => {
            if (!onExecutarDesmembramento) return;
            setExecutandoDesmembramento(true);
            try {
              await onExecutarDesmembramento(
                modalDesmembrarItem.grupo.conferenciaId || modalDesmembrarItem.grupo.id,
                dados
              );
            } finally {
              setExecutandoDesmembramento(false);
            }
          }}
        />
      )}

      {modalOcorrenciaSobra && (
        <ModalOcorrenciaSobra
          isOpen={Boolean(modalOcorrenciaSobra)}
          onClose={() => setModalOcorrenciaSobra(null)}
          item={modalOcorrenciaSobra.item}
          grupo={modalOcorrenciaSobra.grupo}
          loading={executandoOcorrenciaSobra}
          onConfirmar={async (dados) => {
            setExecutandoOcorrenciaSobra(true);
            try {
              if (onRegistrarOcorrenciaSobra) {
                await onRegistrarOcorrenciaSobra(dados);
              } else {
                await recebimentoService.registrarOcorrenciaSobra(dados.conferenciaId, dados);
              }
              setModalOcorrenciaSobra(null);
            } finally {
              setExecutandoOcorrenciaSobra(false);
            }
          }}
        />
      )}

      {modalRevisarDesempateItem && (
        <ModalRevisarDesempate
          isOpen={Boolean(modalRevisarDesempateItem)}
          onClose={() => setModalRevisarDesempateItem(null)}
          item={modalRevisarDesempateItem.item}
          grupo={modalRevisarDesempateItem.grupo}
          decisaoAtual={modalRevisarDesempateItem.decisaoAtual}
          onConfirmarDecisao={(nivel) => {
            const itemKey = `${modalRevisarDesempateItem.item.nunota}-${modalRevisarDesempateItem.item.codprod}-${modalRevisarDesempateItem.item.sequencia}`;
            handleSelecionarNivelItem(
              modalRevisarDesempateItem.grupo.id,
              itemKey,
              modalRevisarDesempateItem.item,
              nivel
            );
            setModalRevisarDesempateItem(null);
          }}
        />
      )}

      {modalDecidirN2Item && (
        <ModalDecidirDivergenciaN2
          isOpen={Boolean(modalDecidirN2Item)}
          onClose={() => setModalDecidirN2Item(null)}
          item={modalDecidirN2Item.item}
          grupo={modalDecidirN2Item.grupo}
          onAdotarN2={() => {
            const itemKey = `${modalDecidirN2Item.item.nunota}-${modalDecidirN2Item.item.codprod}-${modalDecidirN2Item.item.sequencia}`;
            handleSelecionarNivelItem(
              modalDecidirN2Item.grupo.id,
              itemKey,
              modalDecidirN2Item.item,
              'N2'
            );
            setModalDecidirN2Item(null);
          }}
          onEnviarN3={() => {
            onReconferirN3(modalDecidirN2Item.grupo, [modalDecidirN2Item.item]);
            setModalDecidirN2Item(null);
          }}
        />
      )}
      {modalLocalAberto && (
        <ModalPesquisaLocalEstoque
          isOpen={modalLocalAberto}
          onClose={() => {
            if (!salvandoLocal) {
              setModalLocalAberto(false);
              setItemParaAlterarLocal(null);
            }
          }}
          codlocalAtual={itemParaAlterarLocal?.codlocalorig}
          tituloContexto={
            itemParaAlterarLocal
              ? `${itemParaAlterarLocal.descrprod} (Nota ${itemParaAlterarLocal.nunota})`
              : undefined
          }
          onSelecionar={(codlocal) => handleConfirmarAlterarLocal(codlocal)}
        />
      )}

      {grupoAssistente && (
        <ModalAssistenteDivergencias
          isOpen={Boolean(grupoAssistente)}
          onClose={() => setGrupoAssistenteId(null)}
          grupo={grupoAssistente}
          ocorrencias={ocorrencias}
          decisoesDoGrupo={decisoesFiscaisPorGrupo[grupoAssistente.id] || {}}
          onDefinirDecisaoFiscal={handleSetDecisao}
          onLimparDecisaoItem={handleLimparDecisaoItem}
          onSelecionarNivelItem={handleSelecionarNivelItem}
          onAbrirModalSobra={(item, g) => setModalOcorrenciaSobra({ item, grupo: g })}
          onAbrirModalDesmembrar={(item, g) => setModalDesmembrarItem({ item, grupo: g })}
          onAbrirModalRevisarDesempate={(item, g, decisaoAtual) =>
            setModalRevisarDesempateItem({ item, grupo: g, decisaoAtual })
          }
          onAbrirModalDecidirN2={(item, g) => setModalDecidirN2Item({ item, grupo: g })}
          onReconferirN3={(g, itens) => onReconferirN3(g, itens)}
          onFinalizarResolucao={(g) => {
            onResolverDivergencia(g, decisoesFiscaisPorGrupo[g.id]);
            setGrupoAssistenteId(null);
          }}
          executandoDesmembramento={executandoDesmembramento}
          executandoOcorrenciaSobra={executandoOcorrenciaSobra}
          onExecutarSobraApi={onRegistrarOcorrenciaSobra}
          onExecutarDesmembramentoApi={onExecutarDesmembramento}
          onExecutarN3Api={onExecutarN3Api}
        />
      )}
    </div>
  );
};
