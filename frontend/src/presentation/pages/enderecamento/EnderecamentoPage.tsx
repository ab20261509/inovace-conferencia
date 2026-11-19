import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { AppLayout, AppHeader, ModalCameraScanner } from '../../components';
import { ProdutoImagem } from '../../components/common/ProdutoImagem';
import { EnderecoChips } from '../../components/common/EnderecoChips';
import { ModalImpressaoEtiquetas } from '../../components/enderecamento/ModalImpressaoEtiquetas';
import { useAuth } from '../../../application/contexts/AuthContext';
import {
  ProdutoEnderecamentoDetalhe,
  EnderecoAnaliticoItem,
  RegistroHistoricoEnderecamento,
  TipoEnderecoWMS,
  enderecamentoApiService,
} from '../../../infrastructure/api/EnderecamentoApiService';
import './EnderecamentoPage.css';

function tocarSom(tipo: 'sucesso' | 'erro') {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (tipo === 'sucesso') {
        navigator.vibrate(60);
      } else {
        navigator.vibrate([120, 80, 220]);
      }
    }
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (tipo === 'sucesso') {
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    }
  } catch {
    // Silencioso
  }
}

export function EnderecamentoPage() {
  const { isAuthenticated, temPermissao } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const podeManipular = temPermissao('enderecamento_manipular') || temPermissao('gerenciar_acessos');
  const podeCadastrar = temPermissao('enderecamento_cadastrar') || temPermissao('gerenciar_acessos');

  // Abas: Invertidas conforme solicitado (1º Endereço, 2º Produto, 3º Histórico)
  const [abaAtiva, setAbaAtiva] = useState<'ENDERECO' | 'PRODUTO' | 'HISTORICO'>('ENDERECO');
  const [painelBuscaAberto, setPainelBuscaAberto] = useState(true);

  // ═══ ESTADOS: ABA POR ENDEREÇO (ANALÍTICO) ═══
  const [filtroDeposito, setFiltroDeposito] = useState('');
  const [filtroRua, setFiltroRua] = useState('');
  const [filtroTorre, setFiltroTorre] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroPosicao, setFiltroPosicao] = useState('');
  const [filtroTipoEnd, setFiltroTipoEnd] = useState<'TODOS' | 'PICKING' | 'PULMAO'>('TODOS');
  const [filtroOcupacao, setFiltroOcupacao] = useState<'TODOS' | 'LIVRES' | 'OCUPADOS'>('TODOS');
  const [enderecosAnaliticos, setEnderecosAnaliticos] = useState<EnderecoAnaliticoItem[]>([]);
  const [carregandoAnalitico, setCarregandoAnalitico] = useState(false);

  // ═══ ESTADOS: IMPRESSÃO DE ETIQUETAS WMS ═══
  const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false);
  const [enderecosSelecionadosParaImpressao, setEnderecosSelecionadosParaImpressao] = useState<Set<number>>(new Set());

  const handleToggleSelecaoItem = (codend: number) => {
    setEnderecosSelecionadosParaImpressao((prev) => {
      const next = new Set(prev);
      if (next.has(codend)) {
        next.delete(codend);
      } else {
        next.add(codend);
      }
      return next;
    });
  };

  const handleToggleSelecionarTodos = (marcar: boolean) => {
    if (marcar) {
      const todosCods = new Set(enderecosAnaliticos.map((item) => item.codend));
      setEnderecosSelecionadosParaImpressao(todosCods);
    } else {
      setEnderecosSelecionadosParaImpressao(new Set());
    }
  };

  // ═══ ESTADOS: ABA POR PRODUTO ═══
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtos, setProdutos] = useState<ProdutoEnderecamentoDetalhe[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [enderecoSelecionadoContexto, setEnderecoSelecionadoContexto] = useState<{
    codend: number;
    endereco: string;
    descrend?: string | null;
    tipo?: string;
  } | null>(null);

  // ═══ ESTADOS: ABA HISTÓRICO ═══
  const [historico, setHistorico] = useState<RegistroHistoricoEnderecamento[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // ═══ ESTADOS: MODO COLETOR / CADASTRO RÁPIDO ═══
  const [modalColetorAberto, setModalColetorAberto] = useState(false);
  const [coletorEndereco, setColetorEndereco] = useState('');
  const [coletorEnderecoInfo, setColetorEnderecoInfo] = useState<{
    codend: number;
    endereco: string;
    descrend?: string | null;
    tipo: TipoEnderecoWMS;
  } | null>(null);
  const [coletorTravarEndereco, setColetorTravarEndereco] = useState(true);
  const [faseColetor, setFaseColetor] = useState<1 | 2 | 3>(1);
  const [ultimoItemCadastrado, setUltimoItemCadastrado] = useState<FeedItemColetor | null>(null);

  interface ItemPendenteColetor {
    id: string;
    codprod: number;
    descrprod: string;
    codbarra?: string | null;
    referencia?: string | null;
    codvol: string;
    lote?: string;
    endereco: string;
    tipo: TipoEnderecoWMS;
    confirmarSubstituicaoPicking?: boolean;
  }
  const [listaItensPendentes, setListaItensPendentes] = useState<ItemPendenteColetor[]>([]);
  const [listaConcluidaSucesso, setListaConcluidaSucesso] = useState(false);

  const [coletorProduto, setColetorProduto] = useState('');
  const [coletorLote, setColetorLote] = useState('');
  const [coletorSalvando, setColetorSalvando] = useState(false);
  const [coletorFeedback, setColetorFeedback] = useState<{
    tipo: 'sucesso' | 'aviso' | 'erro';
    texto: string;
  } | null>(null);

  interface FeedItemColetor {
    id: string;
    hora: string;
    codprod: number;
    descrprod: string;
    codbarra?: string | null;
    endereco: string;
    tipo: TipoEnderecoWMS;
    status: 'SUCESSO' | 'JA_CADASTRADO';
  }
  const [coletorFeed, setColetorFeed] = useState<FeedItemColetor[]>([]);

  const [confirmacaoPicking, setConfirmacaoPicking] = useState<{
    codprod: number;
    descrprod: string;
    codbarra?: string | null;
    pickingAnterior: { codend: number; endereco: string; descrend?: string | null };
    novoEndereco: { codend: number; endereco: string; descrend?: string | null };
  } | null>(null);

  // Estados de Pré-visualização e Double-Scan de confirmação
  const [produtoPrevia, setProdutoPrevia] = useState<ProdutoEnderecamentoDetalhe | null>(null);
  const [codigoBipadoPrimeiro, setCodigoBipadoPrimeiro] = useState('');
  const [coletorDivergenciaMsg, setColetorDivergenciaMsg] = useState<string | null>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);

  // Leitor de Câmera (Android / Smartphones)
  const [cameraAtiva, setCameraAtiva] = useState<'ENDERECO' | 'PRODUTO' | null>(null);

  const coletorEndRef = React.useRef<HTMLInputElement>(null);
  const coletorProdRef = React.useRef<HTMLInputElement>(null);
  const coletorConfirmarRef = React.useRef<HTMLInputElement>(null);

  // Mensagens
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Modais
  const [modalMover, setModalMover] = useState<{
    aberto: boolean;
    codprod?: number;
    descrprod?: string;
    codendOrigem?: number;
    enderecoOrigem?: string;
    controle?: string;
  }>({ aberto: false });
  const [destinoMoverInput, setDestinoMoverInput] = useState('');
  const [motivoMoverInput, setMotivoMoverInput] = useState('');
  const [salvandoMover, setSalvandoMover] = useState(false);

  const [modalVincular, setModalVincular] = useState<{
    aberto: boolean;
    codprod?: number;
    descrprod?: string;
    tipo?: TipoEnderecoWMS;
    tipconrest?: string | null;
  }>({ aberto: false });
  const [novoEndInput, setNovoEndInput] = useState('');
  const [loteInput, setLoteInput] = useState('');
  const [tipoVincularInput, setTipoVincularInput] = useState<TipoEnderecoWMS>('PULMAO');
  const [salvandoVincular, setSalvandoVincular] = useState(false);

  const [modalRetirar, setModalRetirar] = useState<{
    aberto: boolean;
    codprod?: number;
    descrprod?: string;
    codend?: number;
    endereco?: string;
    controle?: string;
  }>({ aberto: false });
  const [motivoRetirarInput, setMotivoRetirarInput] = useState('');
  const [salvandoRetirar, setSalvandoRetirar] = useState(false);

  // Carregar Lista Analítica de Endereços
  const carregarEnderecosAnaliticos = useCallback(async () => {
    try {
      setCarregandoAnalitico(true);
      setMensagemErro(null);
      const res = await enderecamentoApiService.listarAnalitico({
        deposito: filtroDeposito.trim() || undefined,
        rua: filtroRua.trim() || undefined,
        torre: filtroTorre.trim() || undefined,
        nivel: filtroNivel.trim() || undefined,
        pos: filtroPosicao.trim() || undefined,
        tipo: filtroTipoEnd,
        ocupacao: filtroOcupacao,
        limite: 150,
      });
      setEnderecosAnaliticos(res);
    } catch (err: any) {
      console.error('Erro ao listar analítico de endereços:', err);
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao carregar endereços.');
    } finally {
      setCarregandoAnalitico(false);
    }
  }, [filtroDeposito, filtroRua, filtroTorre, filtroNivel, filtroPosicao, filtroTipoEnd, filtroOcupacao]);

  // Carregar analítico ao abrir a aba ou mudar filtros
  useEffect(() => {
    if (abaAtiva === 'ENDERECO') {
      carregarEnderecosAnaliticos();
    }
  }, [abaAtiva, carregarEnderecosAnaliticos]);

  // Ao clicar em um endereço da lista analítica -> Ir para aba Produtos
  const handleSelecionarEnderecoParaProdutos = async (item: EnderecoAnaliticoItem) => {
    try {
      setCarregandoProdutos(true);
      setEnderecoSelecionadoContexto({
        codend: item.codend,
        endereco: item.endereco,
        descrend: item.descrend,
        tipo: item.tipo,
      });
      setBuscaProduto('');

      // Buscar produtos que estão nesse endereço pela chave primária (codend)
      const ocupacao = await enderecamentoApiService.buscarPorEndereco(String(item.codend));
      if (ocupacao && ocupacao.produtos && ocupacao.produtos.length > 0) {
        // Obter detalhes de cada produto no endereço diretamente pelos códigos exatos
        const cods = Array.from(new Set(ocupacao.produtos.map((p) => p.codprod)));
        const prods = await enderecamentoApiService.buscarPorCodprods(cods);
        setProdutos(prods);
      } else {
        setProdutos([]);
      }

      setAbaAtiva('PRODUTO');
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao carregar produtos do endereço.');
    } finally {
      setCarregandoProdutos(false);
    }
  };

  // Buscar produtos normalmente por texto
  const handlePesquisarProdutos = async (termo = buscaProduto) => {
    if (!termo.trim()) return;
    try {
      setCarregandoProdutos(true);
      setMensagemErro(null);
      setEnderecoSelecionadoContexto(null); // Limpa filtro de endereço se pesquisou livre
      const res = await enderecamentoApiService.buscarPorProduto(termo.trim());
      setProdutos(res);
      if (res.length === 0) {
        setMensagemErro(`Nenhum produto localizado com o termo '${termo}'.`);
      }
    } catch (err: any) {
      tocarSom('erro');
      setMensagemErro(err.response?.data?.error || err.message || 'Erro ao buscar produtos.');
    } finally {
      setCarregandoProdutos(false);
    }
  };

  // Carregar histórico
  const carregarHistorico = useCallback(async () => {
    try {
      setCarregandoHistorico(true);
      const res = await enderecamentoApiService.listarHistorico({ limite: 100 });
      setHistorico(res);
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  useEffect(() => {
    if (abaAtiva === 'HISTORICO') {
      carregarHistorico();
    }
  }, [abaAtiva, carregarHistorico]);

  // Ações de confirmação
  const handleConfirmarMover = async () => {
    if (!modalMover.codprod || !modalMover.codendOrigem || !destinoMoverInput.trim()) return;
    try {
      setSalvandoMover(true);
      const res = await enderecamentoApiService.movimentar({
        codprod: modalMover.codprod,
        codendOrigem: modalMover.codendOrigem,
        codigoEnderecoDestino: destinoMoverInput.trim(),
        controle: modalMover.controle,
        motivo: motivoMoverInput.trim() || undefined,
      });

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalMover({ aberto: false });
      setDestinoMoverInput('');
      setMotivoMoverInput('');
      setTimeout(() => setMensagemSucesso(null), 5000);

      if (abaAtiva === 'PRODUTO') {
        if (buscaProduto.trim()) handlePesquisarProdutos();
      } else {
        carregarEnderecosAnaliticos();
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao movimentar endereço.');
    } finally {
      setSalvandoMover(false);
    }
  };

  const handleConfirmarVincular = async () => {
    if (!modalVincular.codprod || !novoEndInput.trim()) return;
    try {
      setSalvandoVincular(true);
      const res = await enderecamentoApiService.vincular({
        codprod: modalVincular.codprod,
        codigoEndereco: novoEndInput.trim(),
        controle: loteInput.trim() || undefined,
        tipoEndereco: tipoVincularInput,
      });

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalVincular({ aberto: false });
      setNovoEndInput('');
      setLoteInput('');
      setTimeout(() => setMensagemSucesso(null), 5000);

      if (abaAtiva === 'PRODUTO') {
        if (buscaProduto.trim()) handlePesquisarProdutos();
      } else {
        carregarEnderecosAnaliticos();
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao vincular endereço.');
    } finally {
      setSalvandoVincular(false);
    }
  };

  const handleConfirmarRetirar = async () => {
    if (!modalRetirar.codprod || !modalRetirar.codend) return;
    try {
      setSalvandoRetirar(true);
      const res = await enderecamentoApiService.desenderecar({
        codprod: modalRetirar.codprod,
        codend: modalRetirar.codend,
        controle: modalRetirar.controle,
        motivo: motivoRetirarInput.trim() || undefined,
      });

      tocarSom('sucesso');
      setMensagemSucesso(res.mensagem);
      setModalRetirar({ aberto: false });
      setMotivoRetirarInput('');
      setTimeout(() => setMensagemSucesso(null), 5000);

      if (abaAtiva === 'PRODUTO') {
        if (buscaProduto.trim()) handlePesquisarProdutos();
      } else {
        carregarEnderecosAnaliticos();
      }
    } catch (err: any) {
      tocarSom('erro');
      alert(err.response?.data?.error || err.message || 'Erro ao desendereçar produto.');
    } finally {
      setSalvandoRetirar(false);
    }
  };

  // ═══ HANDLERS DO MODO COLETOR (CADASTRO RÁPIDO) ═══
  // Atalho F2 e Escape no teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && podeCadastrar) {
        e.preventDefault();
        if (modalColetorAberto) {
          handleConcluirEFechar();
        } else {
          handleAbrirModalColetor();
        }
      } else if (e.key === 'Escape') {
        if (imagemAmpliada) {
          e.preventDefault();
          setImagemAmpliada(null);
        } else if (confirmacaoPicking) {
          e.preventDefault();
          setConfirmacaoPicking(null);
          setTimeout(() => coletorProdRef.current?.focus(), 80);
        } else if (modalColetorAberto) {
          if (produtoPrevia) {
            e.preventDefault();
            handleCancelarProdutoPrevia();
          } else if (faseColetor === 2 && !coletorTravarEndereco) {
            e.preventDefault();
            handleVoltarParaEndereco();
          } else if (!coletorSalvando) {
            e.preventDefault();
            handleConcluirEFechar();
          }
        }
      } else if (e.key === 'Enter' && confirmacaoPicking && !coletorSalvando) {
        e.preventDefault();
        handleConfirmarSubstituicaoPicking();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [podeCadastrar, modalColetorAberto, faseColetor, coletorTravarEndereco, produtoPrevia, confirmacaoPicking, coletorSalvando, imagemAmpliada]);

  // Foco automático ao abrir o modal ou alternar fase
  useEffect(() => {
    if (modalColetorAberto) {
      setTimeout(() => {
        if (faseColetor === 1) {
          coletorEndRef.current?.focus();
        } else if (faseColetor === 2) {
          if (produtoPrevia) {
            coletorConfirmarRef.current?.focus();
          } else {
            coletorProdRef.current?.focus();
          }
        }
      }, 100);
    }
  }, [modalColetorAberto, faseColetor, produtoPrevia]);

  // Abrir modal coletor (FAB ou F2)
  const handleAbrirModalColetor = () => {
    setProdutoPrevia(null);
    setColetorProduto('');
    setColetorLote('');
    setColetorFeedback(null);
    setColetorDivergenciaMsg(null);
    if (coletorEnderecoInfo && coletorTravarEndereco) {
      setFaseColetor(2);
      setModalColetorAberto(true);
      setTimeout(() => coletorProdRef.current?.focus(), 120);
    } else {
      setFaseColetor(1);
      setModalColetorAberto(true);
      setTimeout(() => coletorEndRef.current?.focus(), 120);
    }
  };

  // Avançar da Fase 1 (Endereço) para Fase 2 (Produto)
  const handleAvancarParaProduto = () => {
    if (!coletorEnderecoInfo) {
      handleResolverEndereco();
      return;
    }
    setColetorFeedback(null);
    setFaseColetor(2);
    setTimeout(() => coletorProdRef.current?.focus(), 120);
  };

  // Voltar da Fase 2 para Fase 1 (Trocar Endereço)
  const handleVoltarParaEndereco = () => {
    setColetorFeedback(null);
    setProdutoPrevia(null);
    setColetorProduto('');
    setColetorDivergenciaMsg(null);
    setFaseColetor(1);
    setTimeout(() => coletorEndRef.current?.focus(), 120);
  };

  // Remover item individual da lista pendente
  const handleRemoverItemDaLista = (id: string) => {
    setListaItensPendentes((prev) => prev.filter((p) => p.id !== id));
    tocarSom('sucesso');
  };

  // Reiniciar lista para novo lote de cadastros
  const handleReiniciarLista = () => {
    setListaItensPendentes([]);
    setListaConcluidaSucesso(false);
    setProdutoPrevia(null);
    setColetorProduto('');
    setColetorLote('');
    setColetorFeedback(null);
    setColetorDivergenciaMsg(null);
    if (coletorTravarEndereco && coletorEnderecoInfo) {
      setFaseColetor(2);
      setTimeout(() => coletorProdRef.current?.focus(), 100);
    } else {
      setColetorEndereco('');
      setColetorEnderecoInfo(null);
      setFaseColetor(1);
      setTimeout(() => coletorEndRef.current?.focus(), 100);
    }
  };

  // Concluir e fechar
  const handleConcluirEFechar = () => {
    setModalColetorAberto(false);
    setListaItensPendentes([]);
    setListaConcluidaSucesso(false);
    setProdutoPrevia(null);
    setColetorProduto('');
    setColetorLote('');
    setColetorFeedback(null);
    setColetorDivergenciaMsg(null);
    if (!coletorTravarEndereco) {
      setColetorEndereco('');
      setColetorEnderecoInfo(null);
      setFaseColetor(1);
    }
  };

  // Confirmar e gravar em lote toda a lista pendente no Sankhya
  const handleGravarListaFinal = async () => {
    if (listaItensPendentes.length === 0) return;

    try {
      setColetorSalvando(true);
      setColetorFeedback(null);
      let erros = 0;
      let gravados = 0;

      for (const item of listaItensPendentes) {
        try {
          const res = await enderecamentoApiService.cadastrar({
            codigoEndereco: item.endereco,
            termoProduto: String(item.codprod),
            controle: item.lote,
            confirmarSubstituicaoPicking: item.confirmarSubstituicaoPicking || false,
          });

          if (res.status === 'SUCESSO') {
            gravados++;
            const agora = new Date();
            const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const feedItem: FeedItemColetor = {
              id: String(Date.now() + Math.random()),
              hora: horaStr,
              codprod: res.produto.codprod,
              descrprod: res.produto.descrprod,
              codbarra: res.produto.codbarra,
              endereco: res.endereco.endereco,
              tipo: res.endereco.tipo,
              status: 'SUCESSO',
            };
            setColetorFeed((prev) => [feedItem, ...prev.slice(0, 19)]);
          } else {
            erros++;
          }
        } catch {
          erros++;
        }
      }

      if (gravados > 0) {
        tocarSom('sucesso');
        setListaConcluidaSucesso(true);
        setColetorFeedback({
          tipo: 'sucesso',
          texto: `✓ ${gravados} ${gravados === 1 ? 'produto gravado' : 'produtos gravados'} com sucesso no WMS!${erros > 0 ? ` (${erros} falhas)` : ''}`,
        });
        if (abaAtiva === 'ENDERECO') {
          carregarEnderecosAnaliticos();
        }
      } else {
        tocarSom('erro');
        setColetorFeedback({
          tipo: 'erro',
          texto: 'Erro ao gravar itens da lista no Sankhya.',
        });
      }
    } catch (err: any) {
      tocarSom('erro');
      setColetorFeedback({
        tipo: 'erro',
        texto: err.message || 'Erro ao processar lista de cadastros.',
      });
    } finally {
      setColetorSalvando(false);
    }
  };

  // Resolver Endereço digitado / bipado
  const handleResolverEndereco = async (endValor?: string) => {
    const termo = (endValor !== undefined ? endValor : coletorEndereco).trim();
    if (!termo) return;

    try {
      setColetorSalvando(true);
      setColetorFeedback(null);
      const res = await enderecamentoApiService.buscarPorEndereco(termo);
      if (res) {
        setColetorEnderecoInfo({
          codend: res.codend,
          endereco: res.endereco,
          descrend: res.descrend,
          tipo: res.tipo,
        });
        setColetorEndereco(res.endereco);
        // Foca automaticamente no campo do produto
        setTimeout(() => coletorProdRef.current?.focus(), 50);
      } else {
        tocarSom('erro');
        setColetorFeedback({
          tipo: 'erro',
          texto: `Endereço '${termo}' não localizado ou inativo no WMS.`,
        });
        coletorEndRef.current?.select();
      }
    } catch (err: any) {
      tocarSom('erro');
      setColetorFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || err.message || 'Erro ao validar endereço.',
      });
      coletorEndRef.current?.select();
    } finally {
      setColetorSalvando(false);
    }
  };

  // 1º Passo: Localizar produto para pré-visualização na tela
  const handleLocalizarProduto = async (e?: React.FormEvent, termoParam?: string) => {
    if (e) e.preventDefault();
    const endAlvo = coletorEnderecoInfo?.endereco || coletorEndereco.trim();
    const prodAlvo = (termoParam !== undefined ? termoParam : coletorProduto).trim();

    if (!endAlvo) {
      tocarSom('erro');
      setColetorFeedback({ tipo: 'erro', texto: 'Informe ou escanie o Endereço primeiro.' });
      coletorEndRef.current?.focus();
      return;
    }
    if (!prodAlvo) {
      return;
    }

    try {
      setColetorSalvando(true);
      setColetorFeedback(null);
      setColetorDivergenciaMsg(null);

      const prods = await enderecamentoApiService.buscarPorProduto(prodAlvo, 1);
      if (prods && prods.length > 0) {
        const prod = prods[0];

        // 0. Verificar se o produto já está na lista pendente de cadastros
        const jaNaLista = listaItensPendentes.some((p) => p.codprod === prod.codprod);
        if (jaNaLista) {
          tocarSom('erro');
          setColetorFeedback({
            tipo: 'aviso',
            texto: `⚠️ Produto ${prod.codprod} (${prod.descrprod}) já foi incluído nesta lista pendente!`,
          });
          setColetorProduto('');
          coletorProdRef.current?.focus();
          return;
        }

        // 1. Verificar se o produto já está cadastrado no MESMO endereço atual
        const endAtualNorm = endAlvo.replace(/[._]/g, '').toUpperCase();
        const jaCadastradoNeste =
          (prod.picking && prod.picking.endereco.replace(/[._]/g, '').toUpperCase() === endAtualNorm) ||
          (prod.pulmoes && prod.pulmoes.some((p) => p.endereco.replace(/[._]/g, '').toUpperCase() === endAtualNorm));

        if (jaCadastradoNeste) {
          tocarSom('erro');
          setColetorFeedback({
            tipo: 'aviso',
            texto: `⚠️ Produto ${prod.codprod} (${prod.descrprod}) já está cadastrado e ativo no endereço '${endAlvo}'.`,
          });
          setColetorProduto('');
          coletorProdRef.current?.focus();
          return;
        }

        // 2. Se o endereço atual for de PICKING e o produto já tiver outro Picking em outro endereço
        const ehEnderecoDestinoPicking = coletorEnderecoInfo ? coletorEnderecoInfo.tipo === 'PICKING' : true;
        if (
          ehEnderecoDestinoPicking &&
          prod.picking &&
          prod.picking.endereco.replace(/[._]/g, '').toUpperCase() !== endAtualNorm
        ) {
          // Disparar imediatamente o modal popup centralizado de mudança de picking
          setConfirmacaoPicking({
            codprod: prod.codprod,
            descrprod: prod.descrprod,
            codbarra: prod.codbarra,
            pickingAnterior: {
              codend: prod.picking.codend,
              endereco: prod.picking.endereco,
              descrend: prod.picking.descrend,
            },
            novoEndereco: {
              codend: coletorEnderecoInfo?.codend || 0,
              endereco: endAlvo,
              descrend: coletorEnderecoInfo?.descrend,
            },
          });
          setColetorProduto('');
          return;
        }

        // 3. Caso normal: exibe a pré-visualização para o double-scan
        setProdutoPrevia(prod);
        setCodigoBipadoPrimeiro(prodAlvo.toUpperCase());
        setColetorProduto('');
        tocarSom('sucesso');
        setTimeout(() => coletorConfirmarRef.current?.focus(), 80);
      } else {
        tocarSom('erro');
        setColetorFeedback({
          tipo: 'erro',
          texto: `Produto não localizado para o termo '${prodAlvo}'. Verifique o código de barras ou código.`,
        });
        coletorProdRef.current?.select();
      }
    } catch (err: any) {
      tocarSom('erro');
      setColetorFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || err.message || 'Erro ao buscar produto.',
      });
      coletorProdRef.current?.select();
    } finally {
      setColetorSalvando(false);
    }
  };

  // Cancelar pré-visualização do produto para trocar item
  const handleCancelarProdutoPrevia = () => {
    setProdutoPrevia(null);
    setCodigoBipadoPrimeiro('');
    setColetorDivergenciaMsg(null);
    setColetorProduto('');
    setTimeout(() => coletorProdRef.current?.focus(), 80);
  };

  // 2º Passo (Double-Scan ou Clique): Adicionar produto localizado à lista pendente
  const handleIncluirNaLista = (e?: React.FormEvent, codigoParam?: string) => {
    if (e) e.preventDefault();
    if (!produtoPrevia) return;

    const endAlvo = coletorEnderecoInfo?.endereco || coletorEndereco.trim();
    const bipDigitado = (codigoParam !== undefined ? codigoParam : coletorProduto).trim().toUpperCase();

    // Se o operador bipou/digitou algum código no 2º bip, validar se bate com o produto
    if (bipDigitado) {
      const matchCodprod = bipDigitado === String(produtoPrevia.codprod);
      const matchCodbarra = produtoPrevia.codbarra && bipDigitado === produtoPrevia.codbarra.toUpperCase();
      const matchRef = produtoPrevia.referencia && bipDigitado === produtoPrevia.referencia.toUpperCase();
      const matchOriginal = bipDigitado === codigoBipadoPrimeiro;

      if (!matchCodprod && !matchCodbarra && !matchRef && !matchOriginal) {
        tocarSom('erro');
        setColetorDivergenciaMsg(
          `Código bipado (${bipDigitado}) é diferente do produto selecionado (${produtoPrevia.codprod} - ${produtoPrevia.descrprod}). Bipe o mesmo código para confirmar ou clique em Trocar.`
        );
        setColetorProduto('');
        coletorConfirmarRef.current?.focus();
        return;
      }
    }

    const novoItem: ItemPendenteColetor = {
      id: `${produtoPrevia.codprod}-${Date.now()}`,
      codprod: produtoPrevia.codprod,
      descrprod: produtoPrevia.descrprod,
      codbarra: produtoPrevia.codbarra,
      referencia: produtoPrevia.referencia,
      codvol: produtoPrevia.codvol,
      lote: coletorLote.trim() || undefined,
      endereco: endAlvo,
      tipo: (coletorEnderecoInfo?.tipo || 'PICKING') as TipoEnderecoWMS,
      confirmarSubstituicaoPicking: false,
    };

    setListaItensPendentes((prev) => [...prev, novoItem]);
    tocarSom('sucesso');
    setColetorFeedback({
      tipo: 'sucesso',
      texto: `✓ Produto ${produtoPrevia.codprod} adicionado à lista! (${listaItensPendentes.length + 1} na lista)`,
    });

    // Limpa estado de pré-visualização e campos, focando no input de produto
    setProdutoPrevia(null);
    setCodigoBipadoPrimeiro('');
    setColetorProduto('');
    setColetorLote('');
    setColetorDivergenciaMsg(null);
    setTimeout(() => coletorProdRef.current?.focus(), 80);
  };

  // Confirmar transferência de picking e adicionar à lista pendente
  const handleConfirmarSubstituicaoPicking = () => {
    if (!confirmacaoPicking) return;
    const novoItem: ItemPendenteColetor = {
      id: `${confirmacaoPicking.codprod}-${Date.now()}`,
      codprod: confirmacaoPicking.codprod,
      descrprod: confirmacaoPicking.descrprod,
      codbarra: confirmacaoPicking.codbarra,
      referencia: undefined,
      codvol: 'UN',
      lote: coletorLote.trim() || undefined,
      endereco: confirmacaoPicking.novoEndereco.endereco,
      tipo: 'PICKING',
      confirmarSubstituicaoPicking: true,
    };

    setListaItensPendentes((prev) => [...prev, novoItem]);
    setConfirmacaoPicking(null);
    setProdutoPrevia(null);
    setCodigoBipadoPrimeiro('');
    setColetorProduto('');
    setColetorLote('');
    tocarSom('sucesso');
    setColetorFeedback({
      tipo: 'sucesso',
      texto: `✓ Produto ${confirmacaoPicking.codprod} adicionado à lista (Mudança de Picking)! (${listaItensPendentes.length + 1} na lista)`,
    });
    setTimeout(() => coletorProdRef.current?.focus(), 80);
  };

  // Ação rápida: Abrir cadastro diretamente no endereço selecionado (Android & Desktop)
  const handleAbrirCadastroNoEndereco = (item: EnderecoAnaliticoItem) => {
    setColetorEndereco(item.endereco);
    setColetorEnderecoInfo({
      codend: item.codend,
      endereco: item.endereco,
      descrend: item.descrend,
      tipo: item.tipo as TipoEnderecoWMS,
    });
    setColetorTravarEndereco(true);
    setProdutoPrevia(null);
    setColetorProduto('');
    setColetorLote('');
    setColetorFeedback(null);
    setColetorDivergenciaMsg(null);
    setFaseColetor(2);
    setModalColetorAberto(true);
    setTimeout(() => coletorProdRef.current?.focus(), 120);
  };

  // Leitor de Câmera (Android): Callback após leitura com sucesso
  const handleScanCamera = (scannedCode: string) => {
    const cod = scannedCode.trim();
    if (!cod) return;
    const modo = cameraAtiva;
    setCameraAtiva(null);
    tocarSom('sucesso');

    if (modo === 'ENDERECO') {
      setColetorEndereco(cod);
      handleResolverEndereco(cod);
    } else if (modo === 'PRODUTO') {
      setColetorProduto(cod);
      if (!produtoPrevia) {
        handleLocalizarProduto(undefined, cod);
      } else {
        handleIncluirNaLista(undefined, cod);
      }
    }
  };

  const totalListados = enderecosAnaliticos.length;
  const totalOcupados = enderecosAnaliticos.filter((e) => e.totalProdutos > 0).length;
  const totalLivres = enderecosAnaliticos.filter((e) => e.totalProdutos === 0).length;

  return (
    <AppLayout>
      {({ openDrawer, abrirConsultaProduto }) => (
        <div className="enderecamento-container">
          {/* ═══ CABEÇALHO STICKY COM BUSCA E FILTROS RECOLHÍVEIS ═══ */}
          <div className="enderecamento-header-sticky">
            <AppHeader
              titulo="Endereçamento WMS"
              onOpenDrawer={openDrawer}
              onAbrirConsultaProduto={abrirConsultaProduto}
            />

            {/* Banner de Mensagens */}
            {mensagemSucesso && (
              <div
                style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: '#15803d',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ✓ {mensagemSucesso}
              </div>
            )}

            {mensagemErro && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                ⚠️ {mensagemErro}
              </div>
            )}

            {/* Painel de Busca e Filtros no Cabeçalho */}
            <div className="enderecamento-search-sticky-container">
              <div className="enderecamento-search-bar-header">
                <span className="enderecamento-search-bar-title">
                  {abaAtiva === 'ENDERECO' && (
                    <>
                      <span>📍</span>
                      <span>Endereços</span>
                      <span className="enderecamento-search-badge-count">
                        {totalListados} ({totalLivres} livres)
                      </span>
                    </>
                  )}
                  {abaAtiva === 'PRODUTO' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>📦</span>
                      <span>Produtos</span>
                      {produtos.length > 0 && (
                        <span className="enderecamento-search-badge-count">
                          {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                      {enderecoSelecionadoContexto && (
                        <div className="enderecamento-contexto-header-chip">
                          <span style={{ fontSize: 11, color: '#64748b' }}>de</span>
                          <EnderecoChips
                            endereco={enderecoSelecionadoContexto.endereco}
                            descrend={enderecoSelecionadoContexto.descrend}
                            tipo={enderecoSelecionadoContexto.tipo as 'PICKING' | 'PULMAO'}
                            tamanho="compacto"
                          />
                          <button
                            type="button"
                            className="enderecamento-contexto-btn-remover"
                            onClick={() => {
                              setEnderecoSelecionadoContexto(null);
                              setProdutos([]);
                            }}
                            title="Limpar filtro de endereço"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {abaAtiva === 'HISTORICO' && (
                    <>
                      <span>🕒</span>
                      <span>Auditoria e Movimentações</span>
                    </>
                  )}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {abaAtiva === 'ENDERECO' && (
                    <button
                      type="button"
                      className="enderecamento-btn-acao-header"
                      onClick={() => setModalImpressaoAberto(true)}
                      title="Abrir Central de Impressão de Etiquetas WMS"
                    >
                      🖨️ Etiquetas
                    </button>
                  )}
                  {abaAtiva === 'HISTORICO' && (
                    <button
                      type="button"
                      className="enderecamento-btn-acao-header"
                      onClick={carregarHistorico}
                      disabled={carregandoHistorico}
                      title="Atualizar histórico"
                    >
                      {carregandoHistorico ? '...' : '🔄 Atualizar'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="enderecamento-btn-toggle-busca"
                    onClick={() => setPainelBuscaAberto(!painelBuscaAberto)}
                    title={painelBuscaAberto ? 'Ocultar busca e filtros' : 'Mostrar busca e filtros'}
                  >
                    {painelBuscaAberto ? '▲ Recolher' : '🔍 Buscar ▾'}
                  </button>
                </div>
              </div>

              {/* Formulário de Busca e Filtros Recolhível */}
              {painelBuscaAberto && (
                <div className="enderecamento-search-collapsible-body">
                  {abaAtiva === 'ENDERECO' && (
                    <>
                      {/* Linha 1: 4 Campos de Coordenadas (Rua, Torre, Nível, Posição) + Limpar e Filtrar */}
                      <form
                        className="enderecamento-coords-search-row"
                        onSubmit={(e) => {
                          e.preventDefault();
                          carregarEnderecosAnaliticos();
                        }}
                      >
                        <div className="enderecamento-coord-field">
                          <label className="enderecamento-coord-label">DEP</label>
                          <input
                            type="text"
                            className="enderecamento-coord-input"
                            placeholder="—"
                            value={filtroDeposito}
                            onChange={(e) => setFiltroDeposito(e.target.value)}
                            title="Informe o número, lista (1,2) ou intervalo (1-5)"
                          />
                        </div>

                        <div className="enderecamento-coord-field">
                          <label className="enderecamento-coord-label">RUA</label>
                          <input
                            type="text"
                            className="enderecamento-coord-input"
                            placeholder="—"
                            value={filtroRua}
                            onChange={(e) => setFiltroRua(e.target.value)}
                            title="Informe o número, lista (1,2) ou intervalo (1-5)"
                          />
                        </div>

                        <div className="enderecamento-coord-field">
                          <label className="enderecamento-coord-label">TORRE</label>
                          <input
                            type="text"
                            className="enderecamento-coord-input"
                            placeholder="—"
                            value={filtroTorre}
                            onChange={(e) => setFiltroTorre(e.target.value)}
                            title="Informe o número, lista (1,2) ou intervalo (1-5)"
                          />
                        </div>

                        <div className="enderecamento-coord-field">
                          <label className="enderecamento-coord-label">NÍVEL</label>
                          <input
                            type="text"
                            className="enderecamento-coord-input"
                            placeholder="—"
                            value={filtroNivel}
                            onChange={(e) => setFiltroNivel(e.target.value)}
                            title="Informe o número, lista (1,2) ou intervalo (1-5)"
                          />
                        </div>

                        <div className="enderecamento-coord-field">
                          <label className="enderecamento-coord-label">POSIÇÃO</label>
                          <input
                            type="text"
                            className="enderecamento-coord-input"
                            placeholder="—"
                            value={filtroPosicao}
                            onChange={(e) => setFiltroPosicao(e.target.value)}
                            title="Informe o número, lista (1,2) ou intervalo (1-5)"
                          />
                        </div>

                        <div className="enderecamento-coords-actions">
                          {(filtroDeposito || filtroRua || filtroTorre || filtroNivel || filtroPosicao) && (
                            <button
                              type="button"
                              className="enderecamento-coord-clear-btn"
                              onClick={() => {
                                setFiltroDeposito('');
                                setFiltroRua('');
                                setFiltroTorre('');
                                setFiltroNivel('');
                                setFiltroPosicao('');
                              }}
                              title="Limpar filtros"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            type="submit"
                            className="enderecamento-btn-filtrar-compact"
                            disabled={carregandoAnalitico}
                          >
                            {carregandoAnalitico ? '...' : 'Filtrar'}
                          </button>
                        </div>
                      </form>

                      {/* Linha 2: Dropdowns de Tipo e Ocupação */}
                      <div className="enderecamento-dropdowns-row">
                        <div className="enderecamento-dropdown-group">
                          <label className="enderecamento-dropdown-label">Tipo:</label>
                          <select
                            className="enderecamento-select-compact"
                            value={filtroTipoEnd}
                            onChange={(e) => setFiltroTipoEnd(e.target.value as any)}
                          >
                            <option value="TODOS">Todos os Tipos</option>
                            <option value="PICKING">Picking</option>
                            <option value="PULMAO">Pulmão</option>
                          </select>
                        </div>

                        <div className="enderecamento-dropdown-group">
                          <label className="enderecamento-dropdown-label">Ocupação:</label>
                          <select
                            className="enderecamento-select-compact"
                            value={filtroOcupacao}
                            onChange={(e) => setFiltroOcupacao(e.target.value as any)}
                          >
                            <option value="TODOS">Todas Ocupações</option>
                            <option value="LIVRES">🟢 Livres / Vazios</option>
                            <option value="OCUPADOS">🔴 Ocupados</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {abaAtiva === 'PRODUTO' && (
                    <form
                      className="enderecamento-search-row-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handlePesquisarProdutos();
                      }}
                    >
                      <div className="enderecamento-search-input-wrapper">
                        <span className="enderecamento-search-input-icon">🔍</span>
                        <input
                          type="text"
                          className="enderecamento-search-input-compact"
                          placeholder="Barras, código ou nome do produto..."
                          value={buscaProduto}
                          onChange={(e) => setBuscaProduto(e.target.value)}
                        />
                        {buscaProduto && (
                          <button
                            type="button"
                            className="enderecamento-search-clear-btn"
                            onClick={() => setBuscaProduto('')}
                            title="Limpar busca"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="enderecamento-btn-filtrar-compact"
                        disabled={carregandoProdutos || !buscaProduto.trim()}
                      >
                        {carregandoProdutos ? '...' : 'Buscar'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ABA 1: POR ENDEREÇO (LISTA ANALÍTICA COM FILTROS RÁPIDOS)
             ══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'ENDERECO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Barra de Seleção em Lote para Impressão */}
              {enderecosAnaliticos.length > 0 && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 12,
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={
                        enderecosAnaliticos.length > 0 &&
                        enderecosAnaliticos.every((item) => enderecosSelecionadosParaImpressao.has(item.codend))
                      }
                      onChange={(e) => handleToggleSelecionarTodos(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#ea580c' }}
                    />
                    <span>
                      Selecionar Todos (<strong>{enderecosAnaliticos.length}</strong>)
                    </span>
                  </label>

                  {enderecosSelecionadosParaImpressao.size > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ea580c' }}>
                        ✓ {enderecosSelecionadosParaImpressao.size} {enderecosSelecionadosParaImpressao.size === 1 ? 'selecionado' : 'selecionados'}
                      </span>
                      <button
                        type="button"
                        className="enderecamento-btn-acao"
                        style={{
                          background: '#ea580c',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          padding: '6px 14px',
                        }}
                        onClick={() => setModalImpressaoAberto(true)}
                      >
                        🖨️ Imprimir Selecionados ({enderecosSelecionadosParaImpressao.size})
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                        onClick={() => setEnderecosSelecionadosParaImpressao(new Set())}
                      >
                        Desmarcar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Grid / Lista Analítica de Endereços */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {enderecosAnaliticos.length > 0 ? (
                  enderecosAnaliticos.map((item) => (
                    <div
                      key={item.codend}
                      className="enderecamento-analitico-item"
                      onClick={() => handleSelecionarEnderecoParaProdutos(item)}
                      title="Clique para abrir os produtos alocados neste endereço"
                    >
                      {/* Linha 1: Checkbox + Tipo + Endereço Chip + Status Ocupação */}
                      <div className="enderecamento-analitico-linha-topo">
                        <div
                          className="enderecamento-item-checkbox-wrapper"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={enderecosSelecionadosParaImpressao.has(item.codend)}
                            onChange={() => handleToggleSelecaoItem(item.codend)}
                            title="Selecionar este endereço para impressão de etiqueta"
                            style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#ea580c' }}
                          />
                        </div>

                        <span className={`enderecamento-tipo-badge ${item.tipo.toLowerCase()}`}>
                          {item.tipo}
                        </span>

                        <EnderecoChips
                          endereco={item.endereco}
                          descrend={item.descrend}
                          tipo={item.tipo as 'PICKING' | 'PULMAO'}
                          tamanho="compacto"
                        />

                        <div className="enderecamento-analitico-badge-wrap" onClick={(e) => e.stopPropagation()}>
                          {item.totalProdutos > 0 ? (
                            <span className="enderecamento-badge-ocupacao ocupado">
                              📦 {item.totalProdutos} {item.totalProdutos === 1 ? 'prod' : 'prods'}
                            </span>
                          ) : (
                            <span className="enderecamento-badge-ocupacao livre">
                              🟢 Livre
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linha 2: Código + Descrição + Ações Compactas */}
                      <div className="enderecamento-analitico-linha-base">
                        <span className="enderecamento-analitico-desc-texto">
                          Cód: <strong>{item.codend}</strong>{item.descrend ? ` • ${item.descrend}` : ''}
                        </span>

                        <div className="enderecamento-analitico-acoes-inline" onClick={(e) => e.stopPropagation()}>
                          {podeCadastrar && (
                            <button
                              type="button"
                              className="enderecamento-btn-acao-mini cadastrar"
                              title="Cadastrar produtos diretamente neste endereço (WMS)"
                              onClick={() => handleAbrirCadastroNoEndereco(item)}
                            >
                              ⚡ Cadastrar
                            </button>
                          )}

                          <button
                            type="button"
                            className="enderecamento-btn-acao-mini"
                            title="Imprimir etiqueta deste endereço"
                            onClick={() => {
                              setEnderecosSelecionadosParaImpressao(new Set([item.codend]));
                              setModalImpressaoAberto(true);
                            }}
                          >
                            🖨️
                          </button>

                          <button
                            type="button"
                            className="enderecamento-btn-acao-mini ver"
                            title="Ver produtos deste endereço"
                            onClick={() => handleSelecionarEnderecoParaProdutos(item)}
                          >
                            👁️ Produtos
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 32,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    {carregandoAnalitico
                      ? 'Carregando lista analítica de endereços...'
                      : 'Nenhum endereço localizado com os critérios selecionados.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ABA 2: POR PRODUTO (COM BANNER DE CONTEXTO DO ENDEREÇO)
             ══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'PRODUTO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Lista de Resultados de Produtos */}
              <div className="enderecamento-grid">
                {produtos.map((p) => (
                  <div key={p.codprod} className="enderecamento-card">
                    <div className="enderecamento-card-header">
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <ProdutoImagem
                          codProd={p.codprod}
                          alt={p.descrprod}
                          className="enderecamento-produto-thumb"
                          onFotoClick={(url) => setImagemAmpliada(url)}
                        />
                        <div className="enderecamento-prod-info">
                          <div className="enderecamento-prod-titulo">
                            {p.codprod} - {p.descrprod}
                          </div>
                          <div className="enderecamento-prod-meta">
                            {p.referencia && <span>Ref: <strong>{p.referencia}</strong></span>}
                            {p.codbarra && <span>EAN: <strong>{p.codbarra}</strong></span>}
                            <span>Unidade: <strong>{p.codvol}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="enderecamento-saldo-badge">
                        📦 Saldo Disponível: {p.estoqueTotal} {p.codvol}
                      </div>
                    </div>

                    {/* Seções de Picking e Pulmão */}
                    <div className="enderecamento-locais-wrapper">
                      {/* Linha do Picking */}
                      <div className="enderecamento-linha-local">
                        <div className="enderecamento-local-tag" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="enderecamento-tipo-badge picking">Picking</span>
                          {p.picking ? (
                            <>
                              <EnderecoChips
                                endereco={p.picking.endereco}
                                descrend={p.picking.descrend}
                                tipo="PICKING"
                              />
                              {p.picking.controle && p.picking.controle.trim() !== '' && (
                                <span style={{ fontSize: 11, background: '#fef3c7', padding: '2px 6px', borderRadius: 4, color: '#92400e' }}>
                                  Lote: {p.picking.controle}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="endereco-chip-sem-endereco">
                              ⚠️ Sem Endereço Cadastrado
                            </span>
                          )}
                        </div>

                        {podeManipular && (
                          <div className="enderecamento-acoes-linha">
                            {p.picking ? (
                              <>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao mover"
                                  title="Mover picking para outro endereço"
                                  onClick={() => {
                                    setModalMover({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codendOrigem: p.picking!.codend,
                                      enderecoOrigem: p.picking!.endereco,
                                      controle: p.picking!.controle,
                                    });
                                    setDestinoMoverInput('');
                                    setMotivoMoverInput('');
                                  }}
                                >
                                  ↔️ Mover
                                </button>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao retirar"
                                  title="Retirar produto do picking"
                                  onClick={() => {
                                    setModalRetirar({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codend: p.picking!.codend,
                                      endereco: p.picking!.endereco,
                                      controle: p.picking!.controle,
                                    });
                                    setMotivoRetirarInput('');
                                  }}
                                >
                                  🗑️ Retirar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="enderecamento-btn-acao promover"
                                onClick={() => {
                                  setModalVincular({
                                    aberto: true,
                                    codprod: p.codprod,
                                    descrprod: p.descrprod,
                                    tipo: 'PICKING',
                                    tipconrest: p.tipconrest,
                                  });
                                  setTipoVincularInput('PICKING');
                                  setNovoEndInput(enderecoSelecionadoContexto?.endereco || '');
                                  setLoteInput('');
                                }}
                              >
                                ➕ Definir Picking
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Linha dos Pulmões (renderiza apenas se houver pulmões vinculados) */}
                      {p.pulmoes.length > 0 &&
                        p.pulmoes.map((pulmao) => (
                          <div key={pulmao.codend} className="enderecamento-linha-local">
                            <div className="enderecamento-local-tag" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span className="enderecamento-tipo-badge pulmao">Pulmão</span>
                              <EnderecoChips
                                endereco={pulmao.endereco}
                                descrend={pulmao.descrend}
                                tipo="PULMAO"
                              />
                              {pulmao.controle && pulmao.controle.trim() !== '' && (
                                <span style={{ fontSize: 11, background: '#fef3c7', padding: '2px 6px', borderRadius: 4, color: '#92400e' }}>
                                  Lote: {pulmao.controle}
                                </span>
                              )}
                            </div>

                            {podeManipular && (
                              <div className="enderecamento-acoes-linha">
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao promover"
                                  title="Promover este pulmão para ser o novo Picking oficial"
                                  onClick={() => {
                                    setModalVincular({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      tipo: 'PICKING',
                                      tipconrest: p.tipconrest,
                                    });
                                    setTipoVincularInput('PICKING');
                                    setNovoEndInput(pulmao.endereco);
                                    setLoteInput(pulmao.controle || '');
                                  }}
                                >
                                  📍 Tornar Picking
                                </button>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao mover"
                                  title="Mover produto para outro pulmão"
                                  onClick={() => {
                                    setModalMover({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codendOrigem: pulmao.codend,
                                      enderecoOrigem: pulmao.endereco,
                                      controle: pulmao.controle,
                                    });
                                    setDestinoMoverInput('');
                                    setMotivoMoverInput('');
                                  }}
                                >
                                  ↔️ Mover
                                </button>
                                <button
                                  type="button"
                                  className="enderecamento-btn-acao retirar"
                                  title="Desendereçar produto deste pulmão"
                                  onClick={() => {
                                    setModalRetirar({
                                      aberto: true,
                                      codprod: p.codprod,
                                      descrprod: p.descrprod,
                                      codend: pulmao.codend,
                                      endereco: pulmao.endereco,
                                      controle: pulmao.controle,
                                    });
                                    setMotivoRetirarInput('');
                                  }}
                                >
                                  🗑️ Retirar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

                {produtos.length === 0 && !carregandoProdutos && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 32,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    {enderecoSelecionadoContexto
                      ? `Nenhum produto cadastrado atualmente no endereço ${enderecoSelecionadoContexto.endereco}.`
                      : 'Digite o código ou nome de um produto acima para visualizar e manipular seus endereços.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ABA 3: HISTÓRICO DE MOVIMENTAÇÕES (CARDS MINIMALISTAS MOBILE-FIRST)
             ══════════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'HISTORICO' && (
            <div className="enderecamento-historico-card">
              <div className="enderecamento-historico-header">
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                  🕒 Auditoria e Movimentações ({historico.length})
                </span>
                <button
                  type="button"
                  className="enderecamento-btn-acao"
                  onClick={carregarHistorico}
                  disabled={carregandoHistorico}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  {carregandoHistorico ? 'Atualizando...' : '🔄 Atualizar'}
                </button>
              </div>

              <div className="enderecamento-historico-cards-list">
                {historico.length > 0 ? (
                  historico.map((h) => (
                    <div key={h.id} className="enderecamento-historico-item">
                      {/* Topo do card: Ação + Data/Hora + Operador */}
                      <div className="enderecamento-historico-item-topo">
                        <span
                          className={`enderecamento-historico-badge-acao ${
                            h.tipoAcao === 'MOVER' ? 'mover' : h.tipoAcao === 'RETIRAR' ? 'retirar' : 'definir'
                          }`}
                        >
                          {h.tipoAcao}
                        </span>
                        <span className="enderecamento-historico-data">
                          {new Date(h.criadoEm).toLocaleString('pt-BR')}
                        </span>
                        <span className="enderecamento-historico-usuario">
                          👤 {h.usuario}
                        </span>
                      </div>

                      {/* Meio: Produto e Lote */}
                      <div className="enderecamento-historico-item-produto">
                        <strong>{h.codprod}</strong> {h.descrprod ? `- ${h.descrprod}` : ''}
                        {h.controle && h.controle.trim() !== '' && (
                          <span className="enderecamento-historico-lote">
                            Lote: {h.controle}
                          </span>
                        )}
                      </div>

                      {/* Linha de Rota: Origem ➔ Destino */}
                      <div className="enderecamento-historico-item-rota">
                        <div className="enderecamento-historico-rota-end">
                          <span style={{ fontSize: 11, color: '#64748b' }}>Origem:</span>
                          {h.enderecoOrigem ? (
                            <EnderecoChips
                              endereco={h.enderecoOrigem}
                              tipo={(h.tipoOrigem?.toUpperCase() as any) || 'PULMAO'}
                              tamanho="compacto"
                            />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                          )}
                        </div>
                        <span style={{ color: '#ea580c', fontWeight: 800 }}>➔</span>
                        <div className="enderecamento-historico-rota-end">
                          <span style={{ fontSize: 11, color: '#64748b' }}>Destino:</span>
                          {h.enderecoDestino ? (
                            <EnderecoChips
                              endereco={h.enderecoDestino}
                              tipo={(h.tipoDestino?.toUpperCase() as any) || 'PICKING'}
                              tamanho="compacto"
                            />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                          )}
                        </div>
                      </div>

                      {/* Motivo se houver */}
                      {h.motivo && (
                        <div className="enderecamento-historico-item-motivo">
                          <em>Obs: {h.motivo}</em>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="enderecamento-historico-vazio">
                    {carregandoHistorico ? 'Carregando auditoria...' : 'Nenhuma movimentação registrada até o momento.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ MODAL: MOVER PARA OUTRO ENDEREÇO ═══ */}
          {modalMover.aberto && (
            <div className="enderecamento-modal-backdrop">
              <div className="enderecamento-modal-box">
                <h3 className="enderecamento-modal-title">↔️ Mover Produto para Outro Endereço</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                  Produto: <strong>{modalMover.codprod} - {modalMover.descrprod}</strong>
                </p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>Origem Atual:</span>
                  <EnderecoChips
                    endereco={modalMover.enderecoOrigem}
                    tamanho="compacto"
                  />
                  {modalMover.controle && modalMover.controle.trim() !== '' && (
                    <span style={{ fontSize: 11, background: '#fef3c7', padding: '2px 6px', borderRadius: 4, color: '#92400e' }}>
                      Lote: <strong>{modalMover.controle}</strong>
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Endereço Destino (Escanear ou digitar):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 01.02.03.01 ou código reduzido..."
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '2px solid #38bdf8',
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 700,
                      fontSize: 15,
                      boxSizing: 'border-box',
                    }}
                    value={destinoMoverInput}
                    onChange={(e) => setDestinoMoverInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Motivo da Movimentação (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Otimização de corredor, descida para picking..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                    value={motivoMoverInput}
                    onChange={(e) => setMotivoMoverInput(e.target.value)}
                  />
                </div>

                <div className="enderecamento-modal-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-acao"
                    onClick={() => setModalMover({ aberto: false })}
                    disabled={salvandoMover}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="enderecamento-scanner-btn"
                    onClick={handleConfirmarMover}
                    disabled={salvandoMover || !destinoMoverInput.trim()}
                  >
                    {salvandoMover ? 'Movimentando...' : '✓ Confirmar Mudança'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL: VINCULAR NOVO ENDEREÇO ═══ */}
          {modalVincular.aberto && (
            <div className="enderecamento-modal-backdrop">
              <div className="enderecamento-modal-box">
                <h3 className="enderecamento-modal-title">
                  ➕ {tipoVincularInput === 'PICKING' ? 'Definir Endereço de Picking' : 'Vincular Novo Pulmão'}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                  Produto: <strong>{modalVincular.codprod} - {modalVincular.descrprod}</strong>
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Tipo de Endereçamento:
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        fontWeight: 700,
                        border: tipoVincularInput === 'PICKING' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: tipoVincularInput === 'PICKING' ? '#dcfce7' : '#ffffff',
                        color: tipoVincularInput === 'PICKING' ? '#15803d' : '#475569',
                        cursor: 'pointer',
                      }}
                      onClick={() => setTipoVincularInput('PICKING')}
                    >
                      📍 Picking (Único)
                    </button>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        fontWeight: 700,
                        border: tipoVincularInput === 'PULMAO' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: tipoVincularInput === 'PULMAO' ? '#e0f2fe' : '#ffffff',
                        color: tipoVincularInput === 'PULMAO' ? '#0369a1' : '#475569',
                        cursor: 'pointer',
                      }}
                      onClick={() => setTipoVincularInput('PULMAO')}
                    >
                      📦 Pulmão (Reserva)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Código ou Máscara do Endereço:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 01.02.03.01 ou código numérico..."
                    style={{
                      width: '100%',
                      height: 44,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: '2px solid #f97316',
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 700,
                      fontSize: 15,
                      boxSizing: 'border-box',
                    }}
                    value={novoEndInput}
                    onChange={(e) => setNovoEndInput(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Lote / Controle (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Digitar ou escanear lote (se aplicável)..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                    value={loteInput}
                    onChange={(e) => setLoteInput(e.target.value)}
                  />
                </div>

                <div className="enderecamento-modal-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-acao"
                    onClick={() => setModalVincular({ aberto: false })}
                    disabled={salvandoVincular}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="enderecamento-scanner-btn"
                    onClick={handleConfirmarVincular}
                    disabled={salvandoVincular || !novoEndInput.trim()}
                  >
                    {salvandoVincular ? 'Salvando...' : '✓ Vincular Endereço'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL: RETIRAR / DESENDEREÇAR ═══ */}
          {modalRetirar.aberto && (
            <div className="enderecamento-modal-backdrop">
              <div className="enderecamento-modal-box">
                <h3 className="enderecamento-modal-title" style={{ color: '#dc2626' }}>
                  🗑️ Confirmar Retirada de Endereço
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>
                    Tem certeza que deseja desvincular o produto{' '}
                    <strong>{modalRetirar.codprod} - {modalRetirar.descrprod}</strong> do endereço:
                  </p>
                  <div>
                    <EnderecoChips
                      endereco={modalRetirar.endereco}
                      tamanho="normal"
                    />
                  </div>
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 10, borderRadius: 10, fontSize: 12, color: '#b91c1c' }}>
                  ⚠️ A posição física será liberada no sistema e inativada na tabela de endereçamento WMS do Sankhya (TGWEXP).
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Motivo da Retirada (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Esgotamento físico, avaria, mudança de layout..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                    value={motivoRetirarInput}
                    onChange={(e) => setMotivoRetirarInput(e.target.value)}
                  />
                </div>

                <div className="enderecamento-modal-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-acao"
                    onClick={() => setModalRetirar({ aberto: false })}
                    disabled={salvandoRetirar}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    style={{
                      height: 42,
                      padding: '0 18px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    onClick={handleConfirmarRetirar}
                    disabled={salvandoRetirar}
                  >
                    {salvandoRetirar ? 'Retirando...' : 'Sim, Retirar do Endereço'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODAL DE ALTA VELOCIDADE: CADASTRO RÁPIDO NO ENDEREÇO (BOTTOM SHEET ANDROID 3 FASES)
             ══════════════════════════════════════════════════════════════════ */}
          {modalColetorAberto && (
            <div
              className={`enderecamento-coletor-overlay ${cameraAtiva !== null ? 'camera-ativa-oculto' : ''}`}
              style={cameraAtiva !== null ? { display: 'none' } : undefined}
              onClick={() => {
                if (!confirmacaoPicking && !coletorSalvando) {
                  handleConcluirEFechar();
                }
              }}
            >
              <div
                className="enderecamento-coletor-modal"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag Handle Superior (Padrão Bottom Sheet Android) */}
                <div className="enderecamento-bottom-sheet-drag-handle" />

                {/* Header Minimalista Suave */}
                <div className="enderecamento-modal-clean-header">
                  <div>
                    <h3 className="enderecamento-modal-clean-title">
                      {faseColetor === 1 && '1. Posição Física'}
                      {faseColetor === 2 && '2. Adicionar Itens à Lista'}
                      {faseColetor === 3 && (listaConcluidaSucesso ? '3. Cadastro Concluído' : '3. Confirmar Lista de Cadastros')}
                    </h3>
                    <p className="enderecamento-modal-clean-subtitle">
                      {faseColetor === 1 && 'Bipe ou digite o endereço no armazém'}
                      {faseColetor === 2 && 'Bipe os produtos que serão vinculados à posição'}
                      {faseColetor === 3 && (listaConcluidaSucesso ? 'Todos os produtos foram sincronizados no WMS' : `Revise os ${listaItensPendentes.length} itens antes de sincronizar`)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="enderecamento-btn-clean-close"
                    onClick={handleConcluirEFechar}
                    disabled={coletorSalvando}
                    title="Fechar (Esc)"
                  >
                    ✕
                  </button>
                </div>

                {/* Barra de Progresso / Stepper (3 Segmentos) */}
                <div className="enderecamento-stepper-progress-bar">
                  <div className={`enderecamento-stepper-segment ${faseColetor >= 1 ? 'active' : ''} ${faseColetor > 1 ? 'completed' : ''}`}>
                    <div className="stepper-bar-fill" />
                    <span className="stepper-label">1. Endereço</span>
                  </div>
                  <div className={`enderecamento-stepper-segment ${faseColetor >= 2 ? 'active' : ''} ${faseColetor > 2 ? 'completed' : ''}`}>
                    <div className="stepper-bar-fill" />
                    <span className="stepper-label">
                      2. Itens {listaItensPendentes.length > 0 ? `(${listaItensPendentes.length})` : ''}
                    </span>
                  </div>
                  <div className={`enderecamento-stepper-segment ${faseColetor === 3 ? 'active completed' : ''}`}>
                    <div className="stepper-bar-fill" />
                    <span className="stepper-label">3. Confirmar</span>
                  </div>
                </div>

                {/* Body */}
                <div className="enderecamento-coletor-body">
                  {/* Feedback Message */}
                  {coletorFeedback && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background:
                          coletorFeedback.tipo === 'sucesso'
                            ? '#dcfce7'
                            : coletorFeedback.tipo === 'aviso'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          coletorFeedback.tipo === 'sucesso'
                            ? '#15803d'
                            : coletorFeedback.tipo === 'aviso'
                            ? '#b45309'
                            : '#b91c1c',
                        border: `1px solid ${
                          coletorFeedback.tipo === 'sucesso'
                            ? '#86efac'
                            : coletorFeedback.tipo === 'aviso'
                            ? '#fde68a'
                            : '#fca5a5'
                        }`,
                      }}
                    >
                      <span>
                        {coletorFeedback.tipo === 'sucesso'
                          ? '✓'
                          : coletorFeedback.tipo === 'aviso'
                          ? '⚠️'
                          : '✕'}
                      </span>
                      <span>{coletorFeedback.texto}</span>
                    </div>
                  )}

                  {/* ═══════════════════════════════════════════════════════════
                      FASE 1: ENDEREÇO
                     ═══════════════════════════════════════════════════════════ */}
                  {faseColetor === 1 && (
                    <div className="enderecamento-fase-container">
                      {/* Card de Entrada Limpo com Ícone Squircle Azul */}
                      <div className="enderecamento-clean-input-card">
                        <div className="enderecamento-clean-icon-wrap blue">
                          <span>📍</span>
                        </div>
                        <div className="enderecamento-clean-input-body">
                          <label className="enderecamento-clean-input-label">
                            Posição Física do WMS
                          </label>
                          <input
                            ref={coletorEndRef}
                            type="text"
                            className="enderecamento-clean-input"
                            placeholder="Escanear ou digitar endereço..."
                            value={coletorEndereco}
                            onChange={(e) => {
                              setColetorEndereco(e.target.value);
                              if (coletorEnderecoInfo) setColetorEnderecoInfo(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleResolverEndereco();
                              }
                            }}
                            disabled={coletorSalvando}
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          className="enderecamento-clean-camera-btn"
                          onClick={() => setCameraAtiva('ENDERECO')}
                          disabled={coletorSalvando}
                          title="Escanear endereço com a câmera do celular"
                        >
                          📷
                        </button>
                        <button
                          type="button"
                          className="enderecamento-clean-ok-btn"
                          onClick={() => handleResolverEndereco()}
                          disabled={coletorSalvando || !coletorEndereco.trim()}
                        >
                          OK
                        </button>
                      </div>

                      {/* Card de Endereço Validado + Toggle Trava + Avançar */}
                      {coletorEnderecoInfo ? (
                        <div className="enderecamento-clean-result-card">
                          <div className="enderecamento-clean-result-header">
                            <span className="enderecamento-clean-result-badge-ativo">
                              ✓ Posição Válida no WMS
                            </span>
                            <span
                              className={`enderecamento-tipo-badge ${coletorEnderecoInfo.tipo.toLowerCase()}`}
                            >
                              {coletorEnderecoInfo.tipo}
                            </span>
                          </div>

                          <div className="enderecamento-clean-result-content">
                            <EnderecoChips
                              endereco={coletorEnderecoInfo.endereco}
                              descrend={coletorEnderecoInfo.descrend}
                              tipo={coletorEnderecoInfo.tipo}
                              tamanho="normal"
                            />
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                              Cód: {coletorEnderecoInfo.codend}{' '}
                              {coletorEnderecoInfo.descrend ? `• ${coletorEnderecoInfo.descrend}` : ''}
                            </div>
                          </div>

                          {/* Toggle Suave de Trava de Endereço */}
                          <label className="enderecamento-clean-toggle-box">
                            <input
                              type="checkbox"
                              className="enderecamento-clean-checkbox"
                              checked={coletorTravarEndereco}
                              onChange={(e) => setColetorTravarEndereco(e.target.checked)}
                            />
                            <div className="enderecamento-clean-toggle-text">
                              <strong>{coletorTravarEndereco ? '🔒 Endereço Travado' : '🔓 Troca a Cada Bip'}</strong>
                              <span>
                                {coletorTravarEndereco
                                  ? 'Permite bipar múltiplos produtos nesta mesma posição'
                                  : 'Pedirá novo endereço após cada produto'}
                              </span>
                            </div>
                          </label>

                          {/* Botão de Avanço para Produto */}
                          <button
                            type="button"
                            className="enderecamento-btn-clean-primary"
                            onClick={handleAvancarParaProduto}
                          >
                            <span>Avançar para Adicionar Itens</span>
                            <span>➔</span>
                          </button>
                        </div>
                      ) : (
                        <div className="enderecamento-clean-hint-box">
                          <span>💡</span>
                          <span>Aponte o leitor laser para a etiqueta da posição física ou utilize a câmera 📷.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══════════════════════════════════════════════════════════
                      FASE 2: PRODUTOS (ADICIONAR À LISTA)
                     ═══════════════════════════════════════════════════════════ */}
                  {faseColetor === 2 && (
                    <div className="enderecamento-fase-container">
                      {/* Banner de Contexto: Endereço Ativo */}
                      <div className="enderecamento-clean-context-banner">
                        <div className="enderecamento-clean-context-info">
                          <span className="enderecamento-clean-context-label">Posição Selecionada:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <EnderecoChips
                              endereco={coletorEnderecoInfo?.endereco || coletorEndereco}
                              descrend={coletorEnderecoInfo?.descrend}
                              tipo={coletorEnderecoInfo?.tipo || 'PICKING'}
                              tamanho="compacto"
                            />
                            <span
                              className={`enderecamento-tipo-badge ${(coletorEnderecoInfo?.tipo || 'PICKING').toLowerCase()}`}
                            >
                              {coletorEnderecoInfo?.tipo || 'PICKING'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="enderecamento-btn-clean-link"
                          onClick={handleVoltarParaEndereco}
                          disabled={coletorSalvando}
                          title="Voltar para trocar de endereço"
                        >
                          ↺ Trocar
                        </button>
                      </div>

                      {/* Banner da Fila de Itens Adicionados */}
                      {listaItensPendentes.length > 0 && (
                        <div className="enderecamento-clean-fila-banner">
                          <div className="fila-banner-info">
                            <span>🛒</span>
                            <strong>
                              {listaItensPendentes.length}{' '}
                              {listaItensPendentes.length === 1 ? 'produto na lista' : 'produtos na lista'}
                            </strong>
                          </div>
                          <button
                            type="button"
                            className="enderecamento-btn-clean-link"
                            style={{ color: '#ea580c', fontWeight: 800 }}
                            onClick={() => setFaseColetor(3)}
                            title="Ir para a revisão e confirmação da lista"
                          >
                            Revisar Lista ({listaItensPendentes.length}) ➔
                          </button>
                        </div>
                      )}

                      {!produtoPrevia ? (
                        <form
                          onSubmit={handleLocalizarProduto}
                          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                        >
                          {/* Card de Entrada de Produto com Ícone Laranja */}
                          <div className="enderecamento-clean-input-card">
                            <div className="enderecamento-clean-icon-wrap orange">
                              <span>📦</span>
                            </div>
                            <div className="enderecamento-clean-input-body">
                              <label className="enderecamento-clean-input-label">
                                Produto (EAN ou Código)
                              </label>
                              <input
                                ref={coletorProdRef}
                                type="text"
                                className="enderecamento-clean-input"
                                placeholder="Escanear código de barras EAN..."
                                value={coletorProduto}
                                onChange={(e) => setColetorProduto(e.target.value)}
                                disabled={coletorSalvando}
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              className="enderecamento-clean-camera-btn"
                              onClick={() => setCameraAtiva('PRODUTO')}
                              disabled={coletorSalvando}
                              title="Escanear código de barras com a câmera"
                            >
                              📷
                            </button>
                          </div>

                          {/* Campo Lote Opcional */}
                          <div className="enderecamento-clean-lote-box">
                            <span className="enderecamento-clean-lote-label">Lote (Opcional):</span>
                            <input
                              type="text"
                              className="enderecamento-clean-lote-input"
                              placeholder="Deixe em branco ou informe o lote..."
                              value={coletorLote}
                              onChange={(e) => setColetorLote(e.target.value)}
                              disabled={coletorSalvando}
                            />
                          </div>

                          <div className="enderecamento-clean-botoes-row">
                            <button
                              type="submit"
                              className="enderecamento-btn-clean-primary"
                              disabled={coletorSalvando || !coletorProduto.trim()}
                            >
                              {coletorSalvando ? 'Consultando...' : '🔍 Localizar Produto (Enter)'}
                            </button>
                            {listaItensPendentes.length > 0 && (
                              <button
                                type="button"
                                className="enderecamento-btn-clean-secondary"
                                onClick={() => setFaseColetor(3)}
                              >
                                Finalizar Lista ({listaItensPendentes.length})
                              </button>
                            )}
                          </div>
                        </form>
                      ) : (
                        /* CARD DE CONFERÊNCIA VISUAL / PRÉ-VISUALIZAÇÃO */
                        <form
                          onSubmit={handleIncluirNaLista}
                          className="enderecamento-clean-previa-card"
                        >
                          <div className="enderecamento-clean-previa-header">
                            <span className="enderecamento-clean-previa-title">
                              <span>👁️</span> Conferência Visual
                            </span>
                            <button
                              type="button"
                              className="enderecamento-btn-clean-link"
                              onClick={handleCancelarProdutoPrevia}
                              disabled={coletorSalvando}
                            >
                              ✕ Trocar
                            </button>
                          </div>

                          {/* Foto Ampla do Produto com Toque para Zoom */}
                          <div className="enderecamento-clean-previa-foto-wrap">
                            <ProdutoImagem
                              codProd={produtoPrevia.codprod}
                              alt={produtoPrevia.descrprod}
                              className="enderecamento-clean-previa-foto"
                              onFotoClick={(url) => setImagemAmpliada(url)}
                            />
                            <span className="enderecamento-clean-previa-foto-hint">
                              🔍 Toque na foto para ampliar
                            </span>
                          </div>

                          {/* Detalhes do Produto */}
                          <div className="enderecamento-clean-previa-info">
                            <h4 className="enderecamento-clean-previa-nome">
                              <strong>{produtoPrevia.codprod}</strong> - {produtoPrevia.descrprod}
                            </h4>
                            <div className="enderecamento-clean-previa-tags">
                              {produtoPrevia.referencia && (
                                <span>Ref: <strong>{produtoPrevia.referencia}</strong></span>
                              )}
                              {produtoPrevia.codbarra && (
                                <span>EAN: <strong>{produtoPrevia.codbarra}</strong></span>
                              )}
                              <span>Un: <strong>{produtoPrevia.codvol}</strong></span>
                              {coletorLote.trim() && (
                                <span className="tag-lote">
                                  Lote: <strong>{coletorLote.trim()}</strong>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Situação Atual no WMS */}
                          <div className="enderecamento-clean-previa-situacao">
                            <div className="situacao-linha">
                              <span className="situacao-rotulo">📍 Picking Atual:</span>
                              {produtoPrevia.picking ? (
                                <EnderecoChips
                                  endereco={produtoPrevia.picking.endereco}
                                  descrend={produtoPrevia.picking.descrend}
                                  tipo="PICKING"
                                  tamanho="compacto"
                                />
                              ) : (
                                <span className="situacao-vazio">⚠️ Sem Picking</span>
                              )}
                            </div>

                            <div className="situacao-linha">
                              <span className="situacao-rotulo">📦 Pulmões Ativos:</span>
                              {produtoPrevia.pulmoes && produtoPrevia.pulmoes.length > 0 ? (
                                <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                                  {produtoPrevia.pulmoes.map((p) => (
                                    <EnderecoChips
                                      key={p.codend}
                                      endereco={p.endereco}
                                      descrend={p.descrend}
                                      tipo="PULMAO"
                                      tamanho="compacto"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="situacao-vazio">Nenhum</span>
                              )}
                            </div>

                            <div className="situacao-linha">
                              <span className="situacao-rotulo">📊 Saldo Disponível:</span>
                              <strong style={{ color: '#15803d' }}>
                                {produtoPrevia.estoqueTotal || 0} {produtoPrevia.codvol}
                              </strong>
                            </div>
                          </div>

                          {/* Alerta de Divergência se houver */}
                          {coletorDivergenciaMsg && (
                            <div className="enderecamento-clean-divergencia-alerta">
                              <span>⚠️</span>
                              <span>{coletorDivergenciaMsg}</span>
                            </div>
                          )}

                          {/* Double-Scan Prompt */}
                          <div className="enderecamento-clean-double-scan-box">
                            <label className="enderecamento-clean-double-scan-label">
                              ⚡ Confirmação: Bipe o código para adicionar à lista
                            </label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input
                                ref={coletorConfirmarRef}
                                type="text"
                                className="enderecamento-clean-input"
                                placeholder="Bipe o mesmo código para confirmar..."
                                value={coletorProduto}
                                onChange={(e) => setColetorProduto(e.target.value)}
                                disabled={coletorSalvando}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="enderecamento-clean-camera-btn"
                                onClick={() => setCameraAtiva('PRODUTO')}
                                disabled={coletorSalvando}
                                title="Confirmar via câmera"
                              >
                                📷
                              </button>
                            </div>
                          </div>

                          {/* Botões de Ação */}
                          <div className="enderecamento-clean-botoes-row">
                            <button
                              type="button"
                              className="enderecamento-btn-clean-secondary"
                              onClick={handleCancelarProdutoPrevia}
                              disabled={coletorSalvando}
                            >
                              ✕ Cancelar
                            </button>
                            <button
                              type="submit"
                              className="enderecamento-btn-clean-primary"
                              disabled={coletorSalvando}
                            >
                              + Incluir na Lista (Enter)
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* ═══════════════════════════════════════════════════════════
                      FASE 3: REVISÃO E CONFIRMAÇÃO DA LISTA
                     ═══════════════════════════════════════════════════════════ */}
                  {faseColetor === 3 && (
                    <div className="enderecamento-fase-container">
                      {!listaConcluidaSucesso ? (
                        <>
                          {/* Banner de Contexto do Endereço de Destino */}
                          <div className="enderecamento-clean-context-banner">
                            <div className="enderecamento-clean-context-info">
                              <span className="enderecamento-clean-context-label">
                                Posição de Destino:
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <EnderecoChips
                                  endereco={coletorEnderecoInfo?.endereco || coletorEndereco}
                                  descrend={coletorEnderecoInfo?.descrend}
                                  tipo={coletorEnderecoInfo?.tipo || 'PICKING'}
                                  tamanho="compacto"
                                />
                                <span
                                  className={`enderecamento-tipo-badge ${(coletorEnderecoInfo?.tipo || 'PICKING').toLowerCase()}`}
                                >
                                  {coletorEnderecoInfo?.tipo || 'PICKING'}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                              {listaItensPendentes.length}{' '}
                              {listaItensPendentes.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>

                          {/* Lista dos Itens Pendentes de Cadastro */}
                          {listaItensPendentes.length === 0 ? (
                            <div className="enderecamento-clean-hint-box" style={{ justifyContent: 'center' }}>
                              <span>📦 Nenhum produto adicionado à lista ainda.</span>
                            </div>
                          ) : (
                            <div className="enderecamento-clean-lista-itens">
                              {listaItensPendentes.map((item, idx) => (
                                <div key={item.id} className="enderecamento-clean-item-card">
                                  <div className="enderecamento-clean-item-foto-wrap">
                                    <ProdutoImagem
                                      codProd={item.codprod}
                                      alt={item.descrprod}
                                      className="enderecamento-clean-item-foto"
                                    />
                                    <span className="enderecamento-clean-item-num">#{idx + 1}</span>
                                  </div>
                                  <div className="enderecamento-clean-item-info">
                                    <h4 className="enderecamento-clean-item-titulo">
                                      <strong>{item.codprod}</strong> - {item.descrprod}
                                    </h4>
                                    <div className="enderecamento-clean-item-meta">
                                      {item.codbarra && <span>EAN: <strong>{item.codbarra}</strong></span>}
                                      <span>Un: <strong>{item.codvol}</strong></span>
                                      {item.lote && (
                                        <span className="tag-lote">
                                          Lote: <strong>{item.lote}</strong>
                                        </span>
                                      )}
                                      {item.confirmarSubstituicaoPicking && (
                                        <span className="tag-mudanca-picking">
                                          ⚡ Mudança Picking
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="enderecamento-clean-btn-remover"
                                    onClick={() => handleRemoverItemDaLista(item.id)}
                                    disabled={coletorSalvando}
                                    title="Remover produto da lista"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Botões de Ação da Fase 3 */}
                          <div className="enderecamento-clean-botoes-row" style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className="enderecamento-btn-clean-secondary"
                              onClick={() => {
                                setFaseColetor(2);
                                setTimeout(() => coletorProdRef.current?.focus(), 100);
                              }}
                              disabled={coletorSalvando}
                            >
                              + Adicionar Item
                            </button>
                            <button
                              type="button"
                              className="enderecamento-btn-clean-primary"
                              onClick={handleGravarListaFinal}
                              disabled={coletorSalvando || listaItensPendentes.length === 0}
                            >
                              {coletorSalvando
                                ? 'Gravando Lista...'
                                : `⚡ Gravar Lista (${listaItensPendentes.length})`}
                            </button>
                          </div>
                        </>
                      ) : (
                        /* ESTADO DE SUCESSO APÓS GRAVAÇÃO DA LISTA */
                        <>
                          <div className="enderecamento-clean-sucesso-hero">
                            <div className="sucesso-icon-circle">
                              <span>✓</span>
                            </div>
                            <h3 className="sucesso-hero-title">Lista Gravada com Sucesso!</h3>
                            <p className="sucesso-hero-subtitle">
                              Todos os produtos da lista foram vinculados e atualizados no WMS da Sankhya.
                            </p>
                          </div>

                          {/* Mini-feed da Sessão */}
                          {coletorFeed.length > 0 && (
                            <div className="enderecamento-clean-feed-section">
                              <span className="clean-feed-label">
                                📋 Histórico da Sessão ({coletorFeed.length} itens no WMS)
                              </span>
                              <div className="enderecamento-clean-feed-scroll">
                                {coletorFeed.slice(0, 8).map((f) => (
                                  <div key={f.id} className="clean-feed-item-chip">
                                    <span className="chip-codprod">#{f.codprod}</span>
                                    <span className="chip-descr">{f.descrprod}</span>
                                    <span className="chip-end">📍 {f.endereco}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Botões de Fechamento / Reinício */}
                          <div className="enderecamento-clean-botoes-row" style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className="enderecamento-btn-clean-primary"
                              onClick={handleReiniciarLista}
                            >
                              + Nova Lista
                            </button>
                            <button
                              type="button"
                              className="enderecamento-btn-clean-secondary"
                              onClick={handleConcluirEFechar}
                            >
                              Fechar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ MODAL POPUP CENTRALIZADO: MUDANÇA DE PICKING (DE ➔ PARA) ═══ */}
          {confirmacaoPicking && (
            <div
              className="enderecamento-modal-picking-overlay"
              onClick={() => {
                if (!coletorSalvando) {
                  setConfirmacaoPicking(null);
                  setTimeout(() => coletorProdRef.current?.focus(), 80);
                }
              }}
            >
              <div
                className="enderecamento-modal-picking-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="enderecamento-modal-picking-header">
                  <div className="enderecamento-modal-picking-header-title">
                    <span style={{ fontSize: 20 }}>⚡</span>
                    <span>Mudar Endereço de Picking?</span>
                  </div>
                  <button
                    type="button"
                    className="enderecamento-coletor-btn-fechar"
                    onClick={() => {
                      setConfirmacaoPicking(null);
                      setTimeout(() => coletorProdRef.current?.focus(), 80);
                    }}
                    disabled={coletorSalvando}
                    title="Cancelar (Esc)"
                  >
                    ✕
                  </button>
                </div>

                <div className="enderecamento-modal-picking-body">
                  {/* Produto com Foto */}
                  <div className="enderecamento-modal-picking-prod-card">
                    <ProdutoImagem
                      codProd={confirmacaoPicking.codprod}
                      alt={confirmacaoPicking.descrprod}
                      className="enderecamento-modal-picking-foto"
                      onFotoClick={(url) => setImagemAmpliada(url)}
                    />
                    <div className="enderecamento-modal-picking-prod-info">
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                        <strong>{confirmacaoPicking.codprod}</strong> - {confirmacaoPicking.descrprod}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {confirmacaoPicking.codbarra ? `EAN: ${confirmacaoPicking.codbarra}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Quadro Comparativo DE ➔ PARA (Empilhado com Largura Total) */}
                  <div className="enderecamento-modal-picking-depara">
                    {/* Card DE */}
                    <div className="enderecamento-depara-box de">
                      <div className="enderecamento-depara-box-header">
                        <span className="enderecamento-depara-label de">
                          📍 Picking Anterior (DE)
                        </span>
                        <span className="enderecamento-depara-status-tag inativado">
                          Será Inativado
                        </span>
                      </div>
                      <div className="enderecamento-depara-chips-wrap">
                        <EnderecoChips
                          endereco={confirmacaoPicking.pickingAnterior.endereco}
                          descrend={confirmacaoPicking.pickingAnterior.descrend}
                          tipo="PICKING"
                          tamanho="normal"
                        />
                      </div>
                    </div>

                    {/* Conector Central com Seta ⬇️ */}
                    <div className="enderecamento-depara-conector">
                      <div className="enderecamento-depara-linha-conector" />
                      <span className="enderecamento-depara-seta-circulo">⬇️</span>
                      <div className="enderecamento-depara-linha-conector" />
                    </div>

                    {/* Card PARA */}
                    <div className="enderecamento-depara-box para">
                      <div className="enderecamento-depara-box-header">
                        <span className="enderecamento-depara-label para">
                          🎯 Novo Picking (PARA)
                        </span>
                        <span className="enderecamento-depara-status-tag novo">
                          ✓ Novo Picking Oficial
                        </span>
                      </div>
                      <div className="enderecamento-depara-chips-wrap">
                        <EnderecoChips
                          endereco={confirmacaoPicking.novoEndereco.endereco}
                          descrend={confirmacaoPicking.novoEndereco.descrend}
                          tipo="PICKING"
                          tamanho="normal"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="enderecamento-modal-picking-aviso">
                    ⚠️ <strong>Regra Sankhya WMS:</strong> Cada produto possui no máximo 1 picking ativo.
                    Ao confirmar, o picking anterior será inativado automaticamente no Sankhya e o produto será transferido para o endereço atual.
                  </div>
                </div>

                <div className="enderecamento-modal-picking-footer">
                  <button
                    type="button"
                    className="enderecamento-btn-manter-anterior"
                    onClick={() => {
                      setConfirmacaoPicking(null);
                      setTimeout(() => coletorProdRef.current?.focus(), 80);
                    }}
                    disabled={coletorSalvando}
                  >
                    ✕ Manter no Anterior (Esc)
                  </button>
                  <button
                    type="button"
                    className="enderecamento-btn-mudar-picking"
                    onClick={handleConfirmarSubstituicaoPicking}
                    disabled={coletorSalvando}
                    autoFocus
                  >
                    {coletorSalvando ? 'Gravando no Sankhya...' : '⚡ Sim, Mudar para o Atual (Enter)'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Lightbox / Modal de Foto Ampliada */}
          {imagemAmpliada && (
            <div
              className="enderecamento-modal-foto-overlay"
              onClick={() => setImagemAmpliada(null)}
            >
              <div
                className="enderecamento-modal-foto-content"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={imagemAmpliada}
                  alt="Foto Ampliada do Produto"
                  className="enderecamento-foto-ampliada"
                />
                <button
                  type="button"
                  className="enderecamento-btn-fechar-foto"
                  onClick={() => setImagemAmpliada(null)}
                  title="Fechar (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Modal Central de Impressão de Etiquetas WMS */}
          <ModalImpressaoEtiquetas
            aberto={modalImpressaoAberto}
            onFechar={() => setModalImpressaoAberto(false)}
            todosEnderecos={enderecosAnaliticos}
            enderecosPreSelecionados={enderecosAnaliticos.filter((item) =>
              enderecosSelecionadosParaImpressao.has(item.codend)
            )}
          />

          {/* ═══ BOTÃO FLUTUANTE EXTENDED FAB ANDROID PARA CADASTRAR NO ENDEREÇO (TODAS AS ABAS) ═══ */}
          {podeCadastrar && !modalColetorAberto && (
            <button
              type="button"
              className="enderecamento-fab-cadastrar"
              onClick={handleAbrirModalColetor}
              title="Cadastrar Produto no Endereço (Atalho: F2)"
            >
              <span className="enderecamento-fab-icone">⚡</span>
              <span className="enderecamento-fab-label">Cadastrar</span>
            </button>
          )}

          {/* ═══ LEITOR DE CÂMERA INTEGRADO (SMARTPHONES ANDROID) ═══ */}
          <ModalCameraScanner
            aberto={cameraAtiva !== null}
            onFechar={() => setCameraAtiva(null)}
            onScan={handleScanCamera}
          />

          {/* ═══ NAVEGAÇÃO DE ABAS NO RODAPÉ COM ÍCONES ═══ */}
          <nav className="enderecamento-bottom-nav">
            <button
              type="button"
              className={`enderecamento-bottom-nav-item ${abaAtiva === 'ENDERECO' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('ENDERECO')}
            >
              <span className="nav-icon">📍</span>
              <span className="nav-texto">Endereços</span>
            </button>

            <button
              type="button"
              className={`enderecamento-bottom-nav-item ${abaAtiva === 'PRODUTO' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('PRODUTO')}
            >
              <span className="nav-icon">📦</span>
              <span className="nav-texto">Produtos</span>
            </button>

            <button
              type="button"
              className={`enderecamento-bottom-nav-item ${abaAtiva === 'HISTORICO' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('HISTORICO')}
            >
              <span className="nav-icon">🕒</span>
              <span className="nav-texto">Histórico</span>
            </button>
          </nav>
        </div>
      )}
    </AppLayout>
  );
}
