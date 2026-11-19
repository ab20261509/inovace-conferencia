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
7. **REABASTECIMENTO DE PULMÃO (EMPILHADEIRA) ⟷ SEPARAÇÃO DE CARGAS (VENDAS):**
   - Carga retida em `AGUARDANDO_REABASTECIMENTO` trava conclusão prematura.
   - Ao abastecer, status `REABASTECIDO` prioriza a carga no topo absoluto da fila e o produto no início da rota guiada.
   - Faltas no pulmão (`FALTA_PULMAO`) oferecem duplo desfecho: `[ 🚜 Abastecer ]` (se localizado depois) ou `[ ✂️ Confirmar Corte Definitivo ]` (exclusivo para quem tem `reabastecimento_finalizar_falta`).
   - Observações utilizam botão flutuante `[ ℹ️ ]` (hover no desktop e toque no mobile), sem caixas amarelas estáticas.
   - Especificação detalhada em [`docs/regras/reabastecimento-pulmao-e-separacao.md`](./docs/regras/reabastecimento-pulmao-e-separacao.md). Proibido alterar sem autorização.
8. **ENDEREÇAMENTO WMS (PRODUTO X ENDEREÇOS & MOVIMENTAÇÕES):**
   - Picking único: no máximo 1 picking ativo por produto; novo picking inativa o anterior automaticamente no Sankhya ERP (`TGWEXP`).
   - Múltiplos pulmões ativos simultâneos permitidos.
   - Busca de produtos estritamente numérica sem varredura aberta de `LIKE '%N%'` em referências para evitar falsos positivos. Códigos de barras resolvidos exclusivamente em `TGFBAR` (`CODBARRA` não existe em `TGFPRO`).
   - Ordem das abas: `📍 Por Endereço` (1ª com filtros analíticos), `📦 Por Produto` (2ª com banner de contexto e saldos), `🕒 Histórico` (3ª com log auditável).
   - Especificação detalhada em [`docs/regras/modulo-enderecamento-wms.md`](./docs/regras/modulo-enderecamento-wms.md). Proibido alterar sem autorização.


