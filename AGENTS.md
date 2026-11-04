# Diretrizes do Projeto - ConferCheck

Consulte o arquivo principal de regras em [`GEMINI.md`](./GEMINI.md).

### Resumo das Regras Críticas:
1. **NUNCA FAZER GIT COMMIT NEM GIT PUSH.**
2. **VALIDAÇÃO DE BUILD OBRIGATÓRIA:** `npm run build` no frontend e no backend antes de concluir qualquer tarefa.
3. **ISOLAMENTO ENTRE SAÍDA E ENTRADA:**
   - Conferência de Saída possui seu CSS exclusivo em [`ConferenciaProdutos.css`](./frontend/src/presentation/pages/ConferenciaProdutos.css) com prefixo `.scanner-saida-*`.
   - NUNCA alterar classes genéricas em `global.css` para ajustar uma tela e quebrar a outra.
   - Padrão visual da barra de bipagem da Saída: Card com cantos arredondados (20px), código com borda laranja (`#f97316`), quantidade compacta (`72px`) e botão Conferir com estado normal escuro (`#0f172a`) e estado inativo/disabled em cinza ardósia (`#7e8590`). Câmera oculta no desktop e visível apenas em mobile (<= 1024px).
4. **SIGILO DE CONFERÊNCIA DE ENTRADA (MODO CEGO):**
   - Conferentes sem privilégio (`!verCamposSensiveis || isCega || ocultarStatus`) NUNCA devem ver abas separadas de pendentes/conferidos, colunas de esperado ou badges de status.
   - Devem ver estritamente UMA aba única (`Produtos da Conferência`) e UMA coluna numérica de contagem física.
   - Especificação imutável detalhada em [`docs/regras/modo-cego-entrada.md`](./docs/regras/modo-cego-entrada.md). Proibido alterar sem aprovação do operador humano.
5. **DESEMPATE DE DIVERGÊNCIAS (N2 vs N3 vs ERP):**
   - NUNCA fundir ou somar bipagens de N2 e N3 em frações de lote da mesma nota.
   - O gestor escolhe entre N2, N3 ou ERP diretamente nas células comparativas dedicadas da tabela.
   - O clique adota integralmente o pacote do nível (Qtd + Lote + Validade + Fab) e elimina falsos desmembramentos.
6. **SOBRAS FÍSICAS, MÚLTIPLOS LOTES E CICLO DE VIDA DE OCORRÊNCIAS:**
   - Sobra física deve ser resolvida **primeiro**: quando `diferenca > 0`, o botão `📦 Gerar Ocorrência de Sobra` tem precedência absoluta sobre `✂️ Desmembrar`.
   - Proibido desmembrar com quantidade excedente; o desmembramento com sobra é bloqueado.
   - No reinício de conferência, listar expressamente as ocorrências ativas com opção de exclusão definitiva do banco de dados (checkbox marcado por padrão).
   - Cancelamento automático de ocorrências órfãs de notas fiscais excluídas no Sankhya ERP.
   - Especificação detalhada em [`docs/regras/sobras-multiplos-lotes-ocorrencias.md`](./docs/regras/sobras-multiplos-lotes-ocorrencias.md). Proibido alterar sem autorização.

