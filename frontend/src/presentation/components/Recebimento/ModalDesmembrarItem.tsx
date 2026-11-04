import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  // Estados de etapas de processamento e feedback de erro
  const [etapaProgresso, setEtapaProgresso] = useState<0 | 1 | 2 | 3>(0);
  const [erroProcessamento, setErroProcessamento] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const etapaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Limpeza de timers e reset de etapas
  useEffect(() => {
    if (!isOpen) {
      setEtapaProgresso(0);
      setErroProcessamento(null);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (etapaTimerRef.current) clearTimeout(etapaTimerRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (etapaTimerRef.current) clearTimeout(etapaTimerRef.current);
    };
  }, []);

  // Inicializa as frações quando o modal abre com base no item
  useEffect(() => {
    if (!isOpen || !item) {
      setFracoes([]);
      return;
    }

    setEtapaProgresso(0);
    setErroProcessamento(null);

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
        codlocal: undefined, // Campo vazio para o usuário editar e selecionar o local específico da falta
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
  const faltasComLocalDefinido = fracoes
    .filter((f) => f.isFalta)
    .every((f) => f.codlocal !== undefined && !isNaN(Number(f.codlocal)));
  const isProcessando = loading || (etapaProgresso > 0 && etapaProgresso < 3);
  const podeConfirmar = isSomaCorreta && lotesPreenchidos && datasValidas && faltasComLocalDefinido && fracoes.length > 0 && !isProcessando && etapaProgresso === 0;

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
    if (!podeConfirmar || isProcessando || etapaProgresso > 0) return;

    setErroProcessamento(null);
    setEtapaProgresso(1);

    if (etapaTimerRef.current) clearTimeout(etapaTimerRef.current);
    etapaTimerRef.current = setTimeout(() => {
      setEtapaProgresso((prev) => (prev === 1 ? 2 : prev));
    }, 1200);

    try {
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

      if (etapaTimerRef.current) clearTimeout(etapaTimerRef.current);
      setEtapaProgresso(3);

      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (etapaTimerRef.current) clearTimeout(etapaTimerRef.current);
      setEtapaProgresso(0);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao processar desmembramento no Sankhya.';
      setErroProcessamento(msg);
    }
  };

  // Percentual para a barra de progresso visual
  const percentualBalanco = qtdEsperadaTotal > 0
    ? Math.min(100, Math.max(0, Math.round((somaAtual / qtdEsperadaTotal) * 100)))
    : 100;

  return (
    <div
      className="gestao-modal-backdrop"
      onClick={() => {
        if (!isProcessando) onClose();
      }}
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
            onClick={() => {
              if (!isProcessando) onClose();
            }}
            disabled={isProcessando}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: isProcessando ? 'not-allowed' : 'pointer',
              color: isProcessando ? '#cbd5e1' : 'var(--slate-400)',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
            title={isProcessando ? 'Processamento em andamento...' : 'Fechar'}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo com scroll otimizado */}
        <div style={{ padding: '14px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* STEPPER VISUAL DE PROCESSO (ETAPAS 1 -> 2 -> 3) */}
          {etapaProgresso > 0 && (
            <div
              style={{
                background: etapaProgresso === 3 ? '#f0fdf4' : '#f8fafc',
                border: `1.5px solid ${etapaProgresso === 3 ? '#86efac' : '#93c5fd'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.15rem' }}>
                    {etapaProgresso === 3 ? '🎉' : '⚙️'}
                  </span>
                  <strong style={{ fontSize: '0.86rem', color: etapaProgresso === 3 ? '#166534' : '#1e40af' }}>
                    {etapaProgresso === 1 && '1. Desmembrando item no Sankhya ERP...'}
                    {etapaProgresso === 2 && '2. Atualizando locais de estoque e ocorrências...'}
                    {etapaProgresso === 3 && '3. Desmembramento concluído com sucesso!'}
                  </strong>
                </div>
                <span
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    color: etapaProgresso === 3 ? '#15803d' : '#2563eb',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {etapaProgresso === 1 ? '35%' : etapaProgresso === 2 ? '75%' : '100%'}
                </span>
              </div>

              {/* Barra de Progresso Animada */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: etapaProgresso === 3 ? '#dcfce7' : '#e2e8f0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: etapaProgresso === 1 ? '35%' : etapaProgresso === 2 ? '75%' : '100%',
                    height: '100%',
                    background: etapaProgresso === 3 ? '#10b981' : '#2563eb',
                    borderRadius: '6px',
                    transition: 'width 0.4s ease-in-out',
                  }}
                />
              </div>

              {/* Badges de 3 Etapas */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  fontSize: '0.72rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: etapaProgresso >= 1 ? (etapaProgresso > 1 ? '#15803d' : '#1d4ed8') : '#94a3b8',
                    fontWeight: etapaProgresso === 1 ? 800 : 600,
                  }}
                >
                  <span>{etapaProgresso > 1 ? '✓' : etapaProgresso === 1 ? '●' : '○'}</span>
                  <span>1. Desmembrar no ERP</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: etapaProgresso >= 2 ? (etapaProgresso > 2 ? '#15803d' : '#1d4ed8') : '#94a3b8',
                    fontWeight: etapaProgresso === 2 ? 800 : 600,
                  }}
                >
                  <span>{etapaProgresso > 2 ? '✓' : etapaProgresso === 2 ? '●' : '○'}</span>
                  <span>2. Atualizar Locais</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: etapaProgresso === 3 ? '#15803d' : '#94a3b8',
                    fontWeight: etapaProgresso === 3 ? 800 : 600,
                  }}
                >
                  <span>{etapaProgresso === 3 ? '✓' : '○'}</span>
                  <span>3. Concluído</span>
                </div>
              </div>
            </div>
          )}

          {/* BANNER DE ERRO EXPLICÍTO DENTRO DO MODAL */}
          {erroProcessamento && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #ef4444',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>❌</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.80rem' }}>
                  Falha ao processar desmembramento no Sankhya:
                </div>
                <div style={{ color: '#b91c1c', fontSize: '0.74rem', marginTop: '2px', wordBreak: 'break-word', lineHeight: 1.4 }}>
                  {erroProcessamento}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErroProcessamento(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#991b1b',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '0 4px',
                }}
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          )}
          
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

            {/* Alerta Bloqueante caso haja Sobra Física */}
            {diferencaBalanco < 0 && (
              <div
                style={{
                  marginTop: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #f87171',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.76rem',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <div style={{ lineHeight: '1.4' }}>
                  <strong>Bloqueio de Sobra Física:</strong> Foram conferidas <strong>{somaAtual} {item.codvol || 'UN'}</strong> para uma nota de <strong>{qtdEsperadaTotal} {item.codvol || 'UN'}</strong> (+{Math.abs(diferencaBalanco)} de sobra).
                  <div style={{ marginTop: '2px', fontSize: '0.72rem', color: '#b91c1c' }}>
                    O Sankhya não permite desmembrar itens com excesso físico. Feche este modal e utilize o botão <strong>"Gerar Ocorrência de Sobra"</strong> para abater o excedente antes de realizar o desmembramento.
                  </div>
                </div>
              </div>
            )}
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
                  disabled={isProcessando}
                  style={{
                    background: isProcessando ? '#f1f5f9' : '#eff6ff',
                    border: `1px solid ${isProcessando ? '#cbd5e1' : '#bfdbfe'}`,
                    color: isProcessando ? '#94a3b8' : '#1d4ed8',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: isProcessando ? 'not-allowed' : 'pointer',
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
                    disabled={isProcessando}
                    className="chip-acao-rapida bip"
                    title="Preenche a Validade e Fabricação de todas as frações com os dados do Coletor"
                    style={{ padding: '2px 8px', fontSize: '0.70rem', fontWeight: 700, opacity: isProcessando ? 0.5 : 1, cursor: isProcessando ? 'not-allowed' : 'pointer' }}
                  >
                    ⚡ Copiar Datas Coletor
                  </button>
                )}
                {(valErp || fabErp) && (
                  <button
                    type="button"
                    onClick={handleAplicarTodasDoErp}
                    disabled={isProcessando}
                    className="chip-acao-rapida erp"
                    title="Preenche a Validade e Fabricação de todas as frações com os dados do ERP"
                    style={{ padding: '2px 8px', fontSize: '0.70rem', fontWeight: 700, opacity: isProcessando ? 0.5 : 1, cursor: isProcessando ? 'not-allowed' : 'pointer' }}
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
                    <th style={{ padding: '6px 10px', color: 'var(--slate-600)', fontWeight: 700, width: '23%' }}>Local ERP</th>
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
                            disabled={isProcessando}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: fracao.lote.trim() ? '1px solid #cbd5e1' : '1px solid #ef4444',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: 'var(--slate-900)',
                              background: isProcessando ? '#f8fafc' : '#ffffff',
                            }}
                          />
                          {loteErp && loteErp !== fracao.lote && (
                            <button
                              type="button"
                              className="chip-acao-rapida erp"
                              onClick={() => handleUpdateFracao(fracao.id, 'lote', loteErp)}
                              disabled={isProcessando}
                              title={`Substituir pelo lote do ERP (${loteErp})`}
                              style={{ padding: '2px 5px', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0, opacity: isProcessando ? 0.5 : 1, cursor: isProcessando ? 'not-allowed' : 'pointer' }}
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
                            disabled={isProcessando}
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
                              background: isProcessando ? '#f8fafc' : '#ffffff',
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
                          disabled={isProcessando}
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
                            background: isProcessando
                              ? '#f8fafc'
                              : fracao.validade.trim() &&
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
                          disabled={isProcessando}
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
                            background: isProcessando
                              ? '#f8fafc'
                              : fracao.fabricacao.trim() &&
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
                              disabled={isProcessando}
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
                                background: isProcessando ? '#f8fafc' : fracao.codlocal !== undefined ? '#fffbeb' : '#ffffff',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => abrirBuscaLocal(fracao.id)}
                              disabled={isProcessando}
                              title="Pesquisar local de estoque no Sankhya (TGFLOC)"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px 7px',
                                background: isProcessando ? '#f1f5f9' : fracao.codlocal !== undefined ? '#fef3c7' : '#f1f5f9',
                                border: fracao.codlocal !== undefined ? '1px solid #fcd34d' : '1px solid #cbd5e1',
                                borderRadius: '4px',
                                cursor: isProcessando ? 'not-allowed' : 'pointer',
                                fontSize: '0.75rem',
                                color: isProcessando ? '#94a3b8' : fracao.codlocal !== undefined ? '#b45309' : '#475569',
                                flexShrink: 0,
                                height: '26px',
                                transition: 'all 0.15s ease',
                                opacity: isProcessando ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isProcessando) e.currentTarget.style.background = '#e2e8f0';
                              }}
                              onMouseLeave={(e) => {
                                if (!isProcessando) e.currentTarget.style.background = fracao.codlocal !== undefined ? '#fef3c7' : '#f1f5f9';
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
                            disabled={isProcessando}
                            title="Remover fração"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isProcessando ? '#e2e8f0' : '#cbd5e1',
                              cursor: isProcessando ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              padding: '2px',
                              borderRadius: '4px',
                              lineHeight: 1,
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isProcessando) e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              if (!isProcessando) e.currentTarget.style.color = '#cbd5e1';
                            }}
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
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: podeConfirmar ? '#10b981' : '#f59e0b' }} />
            <span>
              {!faltasComLocalDefinido ? (
                <strong style={{ color: '#b45309' }}>
                  ⚠️ Selecione o Local de Estoque de destino no ERP para a fração de FALTA (botão 🔍 Local ERP).
                </strong>
              ) : (
                <>
                  Ação no ERP: Gerará <strong>{fracoes.length} sequências</strong> correspondentes na nota fiscal.
                </>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {etapaProgresso === 3 ? (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '7px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                }}
              >
                ✅ Concluir Agora (fechando...)
              </button>
            ) : isProcessando ? (
              <>
                <button
                  type="button"
                  disabled
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#94a3b8',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled
                  style={{
                    padding: '6px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.80rem',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: 0.95,
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.35)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  {etapaProgresso === 1 ? '1. Desmembrando no Sankhya ERP...' : '2. Atualizando locais e ocorrências...'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
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
                  Confirmar e Desmembrar no Sankhya
                </button>
              </>
            )}
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
