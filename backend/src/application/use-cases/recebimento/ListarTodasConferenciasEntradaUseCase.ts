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
    if (sessoes.length === 0) {
      return [];
    }

    // 2. Coletar todas as NUNOTAs distintas para buscar dados no Sankhya
    const todasNunotasSet = new Set<number>();
    for (const s of sessoes) {
      for (const n of s.nunotas) {
        if (n) todasNunotasSet.add(n);
      }
    }

    const nunotasArr = Array.from(todasNunotasSet);
    const mapaNotasSankhya: Record<
      number,
      { numnota: number; codparc?: number; chavenfe?: string; fornecedor: string; qtdItens: number }
    > = {};

    if (nunotasArr.length > 0) {
      try {
        const nunotasStr = nunotasArr.join(', ');
        const sql = `
SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODPARC,
    CAB.CHAVENFE,
    NVL(PAR.RAZAOSOCIAL, NVL(PAR.NOMEPARC, 'FORNECEDOR NÃO INFORMADO')) AS NOMEPARC,
    NVL(ITE.QTD_ITENS, 0) AS QTD_ITENS
FROM TGFCAB CAB
LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
LEFT JOIN (
    SELECT NUNOTA, COUNT(DISTINCT CODPROD) AS QTD_ITENS
    FROM TGFITE
    GROUP BY NUNOTA
) ITE ON ITE.NUNOTA = CAB.NUNOTA
WHERE CAB.NUNOTA IN (${nunotasStr})
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

          mapaNotasSankhya[nunota] = { numnota, codparc, chavenfe, fornecedor, qtdItens };
        }
      } catch (err) {
        console.warn('⚠️ Falha ao buscar dados de cabeçalho das notas no Sankhya:', err);
      }
    }

    // 3. Montar resumo de cada conferência cruzando com bipagens
    const resultado: ConferenciaEntradaResumo[] = [];

    for (const sessao of sessoes) {
      // Se nenhuma das notas existir no Sankhya (nota excluída no ERP), não exibe a conferência órfã
      const temNotaNoSankhya = sessao.nunotas.some((n) => !!mapaNotasSankhya[n]);
      if (!temNotaNoSankhya && Object.keys(mapaNotasSankhya).length > 0) {
        continue;
      }

      const bipagens = await this.conferenciaRepo.listarBipagens(sessao.id);

      let totalBipadoN1 = 0;
      let totalBipadoN2 = 0;
      let totalBipadoN3 = 0;

      for (const b of bipagens) {
        if (b.anulado) continue;
        const qtd = Number(b.qtdConferida) || 0;
        if (b.nivel === 1) totalBipadoN1 += qtd;
        else if (b.nivel === 2) totalBipadoN2 += qtd;
        else if (b.nivel === 3) totalBipadoN3 += qtd;
      }

      // Dados das notas fiscais vinculadas
      const numerosNotasArr: number[] = [];
      const fornecedoresSet = new Set<string>();
      let totalItens = 0;
      const notasDetalhadas: Array<{ nunota: number; numnota: number }> = [];

      for (const nunota of sessao.nunotas) {
        const info = mapaNotasSankhya[nunota];
        if (info) {
          if (info.numnota) numerosNotasArr.push(info.numnota);
          if (info.fornecedor) fornecedoresSet.add(info.fornecedor);
          totalItens += info.qtdItens;
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

      const numerosNotas =
        numerosNotasArr.length > 0 ? numerosNotasArr.join(', ') : sessao.nunotas.join(', ');
      const fornecedor =
        fornecedoresSet.size > 0 ? Array.from(fornecedoresSet).join(' / ') : 'Fornecedor da Nota';

      resultado.push({
        id: sessao.id,
        nunotas: sessao.nunotas,
        numerosNotas,
        fornecedor,
        status: sessao.status,
        nivelAtual: sessao.nivelAtual,
        conferente: sessao.conferente || 'Operador',
        criadoEm: sessao.criadoEm,
        atualizadoEm: sessao.atualizadoEm,
        finalizadoEm: sessao.finalizadoEm,
        enviadoSankhyaEm: sessao.enviadoSankhyaEm,
        totalItens,
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
        backupsDisponiveis,
      });
    }

    return resultado;
  }
}

