import React, { useState, useMemo, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { EnderecoAnaliticoItem } from '../../../infrastructure/api/EnderecamentoApiService';
import { parseEndereco } from '../common/EnderecoChips';
import './ModalImpressaoEtiquetas.css';

export type ModeloLayoutEtiqueta = '2_POR_FOLHA' | '4_POR_FOLHA' | '8_POR_FOLHA';
export type EstiloLayoutEtiqueta =
  | 'PADRAO_HORIZONTAL'
  | 'QR_LATERAL_VERTICAL'
  | 'MONTANTE_VERTICAL_2_COL'
  | 'FAIXA_NIVEL_VERTICAL';
export type TipoCodigoEtiqueta = 'BARRAS' | 'QRCODE' | 'AMBOS';

export interface ItemNivelMontante {
  item: EnderecoAnaliticoItem;
  deposito: string;
  rua: string;
  torre: string;
  nivel: string;
  pos: string;
  nivelNum: number;
}

export interface ColunaMontante {
  id: string;
  deposito: string;
  rua: string;
  torre: string;
  pos: string;
  niveis: ItemNivelMontante[];
}

export const removerZerosEsquerda = (val: string | undefined): string => {
  if (!val || val === '—') return '—';
  const trimmed = val.trim();
  const semZero = trimmed.replace(/^0+/, '');
  return semZero === '' ? '0' : semZero;
};

export interface InformacoesEtiqueta {
  mostrarDeposito: boolean;
  mostrarRua: boolean;
  mostrarTorre: boolean;
  mostrarNivel: boolean;
  mostrarPosicao: boolean;
  mostrarTipo: boolean;
  mostrarCodend: boolean;
  mostrarDescrend: boolean;
}

export interface ModalImpressaoEtiquetasProps {
  aberto: boolean;
  onFechar: () => void;
  todosEnderecos: EnderecoAnaliticoItem[];
  enderecosPreSelecionados?: EnderecoAnaliticoItem[];
}

// ── Componente SVG de Código de Barras (Code 128) ──
const BarcodeItem: React.FC<{ value: string; width?: number; height?: number }> = ({
  value,
  width = 1.8,
  height = 36,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.error('Erro ao gerar código de barras:', err);
      }
    }
  }, [value, width, height]);

  return <svg ref={svgRef} className="etiqueta-barcode-svg" />;
};

// ── Componente Canvas de QR Code ──
const QRCodeItem: React.FC<{ value: string; size?: number; margin?: number }> = ({
  value,
  size = 64,
  margin = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((err) => console.error('Erro ao gerar QR Code:', err));
    }
  }, [value, size, margin]);

  return <canvas ref={canvasRef} className="etiqueta-qrcode-canvas" />;
};

// ── Cálculo de Direção da Seta Indicativa do Montante ──
const calcularDirecaoSeta = (
  torreStr: string,
  posStr: string,
  dirImpar: 'ESQUERDA' | 'DIREITA'
): 'ESQUERDA' | 'DIREITA' => {
  const tNum = parseInt(torreStr, 10) || 1;
  const pNum = parseInt(posStr, 10) || 1;
  const isTorreImpar = tNum % 2 !== 0;
  const isPosImpar = pNum % 2 !== 0;

  // Base: se a posição for ímpar, usa dirImpar; se par, inverte
  let dir: 'ESQUERDA' | 'DIREITA' = isPosImpar ? dirImpar : (dirImpar === 'ESQUERDA' ? 'DIREITA' : 'ESQUERDA');

  // Se a torre for par, inverte a orientação:
  if (!isTorreImpar) {
    dir = dir === 'ESQUERDA' ? 'DIREITA' : 'ESQUERDA';
  }
  return dir;
};

const renderSetaSvgString = (direcao: 'ESQUERDA' | 'DIREITA') => {
  if (direcao === 'ESQUERDA') {
    return `<svg viewBox="0 0 100 28" class="montante-seta-svg" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,0 1,14 24,28 24,21 99,21 99,7 24,7" fill="#0f172a" />
    </svg>`;
  }
  return `<svg viewBox="0 0 100 28" class="montante-seta-svg" xmlns="http://www.w3.org/2000/svg">
    <polygon points="76,0 99,14 76,28 76,21 1,21 1,7 76,7" fill="#0f172a" />
  </svg>`;
};

const SetaMontantePreview: React.FC<{ direcao: 'ESQUERDA' | 'DIREITA' }> = ({ direcao }) => {
  if (direcao === 'ESQUERDA') {
    return (
      <svg viewBox="0 0 100 28" className="preview-montante-seta-svg" xmlns="http://www.w3.org/2000/svg">
        <polygon points="24,0 1,14 24,28 24,21 99,21 99,7 24,7" fill="#0f172a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 28" className="preview-montante-seta-svg" xmlns="http://www.w3.org/2000/svg">
      <polygon points="76,0 99,14 76,28 76,21 1,21 1,7 76,7" fill="#0f172a" />
    </svg>
  );
};

export const ModalImpressaoEtiquetas: React.FC<ModalImpressaoEtiquetasProps> = ({
  aberto,
  onFechar,
  todosEnderecos,
  enderecosPreSelecionados = [],
}) => {
  // ═══ CONFIGURAÇÕES DE IMPRESSÃO ═══
  const [modeloLayout, setModeloLayout] = useState<ModeloLayoutEtiqueta>('4_POR_FOLHA');
  const [estiloVisual, setEstiloVisual] = useState<EstiloLayoutEtiqueta>('PADRAO_HORIZONTAL');
  const [tipoCodigo, setTipoCodigo] = useState<TipoCodigoEtiqueta>('BARRAS');
  const [direcaoPosicaoImpar, setDirecaoPosicaoImpar] = useState<'ESQUERDA' | 'DIREITA'>('ESQUERDA');
  const [mostrarSetaTopo, setMostrarSetaTopo] = useState<boolean>(true);
  const [copiasFaixaNivel, setCopiasFaixaNivel] = useState<number>(1);
  const [tamanhoFonteLetrasFaixa, setTamanhoFonteLetrasFaixa] = useState<number>(70);
  const [tamanhoFonteNumeroFaixa, setTamanhoFonteNumeroFaixa] = useState<number>(170);
  const [info, setInfo] = useState<InformacoesEtiqueta>({
    mostrarDeposito: true,
    mostrarRua: true,
    mostrarTorre: true,
    mostrarNivel: true,
    mostrarPosicao: true,
    mostrarTipo: true,
    mostrarCodend: true,
    mostrarDescrend: false,
  });

  // ═══ ESCOPO DE SELEÇÃO ═══
  // 'SELECIONADOS': usa os pré-selecionados
  // 'INTERVALO': filtra por range (De Rua / Até Rua, etc.)
  // 'TODOS': todos da lista analítica
  const [modoEscopo, setModoEscopo] = useState<'SELECIONADOS' | 'INTERVALO' | 'TODOS'>(
    enderecosPreSelecionados.length > 0 ? 'SELECIONADOS' : 'TODOS'
  );

  // Filtros por intervalo
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PICKING' | 'PULMAO'>('TODOS');
  const [depositoFiltro, setDepositoFiltro] = useState('');
  const [ruaDe, setRuaDe] = useState('');
  const [ruaAte, setRuaAte] = useState('');
  const [torreDe, setTorreDe] = useState('');
  const [torreAte, setTorreAte] = useState('');
  const [nivelDe, setNivelDe] = useState('');
  const [nivelAte, setNivelAte] = useState('');

  // Sincronizar escopo quando modal abrir com itens pré-selecionados
  useEffect(() => {
    if (aberto) {
      if (enderecosPreSelecionados.length > 0) {
        setModoEscopo('SELECIONADOS');
      } else {
        setModoEscopo('TODOS');
      }
    }
  }, [aberto, enderecosPreSelecionados]);

  // Lista final de endereços a serem impressos
  const enderecosFiltrados = useMemo(() => {
    if (modoEscopo === 'SELECIONADOS') {
      return enderecosPreSelecionados;
    }

    if (modoEscopo === 'TODOS') {
      return todosEnderecos;
    }

    // Modo INTERVALO
    return todosEnderecos.filter((item) => {
      if (filtroTipo !== 'TODOS' && item.tipo !== filtroTipo) {
        return false;
      }

      const det = parseEndereco(item.endereco, item.descrend);
      if (!det) return true;

      if (depositoFiltro.trim()) {
        const depNum = parseInt(depositoFiltro.trim(), 10);
        const itemDepNum = parseInt(det.deposito, 10);
        if (!isNaN(depNum) && !isNaN(itemDepNum) && itemDepNum !== depNum) return false;
      }

      const rNum = parseInt(det.rua, 10);
      const tNum = parseInt(det.torre, 10);
      const nNum = parseInt(det.nivel, 10);

      const rDe = parseInt(ruaDe, 10);
      const rAte = parseInt(ruaAte, 10);
      if (!isNaN(rDe) && rNum < rDe) return false;
      if (!isNaN(rAte) && rNum > rAte) return false;

      const tDe = parseInt(torreDe, 10);
      const tAte = parseInt(torreAte, 10);
      if (!isNaN(tDe) && tNum < tDe) return false;
      if (!isNaN(tAte) && tNum > tAte) return false;

      const nDe = parseInt(nivelDe, 10);
      const nAte = parseInt(nivelAte, 10);
      if (!isNaN(nDe) && nNum < nDe) return false;
      if (!isNaN(nAte) && nNum > nAte) return false;

      return true;
    });
  }, [modoEscopo, enderecosPreSelecionados, todosEnderecos, filtroTipo, depositoFiltro, ruaDe, ruaAte, torreDe, torreAte, nivelDe, nivelAte]);

  // ═══ AGRUPAMENTO PARA TIRA DE MONTANTE MULTI-NÍVEL (2 COLUNAS) ═══
  const isMontante = estiloVisual === 'MONTANTE_VERTICAL_2_COL';

  const colunasMontante = useMemo(() => {
    if (!isMontante) return [];

    const map = new Map<string, ColunaMontante>();

    for (const item of enderecosFiltrados) {
      const det = parseEndereco(item.endereco, item.descrend);
      const deposito = det?.deposito || '01';
      const rua = det?.rua || '—';
      const torre = det?.torre || '—';
      const nivel = det?.nivel || '—';
      const pos = det?.pos || '—';
      const nivelNum = parseInt(nivel, 10) || 0;

      const id = `${deposito}_${rua}_${torre}_${pos}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          deposito,
          rua,
          torre,
          pos,
          niveis: [],
        });
      }
      map.get(id)!.niveis.push({
        item,
        deposito,
        rua,
        torre,
        nivel,
        pos,
        nivelNum,
      });
    }

    // Ordenar níveis de cada coluna em ordem física decrescente (Nível mais alto no topo, N1 na base)
    const lista = Array.from(map.values()).map((col) => ({
      ...col,
      niveis: col.niveis.sort((a, b) => b.nivelNum - a.nivelNum),
    }));

    // Ordenar as colunas por Rua, Torre, Posição
    lista.sort((a, b) => {
      const rA = parseInt(a.rua, 10) || 0;
      const rB = parseInt(b.rua, 10) || 0;
      if (rA !== rB) return rA - rB;

      const tA = parseInt(a.torre, 10) || 0;
      const tB = parseInt(b.torre, 10) || 0;
      if (tA !== tB) return tA - tB;

      const pA = parseInt(a.pos, 10) || 0;
      const pB = parseInt(b.pos, 10) || 0;
      return pA - pB;
    });

    return lista;
  }, [enderecosFiltrados, isMontante]);

  // ═══ FAIXA VERTICAL DE NÍVEL (POSTE/MONTANTE) ═══
  const isFaixaNivel = estiloVisual === 'FAIXA_NIVEL_VERTICAL';

  const niveisDistintos = useMemo(() => {
    const setNiveis = new Set<string>();
    for (const item of enderecosFiltrados) {
      const det = parseEndereco(item.endereco, item.descrend);
      if (det?.nivel && det.nivel !== '—') {
        const limpo = removerZerosEsquerda(det.nivel);
        if (limpo && limpo !== '—') {
          setNiveis.add(limpo);
        }
      }
    }
    const lista = Array.from(setNiveis).sort((a, b) => {
      const nA = parseInt(a, 10) || 0;
      const nB = parseInt(b, 10) || 0;
      return nA - nB;
    });

    if (lista.length === 0) {
      return ['1', '2', '3', '4', '5'];
    }
    return lista;
  }, [enderecosFiltrados]);

  // Lista com multiplicação de cópias
  const faixasNivelQueue = useMemo(() => {
    if (!isFaixaNivel) return [];
    const queue: { nivel: string; id: string }[] = [];
    const qtdCopias = Math.max(1, copiasFaixaNivel);
    for (const niv of niveisDistintos) {
      for (let c = 1; c <= qtdCopias; c++) {
        queue.push({
          nivel: niv,
          id: `${niv}_copia_${c}`,
        });
      }
    }
    return queue;
  }, [isFaixaNivel, niveisDistintos, copiasFaixaNivel]);

  // Cálculo de campos marcados para escala dinâmica de visibilidade
  const totalCamposCoords = [
    info.mostrarRua,
    info.mostrarTorre,
    info.mostrarNivel,
    info.mostrarPosicao,
  ].filter(Boolean).length || 1;

  // Cálculo de páginas
  const itensPorPagina = isFaixaNivel
    ? 3
    : isMontante
    ? 3
    : modeloLayout === '2_POR_FOLHA'
    ? 2
    : modeloLayout === '4_POR_FOLHA'
    ? 4
    : 8;

  const totalPaginas = isFaixaNivel
    ? Math.ceil(faixasNivelQueue.length / 3) || 1
    : isMontante
    ? Math.ceil(colunasMontante.length / 3) || 1
    : Math.ceil(enderecosFiltrados.length / itensPorPagina) || 1;

  const [paginaVisualizada, setPaginaVisualizada] = useState(1);

  // Resetar página visualizada se ultrapassar total
  useEffect(() => {
    if (paginaVisualizada > totalPaginas) {
      setPaginaVisualizada(1);
    }
  }, [paginaVisualizada, totalPaginas]);

  // Itens da página atual do preview
  const faixasPaginaAtual = useMemo(() => {
    if (!isFaixaNivel) return [];
    const inicio = (paginaVisualizada - 1) * 3;
    return faixasNivelQueue.slice(inicio, inicio + 3);
  }, [isFaixaNivel, faixasNivelQueue, paginaVisualizada]);

  const colunasPaginaAtual = useMemo(() => {
    if (!isMontante || isFaixaNivel) return [];
    const inicio = (paginaVisualizada - 1) * 3;
    return colunasMontante.slice(inicio, inicio + 3);
  }, [isMontante, isFaixaNivel, colunasMontante, paginaVisualizada]);

  const itensPaginaAtual = useMemo(() => {
    if (isMontante || isFaixaNivel) return [];
    const inicio = (paginaVisualizada - 1) * itensPorPagina;
    return enderecosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [isMontante, isFaixaNivel, enderecosFiltrados, paginaVisualizada, itensPorPagina]);

  if (!aberto) return null;

  // Toggle marcar/desmarcar todos os campos visuais
  const todosMarcados =
    info.mostrarDeposito &&
    info.mostrarRua &&
    info.mostrarTorre &&
    info.mostrarNivel &&
    info.mostrarPosicao &&
    info.mostrarTipo &&
    info.mostrarCodend;

  const handleToggleTodosCampos = () => {
    const novoValor = !todosMarcados;
    setInfo({
      mostrarDeposito: novoValor,
      mostrarRua: novoValor,
      mostrarTorre: novoValor,
      mostrarNivel: novoValor,
      mostrarPosicao: novoValor,
      mostrarTipo: novoValor,
      mostrarCodend: novoValor,
      mostrarDescrend: novoValor,
    });
  };

  // ══════════════════════════════════════════════════════════════════
  // DISPARAR IMPRESSÃO REAL EM JANELA ISOLADA
  // ══════════════════════════════════════════════════════════════════
  const handleImprimir = async () => {
    if (enderecosFiltrados.length === 0) return;

    // ─── CASO 0: FAIXA VERTICAL DE NÍVEL (POSTE/MONTANTE - 3 COLUNAS A4) ───
    if (isFaixaNivel) {
      if (faixasNivelQueue.length === 0) return;
      const paginasFaixa: { nivel: string; id: string }[][] = [];
      for (let i = 0; i < faixasNivelQueue.length; i += 3) {
        paginasFaixa.push(faixasNivelQueue.slice(i, i + 3));
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita popups para abrir a tela de impressão de etiquetas.');
        return;
      }

      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Impressão de Faixas Verticais de Nível (Poste/Montante)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }
    .folha-a4 {
      width: 100%;
      height: 100%;
      max-height: calc(297mm - 8mm);
      page-break-after: always;
      break-after: page;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr;
      gap: 3mm;
      box-sizing: border-box;
      overflow: hidden;
    }
    .folha-a4:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .faixa-nivel-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      background: #ffffff;
      border: 3.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 3mm 1mm;
      box-sizing: border-box;
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: hidden;
    }
    .faixa-nivel-card.nivel-par {
      border: 3.5px solid #2563eb !important;
    }
    .faixa-nivel-card.nivel-impar {
      border: 3.5px solid #ea580c !important;
    }
    .faixa-nivel-letras {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      flex: 1.1;
      width: 100%;
      padding-top: 2mm;
    }
    .faixa-nivel-letras span {
      font-size: ${tamanhoFonteLetrasFaixa}px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
      display: block;
      letter-spacing: 0;
    }
    .faixa-nivel-numero {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 0.9;
      padding-bottom: 2mm;
    }
    .faixa-nivel-numero span {
      font-size: ${tamanhoFonteNumeroFaixa}px;
      font-weight: 900;
      line-height: 0.9;
      display: block;
      letter-spacing: -2px;
    }
    .faixa-nivel-card.nivel-par .faixa-nivel-numero span {
      color: #2563eb;
    }
    .faixa-nivel-card.nivel-impar .faixa-nivel-numero span {
      color: #ea580c;
    }
  </style>
</head>
<body>
  ${paginasFaixa
    .map(
      (paginaCols) => `
    <div class="folha-a4 layout-faixa-nivel">
      ${paginaCols
        .map((f) => {
          const nNum = parseInt(f.nivel, 10) || 1;
          const classeParidade = nNum % 2 === 0 ? 'nivel-par' : 'nivel-impar';
          return `
        <div class="faixa-nivel-card ${classeParidade}">
          <div class="faixa-nivel-letras">
            <span>N</span>
            <span>I</span>
            <span>V</span>
            <span>E</span>
            <span>L</span>
          </div>
          <div class="faixa-nivel-numero">
            <span>${f.nivel}</span>
          </div>
        </div>
      `;
        })
        .join('')}
    </div>
  `
    )
    .join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }

    // ─── CASO 1: TIRA DE MONTANTE MULTI-NÍVEL (2 COLUNAS A4) ───
    if (isMontante) {
      const colunasData: {
        id: string;
        deposito: string;
        rua: string;
        torre: string;
        pos: string;
        niveis: {
          item: EnderecoAnaliticoItem;
          deposito: string;
          rua: string;
          torre: string;
          nivel: string;
          pos: string;
          qrcodeDataUrl: string;
        }[];
      }[] = [];

      for (const col of colunasMontante) {
        const niveisComQr: (typeof colunasData)[0]['niveis'] = [];
        for (const niv of col.niveis) {
          let qrcodeDataUrl = '';
          try {
            qrcodeDataUrl = await QRCode.toDataURL(niv.item.endereco, {
              width: 240,
              margin: 0,
              color: { dark: '#000000', light: '#ffffff' },
            });
          } catch (e) {
            console.error(e);
          }
          niveisComQr.push({
            ...niv,
            qrcodeDataUrl,
          });
        }
        colunasData.push({
          ...col,
          niveis: niveisComQr,
        });
      }

      // Dividir em páginas (3 colunas por folha A4 - largura ~60mm cada)
      const paginasMontante: (typeof colunasData)[] = [];
      for (let i = 0; i < colunasData.length; i += 3) {
        paginasMontante.push(colunasData.slice(i, i + 3));
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita popups para abrir a tela de impressão de etiquetas.');
        return;
      }

      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Impressão de Tiras de Montante Multi-Nível WMS</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
    }
    .folha-a4 {
      width: 100%;
      height: 100%;
      max-height: calc(297mm - 12mm);
      page-break-after: always;
      break-after: page;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr;
      gap: 3.5mm;
      box-sizing: border-box;
      overflow: hidden;
    }
    .folha-a4:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .montante-coluna-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2mm;
      height: 100%;
      max-height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .montante-topo-seta {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 28px;
      margin-bottom: 1.5mm;
      flex-shrink: 0;
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0;
      box-sizing: border-box;
    }
    .montante-seta-svg {
      width: 100%;
      height: 28px;
      display: block;
    }
    .montante-nivel-card {
      border: 3px solid #cbd5e1;
      border-radius: 6px;
      padding: 3px 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      flex: 1;
      min-height: 0;
      box-sizing: border-box;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: hidden;
    }
    /* Borda Par (Azul) e Ímpar (Laranja) */
    .montante-nivel-card.nivel-par {
      border: 3px solid #2563eb !important;
    }
    .montante-nivel-card.nivel-impar {
      border: 3px solid #ea580c !important;
    }
    .montante-nivel-card .etiqueta-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1px;
      margin-bottom: 1px;
      gap: 2px;
    }
    .montante-nivel-card .etiqueta-corpo-lateral {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      gap: 4px;
      margin: 1.5px 0;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .montante-nivel-card .etiqueta-lateral-qr-box {
      flex: 0.85;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px;
      text-align: center;
      box-sizing: border-box;
      overflow: hidden;
    }
    .montante-nivel-card .etiqueta-qrcode-lateral {
      flex: 1;
      min-height: 0;
      max-height: 100%;
      width: auto;
      max-width: 100%;
      object-fit: contain;
      display: block;
    }
    .montante-nivel-card .etiqueta-endereco-texto {
      font-size: 7px;
      font-weight: 800;
      font-family: 'JetBrains Mono', Courier, monospace;
      color: #0f172a;
      letter-spacing: 0;
      margin-top: 1px;
      line-height: 1;
      white-space: nowrap;
    }
    .montante-nivel-card .etiqueta-lateral-coords-col {
      flex: 1.45;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.5px;
    }
    .montante-nivel-card .coord-linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 1px 3px;
      flex: 1;
      min-height: 0;
    }
    .montante-nivel-card .coord-linha-label {
      font-weight: 900;
      color: #0284c7;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      font-size: 15px;
    }
    .montante-nivel-card .coord-linha-val {
      font-weight: 900;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1;
      font-size: 30px;
    }

    /* Fundo Nível Par (Azul) */
    .nivel-par .coord-linha-nivel-invertido {
      background: #2563eb !important;
      border: 1.5px solid #1d4ed8 !important;
    }
    .nivel-par .coord-linha-nivel-invertido .coord-linha-label {
      color: #dbeafe !important;
      font-size: 15px;
    }
    .nivel-par .coord-linha-nivel-invertido .coord-linha-val {
      color: #ffffff !important;
      font-size: 30px;
    }

    /* Fundo Nível Ímpar (Laranja) */
    .nivel-impar .coord-linha-nivel-invertido {
      background: #ea580c !important;
      border: 1.5px solid #c2410c !important;
    }
    .nivel-impar .coord-linha-nivel-invertido .coord-linha-label {
      color: #ffedd5 !important;
      font-size: 15px;
    }
    .nivel-impar .coord-linha-nivel-invertido .coord-linha-val {
      color: #ffffff !important;
      font-size: 30px;
    }

    /* Posição Picking Destaque Verde (Pulmão permanece azul/branco como Rua e Torre) */
    .montante-nivel-card .coord-linha-posicao-picking {
      border: 1.5px solid #16a34a !important;
      background: #f0fdf4 !important;
    }
    .montante-nivel-card .coord-linha-posicao-picking .coord-linha-label {
      color: #16a34a !important;
      font-size: 15px;
    }
    .montante-nivel-card .coord-linha-posicao-picking .coord-linha-val {
      color: #0f172a !important;
      font-size: 30px;
    }
    .montante-nivel-card .etiqueta-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 6.5px;
      color: #94a3b8;
      border-top: 1px dashed #e2e8f0;
      padding-top: 1px;
      margin-top: 1px;
    }
    .etiqueta-tipo-badge {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1px 3px;
      border-radius: 3px;
      border: 1px solid #cbd5e1;
    }
    .etiqueta-tipo-badge.picking {
      background: #dcfce7 !important;
      color: #15803d !important;
      border-color: #86efac;
    }
    .etiqueta-tipo-badge.pulmao {
      background: #e0f2fe !important;
      color: #0369a1 !important;
      border-color: #7dd3fc;
    }
    .etiqueta-codend-tag {
      font-size: 7.5px;
      font-weight: 700;
      color: #64748b;
      white-space: nowrap;
    }
    .etiqueta-deposito-tag {
      font-size: 8px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
      white-space: nowrap;
    }

    /* Adaptações automáticas de escala por quantidade de níveis (3 Colunas ~60mm) */
    .montante-coluna-container.col-niveis-2 .coord-linha-label,
    .montante-coluna-container.col-niveis-3 .coord-linha-label,
    .montante-coluna-container.col-niveis-4 .coord-linha-label { font-size: 15px; }
    .montante-coluna-container.col-niveis-2 .coord-linha-val,
    .montante-coluna-container.col-niveis-3 .coord-linha-val,
    .montante-coluna-container.col-niveis-4 .coord-linha-val { font-size: 30px; }
    .montante-coluna-container.col-niveis-2 .coord-linha-nivel-invertido .coord-linha-val,
    .montante-coluna-container.col-niveis-3 .coord-linha-nivel-invertido .coord-linha-val,
    .montante-coluna-container.col-niveis-4 .coord-linha-nivel-invertido .coord-linha-val { font-size: 30px; }
    .montante-coluna-container.col-niveis-5 .coord-linha-label,
    .montante-coluna-container.col-niveis-6 .coord-linha-label { font-size: 11px; }
    .montante-coluna-container.col-niveis-5 .coord-linha-val,
    .montante-coluna-container.col-niveis-6 .coord-linha-val { font-size: 24px; }
    .montante-coluna-container.col-niveis-5 .coord-linha-nivel-invertido .coord-linha-val,
    .montante-coluna-container.col-niveis-6 .coord-linha-nivel-invertido .coord-linha-val { font-size: 24px; }
    .montante-coluna-container.col-niveis-4 .montante-nivel-card,
    .montante-coluna-container.col-niveis-5 .montante-nivel-card,
    .montante-coluna-container.col-niveis-6 .montante-nivel-card {
      padding: 2px 3px;
    }
  </style>
</head>
<body>
  ${paginasMontante
    .map(
      (paginaColunas) => `
    <div class="folha-a4 layout-montante">
      ${paginaColunas
        .map(
          (col) => `
        <div class="montante-coluna-container col-niveis-${col.niveis.length}">
          ${
            mostrarSetaTopo
              ? `
          <div class="montante-topo-seta">
            ${renderSetaSvgString(calcularDirecaoSeta(col.torre, col.pos, direcaoPosicaoImpar))}
          </div>
          `
              : ''
          }
          ${col.niveis
            .map(
              (niv) => {
                const nNum = parseInt(niv.nivel, 10) || 1;
                const classeParidade = nNum % 2 === 0 ? 'nivel-par' : 'nivel-impar';
                return `
            <div class="montante-nivel-card ${classeParidade}">
              <!-- Topo: Tipo, Depósito & Cód -->
              <div class="etiqueta-header">
                ${
                  info.mostrarTipo
                    ? `<span class="etiqueta-tipo-badge ${niv.item.tipo.toLowerCase()}">${niv.item.tipo}</span>`
                    : `<span></span>`
                }
                ${
                  info.mostrarDeposito && niv.deposito
                    ? `<span class="etiqueta-deposito-tag">DEPÓSITO ${niv.deposito.padStart(2, '0')}</span>`
                    : `<span></span>`
                }
                ${
                  info.mostrarCodend
                    ? `<span class="etiqueta-codend-tag">CÓD: <strong>${niv.item.codend}</strong></span>`
                    : ''
                }
              </div>

              <!-- Corpo Lateral: QR à Esquerda e Coordenadas à Direita -->
              <div class="etiqueta-corpo-lateral">
                <div class="etiqueta-lateral-qr-box">
                  <img src="${niv.qrcodeDataUrl}" class="etiqueta-qrcode-lateral" alt="QR Code Endereço" />
                  <span class="etiqueta-endereco-texto">${niv.item.endereco}</span>
                </div>

                <div class="etiqueta-lateral-coords-col">
                  ${
                    info.mostrarRua
                      ? `<div class="coord-linha"><span class="coord-linha-label">RUA</span><span class="coord-linha-val">${removerZerosEsquerda(niv.rua)}</span></div>`
                      : ''
                  }
                  ${
                    info.mostrarTorre
                      ? `<div class="coord-linha"><span class="coord-linha-label">TORRE</span><span class="coord-linha-val">${removerZerosEsquerda(niv.torre)}</span></div>`
                      : ''
                  }
                  ${
                    info.mostrarNivel
                      ? `<div class="coord-linha coord-linha-nivel-invertido"><span class="coord-linha-label">NÍVEL</span><span class="coord-linha-val">${removerZerosEsquerda(niv.nivel)}</span></div>`
                      : ''
                  }
                  ${
                    info.mostrarPosicao
                      ? `<div class="coord-linha ${niv.item.tipo?.toUpperCase() === 'PICKING' ? 'coord-linha-posicao-picking' : ''}"><span class="coord-linha-label">POSIÇÃO</span><span class="coord-linha-val">${removerZerosEsquerda(niv.pos)}</span></div>`
                      : ''
                  }
                </div>
              </div>

              <!-- Rodapé -->
              <div class="etiqueta-footer">
                <span>${info.mostrarDescrend && niv.item.descrend ? niv.item.descrend : 'WMS ConferCheck'}</span>
                <span>Galpão Logístico</span>
              </div>
            </div>
          `;
              }
            )
            .join('')}
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    }

    // ─── CASO 2: ETIQUETAS INDIVIDUAIS (HORIZONTAL OU QR LATERAL) ───
    // Gerar SVGs e QR Codes pré-renderizados para cada etiqueta
    const etiquetasData: {
      item: EnderecoAnaliticoItem;
      deposito: string;
      rua: string;
      torre: string;
      nivel: string;
      pos: string;
      barcodeSvg: string;
      qrcodeDataUrl: string;
    }[] = [];

    // Gerador de SVG do Barcode em memória
    for (const item of enderecosFiltrados) {
      const det = parseEndereco(item.endereco, item.descrend);
      const deposito = det?.deposito || '';
      const rua = det?.rua || '—';
      const torre = det?.torre || '—';
      const nivel = det?.nivel || '—';
      const pos = det?.pos || '—';

      // Barcode SVG
      let barcodeSvg = '';
      if (estiloVisual === 'PADRAO_HORIZONTAL' && (tipoCodigo === 'BARRAS' || tipoCodigo === 'AMBOS')) {
        try {
          const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          JsBarcode(svgNode, item.endereco, {
            format: 'CODE128',
            width: modeloLayout === '2_POR_FOLHA' ? 2.5 : modeloLayout === '4_POR_FOLHA' ? 2.0 : 1.5,
            height: modeloLayout === '2_POR_FOLHA' ? 55 : modeloLayout === '4_POR_FOLHA' ? 42 : 30,
            displayValue: false,
            margin: 0,
          });
          barcodeSvg = svgNode.outerHTML;
        } catch (e) {
          console.error(e);
        }
      }

      // QR Code Data URL
      let qrcodeDataUrl = '';
      if (estiloVisual === 'QR_LATERAL_VERTICAL' || tipoCodigo === 'QRCODE' || tipoCodigo === 'AMBOS') {
        try {
          const qrSize =
            estiloVisual === 'QR_LATERAL_VERTICAL'
              ? modeloLayout === '2_POR_FOLHA'
                ? 320
                : modeloLayout === '4_POR_FOLHA'
                ? 240
                : 150
              : modeloLayout === '2_POR_FOLHA'
              ? 120
              : modeloLayout === '4_POR_FOLHA'
              ? 90
              : 64;

          qrcodeDataUrl = await QRCode.toDataURL(item.endereco, {
            width: qrSize,
            margin: estiloVisual === 'QR_LATERAL_VERTICAL' ? 0 : 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch (e) {
          console.error(e);
        }
      }

      etiquetasData.push({
        item,
        deposito,
        rua,
        torre,
        nivel,
        pos,
        barcodeSvg,
        qrcodeDataUrl,
      });
    }

    // Dividir em páginas
    const paginas: (typeof etiquetasData)[] = [];
    for (let i = 0; i < etiquetasData.length; i += itensPorPagina) {
      paginas.push(etiquetasData.slice(i, i + itensPorPagina));
    }

    // Configurações de CSS por layout
    const isLandscape = modeloLayout === '4_POR_FOLHA';
    const pageOrientation = isLandscape ? 'A4 landscape' : 'A4 portrait';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para abrir a tela de impressão de etiquetas.');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Impressão de Etiquetas de Endereço WMS</title>
  <style>
    @page {
      size: ${pageOrientation};
      margin: 8mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #0f172a;
    }
    .folha-a4 {
      width: 100%;
      height: 100%;
      page-break-after: always;
      display: grid;
      gap: 6mm;
    }
    .folha-a4:last-child {
      page-break-after: auto;
    }

    /* ─── Layout 2 por folha (A4 Retrato - 2 linhas x 1 col) ─── */
    .layout-2 {
      grid-template-rows: 1fr 1fr;
      grid-template-columns: 1fr;
      height: calc(297mm - 16mm);
    }
    .layout-2 .etiqueta-card {
      border: 2px dashed #94a3b8;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }

    /* ─── Layout 4 por folha (A4 Paisagem - 2 cols x 2 linhas) ─── */
    .layout-4 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      height: calc(210mm - 16mm);
    }
    .layout-4 .etiqueta-card {
      border: 2px dashed #94a3b8;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }

    /* ─── Layout 8 por folha (A4 Retrato - 2 cols x 4 linhas) ─── */
    .layout-8 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(4, 1fr);
      height: calc(297mm - 16mm);
    }
    .layout-8 .etiqueta-card {
      border: 1.5px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }

    /* Borda sólida de 3px nos Cards Par (Azul) e Ímpar (Laranja) */
    .etiqueta-card.nivel-par {
      border: 3px solid #2563eb !important;
    }
    .etiqueta-card.nivel-impar {
      border: 3px solid #ea580c !important;
    }

    /* ─── Cabeçalho da Etiqueta ─── */
    .etiqueta-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .etiqueta-tipo-badge {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .etiqueta-tipo-badge.picking {
      background: #dcfce7 !important;
      color: #15803d !important;
      border-color: #86efac;
    }
    .etiqueta-tipo-badge.pulmao {
      background: #e0f2fe !important;
      color: #0369a1 !important;
      border-color: #7dd3fc;
    }
    .etiqueta-codend-tag {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
    }

    /* ─── Coordenadas Humanas (Chips com Dimensionamento Dinâmico) ─── */
    .etiqueta-coords-grid {
      display: flex;
      align-items: stretch;
      justify-content: center;
      gap: 12px;
      margin: 10px 0;
      flex-wrap: nowrap;
      flex: 1;
    }
    .coord-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border: 2px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px 14px;
      flex: 1;
      text-align: center;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }
    .coord-chip.pos-destaque,
    .coord-chip.pos-picking {
      border: 3px solid #16a34a !important;
      background: #f0fdf4 !important;
    }
    .coord-label {
      font-weight: 900;
      color: #0284c7;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .coord-chip.pos-destaque .coord-label,
    .coord-chip.pos-picking .coord-label {
      color: #16a34a;
    }
    .coord-val {
      font-weight: 900;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.05;
    }

    /* ─── Escala Dinâmica por Quantidade de Campos Marcados ─── */
    /* 1 campo marcado (ex: Apenas POSIÇÃO) -> Tamanho GIGANTE para longa distância */
    .campos-1 .coord-chip {
      padding: 18px 24px;
      min-height: 130px;
    }
    .layout-2 .campos-1 .coord-label { font-size: 26px; margin-bottom: 8px; }
    .layout-2 .campos-1 .coord-val { font-size: 100px; }

    .layout-4 .campos-1 .coord-label { font-size: 20px; margin-bottom: 6px; }
    .layout-4 .campos-1 .coord-val { font-size: 76px; }

    .layout-8 .campos-1 .coord-label { font-size: 14px; margin-bottom: 3px; }
    .layout-8 .campos-1 .coord-val { font-size: 44px; }

    /* 2 campos marcados (ex: RUA e POSIÇÃO) */
    .campos-2 .coord-chip {
      padding: 14px 18px;
      min-height: 100px;
    }
    .layout-2 .campos-2 .coord-label { font-size: 22px; margin-bottom: 6px; }
    .layout-2 .campos-2 .coord-val { font-size: 74px; }

    .layout-4 .campos-2 .coord-label { font-size: 16px; margin-bottom: 4px; }
    .layout-4 .campos-2 .coord-val { font-size: 54px; }

    .layout-8 .campos-2 .coord-label { font-size: 12px; margin-bottom: 2px; }
    .layout-8 .campos-2 .coord-val { font-size: 32px; }

    /* 3 ou 4 campos marcados (ex: RUA, TORRE, NÍVEL, POSIÇÃO) */
    .campos-3 .coord-chip,
    .campos-4 .coord-chip {
      padding: 8px 10px;
    }
    .layout-2 .campos-3 .coord-label,
    .layout-2 .campos-4 .coord-label { font-size: 16px; margin-bottom: 4px; }
    .layout-2 .campos-3 .coord-val,
    .layout-2 .campos-4 .coord-val { font-size: 50px; }

    .layout-4 .campos-3 .coord-label,
    .layout-4 .campos-4 .coord-label { font-size: 13px; margin-bottom: 3px; }
    .layout-4 .campos-3 .coord-val,
    .layout-4 .campos-4 .coord-val { font-size: 38px; }

    .layout-8 .campos-3 .coord-label,
    .layout-8 .campos-4 .coord-label { font-size: 10px; margin-bottom: 2px; }
    .layout-8 .campos-3 .coord-val,
    .layout-8 .campos-4 .coord-val { font-size: 22px; }

    /* ─── Área de Códigos ─── */
    .etiqueta-codigos-area {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 4px;
    }
    .etiqueta-barcode-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .etiqueta-barcode-wrap svg {
      max-width: 100%;
      height: auto;
    }
    .etiqueta-barcode-texto {
      font-size: 11px;
      font-weight: 700;
      font-family: 'Courier New', Courier, monospace;
      color: #0f172a;
      margin-top: 2px;
    }
    .layout-8 .etiqueta-barcode-texto {
      font-size: 9px;
    }
    .etiqueta-qrcode-img {
      display: block;
      object-fit: contain;
    }

    /* ─── Estilo Lateral: QR Code à Esquerda + Coordenadas Verticais à Direita ─── */
    .etiqueta-corpo-lateral {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      gap: 14px;
      flex: 1;
      margin: 6px 0;
    }
    .etiqueta-lateral-qr-box {
      flex: 1.05;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 6px;
      text-align: center;
      box-sizing: border-box;
    }
    .etiqueta-qrcode-lateral {
      flex: 1;
      width: 100%;
      max-height: calc(100% - 18px);
      object-fit: contain;
      display: block;
    }
    .etiqueta-endereco-texto {
      font-size: 11px;
      font-weight: 800;
      font-family: 'JetBrains Mono', Courier, monospace;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin-top: 2px;
      line-height: 1.1;
    }
    .etiqueta-lateral-coords-col {
      flex: 1.15;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
    }
    .coord-linha {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 2px solid #cbd5e1;
      border-radius: 10px;
      padding: 6px 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .coord-linha-label {
      font-weight: 900;
      color: #0284c7;
      letter-spacing: 1px;
      text-transform: uppercase;
      font-size: 13px;
    }
    .coord-linha-val {
      font-weight: 900;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1;
      font-size: 32px;
    }
    /* Nível Invertido Alto Contraste (Fundo Preto / Texto Branco) */
    .coord-linha-nivel-invertido {
      background: #0f172a !important;
      border: 2px solid #0f172a !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }
    .coord-linha-nivel-invertido .coord-linha-label {
      color: #94a3b8 !important;
    }
    .coord-linha-nivel-invertido .coord-linha-val {
      color: #ffffff !important;
      font-size: 34px;
    }

    /* Fundo Nível Par (Azul) */
    .nivel-par .coord-linha-nivel-invertido {
      background: #2563eb !important;
      border: 2px solid #1d4ed8 !important;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    }
    .nivel-par .coord-linha-nivel-invertido .coord-linha-label {
      color: #dbeafe !important;
    }
    .nivel-par .coord-linha-nivel-invertido .coord-linha-val {
      color: #ffffff !important;
    }
    .nivel-par .coord-chip.nivel-chip {
      background: #2563eb !important;
      border: 2.5px solid #1d4ed8 !important;
    }
    .nivel-par .coord-chip.nivel-chip .coord-label {
      color: #dbeafe !important;
    }
    .nivel-par .coord-chip.nivel-chip .coord-val {
      color: #ffffff !important;
    }

    /* Fundo Nível Ímpar (Laranja) */
    .nivel-impar .coord-linha-nivel-invertido {
      background: #ea580c !important;
      border: 2px solid #c2410c !important;
      box-shadow: 0 2px 6px rgba(234, 88, 12, 0.25);
    }
    .nivel-impar .coord-linha-nivel-invertido .coord-linha-label {
      color: #ffedd5 !important;
    }
    .nivel-impar .coord-linha-nivel-invertido .coord-linha-val {
      color: #ffffff !important;
    }
    .nivel-impar .coord-chip.nivel-chip {
      background: #ea580c !important;
      border: 2.5px solid #c2410c !important;
    }
    .nivel-impar .coord-chip.nivel-chip .coord-label {
      color: #ffedd5 !important;
    }
    .nivel-impar .coord-chip.nivel-chip .coord-val {
      color: #ffffff !important;
    }
    /* Posição Destaque Picking (Pulmão permanece azul/branco como Rua e Torre) */
    .coord-linha-posicao-picking {
      border: 2px solid #16a34a !important;
      background: #f0fdf4 !important;
    }
    .coord-linha-posicao-picking .coord-linha-label {
      color: #16a34a !important;
    }
    .coord-linha-posicao-picking .coord-linha-val {
      color: #0f172a !important;
    }

    /* Escalas no Estilo Lateral */
    .layout-2 .etiqueta-corpo-lateral { gap: 20px; margin: 12px 0; }
    .layout-2 .etiqueta-lateral-qr-box { padding: 10px; }
    .layout-2 .etiqueta-qrcode-lateral { max-height: calc(100% - 24px); }
    .layout-2 .coord-linha { padding: 12px 20px; border-radius: 12px; }
    .layout-2 .coord-linha-label { font-size: 18px; }
    .layout-2 .coord-linha-val { font-size: 48px; }
    .layout-2 .coord-linha-nivel-invertido .coord-linha-val { font-size: 52px; }
    .layout-2 .etiqueta-endereco-texto { font-size: 14px; margin-top: 4px; }

    .layout-4 .etiqueta-lateral-qr-box { padding: 6px; }
    .layout-4 .etiqueta-qrcode-lateral { max-height: calc(100% - 18px); }
    .layout-4 .coord-linha { padding: 6px 14px; }
    .layout-4 .coord-linha-label { font-size: 13px; }
    .layout-4 .coord-linha-val { font-size: 32px; }
    .layout-4 .coord-linha-nivel-invertido .coord-linha-val { font-size: 34px; }

    .layout-8 .etiqueta-corpo-lateral { gap: 6px; margin: 3px 0; }
    .layout-8 .etiqueta-lateral-qr-box { padding: 3px; }
    .layout-8 .etiqueta-qrcode-lateral { max-height: calc(100% - 12px); }
    .layout-8 .coord-linha { padding: 2px 8px; border-radius: 6px; }
    .layout-8 .coord-linha-label { font-size: 9px; }
    .layout-8 .coord-linha-val { font-size: 18px; }
    .layout-8 .coord-linha-nivel-invertido .coord-linha-val { font-size: 20px; }
    .layout-8 .etiqueta-endereco-texto { font-size: 8px; margin-top: 1px; }

    .etiqueta-deposito-tag {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
    }
    .layout-2 .etiqueta-deposito-tag { font-size: 16px; }
    .layout-4 .etiqueta-deposito-tag { font-size: 11px; }
    .layout-8 .etiqueta-deposito-tag { font-size: 8px; }

    /* ─── Rodapé ─── */
    .etiqueta-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px dashed #e2e8f0;
      padding-top: 3px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  ${paginas
    .map(
      (paginaItens) => `
    <div class="folha-a4 layout-${modeloLayout.charAt(0)}">
      ${paginaItens
        .map(
          (d) => {
            const nNum = parseInt(d.nivel, 10) || 1;
            const classeParidade = nNum % 2 === 0 ? 'nivel-par' : 'nivel-impar';
            return `
        <div class="etiqueta-card ${estiloVisual === 'QR_LATERAL_VERTICAL' ? 'estilo-lateral' : 'estilo-horizontal'} ${classeParidade}">
          <!-- Topo: Tipo, Depósito & Cód -->
          <div class="etiqueta-header">
            ${
              info.mostrarTipo
                ? `<span class="etiqueta-tipo-badge ${d.item.tipo.toLowerCase()}">${d.item.tipo}</span>`
                : `<span></span>`
            }
            ${
              info.mostrarDeposito && d.deposito
                ? `<span class="etiqueta-deposito-tag">DEPÓSITO ${d.deposito.padStart(2, '0')}</span>`
                : `<span></span>`
            }
            ${
              info.mostrarCodend
                ? `<span class="etiqueta-codend-tag">CÓD: <strong>${d.item.codend}</strong></span>`
                : ''
            }
          </div>

          ${
            estiloVisual === 'QR_LATERAL_VERTICAL'
              ? `
            <!-- Corpo QR Lateral + Coordenadas Verticais -->
            <div class="etiqueta-corpo-lateral">
              <!-- QR Code com Destaque Lateral Esquerdo -->
              <div class="etiqueta-lateral-qr-box">
                ${d.qrcodeDataUrl ? `<img src="${d.qrcodeDataUrl}" class="etiqueta-qrcode-lateral" alt="QR Code Endereço" />` : ''}
                <span class="etiqueta-endereco-texto">${d.item.endereco}</span>
              </div>

              <!-- Coordenadas Verticais com Destaque Escuro no Nível -->
              <div class="etiqueta-lateral-coords-col">
                ${
                  info.mostrarRua
                    ? `<div class="coord-linha"><span class="coord-linha-label">RUA</span><span class="coord-linha-val">${removerZerosEsquerda(d.rua)}</span></div>`
                    : ''
                }
                ${
                  info.mostrarTorre
                    ? `<div class="coord-linha"><span class="coord-linha-label">TORRE</span><span class="coord-linha-val">${removerZerosEsquerda(d.torre)}</span></div>`
                    : ''
                }
                ${
                  info.mostrarNivel
                    ? `<div class="coord-linha coord-linha-nivel-invertido"><span class="coord-linha-label">NÍVEL</span><span class="coord-linha-val">${removerZerosEsquerda(d.nivel)}</span></div>`
                    : ''
                }
                ${
                  info.mostrarPosicao
                    ? `<div class="coord-linha ${d.item.tipo?.toUpperCase() === 'PICKING' ? 'coord-linha-posicao-picking' : ''}"><span class="coord-linha-label">POSIÇÃO</span><span class="coord-linha-val">${removerZerosEsquerda(d.pos)}</span></div>`
                    : ''
                }
              </div>
            </div>
            `
              : `
            <!-- Coordenadas em Chips Clássicos -->
            <div class="etiqueta-coords-grid campos-${totalCamposCoords}">
              ${
                info.mostrarRua
                  ? `<div class="coord-chip"><span class="coord-label">RUA</span><span class="coord-val">${d.rua}</span></div>`
                  : ''
              }
              ${
                info.mostrarTorre
                  ? `<div class="coord-chip"><span class="coord-label">TORRE</span><span class="coord-val">${d.torre}</span></div>`
                  : ''
              }
              ${
                info.mostrarNivel
                  ? `<div class="coord-chip nivel-chip"><span class="coord-label">NÍVEL</span><span class="coord-val">${d.nivel}</span></div>`
                  : ''
              }
              ${
                info.mostrarPosicao
                  ? `<div class="coord-chip ${d.item.tipo?.toUpperCase() === 'PICKING' ? 'pos-destaque pos-picking' : ''}"><span class="coord-label">POSIÇÃO</span><span class="coord-val">${d.pos}</span></div>`
                  : ''
              }
            </div>

            <!-- Área dos Códigos (Barras / QR) -->
            <div class="etiqueta-codigos-area">
              ${
                d.barcodeSvg
                  ? `
                  <div class="etiqueta-barcode-wrap">
                    ${d.barcodeSvg}
                    <span class="etiqueta-barcode-texto">${d.item.endereco}</span>
                  </div>`
                  : ''
              }
              ${
                d.qrcodeDataUrl
                  ? `<img src="${d.qrcodeDataUrl}" class="etiqueta-qrcode-img" alt="QR Code Endereço" />`
                  : ''
              }
            </div>
            `
          }

          <!-- Rodapé com Descrição ou Identificação WMS -->
          <div class="etiqueta-footer">
            <span>${info.mostrarDescrend && d.item.descrend ? d.item.descrend : 'WMS ConferCheck'}</span>
            <span>Galpão Logístico</span>
          </div>
        </div>
      `;
          }
        )
        .join('')}
    </div>
  `
    )
    .join('')}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="modal-etiquetas-overlay" onClick={onFechar}>
      <div className="modal-etiquetas-container" onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <div className="modal-etiquetas-header">
          <div className="modal-etiquetas-title">
            <span style={{ fontSize: 22 }}>🖨️</span>
            <div>
              <h3>Central de Impressão de Etiquetas WMS</h3>
              <p>Identificação de endereços físicos para longarinas, prateleiras e gaveteiros</p>
            </div>
          </div>
          <button type="button" className="modal-etiquetas-btn-fechar" onClick={onFechar} title="Fechar (Esc)">
            ✕
          </button>
        </div>

        {/* CORPO: DUAS COLUNAS (CONFIGURAÇÕES À ESQUERDA, PREVIEW DA FOLHA A4 À DIREITA) */}
        <div className="modal-etiquetas-body">
          {/* PAINEL ESQUERDO: CONFIGURAÇÕES */}
          <div className="modal-etiquetas-painel-config">
            {/* 1. SELEÇÃO DE ESCOPO / ENDEREÇOS */}
            <div className="config-secao">
              <label className="config-secao-titulo">
                <span>📍</span> 1. Endereços para Impressão
              </label>

              <div className="escopo-tabs">
                <button
                  type="button"
                  className={`escopo-tab ${modoEscopo === 'SELECIONADOS' ? 'ativo' : ''}`}
                  onClick={() => setModoEscopo('SELECIONADOS')}
                  disabled={enderecosPreSelecionados.length === 0}
                >
                  Selecionados ({enderecosPreSelecionados.length})
                </button>
                <button
                  type="button"
                  className={`escopo-tab ${modoEscopo === 'TODOS' ? 'ativo' : ''}`}
                  onClick={() => setModoEscopo('TODOS')}
                >
                  Todos ({todosEnderecos.length})
                </button>
                <button
                  type="button"
                  className={`escopo-tab ${modoEscopo === 'INTERVALO' ? 'ativo' : ''}`}
                  onClick={() => setModoEscopo('INTERVALO')}
                >
                  Intervalo / Filtro
                </button>
              </div>

              {/* Filtros por Intervalo (se modo INTERVALO) */}
              {modoEscopo === 'INTERVALO' && (
                <div className="intervalo-filtros-box">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      className={`btn-filtro-tipo ${filtroTipo === 'TODOS' ? 'ativo' : ''}`}
                      onClick={() => setFiltroTipo('TODOS')}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className={`btn-filtro-tipo ${filtroTipo === 'PICKING' ? 'ativo' : ''}`}
                      onClick={() => setFiltroTipo('PICKING')}
                    >
                      Picking
                    </button>
                    <button
                      type="button"
                      className={`btn-filtro-tipo ${filtroTipo === 'PULMAO' ? 'ativo' : ''}`}
                      onClick={() => setFiltroTipo('PULMAO')}
                    >
                      Pulmão
                    </button>
                  </div>

                  <div className="grid-intervalo-inputs">
                    <div>
                      <span className="input-label-mini">Depósito:</span>
                      <input
                        type="number"
                        placeholder="Ex: 1"
                        value={depositoFiltro}
                        onChange={(e) => setDepositoFiltro(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                    <div>
                      <span className="input-label-mini">Rua De:</span>
                      <input
                        type="number"
                        placeholder="Ex: 1"
                        value={ruaDe}
                        onChange={(e) => setRuaDe(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                    <div>
                      <span className="input-label-mini">Até:</span>
                      <input
                        type="number"
                        placeholder="Ex: 5"
                        value={ruaAte}
                        onChange={(e) => setRuaAte(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                    <div>
                      <span className="input-label-mini">Torre De:</span>
                      <input
                        type="number"
                        placeholder="Ex: 1"
                        value={torreDe}
                        onChange={(e) => setTorreDe(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                    <div>
                      <span className="input-label-mini">Até:</span>
                      <input
                        type="number"
                        placeholder="Ex: 10"
                        value={torreAte}
                        onChange={(e) => setTorreAte(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                    <div>
                      <span className="input-label-mini">Nível De:</span>
                      <input
                        type="number"
                        placeholder="Ex: 1"
                        value={nivelDe}
                        onChange={(e) => setNivelDe(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                    <div>
                      <span className="input-label-mini">Até:</span>
                      <input
                        type="number"
                        placeholder="Ex: 4"
                        value={nivelAte}
                        onChange={(e) => setNivelAte(e.target.value)}
                        className="input-mini"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. MODELO DE LAYOUT A4 (3 VERSÕES SOLICITADAS) */}
            <div className="config-secao">
              <label className="config-secao-titulo">
                <span>📄</span> 2. Modelo de Folha A4
              </label>

              <div className="grid-modelos-layout">
                <div
                  className={`card-modelo-layout ${modeloLayout === '4_POR_FOLHA' ? 'selecionado' : ''}`}
                  onClick={() => setModeloLayout('4_POR_FOLHA')}
                >
                  <div className="modelo-icone">🏷️ 4 por folha</div>
                  <div className="modelo-desc">Longarina Média (~14x10cm)</div>
                  <span className="modelo-tag-recomendado">Mais Usado</span>
                </div>

                <div
                  className={`card-modelo-layout ${modeloLayout === '2_POR_FOLHA' ? 'selecionado' : ''}`}
                  onClick={() => setModeloLayout('2_POR_FOLHA')}
                >
                  <div className="modelo-icone">🪧 2 por folha</div>
                  <div className="modelo-desc">Meia Folha Grande (~20x14cm)</div>
                </div>

                <div
                  className={`card-modelo-layout ${modeloLayout === '8_POR_FOLHA' ? 'selecionado' : ''}`}
                  onClick={() => setModeloLayout('8_POR_FOLHA')}
                >
                  <div className="modelo-icone">📑 8 por folha</div>
                  <div className="modelo-desc">Grade Compacta (~9x7cm)</div>
                </div>
              </div>
            </div>

            {/* 3. ESTILO VISUAL DA ETIQUETA (HORIZONTAL vs QR LATERAL VERTICAL) */}
            <div className="config-secao">
              <label className="config-secao-titulo">
                <span>🎨</span> 3. Estilo Visual da Etiqueta
              </label>

              <div className="grid-estilos-layout">
                <div
                  className={`card-estilo-layout ${estiloVisual === 'PADRAO_HORIZONTAL' ? 'selecionado' : ''}`}
                  onClick={() => setEstiloVisual('PADRAO_HORIZONTAL')}
                >
                  <div className="estilo-icone">🏷️ Clássico Horizontal</div>
                  <div className="estilo-desc">Coordenadas em grade + Código abaixo</div>
                </div>

                <div
                  className={`card-estilo-layout ${estiloVisual === 'QR_LATERAL_VERTICAL' ? 'selecionado' : ''}`}
                  onClick={() => {
                    setEstiloVisual('QR_LATERAL_VERTICAL');
                    if (tipoCodigo === 'BARRAS') {
                      setTipoCodigo('QRCODE');
                    }
                  }}
                >
                  <div className="estilo-icone">🏁 QR Lateral + Vertical</div>
                  <div className="estilo-desc">QR Code amplo + Nível invertido (Longarina)</div>
                </div>

                <div
                  className={`card-estilo-layout ${estiloVisual === 'MONTANTE_VERTICAL_2_COL' ? 'selecionado' : ''}`}
                  onClick={() => {
                    setEstiloVisual('MONTANTE_VERTICAL_2_COL');
                    if (tipoCodigo === 'BARRAS') {
                      setTipoCodigo('QRCODE');
                    }
                  }}
                >
                  <div className="estilo-icone">🪜 Tira de Montante Multi-Nível</div>
                  <div className="estilo-desc">3 colunas por folha (~60mm) • Níveis empilhados por posição</div>
                  <span className="modelo-tag-novo">Novo</span>
                </div>

                <div
                  className={`card-estilo-layout ${estiloVisual === 'FAIXA_NIVEL_VERTICAL' ? 'selecionado' : ''}`}
                  onClick={() => setEstiloVisual('FAIXA_NIVEL_VERTICAL')}
                >
                  <div className="estilo-icone">🗼 Faixa Vertical de Nível</div>
                  <div className="estilo-desc">3 faixas por folha A4 • N-I-V-E-L vertical para poste/montante</div>
                  <span className="modelo-tag-novo">Novo</span>
                </div>
              </div>

              {/* Sub-configuração da Seta Indicativa do Montante */}
              {isMontante && (
                <div className="montante-config-box">
                  <div className="montante-config-header">
                    <span className="montante-config-titulo">
                      <span>🧭</span> Seta Indicativa no Topo da Coluna
                    </span>
                    <label className="checkbox-item" style={{ margin: 0, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={mostrarSetaTopo}
                        onChange={(e) => setMostrarSetaTopo(e.target.checked)}
                      />
                      <span>Exibir Seta</span>
                    </label>
                  </div>

                  {mostrarSetaTopo && (
                    <div>
                      <span style={{ fontSize: 11, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Direção para <strong>Torre Ímpar + Posição Ímpar</strong>:
                      </span>
                      <div className="montante-direcao-grid">
                        <button
                          type="button"
                          className={`btn-direcao-opcao ${direcaoPosicaoImpar === 'ESQUERDA' ? 'ativo' : ''}`}
                          onClick={() => setDirecaoPosicaoImpar('ESQUERDA')}
                        >
                          <span style={{ fontSize: 15 }}>⬅</span> Esquerda
                        </button>
                        <button
                          type="button"
                          className={`btn-direcao-opcao ${direcaoPosicaoImpar === 'DIREITA' ? 'ativo' : ''}`}
                          onClick={() => setDirecaoPosicaoImpar('DIREITA')}
                        >
                          Direita <span style={{ fontSize: 15 }}>➡</span>
                        </button>
                      </div>
                      <div className="montante-regra-nota">
                        💡 <strong>Regra de inversão automática:</strong> Posição Par aponta para o lado oposto. Se a Torre for Par, a orientação também inverte.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-configuração da Faixa Vertical de Nível */}
              {isFaixaNivel && (
                <div className="montante-config-box">
                  <div className="montante-config-header">
                    <span className="montante-config-titulo">
                      <span>🗼</span> Ajustes da Faixa de Nível
                    </span>
                    <button
                      type="button"
                      className="btn-restaurar-fonte"
                      onClick={() => {
                        setTamanhoFonteLetrasFaixa(70);
                        setTamanhoFonteNumeroFaixa(170);
                      }}
                      title="Restaurar tamanhos padrão (70px e 170px)"
                    >
                      ↺ Restaurar
                    </button>
                  </div>

                  <div className="config-linha-ajuste">
                    <span className="config-linha-label">Cópias de cada Nível:</span>
                    <div className="stepper-wrap">
                      <button
                        type="button"
                        className="btn-stepper"
                        onClick={() => setCopiasFaixaNivel((c) => Math.max(1, c - 1))}
                        title="Diminuir cópias"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="input-stepper-val input-stepper-copias"
                        value={copiasFaixaNivel}
                        onChange={(e) => setCopiasFaixaNivel(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        min={1}
                        max={99}
                      />
                      <button
                        type="button"
                        className="btn-stepper"
                        onClick={() => setCopiasFaixaNivel((c) => c + 1)}
                        title="Aumentar cópias"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="config-linha-ajuste">
                    <span className="config-linha-label">Fonte Letras (N-I-V-E-L):</span>
                    <div className="stepper-wrap">
                      <button
                        type="button"
                        className="btn-stepper"
                        onClick={() => setTamanhoFonteLetrasFaixa((s) => Math.max(20, s - 5))}
                        title="Diminuir 5px"
                      >
                        -
                      </button>
                      <div className="input-stepper-val-wrap">
                        <input
                          type="number"
                          className="input-stepper-val"
                          value={tamanhoFonteLetrasFaixa}
                          onChange={(e) => setTamanhoFonteLetrasFaixa(Math.max(20, Math.min(130, parseInt(e.target.value, 10) || 70)))}
                          min={20}
                          max={130}
                        />
                        <span className="unidade-px">px</span>
                      </div>
                      <button
                        type="button"
                        className="btn-stepper"
                        onClick={() => setTamanhoFonteLetrasFaixa((s) => Math.min(130, s + 5))}
                        title="Aumentar 5px"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="config-linha-ajuste">
                    <span className="config-linha-label">Fonte Número:</span>
                    <div className="stepper-wrap">
                      <button
                        type="button"
                        className="btn-stepper"
                        onClick={() => setTamanhoFonteNumeroFaixa((s) => Math.max(40, s - 5))}
                        title="Diminuir 5px"
                      >
                        -
                      </button>
                      <div className="input-stepper-val-wrap">
                        <input
                          type="number"
                          className="input-stepper-val"
                          value={tamanhoFonteNumeroFaixa}
                          onChange={(e) => setTamanhoFonteNumeroFaixa(Math.max(40, Math.min(260, parseInt(e.target.value, 10) || 170)))}
                          min={40}
                          max={260}
                        />
                        <span className="unidade-px">px</span>
                      </div>
                      <button
                        type="button"
                        className="btn-stepper"
                        onClick={() => setTamanhoFonteNumeroFaixa((s) => Math.min(260, s + 5))}
                        title="Aumentar 5px"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                    Níveis detectados: <strong>{niveisDistintos.join(', ')}</strong> ({niveisDistintos.length} distintos • {faixasNivelQueue.length} faixas no total)
                  </div>
                </div>
              )}
            </div>

            {/* 4. TIPO DE CÓDIGO (BARRAS, QR CODE OU AMBOS) */}
            <div className="config-secao">
              <label className="config-secao-titulo">
                <span>📷</span> 4. Tipo de Código
              </label>

              <div className="grid-tipo-codigo">
                <button
                  type="button"
                  className={`btn-opcao-codigo ${tipoCodigo === 'BARRAS' ? 'ativo' : ''}`}
                  onClick={() => setTipoCodigo('BARRAS')}
                >
                  Barcode (Code 128)
                </button>
                <button
                  type="button"
                  className={`btn-opcao-codigo ${tipoCodigo === 'QRCODE' ? 'ativo' : ''}`}
                  onClick={() => setTipoCodigo('QRCODE')}
                >
                  QR Code
                </button>
                <button
                  type="button"
                  className={`btn-opcao-codigo ${tipoCodigo === 'AMBOS' ? 'ativo' : ''}`}
                  onClick={() => setTipoCodigo('AMBOS')}
                >
                  Ambos Simultâneos
                </button>
              </div>
            </div>

            {/* 5. SELEÇÃO INDIVIDUAL DE INFORMAÇÕES VISUAIS */}
            <div className="config-secao">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="config-secao-titulo" style={{ margin: 0 }}>
                  <span>👁️</span> 5. Informações na Etiqueta
                </label>
                <button
                  type="button"
                  className="btn-toggle-todos"
                  onClick={handleToggleTodosCampos}
                >
                  {todosMarcados ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>

              <div className="grid-checkboxes-info">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarDeposito}
                    onChange={(e) => setInfo({ ...info, mostrarDeposito: e.target.checked })}
                  />
                  <span>Depósito</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarRua}
                    onChange={(e) => setInfo({ ...info, mostrarRua: e.target.checked })}
                  />
                  <span>Rua</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarTorre}
                    onChange={(e) => setInfo({ ...info, mostrarTorre: e.target.checked })}
                  />
                  <span>Torre</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarNivel}
                    onChange={(e) => setInfo({ ...info, mostrarNivel: e.target.checked })}
                  />
                  <span>Nível</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarPosicao}
                    onChange={(e) => setInfo({ ...info, mostrarPosicao: e.target.checked })}
                  />
                  <span>Posição</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarTipo}
                    onChange={(e) => setInfo({ ...info, mostrarTipo: e.target.checked })}
                  />
                  <span>Tipo (Picking/Pulmão)</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarCodend}
                    onChange={(e) => setInfo({ ...info, mostrarCodend: e.target.checked })}
                  />
                  <span>Cód. Reduzido (CODEND)</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={info.mostrarDescrend}
                    onChange={(e) => setInfo({ ...info, mostrarDescrend: e.target.checked })}
                  />
                  <span>Descrição Adicional</span>
                </label>
              </div>
            </div>

            {/* RESUMO DE QUANTIDADES */}
            <div className="resumo-impressao-box">
              <div className="resumo-item">
                <span>Endereços Selecionados:</span>
                <strong>{enderecosFiltrados.length}</strong>
              </div>
              {isFaixaNivel && (
                <>
                  <div className="resumo-item">
                    <span>Níveis Distintos:</span>
                    <strong>{niveisDistintos.join(', ')}</strong>
                  </div>
                  <div className="resumo-item">
                    <span>Total de Faixas:</span>
                    <strong>{faixasNivelQueue.length} ({copiasFaixaNivel}x cada)</strong>
                  </div>
                </>
              )}
              {isMontante && (
                <>
                  <div className="resumo-item">
                    <span>Tiras de Montante:</span>
                    <strong>{colunasMontante.length} (3 por folha • ~60mm)</strong>
                  </div>
                  {mostrarSetaTopo && (
                    <div className="resumo-item">
                      <span>Seta Indicativa:</span>
                      <strong>
                        Ativa ({direcaoPosicaoImpar === 'ESQUERDA' ? '← Esquerda' : 'Direita →'})
                      </strong>
                    </div>
                  )}
                </>
              )}
              <div className="resumo-item">
                <span>Total de Folhas A4:</span>
                <strong>{totalPaginas}</strong>
              </div>
              <div className="resumo-item">
                <span>Orientação:</span>
                <strong>
                  {isFaixaNivel || isMontante
                    ? 'Retrato (3 Faixas por Folha A4)'
                    : modeloLayout === '4_POR_FOLHA'
                    ? 'Paisagem (Landscape)'
                    : 'Retrato (Portrait)'}
                </strong>
              </div>
              <div className="resumo-item">
                <span>Estilo Visual:</span>
                <strong>
                  {isFaixaNivel
                    ? 'Faixa Vertical de Nível (Poste/Montante)'
                    : isMontante
                    ? 'Tira de Montante Multi-Nível (3 Colunas)'
                    : estiloVisual === 'QR_LATERAL_VERTICAL'
                    ? 'QR Lateral + Vertical'
                    : 'Clássico Horizontal'}
                </strong>
              </div>
            </div>
          </div>

          {/* PAINEL DIREITO: PRÉ-VISUALIZAÇÃO DA FOLHA A4 */}
          <div className="modal-etiquetas-painel-preview">
            <div className="preview-top-bar">
              <span className="preview-title">
                👁️ Pré-visualização Real da Folha A4 (
                {isFaixaNivel
                  ? 'Faixa Vertical de Nível (3 Colunas)'
                  : isMontante
                  ? 'Tira de Montante Multi-Nível (3 Colunas • ~60mm)'
                  : modeloLayout.replace('_', ' ')})
              </span>

              {/* Paginação do Preview */}
              {totalPaginas > 1 && (
                <div className="preview-paginacao">
                  <button
                    type="button"
                    disabled={paginaVisualizada === 1}
                    onClick={() => setPaginaVisualizada((p) => Math.max(1, p - 1))}
                  >
                    ◀
                  </button>
                  <span>
                    Folha <strong>{paginaVisualizada}</strong> de <strong>{totalPaginas}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={paginaVisualizada === totalPaginas}
                    onClick={() => setPaginaVisualizada((p) => Math.min(totalPaginas, p + 1))}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>

            {/* Container da Folha A4 Simulada */}
            <div className="preview-folha-wrapper">
              <div
                className={`preview-folha-a4 ${
                  isFaixaNivel
                    ? 'layout-faixa-nivel'
                    : isMontante
                    ? 'layout-montante'
                    : `layout-${modeloLayout.charAt(0)}`
                }`}
              >
                {isFaixaNivel ? (
                  faixasPaginaAtual.length > 0 ? (
                    faixasPaginaAtual.map((f) => {
                      const nNum = parseInt(f.nivel, 10) || 1;
                      const classeParidade = nNum % 2 === 0 ? 'nivel-par' : 'nivel-impar';
                      return (
                        <div key={f.id} className={`preview-faixa-nivel-card ${classeParidade}`}>
                          <div className="preview-faixa-nivel-letras">
                            {['N', 'I', 'V', 'E', 'L'].map((letra, idx) => (
                              <span
                                key={idx}
                                style={{ fontSize: `${Math.round((tamanhoFonteLetrasFaixa / 70) * 38)}px` }}
                              >
                                {letra}
                              </span>
                            ))}
                          </div>
                          <div className="preview-faixa-nivel-numero">
                            <span style={{ fontSize: `${Math.round((tamanhoFonteNumeroFaixa / 170) * 90)}px` }}>
                              {f.nivel}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="preview-vazio">Nenhum nível localizado para os filtros informados.</div>
                  )
                ) : isMontante ? (
                  colunasPaginaAtual.length > 0 ? (
                    colunasPaginaAtual.map((col) => (
                      <div key={col.id} className={`preview-montante-coluna-container col-niveis-${col.niveis.length}`}>
                        {mostrarSetaTopo && (
                          <div className="preview-montante-topo-seta">
                            <SetaMontantePreview direcao={calcularDirecaoSeta(col.torre, col.pos, direcaoPosicaoImpar)} />
                          </div>
                        )}
                        {col.niveis.map((niv) => {
                          const nNum = parseInt(niv.nivel, 10) || 1;
                          const classeParidade = nNum % 2 === 0 ? 'nivel-par' : 'nivel-impar';
                          return (
                            <div
                              key={niv.item.codend}
                              className={`preview-etiqueta-card estilo-lateral preview-montante-nivel-card ${classeParidade}`}
                            >
                              {/* Header */}
                            <div className="preview-card-header">
                              {info.mostrarTipo && (
                                <span className={`preview-tipo-badge ${niv.item.tipo.toLowerCase()}`}>
                                  {niv.item.tipo}
                                </span>
                              )}
                              {info.mostrarDeposito && niv.deposito && (
                                <span className="preview-deposito-tag">
                                  DEPÓSITO {niv.deposito.padStart(2, '0')}
                                </span>
                              )}
                              {info.mostrarCodend && (
                                <span className="preview-codend-tag">CÓD: {niv.item.codend}</span>
                              )}
                            </div>

                            {/* Corpo Lateral */}
                            <div className="preview-corpo-lateral">
                              <div className="preview-lateral-qr-box">
                                <QRCodeItem value={niv.item.endereco} size={65} margin={0} />
                                <span className="preview-barcode-txt">{niv.item.endereco}</span>
                              </div>

                              <div className="preview-lateral-coords-col">
                                {info.mostrarRua && (
                                  <div className="p-coord-linha">
                                    <span className="p-coord-linha-label">RUA</span>
                                    <span className="p-coord-linha-val">{removerZerosEsquerda(niv.rua)}</span>
                                  </div>
                                )}
                                {info.mostrarTorre && (
                                  <div className="p-coord-linha">
                                    <span className="p-coord-linha-label">TORRE</span>
                                    <span className="p-coord-linha-val">{removerZerosEsquerda(niv.torre)}</span>
                                  </div>
                                )}
                                {info.mostrarNivel && (
                                  <div className="p-coord-linha p-coord-linha-nivel-invertido">
                                    <span className="p-coord-linha-label">NÍVEL</span>
                                    <span className="p-coord-linha-val">{removerZerosEsquerda(niv.nivel)}</span>
                                  </div>
                                )}
                                {info.mostrarPosicao && (
                                  <div className={`p-coord-linha ${niv.item.tipo?.toUpperCase() === 'PICKING' ? 'coord-linha-posicao-picking' : ''}`}>
                                    <span className="p-coord-linha-label">POSIÇÃO</span>
                                    <span className="p-coord-linha-val">{removerZerosEsquerda(niv.pos)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rodapé */}
                            <div className="preview-card-footer">
                              <span>
                                {info.mostrarDescrend && niv.item.descrend ? niv.item.descrend : 'WMS ConferCheck'}
                              </span>
                              <span>Galpão Logístico</span>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    ))
                  ) : (
                    <div className="preview-vazio">Nenhum endereço localizado para os filtros informados.</div>
                  )
                ) : itensPaginaAtual.length > 0 ? (
                  itensPaginaAtual.map((item) => {
                    const det = parseEndereco(item.endereco, item.descrend);
                    const nNum = parseInt(det?.nivel || '', 10) || 1;
                    const classeParidade = nNum % 2 === 0 ? 'nivel-par' : 'nivel-impar';
                    return (
                      <div
                        key={item.codend}
                        className={`preview-etiqueta-card ${
                          estiloVisual === 'QR_LATERAL_VERTICAL' ? 'estilo-lateral' : 'estilo-horizontal'
                        } ${classeParidade}`}
                      >
                        {/* Header */}
                        <div className="preview-card-header">
                          {info.mostrarTipo && (
                            <span className={`preview-tipo-badge ${item.tipo.toLowerCase()}`}>
                              {item.tipo}
                            </span>
                          )}
                          {info.mostrarDeposito && det?.deposito && (
                            <span className="preview-deposito-tag">
                              DEPÓSITO {det.deposito.padStart(2, '0')}
                            </span>
                          )}
                          {info.mostrarCodend && (
                            <span className="preview-codend-tag">CÓD: {item.codend}</span>
                          )}
                        </div>

                        {estiloVisual === 'QR_LATERAL_VERTICAL' ? (
                          /* Layout QR Lateral + Coordenadas Verticais */
                          <div className="preview-corpo-lateral">
                            {/* QR Code com Destaque Lateral Esquerdo (Maximização de Área) */}
                            <div className="preview-lateral-qr-box">
                              <QRCodeItem
                                value={item.endereco}
                                size={
                                  modeloLayout === '2_POR_FOLHA'
                                    ? 260
                                    : modeloLayout === '4_POR_FOLHA'
                                    ? 140
                                    : 76
                                }
                                margin={0}
                              />
                              <span className="preview-barcode-txt">{item.endereco}</span>
                            </div>

                            {/* Coordenadas Verticais com Destaque Escuro no Nível */}
                            <div className="preview-lateral-coords-col">
                              {info.mostrarRua && (
                                <div className="p-coord-linha">
                                  <span className="p-coord-linha-label">RUA</span>
                                  <span className="p-coord-linha-val">{removerZerosEsquerda(det?.rua)}</span>
                                </div>
                              )}
                              {info.mostrarTorre && (
                                <div className="p-coord-linha">
                                  <span className="p-coord-linha-label">TORRE</span>
                                  <span className="p-coord-linha-val">{removerZerosEsquerda(det?.torre)}</span>
                                </div>
                              )}
                              {info.mostrarNivel && (
                                <div className="p-coord-linha p-coord-linha-nivel-invertido">
                                  <span className="p-coord-linha-label">NÍVEL</span>
                                  <span className="p-coord-linha-val">{removerZerosEsquerda(det?.nivel)}</span>
                                </div>
                              )}
                              {info.mostrarPosicao && (
                                <div className={`p-coord-linha ${item.tipo?.toUpperCase() === 'PICKING' ? 'coord-linha-posicao-picking' : ''}`}>
                                  <span className="p-coord-linha-label">POSIÇÃO</span>
                                  <span className="p-coord-linha-val">{removerZerosEsquerda(det?.pos)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Coordenadas com Escala Dinâmica */}
                            <div className={`preview-coords-grid campos-${totalCamposCoords}`}>
                              {info.mostrarRua && (
                                <div className="preview-coord-chip">
                                  <span className="p-coord-label">RUA</span>
                                  <span className="p-coord-val">{det?.rua || '—'}</span>
                                </div>
                              )}
                              {info.mostrarTorre && (
                                <div className="preview-coord-chip">
                                  <span className="p-coord-label">TORRE</span>
                                  <span className="p-coord-val">{det?.torre || '—'}</span>
                                </div>
                              )}
                              {info.mostrarNivel && (
                                <div className="preview-coord-chip nivel-chip">
                                  <span className="p-coord-label">NÍVEL</span>
                                  <span className="p-coord-val">{det?.nivel || '—'}</span>
                                </div>
                              )}
                              {info.mostrarPosicao && (
                                <div className={`preview-coord-chip ${item.tipo?.toUpperCase() === 'PICKING' ? 'pos-destaque pos-picking' : ''}`}>
                                  <span className="p-coord-label">POSIÇÃO</span>
                                  <span className="p-coord-val">{det?.pos || '—'}</span>
                                </div>
                              )}
                            </div>

                            {/* Códigos */}
                            <div className="preview-codigos-area">
                              {(tipoCodigo === 'BARRAS' || tipoCodigo === 'AMBOS') && (
                                <div className="preview-barcode-wrap">
                                  <BarcodeItem
                                    value={item.endereco}
                                    width={modeloLayout === '2_POR_FOLHA' ? 2.2 : modeloLayout === '4_POR_FOLHA' ? 1.8 : 1.3}
                                    height={modeloLayout === '2_POR_FOLHA' ? 44 : modeloLayout === '4_POR_FOLHA' ? 32 : 24}
                                  />
                                  <span className="preview-barcode-txt">{item.endereco}</span>
                                </div>
                              )}
                              {(tipoCodigo === 'QRCODE' || tipoCodigo === 'AMBOS') && (
                                <QRCodeItem
                                  value={item.endereco}
                                  size={modeloLayout === '2_POR_FOLHA' ? 80 : modeloLayout === '4_POR_FOLHA' ? 64 : 48}
                                />
                              )}
                            </div>
                          </>
                        )}

                        {/* Rodapé */}
                        <div className="preview-card-footer">
                          <span>{info.mostrarDescrend && item.descrend ? item.descrend : 'WMS ConferCheck'}</span>
                          <span>Galpão Logístico</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="preview-vazio">
                    Nenhum endereço localizado para os filtros informados.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="modal-etiquetas-footer">
          <button type="button" className="btn-cancelar-impressao" onClick={onFechar}>
            ✕ Cancelar
          </button>
          <button
            type="button"
            className="btn-confirmar-impressao"
            onClick={handleImprimir}
            disabled={enderecosFiltrados.length === 0}
          >
            🖨️{' '}
            {isMontante
              ? `Imprimir ${colunasMontante.length} ${
                  colunasMontante.length === 1 ? 'Tira de Montante' : 'Tiras de Montante'
                } (${enderecosFiltrados.length} níveis em ${totalPaginas} ${
                  totalPaginas === 1 ? 'Folha A4' : 'Folhas A4'
                })`
              : `Imprimir ${enderecosFiltrados.length} ${
                  enderecosFiltrados.length === 1 ? 'Etiqueta' : 'Etiquetas'
                } (${totalPaginas} ${totalPaginas === 1 ? 'Folha A4' : 'Folhas A4'})`}
          </button>
        </div>
      </div>
    </div>
  );
};
