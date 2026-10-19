# Diretrizes do Projeto - ConferCheck

Consulte o arquivo principal de regras em [`GEMINI.md`](./GEMINI.md).

### Resumo das Regras Críticas:
1. **NUNCA FAZER GIT COMMIT NEM GIT PUSH.**
2. **VALIDAÇÃO DE BUILD OBRIGATÓRIA:** `npm run build` no frontend e no backend antes de concluir qualquer tarefa.
3. **ISOLAMENTO ENTRE SAÍDA E ENTRADA:**
   - Conferência de Saída possui seu CSS exclusivo em [`ConferenciaProdutos.css`](./frontend/src/presentation/pages/ConferenciaProdutos.css) com prefixo `.scanner-saida-*`.
   - NUNCA alterar classes genéricas em `global.css` para ajustar uma tela e quebrar a outra.
   - Padrão visual da barra de bipagem da Saída: Card com cantos arredondados (20px), código com borda laranja (`#f97316`), quantidade compacta (`72px`) e botão Conferir em cinza ardósia (`#7e8590`). Câmera oculta no desktop e visível apenas em mobile (<= 1024px).
