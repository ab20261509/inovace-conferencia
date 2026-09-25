import { IGatewayPort } from '../../../../domain/ports/IGatewayPort.js';
import { DiscordWebhookAdapter } from '../../../../infrastructure/discord/DiscordWebhookAdapter.js';
import { ListarItensPedidoUseCase } from '../consulta/ListarItensPedidoUseCase.js';

export interface NotificarDiscordInput {
  nuNota: number;
  usuario?: string;
}

export interface NotificacaoDiscordDados {
  usuarioSnk: string;
  razaoSocial: string;
  pedido: number | string;
  oc: string;
  itensPendentes: string[];
  estoque: string;
  mensagemFormatada: string;
}

export class NotificarDiscordUseCase {
  constructor(
    private readonly gateway: IGatewayPort,
    private readonly listarItensPedidoUseCase: ListarItensPedidoUseCase,
    private readonly discordAdapter: DiscordWebhookAdapter,
  ) {}

  /**
   * Monta e retorna os dados da prévia da notificação
   */
  async obterPrevia(input: NotificarDiscordInput, correlationId?: string): Promise<NotificacaoDiscordDados> {
    const sql = `
      SELECT 
        CAB.NUMNOTA,
        NVL(CAB.AD_USUARIOCONF, 'NÃO INFORMADO') AS USUARIO_CONFERENTE,
        NVL(PAR.RAZAOSOCIAL, 'NÃO INFORMADO') AS RAZAO_SOCIAL,
        NVL(TO_CHAR(CAB.ORDEMCARGA), '-') AS ORDEM_CARGA
      FROM TGFCAB CAB
      LEFT JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC
      WHERE CAB.NUNOTA = ${input.nuNota}
    `;

    const response = await this.gateway.serviceCall<any>(
      'DbExplorerSP.executeQuery',
      {
        serviceName: 'DbExplorerSP.executeQuery',
        requestBody: { sql },
      },
      correlationId,
    );

    const row = response.responseBody?.rows?.[0];
    const pedido = row ? row[0] : input.nuNota;
    const usuarioSnk = (input.usuario && input.usuario.trim()) || (row ? String(row[1]) : 'Henrique');
    const razaoSocial = row ? String(row[2]) : '-';
    const oc = row ? String(row[3]) : '-';

    // Buscar itens pendentes com quantidades completas
    const itensResult = await this.listarItensPedidoUseCase.execute(
      { nuNota: input.nuNota, usuario: 'SUP' },
      correlationId,
    );

    const pendentes = itensResult.itens.filter((i) => i.status !== 'completo');

    const itensPendentesFormatados: string[] = pendentes.map((it) => {
      const ped = parseFloat(it.qtdPed || '0');
      const conf = parseFloat(it.qtdConf || '0');
      const falta = Math.max(0, ped - conf);
      const descr = (it.descrProd || '').trim();
      return `${falta} UN > ${descr} / COD: ${it.codProd}`;
    });

    if (itensPendentesFormatados.length === 0) {
      itensPendentesFormatados.push('NENHUM ITEM PENDENTE ENCONTRADO');
    }

    const estoque = 'NÃO ENCONTRADO';
    const itensTexto = itensPendentesFormatados.join('\n');

    const mensagemFormatada = [
      `Usuário SNK: ${usuarioSnk}`,
      `Razão Social: ${razaoSocial}`,
      `Pedido : ${pedido}`,
      `OC : ${oc}`,
      `Itens Pendentes:\n${itensTexto}`,
      `Estoque: ${estoque}`,
      `AGUARDANDO RESPOSTA PARA SEGUIR O PROCESSO DE FINALIZAÇÃO !!!`,
    ].join('\n');

    return {
      usuarioSnk,
      razaoSocial,
      pedido,
      oc,
      itensPendentes: itensPendentesFormatados,
      estoque,
      mensagemFormatada,
    };
  }

  /**
   * Executa o disparo do webhook no Discord
   */
  async execute(input: NotificarDiscordInput, correlationId?: string): Promise<{ sucesso: boolean; dados: NotificacaoDiscordDados }> {
    const dados = await this.obterPrevia(input, correlationId);

    const discordContent = [
      `**Usuário SNK:** ${dados.usuarioSnk}`,
      `**Razão Social:** ${dados.razaoSocial}`,
      `**Pedido :** ${dados.pedido}`,
      `**OC :** ${dados.oc}`,
      `**Itens Pendentes:**\n${dados.itensPendentes.join('\n')}`,
      `**Estoque:** ${dados.estoque}`,
      `**AGUARDANDO RESPOSTA PARA SEGUIR O PROCESSO DE FINALIZAÇÃO !!!**`,
    ].join('\n');

    const embed = {
      title: '🚨 Alerta de Conferência — Pendência de Estoque',
      color: 0xED4245, // Vermelho atenção
      fields: [
        { name: 'Usuário SNK', value: dados.usuarioSnk, inline: true },
        { name: 'Razão Social', value: dados.razaoSocial, inline: true },
        { name: 'Pedido', value: String(dados.pedido), inline: true },
        { name: 'OC', value: dados.oc, inline: true },
        { name: 'Estoque', value: dados.estoque, inline: true },
        { name: 'Itens Pendentes', value: dados.itensPendentes.join('\n'), inline: false },
      ],
      footer: { text: 'AGUARDANDO RESPOSTA PARA SEGUIR O PROCESSO DE FINALIZAÇÃO !!!' },
      timestamp: new Date().toISOString(),
    };

    await this.discordAdapter.send({
      content: discordContent,
      embeds: [embed],
    });

    return {
      sucesso: true,
      dados,
    };
  }
}
