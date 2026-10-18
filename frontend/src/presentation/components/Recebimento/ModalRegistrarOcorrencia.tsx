import React, { useState, useRef, useEffect } from 'react';
import {
  TipoOcorrenciaRecebimento,
  RegistrarOcorrenciaInput,
  OcorrenciaRecebimento,
  LocalEstoqueItem,
  ProdutoCatalogoItem,
} from '../../../domain/models/OcorrenciaRecebimento';
import { RecebimentoApiService } from '../../../infrastructure/api/RecebimentoApiService';
import { aplicarMascaraData, completarAnoData, validarData } from '../../utils/dateMaskHelper';

export interface ModalRegistrarOcorrenciaProps {
  isOpen: boolean;
  onClose: () => void;
  conferenciaId?: string;
  nunota?: number;
  item?: {
    codprod?: number;
    descrprod?: string;
    sequencia?: number;
    lote?: string;
    validade?: string;
    fabricacao?: string;
    qtdEsperada?: number;
    quantidadeSugerida?: number;
  };
  tipoPredefinido?: TipoOcorrenciaRecebimento;
  ocorrenciaEdicao?: OcorrenciaRecebimento;
  origem?: 'COLETOR' | 'GESTAO';
  usuario?: string;
  onSalvar: (dados: RegistrarOcorrenciaInput) => Promise<void>;
}

// Ocorrências exclusivas permitidas no momento da conferência de entrada (coletor)
const TIPOS_COLETOR: TipoOcorrenciaRecebimento[] = ['AVARIA', 'VENCIDO', 'VALIDADE_PROXIMA'];

const TIPOS_OCORRENCIA: Array<{
  valor: TipoOcorrenciaRecebimento;
  label: string;
  emoji: string;
  localSugerido: number;
}> = [
  { valor: 'AVARIA', label: 'Avaria (Danificado / Quebrado)', emoji: '💥', localSugerido: 99 },
  { valor: 'VENCIDO', label: 'Produto Vencido', emoji: '⏳', localSugerido: 98 },
  { valor: 'VALIDADE_PROXIMA', label: 'Validade Próxima (Shelf-life)', emoji: '⚠️', localSugerido: 95 },
  { valor: 'PRODUTO_TROCADO', label: 'Produto Trocado (Item Divergente)', emoji: '🔄', localSugerido: 99 },
  { valor: 'NAO_IDENTIFICADO', label: 'Produto Não Identificado', emoji: '❓', localSugerido: 99 },
  { valor: 'FALTA', label: 'Falta de Mercadoria', emoji: '📉', localSugerido: 99 },
  { valor: 'SOBRA', label: 'Sobra de Mercadoria', emoji: '📈', localSugerido: 99 },
  { valor: 'DIVERGENCIA_LOTE', label: 'Divergência de Lote', emoji: '🏷️', localSugerido: 99 },
  { valor: 'DIVERGENCIA_VALIDADE', label: 'Divergência de Validade', emoji: '📅', localSugerido: 99 },
  { valor: 'QUANTIDADE_DIVERGENTE', label: 'Quantidade Divergente', emoji: '🔢', localSugerido: 99 },
];

const recebimentoService = new RecebimentoApiService();

export const ModalRegistrarOcorrencia: React.FC<ModalRegistrarOcorrenciaProps> = ({
  isOpen,
  onClose,
  conferenciaId,
  nunota,
  item,
  tipoPredefinido,
  ocorrenciaEdicao,
  origem,
  usuario,
  onSalvar,
}) => {
  const [nunotaInput, setNunotaInput] = useState<string>(
    nunota ? String(nunota) : ocorrenciaEdicao?.nunota ? String(ocorrenciaEdicao.nunota) : ''
  );

  const isOrigemNota = Boolean(
    nunota ||
    ocorrenciaEdicao?.nunota ||
    item ||
    conferenciaId ||
    ocorrenciaEdicao?.conferenciaId ||
    origem === 'COLETOR' ||
    ocorrenciaEdicao?.origem === 'COLETOR'
  );

  // Campo unificado de produto e estado de seleção
  const [textoProduto, setTextoProduto] = useState<string>(
    item?.descrprod || ocorrenciaEdicao?.descrprod || ''
  );
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCatalogoItem | null>(
    item?.descrprod
      ? {
          codprod: item.codprod,
          descrprod: item.descrprod,
          fonte: 'SANKHYA',
        }
      : ocorrenciaEdicao?.descrprod
      ? {
          codprod: ocorrenciaEdicao.codprod,
          descrprod: ocorrenciaEdicao.descrprod,
          fonte: ocorrenciaEdicao.codprod ? 'SANKHYA' : 'AVULSO',
        }
      : null
  );

  // Controle de busca e popup de produtos
  const [buscandoProduto, setBuscandoProduto] = useState<boolean>(false);
  const [popupResultados, setPopupResultados] = useState<ProdutoCatalogoItem[]>([]);
  const [modalPopupAberto, setModalPopupAberto] = useState<boolean>(false);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);

  const tiposDisponiveis =
    origem === 'COLETOR'
      ? TIPOS_OCORRENCIA.filter((t) => TIPOS_COLETOR.includes(t.valor))
      : TIPOS_OCORRENCIA;

  const [tipo, setTipo] = useState<TipoOcorrenciaRecebimento>(
    ocorrenciaEdicao?.tipo || tipoPredefinido || 'AVARIA'
  );
  const [quantidade, setQuantidade] = useState<string>(
    ocorrenciaEdicao
      ? String(ocorrenciaEdicao.quantidade)
      : item?.quantidadeSugerida
      ? String(item.quantidadeSugerida)
      : '1'
  );
  const [lote, setLote] = useState<string>(
    ocorrenciaEdicao?.lote || item?.lote || ''
  );
  const [validade, setValidade] = useState<string>(
    ocorrenciaEdicao?.validade || item?.validade || ''
  );
  const [fabricacao, setFabricacao] = useState<string>(
    ocorrenciaEdicao?.fabricacao || item?.fabricacao || ''
  );
  const [motivo, setMotivo] = useState<string>(
    ocorrenciaEdicao?.motivo || ''
  );

  const [codlocalDestino, setCodlocalDestino] = useState<string>(
    ocorrenciaEdicao?.codlocalDestino
      ? String(ocorrenciaEdicao.codlocalDestino)
      : String(
          TIPOS_OCORRENCIA.find((t) => t.valor === (ocorrenciaEdicao?.tipo || tipoPredefinido || 'AVARIA'))
            ?.localSugerido || 99
        )
  );

  const [locaisEstoque, setLocaisEstoque] = useState<LocalEstoqueItem[]>([]);
  const [carregandoLocais, setCarregandoLocais] = useState<boolean>(false);

  const [fotos, setFotos] = useState<string[]>(ocorrenciaEdicao?.fotos || []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar locais de estoque da TGFLOC ao abrir o modal
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
        console.warn('[ModalRegistrarOcorrencia] Erro ao carregar locais:', e);
      } finally {
        if (ativo) setCarregandoLocais(false);
      }
    };

    carregarLocais();

    return () => {
      ativo = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTipoChange = (novoTipo: TipoOcorrenciaRecebimento) => {
    setTipo(novoTipo);
    const config = TIPOS_OCORRENCIA.find((t) => t.valor === novoTipo);
    if (config) {
      setCodlocalDestino(String(config.localSugerido));
    }
  };

  // Executar busca de produto e abrir o popup com os resultados
  const handleExecutarBuscaProduto = async () => {
    const termo = textoProduto.trim();
    if (!termo) {
      setErro('Informe um código, código de barras ou descrição para pesquisar.');
      return;
    }

    setBuscandoProduto(true);
    setErro(null);

    const resultadosColetados: ProdutoCatalogoItem[] = [];

    try {
      // 1. Consulta o catálogo de produtos do Sankhya (TGFPRO / TGFBAR)
      const catalogo = await recebimentoService.buscarCatalogoProdutos(termo);
      if (catalogo && catalogo.length > 0) {
        catalogo.forEach((p) => {
          resultadosColetados.push({
            ...p,
            fonte: 'SANKHYA',
          });
        });
      }

      // 2. Se for código de barras ou se a busca na base não trouxe nada, consulta na internet
      const apenasDigitos = termo.replace(/\D/g, '');
      if (apenasDigitos.length >= 8) {
        try {
          const respInternet = await recebimentoService.buscarProdutoInternet(apenasDigitos);
          if (respInternet && respInternet.encontrado && respInternet.descrprod) {
            resultadosColetados.push({
              descrprod: respInternet.descrprod,
              marca: respInternet.marca,
              codbarra: respInternet.codbarra || apenasDigitos,
              imagemUrl: respInternet.imagemUrl,
              fonte: 'INTERNET',
            });
          }
        } catch (e) {
          console.warn('Erro ao consultar na internet:', e);
        }
      }

      if (resultadosColetados.length > 0) {
        setPopupResultados(resultadosColetados);
        setModalPopupAberto(true);
      } else {
        setErro(
          '⚠️ Nenhum produto encontrado no cadastro do Sankhya nem na internet. Você pode utilizar a descrição digitada como produto avulso (anexo de foto obrigatório).'
        );
      }
    } catch (err: any) {
      console.error('[ModalRegistrarOcorrencia] Erro na busca:', err);
      setErro(err?.response?.data?.error || err.message || 'Erro ao consultar produto.');
    } finally {
      setBuscandoProduto(false);
    }
  };

  const handleSelecionarProdutoPopup = (prod: ProdutoCatalogoItem) => {
    setProdutoSelecionado(prod);
    setTextoProduto(prod.descrprod);
    setModalPopupAberto(false);
    setErro(null);
  };

  const handleUsarTextoComoAvulso = () => {
    setProdutoSelecionado({
      descrprod: textoProduto.trim(),
      fonte: 'AVULSO',
    });
    setModalPopupAberto(false);
  };

  const handleLimparSelecaoProduto = () => {
    setProdutoSelecionado(null);
    setTextoProduto('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setFotos((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (e.target) {
      e.target.value = '';
    }
  };

  const removerFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const descrFinal = (produtoSelecionado?.descrprod || textoProduto).trim();
    if (!descrFinal) {
      setErro('Informe ou selecione a descrição do produto.');
      return;
    }

    const qtdNum = Number(quantidade.replace(',', '.'));
    if (isNaN(qtdNum) || qtdNum <= 0) {
      setErro('Informe uma quantidade válida maior que zero.');
      return;
    }

    const codprodFinal = produtoSelecionado?.codprod;
    const semCodigoSankhya = !codprodFinal;

    // REGRA DE NEGÓCIO: Se o produto não possui código de cadastro no Sankhya, a foto é OBRIGATÓRIA
    if (semCodigoSankhya && fotos.length === 0) {
      setErro(
        '⚠️ O produto informado não possui código cadastrado no Sankhya. É obrigatório anexar ao menos 1 foto comprobatória para registrar esta ocorrência.'
      );
      return;
    }

    if (validade.trim()) {
      const valRes = validarData(completarAnoData(validade), false);
      if (!valRes.valida) {
        setErro(`Data de validade inválida: ${valRes.erro}`);
        return;
      }
    }

    if (!fabricacao.trim()) {
      setErro('Data de fabricação é obrigatória.');
      return;
    }
    const fabRes = validarData(completarAnoData(fabricacao), true);
    if (!fabRes.valida) {
      setErro(`Data de fabricação inválida: ${fabRes.erro}`);
      return;
    }

    let localNum: number | undefined = undefined;
    if (origem !== 'COLETOR') {
      localNum = Number(codlocalDestino);
      if (isNaN(localNum) || localNum < 0) {
        setErro('Selecione um Local de Estoque de destino válido da TGFLOC.');
        return;
      }
    }

    setSalvando(true);
    try {
      const nunotaFinal = nunota || (nunotaInput && nunotaInput.trim() ? Number(nunotaInput) : undefined);

      await onSalvar({
        conferenciaId: conferenciaId || undefined,
        nunota: nunotaFinal,
        sequencia: item?.sequencia,
        codprod: codprodFinal,
        descrprod: descrFinal,
        tipo,
        quantidade: qtdNum,
        lote: lote.trim() || undefined,
        validade: validade.trim() ? completarAnoData(validade) : undefined,
        fabricacao: fabricacao.trim() ? completarAnoData(fabricacao) : undefined,
        motivo: motivo.trim() || undefined,
        codlocalDestino: localNum,
        fotos,
        origem: origem || 'COLETOR',
        criadoPor: usuario,
      });
      onClose();
    } catch (err: any) {
      setErro(err?.response?.data?.error || err.message || 'Erro ao registrar ocorrência.');
    } finally {
      setSalvando(false);
    }
  };

  const semCodigoSankhya = !produtoSelecionado?.codprod;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '12px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            animation: 'fadeInModal 0.2s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--slate-200, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                {ocorrenciaEdicao ? 'Editar Ocorrência' : 'Registrar Ocorrência / Avaria'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {nunota ? `NF #${nunota}` : 'Ocorrência Avulsa'} {item?.descrprod ? `• ${item.descrprod}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {erro && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                }}
              >
                ⚠️ {erro}
              </div>
            )}

            {/* 1. Número da Nota Fiscal */}
            {isOrigemNota ? (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  <span>🔒 NUNOTA da Nota Fiscal</span>
                  <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.70rem' }}>(Conferência - Somente Leitura)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={nunota ? `NF #${nunota}` : ocorrenciaEdicao?.nunota ? `NF #${ocorrenciaEdicao.nunota}` : 'Conferência de Entrada'}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  <span>NUNOTA da Nota Fiscal</span>
                  <span style={{ fontWeight: 500, color: '#94a3b8' }}>(Opcional)</span>
                </label>
                <input
                  type="number"
                  value={nunotaInput}
                  onChange={(e) => setNunotaInput(e.target.value)}
                  placeholder="Ex: 60766 (deixe em branco se for avulso/sem nota)"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {/* 2. Campo Unificado de Produto (com Busca ou Seleção Direta) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Produto *
              </label>

              {produtoSelecionado ? (
                // Card do Produto Selecionado
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {/* Miniatura com clique para zoom */}
                    <div
                      onClick={() => {
                        const imgUrl =
                          produtoSelecionado.imagemUrl ||
                          (produtoSelecionado.codprod
                            ? `/api/crud/produto/${produtoSelecionado.codprod}/imagem`
                            : null);
                        if (imgUrl) setImagemAmpliada(imgUrl);
                      }}
                      title="Clique para ampliar a imagem"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#ffffff',
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: 'zoom-in',
                      }}
                    >
                      {(() => {
                        const imgUrl =
                          produtoSelecionado.imagemUrl ||
                          (produtoSelecionado.codprod
                            ? `/api/crud/produto/${produtoSelecionado.codprod}/imagem`
                            : null);
                        return imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={produtoSelecionado.descrprod}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent && !parent.querySelector('.fallback-box')) {
                                const span = document.createElement('span');
                                span.className = 'fallback-box';
                                span.innerText = '📦';
                                span.style.fontSize = '1.4rem';
                                parent.appendChild(span);
                              }
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.4rem' }}>📦</span>
                        );
                      })()}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        {produtoSelecionado.codprod ? (
                          <span style={{ background: '#166534', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontSize: '0.70rem', fontWeight: 800 }}>
                            Cód: #{produtoSelecionado.codprod}
                          </span>
                        ) : (
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontSize: '0.70rem', fontWeight: 800 }}>
                            🌐 {produtoSelecionado.fonte === 'INTERNET' ? 'Internet' : 'Avulso'}
                          </span>
                        )}
                        {produtoSelecionado.marca && (
                          <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                            {produtoSelecionado.marca}
                          </span>
                        )}
                        {produtoSelecionado.codbarra && (
                          <span style={{ fontSize: '0.70rem', color: '#166534', fontFamily: 'monospace' }}>
                            EAN: {produtoSelecionado.codbarra}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          color: '#14532d',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={produtoSelecionado.descrprod}
                      >
                        {produtoSelecionado.descrprod}
                      </div>
                    </div>
                  </div>

                  {!item && !isOrigemNota ? (
                    <button
                      type="button"
                      onClick={handleLimparSelecaoProduto}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #86efac',
                        background: '#ffffff',
                        color: '#166534',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Alterar produto selecionado"
                    >
                      ✕ Trocar
                    </button>
                  ) : isOrigemNota ? (
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#e2e8f0',
                        color: '#475569',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Item vinculado à conferência de entrada. Edição do produto bloqueada."
                    >
                      🔒 Fixo
                    </span>
                  ) : null}
                </div>
              ) : (
                // Input Unificado para Digitação Livre ou Busca
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={textoProduto}
                      onChange={(e) => setTextoProduto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleExecutarBuscaProduto();
                        }
                      }}
                      placeholder="Digite o código, código de barras (EAN) ou nome do produto..."
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleExecutarBuscaProduto}
                      disabled={buscandoProduto}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: buscandoProduto ? '#94a3b8' : '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: buscandoProduto ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                      }}
                    >
                      {buscandoProduto ? '⏳ Buscando...' : '🔍 Buscar Produto'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                    💡 Dica: Clique em <strong>Buscar Produto</strong> para abrir a lista de opções com fotos, ou digite um nome livre para lançar como item avulso.
                  </span>
                </div>
              )}
            </div>

            {/* 3. Tipo de Ocorrência */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Tipo de Ocorrência *
              </label>
              <select
                value={tipo}
                onChange={(e) => handleTipoChange(e.target.value as TipoOcorrenciaRecebimento)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  background: '#ffffff',
                  fontWeight: 600,
                }}
              >
                {tiposDisponiveis.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>

              {/* Sinalizações explicativas de regras de negócio */}
              {tipo === 'VENCIDO' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                    fontSize: '0.78rem',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>⛔ Atenção (Produto Vencido):</strong> A data de validade informada expirou. Esta quantidade <strong>será contabilizada na conferência física</strong> e a ocorrência será enviada para o gestor definir o local e o desmembramento.
                </div>
              )}

              {tipo === 'VALIDADE_PROXIMA' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    color: '#92400e',
                    fontSize: '0.78rem',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>⚠️ Alerta de Shelf-Life (Validade Próxima):</strong> Lote com vencimento próximo ao prazo limite. A quantidade <strong>será contabilizada na conferência física</strong> e o gestor definirá o local de estoque na aba de Divergências ou Ocorrências.
                </div>
              )}

              {tipo === 'AVARIA' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    color: '#0369a1',
                    fontSize: '0.78rem',
                    lineHeight: '1.4',
                  }}
                >
                  <strong>📦 Produto Avariado:</strong> A quantidade <strong>será contabilizada na conferência física</strong>. Anexe fotos do dano. O gestor definirá o local na gestão de ocorrências/divergências.
                </div>
              )}
            </div>

            {/* 4. Linha: Quantidade e Local no Sankhya (TGFLOC) */}
            <div style={{ display: 'grid', gridTemplateColumns: origem === 'COLETOR' ? '1fr' : '140px 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Quantidade Afetada *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 10"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {origem !== 'COLETOR' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Local de Estoque ERP (TGFLOC) *
                  </label>
                  <select
                    value={codlocalDestino}
                    onChange={(e) => setCodlocalDestino(e.target.value)}
                    disabled={carregandoLocais}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    {locaisEstoque.length > 0 ? (
                      locaisEstoque.map((loc) => (
                        <option key={loc.codlocal} value={loc.codlocal}>
                          [{loc.codlocal}] {loc.descrlocal}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="99">[99] AVARIA / BLOQUEADO</option>
                        <option value="98">[98] PRODUTO VENCIDO</option>
                        <option value="95">[95] VALIDADE PRÓXIMA (SHELF-LIFE)</option>
                        <option value="0">[0] PADRÃO / GERAL</option>
                      </>
                    )}
                  </select>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Local analítico de destino no Sankhya
                  </span>
                </div>
              ) : null}
            </div>

            {origem === 'COLETOR' && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>ℹ️</span>
                <span>
                  O <strong>Local de Estoque ERP</strong> não é preenchido na conferência de entrada. Ficará como pendência para o gestor atuar e definir na gestão de recebimento.
                </span>
              </div>
            )}

            {/* 5. Linha: Lote e Datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Lote
                </label>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value.toUpperCase())}
                  placeholder="Ex: LOTE123"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Validade
                </label>
                <input
                  type="text"
                  value={validade}
                  onChange={(e) => setValidade(aplicarMascaraData(e.target.value))}
                  onBlur={() => setValidade(completarAnoData(validade))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Fabricação *
                </label>
                <input
                  type="text"
                  required
                  value={fabricacao}
                  onChange={(e) => setFabricacao(aplicarMascaraData(e.target.value))}
                  onBlur={() => setFabricacao(completarAnoData(fabricacao))}
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* 6. Motivo / Descrição */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Motivo / Descrição da Ocorrência
              </label>
              <textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Embalagem externa molhada e rasgada com 5 unidades quebradas."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.80rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 7. Fotos e Evidências com Validação de Obrigatoriedade */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    Fotos / Evidências ({fotos.length})
                  </label>
                  {semCodigoSankhya && (
                    <span
                      style={{
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                      }}
                    >
                      * Obrigatória (Sem cód. Sankhya)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📷</span>
                  <span>Tirar Foto / Anexar</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {fotos.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px',
                    maxHeight: '130px',
                    overflowY: 'auto',
                  }}
                >
                  {fotos.map((foto, idx) => (
                    <div
                      key={`foto-${idx}`}
                      style={{
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      <img
                        src={foto}
                        alt={`Evidência ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => removerFoto(idx)}
                        title="Remover foto"
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    border: semCodigoSankhya ? '1px dashed #ef4444' : '1px dashed #cbd5e1',
                    background: semCodigoSankhya ? '#fffdfd' : 'transparent',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: semCodigoSankhya ? '#b91c1c' : '#94a3b8',
                    fontWeight: semCodigoSankhya ? 600 : 400,
                  }}
                >
                  {semCodigoSankhya
                    ? '⚠️ Atenção: Anexe ao menos 1 foto para permitir o registro de produtos não cadastrados.'
                    : 'Nenhuma foto anexada. Use a câmera para registrar a avaria.'}
                </div>
              )}
            </div>

            {/* Rodapé de Ações */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={salvando}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: salvando ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando || (semCodigoSankhya && fotos.length === 0)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: semCodigoSankhya && fotos.length === 0 ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: salvando || (semCodigoSankhya && fotos.length === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                }}
                title={
                  semCodigoSankhya && fotos.length === 0
                    ? 'Anexe ao menos 1 foto para salvar produto sem código Sankhya'
                    : 'Salvar ocorrência'
                }
              >
                {salvando ? 'Salvando Ocorrência...' : '✓ Salvar Ocorrência'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* POPUP DE SELEÇÃO DE PRODUTOS COM IMAGENS */}
      {modalPopupAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100001,
            padding: '16px',
          }}
          onClick={() => setModalPopupAberto(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '82vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'fadeInModal 0.15s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Popup */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📦</span>
                  <span>Produtos Encontrados ({popupResultados.length})</span>
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Clique no produto correspondente para preencher automaticamente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPopupAberto(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Lista com scroll e miniaturas */}
            <div
              style={{
                overflowY: 'auto',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {popupResultados.map((prod, idx) => {
                const imgUrl = prod.imagemUrl || (prod.codprod ? `/api/crud/produto/${prod.codprod}/imagem` : null);
                return (
                  <div
                    key={`${prod.codprod || prod.codbarra || idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {/* Miniatura da Imagem - Clicar para Expandir */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (imgUrl) setImagemAmpliada(imgUrl);
                      }}
                      title={imgUrl ? 'Clique para ampliar a imagem' : undefined}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: imgUrl ? 'zoom-in' : 'default',
                      }}
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={prod.descrprod}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent && !parent.querySelector('.fallback-box')) {
                              const span = document.createElement('span');
                              span.className = 'fallback-box';
                              span.innerText = '📦';
                              span.style.fontSize = '1.5rem';
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.5rem' }}>📦</span>
                      )}
                    </div>

                    {/* Informações do Produto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        {prod.codprod ? (
                          <span
                            style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                            }}
                          >
                            #{prod.codprod}
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                            }}
                          >
                            🌐 Internet
                          </span>
                        )}

                        {prod.marca && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {prod.marca}
                          </span>
                        )}

                        {prod.codbarra && (
                          <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            EAN: {prod.codbarra}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={prod.descrprod}
                      >
                        {prod.descrprod}
                      </div>
                    </div>

                    {/* Botão Selecionar - Escolhe o produto */}
                    <button
                      type="button"
                      onClick={() => handleSelecionarProdutoPopup(prod)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#16a34a',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#15803d';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#16a34a';
                      }}
                    >
                      Selecionar
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Rodapé do Popup */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid #f1f5f9',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={handleUsarTextoComoAvulso}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Não é nenhum desses? Usar termo como produto avulso
              </button>
              <button
                type="button"
                onClick={() => setModalPopupAberto(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom da Imagem Ampliada */}
      {imagemAmpliada && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            zIndex: 100010,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setImagemAmpliada(null)}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Visualização do Produto
              </span>
              <button
                type="button"
                onClick={() => setImagemAmpliada(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={imagemAmpliada}
              alt="Produto ampliado"
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
            <div style={{ marginTop: '14px', width: '100%', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setImagemAmpliada(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
