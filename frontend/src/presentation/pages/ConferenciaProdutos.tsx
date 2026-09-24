import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useConferenciaAtiva } from '../../application/hooks/useConferenciaAtiva';
import { useAuth } from '../../application/contexts/AuthContext';
import { podeVerCamposSensiveis } from '../../domain/permissions';
import { ItemConferidoDetalhe } from '../../domain/models/Conferencia';
import { prepararAudio, tocarAlertaErro, tocarAlertaSucesso } from '../../infrastructure/audio/alertas';
import { Botao, Campo, Container, Grid, Label, Painel } from '../components';
import { Loading } from '../components/Loading/Loading';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

function formatarDataHora(val?: string | null): string {
  if (!val) return '—';
  try {
    if (val.includes('/')) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  } catch {
    // fallback
  }
  return val;
}

export function ConferenciaProdutosPage() {
  const { nunota } = useParams<{ nunota: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const nuNotaNum = parseInt(nunota || '0', 10);
  const { user } = useAuth();
  const verCamposSensiveis = podeVerCamposSensiveis(user?.nomeUsu);

  // Status de recontagem pode vir de duas fontes:
  // 1) navigate state (vindo da lista de conferências, disponível imediatamente)
  // 2) isRecontagem retornado pelo Sankhya ao iniciar (confirmação)
  const statusInicial = (location.state as any)?.statusConferencia as string | undefined;

  const {
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
    setError,
  } = useConferenciaAtiva(nuNotaNum);

  const [codBarra, setCodBarra] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [conferindo, setConferindo] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showDivergenciaModal, setShowDivergenciaModal] = useState(false);
  const [qtdVolumes, setQtdVolumes] = useState('1');
  const [finalizando, setFinalizando] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'conferidos'>('pendentes');
  const [itemParaEstornar, setItemParaEstornar] = useState<ItemConferidoDetalhe | null>(null);
  const [estornando, setEstornando] = useState(false);
  const [feedbackVisual, setFeedbackVisual] = useState<{ codProd: string; descrProd: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot da condição de recontagem, capturada UMA vez ao carregar:
  // 1) status repassado pela lista (navigate state) — disponível imediatamente
  // 2) isRecontagem retornado pelo Sankhya ao iniciar — confirmação
  // Não recalcular depois: senão o item que virava "parcial" durante bipagem
  // normal acabava herdando o badge "Reconferir total" indevidamente.
  const [isRecontagem, setIsRecontagem] = useState(
    () => (statusInicial || '').toLowerCase().includes('recontagem'),
  );
  const recontagemCapturadaRef = useRef(false);

  useEffect(() => {
    if (recontagemCapturadaRef.current || !conferencia) return;
    recontagemCapturadaRef.current = true;
    if (String(conferencia.isRecontagem || '').toLowerCase() === 'true') {
      setIsRecontagem(true);
    }
  }, [conferencia]);

  // Snapshot do qtdConf de cada item no primeiro carregamento em recontagem.
  // "Reconferir total" só faz sentido para itens que JÁ tinham alguma
  // quantidade contada antes — itens a zero não têm o que reconferir.
  const [snapshotQtdConf, setSnapshotQtdConf] = useState<Record<string, string>>({});
  const snapshotCapturadoRef = useRef(false);

  useEffect(() => {
    if (snapshotCapturadoRef.current) return;
    if (!isRecontagem || itens.length === 0) return;
    snapshotCapturadoRef.current = true;
    const snap: Record<string, string> = {};
    for (const it of itens) snap[it.sequencia] = it.qtdConf;
    setSnapshotQtdConf(snap);
  }, [isRecontagem, itens]);

  // Itens cujo qtdConf já foi zerado nesta sessão de recontagem. Na primeira
  // bipagem de um item "reconferir total" subtraímos o snapshot (qtdConf -
  // snapshot) para zerar e atribuir de uma vez. Bips seguintes somam normal.
  const [itensZerados, setItensZerados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (nuNotaNum) iniciar();
  }, [nuNotaNum, iniciar]);

  useEffect(() => {
    if (conferencia && inputRef.current) inputRef.current.focus();
  }, [conferencia]);

  useEffect(() => {
    return () => { if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current); };
  }, []);

  /**
   * Fluxo único de conferência, usado pelo Enter no campo e pelo botão.
   * Mantido em um só lugar para os dois caminhos não divergirem.
   */
  async function executarConferencia() {
    if (!codBarra.trim() || conferindo) return;

    // Destrava o áudio ainda dentro do gesto do usuário, antes de qualquer
    // await. Depois do await a ativação já expirou e o Chrome mantém o
    // AudioContext suspenso, deixando o alerta mudo.
    prepararAudio();

    setConferindo(true);
    try {
      const codBipado = codBarra.trim();
      const qtdInformada = parseFloat(quantidade) || 1;

      // Reconferir total: na primeira bipagem de um item que tinha qtdConf
      // anterior, subtrair o snapshot para zerar e atribuir a quantidade nova.
      // Bips seguintes ao mesmo item somam normalmente.
      let qtdFinal = qtdInformada;
      let seqZerada: string | null = null;
      if (isRecontagem) {
        const itemMatch = itens.find(
          (i) => String(i.codBarra) === String(codBipado) || String(i.codProd) === String(codBipado),
        );
        const snapshotDoItem = itemMatch ? parseFloat(snapshotQtdConf[itemMatch.sequencia] || '0') : 0;
        if (itemMatch && snapshotDoItem > 0 && !itensZerados.has(itemMatch.sequencia)) {
          qtdFinal = qtdInformada - snapshotDoItem;
          seqZerada = itemMatch.sequencia;
        }
      }

      const qtd = qtdFinal.toFixed(9);
      const resultado = await conferirItem(codBipado, qtd);

      if (seqZerada) {
        setItensZerados((prev) => new Set(prev).add(seqZerada!));
      }
      setCodBarra('');
      setQuantidade('1');
      inputRef.current?.focus();

      tocarAlertaSucesso();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setFeedbackVisual({ codProd: resultado.codProd, descrProd: resultado.descrProd });
      feedbackTimeoutRef.current = setTimeout(() => setFeedbackVisual(null), 1200);
    } catch (err) {
      // O hook já preenche a mensagem de erro na tela; aqui vem o alerta
      // sonoro e a leitura em voz alta da mensagem do Sankhya.
      // Fica no catch (e não num useEffect sobre `error`) porque, se o
      // operador repetir a mesma leitura, a string de erro não muda e o
      // efeito não voltaria a disparar.
      tocarAlertaErro(
        err instanceof Error ? err.message : undefined,
        // O Sankhya devolve só o CODPROD na mensagem. Traduz para a descrição
        // usando a lista já carregada do pedido. Produto fora do pedido não é
        // encontrado aqui e a fala cai no código dígito a dígito.
        (codProd) => itens.find((i) => String(i.codProd) === codProd)?.descrProd,
      );
    }
    finally { setConferindo(false); }
  }

  async function handleBuscarProduto(e: FormEvent) {
    e.preventDefault();
    await executarConferencia();
  }

  async function handleConferir() {
    await executarConferencia();
  }

  async function handleFinalizar() {
    setFinalizando(true);
    try {
      // 1ª chamada: finalizar
      const resultado = await finalizar(0, parseInt(qtdVolumes) || 0);
      
      // Verificar se há divergência na resposta ou se há itens pendentes
      const pendentes = itens.filter((i) => i.status !== 'completo');
      if (pendentes.length > 0) {
        // Sankhya finalizou como divergente — mostrar modal
        setShowFinalizarModal(false);
        setShowDivergenciaModal(true);
      } else {
        // Sem divergência — finalizou OK
        setShowFinalizarModal(false);
        navigate('/conferencias', { state: { mensagem: `Pedido ${conferencia?.numNota} do cliente ${conferencia?.parceiro} finalizado com sucesso!` } });
      }
    } catch (err: any) {
      // Erro do Sankhya pode indicar divergência
      setShowFinalizarModal(false);
      setShowDivergenciaModal(true);
    } finally {
      setFinalizando(false);
    }
  }

  async function handleCortarDivergentes() {
    setFinalizando(true);
    try {
      // Chamar ConferenciaSP.cortar para cortar itens divergentes
      const service = new (await import('../../infrastructure/api/ConferenciaApiService')).ConferenciaApiService();
      await service.cortarNota(nuNotaNum, 0, parseInt(qtdVolumes) || 0);
      setShowDivergenciaModal(false);
      navigate('/conferencias', { state: { mensagem: `Pedido ${conferencia?.numNota} finalizado com corte de divergentes.` } });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao cortar divergentes');
      setShowDivergenciaModal(false);
    } finally {
      setFinalizando(false);
    }
  }

  async function handleConcluirDivergente() {
    setShowDivergenciaModal(false);
    navigate('/conferencias', { state: { mensagem: `Pedido ${conferencia?.numNota} finalizado como divergente.` } });
  }

  async function handleConfirmarEstorno() {
    if (!itemParaEstornar) return;
    try {
      setEstornando(true);
      await excluirItemConferido(itemParaEstornar.seqConf);
      tocarAlertaSucesso();
      setItemParaEstornar(null);
      if (inputRef.current) inputRef.current.focus();
    } catch (err: any) {
      tocarAlertaErro();
    } finally {
      setEstornando(false);
    }
  }

  const totalItens = itens.length;
  const qtdItensCompletos = itens.filter((i) => i.status === 'completo').length;
  const itensPendentes = totalItens - qtdItensCompletos;

  if (loading && !conferencia) {
    return <Loading fullscreen mensagem="Iniciando conferência..." />;
  }

  return (
    <div className="page-container">
      <div className="conferencia-top-fixo">
      {/* Header */}
       <header className="page-header">
        <Botao variant="ghost" size="sm" onClick={() => navigate('/conferencias')}>← Voltar</Botao>
         <div className="header-info">
           <h1>Conferência #{conferencia?.numConf}</h1>
           <span className="nota-info">Pedido {conferencia?.numNota} — {conferencia?.parceiro}</span>
           {isRecontagem && (
             <span className="badge-recontagem-header" title="Pedido voltou para recontagem — conferir quantidade total novamente">
               ⚠ Recontagem
             </span>
           )}
         </div>
        <div className="header-cards">
          <Container variant="default" padding="sm" className="resumo-card-inline">
            <Label variant="value">{totalItens}</Label>
            <Label variant="caption">Total</Label>
          </Container>
          <Container variant="default" padding="sm" className="resumo-card-inline conferido">
            <Label variant="value" className="text-success">{qtdItensCompletos}</Label>
            <Label variant="caption">Conferidos</Label>
          </Container>
          <Container variant="default" padding="sm" className="resumo-card-inline pendente">
            <Label variant="value" className="text-warning">{itensPendentes}</Label>
            <Label variant="caption">Pendentes</Label>
          </Container>
        </div>
        <Botao variant="success" size="sm" onClick={() => setShowFinalizarModal(true)} disabled={loading}>
          Finalizar
        </Botao>
      </header>

      {/* Scanner */}
      <Painel titulo="Conferir Produto">
        <Container variant="scanner" padding="md">
          <form onSubmit={handleBuscarProduto} className="scanner-form-inner">
            <Campo
              ref={inputRef}
              variant="scanner"
              value={codBarra}
              onChange={(e) => setCodBarra(e.target.value)}
              placeholder="Escanear ou digitar código de barras..."
              autoFocus
            />
            <Campo
              variant="compact"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              min="1"
              step="1"
            />
            <Botao
              type="submit"
              variant="primary"
              size="lg"
              disabled={conferindo || !codBarra.trim()}
              loading={conferindo}
            >
              Conferir
            </Botao>
          </form>
        </Container>
      </Painel>
      </div>

      {/* Feedback */}
      {error && <div className="error-message" onClick={() => setError(null)}>{error}</div>}

      {produtoAtual && (
        <Container variant="default" padding="sm" className="feedback-success">
          <strong>{produtoAtual.descrProd}</strong>
          <Label variant="caption">Cod: {produtoAtual.codProd}</Label>
        </Container>
      )}

      {ultimoConferido && (
        <Container variant="default" padding="sm" className="feedback-info">
          Conferido: {ultimoConferido.descrProd} ({ultimoConferido.codVol})
        </Container>
      )}

      {/* Listas de itens com abas */}
      <Painel>
        {/* Abas */}
        <div className="tabs-container">
          <button
            className={`tab-button ${abaAtiva === 'pendentes' ? 'tab-active' : ''}`}
            onClick={() => setAbaAtiva('pendentes')}
          >
            Itens Pendentes <span className="tab-count">{itensPendentes}</span>
          </button>
          <button
            className={`tab-button ${abaAtiva === 'conferidos' ? 'tab-active' : ''}`}
            onClick={() => setAbaAtiva('conferidos')}
          >
            Itens Conferidos <span className="tab-count">{itensConferidos.length}</span>
          </button>
        </div>

        {/* Conteúdo da aba Pendentes */}
        {abaAtiva === 'pendentes' && (
          <Container variant="outlined" padding="none">
            {isRecontagem && (
              <div className="alerta-recontagem" role="alert">
                <strong>⚠ Recontagem em andamento.</strong>
                <span> Conferir a quantidade total de cada item novamente — ignorar valores conferidos antes da divergência.</span>
              </div>
            )}
            {itens.length === 0 && !error ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
                <DotLottieReact
                  src="https://lottie.host/f141a079-702f-4d37-88f7-c91b33722274/yQw3d1y8TG.lottie"
                  autoplay
                  loop
                  style={{ width: '150px', height: '150px' }}
                />
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-500)', marginTop: '8px' }}>Carregando itens...</p>
              </div>
            ) : (
              <table className="tabela-itens">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Pedido</th>
                    <th>Conferido</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.filter((i) => i.status !== 'completo').sort((a, b) => {
                    // Em recontagem, itens que já tinham qtdConf inicial sobem
                    // (são os que precisam de reconferência total). Fora dela,
                    // só os parciais sobem.
                    if (isRecontagem) {
                      const aInit = parseFloat(snapshotQtdConf[a.sequencia] || '0') > 0 ? 0 : 1;
                      const bInit = parseFloat(snapshotQtdConf[b.sequencia] || '0') > 0 ? 0 : 1;
                      return aInit - bInit;
                    }
                    const parcialA = a.status === 'parcial' ? 0 : 1;
                    const parcialB = b.status === 'parcial' ? 0 : 1;
                    return parcialA - parcialB;
                  }).map((item) => {
                    const qtdConf = parseFloat(item.qtdConf);
                    const parcial = item.status === 'parcial';
                    const tinhaQtdInicial =
                      isRecontagem && parseFloat(snapshotQtdConf[item.sequencia] || '0') > 0;
                    const destacar = tinhaQtdInicial || parcial;

                    return (
                      <tr key={item.sequencia} className={`${destacar ? 'row-parcial' : ''} ${tinhaQtdInicial ? 'row-recontagem' : ''}`}>
                        <td>
                          <div className="produto-cell">
                            <img
                              src={`/api/crud/produto/${item.codProd}/imagem`}
                              alt={item.descrProd || ''}
                              className="produto-img"
                              onClick={() => setImagemAmpliada(`/api/crud/produto/${item.codProd}/imagem`)}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div>
                              <span className="produto-desc">{item.descrProd || `Cod ${item.codProd}`}</span>
                              <span className="produto-barra">
                                {verCamposSensiveis
                                  ? `${item.codProd} | ${item.codBarra || '-'} | Ref: ${item.referencia || '-'}`
                                  : item.codProd}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="num-cell">{item.controle || '-'}</td>
                        <td className="num-cell">{item.qtdPed !== null && item.qtdPed !== undefined ? item.qtdPed : '—'}</td>
                        <td className="num-cell">{qtdConf}</td>
                        <td>
                          {tinhaQtdInicial && (
                            <span
                              className="status-reconferir"
                              title="Item já tinha quantidade contada — reconferir a quantidade total"
                            >
                              ⚠ Reconferir total
                            </span>
                          )}
                          {isRecontagem && !tinhaQtdInicial && parcial && (
                            <span className="status-parcial">Parcial</span>
                          )}
                          {isRecontagem && !tinhaQtdInicial && !parcial && (
                            <span className="status-pendente">—</span>
                          )}
                          {!isRecontagem && parcial && <span className="status-parcial">Parcial</span>}
                          {!isRecontagem && !parcial && <span className="status-pendente">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Container>
        )}

        {/* Conteúdo da aba Conferidos */}
        {abaAtiva === 'conferidos' && (
          <Container variant="outlined" padding="none">
            {itensConferidos.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-500)' }}>Nenhum item conferido ainda</p>
              </div>
            ) : (
              <table className="tabela-itens">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Lote</th>
                    <th>Qtd Conferida</th>
                    <th>Horário</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensConferidos.map((item) => (
                    <tr key={`${item.nuConf}-${item.seqConf}`} className="row-ok">
                      <td>
                        <div className="produto-cell">
                          <img
                            src={`/api/crud/produto/${item.codProd}/imagem`}
                            alt={item.descrProd || ''}
                            className="produto-img"
                            onClick={() => setImagemAmpliada(`/api/crud/produto/${item.codProd}/imagem`)}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div>
                            <span className="produto-desc">{item.descrProd || `Cod ${item.codProd}`}</span>
                            <span className="produto-barra">
                              {verCamposSensiveis
                                ? `${item.codProd} | ${item.codBarra || '-'} | Ref: ${item.referencia || '-'}`
                                : item.codProd}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="num-cell">{item.controle || '-'}</td>
                      <td className="num-cell" style={{ color: 'var(--emerald-600)', fontWeight: 800 }}>
                        {item.qtdConf}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                        {formatarDataHora(item.dhAlter)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-estornar-item"
                          title="Estornar este item"
                          onClick={() => setItemParaEstornar(item)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                          <span>Estornar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Container>
        )}
      </Painel>

      {/* Modal divergência */}
      {showDivergenciaModal && (
        <div className="modal-overlay">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title">Conferência concluída</h2>
              <button className="modal-close" onClick={() => setShowDivergenciaModal(false)}>×</button>
            </div>
            <p className="modal-message-destaque">Conferência finalizada como divergente.</p>
            <div className="modal-actions-vertical">
              <Botao variant="secondary" size="md" fullWidth onClick={handleCortarDivergentes} loading={finalizando} disabled={finalizando}>
                ✂ Cortar itens divergentes
              </Botao>
              <Botao variant="primary" size="md" fullWidth onClick={handleConcluirDivergente} loading={finalizando} disabled={finalizando}>
                ✓ Concluir
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal finalizar */}
      {showFinalizarModal && (
        <div className="modal-overlay" onClick={() => setShowFinalizarModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Finalizar Conferência</h2>
            <p className="modal-subtitle">Informe a quantidade de volumes para este pedido.</p>
            <div style={{ margin: '20px 0' }}>
              <Campo
                label="Quantidade de Volumes"
                type="number"
                value={qtdVolumes}
                onChange={(e) => setQtdVolumes(e.target.value)}
                min="0"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <Botao variant="secondary" size="md" onClick={() => setShowFinalizarModal(false)}>
                Cancelar
              </Botao>
              <Botao variant="success" size="md" onClick={handleFinalizar} loading={loading}>
                Confirmar
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Estorno */}
      {itemParaEstornar && (
        <div className="modal-overlay" onClick={() => !estornando && setItemParaEstornar(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2 className="modal-title" style={{ color: 'var(--danger, #ef4444)' }}>
                Estornar Item Conferido
              </h2>
              <button
                className="modal-close"
                onClick={() => !estornando && setItemParaEstornar(null)}
                disabled={estornando}
              >
                ×
              </button>
            </div>
            <p className="modal-message-destaque" style={{ marginBottom: '16px', fontWeight: 600 }}>
              Deseja estornar este item?
            </p>
            <div
              style={{
                background: 'var(--slate-50, #f8fafc)',
                border: '1px solid var(--slate-200, #e2e8f0)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                lineHeight: '1.6',
              }}
            >
              <div><strong>Produto:</strong> {itemParaEstornar.descrProd} ({itemParaEstornar.codProd})</div>
              {itemParaEstornar.controle && (
                <div><strong>Lote:</strong> {itemParaEstornar.controle}</div>
              )}
              <div><strong>Qtd Conferida:</strong> {itemParaEstornar.qtdConf}</div>
            </div>
            <div className="modal-actions">
              <Botao
                variant="secondary"
                size="md"
                onClick={() => setItemParaEstornar(null)}
                disabled={estornando}
              >
                Cancelar
              </Botao>
              <Botao
                variant="danger"
                size="md"
                onClick={handleConfirmarEstorno}
                loading={estornando}
              >
                Sim, Estornar
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Feedback visual de conferência bem-sucedida */}
      {feedbackVisual && (
        <div className="feedback-overlay">
          <div className="feedback-card">
            <div className="feedback-img-wrapper">
              <span className="feedback-check">&#10003;</span>
              <img
                src={`/api/crud/produto/${feedbackVisual.codProd}/imagem`}
                alt={feedbackVisual.descrProd}
                className="feedback-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span className="feedback-nome">{feedbackVisual.descrProd}</span>
          </div>
        </div>
      )}

      {/* Modal imagem ampliada */}
      {imagemAmpliada && (
        <div className="img-modal-overlay" onClick={() => setImagemAmpliada(null)}>
          <img src={imagemAmpliada} alt="Produto" className="img-modal" />
        </div>
      )}
    </div>
  );
}
