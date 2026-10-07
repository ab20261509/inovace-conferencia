import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Botao } from '../Botao/Botao';
import './ModalCameraScanner.css';

interface ModalCameraScannerProps {
  aberto: boolean;
  onFechar: () => void;
  onScan: (codigo: string) => void;
}

export function ModalCameraScanner({ aberto, onFechar, onScan }: ModalCameraScannerProps) {
  const [iniciando, setIniciando] = useState(true);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [temLanterna, setTemLanterna] = useState(false);
  const [lanternaAtiva, setLanternaAtiva] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'camera-barcode-reader';
  const fechandoRef = useRef(false);

  const pararScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // Ignora erros ao parar
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  const alternarLanterna = async () => {
    if (!scannerRef.current || !temLanterna) return;
    try {
      const novoEstado = !lanternaAtiva;
      await scannerRef.current.applyVideoConstraints({
        // @ts-ignore - constraint avançada suportada em mobile
        advanced: [{ torch: novoEstado }],
      });
      setLanternaAtiva(novoEstado);
    } catch {
      // Falha ao aplicar lanterna
    }
  };

  const handleSucesso = useCallback(
    async (decodedText: string) => {
      if (fechandoRef.current) return;
      fechandoRef.current = true;

      // Vibração curta de feedback
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch {}
      }

      await pararScanner();
      onScan(decodedText.trim());
      onFechar();
    },
    [onScan, onFechar, pararScanner]
  );

  useEffect(() => {
    if (!aberto) return;

    fechandoRef.current = false;
    setIniciando(true);
    setErroCamera(null);
    setTemLanterna(false);
    setLanternaAtiva(false);

    let html5Qrcode: Html5Qrcode | null = null;

    const iniciarCamera = async () => {
      try {
        html5Qrcode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = html5Qrcode;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.floor(minEdge * 0.85);
            const boxHeight = Math.floor(minEdge * 0.55); // Mais retangular para códigos de barra 1D
            return { width: boxWidth, height: boxHeight };
          },
          videoConstraints: {
            facingMode: 'environment',
            focusMode: 'continuous',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        };

        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleSucesso(decodedText);
          },
          () => {
            // Frame sem código detectado (normal, ignora para manter fluidez)
          }
        );

        setIniciando(false);

        // Verifica se a câmera suporta lanterna (torch)
        try {
          const track = html5Qrcode.getRunningTrackCameraCapabilities();
          // @ts-ignore
          if (track && track.torchFeature && track.torchFeature().isSupported()) {
            setTemLanterna(true);
          }
        } catch {}
      } catch (err: any) {
        setIniciando(false);
        const msg = String(err?.message || err || '');
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setErroCamera('Acesso à câmera foi negado. Permita o uso da câmera nas configurações do navegador.');
        } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
          setErroCamera('Nenhuma câmera encontrada no dispositivo.');
        } else {
          setErroCamera('Não foi possível iniciar a câmera. Verifique se o endereço está em HTTPS ou se o Chrome permite a câmera.');
        }
      }
    };

    // Pequeno timeout para garantir que o container DOM esteja montado
    const timer = setTimeout(() => {
      iniciarCamera();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5Qrcode) {
        if (html5Qrcode.isScanning) {
          html5Qrcode.stop().catch(() => {}).finally(() => {
            html5Qrcode?.clear();
          });
        } else {
          html5Qrcode.clear();
        }
      }
    };
  }, [aberto, handleSucesso]);

  if (!aberto) return null;

  return (
    <div className="modal-overlay modal-camera-overlay" onClick={onFechar}>
      <div className="modal-camera-container" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="modal-camera-header">
          <div className="camera-header-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>Leitor de Código de Barras</span>
          </div>
          <button className="modal-close" onClick={onFechar} title="Fechar câmera">
            ×
          </button>
        </div>

        {/* Área do Scanner */}
        <div className="modal-camera-viewport">
          <div id={readerElementId} className="camera-video-wrapper"></div>

          {/* Mira Laser Fluida */}
          {!iniciando && !erroCamera && (
            <div className="camera-scan-overlay">
              <div className="camera-viewfinder-guide">
                <div className="viewfinder-corner top-left"></div>
                <div className="viewfinder-corner top-right"></div>
                <div className="viewfinder-corner bottom-left"></div>
                <div className="viewfinder-corner bottom-right"></div>
                <div className="camera-laser-line"></div>
              </div>
              <p className="camera-instruction-hint">Aponte para o código de barras do produto</p>
            </div>
          )}

          {/* Loading inicial */}
          {iniciando && !erroCamera && (
            <div className="camera-loading-overlay">
              <div className="camera-loading-spinner"></div>
              <p>Iniciando câmera...</p>
            </div>
          )}

          {/* Erro de Câmera */}
          {erroCamera && (
            <div className="camera-error-overlay">
              <div className="camera-error-icon">⚠</div>
              <p>{erroCamera}</p>
              <Botao variant="secondary" size="sm" onClick={onFechar} style={{ marginTop: '14px' }}>
                Fechar
              </Botao>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="modal-camera-footer">
          {temLanterna && (
            <button
              type="button"
              className={`btn-camera-torch ${lanternaAtiva ? 'torch-active' : ''}`}
              onClick={alternarLanterna}
              title="Ligar/Desligar lanterna"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={lanternaAtiva ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>{lanternaAtiva ? 'Lanterna Ligada' : 'Lanterna'}</span>
            </button>
          )}

          <Botao variant="secondary" size="md" onClick={onFechar} style={{ marginLeft: 'auto' }}>
            Cancelar
          </Botao>
        </div>
      </div>
    </div>
  );
}
