/**
 * Limpa prefixos técnicos de serviços Sankhya (ex: "[Sankhya ConferenciaSP.salvarItemConferido]")
 * de modo que a API devolva mensagens limpas e compreensíveis para o operador.
 */
export function limparErroSankhya(error: any): string {
  const msg = error?.message || String(error || 'Erro interno no servidor');
  return msg.replace(/^\s*\[[^\]]*\]\s*/, '').trim();
}
