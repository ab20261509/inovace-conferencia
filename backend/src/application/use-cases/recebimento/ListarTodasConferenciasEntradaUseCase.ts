import { IGatewayPort } from '../../../domain/ports/IGatewayPort.js';
import { IConferenciaEntradaRepository } from '../../../domain/ports/IConferenciaEntradaRepository.js';
import {
  ConferenciaEntradaResumo,
  BackupDisponivelResumo,
  ItemBackupResumo,
  BipagemEntrada,
} from '../../../domain/entities/ConferenciaEntrada.js';

function agruparBipagensEmItensBackup(bipagens: BipagemEntrada[]): ItemBackupResumo[] {
  const mapItens = new Map<string, ItemBackupResumo>();
  const temAnuladas = bipagens.some((b) => b.anulado);
  const bipagensBackup = temAnuladas ? bipagens.filter((b) => b.anulado) : bipagens;
  for (const b of bipagensBackup) {
    const key = `${b.codprod}_${b.lote || ''}_${b.validade || ''}_${b.fabricacao || ''}`;
    const exist = mapItens.get(key);
    if (exist) {
      exist.quantidade += Number(b.qtdConferida) || 0;
    } else {
      mapItens.set(key, {
        codprod: b.codprod,
        descrprod: b.descrprod || `Produto ${b.codprod}`,
        referencia: b.referencia,
        quantidade: Number(b.qtdConferida) || 0,
        lote: b.lote,
        validade: b.validade,
        fabricacao: b.fabricacao,
      });
    }
  }
  return Array.from(mapItens.values());
}

export class ListarTodasConferenciasEntradaUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly conferenciaRepo: IConferenciaEntradaRepository
  ) {}

  async execute(correlationId?: string): Promise<ConferenciaEntradaResumo[]> {
    // 1. Buscar todas as sessões registradas no repositório SQLite / Turso
    const sessoes = await this.conferenciaRepo.listarTodasSessoes();

    // 2. Coletar todas as NUNOTAs das sessões existentes
    const sessoesNunotasSet = new Set<number>();
    for (const s of sessoes) {
      for (const n of s.nunotas) {
        if (n) sessoesNunotasSet.add(n);
      }
    }

    const nunotasArr = Array.from(sessoesNunotasSet);
    const mapaNotasSankhya: Record<
      number,
      {
        numnota: number;
        codparc?: number;
        chavenfe?: string;
        fornecedor: string;
        qtdItens: number;
        qtdUnidades: number;
        dtneg?: string;
        dtentsai?: string;
        statusnota?: string;
        adPreventrega?: string;
        adConferencia?: string;
      }
    > = {};

    // 3. Buscar no Sankhya:
    // a) Notas de compra abertas no ERP (TIPMOV = 'C' AND STATUSNOTA <> 'L')
    // b) Notas das sessões locais (caso alguma já tenha sido liberada ou pertença a outro status)
    try {
      const condicaoSessoes = nunotasArr.length > 0 ? `OR CAB.NUNOTA IN (${nunotasArr.join(', ')})` : '';
      const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODPARC,
    CAB.CHAVENFE,
    CAB.DTNEG,
    CAB.DTENTSAI,
    TO_CHAR(CAB.AD_PREVENTREGA, 'YYYY-MM-DD') AS AD_PREVENTREGA,
    CAB.STATUSNOTA,
    NVL(CAB.AD_CONFERENCIA, '') AS AD_CONFERENCIA,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    NVL(ITE.QTD_ITENS, 0) AS QTD_ITENS,
    NVL(ITE.QTD_UNIDADES, 0) AS QTD_UNIDADES
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN (
    SELECT NUNOTA, COUNT(DISTINCT CODPROD) AS QTD_ITENS, SUM(NVL(QTDNEG, 0)) AS QTD_UNIDADES
    FROM TGFITE
    GROUP BY NUNOTA
) ITE ON ITE.NUNOTA = CAB.NUNOTA
WHERE (CAB.TIPMOV = 'C' AND CAB.STATUSNOTA <> 'L')
   ${condicaoSessoes}
ORDER BY CAB.DTNEG DESC, CAB.NUNOTA DESC
      `.trim();

      const response = await this.gateway.serviceCall<any>(
        'DbExplorerSP.executeQuery',
        { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql } },
        correlationId
      );

      const rows: any[] = response?.responseBody?.rows || [];
      const fields: any[] = response?.responseBody?.fieldsMetadata || [];
      const fieldIndexMap: Record<string, number> = {};
      fields.forEach((f: any, idx: number) => {
        fieldIndexMap[f.name.toUpperCase()] = idx;
      });

      for (const r of rows) {
        const nunota = Number(r[fieldIndexMap['NUNOTA']]);
        const numnota = Number(r[fieldIndexMap['NUMNOTA']]) || 0;
        const codparc = r[fieldIndexMap['CODPARC']] !== undefined ? Number(r[fieldIndexMap['CODPARC']]) : undefined;
        const chavenfe = r[fieldIndexMap['CHAVENFE']] ? String(r[fieldIndexMap['CHAVENFE']]).trim() : undefined;
        const fornecedor = String(r[fieldIndexMap['NOMEPARC']] || 'FORNECEDOR NÃO INFORMADO').trim();
        const qtdItens = Number(r[fieldIndexMap['QTD_ITENS']]) || 0;
        const qtdUnidades = Number(r[fieldIndexMap['QTD_UNIDADES']]) || 0;
        const dtneg = r[fieldIndexMap['DTNEG']] ? String(r[fieldIndexMap['DTNEG']]) : undefined;
        const dtentsai = r[fieldIndexMap['DTENTSAI']] ? String(r[fieldIndexMap['DTENTSAI']]) : undefined;
        const statusnota = r[fieldIndexMap['STATUSNOTA']] ? String(r[fieldIndexMap['STATUSNOTA']]) : undefined;
        const adPreventrega = r[fieldIndexMap['AD_PREVENTREGA']] ? String(r[fieldIndexMap['AD_PREVENTREGA']]).trim() : undefined;
        const adConferencia = String(r[fieldIndexMap['AD_CONFERENCIA']] || '').trim().toUpperCase();

        mapaNotasSankhya[nunota] = { numnota, codparc, chavenfe, fornecedor, qtdItens, qtdUnidades, dtneg, dtentsai, statusnota, adPreventrega, adConferencia };
      }
    } catch (err) {
      console.warn('⚠️ Falha ao buscar dados de cabeçalho das notas no Sankhya:', err);
    }

    // 4. Montar resumo de cada conferência existente cruzando com bipagens
    const resultado: ConferenciaEntradaResumo[] = [];

    for (const sessao of sessoes) {
      // Se nenhuma das notas existir no Sankhya (nota excluída no ERP), não exibe a conferência órfã
      const temNotaNoSankhya = sessao.nunotas.some((n) => !!mapaNotasSankhya[n]);
      if (!temNotaNoSankhya && Object.keys(mapaNotasSankhya).length > 0) {
        continue;
      }

      // Regra de integridade com o Sankhya: se a conferência já havia sido INTEGRADA ('Enviado ao Sankhya'),
      // mas no Sankhya ERP o campo AD_CONFERENCIA foi limpo/removido (diferente de 'CONFERIDO'),
      // significa que a conferência foi cancelada/desfeita no ERP e deve voltar a 'Em Aberto'.
      // Notas com status 'Conferido' ou 'Aguardando Aprovação' ainda estão aguardando envio na aba Envio Sankhya
      // e NÃO foram integradas ainda, portanto NÃO devem ser resetadas.
      const algumaNotaNaoConferidaNoSankhya = sessao.nunotas.some((n) => {
        const info = mapaNotasSankhya[n];
        return info && info.adConferencia !== 'CONFERIDO';
      });

      if (
        algumaNotaNaoConferidaNoSankhya &&
        sessao.status === 'Enviado ao Sankhya' &&
        Boolean(sessao.enviadoSankhyaEm)
      ) {
        const bipagensValidas = (await this.conferenciaRepo.listarBipagens(sessao.id)).filter((b) => !b.anulado);
        sessao.backupContagem = {
          statusAnterior: sessao.status,
          nivelAnterior: sessao.nivelAtual,
          reiniciadoEm: new Date().toISOString(),
          reiniciadoPor: 'SANKHYA (AD_CONFERENCIA)',
          motivo: 'Conferência resetada no ERP Sankhya (AD_CONFERENCIA não está CONFERIDO)',
          totalBipagensAnuladas: bipagensValidas.length,
        };
        sessao.status = 'Em Aberto';
        sessao.conferente = '';
        sessao.nivelAtual = 1;
        sessao.finalizadoEm = undefined;
        sessao.aprovadoPor = undefined;
        sessao.aprovadoEm = undefined;
        sessao.enviadoSankhyaEm = undefined;
        sessao.statusPorNota = {};
        for (const n of sessao.nunotas) {
          sessao.statusPorNota[n] = 'Em Aberto';
        }
        for (const b of bipagensValidas) {
          await this.conferenciaRepo.anularBipagem(b.id, true);
        }
        await this.conferenciaRepo.salvarSessao(sessao);
      }

      const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);

      let totalBipadoN1 = 0;
      let totalBipadoN2 = 0;
      let totalBipadoN3 = 0;
      let conferenteN1: string | undefined;
      let conferenteN2: string | undefined;
      let conferenteN3: string | undefined;

      for (const b of bipagens) {
        if (b.anulado) continue;
        const qtd = Number(b.qtdConferida) || 0;
        if (b.nivel === 1) {
          totalBipadoN1 += qtd;
          if (!conferenteN1 && b.conferente) conferenteN1 = b.conferente;
        } else if (b.nivel === 2) {
          totalBipadoN2 += qtd;
          if (!conferenteN2 && b.conferente) conferenteN2 = b.conferente;
        } else if (b.nivel === 3) {
          totalBipadoN3 += qtd;
          if (!conferenteN3 && b.conferente) conferenteN3 = b.conferente;
        }
      }

      // Dados das notas fiscais vinculadas
      const numerosNotasArr: number[] = [];
      const fornecedoresSet = new Set<string>();
      let totalItens = 0;
      let totalQtdEsperada = 0;
      const notasDetalhadas: Array<{ nunota: number; numnota: number }> = [];

      for (const nunota of sessao.nunotas) {
        const info = mapaNotasSankhya[nunota];
        if (info) {
          if (info.numnota) numerosNotasArr.push(info.numnota);
          if (info.fornecedor) fornecedoresSet.add(info.fornecedor);
          totalItens += info.qtdItens;
          totalQtdEsperada += (info.qtdUnidades || 0);
          notasDetalhadas.push({ nunota, numnota: info.numnota || nunota });
        } else {
          numerosNotasArr.push(nunota);
          notasDetalhadas.push({ nunota, numnota: nunota });
        }
      }

      const primeiraNotaInfo = sessao.nunotas.map((n) => mapaNotasSankhya[n]).find((info) => !!info);
      const chavenfe = sessao.chavenfe || primeiraNotaInfo?.chavenfe;
      const numnota = sessao.numnota || primeiraNotaInfo?.numnota;
      const codparc = sessao.codparc || primeiraNotaInfo?.codparc;

      // Buscar backups disponíveis (da própria sessão e de sessões anteriores com mesma chave/nota)
      const backupsDisponiveis: BackupDisponivelResumo[] = [];

      // A) Backup da própria sessão (se houver)
      if (sessao.backupContagemJson) {
        const itensProprioBackup = agruparBipagensEmItensBackup(bipagens);
        backupsDisponiveis.push({
          conferenciaIdOrigem: sessao.id,
          nunotaOrigem: sessao.nunotas[0],
          numnotaOrigem: numnota,
          chavenfe,
          statusAnterior: sessao.backupContagem?.statusAnterior || sessao.status,
          nivelAnterior: sessao.backupContagem?.nivelAnterior || sessao.nivelAtual,
          reiniciadoEm: sessao.backupContagem?.reiniciadoEm || sessao.atualizadoEm,
          reiniciadoPor: sessao.backupContagem?.reiniciadoPor || 'Sistema',
          motivo: sessao.backupContagem?.motivo,
          totalBipagensAnuladas:
            sessao.backupContagem?.totalBipagensAnuladas || bipagens.filter((b) => b.anulado).length,
          itens: itensProprioBackup,
        });
      }

      // B) Backups de outras sessões vinculadas por Chave NF-e ou Nota+Parceiro
      if (chavenfe || (numnota && codparc)) {
        try {
          const outrasSessoesBackup = await this.conferenciaRepo.obterSessoesComBackupPorChaveOuNota(
            chavenfe,
            numnota,
            codparc,
            sessao.id
          );

          for (const outra of outrasSessoesBackup) {
            const bipagensOutra = await this.conferenciaRepo.listarBipagens(outra.id);
            const itensOutra = agruparBipagensEmItensBackup(bipagensOutra);
            backupsDisponiveis.push({
              conferenciaIdOrigem: outra.id,
              nunotaOrigem: outra.nunotas[0],
              numnotaOrigem: outra.numnota || numnota,
              chavenfe: outra.chavenfe || chavenfe,
              statusAnterior: outra.backupContagem?.statusAnterior || outra.status,
              nivelAnterior: outra.backupContagem?.nivelAnterior || outra.nivelAtual,
              reiniciadoEm: outra.backupContagem?.reiniciadoEm || outra.atualizadoEm,
              reiniciadoPor: outra.backupContagem?.reiniciadoPor || outra.conferente || 'Sistema',
              motivo: outra.backupContagem?.motivo,
              totalBipagensAnuladas:
                outra.backupContagem?.totalBipagensAnuladas ||
                (bipagensOutra.filter((b) => b.anulado).length || bipagensOutra.length),
              itens: itensOutra,
            });
          }
        } catch (err) {
          console.warn('⚠️ Erro ao buscar backups relacionados por chave/nota:', err);
        }
      }

      if (sessao.nunotas.length > 1) {
        // Conferência Conjunta: gerar um card independente para cada Nota Fiscal
        for (const nunota of sessao.nunotas) {
          const info = mapaNotasSankhya[nunota];
          if (!info && Object.keys(mapaNotasSankhya).length > 0) continue;

          let totalBipadoN1Nota = 0;
          let totalBipadoN2Nota = 0;
          let totalBipadoN3Nota = 0;
          let confN1Nota: string | undefined;
          let confN2Nota: string | undefined;
          let confN3Nota: string | undefined;

          for (const b of bipagens) {
            if (b.anulado || b.nunota !== nunota) continue;
            const qtd = Number(b.qtdConferida) || 0;
            if (b.nivel === 1) {
              totalBipadoN1Nota += qtd;
              if (!confN1Nota && b.conferente) confN1Nota = b.conferente;
            } else if (b.nivel === 2) {
              totalBipadoN2Nota += qtd;
              if (!confN2Nota && b.conferente) confN2Nota = b.conferente;
            } else if (b.nivel === 3) {
              totalBipadoN3Nota += qtd;
              if (!confN3Nota && b.conferente) confN3Nota = b.conferente;
            }
          }

          const statusNota =
            sessao.statusPorNota && sessao.statusPorNota[nunota]
              ? sessao.statusPorNota[nunota]
              : sessao.status;

          const numnotaReal = info?.numnota || nunota;
          const fornecedorNota = info?.fornecedor || 'Fornecedor da Nota';
          const totalItensNota = info?.qtdItens || 0;
          const chavenfeNota = info?.chavenfe || sessao.chavenfe;
          const codparcNota = info?.codparc || sessao.codparc;

          const backupsNota = backupsDisponiveis.filter(
            (bk) => bk.nunotaOrigem === nunota || bk.conferenciaIdOrigem === sessao.id
          );

          const ehAbertoNota = statusNota === 'Em Aberto';

          resultado.push({
            id: `${sessao.id}_${nunota}`,
            conferenciaIdOrig: sessao.id,
            sessaoConjunta: true,
            nunotas: [nunota],
            numerosNotas: String(numnotaReal),
            fornecedor: fornecedorNota,
            status: statusNota,
            nivelAtual: ehAbertoNota ? 1 : sessao.nivelAtual,
            conferente: ehAbertoNota ? 'Aguardando Início' : (sessao.conferente || 'Operador'),
            criadoEm: sessao.criadoEm,
            atualizadoEm: sessao.atualizadoEm,
            finalizadoEm: sessao.finalizadoEm,
            enviadoSankhyaEm: sessao.enviadoSankhyaEm,
            aprovadoPor: sessao.aprovadoPor,
            totalItens: totalItensNota,
            totalQtdEsperada: info?.qtdUnidades || 0,
            totalBipadoN1: totalBipadoN1Nota,
            totalBipadoN2: totalBipadoN2Nota,
            totalBipadoN3: totalBipadoN3Nota,
            temBackupContagem: backupsNota.length > 0,
            backupContagem: sessao.backupContagem,
            observacaoAprovacao: sessao.observacaoAprovacao,
            statusPorNota: { [nunota]: statusNota },
            notasDetalhadas: [{ nunota, numnota: numnotaReal }],
            chavenfe: chavenfeNota,
            numnota: numnotaReal,
            codparc: codparcNota,
            adPreventrega: info?.adPreventrega,
            conferenteN1: ehAbertoNota ? undefined : confN1Nota,
            conferenteN2: ehAbertoNota ? undefined : confN2Nota,
            conferenteN3: ehAbertoNota ? undefined : confN3Nota,
            backupsDisponiveis: backupsNota,
          });
        }
      } else {
        const numerosNotas =
          numerosNotasArr.length > 0 ? numerosNotasArr.join(', ') : sessao.nunotas.join(', ');
        const fornecedor =
          fornecedoresSet.size > 0 ? Array.from(fornecedoresSet).join(' / ') : 'Fornecedor da Nota';
        const ehAbertoSessao = sessao.status === 'Em Aberto';

        resultado.push({
          id: sessao.id,
          conferenciaIdOrig: sessao.id,
          sessaoConjunta: false,
          nunotas: sessao.nunotas,
          numerosNotas,
          fornecedor,
          status: sessao.status,
          nivelAtual: ehAbertoSessao ? 1 : sessao.nivelAtual,
          conferente: ehAbertoSessao ? 'Aguardando Início' : (sessao.conferente || 'Operador'),
          criadoEm: sessao.criadoEm,
          atualizadoEm: sessao.atualizadoEm,
          finalizadoEm: sessao.finalizadoEm,
          enviadoSankhyaEm: sessao.enviadoSankhyaEm,
          aprovadoPor: sessao.aprovadoPor,
          totalItens,
          totalQtdEsperada,
          totalBipadoN1,
          totalBipadoN2,
          totalBipadoN3,
          temBackupContagem: backupsDisponiveis.length > 0,
          backupContagem: sessao.backupContagem,
          observacaoAprovacao: sessao.observacaoAprovacao,
          statusPorNota: sessao.statusPorNota,
          notasDetalhadas,
          chavenfe,
          numnota,
          codparc,
          adPreventrega: primeiraNotaInfo?.adPreventrega,
          conferenteN1: ehAbertoSessao ? undefined : conferenteN1,
          conferenteN2: ehAbertoSessao ? undefined : conferenteN2,
          conferenteN3: ehAbertoSessao ? undefined : conferenteN3,
          backupsDisponiveis,
        });
      }
    }

    // 5. Adicionar notas de compra do Sankhya que ainda não possuem sessão iniciada (status 'Em Aberto')
    const todasNunotasSessoes = new Set<number>();
    for (const sessao of sessoes) {
      for (const n of sessao.nunotas) {
        if (n) todasNunotasSessoes.add(n);
      }
    }

    for (const [nunotaStr, info] of Object.entries(mapaNotasSankhya)) {
      const nunota = Number(nunotaStr);
      if (todasNunotasSessoes.has(nunota)) {
        continue; // Já tratada dentro de uma sessão
      }

      // Se a nota já foi liberada/faturada no Sankhya sem conferência local, pula
      if (info.statusnota === 'L') {
        continue;
      }

      const numnota = info.numnota || nunota;
      const dataCriacao = info.dtneg || info.dtentsai || new Date().toISOString();

      resultado.push({
        id: `aberto_${nunota}`,
        nunotas: [nunota],
        numerosNotas: String(numnota),
        fornecedor: info.fornecedor || 'Fornecedor da Nota',
        status: 'Em Aberto',
        nivelAtual: 1,
        conferente: 'Aguardando Início',
        criadoEm: dataCriacao,
        atualizadoEm: dataCriacao,
        totalItens: info.qtdItens || 0,
        totalQtdEsperada: info.qtdUnidades || 0,
        totalBipadoN1: 0,
        totalBipadoN2: 0,
        totalBipadoN3: 0,
        temBackupContagem: false,
        notasDetalhadas: [{ nunota, numnota }],
        chavenfe: info.chavenfe,
        numnota,
        codparc: info.codparc,
        adPreventrega: info.adPreventrega,
        backupsDisponiveis: [],
      });
    }

    // Ordenar resultado: notas em andamento/divergentes primeiro, seguidas de Em Aberto, e por fim Concluídas/Enviadas
    const pesoStatus: Record<string, number> = {
      'Divergente': 1,
      'Aguardando N2': 2,
      'N2 em Andamento': 3,
      'Aguardando N3': 4,
      'N3 em Andamento': 5,
      'N1 em Andamento': 6,
      'Iniciado': 7,
      'Em Aberto': 8,
      'Aguardando Aprovação': 9,
      'Conferido': 10,
      'Enviado ao Sankhya': 11,
    };

    resultado.sort((a, b) => {
      const pesoA = pesoStatus[a.status] || 99;
      const pesoB = pesoStatus[b.status] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime();
    });

    return resultado;
  }
}

