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
