import React, { useState, useEffect } from 'react';
import { getProdutoImagemUrl } from '../../../infrastructure/api/httpClient';

// Cache em memória de blob URLs para evitar downloads repetidos do mesmo produto
const blobUrlCache = new Map<number | string, string | null>();
const promiseCache = new Map<number | string, Promise<string | null>>();

/**
 * Carrega a imagem do produto via fetch() e converte em Blob URL (blob:https://...).
 * Esse mecanismo contorna o bloqueio de Mixed Content (HTTPS -> HTTP) no WebView do Android.
 */
export async function carregarBlobImagemProduto(codProd: number | string | undefined | null): Promise<string | null> {
  if (!codProd) return null;
  const key = String(codProd);

  if (blobUrlCache.has(key)) {
    return blobUrlCache.get(key) || null;
  }
  if (promiseCache.has(key)) {
    return promiseCache.get(key)!;
  }

  const promise = (async () => {
    try {
      const url = getProdutoImagemUrl(codProd);
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) {
        blobUrlCache.set(key, null);
        return null;
      }
      const blob = await res.blob();
      // Se não for imagem válida, descarta
      if (!blob.type.startsWith('image/')) {
        blobUrlCache.set(key, null);
        return null;
      }
      const objectUrl = URL.createObjectURL(blob);
      blobUrlCache.set(key, objectUrl);
      return objectUrl;
    } catch {
      blobUrlCache.set(key, null);
      return null;
    } finally {
      promiseCache.delete(key);
    }
  })();

  promiseCache.set(key, promise);
  return promise;
}

export interface ProdutoImagemProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  codProd?: number | string | null;
  onFotoClick?: (blobOrUrl: string) => void;
}

export const ProdutoImagem: React.FC<ProdutoImagemProps> = ({
  codProd,
  alt,
  className,
  style,
  onClick,
  onFotoClick,
  ...props
}) => {
  const [src, setSrc] = useState<string | null>(() => {
    if (!codProd) return null;
    return blobUrlCache.get(String(codProd)) || null;
  });
  const [falha, setFalha] = useState(false);

  useEffect(() => {
    if (!codProd) {
      setSrc(null);
      setFalha(false);
      return;
    }

    const key = String(codProd);
    let ativo = true;

    if (blobUrlCache.has(key)) {
      const cached = blobUrlCache.get(key);
      if (cached) {
        setSrc(cached);
        setFalha(false);
      } else {
        setFalha(true);
      }
      return;
    }

    carregarBlobImagemProduto(codProd).then((objectUrl) => {
      if (!ativo) return;
      if (objectUrl) {
        setSrc(objectUrl);
        setFalha(false);
      } else {
        setFalha(true);
      }
    });

    return () => {
      ativo = false;
    };
  }, [codProd]);

  if (falha || !src) {
    return null;
  }

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (onFotoClick && src) {
      onFotoClick(src);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <img
      src={src}
      alt={alt || `Produto ${codProd}`}
      className={className}
      style={style}
      onClick={handleClick}
      {...props}
    />
  );
};
