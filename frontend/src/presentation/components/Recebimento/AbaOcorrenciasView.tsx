import React, { useState, useMemo } from 'react';
import {
  OcorrenciaRecebimento,
  TipoOcorrenciaRecebimento,
  StatusOcorrenciaRecebimento,
  TIPOS_OCORRENCIA_LABELS,
} from '../../../domain/models/OcorrenciaRecebimento';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';
import { Container } from '../Container/Container';
import { ModalRegistrarOcorrencia } from './ModalRegistrarOcorrencia';

interface AbaOcorrenciasViewProps {
  ocorrencias: OcorrenciaRecebimento[];
  onRecarregar: () => Promise<void>;
  usuarioAtual?: string;
}

export const AbaOcorrenciasView: React.FC<AbaOcorrenciasViewProps> = ({
  ocorrencias,
  onRecarregar,
  usuarioAtual = 'Gestor',
}) => {
  const recebimentoService = useMemo(() => new RecebimentoApiService(), []);

  // Filtros
  const [buscaTexto, setBuscaTexto] = useState('');
  type FiltroChipOcorrencia = 'todas' | 'pendentes' | 'avarias' | 'vencidos' | 'fora_nota';
  const [filtroChip, setFiltroChip] = useState<FiltroChipOcorrencia>('todas');

  const handleSelecionarChip = (chip: FiltroChipOcorrencia) => {
    setFiltroChip(chip);
  };

  // Estados de modais e ações
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [modalRegistrarAberto, setModalRegistrarAberto] = useState(false);
  const [ocorrenciaEdicao, setOcorrenciaEdicao] = useState<OcorrenciaRecebimento | null>(null);
  const [ocorrenciaParaConfirmar, setOcorrenciaParaConfirmar] = useState<OcorrenciaRecebimento | null>(null);
  const [confirmandoResolucao, setConfirmandoResolucao] = useState(false);
  const [loadingAcao, setLoadingAcao] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Modal para confirmação de notificação no Discord
  const [modalDiscordAberto, setModalDiscordAberto] = useState(false);
  const [enviandoDiscord, setEnviandoDiscord] = useState(false);
  const [nfSelecionadaDiscord, setNfSelecionadaDiscord] = useState<number | 'todas'>('todas');

  // Seleção individual e em lote para Imprimir / Discord
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const toggleSelecionar = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const limparSelecao = () => {
    setSelecionadas(new Set());
  };

  // Ocorrências filtradas
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias.filter((oc) => {
      if (filtroChip === 'pendentes' && oc.status !== 'PENDENTE') return false;
      if (filtroChip === 'avarias' && oc.tipo !== 'AVARIA') return false;
      if (filtroChip === 'vencidos' && oc.tipo !== 'VENCIDO' && oc.tipo !== 'VALIDADE_PROXIMA') return false;
      if (filtroChip === 'fora_nota' && oc.tipo !== 'PRODUTO_TROCADO' && oc.tipo !== 'NAO_IDENTIFICADO') return false;

      if (buscaTexto.trim()) {
        const termo = buscaTexto.toLowerCase();
        const nfMatch =
          (oc.numnota ? String(oc.numnota).includes(termo) : false) ||
          (oc.nunota ? String(oc.nunota).includes(termo) : false);
        const prodMatch =
          (oc.descrprod || '').toLowerCase().includes(termo) ||
          (oc.codprod ? String(oc.codprod).includes(termo) : false);
        const loteMatch = (oc.lote || '').toLowerCase().includes(termo);
        const motivoMatch = (oc.motivo || '').toLowerCase().includes(termo);
        return nfMatch || prodMatch || loteMatch || motivoMatch;
      }

      return true;
    });
  }, [ocorrencias, filtroChip, buscaTexto]);

  const todasVisiveisSelecionadas =
    ocorrenciasFiltradas.length > 0 &&
    ocorrenciasFiltradas.every((oc) => selecionadas.has(oc.id));

  const handleToggleSelecionarTodas = () => {
    if (todasVisiveisSelecionadas) {
      setSelecionadas(new Set());
    } else {
      const next = new Set(selecionadas);
      ocorrenciasFiltradas.forEach((oc) => next.add(oc.id));
      setSelecionadas(next);
    }
  };

  // Contagens para KPIs
  const kpis = useMemo(() => {
    let avarias = 0;
    let vencidos = 0;
    let foraNota = 0;
    let pendentes = 0;

    for (const oc of ocorrencias) {
      if (oc.tipo === 'AVARIA') avarias++;
      if (oc.tipo === 'VENCIDO' || oc.tipo === 'VALIDADE_PROXIMA') vencidos++;
      if (oc.tipo === 'PRODUTO_TROCADO' || oc.tipo === 'NAO_IDENTIFICADO') foraNota++;
      if (oc.status === 'PENDENTE') pendentes++;
    }

    return {
      total: ocorrencias.length,
      avarias,
      vencidos,
      foraNota,
      pendentes,
    };
  }, [ocorrencias]);

  // Agrupamento por NF / NUNOTA para o envio ao Discord
  const notasComOcorrencias = useMemo(() => {
    const map = new Map<number, OcorrenciaRecebimento[]>();
    for (const oc of ocorrencias) {
      if (!oc.nunota) continue;
      if (!map.has(oc.nunota)) map.set(oc.nunota, []);
      map.get(oc.nunota)!.push(oc);
    }
    return Array.from(map.entries()).map(([nunota, itens]) => {
      const numnota = itens.find((i) => i.numnota)?.numnota;
      return {
        nunota,
        numnota,
        total: itens.length,
        pendentes: itens.filter((i) => i.status === 'PENDENTE').length,
      };
    });
  }, [ocorrencias]);

  // Ações de alteração de status
  const handleAlterarStatus = async (id: string, novoStatus: StatusOcorrenciaRecebimento) => {
    setLoadingAcao(id);
    try {
      await recebimentoService.atualizarOcorrencia(id, { status: novoStatus });
      setMensagemSucesso(`Status da ocorrência atualizado para "${novoStatus}".`);
      await onRecarregar();
    } catch (err: any) {
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao alterar status.');
    } finally {
      setLoadingAcao(null);
    }
  };

  const handleExcluirOcorrencia = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta ocorrência permanentemente?')) return;
    setLoadingAcao(id);
    try {
      await recebimentoService.removerOcorrencia(id);
      setMensagemSucesso('Ocorrência removida com sucesso.');
      await onRecarregar();
    } catch (err: any) {
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao excluir ocorrência.');
    } finally {
      setLoadingAcao(null);
    }
  };

  // Solicitar confirmação de resolução (exige local definido)
  const handleSolicitarResolucao = (oc: OcorrenciaRecebimento) => {
    if (!oc.codlocalDestino) {
      setMensagemErro(
        `⚠️ A ocorrência do produto "${oc.descrprod || oc.codprod}" não possui Local de Estoque definido. Clique no botão ✏️ Editar para selecionar o local analítico da TGFLOC antes de confirmar a resolução.`
      );
      return;
    }
    setOcorrenciaParaConfirmar(oc);
  };

  // Confirmar e alterar status para RESOLVIDO
  const handleConfirmarResolucaoFinal = async () => {
    if (!ocorrenciaParaConfirmar) return;
    setConfirmandoResolucao(true);
    setMensagemErro(null);
    try {
      await recebimentoService.atualizarOcorrencia(ocorrenciaParaConfirmar.id, {
        status: 'RESOLVIDO',
      });
      setMensagemSucesso(
        `Ocorrência do item "${ocorrenciaParaConfirmar.descrprod || ocorrenciaParaConfirmar.codprod}" resolvida com sucesso para o Local [${ocorrenciaParaConfirmar.codlocalDestino}]!`
      );
      setOcorrenciaParaConfirmar(null);
      await onRecarregar();
    } catch (err: any) {
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao resolver ocorrência.');
    } finally {
      setConfirmandoResolucao(false);
    }
  };

  // Disparo manual do Discord
  const handleDispararDiscord = async () => {
    setEnviandoDiscord(true);
    setMensagemErro(null);
    try {
      let ocorrenciasAlvo: OcorrenciaRecebimento[] = [];

      if (selecionadas.size > 0) {
        ocorrenciasAlvo = ocorrencias.filter((oc) => selecionadas.has(oc.id));
      } else if (nfSelecionadaDiscord === 'todas') {
        ocorrenciasAlvo = ocorrencias;
      } else {
        ocorrenciasAlvo = ocorrencias.filter((oc) => oc.nunota === nfSelecionadaDiscord);
      }

      if (ocorrenciasAlvo.length === 0) {
        throw new Error('Nenhuma ocorrência encontrada para enviar ao Discord.');
      }

      const nunotaBase =
        selecionadas.size > 0
          ? ocorrenciasAlvo[0]?.nunota || 0
          : nfSelecionadaDiscord !== 'todas'
          ? nfSelecionadaDiscord
          : ocorrenciasAlvo[0]?.nunota || 0;

      await recebimentoService.notificarDiscordOcorrencias({
        nunota: nunotaBase,
        ocorrencias: ocorrenciasAlvo,
        usuario: usuarioAtual,
      });

      setMensagemSucesso(`Relatório de ${ocorrenciasAlvo.length} ocorrência(s) enviado ao Discord com sucesso!`);
      setModalDiscordAberto(false);
    } catch (err: any) {
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao disparar Discord.');
    } finally {
      setEnviandoDiscord(false);
    }
  };

  // Impressão limpa em PDF (Relatório de Ocorrências)
  const handleImprimirRelatorio = () => {
    window.print();
  };

  const getTipoBadgeInfo = (tipo: TipoOcorrenciaRecebimento) => {
    switch (tipo) {
      case 'AVARIA':
        return { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '💥' };
      case 'VENCIDO':
        return { bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe', icon: '⏳' };
      case 'VALIDADE_PROXIMA':
        return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: '⚠️' };
      case 'PRODUTO_TROCADO':
        return { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa', icon: '🔄' };
      case 'NAO_IDENTIFICADO':
        return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', icon: '❓' };
      case 'FALTA':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', icon: '➖' };
      case 'SOBRA':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: '➕' };
      default:
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', icon: '📌' };
    }
  };

  const getStatusBadge = (status: StatusOcorrenciaRecebimento) => {
    switch (status) {
      case 'PENDENTE':
        return { bg: '#fee2e2', color: '#991b1b', label: 'Pendente' };
      case 'RESOLVIDO':
        return { bg: '#fef3c7', color: '#92400e', label: 'Resolvido' };
      case 'INTEGRADO_ERP':
        return { bg: '#ecfdf5', color: '#065f46', label: 'Integrado Sankhya' };
      case 'DEVOLVIDO':
        return { bg: '#f1f5f9', color: '#64748b', label: 'Devolvido' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: status };
    }
  };

  return (
    <div id="relatorio-ocorrencias-impressao" className="gestao-rec-lista aba-ocorrencias-view">
      {/* Alertas de Feedback */}
      {mensagemSucesso && (
        <div
          style={{
            padding: '10px 16px',
            marginBottom: '12px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <span>✓ {mensagemSucesso}</span>
          <button
            onClick={() => setMensagemSucesso(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            ✕
          </button>
        </div>
      )}

      {mensagemErro && (
        <div
          style={{
            padding: '10px 16px',
            marginBottom: '12px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <span>⚠️ {mensagemErro}</span>
          <button
            onClick={() => setMensagemErro(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991b1b' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Filtros e Barra de Ações (Alinhamento idêntico à Aba Conferências) */}
      <div
        className="gestao-rec-filtro-bar print-hide"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '12px',
          width: '100%',
        }}
      >
        {/* Linha 1: Chips de filtro alinhados à esquerda + Botão Nova Ocorrência à direita */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <div className="gestao-rec-filtros-chips">
            <button
              type="button"
              className={`gestao-filtro-chip ${filtroChip === 'todas' ? 'ativo' : ''}`}
              onClick={() => handleSelecionarChip('todas')}
            >
              Todas <span className="chip-count">{kpis.total}</span>
            </button>
            <button
              type="button"
              className={`gestao-filtro-chip ${filtroChip === 'pendentes' ? 'ativo' : ''}`}
              onClick={() => handleSelecionarChip('pendentes')}
            >
              Pendentes <span className="chip-count">{kpis.pendentes}</span>
            </button>
            <button
              type="button"
              className={`gestao-filtro-chip ${filtroChip === 'avarias' ? 'ativo' : ''}`}
              onClick={() => handleSelecionarChip('avarias')}
            >
              💥 Avarias <span className="chip-count">{kpis.avarias}</span>
            </button>
            <button
              type="button"
              className={`gestao-filtro-chip ${filtroChip === 'vencidos' ? 'ativo' : ''}`}
              onClick={() => handleSelecionarChip('vencidos')}
            >
              ⏳ Vencidos <span className="chip-count">{kpis.vencidos}</span>
            </button>
            <button
              type="button"
              className={`gestao-filtro-chip ${filtroChip === 'fora_nota' ? 'ativo' : ''}`}
              onClick={() => handleSelecionarChip('fora_nota')}
            >
              🔄 Fora da Nota <span className="chip-count">{kpis.foraNota}</span>
            </button>
          </div>

          {/* Botão Nova Ocorrência (Destaque à direita) */}
          <button
            type="button"
            onClick={() => setModalRegistrarAberto(true)}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--orange-500, #f97316)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(249, 115, 22, 0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>+</span>
            <span>Nova Ocorrência</span>
          </button>
        </div>

        {/* Linha 2: Busca alinhada estritamente à esquerda + Seleção em lote + Ações complementares à direita */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="gestao-rec-busca-input"
              style={{ maxWidth: '340px', width: '100%' }}
              placeholder="Buscar por NF, código, produto, lote ou motivo..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
            />

            {/* Botão Selecionar Todas / Limpar Seleção */}
            {ocorrenciasFiltradas.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelecionarTodas}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: todasVisiveisSelecionadas ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                  background: todasVisiveisSelecionadas ? '#eff6ff' : '#ffffff',
                  color: todasVisiveisSelecionadas ? '#1d4ed8' : '#475569',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                title={todasVisiveisSelecionadas ? 'Desmarcar todas' : 'Selecionar todas as ocorrências filtradas'}
              >
                <input
                  type="checkbox"
                  checked={todasVisiveisSelecionadas}
                  onChange={() => {}}
                  style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <span>
                  {selecionadas.size > 0
                    ? `${selecionadas.size} selecionada(s)`
                    : 'Selecionar todas'}
                </span>
                {selecionadas.size > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      limparSelecao();
                    }}
                    style={{
                      marginLeft: '4px',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                    title="Limpar seleção"
                  >
                    ✕
                  </span>
                )}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Botão Discord */}
            <button
              type="button"
              onClick={() => setModalDiscordAberto(true)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: selecionadas.size > 0 ? '1px solid #6366f1' : '1px solid #c7d2fe',
                background: selecionadas.size > 0 ? '#4f46e5' : '#e0e7ff',
                color: selecionadas.size > 0 ? '#ffffff' : '#3730a3',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title="Disparar alerta com fotos e detalhes das ocorrências no Discord"
            >
              <span>📢</span>
              <span>Discord {selecionadas.size > 0 ? `(${selecionadas.size})` : ''}</span>
            </button>

            {/* Botão Imprimir / PDF */}
            <button
              type="button"
              onClick={handleImprimirRelatorio}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: selecionadas.size > 0 ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: selecionadas.size > 0 ? '#0f172a' : '#ffffff',
                color: selecionadas.size > 0 ? '#ffffff' : 'var(--slate-700)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title="Imprimir relatório completo de ocorrências ou itens selecionados"
            >
              <span>🖨️</span>
              <span>Imprimir {selecionadas.size > 0 ? `(${selecionadas.size})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Relatório Formatado para Impressão (Aparece no print) */}
      <div className="print-only" style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}
            >
              RELATÓRIO DE OCORRÊNCIAS DE RECEBIMENTO
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#475569' }}>
              Conferência e Inspeção de Entrada • Gestão de Recebimento
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.80rem', color: '#334155', lineHeight: 1.4 }}>
            <div>
              <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div>
              <strong>Responsável:</strong> {usuarioAtual}
            </div>
            <div>
              <strong>Total de Ocorrências:</strong>{' '}
              {selecionadas.size > 0
                ? `${selecionadas.size} (selecionadas manualmente)`
                : ocorrenciasFiltradas.length}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lista de Ocorrências */}
      {ocorrenciasFiltradas.length === 0 ? (
        <Container variant="default" padding="lg">
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--slate-500)' }}>
            <span style={{ fontSize: '3rem' }}>✨</span>
            <h3 style={{ marginTop: '14px', color: 'var(--slate-700)' }}>
              Nenhuma ocorrência encontrada
            </h3>
            <p style={{ marginTop: '6px', fontSize: '0.88rem' }}>
              {ocorrencias.length === 0
                ? 'Nenhum registro de avaria, produto vencido ou item trocado no momento.'
                : 'Nenhuma ocorrência corresponde aos filtros aplicados.'}
            </p>
            {ocorrencias.length === 0 && (
              <button
                type="button"
                onClick={() => setModalRegistrarAberto(true)}
                style={{
                  marginTop: '14px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Registrar Primeira Ocorrência
              </button>
            )}
          </div>
        </Container>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ocorrenciasFiltradas.map((oc) => {
            const isSelecionado = selecionadas.has(oc.id);
            const badge = getTipoBadgeInfo(oc.tipo);
            const statusBadge = getStatusBadge(oc.status);
            const dataFmt = oc.criadoEm
              ? new Date(oc.criadoEm).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';

            return (
              <div
                key={oc.id}
                className={`card-ocorrencia-item ${!isSelecionado && selecionadas.size > 0 ? 'print-hide' : ''}`}
                style={{
                  background: isSelecionado ? '#f8faff' : '#ffffff',
                  border: isSelecionado
                    ? '1.5px solid #3b82f6'
                    : '1px solid var(--slate-200, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  boxShadow: isSelecionado
                    ? '0 2px 6px rgba(59, 130, 246, 0.15)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Linha 1: Cabeçalho com Checkbox, Tipo, Nota e Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Checkbox de Seleção Individual */}
                    <input
                      type="checkbox"
                      className="print-hide"
                      checked={isSelecionado}
                      onChange={() => toggleSelecionar(oc.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: '#2563eb',
                        flexShrink: 0,
                      }}
                      title={isSelecionado ? 'Desmarcar ocorrência' : 'Selecionar ocorrência para Imprimir/Discord'}
                    />

                    {/* Badge do Tipo */}
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span>{badge.icon}</span>
                      <span>{TIPOS_OCORRENCIA_LABELS[oc.tipo] || oc.tipo}</span>
                    </span>

                    {/* Nota Fiscal */}
                    {oc.numnota || oc.nunota ? (
                      <span style={{ fontSize: '0.82rem', color: 'var(--slate-600)', fontWeight: 600 }}>
                        NF: <strong style={{ color: 'var(--slate-800)' }}>{oc.numnota || oc.nunota}</strong>
                        {oc.nunota && (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: '4px', fontWeight: 500 }}>
                            (#{oc.nunota})
                          </span>
                        )}
                        {oc.sequencia ? ` • Seq: ${oc.sequencia}` : ''}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          color: '#64748b',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        Avulso / Fora da Nota
                      </span>
                    )}

                    {/* Origem e Usuário */}
                    <span style={{ fontSize: '0.74rem', color: 'var(--slate-400)' }}>
                      • Registrado por <strong>{oc.criadoPor || 'Operador'}</strong> ({oc.origem === 'COLETOR' ? '📱 Coletor' : '💻 Gestão'}) em {dataFmt}
                    </span>
                  </div>

                  {/* Lado Direito: Status e Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Botão Confirmar Resolução (quando status for PENDENTE) */}
                    {oc.status === 'PENDENTE' && (
                      <button
                        type="button"
                        className="print-hide"
                        onClick={() => handleSolicitarResolucao(oc)}
                        disabled={loadingAcao === oc.id}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #86efac',
                          background: '#f0fdf4',
                          color: '#166534',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                        title="Confirmar e alterar status de Pendente para Resolvido"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#16a34a';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f0fdf4';
                          e.currentTarget.style.color = '#166534';
                        }}
                      >
                        <span>✓</span>
                        <span>Confirmar</span>
                      </button>
                    )}

                    {/* Badge de Status */}
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {statusBadge.label}
                    </span>

                    {/* Seletor Rápido de Status (print-hide) */}
                    <select
                      className="print-hide"
                      value={oc.status}
                      disabled={loadingAcao === oc.id}
                      onChange={(e) => handleAlterarStatus(oc.id, e.target.value as StatusOcorrenciaRecebimento)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        color: 'var(--slate-700)',
                        background: '#ffffff',
                        cursor: 'pointer',
                      }}
                      title="Alterar status operacional da ocorrência"
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="RESOLVIDO">Resolvido</option>
                      <option value="INTEGRADO_ERP">Integrado</option>
                      <option value="DEVOLVIDO">Devolvido</option>
                    </select>

                    {/* Botão Editar (print-hide) */}
                    <button
                      type="button"
                      className="print-hide"
                      onClick={() => setOcorrenciaEdicao(oc)}
                      disabled={loadingAcao === oc.id}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '3px 6px',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                      }}
                      title="Editar ocorrência e definir Local ERP"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                    >
                      ✏️
                    </button>

                    {/* Botão Excluir (print-hide) */}
                    <button
                      type="button"
                      className="print-hide"
                      onClick={() => handleExcluirOcorrencia(oc.id)}
                      disabled={loadingAcao === oc.id}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '3px 6px',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                      }}
                      title="Excluir ocorrência"
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Linha 2: Dados do Produto & Local ERP de Destino */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '10px',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.90rem', color: 'var(--slate-900)' }}>
                      {oc.descrprod || 'Produto não cadastrado'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span>Cód: <strong>{oc.codprod || 'N/D'}</strong></span>
                      {oc.lote && <span>• Lote: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{oc.lote}</strong></span>}
                      {oc.validade && <span>• Validade: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{oc.validade}</strong></span>}
                      {oc.fabricacao && <span>• Fabricação: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{oc.fabricacao}</strong></span>}
                    </div>
                  </div>

                  {/* Informações Numéricas e Local ERP */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Quantidade */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--slate-400)', fontWeight: 600 }}>
                        Qtd Afetada
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-800)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {oc.quantidade}
                      </div>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: '#cbd5e1' }} />

                    {/* Local ERP de Destino */}
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          color: oc.codlocalDestino ? '#b45309' : '#dc2626',
                          fontWeight: 700,
                        }}
                      >
                        Local Sankhya (ERP)
                      </div>
                      {oc.codlocalDestino ? (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            color: '#b45309',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontFamily: 'JetBrains Mono, monospace',
                            display: 'inline-block',
                          }}
                          title="Local de estoque onde este item será integrado no Sankhya (CODLOCALORIG)"
                        >
                          📍 Local {oc.codlocalDestino}
                        </div>
                      ) : (
                        <div
                          onClick={() => setOcorrenciaEdicao(oc)}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#b91c1c',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Clique para abrir e definir o Local no ERP"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                          }}
                        >
                          <span>⚠️ Pendente</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Linha 3: Motivo / Observação */}
                {oc.motivo && (
                  <div style={{ fontSize: '0.80rem', color: 'var(--slate-700)', padding: '2px 4px' }}>
                    <strong style={{ color: 'var(--slate-600)' }}>Motivo / Apontamento:</strong> {oc.motivo}
                  </div>
                )}

                {/* Linha 4: Fotos / Evidências */}
                {oc.fotos && oc.fotos.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-500)' }}>
                      📷 Evidências ({oc.fotos.length}):
                    </span>
                    {oc.fotos.map((foto, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFotoModal(foto)}
                        className="evidencia-foto-thumb"
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          position: 'relative',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                        title="Clique para ampliar foto"
                      >
                        <img
                          src={foto}
                          alt={`Evidência ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Modal de Foto Ampliada */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '20px',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setFotoModal(null)}
              style={{
                position: 'absolute',
                top: '-36px',
                right: '0',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.8rem',
                cursor: 'pointer',
              }}
            >
              ✕ Fechar
            </button>
            <img
              src={fotoModal}
              alt="Evidência ampliada"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}

      {/* Modal para Notificação no Discord */}
      {modalDiscordAberto && (
        <div
          onClick={() => setModalDiscordAberto(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '95%',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📢</span> Disparar Notificação no Discord
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: '6px' }}>
              Envia um resumo completo das ocorrências registradas com fotos e locais de destino para o canal da equipe no Discord.
            </p>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selecionadas.size > 0 ? (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓</span>
                    <span>{selecionadas.size} ocorrência(s) selecionada(s) prontas para envio</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#3b82f6' }}>
                    O disparo no Discord incluirá exclusivamente os itens que você selecionou na lista.
                  </p>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-700)', display: 'block', marginBottom: '4px' }}>
                    Filtrar por Nota Fiscal:
                  </label>
                  <select
                    value={nfSelecionadaDiscord}
                    onChange={(e) => setNfSelecionadaDiscord(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="todas">Todas as Notas ({ocorrencias.length} ocorrências no total)</option>
                    {notasComOcorrencias.map((n) => (
                      <option key={n.nunota} value={n.nunota}>
                        NF {n.numnota || n.nunota} {n.numnota ? `(#${n.nunota})` : ''} ({n.total} ocorrência{n.total > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '0.78rem',
                  color: 'var(--slate-600)',
                }}
              >
                💡 <strong>Dica:</strong> A notificação incluirá a lista dos produtos avariados, vencidos ou trocados, os lotes e o número do local no ERP (<code style={{ color: '#b45309' }}>CODLOCAL</code>).
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setModalDiscordAberto(false)}
                disabled={enviandoDiscord}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDispararDiscord}
                disabled={enviandoDiscord}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: enviandoDiscord ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {enviandoDiscord
                  ? 'Enviando ao Discord...'
                  : selecionadas.size > 0
                  ? `Enviar ${selecionadas.size} Selecionada(s) 🚀`
                  : 'Enviar Agora 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Resolução da Ocorrência */}
      {ocorrenciaParaConfirmar && (
        <div
          onClick={() => !confirmandoResolucao && setOcorrenciaParaConfirmar(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                  Confirmar Resolução da Ocorrência
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Deseja alterar o status de <strong>PENDENTE</strong> para <strong>RESOLVIDO</strong>?
                </p>
              </div>
            </div>

            {/* Resumo do Item */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Produto: </span>
                <strong style={{ color: '#1e293b' }}>
                  {ocorrenciaParaConfirmar.descrprod || 'Produto Avulso'}
                </strong>
                {ocorrenciaParaConfirmar.codprod ? ` (#${ocorrenciaParaConfirmar.codprod})` : ''}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Qtd Afetada: </span>
                  <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0f172a' }}>
                    {ocorrenciaParaConfirmar.quantidade}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b' }}>Tipo: </span>
                  <span style={{ fontWeight: 700, color: '#991b1b' }}>
                    {TIPOS_OCORRENCIA_LABELS[ocorrenciaParaConfirmar.tipo] || ocorrenciaParaConfirmar.tipo}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#64748b' }}>Local ERP de Destino: </span>
                <strong style={{ color: '#b45309', fontFamily: 'JetBrains Mono, monospace' }}>
                  📍 Local {ocorrenciaParaConfirmar.codlocalDestino}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setOcorrenciaParaConfirmar(null)}
                disabled={confirmandoResolucao}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarResolucaoFinal}
                disabled={confirmandoResolucao}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: confirmandoResolucao ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                }}
              >
                {confirmandoResolucao ? 'Confirmando...' : 'Confirmar e Resolver ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Registro Manual ou Edição de Ocorrência pela Gestão */}
      {(modalRegistrarAberto || ocorrenciaEdicao) && (
        <ModalRegistrarOcorrencia
          isOpen={modalRegistrarAberto || Boolean(ocorrenciaEdicao)}
          onClose={() => {
            setModalRegistrarAberto(false);
            setOcorrenciaEdicao(null);
          }}
          ocorrenciaEdicao={ocorrenciaEdicao || undefined}
          origem="GESTAO"
          usuario={usuarioAtual}
          onSalvar={async (dados) => {
            if (ocorrenciaEdicao) {
              await recebimentoService.atualizarOcorrencia(ocorrenciaEdicao.id, {
                tipo: dados.tipo,
                quantidade: dados.quantidade,
                numnota: dados.numnota,
                lote: dados.lote,
                validade: dados.validade,
                fabricacao: dados.fabricacao,
                motivo: dados.motivo,
                codlocalDestino: dados.codlocalDestino,
                fotos: dados.fotos,
              });
              setMensagemSucesso('Ocorrência atualizada com sucesso pela gestão!');
              setOcorrenciaEdicao(null);
            } else {
              await recebimentoService.registrarOcorrencia(dados);
              setMensagemSucesso('Ocorrência registrada com sucesso pela gestão!');
              setModalRegistrarAberto(false);
            }
            await onRecarregar();
          }}
        />
      )}
    </div>
  );
};
