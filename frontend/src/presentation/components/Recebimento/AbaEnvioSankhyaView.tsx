import React, { useState, useMemo } from 'react';
import {
  ConferenciaEntradaResumo,
  NotaEntrada,
  ObterItensConferenciaResponse,
  ItemDivergenciaResumo,
} from '../../../domain/models/ConferenciaEntrada';
import { Container } from '../Container/Container';
import { FracaoLote } from './ModalGerenciarLotes';
import { ModalDesmembrarItem } from './ModalDesmembrarItem';
import { ModalPesquisaLocalEstoque } from './ModalPesquisaLocalEstoque';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';
import { SkeletonItens } from './SkeletonItens';
import {
  formatarConferentes,
  formatarDataSimples,
} from './recebimentoHelpers';

export type FiltroStatusEnvio = 'pendentes' | 'enviados' | 'todas';

export interface GrupoConferenciaPronta {
  key: string;
  conferenciaId: string;
  notas: NotaEntrada[];
  numerosNotas: string;
  fornecedor: string;
  status: string;
  nunotas: number[];
}

export interface AbaEnvioSankhyaViewProps {
  conferenciasProntasAgrupadas: GrupoConferenciaPronta[];
  todasConferencias?: ConferenciaEntradaResumo[];
  detalhesConferencias: Record<string, ObterItensConferenciaResponse>;
  loadingDetalhes: string | null;
  conferenciasExpandidas: Record<string, boolean>;
  lotesCustomizadosPorConferencia: Record<
    string,
    Record<number, FracaoLote[]>
  >;
  origemExcelPorConferencia: Record<string, Set<number>>;
  selecionadasEnvio: Set<string>;
  onToggleSelecionar: (chave: string) => void;
  onToggleSelecionarTodas: (chavesAptas?: string[]) => void;
  onEnviarLote: () => void;
  carregarDetalhesConferencia: (
    conferenciaId: string,
    nunotas: number[]
  ) => Promise<void>;
  toggleDetalhesConferencia: (
    conferenciaId: string,
    nunotas: number[],
    cardKey?: string
  ) => void;
  onAbrirImportarExcel: (conferenciaId: string, nunotas: number[]) => void;
  onEditarLotesItem: (itemInfo: {
    nunota: number;
    sequencia: number;
    codprod: number;
    descrprod: string;
    qtdEsperada: number;
    conferenciaId: string;
  }) => void;
  onEnviarSankhya: (
    conferenciaId: string,
    numerosNotas: string,
    nunotas: number[]
  ) => void;
  onRecuperarContagem?: (conf: ConferenciaEntradaResumo) => void;
  onExecutarDesmembramento?: (
    conferenciaId: string,
    dados: {
      nunota: number;
      sequencia: number;
      lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string; codlocal?: number }>;
    }
  ) => Promise<void>;
  obterLotesItem: (
    conferenciaId: string,
    item: any,
    bipagens?: any[]
  ) => FracaoLote[];
  nivel1Ativo?: boolean;
  nivel2Ativo?: boolean;
}

export const AbaEnvioSankhyaView: React.FC<AbaEnvioSankhyaViewProps> = ({
  conferenciasProntasAgrupadas,
  todasConferencias,
  detalhesConferencias,
  loadingDetalhes,
  conferenciasExpandidas,
  lotesCustomizadosPorConferencia,
  origemExcelPorConferencia,
  selecionadasEnvio,
  onToggleSelecionar,
  onToggleSelecionarTodas,
  onEnviarLote,
  carregarDetalhesConferencia,
  toggleDetalhesConferencia,
  onAbrirImportarExcel,
  onEditarLotesItem,
  onEnviarSankhya,
  onRecuperarContagem,
  onExecutarDesmembramento,
  obterLotesItem,
  nivel1Ativo,
  nivel2Ativo,
}) => {
  const [filtroItensEnvio, setFiltroItensEnvio] = useState<
    Record<string, 'todos' | 'semlote' | 'excel' | 'coletor'>
  >({});
  const [lotesExpandidosEnvio, setLotesExpandidosEnvio] = useState<
    Record<string, boolean>
  >({});
  const [modalDesmembrarItem, setModalDesmembrarItem] = useState<{
    item: ItemDivergenciaResumo;
    grupo: any;
  } | null>(null);
  const [executandoDesmembramento, setExecutandoDesmembramento] = useState(false);
  const recebimentoService = useMemo(() => new RecebimentoApiService(), []);
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
    item: any,
    conferenciaId: string
  ) => {
    setItemParaAlterarLocal({
      nunota: item.nunota,
      sequencia: item.sequencia,
      codprod: item.codprod,
      descrprod: item.descrprod || `Produto ${item.codprod}`,
      codlocalorig: item.codlocalorig,
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
      await carregarDetalhesConferencia(
        itemParaAlterarLocal.conferenciaId,
        [itemParaAlterarLocal.nunota]
      );
      setModalLocalAberto(false);
      setItemParaAlterarLocal(null);
    } catch (err: any) {
      alert(`Erro ao alterar local no Sankhya: ${err?.message || 'Falha na comunicação'}`);
    } finally {
      setSalvandoLocal(false);
    }
  };

  const abrirModalDesmembrar = (
    item: any,
    lotesDoItem: FracaoLote[],
    diferenca: number,
    grupo: GrupoConferenciaPronta
  ) => {
    const primeiroLote = lotesDoItem[0];
    const itemDivergencia: ItemDivergenciaResumo = {
      nunota: item.nunota,
      codprod: item.codprod,
      sequencia: item.sequencia,
      descrprod: item.descrprod || `Produto ${item.codprod}`,
      referencia: item.refforn || item.referencia || '',
      codvol: item.codvol || 'UN',
      qtdEsperada: item.qtdneg ?? 0,
      qtdN1: item.qtdConferidaN1 || 0,
      qtdN2: item.qtdConferidaN2 || 0,
      qtdN3: item.qtdConferidaN3 || 0,
      diferenca: diferenca,
      lote: item.lote,
      controleOriginal: (item as any).controleOriginal || (item as any).controle || item.lote,
      validadeOriginal: (item as any).validadeOriginal || item.validade,
      fabricacaoOriginal: (item as any).fabricacaoOriginal || item.fabricacao,
      validade: item.validade || primeiroLote?.validade,
      fabricacao: item.fabricacao || primeiroLote?.fabricacao,
      lotesConferidos: lotesDoItem.map((l) => ({
        lote: l.lote,
        quantidade: l.qtd,
        validade: l.validade,
        fabricacao: l.fabricacao,
      })),
    };

    setModalDesmembrarItem({
      item: itemDivergencia,
      grupo: {
        id: grupo.conferenciaId,
        conferenciaId: grupo.conferenciaId,
        nunota: item.nunota,
        numnota: Number(grupo.numerosNotas?.split(',')?.[0]) || item.nunota,
        nunotas: grupo.nunotas,
        numerosNotas: grupo.numerosNotas,
        fornecedor: grupo.fornecedor,
        status: grupo.status,
      } as any,
    });
  };

  const handleConfirmarDesmembramentoEnvio = async (dados: {
    nunota: number;
    sequencia: number;
    lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string; codlocal?: number }>;
  }) => {
    if (!onExecutarDesmembramento || !modalDesmembrarItem) return;
    setExecutandoDesmembramento(true);
    try {
      const confId =
        modalDesmembrarItem.grupo.conferenciaId || modalDesmembrarItem.grupo.id;
      await onExecutarDesmembramento(confId, dados);
      setModalDesmembrarItem(null);
      if (modalDesmembrarItem.grupo.nunotas) {
        await carregarDetalhesConferencia(
          confId,
          modalDesmembrarItem.grupo.nunotas
        );
      }
    } finally {
      setExecutandoDesmembramento(false);
    }
  };

  const [filtroStatusEnvio, setFiltroStatusEnvio] = useState<FiltroStatusEnvio>('pendentes');
  const [buscaTextoEnvio, setBuscaTextoEnvio] = useState('');

  const toggleLotesItemEnvio = (itemKey: string) => {
    setLotesExpandidosEnvio((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  // Contagens em tempo real para os chips de status
  const contagensEnvio = useMemo(() => {
    let pendentes = 0;
    let enviados = 0;
    for (const g of conferenciasProntasAgrupadas) {
      if (g.status === 'Enviado ao Sankhya') {
        enviados++;
      } else {
        pendentes++;
      }
    }
    return {
      todas: conferenciasProntasAgrupadas.length,
      pendentes,
      enviados,
    };
  }, [conferenciasProntasAgrupadas]);

  // Lista de conferências filtradas por status e busca de texto
  const conferenciasFiltradas = useMemo(() => {
    return conferenciasProntasAgrupadas.filter((g) => {
      // 1. Filtro por status
      if (filtroStatusEnvio === 'pendentes' && g.status === 'Enviado ao Sankhya') {
        return false;
      }
      if (filtroStatusEnvio === 'enviados' && g.status !== 'Enviado ao Sankhya') {
        return false;
      }

      // 2. Filtro por busca de texto (NF ou Fornecedor)
      if (buscaTextoEnvio.trim()) {
        const termo = buscaTextoEnvio.toLowerCase();
        const matchNf = (g.numerosNotas || '').toLowerCase().includes(termo);
        const matchForn = (g.fornecedor || '').toLowerCase().includes(termo);
        return matchNf || matchForn;
      }

      return true;
    });
  }, [conferenciasProntasAgrupadas, filtroStatusEnvio, buscaTextoEnvio]);

  // Notas aptas para envio que estão visíveis sob o filtro atual
  const notasAptasVisiveis = useMemo(() => {
    return conferenciasFiltradas.filter((g) => g.status !== 'Enviado ao Sankhya');
  }, [conferenciasFiltradas]);

  const todasAptasVisiveisSelecionadas =
    notasAptasVisiveis.length > 0 &&
    notasAptasVisiveis.every((g) => selecionadasEnvio.has(g.key));

  return (
    <div className="gestao-rec-lista">
      {/* Barra de Filtros por Status e Busca por Texto */}
      <div className="gestao-rec-filtro-bar">
        <div className="gestao-rec-filtros-chips">
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatusEnvio === 'pendentes' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatusEnvio('pendentes')}
          >
            Pendentes de Envio <span className="chip-count">{contagensEnvio.pendentes}</span>
          </button>
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatusEnvio === 'enviados' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatusEnvio('enviados')}
          >
            Enviadas ao Sankhya <span className="chip-count">{contagensEnvio.enviados}</span>
          </button>
          <button
            type="button"
            className={`gestao-filtro-chip ${filtroStatusEnvio === 'todas' ? 'ativo' : ''}`}
            onClick={() => setFiltroStatusEnvio('todas')}
          >
            Todas <span className="chip-count">{contagensEnvio.todas}</span>
          </button>
        </div>

        <input
          type="text"
          className="gestao-rec-busca-input"
          placeholder="Buscar por NF ou fornecedor..."
          value={buscaTextoEnvio}
          onChange={(e) => setBuscaTextoEnvio(e.target.value)}
        />
      </div>

      {/* Barra de Ações em Lote (Bulk Send - Oculta ao filtrar 'Enviadas ao Sankhya') */}
      {filtroStatusEnvio !== 'enviados' && notasAptasVisiveis.length > 0 && (
        <div className="gestao-rec-bulk-bar">
          <div className="gestao-bulk-selecao-info">
            <input
              type="checkbox"
              id="bulk-select-all"
              className="gestao-bulk-checkbox"
              checked={todasAptasVisiveisSelecionadas}
              onChange={() => onToggleSelecionarTodas(notasAptasVisiveis.map((g) => g.key))}
            />
            <label htmlFor="bulk-select-all" style={{ fontWeight: 600, cursor: 'pointer' }}>
              Selecionar todas as aptas ({notasAptasVisiveis.length} nota{notasAptasVisiveis.length > 1 ? 's' : ''})
            </label>
            {selecionadasEnvio.size > 0 && (
              <span style={{ fontSize: '0.80rem', color: 'var(--primary, #0f766e)', fontWeight: 700 }}>
                • {selecionadasEnvio.size} selecionada{selecionadasEnvio.size > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            type="button"
            className="gestao-btn-bulk-enviar"
            disabled={selecionadasEnvio.size === 0}
            onClick={onEnviarLote}
            title={
              selecionadasEnvio.size === 0
                ? 'Selecione uma ou mais notas para envio'
                : `Enviar ${selecionadasEnvio.size} notas selecionadas ao Sankhya`
            }
          >
            <span>🚀 Enviar Selecionadas ao Sankhya ({selecionadasEnvio.size})</span>
          </button>
        </div>
      )}

      {conferenciasProntasAgrupadas.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '2.5rem' }}>📦</span>
            <h3 style={{ marginTop: '12px', color: 'var(--slate-700)' }}>
              Nenhuma conferência pronta para envio
            </h3>
            <p style={{ marginTop: '6px', fontSize: '0.9rem' }}>
              Assim que as conferências forem concluídas ou aprovadas pelo gestor, aparecerão aqui para envio direto ao Sankhya.
            </p>
          </div>
        </Container>
      ) : conferenciasFiltradas.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '2rem' }}>🔍</span>
            <h4 style={{ marginTop: '10px', color: 'var(--slate-700)' }}>
              Nenhuma conferência encontrada
            </h4>
            <p style={{ marginTop: '4px', fontSize: '0.85rem' }}>
              Nenhuma nota corresponde ao filtro{' '}
              <strong>
                {filtroStatusEnvio === 'pendentes'
                  ? '"Pendentes de Envio"'
                  : filtroStatusEnvio === 'enviados'
                  ? '"Enviadas ao Sankhya"'
                  : '"Todas"'}
              </strong>
              {buscaTextoEnvio ? ` e busca "${buscaTextoEnvio}"` : ''}.
            </p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {buscaTextoEnvio && (
                <button
                  type="button"
                  className="gestao-btn-clean-secundario"
                  onClick={() => setBuscaTextoEnvio('')}
                >
                  Limpar busca de texto
                </button>
              )}
              {filtroStatusEnvio !== 'todas' && (
                <button
                  type="button"
                  className="gestao-btn-clean-toggle"
                  onClick={() => setFiltroStatusEnvio('todas')}
                >
                  Ver todas as notas
                </button>
              )}
            </div>
          </div>
        </Container>
      ) : (
        conferenciasFiltradas.map((grupo) => {
          const jaEnviado = grupo.status === 'Enviado ao Sankhya';
          const conf = todasConferencias?.find((c) => c.id === grupo.conferenciaId);
          const detalhes = grupo.conferenciaId
            ? detalhesConferencias[grupo.conferenciaId]
            : null;
          const isCarregandoDetalhes = loadingDetalhes === grupo.conferenciaId;
          const isExpandido = Boolean(conferenciasExpandidas[grupo.key]);
          const itensDoCard = (detalhes?.itens || []).filter((i) =>
            grupo.nunotas.includes(i.nunota)
          );

          // Validação preventiva dos itens prontos para escrituração
          const totalItens = itensDoCard.length;
          const itensSemLocal = itensDoCard.filter(
            (i) => i.codlocalorig === undefined || i.codlocalorig === null
          );
          const todosLocaisOk = totalItens > 0 && itensSemLocal.length === 0;

          // Validação de múltiplos lotes para a mesma sequência faturada
          const contagemSeqPorProd: Record<number, number> = {};
          itensDoCard.forEach((i) => {
            contagemSeqPorProd[i.codprod] = (contagemSeqPorProd[i.codprod] || 0) + 1;
          });

          const itensMultiplosLotesNaoDesmembrados = itensDoCard.filter((i) => {
            const lotes = obterLotesItem(grupo.conferenciaId, i, detalhes?.bipagens);
            return lotes.length > 1 && (contagemSeqPorProd[i.codprod] || 1) < lotes.length;
          });
          const temBloqueioDesmembramento = itensMultiplosLotesNaoDesmembrados.length > 0;

          const itensComLote = itensDoCard.filter((i) => {
            const lotes = obterLotesItem(
              grupo.conferenciaId,
              i,
              detalhes?.bipagens
            );
            return lotes.length > 0 || !!i.lote;
          }).length;
          const todosLotesOk = totalItens > 0 && itensComLote === totalItens;

          return (
            <div key={grupo.key} className="gestao-rec-card">
              {/* Ribbon de Backup na Aba Envio Sankhya */}
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

              <div className="gestao-rec-card-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {!jaEnviado && (
                    <input
                      type="checkbox"
                      className="gestao-bulk-checkbox"
                      style={{ marginTop: '4px' }}
                      checked={selecionadasEnvio.has(grupo.key)}
                      onChange={() => onToggleSelecionar(grupo.key)}
                      title="Selecionar esta nota para envio em lote"
                    />
                  )}
                  <div className="gestao-rec-card-info">
                    <div className="gestao-rec-card-notas" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>📄 NF(s): {grupo.numerosNotas}</span>
                      {jaEnviado && conf?.enviadoSankhyaEm && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                          title="Data/hora e responsável pela integração no Sankhya"
                        >
                          <span>✓</span>
                          <span>
                            Integrado em {new Date(conf.enviadoSankhyaEm).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(conf.enviadoSankhyaEm).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {conf.aprovadoPor ? ` por ${conf.aprovadoPor}` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="gestao-rec-card-fornecedor">
                      Fornecedor: {grupo.fornecedor}
                    </span>
                    <span className="gestao-rec-card-meta">
                      Total de Itens Faturados:{' '}
                      {grupo.notas.reduce((acc, n) => acc + (n.qtdItens || 0), 0)}
                    </span>
                  </div>
                </div>

                <div className="gestao-rec-card-badges">
                  {/* 1. Quantidades Físicas */}
                  <span
                    className={`gestao-micro-chip-status ${
                      jaEnviado || grupo.status === 'Conferido' ? 'ok' : 'alerta'
                    }`}
                    title={
                      jaEnviado
                        ? 'Conferência sincronizada com sucesso no Sankhya'
                        : grupo.status === 'Conferido'
                        ? 'Quantidades físicas 100% conferidas e correspondentes à NF'
                        : 'Conferência ainda pendente ou aguardando aprovação gerencial'
                    }
                  >
                    <span>{jaEnviado || grupo.status === 'Conferido' ? '✓' : '⚠️'}</span>
                    <span>
                      {jaEnviado
                        ? 'Quantidades Físicas OK'
                        : grupo.status === 'Conferido'
                        ? 'Quantidades Físicas 100% OK'
                        : 'Aguardando Aprovação'}
                    </span>
                  </span>

                  {/* 2. Lotes e Validades */}
                  <span
                    className={`gestao-micro-chip-status ${
                      jaEnviado || (detalhes && todosLotesOk)
                        ? 'ok'
                        : detalhes && !todosLotesOk
                        ? 'alerta'
                        : 'ok'
                    }`}
                    title={
                      jaEnviado
                        ? 'Lotes e validades já integrados no ERP'
                        : detalhes
                        ? todosLotesOk
                          ? 'Todos os itens conferidos possuem lote vinculado para o ERP'
                          : `${totalItens - itensComLote} item(ns) ainda sem lote configurado`
                        : 'Lotes e validades configurados'
                    }
                  >
                    <span>{jaEnviado || !detalhes || todosLotesOk ? '✓' : '⚠️'}</span>
                    <span>
                      {jaEnviado
                        ? 'Lotes & Validades Integrados'
                        : detalhes
                        ? todosLotesOk
                          ? 'Lotes & Validades OK'
                          : `${totalItens - itensComLote} sem Lote`
                        : 'Lotes & Validades OK'}
                    </span>
                  </span>

                  {/* 3. Locais de Estoque no ERP */}
                  <span
                    className={`gestao-micro-chip-status ${
                      jaEnviado || (detalhes && todosLocaisOk)
                        ? 'ok'
                        : detalhes && !todosLocaisOk
                        ? 'perigo'
                        : 'ok'
                    }`}
                    title={
                      jaEnviado
                        ? 'Locais de origem no ERP gravados com sucesso'
                        : detalhes
                        ? todosLocaisOk
                          ? 'Todos os itens possuem Local de Origem definido no ERP'
                          : `${itensSemLocal.length} item(ns) sem Local de Origem (CODLOCALORIG) na nota`
                        : 'Locais de Estoque no ERP OK'
                    }
                  >
                    <span>{jaEnviado || !detalhes || todosLocaisOk ? '✓' : '⚠️'}</span>
                    <span>
                      {jaEnviado
                        ? 'Locais no ERP OK'
                        : detalhes
                        ? todosLocaisOk
                          ? 'Locais no ERP OK'
                          : `${itensSemLocal.length} sem Local no ERP`
                        : 'Locais no ERP OK'}
                    </span>
                  </span>

                  {/* 4. Alerta de Desmembramento (quando aplicável) */}
                  {!jaEnviado && temBloqueioDesmembramento && (
                    <span
                      className="gestao-micro-chip-status perigo"
                      title="Existem múltiplos lotes para a mesma sequência de produto sem desmembramento no Sankhya"
                    >
                      <span>⚠️</span>
                      <span>
                        {itensMultiplosLotesNaoDesmembrados.length} produto(s) requerem desmembramento Sankhya
                      </span>
                    </span>
                  )}

                  <span
                    className={`badge-status-rec ${
                      jaEnviado
                        ? 'enviado'
                        : grupo.status === 'Aguardando Aprovação'
                        ? 'aguardando'
                        : 'conferido'
                    }`}
                  >
                    {grupo.status}
                  </span>
                </div>
              </div>

              {/* Barra de Ações Minimalista e Alinhada */}
              {grupo.conferenciaId && (
                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`gestao-btn-clean-toggle ${isExpandido ? 'ativo' : ''}`}
                        onClick={async () => {
                          if (!detalhes && !isCarregandoDetalhes) {
                            await carregarDetalhesConferencia(
                              grupo.conferenciaId,
                              grupo.nunotas
                            );
                          }
                          toggleDetalhesConferencia(
                            grupo.conferenciaId,
                            grupo.nunotas,
                            grupo.key
                          );
                        }}
                      >
                        <span>
                          {detalhes && isExpandido
                            ? '▲ Ocultar Itens e Lotes'
                            : `Ver Itens e Lotes (${
                                totalItens ||
                                grupo.notas.reduce((acc, n) => acc + (n.qtdItens || 0), 0)
                              })`}
                        </span>
                        <span style={{ fontSize: '0.70rem' }}>{isExpandido ? '▲' : '▼'}</span>
                      </button>

                      {!jaEnviado && (
                        <button
                          type="button"
                          className="gestao-btn-clean-secundario"
                          onClick={async () => {
                            if (!detalhes) {
                              await carregarDetalhesConferencia(
                                grupo.conferenciaId,
                                grupo.nunotas
                              );
                            }
                            onAbrirImportarExcel(grupo.conferenciaId, grupo.nunotas);
                          }}
                          title="Importar lotes e validades a partir de planilha Excel"
                        >
                          <span>📥 Importar Excel</span>
                        </button>
                      )}
                    </div>

                    <div>
                      {!jaEnviado ? (
                        <button
                          type="button"
                          className="gestao-btn-acao gestao-btn-enviar-sankhya"
                          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                          onClick={() =>
                            onEnviarSankhya(
                              grupo.conferenciaId,
                              grupo.numerosNotas,
                              grupo.nunotas
                            )
                          }
                        >
                          <span>🚀 Aprovar & Enviar ao Sankhya</span>
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.80rem',
                            color: '#6d28d9',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>✓</span> <span>Integrado com sucesso ao Sankhya</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {isCarregandoDetalhes ? (
                    <SkeletonItens
                      linhas={4}
                      mensagem="Carregando dados dos lotes e itens para envio..."
                    />
                  ) : detalhes && isExpandido ? (
                    (() => {
                      const filtroItens = filtroItensEnvio[grupo.key] || 'todos';
                      const itensSemLote = itensDoCard.filter((item) => {
                        const lotes = obterLotesItem(
                          grupo.conferenciaId,
                          item,
                          detalhes.bipagens
                        );
                        return lotes.length === 0 && !item.lote;
                      });
                      const itensExcel = itensDoCard.filter((item) =>
                        origemExcelPorConferencia[grupo.conferenciaId]?.has(item.codprod)
                      );
                      const itensColetor = itensDoCard.filter(
                        (item) => !origemExcelPorConferencia[grupo.conferenciaId]?.has(item.codprod)
                      );
                      const itensParaExibir =
                        filtroItens === 'semlote'
                          ? itensSemLote
                          : filtroItens === 'excel'
                          ? itensExcel
                          : filtroItens === 'coletor'
                          ? itensColetor
                          : itensDoCard;

                      const houveN1Envio = itensDoCard.some((i) => (i.qtdConferidaN1 || 0) > 0);
                      const houveN2Envio = itensDoCard.some((i) => (i.qtdConferidaN2 || 0) > 0);
                      const exibirN1Envio = nivel1Ativo !== false || houveN1Envio;
                      const exibirN2Envio = nivel2Ativo !== false || houveN2Envio;
                      const temN3Envio = itensDoCard.some((i) => (i.qtdConferidaN3 || 0) > 0);

                      let totalColunasEnvio = 9;
                      if (exibirN1Envio) totalColunasEnvio++;
                      if (exibirN2Envio) totalColunasEnvio++;
                      if (temN3Envio) totalColunasEnvio++;

                      return (
                        <>
                          {/* Barra de Mini-Filtros Rápidos dos Itens para Envio */}
                          <div className="gestao-itens-mini-filtro-bar">
                            <div className="gestao-itens-mini-chips">
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'todos' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'todos',
                                  }))
                                }
                              >
                                Todos ({itensDoCard.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'semlote' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'semlote',
                                  }))
                                }
                              >
                                ⚠️ Sem Lote ({itensSemLote.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'excel' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'excel',
                                  }))
                                }
                              >
                                📊 Excel ({itensExcel.length})
                              </button>
                              <button
                                type="button"
                                className={`gestao-mini-chip ${
                                  filtroItens === 'coletor' ? 'ativo' : ''
                                }`}
                                onClick={() =>
                                  setFiltroItensEnvio((prev) => ({
                                    ...prev,
                                    [grupo.key]: 'coletor',
                                  }))
                                }
                              >
                                📱 Coletor ({itensColetor.length})
                              </button>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                              Exibindo <strong>{itensParaExibir.length}</strong> de{' '}
                              {itensDoCard.length} itens
                            </span>
                          </div>
                      {/* Tabela Desktop */}
                      <div className="gestao-rec-tabela-desktop">
                        <table className="gestao-rec-tabela">
                          <thead>
                                <tr>
                                  <th>Produto</th>
                                  <th>Vol.</th>
                                  <th>Nota</th>
                                  {exibirN1Envio && <th>N1</th>}
                                  {exibirN2Envio && <th>N2</th>}
                                  {temN3Envio && <th>N3</th>}
                                  <th>Diferença</th>
                                  <th>Local</th>
                                  <th>Lote</th>
                                  <th>Validade</th>
                                  <th>Fabricação</th>
                                  <th>Conferentes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itensParaExibir.map((item) => {
                                  const itemKey = `${grupo.conferenciaId}-${item.nunota}-${item.codprod}-${item.sequencia}`;
                                  const temN3 = temN3Envio;

                              const qtdNivel =
                                (item.qtdConferidaN3 || 0) > 0
                                  ? item.qtdConferidaN3 || 0
                                  : (item.qtdConferidaN2 || 0) > 0
                                  ? item.qtdConferidaN2 || 0
                                  : item.qtdConferidaN1 || 0;
                              const diferenca =
                                item.diferenca !== undefined
                                  ? item.diferenca
                                  : qtdNivel - (item.qtdneg || 0);
                              const classeDif =
                                diferenca < 0
                                  ? 'falta'
                                  : diferenca > 0
                                  ? 'sobra'
                                  : 'ok';

                              const lotesDoItem = obterLotesItem(
                                grupo.conferenciaId,
                                item,
                                detalhes.bipagens
                              );
                              const temMultiplosLotes = lotesDoItem.length > 1;
                              const isLotesAberto = Boolean(lotesExpandidosEnvio[itemKey]);
                              const isVeioExcel = origemExcelPorConferencia[
                                grupo.conferenciaId
                              ]?.has(item.codprod);

                              return (
                                <React.Fragment key={`sankhya-frag-${itemKey}`}>
                                  <tr
                                    key={`sankhya-${itemKey}`}
                                  >
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
                                        {item.descrprod ||
                                          `Produto ${item.codprod}`}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '0.72rem',
                                          color: 'var(--slate-500)',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Cód: {item.codprod}
                                        {item.refforn
                                          ? ` • Ref: ${item.refforn}`
                                          : item.referencia
                                          ? ` • Ref: ${item.referencia}`
                                          : ''}
                                        {item.codbarra
                                          ? ` • EAN: ${item.codbarra}`
                                          : ''}
                                      </div>
                                    </td>
                                    <td>{item.codvol || 'UN'}</td>
                                    <td>
                                      <strong>{item.qtdneg ?? '—'}</strong>
                                    </td>
                                    {exibirN1Envio && <td>{item.qtdConferidaN1 || 0}</td>}
                                    {exibirN2Envio && <td>{item.qtdConferidaN2 || 0}</td>}
                                    {temN3 && <td>{item.qtdConferidaN3 || 0}</td>}
                                    <td>
                                      <span
                                        className={`pill-contagem-status ${classeDif}`}
                                      >
                                        {diferenca === 0
                                          ? '✓ OK'
                                          : diferenca < 0
                                          ? `⚠️ ${diferenca}`
                                          : `+${diferenca}`}
                                      </span>
                                    </td>
                                    <td>
                                      {!jaEnviado ? (
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirAlterarLocal(item, grupo.conferenciaId)}
                                          title="Clique para alterar o Local de Estoque (CODLOCALORIG) no Sankhya antes do envio"
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            padding: '3px 8px',
                                            borderRadius: '5px',
                                            border: item.codlocalorig !== undefined && item.codlocalorig !== null
                                              ? '1px solid var(--slate-300)'
                                              : '1px solid #fca5a5',
                                            background: item.codlocalorig !== undefined && item.codlocalorig !== null
                                              ? '#f8fafc'
                                              : '#fef2f2',
                                            color: item.codlocalorig !== undefined && item.codlocalorig !== null
                                              ? 'var(--slate-800)'
                                              : '#b91c1c',
                                            transition: 'all 0.15s ease',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary-500, #3b82f6)';
                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = item.codlocalorig !== undefined && item.codlocalorig !== null
                                              ? 'var(--slate-300)'
                                              : '#fca5a5';
                                            e.currentTarget.style.backgroundColor = item.codlocalorig !== undefined && item.codlocalorig !== null
                                              ? '#f8fafc'
                                              : '#fef2f2';
                                          }}
                                        >
                                          <span>{item.codlocalorig !== undefined && item.codlocalorig !== null ? `📍 ${item.codlocalorig}` : '⚠️ Sem Local'}</span>
                                          <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>✏️</span>
                                        </button>
                                      ) : item.codlocalorig !== undefined && item.codlocalorig !== null ? (
                                        <span
                                          style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'var(--slate-100)',
                                            border: '1px solid var(--slate-200)',
                                            color: 'var(--slate-800)',
                                          }}
                                          title={`Local de Estoque de Origem: ${item.codlocalorig}`}
                                        >
                                          📍 {item.codlocalorig}
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            color: '#b91c1c',
                                          }}
                                          title="Item sem Local de Origem no ERP."
                                        >
                                          ⚠️ Sem Local
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {temMultiplosLotes ? (
                                        <div
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                          }}
                                        >
                                          <span
                                            title={
                                              isVeioExcel
                                                ? 'Importado via Excel'
                                                : 'Conferido pelo coletor'
                                            }
                                          >
                                            {isVeioExcel ? '📊' : '📱'}
                                          </span>
                                          <button
                                            type="button"
                                            className={`chip-dropdown-lote ${isLotesAberto ? 'ativo' : ''}`}
                                            onClick={() => toggleLotesItemEnvio(itemKey)}
                                            title={isLotesAberto ? 'Recolher gaveta de lotes' : 'Expandir lotes linha a linha'}
                                          >
                                            <span>✂️ {lotesDoItem.length} Lotes</span>
                                            <span style={{ fontSize: '0.65rem' }}>{isLotesAberto ? '▲' : '▼'}</span>
                                          </button>
                                          {onExecutarDesmembramento && !jaEnviado && (
                                            <button
                                              type="button"
                                              className="btn-desmembrar-item"
                                              disabled={executandoDesmembramento}
                                              onClick={() =>
                                                abrirModalDesmembrar(
                                                  item,
                                                  lotesDoItem,
                                                  diferenca,
                                                  grupo
                                                )
                                              }
                                              title="Desmembrar múltiplos lotes no Sankhya"
                                            >
                                              ✂️ Desmembrar
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            className="gestao-rec-btn-refresh"
                                            disabled={jaEnviado}
                                            style={{
                                              padding: '1px 5px',
                                              fontSize: '0.70rem',
                                              lineHeight: 1,
                                              ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                            }}
                                            title={jaEnviado ? 'Conferência já enviada ao Sankhya' : 'Gerenciar / Dividir lotes'}
                                            onClick={() =>
                                              onEditarLotesItem({
                                                nunota: item.nunota,
                                                sequencia: item.sequencia,
                                                codprod: item.codprod,
                                                descrprod:
                                                  item.descrprod ||
                                                  `Produto ${item.codprod}`,
                                                qtdEsperada: item.qtdneg || 0,
                                                conferenciaId:
                                                  grupo.conferenciaId,
                                              })
                                            }
                                          >
                                            ✂️
                                          </button>
                                        </div>
                                      ) : lotesDoItem.length === 1 ? (
                                        <div
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                          }}
                                        >
                                          <span
                                            title={
                                              isVeioExcel
                                                ? 'Importado via Excel'
                                                : 'Conferido pelo coletor'
                                            }
                                          >
                                            {isVeioExcel ? '📊' : '📱'}
                                          </span>
                                          <strong
                                            style={{ color: 'var(--slate-800)', fontFamily: 'JetBrains Mono, monospace' }}
                                          >
                                            {lotesDoItem[0].lote}
                                          </strong>
                                          <button
                                            type="button"
                                            className="gestao-rec-btn-refresh"
                                            disabled={jaEnviado}
                                            style={{
                                              padding: '1px 5px',
                                              fontSize: '0.70rem',
                                              lineHeight: 1,
                                              ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                            }}
                                            title={jaEnviado ? 'Conferência já enviada ao Sankhya' : 'Dividir lote ou alterar'}
                                            onClick={() =>
                                              onEditarLotesItem({
                                                nunota: item.nunota,
                                                sequencia: item.sequencia,
                                                codprod: item.codprod,
                                                descrprod:
                                                  item.descrprod ||
                                                  `Produto ${item.codprod}`,
                                                qtdEsperada: item.qtdneg || 0,
                                                conferenciaId:
                                                  grupo.conferenciaId,
                                              })
                                            }
                                          >
                                            ✂️
                                          </button>
                                        </div>
                                      ) : item.lote ? (
                                        <div
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                          }}
                                        >
                                          <span
                                            title={
                                              isVeioExcel
                                                ? 'Importado via Excel'
                                                : 'Conferido pelo coletor'
                                            }
                                          >
                                            {isVeioExcel ? '📊' : '📱'}
                                          </span>
                                          <strong
                                            style={{ color: 'var(--slate-800)', fontFamily: 'JetBrains Mono, monospace' }}
                                          >
                                            {item.lote}
                                          </strong>
                                          <button
                                            type="button"
                                            className="gestao-rec-btn-refresh"
                                            disabled={jaEnviado}
                                            style={{
                                              padding: '1px 5px',
                                              fontSize: '0.70rem',
                                              lineHeight: 1,
                                              ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                            }}
                                            title={jaEnviado ? 'Conferência já enviada ao Sankhya' : 'Dividir lote ou alterar'}
                                            onClick={() =>
                                              onEditarLotesItem({
                                                nunota: item.nunota,
                                                sequencia: item.sequencia,
                                                codprod: item.codprod,
                                                descrprod:
                                                  item.descrprod ||
                                                  `Produto ${item.codprod}`,
                                                qtdEsperada: item.qtdneg || 0,
                                                conferenciaId:
                                                  grupo.conferenciaId,
                                              })
                                            }
                                          >
                                            ✂️
                                          </button>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                          }}
                                        >
                                          <span
                                            style={{
                                              color: 'var(--slate-400)',
                                              fontSize: '0.8rem',
                                            }}
                                          >
                                            Sem lote
                                          </span>
                                          <button
                                            type="button"
                                            className="gestao-rec-btn-refresh"
                                            disabled={jaEnviado}
                                            style={{
                                              padding: '1px 5px',
                                              fontSize: '0.70rem',
                                              lineHeight: 1,
                                              ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                            }}
                                            title={jaEnviado ? 'Conferência já enviada ao Sankhya' : 'Adicionar lote / Dividir item'}
                                            onClick={() =>
                                              onEditarLotesItem({
                                                nunota: item.nunota,
                                                sequencia: item.sequencia,
                                                codprod: item.codprod,
                                                descrprod:
                                                  item.descrprod ||
                                                  `Produto ${item.codprod}`,
                                                qtdEsperada: item.qtdneg || 0,
                                                conferenciaId:
                                                  grupo.conferenciaId,
                                              })
                                            }
                                          >
                                            + Lote
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      {temMultiplosLotes ? (
                                        <span
                                          style={{
                                            fontSize: '0.74rem',
                                            color: 'var(--primary, #0f766e)',
                                            cursor: 'pointer',
                                            fontStyle: 'italic',
                                            fontWeight: 600,
                                          }}
                                          onClick={() => toggleLotesItemEnvio(itemKey)}
                                          title="Clique para ver os lotes e validades linha a linha"
                                        >
                                          {isLotesAberto ? 'Linhas abaixo ▲' : 'Ver datas ▼'}
                                        </span>
                                      ) : lotesDoItem.length === 1 ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(
                                            lotesDoItem[0].validade
                                          )}
                                        </span>
                                      ) : item.validade ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(item.validade)}
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {temMultiplosLotes ? (
                                        <span
                                          style={{
                                            fontSize: '0.74rem',
                                            color: 'var(--primary, #0f766e)',
                                            cursor: 'pointer',
                                            fontStyle: 'italic',
                                            fontWeight: 600,
                                          }}
                                          onClick={() => toggleLotesItemEnvio(itemKey)}
                                          title="Clique para ver os lotes e fabricações linha a linha"
                                        >
                                          {isLotesAberto ? 'Linhas abaixo ▲' : 'Ver datas ▼'}
                                        </span>
                                      ) : lotesDoItem.length === 1 ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(
                                            lotesDoItem[0].fabricacao
                                          )}
                                        </span>
                                      ) : item.fabricacao ? (
                                        <span style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                          {formatarDataSimples(item.fabricacao)}
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>
                                          —
                                        </span>
                                      )}
                                    </td>
                                    <td
                                      style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--slate-600)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {formatarConferentes(item)}
                                    </td>
                                  </tr>

                                  {/* Sub-Linha Gaveta: Frações de Lote para Envio ao Sankhya (Modelo 1) */}
                                  {temMultiplosLotes && isLotesAberto && (
                                    <tr key={`sankhya-lotes-${itemKey}`} className="subrow-lotes-drawer">
                                      <td colSpan={totalColunasEnvio}>
                                        <div className="drawer-lotes-wrapper">
                                          <div className="drawer-lotes-header">
                                            <span>📦 Frações de Lote Desmembradas para o Sankhya ({lotesDoItem.length} lotes):</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <span style={{ color: 'var(--slate-500)', fontWeight: 500, textTransform: 'none' }}>
                                                Total: <strong>{lotesDoItem.reduce((acc, l) => acc + (l.qtd || 0), 0)} {item.codvol || 'UN'}</strong>
                                              </span>
                                              <button
                                                type="button"
                                                className="gestao-btn-clean-secundario"
                                                disabled={jaEnviado}
                                                style={{
                                                  padding: '2px 8px',
                                                  fontSize: '0.72rem',
                                                  ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                                }}
                                                title={jaEnviado ? 'Conferência já enviada ao Sankhya' : undefined}
                                                onClick={() =>
                                                  onEditarLotesItem({
                                                    nunota: item.nunota,
                                                    sequencia: item.sequencia,
                                                    codprod: item.codprod,
                                                    descrprod:
                                                      item.descrprod ||
                                                      `Produto ${item.codprod}`,
                                                    qtdEsperada: item.qtdneg || 0,
                                                    conferenciaId:
                                                      grupo.conferenciaId,
                                                  })
                                                }
                                              >
                                                ✂️ Gerenciar Frações
                                              </button>
                                            </div>
                                          </div>
                                          <table className="mini-tabela-lotes">
                                            <thead>
                                              <tr>
                                                <th>Lote</th>
                                                <th style={{ textAlign: 'center' }}>Quantidade</th>
                                                <th>Data de Validade</th>
                                                <th>Data de Fabricação</th>
                                                <th>Origem</th>
                                                <th style={{ textAlign: 'right' }}>Ação</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {lotesDoItem.map((fracao, fIdx) => (
                                                <tr key={`fe-${itemKey}-${fracao.lote}-${fIdx}`}>
                                                  <td>
                                                    <span className="gestao-lote-pill" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                                      🏷️ {fracao.lote}
                                                    </span>
                                                  </td>
                                                  <td style={{ textAlign: 'center' }}>
                                                    <strong>{fracao.qtd}</strong> {item.codvol || 'UN'}
                                                  </td>
                                                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--slate-800)' }}>
                                                    {formatarDataSimples(fracao.validade)}
                                                  </td>
                                                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-600)' }}>
                                                    {formatarDataSimples(fracao.fabricacao)}
                                                  </td>
                                                  <td>
                                                    <span className="gestao-mini-chip" style={{ fontSize: '0.70rem', padding: '1px 6px' }}>
                                                      {isVeioExcel ? '📊 Excel' : '📱 Coletor'}
                                                    </span>
                                                  </td>
                                                  <td style={{ textAlign: 'right' }}>
                                                    <button
                                                      type="button"
                                                      className="gestao-btn-clean-secundario"
                                                      disabled={jaEnviado}
                                                      style={{
                                                        padding: '2px 6px',
                                                        fontSize: '0.70rem',
                                                        ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                                      }}
                                                      onClick={() =>
                                                        onEditarLotesItem({
                                                          nunota: item.nunota,
                                                          sequencia: item.sequencia,
                                                          codprod: item.codprod,
                                                          descrprod:
                                                            item.descrprod ||
                                                            `Produto ${item.codprod}`,
                                                          qtdEsperada: item.qtdneg || 0,
                                                          conferenciaId:
                                                            grupo.conferenciaId,
                                                        })
                                                      }
                                                      title={jaEnviado ? 'Conferência já enviada ao Sankhya' : 'Editar ou redistribuir este lote'}
                                                    >
                                                      Editar
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
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Cards Mobile Padronizados (<= 1024px) */}
                      <div
                        className="gestao-rec-itens-mobile"
                        style={{ marginTop: '8px' }}
                      >
                        {itensParaExibir.map((item) => {
                          const qtdNivel =
                            (item.qtdConferidaN3 || 0) > 0
                              ? item.qtdConferidaN3 || 0
                              : (item.qtdConferidaN2 || 0) > 0
                              ? item.qtdConferidaN2 || 0
                              : item.qtdConferidaN1 || 0;
                          const diferenca =
                            item.diferenca !== undefined
                              ? item.diferenca
                              : qtdNivel - (item.qtdneg || 0);
                          const classeDif =
                            diferenca < 0
                              ? 'falta'
                              : diferenca > 0
                              ? 'sobra'
                              : 'ok';

                          const lotesDoItem = obterLotesItem(
                            grupo.conferenciaId,
                            item,
                            detalhes.bipagens
                          );
                          const temMultiplosLotes = lotesDoItem.length > 1;
                          const itemKey = `${grupo.conferenciaId}-${item.nunota}-${item.codprod}-${item.sequencia}`;
                          const isLotesAberto = Boolean(lotesExpandidosEnvio[itemKey]);
                          const isVeioExcel = origemExcelPorConferencia[
                            grupo.conferenciaId
                          ]?.has(item.codprod);

                          return (
                            <div
                              key={`sankhya-mob-${itemKey}`}
                              className="gestao-item-card-mobile"
                            >
                              <div className="gestao-item-mobile-header">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className="gestao-item-mobile-descr">
                                    {item.descrprod || `Produto ${item.codprod}`}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--slate-500)',
                                    }}
                                  >
                                    Cód: {item.codprod}
                                    {item.refforn
                                      ? ` • Ref: ${item.refforn}`
                                      : item.referencia
                                      ? ` • Ref: ${item.referencia}`
                                      : ''}{' '}
                                    • Vol: {item.codvol || 'UN'}
                                    {item.codbarra
                                      ? ` • EAN: ${item.codbarra}`
                                      : ''}
                                  </div>
                                </div>
                                <span
                                  className={`pill-contagem-status ${classeDif}`}
                                >
                                  {diferenca === 0
                                    ? '✓ OK'
                                    : diferenca < 0
                                    ? `⚠️ ${diferenca}`
                                    : `+${diferenca}`}
                                </span>
                              </div>

                              <div className="gestao-item-mobile-grid">
                                <div>
                                  Nota: <strong>{item.qtdneg ?? '—'}</strong>
                                </div>
                                {exibirN1Envio && (
                                  <div>
                                    N1: <strong>{item.qtdConferidaN1 || 0}</strong>
                                  </div>
                                )}
                                {exibirN2Envio && (
                                  <div>
                                    N2: <strong>{item.qtdConferidaN2 || 0}</strong>
                                  </div>
                                )}
                                {(item.qtdConferidaN3 || 0) > 0 && (
                                  <div>
                                    N3:{' '}
                                    <strong>{item.qtdConferidaN3 || 0}</strong>
                                  </div>
                                )}
                                <div>
                                  Local:{' '}
                                  {!jaEnviado ? (
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirAlterarLocal(item, grupo.conferenciaId)}
                                      style={{
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: item.codlocalorig !== undefined && item.codlocalorig !== null
                                          ? '1px solid var(--slate-300)'
                                          : '1px solid #fca5a5',
                                        background: item.codlocalorig !== undefined && item.codlocalorig !== null
                                          ? '#f8fafc'
                                          : '#fef2f2',
                                        color: item.codlocalorig !== undefined && item.codlocalorig !== null
                                          ? 'var(--slate-800)'
                                          : '#b91c1c',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <span>{item.codlocalorig !== undefined && item.codlocalorig !== null ? `📍 ${item.codlocalorig}` : '⚠️ Sem Local'}</span>
                                      <span style={{ fontSize: '0.7rem' }}>✏️</span>
                                    </button>
                                  ) : item.codlocalorig !== undefined && item.codlocalorig !== null ? (
                                    <strong style={{ color: 'var(--slate-800)' }}>📍 {item.codlocalorig}</strong>
                                  ) : (
                                    <strong style={{ color: '#b91c1c' }}>⚠️ Sem Local</strong>
                                  )}
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
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                        <span>{isVeioExcel ? '📊' : '📱'}</span>
                                        <button
                                          type="button"
                                          className={`chip-dropdown-lote ${isLotesAberto ? 'ativo' : ''}`}
                                          onClick={() => toggleLotesItemEnvio(itemKey)}
                                        >
                                          <span>✂️ {lotesDoItem.length} Lotes no Sankhya</span>
                                          <span style={{ fontSize: '0.65rem' }}>{isLotesAberto ? '▲ recolher' : '▼ expandir'}</span>
                                        </button>
                                        {onExecutarDesmembramento && !jaEnviado && (
                                          <button
                                            type="button"
                                            className="btn-desmembrar-item"
                                            disabled={executandoDesmembramento}
                                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                            onClick={() =>
                                              abrirModalDesmembrar(
                                                item,
                                                lotesDoItem,
                                                diferenca,
                                                grupo
                                              )
                                            }
                                            title="Desmembrar múltiplos lotes no Sankhya"
                                          >
                                            ✂️ Desmembrar
                                          </button>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        className="gestao-btn-clean-secundario"
                                        disabled={jaEnviado}
                                        style={{
                                          padding: '2px 6px',
                                          fontSize: '0.70rem',
                                          ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                        }}
                                        title={jaEnviado ? 'Conferência já enviada ao Sankhya' : undefined}
                                        onClick={() =>
                                          onEditarLotesItem({
                                            nunota: item.nunota,
                                            sequencia: item.sequencia,
                                            codprod: item.codprod,
                                            descrprod:
                                              item.descrprod ||
                                              `Produto ${item.codprod}`,
                                            qtdEsperada: item.qtdneg || 0,
                                            conferenciaId: grupo.conferenciaId,
                                          })
                                        }
                                      >
                                        ✂️ Gerenciar
                                      </button>
                                    </div>

                                    {isLotesAberto && (
                                      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {lotesDoItem.map((fracao, fIdx) => (
                                          <div
                                            key={`mob-fe-${itemKey}-${fracao.lote}-${fIdx}`}
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
                                                {fracao.qtd} {item.codvol || 'UN'}
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)', marginTop: '2px', fontFamily: 'JetBrains Mono, monospace' }}>
                                              <span>Val: {formatarDataSimples(fracao.validade)}</span>
                                              <span>Fab: {formatarDataSimples(fracao.fabricacao)}</span>
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
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                      <span>{isVeioExcel ? '📊' : '📱'}</span>
                                      {lotesDoItem.length === 1 ? (
                                        <span>
                                          Lote: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{lotesDoItem[0].lote}</strong> ({lotesDoItem[0].qtd} un)
                                          {lotesDoItem[0].validade
                                            ? ` • Val: ${formatarDataSimples(
                                                lotesDoItem[0].validade
                                              )}`
                                            : ''}
                                          {lotesDoItem[0].fabricacao
                                            ? ` • Fab: ${formatarDataSimples(
                                                lotesDoItem[0].fabricacao
                                              )}`
                                            : ''}
                                        </span>
                                      ) : item.lote ? (
                                        <span>
                                          Lote: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.lote}</strong>
                                          {item.validade
                                            ? ` • Val: ${formatarDataSimples(
                                                item.validade
                                              )}`
                                            : ''}
                                          {item.fabricacao
                                            ? ` • Fab: ${formatarDataSimples(
                                                item.fabricacao
                                              )}`
                                            : ''}
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--slate-400)' }}>
                                          Sem lote
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="gestao-btn-clean-secundario"
                                      disabled={jaEnviado}
                                      style={{
                                        padding: '2px 6px',
                                        fontSize: '0.70rem',
                                        ...(jaEnviado ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                                      }}
                                      title={jaEnviado ? 'Conferência já enviada ao Sankhya' : undefined}
                                      onClick={() =>
                                        onEditarLotesItem({
                                          nunota: item.nunota,
                                          sequencia: item.sequencia,
                                          codprod: item.codprod,
                                          descrprod:
                                            item.descrprod ||
                                            `Produto ${item.codprod}`,
                                          qtdEsperada: item.qtdneg || 0,
                                          conferenciaId: grupo.conferenciaId,
                                        })
                                      }
                                    >
                                      {lotesDoItem.length === 0 && !item.lote ? '+ Lote' : '✂️ Lote'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {(item.conferenteN1 ||
                                item.conferenteN2 ||
                                item.conferenteN3) && (
                                <div
                                  style={{
                                    fontSize: '0.70rem',
                                    color: 'var(--slate-500)',
                                    marginTop: '-2px',
                                  }}
                                >
                                  {formatarConferentes(item)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : null}
            </div>
              )}

              {/* Ação secundária de envio no rodapé se a lista de itens estiver aberta */}
              {!jaEnviado && isExpandido && (
                <div className="gestao-rec-card-acoes" style={{ justifyContent: 'flex-end', paddingTop: '8px' }}>
                  <button
                    type="button"
                    className="gestao-btn-acao gestao-btn-enviar-sankhya"
                    style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                    onClick={() =>
                      onEnviarSankhya(
                        grupo.conferenciaId,
                        grupo.numerosNotas,
                        grupo.nunotas
                      )
                    }
                  >
                    <span>🚀 Aprovar & Enviar ao Sankhya</span>
                  </button>
                </div>
              )}
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
          onConfirmar={handleConfirmarDesmembramentoEnvio}
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
    </div>
  );
};
