import { useState, useCallback } from 'react';
import {
  ItemPedido,
  ConferenciaIniciada,
  ProdutoConferencia,
  ItemConferidoResponse,
  ItemConferidoDetalhe,
} from '../../domain/models/Conferencia';
import { ConferenciaApiService } from '../../infrastructure/api/ConferenciaApiService';
import { AuthApiService } from '../../infrastructure/api/AuthApiService';

const service = new ConferenciaApiService();
const authService = new AuthApiService();

export function useConferenciaAtiva(nuNota: number) {
  const [conferencia, setConferencia] = useState<ConferenciaIniciada | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [itensConferidos, setItensConferidos] = useState<ItemConferidoDetalhe[]>([]);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoConferencia | null>(null);
  const [ultimoConferido, setUltimoConferido] = useState<ItemConferidoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iniciar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const user = authService.getUser();
      const storedUser = localStorage.getItem('conferencia_user');
      const mgeSession = storedUser ? JSON.parse(storedUser)?.jsessionid : undefined;
      const conf = await service.iniciarConferencia(nuNota, user?.codUsu, user?.nomeUsu, mgeSession);
      setConferencia(conf);

      const { itens: itensPedido } = await service.listarItensPedido(nuNota);
      setItens(itensPedido);

      if (conf?.numConf) {
        try {
          const conferidos = await service.listarItensConferidos(conf.numConf);
          setItensConferidos(conferidos || []);
        } catch (e) {
          console.error('Erro ao listar itens conferidos inicial:', e);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar conferência');
    } finally {
      setLoading(false);
    }
  }, [nuNota]);

  const buscarProduto = useCallback(async (codBarra: string) => {
    try {
      setError(null);
      const produto = await service.getProduto(nuNota, codBarra);
      setProdutoAtual(produto);
      return produto;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Produto não encontrado';
      setError(msg);
      setProdutoAtual(null);
      throw new Error(msg);
    }
  }, [nuNota]);

  const conferirItem = useCallback(async (codBarra: string, qtdConf: string) => {
    if (!conferencia) throw new Error('Conferência não iniciada');

    try {
      setError(null);
      const { resultado, itens: itensAtualizados, itensConferidos: conferidosAtualizados } = await service.conferirItem({
        numConf: conferencia.numConf,
        nuNota,
        codBarra,
        qtdConf,
      });
      setUltimoConferido(resultado);
      if (conferidosAtualizados) {
        setItensConferidos(conferidosAtualizados);
      }

      setItens(prev => {
        const mapaAtualizado = new Map(itensAtualizados.map(i => [i.sequencia || i.codProd, i]));

        const merged = prev.map(item => {
          const chave = item.sequencia || item.codProd;
          const atualizado = mapaAtualizado.get(chave);
          if (atualizado) {
            return atualizado;
          }
          return { ...item, status: 'completo' as const };
        });

        for (const item of itensAtualizados) {
          const chave = item.sequencia || item.codProd;
          if (!prev.find(p => (p.sequencia || p.codProd) === chave)) {
            merged.push(item);
          }
        }

        return merged;
      });

      return resultado;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao conferir item';
      setError(msg);
      throw new Error(msg);
    }
  }, [nuNota, conferencia]);

  const excluirItemConferido = useCallback(async (seqConf: string) => {
    if (!conferencia) throw new Error('Conferência não iniciada');

    try {
      setLoading(true);
      setError(null);
      const res = await service.excluirItemConferido({
        nuConf: conferencia.numConf,
        seqConf,
        nuNota,
      });

      if (res.itens) {
        setItens(res.itens);
      }
      if (res.itensConferidos) {
        setItensConferidos(res.itensConferidos);
      }
      return res;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao estornar item';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [nuNota, conferencia]);

  const finalizar = useCallback(async (peso = 0, qtdVol = 0) => {
    if (!conferencia) throw new Error('Conferência não iniciada');

    try {
      setLoading(true);
      setError(null);
      await service.finalizarConferencia(conferencia.numConf, peso, qtdVol);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao finalizar');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conferencia]);

  const recarregarItens = useCallback(async () => {
    const { itens: itensAtualizados } = await service.listarItensPedido(nuNota);
    setItens(itensAtualizados);
    if (conferencia?.numConf) {
      try {
        const conferidos = await service.listarItensConferidos(conferencia.numConf);
        setItensConferidos(conferidos || []);
      } catch (e) {
        console.error('Erro ao recarregar itens conferidos:', e);
      }
    }
  }, [nuNota, conferencia]);

  return {
    conferencia,
    itens,
    itensConferidos,
    produtoAtual,
    ultimoConferido,
    loading,
    error,
    iniciar,
    buscarProduto,
    conferirItem,
    excluirItemConferido,
    finalizar,
    recarregarItens,
    setError,
  };
}
