# Diretrizes e Regras do Projeto - ConferCheck (Sankhya BFF + Frontend)

Este documento estabelece as regras obrigatórias e diretrizes arquiteturais para qualquer implementação ou alteração no projeto ConferCheck. Todas as sessões e agentes devem seguir estritamente estas regras.

---

## 🚨 1. Restrições Mandatórias Absolutas

1. **PROIBIDO GIT COMMIT E GIT PUSH:**
   - **NUNCA** execute `git commit`, `git push` ou comandos que modifiquem o histórico do repositório remoto.
   - O controle de versionamento final e commits são realizados exclusivamente pelo operador humano.
2. **VALIDAÇÃO DE BUILD OBRIGATÓRIA:**
   - Ao finalizar qualquer alteração de código, execute e valide:
     - Frontend: `npm run build` na pasta `frontend` (deve compilar com exit code 0).
     - Backend: `npm run build` na pasta `backend` (deve compilar com exit code 0).
3. **DOCUMENTAÇÃO DE PROGRESSO:**
   - Toda alteração e entrega relevante deve ser registrada no topo do arquivo [`PROGRESSO.md`](./PROGRESSO.md).

---

## 🛡️ 2. Isolamento Rigoroso entre Conferência de Saída e Conferência de Entrada

As telas de **Conferência de Saída** e **Conferência de Entrada** são módulos operacionais distintos que NÃO devem compartilhar estilos ou estruturas com acoplamento rígido:

### ⚠️ Regra de Ouro do CSS:
- **NUNCA altere classes genéricas em `global.css`** (como `.scanner-form-inner`, `.ui-container--scanner`, `.ui-campo--scanner`, etc.) para atender necessidades de apenas uma tela.
- Qualquer alteração em classes genéricas de `global.css` afeta silenciosamente a outra conferência, causando desalinhamentos e quebra de layout.

### 📦 Escopo da Conferência de Saída (`ConferenciaProdutos.tsx`):
- Todos os estilos customizados da Conferência de Saída devem residir no arquivo dedicado:
  👉 [`frontend/src/presentation/pages/ConferenciaProdutos.css`](./frontend/src/presentation/pages/ConferenciaProdutos.css)
- Use seletores com prefixo exclusivo:
  - `.scanner-saida-card`
  - `.scanner-saida-form`
  - `.scanner-saida-input-codigo-wrapper`
  - `.scanner-saida-input-qtd-wrapper`
  - `.scanner-saida-btn-conferir`
  - `.scanner-saida-btn-camera`

### 📦 Escopo da Conferência de Entrada (`ConferenciaEntradaPage.tsx`):
- A Conferência de Entrada possui regras fiscais complexas (N1, N2 cego, N3 reconferência, Lote, Validade, Fabricação).
- As alterações de Entrada devem manter seus seletores próprios (ex: `.scanner-row-codigo`, `.conferencia-lote-grid`, etc.) e nunca sofrer interferência de ajustes da Saída.

---

## 🎨 3. Padrão Visual da Barra de Bipagem (Scanner Bar da Saída)

A barra de bipagem da Conferência de Saída deve manter rigorosamente o padrão visual aprovado:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────┐   ┌───────┐   ┌────────────────────┐ │
│  │ Escanear ou digitar código de barras...      │   │   1   │   │      Conferir      │ │
│  └──────────────────────────────────────────────┘   └───────┘   └────────────────────┘ │
│     (Borda Laranja #f97316, 12px radius)           (72px, bold)   (Slate #7e8590, bold) │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Card Container (`.scanner-saida-card`):**
   - Fundo branco (`#ffffff`), cantos arredondados (`border-radius: 20px`).
   - Borda suave cinza (`2px solid #e2e8f0`) e sombra delicada.
   - Layout horizontal flexível (`display: flex; align-items: center; gap: 12px`).
2. **Campo de Código de Barras (`.scanner-saida-input-codigo-wrapper`):**
   - Largura flexível (`flex: 1`).
   - Borda em destaque laranja (`border: 2px solid #f97316`).
   - Cantos arredondados (`border-radius: 12px`), altura `48px`.
   - Fonte monoespaçada (`JetBrains Mono`, `monospace`).
3. **Botão de Câmera Scanner (`.scanner-saida-btn-camera`):**
   - **Desktop (> 1024px):** Oculto (`display: none`).
   - **Mobile / Tablet (<= 1024px):** Exibido de forma compacta (`48px x 48px`, `border-radius: 12px`).
4. **Campo de Quantidade (`.scanner-saida-input-qtd-wrapper`):**
   - Largura fixa compacta (`72px`), altura `48px`.
   - Texto centralizado, números em negrito (`font-weight: 700`).
   - Cantos arredondados (`border-radius: 12px`), borda `2px solid #e2e8f0`.
5. **Botão Conferir (`.scanner-saida-btn-conferir`):**
   - **Ativo (com código digitado):** Fundo escuro normal (`background: #0f172a`), hover (`#1e293b`).
   - **Inativo / Disabled (campo vazio):** Fundo cinza ardósia suave (`background: #7e8590`), `opacity: 0.65`, `cursor: not-allowed`.
   - Texto em branco negrito (`font-weight: 700`, `color: #ffffff`).
   - Cantos arredondados (`border-radius: 12px`), altura `48px`.

---

## 🔒 4. Regra Mandatória: Sigilo de Conferência de Entrada (Modo Cego, Abas e Colunas)

> [!CAUTION]
> **PROIBIDO ALTERAR SEM AUTORIZAÇÃO EXPRESSA DO OPERADOR HUMANO.**
> A especificação completa e detalhada deste fluxo reside em 👉 [`docs/regras/modo-cego-entrada.md`](./docs/regras/modo-cego-entrada.md).

### 🚫 Restrições Rígidas para o Conferente no Modo Cego (`!verCamposSensiveis || isCega || ocultarStatus`):
1. **PROIBIDO EXIBIR ABAS DE "PENDENTES" E "CONFERIDOS":**
   - O conferente operacional **NUNCA** pode ver abas separadas de pendentes e conferidos.
   - A separação de abas revelaria quando a quantidade fiscal esperada foi atingida, violando o princípio fiscal da contagem cega.
   - **Obrigatório:** Exibir **apenas uma aba única**: `Produtos da Conferência` contendo todos os produtos da nota.
2. **PROIBIDO EXIBIR A COLUNA "ESPERADO":**
   - Na tabela desktop, a coluna `Esperado` deve ser estritamente omitida no Modo Cego (não renderizar `<th>` nem `<td>`). Proibido renderizar colunas vazias ou preenchidas com traços `— (Cega)`.
3. **APENAS UMA COLUNA DE CONTAGEM FÍSICA:**
   - Em termos de quantidade, o conferente deve ver **apenas uma coluna**: `Conferido N{nivel}` (ou contagem física real).
4. **PROIBIDO EXIBIR BADGES DE STATUS ("PARCIAL" / "CONFERIDO"):**
   - A coluna de status não deve exibir dicas de completude para conferentes comuns. Botões operacionais (`↺ Bip` e `⚠️ Ocorrência`) devem residir em uma coluna discreta `Ações`.
5. **CONTADORES DO TOPO:**
   - Conferentes no Modo Cego veem apenas `Total` (itens distintos) e `Bipados` (volume conferido). Os contadores `Conf` e `Pend` são exclusivos para supervisores.

---

## ⚖️ 5. Regra Mandatória: Desempate de Divergências de Recebimento (N2 vs N3 vs ERP)

> [!CAUTION]
> **PROIBIDO ALTERAR SEM AUTORIZAÇÃO EXPRESSA DO OPERADOR HUMANO.**
> A especificação completa e detalhada deste fluxo reside em 👉 [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md).

### 🚫 Restrições Rígidas para Resolução de Divergências com Reconferência N3:
1. **PROIBIDO MISTURAR OU SOMAR BIPAGENS DE NÍVEIS DIFERENTES:**
   - Bipagens apuradas no N2 (Lote/Validade/Qtd) e bipagens apuradas no N3 pertencem a etapas de conferência concorrentes.
   - **É estritamente proibido** juntar dados de N2 e N3 em uma lista unificada de frações de lote para a mesma nota fiscal.
2. **BLOQUEIO DE FALSO DESMEMBRAMENTO:**
   - O status `⚠️ Aguardando Desmembramento` e o botão `✂️ Desmembrar` **só podem ser acionados** se dentro da contagem do **mesmo nível adotado** o conferente registrou fisicamente mais de 1 lote. Discordâncias entre N2 e N3 representam desempate, e não desmembramento.
3. **COLUNAS COMPARATIVAS DEDICADAS:**
   - Quando houver N3 na nota (`totalN3 > 0`), a tabela de divergências deve exibir colunas dedicadas `ERP` | `N2` | `N3` para Quantidade, Lote, Validade e Fabricação.
4. **VINCULAÇÃO INTEGRAL DO PACOTE:**
   - O clique do gestor em qualquer célula do N3 adota integralmente o pacote do N3 (Quantidade + Lote + Validade + Fabricação). O mesmo se aplica ao clicar em N2 ou ERP.

---

## 📦 6. Regra Mandatória: Precedência de Sobras Físicas e Ciclo de Vida de Ocorrências

> [!CAUTION]
> **PROIBIDO ALTERAR SEM AUTORIZAÇÃO EXPRESSA DO OPERADOR HUMANO.**
> A especificação completa e detalhada deste fluxo reside em 👉 [`docs/regras/sobras-multiplos-lotes-ocorrencias.md`](./docs/regras/sobras-multiplos-lotes-ocorrencias.md).

### 🚫 Restrições Rígidas para Sobras, Múltiplos Lotes e Ocorrências:
1. **PRECEDÊNCIA ABSOLUTA DA SOBRA FÍSICA SOBRE O DESMEMBRAMENTO:**
   - O Sankhya rejeita qualquer desmembramento cuja soma seja maior que o faturado da nota.
   - Quando `diferenca > 0`, o botão **`📦 Gerar Ocorrência de Sobra`** deve **sempre estar visível e ser resolvido primeiro**, mesmo se o item tiver múltiplos lotes. O botão `✂️ Desmembrar` é bloqueado com aviso educativo enquanto persistir sobra física.
2. **SELEÇÃO INTELIGENTE DO LOTE EXCEDENTE:**
   - O modal de ocorrência de sobra detecta frações cuja contagem coincide com a quantidade da sobra (ex: 1 UN) e pré-seleciona automaticamente os dados daquele lote.
3. **EXCLUSÃO DEFINITIVA NO REINÍCIO DA CONFERÊNCIA:**
   - O modal de reinício lista expressamente todas as ocorrências físicas ativas vinculadas (X, Y, Z com produto, quantidade, lote e local) e oferece checkbox (marcado por padrão) para exclusão definitiva (`DELETE`) do banco de dados.
4. **EXPURGO DE OCORRÊNCIAS COM NOTAS EXCLUÍDAS NO ERP:**
   - Ocorrências cujas notas fiscais forem excluídas no Sankhya são canceladas automaticamente no backend e sinalizadas como `⚠️ Nota Excluída no ERP`.
5. **ALINHAMENTO HORIZONTAL NA COLUNA PRODUTO:**
   - Badges de status (`Pendente de Decisão` / `Aguardando Desmembramento`) e botões de ação (`Decidir Divergência` / `Revisar Desempate`) devem ser renderizados **lado a lado (horizontalmente)** em container flex, sem empilhamento vertical.


