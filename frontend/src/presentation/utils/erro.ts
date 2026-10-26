/**
 * Utilitários para formatação e higienização de mensagens de erro para o usuário final.
 */

/**
 * Remove prefixos técnicos entre colchetes do Sankhya (ex: "[Sankhya ConferenciaSP.salvarItemConferido]")
 * deixando apenas a mensagem de negócio legível para o operador.
 */
export function limparMensagemErro(mensagem?: string | null): string {
  if (!mensagem) return '';
  return mensagem.replace(/^\s*\[[^\]]*\]\s*/, '').trim();
}
