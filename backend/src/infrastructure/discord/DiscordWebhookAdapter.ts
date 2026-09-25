import axios from 'axios';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

export class DiscordWebhookAdapter {
  constructor(private readonly webhookUrl: string) {}

  async send(payload: DiscordPayload): Promise<void> {
    if (!this.webhookUrl || !this.webhookUrl.trim().startsWith('http')) {
      throw new Error(
        'URL do Webhook do Discord não configurada no servidor. Por favor, preencha DISCORD_WEBHOOK_URL no arquivo .env.',
      );
    }

    try {
      await axios.post(this.webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 8000,
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      throw new Error(`Falha ao disparar webhook do Discord: ${msg}`);
    }
  }
}
