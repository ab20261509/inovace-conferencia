import React, { useState, useEffect, useMemo } from 'react';
import { ItemDivergenciaResumo, ConferenciaDivergenciaGrupo } from '../../../domain/models/ConferenciaEntrada.js';
import { aplicarMascaraData, completarAnoData, validarData } from '../../utils/dateMaskHelper';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';
import { LocalEstoqueItem } from '../../../domain/models/OcorrenciaRecebimento';
import { ModalPesquisaLocalEstoque } from './ModalPesquisaLocalEstoque';

export interface FracaoLoteEditavel {
  id: string;
  lote: string;
  quantidade: number;
  validade: string;
  fabricacao: string;
  codlocal?: number;
  isFalta?: boolean;
}

interface ModalDesmembrarItemProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemDivergenciaResumo | null;
  grupo: ConferenciaDivergenciaGrupo | null;
  onConfirmar: (dados: {
    nunota: number;
    sequencia: number;
    lotes: Array<{ lote: string; qtd: number; dtval?: string; dtfab?: string; codlocal?: number }>;
  }) => Promise<void>;
  loading?: boolean;
}

const recebimentoService = new RecebimentoApiService();

const LOCAIS_PADRAO_FALLBACK: LocalEstoqueItem[] = [
  { codlocal: 0, descrlocal: 'PADRÃO / GERAL' },
  { codlocal: 95, descrlocal: 'VALIDADE PRÓXIMA (SHELF-LIFE)' },
  { codlocal: 98, descrlocal: 'PRODUTO VENCIDO' },
  { codlocal: 99, descrlocal: 'AVARIA / BLOQUEADO' },
];

function formatarDataSimples(dataStr?: string | null): string {
  if (!dataStr) return '';
  const s = dataStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [ano, mes, dia] = s.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{8}/.test(s)) {
    const dia = s.substring(0, 2);
    const mes = s.substring(2, 4);
    const ano = s.substring(4, 8);
    return `${dia}/${mes}/${ano}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    return s.substring(0, 10);
  }
  return s.split(' ')[0] || s;
}

export const ModalDesmembrarItem: React.FC<ModalDesmembrarItemProps> = ({
  isOpen,
  onClose,
  item,
  grupo,
  onConfirmar,
  loading = false,
}) => {
  const [fracoes, setFracoes] = useState<FracaoLoteEditavel[]>([]);

  // Estados para seleção/pesquisa de locais de estoque da TGFLOC
  const [locaisEstoque, setLocaisEstoque] = useState<LocalEstoqueItem[]>(LOCAIS_PADRAO_FALLBACK);
  const [carregandoLocais, setCarregandoLocais] = useState<boolean>(false);
  const [modalBuscaLocalAberto, setModalBuscaLocalAberto] = useState<boolean>(false);
  const [fracaoAlvoLocalId, setFracaoAlvoLocalId] = useState<string | null>(null);
  const [termoBuscaLocal, setTermoBuscaLocal] = useState<string>('');

  // Carrega lista de locais de estoque analíticos da TGFLOC ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    let ativo = true;

    const carregarLocais = async () => {
      setCarregandoLocais(true);
      try {
        const resp = await recebimentoService.listarLocaisEstoque();
        if (ativo && resp && resp.length > 0) {
          setLocaisEstoque(resp);
        }
      } catch (e) {
        console.warn('[ModalDesmembrarItem] Erro ao carregar locais:', e);
      } finally {
        if (ativo) setCarregandoLocais(false);
      }
    };

    carregarLocais();

    return () => {
      ativo = false;
    };
  }, [isOpen]);

  // Inicializa as frações quando o modal abre com base no item
  useEffect(() => {
    if (!isOpen || !item) {
      setFracoes([]);
      return;
    }

    const numnotaStr = String(grupo?.numnota || item.nunota || '');
    const lotesConf: any[] = (item as any).lotesConferidos || [];
    const novasFracoes: FracaoLoteEditavel[] = [];

    // 1. Frações conferidas pelo coletor
    if (lotesConf.length > 0) {
      lotesConf.forEach((l, idx) => {
        novasFracoes.push({
          id: `conf-${idx}-${Date.now()}`,
          lote: String(l.lote || '').trim(),
          quantidade: Number(l.quantidade) || 0,
          validade: formatarDataSimples(l.validade || item.validade),
          fabricacao: formatarDataSimples(l.fabricacao || item.fabricacao),
          codlocal: l.codlocal ? Number(l.codlocal) : (item as any).codlocalDestino ? Number((item as any).codlocalDestino) : undefined,
          isFalta: false,
        });
      });
    } else {
      const qtdFisica = Number(item.qtdN3 > 0 ? item.qtdN3 : item.qtdN2 > 0 ? item.qtdN2 : item.qtdN1) || 0;
      if (qtdFisica > 0) {
        novasFracoes.push({
          id: `conf-single-${Date.now()}`,
          lote: String(item.lote || item.controleOriginal || '').trim(),
          quantidade: qtdFisica,
          validade: formatarDataSimples(item.validade || item.validadeOriginal),
          fabricacao: formatarDataSimples(item.fabricacao || item.fabricacaoOriginal),
          codlocal: (item as any).codlocalDestino ? Number((item as any).codlocalDestino) : (item as any).codlocal ? Number((item as any).codlocal) : undefined,
          isFalta: false,
        });
      }
    }

    // 2. Fração faltante (saldo negativo de falta) com o número da nota como lote
    if (item.diferenca < 0) {
      const qtdFalta = Math.abs(item.diferenca);
      novasFracoes.push({
        id: `falta-${Date.now()}`,
        lote: numnotaStr,
        quantidade: qtdFalta,
        validade: formatarDataSimples(item.validadeOriginal || item.validade),
        fabricacao: formatarDataSimples(item.fabricacaoOriginal || item.fabricacao),
        codlocal: (item as any).codlocalDestino ? Number((item as any).codlocalDestino) : undefined,
        isFalta: true,
      });
    }

    // Se por acaso ainda não tiver nenhuma linha criada, cria uma linha padrão com a quantidade esperada
    if (novasFracoes.length === 0) {
      novasFracoes.push({
        id: `default-${Date.now()}`,
        lote: item.lote || item.controleOriginal || numnotaStr,
        quantidade: item.qtdEsperada,
        validade: formatarDataSimples(item.validade || item.validadeOriginal),
        fabricacao: formatarDataSimples(item.fabricacao || item.fabricacaoOriginal),
        codlocal: (item as any).codlocalDestino ? Number((item as any).codlocalDestino) : (item as any).codlocal ? Number((item as any).codlocal) : undefined,
        isFalta: false,
      });
    }

    setFracoes(novasFracoes);
  }, [isOpen, item, grupo]);

  if (!isOpen || !item) return null;

  const numnota = grupo?.numnota || item.nunota;
  const qtdEsperadaTotal = Number(item.qtdEsperada) || 0;
  const somaAtual = fracoes.reduce((acc, f) => acc + (Number(f.quantidade) || 0), 0);
  const diferencaBalanco = Number((qtdEsperadaTotal - somaAtual).toFixed(4));
  const isSomaCorreta = Math.abs(diferencaBalanco) < 0.0001;

  const lotesPreenchidos = fracoes.every((f) => f.lote.trim().length > 0 && f.quantidade > 0);
  const datasValidas = fracoes.every((f) => {
    const valOk = f.validade.trim() ? validarData(completarAnoData(f.validade), false).valida : true;
    const fabOk = f.fabricacao.trim() ? validarData(completarAnoData(f.fabricacao), false).valida : true;
    return valOk && fabOk;
  });
  const podeConfirmar = isSomaCorreta && lotesPreenchidos && datasValidas && fracoes.length > 0 && !loading;

  // Comparativos de divergência
  const loteErp = item.controleOriginal || '';
  const valErp = formatarDataSimples(item.validadeOriginal);
  const fabErp = formatarDataSimples(item.fabricacaoOriginal);

  const lotesConf: any[] = (item as any).lotesConferidos || [];
  const valColetor = formatarDataSimples(item.validade);
  const fabColetor = formatarDataSimples(item.fabricacao);

  const temDivergenciaValidade = Boolean(valErp && valColetor && valErp !== valColetor);
  const temDivergenciaFabricacao = Boolean(fabErp && fabColetor && fabErp !== fabColetor);
  const temDivergenciaLote = Boolean(
    lotesConf.length > 1 || (loteErp && item.lote && loteErp.toUpperCase() !== item.lote.toUpperCase())
  );

  const handleUpdateFracao = (id: string, campo: keyof FracaoLoteEditavel, valor: any) => {
    setFracoes((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        return { ...f, [campo]: valor };
      })
    );
  };

  const handleRemoverFracao = (id: string) => {
    if (fracoes.length <= 1) return;
    setFracoes((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAdicionarFracao = () => {
    setFracoes((prev) => [
      ...prev,
      {
        id: `nova-${Date.now()}`,
        lote: '',
        quantidade: diferencaBalanco > 0 ? diferencaBalanco : 0,
        validade: valErp || valColetor || '',
        fabricacao: fabErp || fabColetor || '',
        codlocal: (item as any).codlocalDestino ? Number((item as any).codlocalDestino) : undefined,
        isFalta: false,
      },
    ]);
  };

  // Ações globais para todas as frações
  const handleAplicarTodasDoColetor = () => {
    setFracoes((prev) =>
      prev.map((f) => ({
        ...f,
        validade: valColetor || f.validade,
        fabricacao: fabColetor || f.fabricacao,
      }))
    );
  };

  const handleAplicarTodasDoErp = () => {
    setFracoes((prev) =>
      prev.map((f) => ({
        ...f,
        validade: valErp || f.validade,
        fabricacao: fabErp || f.fabricacao,
      }))
    );
  };

  // Funções para controle da busca e seleção de locais de estoque (TGFLOC)
  const abrirBuscaLocal = (fracaoId: string) => {
    setFracaoAlvoLocalId(fracaoId);
    setTermoBuscaLocal('');
    setModalBuscaLocalAberto(true);
  };

  const fecharBuscaLocal = () => {
    setModalBuscaLocalAberto(false);
    setFracaoAlvoLocalId(null);
    setTermoBuscaLocal('');
  };

  const selecionarLocalParaFracao = (codlocal?: number) => {
    if (fracaoAlvoLocalId) {
      handleUpdateFracao(fracaoAlvoLocalId, 'codlocal', codlocal);
    }
    fecharBuscaLocal();
  };

  const obterDescricaoLocal = (codlocal?: number): string | null => {
    if (codlocal === undefined || codlocal === null) return null;
    const encontrado = locaisEstoque.find((l) => l.codlocal === codlocal);
    return encontrado ? encontrado.descrlocal : null;
  };

  const fracaoAlvo = fracoes.find((f) => f.id === fracaoAlvoLocalId);

  const locaisFiltrados = useMemo(() => {
    if (!termoBuscaLocal.trim()) return locaisEstoque;
    const t = termoBuscaLocal.toLowerCase().trim();
    return locaisEstoque.filter(
      (loc) =>
        String(loc.codlocal).includes(t) ||
        loc.descrlocal.toLowerCase().includes(t)
    );
  }, [locaisEstoque, termoBuscaLocal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeConfirmar) return;

    const payloadLotes = fracoes.map((f) => ({
      lote: f.lote.trim(),
      qtd: Number(f.quantidade),
      dtval: f.validade.trim() ? completarAnoData(f.validade.trim()) : undefined,
      dtfab: f.fabricacao.trim() ? completarAnoData(f.fabricacao.trim()) : undefined,
      codlocal: f.codlocal !== undefined && !isNaN(Number(f.codlocal)) ? Number(f.codlocal) : undefined,
    }));

    await onConfirmar({
      nunota: item.nunota,
      sequencia: item.sequencia,
      lotes: payloadLotes,
    });
  };

  // Percentual para a barra de progresso visual
  const percentualBalanco = qtdEsperadaTotal > 0
    ? Math.min(100, Math.max(0, Math.round((somaAtual / qtdEsperadaTotal) * 100)))
    : 100;

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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '12px',
      }}
    >
      <div
        className="modal-desmembrar-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          color: 'var(--slate-900, #0f172a)',
          borderRadius: '14px',
          maxWidth: '820px',
          width: '96%',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--slate-200, #e2e8f0)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
      >
        {/* Cabeçalho Slim com Indicador de Status */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                border: '1px solid #dbeafe',
              }}
            >
              ✂️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  Desmembrar Item no Sankhya
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: isSomaCorreta ? '#ecfdf5' : diferencaBalanco > 0 ? '#fffbeb' : '#fef2f2',
                    color: isSomaCorreta ? '#065f46' : diferencaBalanco > 0 ? '#92400e' : '#991b1b',
                    border: `1px solid ${isSomaCorreta ? '#a7f3d0' : diferencaBalanco > 0 ? '#fde68a' : '#fca5a5'}`,
                  }}
                >
                  {isSomaCorreta
                    ? `✓ Balanço 100% OK (${somaAtual}/${qtdEsperadaTotal} ${item.codvol || 'UN'})`
                    : diferencaBalanco > 0
                    ? `⚠️ Falta distribuir ${diferencaBalanco} ${item.codvol || 'UN'}`
                    : `⚠️ Excesso de ${Math.abs(diferencaBalanco)} ${item.codvol || 'UN'}`}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '1px' }}>
                Nota Fiscal <strong style={{ color: 'var(--slate-700)' }}>#{numnota}</strong> • NUNOTA <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{item.nunota}</span> • Sequência {item.sequencia}
              </p>
            </div>
          </div>
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
          >
            ✕
          </button>
        </div>

        {/* Conteúdo com scroll otimizado */}
        <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Card Resumo do Produto com Barra de Progresso Integrada */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--slate-200, #e2e8f0)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ minWidth: '220px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.90rem', color: 'var(--slate-900)' }}>
                  {item.descrprod}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '1px' }}>
                  Cód: <strong>{item.codprod}</strong> {item.referencia ? ` • Ref: ${item.referencia}` : ''} • Vol: <strong>{item.codvol || 'UN'}</strong>
                </div>
              </div>

              {/* Indicador Numérico e Barra de Balanço */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#ffffff',
                  border: '1px solid var(--slate-200)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--slate-400)', fontWeight: 600 }}>
                    Total Faturado
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--slate-800)' }}>
                    {qtdEsperadaTotal} <span style={{ fontSize: '0.70rem', fontWeight: 500, color: 'var(--slate-500)' }}>{item.codvol || 'UN'}</span>
                  </div>
                </div>

                <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginBottom: '3px' }}>
                    <span style={{ color: 'var(--slate-600)' }}>Frações:</span>
                    <span style={{ color: isSomaCorreta ? '#15803d' : diferencaBalanco > 0 ? '#b45309' : '#b91c1c', marginLeft: '6px' }}>
                      {somaAtual} / {qtdEsperadaTotal} ({percentualBalanco}%)
                    </span>
                  </div>
                  <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '4px',
                        width: `${percentualBalanco}%`,
                        background: isSomaCorreta ? '#10b981' : diferencaBalanco > 0 ? '#f59e0b' : '#ef4444',
                        transition: 'all 0.25s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dica da Regra de Desmembramento - Compacta e Elegante */}
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--slate-600)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingTop: '4px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <span>💡</span>
              <span>
                <strong>Regra:</strong> Itens conferidos mantêm os lotes físicos. Faltas entram com o nº da NF (<strong style={{ color: 'var(--slate-800)' }}>{numnota}</strong>) como lote para isolamento no ERP.
              </span>
            </div>
          </div>

          {/* PAINEL COMPARATIVO DE DIVERGÊNCIAS (ERP vs COLETOR) - SMART DIFF */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--slate-200)', borderRadius: '8px', padding: '8px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--slate-600)' }}>
                  🔍 Comparativo ERP vs Coletor
                </span>
                {temDivergenciaLote && (
                  <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    ⚠️ Lote Divergente
                  </span>
                )}
                {temDivergenciaValidade && (
                  <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    ⚠️ Validade Divergente
                  </span>
                )}
                {temDivergenciaFabricacao && (
                  <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    ⚠️ Fabricação Divergente
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {/* Lado ERP */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderLeft: '3px solid #3b82f6',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.74rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1d4ed8', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                  <span>📄 Dados no ERP (Nota Fiscal)</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>1 linha original</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Lote ERP:</span>
                  <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-800)', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                    {loteErp || <em style={{ color: '#94a3b8' }}>Sem lote</em>}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-600)' }}>
                  <span>Validade / Fabr.:</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {valErp || '—'} <span style={{ color: '#cbd5e1' }}>|</span> {fabErp || '—'}
                  </span>
                </div>
              </div>

              {/* Lado Coletor */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #a7f3d0',
                  borderLeft: '3px solid #10b981',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.74rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#047857', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                  <span>📱 Coletor Físico (Bipado)</span>
                  <span style={{ fontSize: '0.68rem', color: '#059669' }}>
                    {lotesConf.length > 0 ? `${lotesConf.length} lotes conferidos` : '1 contagem física'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Lotes Bipados:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'flex-end' }}>
                    {lotesConf.length > 0 ? (
                      lotesConf.map((lc, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#065f46',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {lc.lote} ({lc.quantidade})
                        </span>
                      ))
                    ) : (
                      <strong style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--slate-800)' }}>
                        {item.lote || <em style={{ color: '#94a3b8' }}>Sem lote</em>}
                      </strong>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--slate-600)' }}>
                  <span>Validade / Fabr.:</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--slate-800)' }}>
                    {valColetor || '—'} <span style={{ color: '#cbd5e1' }}>|</span> {fabColetor || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA DE FRAÇÕES DE LOTE - SLIM LINE (SEM ROLAGEM DESPERDIÇADA) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.80rem', color: 'var(--slate-800)' }}>
                  Frações de Lote a Desmembrar ({fracoes.length})
                </span>
                <button
                  type="button"
                  onClick={handleAdicionarFracao}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  + Nova Linha
                </button>
              </div>

              {/* Botões de Ação Global de Datas */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(valColetor || fabColetor) && (
                  <button
                    type="button"
                    onClick={handleAplicarTodasDoColetor}
                    className="chip-acao-rapida bip"
                    title="Preenche a Validade e Fabricação de todas as frações com os dados do Coletor"
                    style={{ padding: '2px 8px', fontSize: '0.70rem', fontWeight: 700 }}
                  >
                    ⚡ Copiar Datas Coletor
                  </button>
                )}
                {(valErp || fabErp) && (
                  <button
                    type="button"
                    onClick={handleAplicarTodasDoErp}
                    className="chip-acao-rapida erp"
                    title="Preenche a Validade e Fabricação de todas as frações com os dados do ERP"
                    style={{ padding: '2px 8px', fontSize: '0.70rem', fontWeight: 700 }}
                  >
                    ⚡ Copiar Datas ERP
                  </button>
                )}
              </div>
            </div>

            {/* Tabela com Linhas Slim (36px cada) */}
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--slate-200)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', color: 'var(--slate-400)', fontWeight: 700, width: '26px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '6px 10px', color: 'var(--slate-600)', fontWeight: 700, width: '25%' }}>Lote / Controle</th>
                    <th style={{ padding: '6px 10px', color: 'var(--slate-600)', fontWeight: 700, width: '15%' }}>Quantidade</th>
                    <th style={{ padding: '6px 10px', color: 'var(--slate-600)', fontWeight: 700, width: '17%' }}>Validade</th>
                    <th style={{ padding: '6px 10px', color: 'var(--slate-600)', fontWeight: 700, width: '17%' }}>Fabricação</th>
                    <th style={{ padding: '6px 10px', color: 'var(--slate-600)', fontWeight: 700, width: '23%' }} title="Local de Estoque no ERP (CODLOCAL) - Digite o código ou clique em 🔍 para pesquisar">Local ERP</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center', width: '28px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fracoes.map((fracao, idx) => (
                    <tr
                      key={fracao.id}
                      style={{
                        borderBottom: idx < fracoes.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: fracao.isFalta ? '#fffbeb' : '#ffffff',
                      }}
                    >
                      {/* Índice */}
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
                        {idx + 1}
                      </td>

                      {/* Campo Lote com Chip Inline ERP */}
                      <td style={{ padding: '4px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <input
                            type="text"
                            value={fracao.lote}
                            onChange={(e) => handleUpdateFracao(fracao.id, 'lote', e.target.value)}
                            placeholder="Lote..."
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: fracao.lote.trim() ? '1px solid #cbd5e1' : '1px solid #ef4444',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--slate-900)',
                            }}
                          />
                          {loteErp && loteErp !== fracao.lote && (
                            <button
                              type="button"
                              className="chip-acao-rapida erp"
                              onClick={() => handleUpdateFracao(fracao.id, 'lote', loteErp)}
                              title={`Substituir pelo lote do ERP (${loteErp})`}
                              style={{ padding: '2px 5px', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}
                            >
                              ERP
                            </button>
                          )}
                          {fracao.isFalta && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                              title="Lote de falta gerado com o número da NF"
                            >
                              Falta
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Campo Quantidade com UN */}
                      <td style={{ padding: '4px 10px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            value={fracao.quantidade || ''}
                            onChange={(e) => handleUpdateFracao(fracao.id, 'quantidade', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '4px 22px 4px 8px',
                              borderRadius: '4px',
                              border: fracao.quantidade > 0 ? '1px solid #cbd5e1' : '1px solid #ef4444',
                              fontWeight: 800,
                              textAlign: 'right',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.78rem',
                              color: 'var(--slate-900)',
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              right: '6px',
                              fontSize: '0.65rem',
                              color: '#94a3b8',
                              pointerEvents: 'none',
                              fontWeight: 600,
                            }}
                          >
                            {item.codvol || 'UN'}
                          </span>
                        </div>
                      </td>

                      {/* Campo Validade */}
                      <td style={{ padding: '4px 10px' }}>
                        <input
                          type="text"
                          value={fracao.validade}
                          onChange={(e) =>
                            handleUpdateFracao(
                              fracao.id,
                              'validade',
                              aplicarMascaraData(e.target.value)
                            )
                          }
                          onBlur={() => {
                            const dataComp = completarAnoData(fracao.validade);
                            handleUpdateFracao(fracao.id, 'validade', dataComp);
                          }}
                          placeholder="DD/MM/AAAA"
                          title={
                            fracao.validade.trim() &&
                            !validarData(completarAnoData(fracao.validade), false).valida
                              ? validarData(completarAnoData(fracao.validade), false).erro
                              : undefined
                          }
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border:
                              fracao.validade.trim() &&
                              !validarData(completarAnoData(fracao.validade), false).valida
                                ? '1px solid #ef4444'
                                : '1px solid #cbd5e1',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.75rem',
                            color: 'var(--slate-800)',
                            background:
                              fracao.validade.trim() &&
                              !validarData(completarAnoData(fracao.validade), false).valida
                                ? '#fef2f2'
                                : '#ffffff',
                          }}
                        />
                      </td>

                      {/* Campo Fabricação */}
                      <td style={{ padding: '4px 10px' }}>
                        <input
                          type="text"
                          value={fracao.fabricacao}
                          onChange={(e) =>
                            handleUpdateFracao(
                              fracao.id,
                              'fabricacao',
                              aplicarMascaraData(e.target.value)
                            )
                          }
                          onBlur={() => {
                            const dataComp = completarAnoData(fracao.fabricacao);
                            handleUpdateFracao(fracao.id, 'fabricacao', dataComp);
                          }}
                          placeholder="DD/MM/AAAA"
                          title={
                            fracao.fabricacao.trim() &&
                            !validarData(completarAnoData(fracao.fabricacao), false).valida
                              ? validarData(completarAnoData(fracao.fabricacao), false).erro
                              : undefined
                          }
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border:
                              fracao.fabricacao.trim() &&
                              !validarData(completarAnoData(fracao.fabricacao), false).valida
                                ? '1px solid #ef4444'
                                : '1px solid #cbd5e1',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.75rem',
                            color: 'var(--slate-800)',
                            background:
                              fracao.fabricacao.trim() &&
                              !validarData(completarAnoData(fracao.fabricacao), false).valida
                                ? '#fef2f2'
                                : '#ffffff',
                          }}
                        />
                      </td>

                      {/* Campo Local ERP com Botão de Pesquisa 🔍 */}
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              value={fracao.codlocal !== undefined ? fracao.codlocal : ''}
                              onChange={(e) =>
                                handleUpdateFracao(
                                  fracao.id,
                                  'codlocal',
                                  e.target.value !== '' ? parseInt(e.target.value, 10) : undefined
                                )
                              }
                              placeholder="Padrão"
                              title={
                                obterDescricaoLocal(fracao.codlocal)
                                  ? `Local ${fracao.codlocal}: ${obterDescricaoLocal(fracao.codlocal)}`
                                  : 'Local de estoque de destino no Sankhya (ex: 99 para Avaria, 98 Vencido, 95 Validade Próxima)'
                              }
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: fracao.codlocal !== undefined ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '0.75rem',
                                textAlign: 'center',
                                fontWeight: 700,
                                color: fracao.codlocal !== undefined ? '#b45309' : 'var(--slate-800)',
                                background: fracao.codlocal !== undefined ? '#fffbeb' : '#ffffff',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => abrirBuscaLocal(fracao.id)}
                              title="Pesquisar local de estoque no Sankhya (TGFLOC)"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px 7px',
                                background: fracao.codlocal !== undefined ? '#fef3c7' : '#f1f5f9',
                                border: fracao.codlocal !== undefined ? '1px solid #fcd34d' : '1px solid #cbd5e1',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                color: fracao.codlocal !== undefined ? '#b45309' : '#475569',
                                flexShrink: 0,
                                height: '26px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e2e8f0';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = fracao.codlocal !== undefined ? '#fef3c7' : '#f1f5f9';
                              }}
                            >
                              🔍
                            </button>
                          </div>
                          {fracao.codlocal !== undefined && (
                            <div
                              style={{
                                fontSize: '0.64rem',
                                color: '#b45309',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '140px',
                              }}
                              title={`[${fracao.codlocal}] ${obterDescricaoLocal(fracao.codlocal) || 'Local selecionado'}`}
                            >
                              {obterDescricaoLocal(fracao.codlocal) || `Local ${fracao.codlocal}`}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Remover Linha */}
                      <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {fracoes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverFracao(fracao.id)}
                            title="Remover fração"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              padding: '2px',
                              borderRadius: '4px',
                              lineHeight: 1,
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rodapé Slim com Ações */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--slate-200, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
            <span>
              Ação no ERP: Gerará <strong>{fracoes.length} sequências</strong> correspondentes na nota fiscal.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!podeConfirmar}
              style={{
                padding: '6px 18px',
                borderRadius: '6px',
                border: 'none',
                background: podeConfirmar ? '#2563eb' : '#94a3b8',
                color: '#ffffff',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: podeConfirmar ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: podeConfirmar ? '0 1px 2px rgba(37, 99, 235, 0.2)' : 'none',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border-sm" />
                  Desmembrando no ERP...
                </>
              ) : (
                'Confirmar e Desmembrar no Sankhya'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Submodal de Pesquisa e Seleção de Local de Estoque (TGFLOC) */}
      <ModalPesquisaLocalEstoque
        isOpen={modalBuscaLocalAberto}
        onClose={fecharBuscaLocal}
        onSelecionar={(codlocal) => selecionarLocalParaFracao(codlocal)}
        codlocalAtual={fracaoAlvo?.codlocal}
        tituloContexto={
          fracaoAlvo
            ? `Fração Lote: ${fracaoAlvo.lote || '(Sem Lote)'} • Qtd: ${fracaoAlvo.quantidade} ${item.codvol || 'UN'}`
            : undefined
        }
      />
    </div>
  );
};
