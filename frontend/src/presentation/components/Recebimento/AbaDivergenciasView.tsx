import React, { useState } from 'react';
import {
  ConferenciaDivergenciaGrupo,
  DecisaoFiscalItem,
} from '../../../domain/models/ConferenciaEntrada';
import { Container } from '../Container/Container';
import {
  getStatusBadgeClass,
  formatarConferentes,
  formatarDataSimples,
} from './recebimentoHelpers';

export interface AbaDivergenciasViewProps {
  divergencias: ConferenciaDivergenciaGrupo[];
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
  onReconferirN3: (grupo: ConferenciaDivergenciaGrupo) => void;
  onReiniciar: (grupo: ConferenciaDivergenciaGrupo) => void;
  onSincronizarDesmembramento?: (
    conferenciaId: string,
    nunota: number,
    codprod?: number,
    sequencia?: number
  ) => void;
  processandoDesmembramento?: string | null;
}

export const AbaDivergenciasView: React.FC<AbaDivergenciasViewProps> = ({
  divergencias,
  itensDivergenciaExpandidos,
  filtroItensDivergencia,
  toggleItensDivergencia,
  setFiltroItensDivergencia,
  onResolverDivergencia,
  onReconferirN3,
  onReiniciar,
  onSincronizarDesmembramento,
  processandoDesmembramento,
}) => {
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

  const handleSetDecisao = (
    grupoId: string,
    itemKey: string,
    itemInfo: { nunota: number; codprod: number; sequencia: number },
    campo: 'lote' | 'validade' | 'fabricacao',
    opcao: 'ERP' | 'BIP'
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

  const handleAplicarDecisaoEmMassa = (
    grupoId: string,
    campo: 'lote' | 'validade' | 'fabricacao',
    opcao: 'ERP' | 'BIP',
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

          const houveN1 = grupo.totalN1 > 0 || ((grupo.conferentesN1?.length ?? 0) > 0);
          const houveN2 = grupo.totalN2 > 0 || ((grupo.conferentesN2?.length ?? 0) > 0);
          const exibirN1 = grupo.nivel1Ativo !== undefined ? (grupo.nivel1Ativo || houveN1) : houveN1;
          const exibirN2 = grupo.nivel2Ativo !== undefined ? (grupo.nivel2Ativo || houveN2) : true;

          const decisoesDoGrupo = decisoesFiscaisPorGrupo[grupo.id] || {};
          const itensFiscais = (grupo.itensDivergentes || []).filter(
            (i) => i.divergenciaLote || i.divergenciaValidade || i.divergenciaFabricacao
          );
          const totalItensFiscais = itensFiscais.length;
          const totalFiscaisPendentes = itensFiscais.filter((i) => {
            const k = `${i.nunota}-${i.codprod}-${i.sequencia}`;
            const d = decisoesDoGrupo[k];
            const pL = Boolean(i.divergenciaLote && !d?.lote);
            const pV = Boolean(i.divergenciaValidade && !d?.validade);
            const pF = Boolean(i.divergenciaFabricacao && !d?.fabricacao);
            return pL || pV || pF;
          }).length;
          const podeResolverDivergencia = totalFiscaisPendentes === 0;

          const selecionadosDoGrupo = itensSelecionadosPorGrupo[grupo.id] || new Set();
          const todosItemKeys = itensParaExibir.map((i) => `${i.nunota}-${i.codprod}-${i.sequencia}`);
          const qtdSelecionados = selecionadosDoGrupo.size;
          const todosSelecionados =
            todosItemKeys.length > 0 && todosItemKeys.every((k) => selecionadosDoGrupo.has(k));

          return (
            <div key={grupo.id} className="gestao-rec-card">
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
                    <span
                      className={`badge-status-rec ${
                        grupo.status === 'Divergente'
                          ? 'divergente'
                          : grupo.status.includes('Reconferência')
                          ? 'reconferencia'
                          : 'aguardando'
                      }`}
                    >
                      {grupo.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sugestão Inteligente de Decisão (Decision Assist) */}
              {(() => {
                const itensDiv = grupo.itensDivergentes || [];
                if (itensDiv.length === 0) return null;

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
                      ? '▲ Ocultar Itens'
                      : `▼ Exibir Itens (${itensParaExibir.length})`}
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
                          <th rowSpan={2} style={{ width: '38px', textAlign: 'center', padding: '6px 4px' }}>
                            <input
                              type="checkbox"
                              className="gestao-checkbox-select"
                              title={todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos os itens'}
                              checked={todosSelecionados}
                              onChange={() => toggleSelecionarTodos(grupo.id, todosItemKeys)}
                            />
                          </th>
                          <th rowSpan={2}>Produto</th>
                          <th rowSpan={2}>Vol.</th>
                          <th rowSpan={2}>Nota</th>
                          {exibirN1 && <th rowSpan={2}>N1</th>}
                          {exibirN2 && <th rowSpan={2}>N2</th>}
                          {grupo.totalN3 > 0 && <th rowSpan={2}>N3</th>}
                          <th rowSpan={2}>Diferença</th>
                          <th colSpan={2} className="th-grupo-comparativo lote">
                            LOTE
                          </th>
                          <th colSpan={2} className="th-grupo-comparativo validade">
                            VALIDADE
                          </th>
                          <th colSpan={2} className="th-grupo-comparativo fabricacao">
                            FABRICAÇÃO
                          </th>
                          <th rowSpan={2}>Conferente</th>
                        </tr>
                        <tr>
                          <th className="th-subcoluna sub-erp">
                            <div className="th-subcoluna-inner">
                              <span>ERP</span>
                              <button
                                type="button"
                                className="btn-header-massa-sub"
                                title="Aplicar ERP em massa para Lote (nos itens selecionados ou todos)"
                                onClick={() => handleAplicarDecisaoEmMassa(grupo.id, 'lote', 'ERP', itensParaExibir)}
                              >
                                ⚡
                              </button>
                            </div>
                          </th>
                          <th className="th-subcoluna sub-coletor">
                            <div className="th-subcoluna-inner">
                              <span>COLETOR</span>
                              <button
                                type="button"
                                className="btn-header-massa-sub"
                                title="Aplicar COLETOR em massa para Lote (nos itens selecionados ou todos)"
                                onClick={() => handleAplicarDecisaoEmMassa(grupo.id, 'lote', 'BIP', itensParaExibir)}
                              >
                                ⚡
                              </button>
                            </div>
                          </th>
                          <th className="th-subcoluna sub-erp">
                            <div className="th-subcoluna-inner">
                              <span>ERP</span>
                              <button
                                type="button"
                                className="btn-header-massa-sub"
                                title="Aplicar ERP em massa para Validade (nos itens selecionados ou todos)"
                                onClick={() => handleAplicarDecisaoEmMassa(grupo.id, 'validade', 'ERP', itensParaExibir)}
                              >
                                ⚡
                              </button>
                            </div>
                          </th>
                          <th className="th-subcoluna sub-coletor">
                            <div className="th-subcoluna-inner">
                              <span>COLETOR</span>
                              <button
                                type="button"
                                className="btn-header-massa-sub"
                                title="Aplicar COLETOR em massa para Validade (nos itens selecionados ou todos)"
                                onClick={() => handleAplicarDecisaoEmMassa(grupo.id, 'validade', 'BIP', itensParaExibir)}
                              >
                                ⚡
                              </button>
                            </div>
                          </th>
                          <th className="th-subcoluna sub-erp">
                            <div className="th-subcoluna-inner">
                              <span>ERP</span>
                              <button
                                type="button"
                                className="btn-header-massa-sub"
                                title="Aplicar ERP em massa para Fabricação (nos itens selecionados ou todos)"
                                onClick={() => handleAplicarDecisaoEmMassa(grupo.id, 'fabricacao', 'ERP', itensParaExibir)}
                              >
                                ⚡
                              </button>
                            </div>
                          </th>
                          <th className="th-subcoluna sub-coletor">
                            <div className="th-subcoluna-inner">
                              <span>COLETOR</span>
                              <button
                                type="button"
                                className="btn-header-massa-sub"
                                title="Aplicar COLETOR em massa para Fabricação (nos itens selecionados ou todos)"
                                onClick={() => handleAplicarDecisaoEmMassa(grupo.id, 'fabricacao', 'BIP', itensParaExibir)}
                              >
                                ⚡
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensParaExibir.map((item) => {
                          const itemKey = `${item.nunota}-${item.codprod}-${item.sequencia}`;
                          const lotesConferidos: any[] = (item as any).lotesConferidos || [];
                          const temMultiplosLotes = lotesConferidos.length > 1;
                          const isLotesAberto = Boolean(lotesExpandidosDiv[itemKey]);
                          const temN3 = grupo.totalN3 > 0;
                          let totalColunasDiv = 12;
                          if (exibirN1) totalColunasDiv++;
                          if (exibirN2) totalColunasDiv++;
                          if (temN3) totalColunasDiv++;

                          const diferenca = item.diferenca;
                          const classeDif =
                            diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';

                          const temDivergenciaFiscal = Boolean(
                            item.divergenciaLote || item.divergenciaValidade || item.divergenciaFabricacao
                          );
                          const decisaoItem = decisoesDoGrupo[itemKey];
                          const pendenteLote = Boolean(item.divergenciaLote && !decisaoItem?.lote);
                          const pendenteValidade = Boolean(item.divergenciaValidade && !decisaoItem?.validade);
                          const pendenteFabricacao = Boolean(item.divergenciaFabricacao && !decisaoItem?.fabricacao);
                          const isItemPendente = temDivergenciaFiscal && (pendenteLote || pendenteValidade || pendenteFabricacao);
                          const isItemDecidido = temDivergenciaFiscal && !isItemPendente;

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
                                    title="Selecionar produto para ação em massa"
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
                                      fontSize: '0.72rem',
                                      color: 'var(--slate-500)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Cód: {item.codprod}
                                    {item.referencia ? ` • Ref: ${item.referencia}` : ''}
                                  </div>
                                  {isItemPendente && (
                                    <span className="badge-pendente-aviso" style={{ marginTop: '4px' }}>
                                      ⚠️ Pendente de Decisão
                                    </span>
                                  )}
                                  {isItemDecidido && (
                                    <span className="badge-decidido-ok" style={{ marginTop: '4px' }}>
                                      ✓ Decisão Definida
                                    </span>
                                  )}
                                </td>
                                <td>{item.codvol || 'UN'}</td>
                                <td>
                                  <strong>{item.qtdEsperada}</strong>
                                </td>
                                {exibirN1 && <td>{item.qtdN1}</td>}
                                {exibirN2 && <td>{item.qtdN2}</td>}
                                {temN3 && <td>{item.qtdN3}</td>}
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                    <span className={`pill-contagem-status ${classeDif}`}>
                                      {diferenca < 0
                                        ? `⚠️ ${diferenca} (Falta)`
                                        : diferenca > 0
                                        ? `+${diferenca} (Sobra)`
                                        : '✓ OK'}
                                    </span>
                                    {diferenca < 0 && onSincronizarDesmembramento && (
                                      <button
                                        type="button"
                                        className="btn-desmembrar-item"
                                        disabled={processandoDesmembramento === `${grupo.conferenciaId || grupo.id}-${item.nunota}-${item.codprod}`}
                                        onClick={() =>
                                          onSincronizarDesmembramento(
                                            grupo.conferenciaId || grupo.id,
                                            item.nunota,
                                            item.codprod,
                                            item.sequencia
                                          )
                                        }
                                        title="Consultar no Sankhya se o saldo faltante deste item já foi desmembrado na Central de Compras"
                                      >
                                        {processandoDesmembramento === `${grupo.conferenciaId || grupo.id}-${item.nunota}-${item.codprod}`
                                          ? '🔄 Checando...'
                                          : '✂️ Desmembrar'}
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* LOTE - ERP */}
                                <td
                                  className={`celula-comparativa borda-esq ${item.divergenciaLote ? 'clicavel' : 'neutra'} ${decisaoItem?.lote === 'ERP' ? 'selecionada' : ''}`}
                                  onClick={() => item.divergenciaLote && handleSetDecisao(grupo.id, itemKey, item, 'lote', 'ERP')}
                                  title={item.divergenciaLote ? `Clique para adotar o lote original do ERP (${item.controleOriginal || 'Sem Lote'})` : undefined}
                                >
                                  {decisaoItem?.lote === 'ERP' ? (
                                    <span className="celula-comparativa selecionada-badge">
                                      ✓ {item.controleOriginal || 'Sem Lote'}
                                    </span>
                                  ) : (
                                    item.controleOriginal || '—'
                                  )}
                                </td>

                                {/* LOTE - COLETOR */}
                                <td
                                  className={`celula-comparativa borda-dir ${item.divergenciaLote ? 'clicavel' : 'neutra'} ${decisaoItem?.lote === 'BIP' ? 'selecionada' : ''}`}
                                  onClick={() => !temMultiplosLotes && item.divergenciaLote && handleSetDecisao(grupo.id, itemKey, item, 'lote', 'BIP')}
                                  title={item.divergenciaLote ? `Clique para adotar o lote conferido no Coletor (${item.lote || 'Sem Lote'})` : undefined}
                                >
                                  {temMultiplosLotes ? (
                                    <button
                                      type="button"
                                      className={`chip-dropdown-lote ${isLotesAberto ? 'ativo' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLotesDiv(itemKey);
                                      }}
                                      title={isLotesAberto ? 'Recolher gaveta de lotes' : 'Expandir lotes linha a linha'}
                                    >
                                      <span>🏷️ {lotesConferidos.length} Lotes</span>
                                      <span style={{ fontSize: '0.65rem' }}>{isLotesAberto ? '▲' : '▼'}</span>
                                    </button>
                                  ) : decisaoItem?.lote === 'BIP' ? (
                                    <span className="celula-comparativa selecionada-badge">
                                      ✓ {item.lote || 'Sem Lote'}
                                    </span>
                                  ) : (
                                    item.lote || '—'
                                  )}
                                </td>

                                {/* VALIDADE - ERP */}
                                <td
                                  className={`celula-comparativa borda-esq ${item.divergenciaValidade ? 'clicavel' : 'neutra'} ${decisaoItem?.validade === 'ERP' ? 'selecionada' : ''}`}
                                  onClick={() => item.divergenciaValidade && handleSetDecisao(grupo.id, itemKey, item, 'validade', 'ERP')}
                                  title={item.divergenciaValidade ? `Clique para adotar a validade original do ERP (${formatarDataSimples(item.validadeOriginal) || '—'})` : undefined}
                                >
                                  {decisaoItem?.validade === 'ERP' ? (
                                    <span className="celula-comparativa selecionada-badge">
                                      ✓ {formatarDataSimples(item.validadeOriginal) || '—'}
                                    </span>
                                  ) : (
                                    formatarDataSimples(item.validadeOriginal) || '—'
                                  )}
                                </td>

                                {/* VALIDADE - COLETOR */}
                                <td
                                  className={`celula-comparativa borda-dir ${item.divergenciaValidade ? 'clicavel' : 'neutra'} ${decisaoItem?.validade === 'BIP' ? 'selecionada' : ''}`}
                                  onClick={() => item.divergenciaValidade && handleSetDecisao(grupo.id, itemKey, item, 'validade', 'BIP')}
                                  title={item.divergenciaValidade ? `Clique para adotar a validade conferida no Coletor (${formatarDataSimples(item.validade) || '—'})` : undefined}
                                >
                                  {decisaoItem?.validade === 'BIP' ? (
                                    <span className="celula-comparativa selecionada-badge">
                                      ✓ {formatarDataSimples(item.validade) || '—'}
                                    </span>
                                  ) : (
                                    formatarDataSimples(item.validade) || '—'
                                  )}
                                </td>

                                {/* FABRICAÇÃO - ERP */}
                                <td
                                  className={`celula-comparativa borda-esq ${item.divergenciaFabricacao ? 'clicavel' : 'neutra'} ${decisaoItem?.fabricacao === 'ERP' ? 'selecionada' : ''}`}
                                  onClick={() => item.divergenciaFabricacao && handleSetDecisao(grupo.id, itemKey, item, 'fabricacao', 'ERP')}
                                  title={item.divergenciaFabricacao ? `Clique para adotar a fabricação original do ERP (${formatarDataSimples(item.fabricacaoOriginal) || '—'})` : undefined}
                                >
                                  {decisaoItem?.fabricacao === 'ERP' ? (
                                    <span className="celula-comparativa selecionada-badge">
                                      ✓ {formatarDataSimples(item.fabricacaoOriginal) || '—'}
                                    </span>
                                  ) : (
                                    formatarDataSimples(item.fabricacaoOriginal) || '—'
                                  )}
                                </td>

                                {/* FABRICAÇÃO - COLETOR */}
                                <td
                                  className={`celula-comparativa borda-dir ${item.divergenciaFabricacao ? 'clicavel' : 'neutra'} ${decisaoItem?.fabricacao === 'BIP' ? 'selecionada' : ''}`}
                                  onClick={() => item.divergenciaFabricacao && handleSetDecisao(grupo.id, itemKey, item, 'fabricacao', 'BIP')}
                                  title={item.divergenciaFabricacao ? `Clique para adotar a fabricação conferida no Coletor (${formatarDataSimples(item.fabricacao) || '—'})` : undefined}
                                >
                                  {decisaoItem?.fabricacao === 'BIP' ? (
                                    <span className="celula-comparativa selecionada-badge">
                                      ✓ {formatarDataSimples(item.fabricacao) || '—'}
                                    </span>
                                  ) : (
                                    formatarDataSimples(item.fabricacao) || '—'
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

                              {/* Sub-Linha Gaveta: Lotes Linha a Linha (Modelo 1) */}
                              {temMultiplosLotes && isLotesAberto && (
                                <tr key={`div-lotes-${itemKey}`} className="subrow-lotes-drawer">
                                  <td colSpan={totalColunasDiv}>
                                    <div className="drawer-lotes-wrapper">
                                      <div className="drawer-lotes-header">
                                        <span>📦 Frações de Lote Registradas ({lotesConferidos.length} lotes):</span>
                                        <span style={{ color: 'var(--slate-500)', fontWeight: 500, textTransform: 'none' }}>
                                          Total: <strong>{lotesConferidos.reduce((acc, l) => acc + (l.quantidade || 0), 0)} {item.codvol || 'UN'}</strong>
                                        </span>
                                      </div>
                                      <table className="mini-tabela-lotes">
                                        <thead>
                                          <tr>
                                            <th>Lote</th>
                                            <th style={{ textAlign: 'center' }}>Quantidade</th>
                                            <th>Data de Validade</th>
                                            <th>Data de Fabricação</th>
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
                                              <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--slate-800)' }}>
                                                {formatarDataSimples(fracao.validade)}
                                              </td>
                                              <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-600)' }}>
                                                {formatarDataSimples(fracao.fabricacao)}
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
                      const lotesConferidos: any[] = (item as any).lotesConferidos || [];
                      const temMultiplosLotes = lotesConferidos.length > 1;
                      const isLotesAberto = Boolean(lotesExpandidosDiv[itemKey]);

                      const diferenca = item.diferenca;
                      const classeDif =
                        diferenca < 0 ? 'falta' : diferenca > 0 ? 'sobra' : 'ok';
                      const temDivergenciaFiscal = Boolean(
                        item.divergenciaLote || item.divergenciaValidade || item.divergenciaFabricacao
                      );
                      const decisaoItem = decisoesDoGrupo[itemKey];
                      const pendenteLote = Boolean(item.divergenciaLote && !decisaoItem?.lote);
                      const pendenteValidade = Boolean(item.divergenciaValidade && !decisaoItem?.validade);
                      const pendenteFabricacao = Boolean(item.divergenciaFabricacao && !decisaoItem?.fabricacao);
                      const isItemPendente = temDivergenciaFiscal && (pendenteLote || pendenteValidade || pendenteFabricacao);
                      const isItemDecidido = temDivergenciaFiscal && !isItemPendente;

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
                                title="Selecionar produto para ação em massa"
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="gestao-item-mobile-descr">
                                {item.descrprod || `Produto ${item.codprod}`}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                                Cód: {item.codprod}
                                {item.referencia ? ` • Ref: ${item.referencia}` : ''} • Vol:{' '}
                                {item.codvol || 'UN'}
                              </div>
                              {isItemPendente && (
                                <span className="badge-pendente-aviso">
                                  ⚠️ Pendente de Decisão
                                </span>
                              )}
                              {isItemDecidido && (
                                <span className="badge-decidido-ok">
                                  ✓ Decisão Definida
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                              <span className={`pill-contagem-status ${classeDif}`}>
                                {diferenca < 0
                                  ? `⚠️ ${diferenca} (Falta)`
                                  : diferenca > 0
                                  ? `+${diferenca} (Sobra)`
                                  : '✓ OK'}
                              </span>
                              {diferenca < 0 && onSincronizarDesmembramento && (
                                <button
                                  type="button"
                                  className="btn-desmembrar-item"
                                  disabled={processandoDesmembramento === `${grupo.conferenciaId || grupo.id}-${item.nunota}-${item.codprod}`}
                                  onClick={() =>
                                    onSincronizarDesmembramento(
                                      grupo.conferenciaId || grupo.id,
                                      item.nunota,
                                      item.codprod,
                                      item.sequencia
                                    )
                                  }
                                  title="Consultar no Sankhya se o saldo faltante foi desmembrado na Central de Compras"
                                >
                                  {processandoDesmembramento === `${grupo.conferenciaId || grupo.id}-${item.nunota}-${item.codprod}`
                                    ? '🔄 Checando...'
                                    : '✂️ Desmembrar'}
                                </button>
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
                                <div>
                                  {item.divergenciaLote || item.divergenciaValidade || item.divergenciaFabricacao ? (
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
                                    </div>
                                  ) : item.lote ? (
                                    <>
                                      Lote: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.lote}</strong>
                                      {item.validade ? ` • Val: ${formatarDataSimples(item.validade)}` : ''}
                                      {item.fabricacao
                                        ? ` • Fab: ${formatarDataSimples(item.fabricacao)}`
                                        : ''}
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
                <button
                  type="button"
                  className={`gestao-btn-acao gestao-btn-resolver ${!podeResolverDivergencia ? 'disabled' : ''}`}
                  disabled={!podeResolverDivergencia}
                  onClick={() => onResolverDivergencia(grupo, decisoesDoGrupo)}
                  title={
                    !podeResolverDivergencia
                      ? `Defina a decisão fiscal (ERP ou BIP) para os ${totalFiscaisPendentes} item(ns) pendente(s) antes de resolver.`
                      : 'Resolver e aprovar divergência'
                  }
                >
                  <span>
                    {podeResolverDivergencia
                      ? '✓ Resolver Divergência'
                      : `⚠️ Resolver Divergência (${totalFiscaisPendentes} pendente${totalFiscaisPendentes > 1 ? 's' : ''})`}
                  </span>
                </button>

                {onSincronizarDesmembramento && Boolean(grupo.nunota) && (
                  <button
                    type="button"
                    className="gestao-btn-acao gestao-btn-sincronizar-desmembramento"
                    disabled={processandoDesmembramento === `${grupo.conferenciaId || grupo.id}-${grupo.nunota}-all`}
                    onClick={() =>
                      onSincronizarDesmembramento(
                        grupo.conferenciaId || grupo.id,
                        grupo.nunota!
                      )
                    }
                    title="Consultar no Sankhya se os itens da nota foram desmembrados na Central de Compras"
                  >
                    <span>
                      {processandoDesmembramento === `${grupo.conferenciaId || grupo.id}-${grupo.nunota}-all`
                        ? '🔄 Sincronizando ERP...'
                        : '🔄 Sincronizar Desmembramento do ERP'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className="gestao-btn-acao gestao-btn-n3"
                  onClick={() => onReconferirN3(grupo)}
                >
                  <span>🔍 Reconferir (N3)</span>
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
    </div>
  );
};
