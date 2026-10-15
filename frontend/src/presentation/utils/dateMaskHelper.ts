/**
 * Utilitários para máscara e validação de datas no formato brasileiro (DD/MM/AAAA)
 */

/**
 * Aplica a máscara dinâmica DD/MM/AAAA enquanto o usuário digita
 */
export function aplicarMascaraData(valor: string): string {
  if (!valor) return '';

  // Remove tudo que não for dígito
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 8);

  if (apenasNumeros.length <= 2) {
    return apenasNumeros;
  }
  if (apenasNumeros.length <= 4) {
    return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2)}`;
  }
  return `${apenasNumeros.slice(0, 2)}/${apenasNumeros.slice(2, 4)}/${apenasNumeros.slice(4)}`;
}

/**
 * Auto-completa o ano quando o usuário digita 2 dígitos (ex: 21/07/26 -> 21/07/2026)
 * Chamado no onBlur do campo
 */
export function completarAnoData(valor: string): string {
  if (!valor) return '';
  const limpo = valor.trim();

  // Caso 1: Já está no formato DD/MM/AA (6 dígitos com barras)
  const match2Digitos = limpo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (match2Digitos) {
    const dia = match2Digitos[1].padStart(2, '0');
    const mes = match2Digitos[2].padStart(2, '0');
    const ano2 = Number(match2Digitos[3]);
    const ano4 = ano2 <= 50 ? `20${match2Digitos[3]}` : `19${match2Digitos[3]}`;
    return `${dia}/${mes}/${ano4}`;
  }

  // Caso 2: Digitado 6 números contínuos sem barra (ex: 210726)
  const matchNumeros = limpo.replace(/\D/g, '');
  if (matchNumeros.length === 6) {
    const dia = matchNumeros.slice(0, 2);
    const mes = matchNumeros.slice(2, 4);
    const ano2 = Number(matchNumeros.slice(4, 6));
    const ano4 = ano2 <= 50 ? `20${matchNumeros.slice(4, 6)}` : `19${matchNumeros.slice(4, 6)}`;
    return `${dia}/${mes}/${ano4}`;
  }

  // Caso 3: Digitado 8 números contínuos sem barra (ex: 21072026)
  if (matchNumeros.length === 8) {
    return `${matchNumeros.slice(0, 2)}/${matchNumeros.slice(2, 4)}/${matchNumeros.slice(4)}`;
  }

  // Caso 4: Se tiver DD/MM/ com ano parcial de 1 ou 3 dígitos, tenta normalizar o dia e mês
  const matchGeral = limpo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchGeral) {
    return `${matchGeral[1].padStart(2, '0')}/${matchGeral[2].padStart(2, '0')}/${matchGeral[3]}`;
  }

  return valor;
}

/**
 * Validação de data consistente de calendário
 */
export function validarData(
  valor: string,
  obrigatorio = false
): { valida: boolean; erro?: string } {
  const v = valor ? valor.trim() : '';

  if (!v) {
    if (obrigatorio) {
      return { valida: false, erro: 'Data obrigatória' };
    }
    return { valida: true };
  }

  // Valida padrão DD/MM/AAAA
  const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return { valida: false, erro: 'Data incompleta (DD/MM/AAAA)' };
  }

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);

  if (mes < 1 || mes > 12) {
    return { valida: false, erro: 'Mês inválido (01 a 12)' };
  }

  if (ano < 1920 || ano > 2120) {
    return { valida: false, erro: 'Ano fora da faixa permitida' };
  }

  // Dias máximos do mês considerando ano bissexto
  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > diasNoMes) {
    return { valida: false, erro: `Dia inválido para o mês (01 a ${diasNoMes})` };
  }

  return { valida: true };
}
