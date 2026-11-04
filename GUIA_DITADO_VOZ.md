# Guia Operacional e Técnico: Ditado por Voz na Conferência de Entrada

Este documento detalha o funcionamento, arquitetura e instruções de uso do **mecanismo de ditado por voz e transcrição fonética inteligente** para os campos de **Lote**, **Validade** e **Fabricação** na tela de **Conferência de Entrada** (`/recebimento/conferencia`).

---

## 🎙️ 1. Visão Geral da Funcionalidade

Para agilizar o processo de conferência no coletor/tablet Android e eliminar a lentidão de digitação manual de lotes alfanuméricos e datas, o sistema conta com um motor nativo de reconhecimento de fala que:
1. Converte números por extenso em dígitos numéricos (`1`, `2`, `24`, `2026`).
2. Converte sinais falados em símbolos de lote (`.`, `-`, `/`, `_`).
3. Converte datas faladas em linguagem natural para o formato `DD/MM/AAAA` com validação de calendário real.
4. Exibe um **Popup de Confirmação** com feedback visual pulsante, permitindo revisar, ajustar manualmente ou refazer a fala antes de gravar no formulário.
5. Permite operação em **Fluxo Sequencial Contínuo** ou **Acionamento Individual Sob Demanda**.

---

## 🔄 2. Fluxos de Operação

### A. Fluxo Sequencial Contínuo (Recomendado na Bipagem)
Ideal para a operação diária com leitor físico de código de barras:

```
┌────────────────────────────────────────────────────────┐
│ Bipagem do código com leitor (Lote vazio no N2/N3)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Passo 1: Lote                                          │
│ • Assistente fala: "Informe o lote"                    │
│ • Abre popup com microfone pulsante                    │
│ • Operador dita o lote (ex: "um dois três f k")        │
│ • Transcreve: 123456FK                                 │
│ • Operador confirma (Enter ou botão Confirmar)         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Passo 2: Validade                                      │
│ • Assistente fala: "Informe a validade"                │
│ • Operador dita a validade (ex: "15 de outubro de 26") │
│ • Transcreve: 15/10/2026                               │
│ • Operador confirma (Enter ou botão Confirmar)         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Passo 3: Fabricação                                    │
│ • Assistente fala: "Informe a fabricação"              │
│ • Operador dita a data (ex: "primeiro de maio de 24")  │
│ • Transcreve: 01/05/2024                               │
│ • Operador confirma (Enter ou botão Confirmar)         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Finalização e Revisão Visual                           │
│ • Fecha o popup automaticamente                        │
│ • Preenche os 3 campos na tela de conferência          │
│ • Foco transferido para o botão "Conferir Produto"     │
│ • Operador revisa e pressiona Enter para registrar     │
└────────────────────────────────────────────────────────┘
```

### B. Acionamento Individual Sob Demanda
Ao lado de cada um dos campos (`Lote *`, `Validade *`, `Fabricação *`), existe um botão circular compacto de microfone (`24px x 24px`, 🎤):
- Clicar no 🎤 de **Lote**: abre o popup apenas para o lote. Ao confirmar, fecha e move o cursor para o campo de Validade.
- Clicar no 🎤 de **Validade**: abre o popup apenas para a validade. Ao confirmar, fecha e move o cursor para o campo de Fabricação.
- Clicar no 🎤 de **Fabricação**: abre o popup apenas para a fabricação. Ao confirmar, fecha e foca o botão "Conferir Produto".

---

## 🗣️ 3. Como Falar e Exemplos de Frases Aceitas

### A. Campo de Lote (`normalizarLoteFalado`)
Converte números, sinais e soletrações para caixa alta sem espaços:

| O operador fala: | O sistema transcreve: |
| :--- | :--- |
| *"um dois três quatro cinco seis f k e f"* | `123456FKEF` |
| *"vinte e quatro ponto zero cinco traço b"* | `24.05-B` |
| *"letra l vinte e quatro zero cinco"* | `L2405` |
| *"cem barra doze underline a"* | `100/12_A` |
| *"quarenta e cinco traço duzentos"* | `45-200` |

- **Sinais falados aceitos:** `ponto`, `traço`/`hífen`, `barra`, `underline`/`sublinhado`, `dois pontos`, `asterisco`, `arroba`.

---

### B. Campos de Data - Validade e Fabricação (`normalizarDataFalada`)
Converte datas faladas em linguagem natural brasileira para o formato `DD/MM/AAAA`:

| O operador fala: | O sistema transcreve: | Validação: |
| :--- | :--- | :--- |
| *"quinze de outubro de dois mil e vinte e seis"* | `15/10/2026` | ✅ Válida |
| *"quinze do dez de vinte e seis"* | `15/10/2026` | ✅ Válida (ano 26 expandido para 2026) |
| *"primeiro de maio de vinte e quatro"* | `01/05/2024` | ✅ Válida ("primeiro" vira 01) |
| *"vinte e quatro barra doze barra vinte e cinco"* | `24/12/2025` | ✅ Válida |
| *"15 10 2026"* ou *"15 10 26"* | `15/10/2026` | ✅ Válida |
| *"31 de abril de 2026"* | — | ❌ Rejeitada (*"Dia 31 inválido para abril (máx: 30 dias)"*) |
| *"29 de fevereiro de 2025"* | — | ❌ Rejeitada (*"Fevereiro de 2025 tem 28 dias"* - não bissexto) |
| *"29 de fevereiro de 2024"* | `29/02/2024` | ✅ Válida (ano bissexto aceito) |
| *"outubro de 2026"* (sem falar o dia) | — | ❌ Rejeitada (*"Data incompleta. Fale o Dia, Mês e Ano"*) |

> [!IMPORTANT]
> **Regra de Exigência de Data Completa:** Conforme regra de negócio aprovada, o operador deve falar obrigatoriamente **Dia, Mês e Ano**. Se o dia for omitido na fala, o popup exibe um alerta visual em destaque e solicita a data completa ou correção no campo de ajuste.

---

## 🎛️ 4. Recursos do Popup de Ditado (`ModalDitadoLote.tsx`)

O modal oferece controle total ao operador para evitar retrabalho:
1. **Indicador de Escuta Pulsante:**
   - Enquanto ouve o conferente, exibe animação suave em vermelho com o texto `🎙️ Ouvindo... Fale [campo] agora`.
2. **Display de Destaque:**
   - Exibe o valor reconhecido em fonte grande, monoespaçada e centralizada.
3. **Ajuste Manual Fino:**
   - Campo editável com máscara dinâmica (`DD/MM/AAAA` para datas e maiúsculas para lote).
4. **Atalhos e Botões:**
   - **Confirmar (`Enter`):** Valida a integridade dos dados e envia para a tela.
   - **Falar Novamente / Refazer (`🎤`):** Limpa a transcrição anterior e reativa a escuta imediatamente.
   - **Cancelar (`Esc`):** Fecha o popup e cancela a sequência sem alterar dados já salvos.

---

## 🛠️ 5. Arquitetura Técnica e Arquivos Modificados

| Componente / Arquivo | Responsabilidade |
| :--- | :--- |
| [`frontend/src/infrastructure/speech/reconhecimentoLote.ts`](./frontend/src/infrastructure/speech/reconhecimentoLote.ts) | Motor Web Speech API, controladores `criarReconhecedorLote()`, normalizador de lotes (`normalizarLoteFalado`) e normalizador fonético de datas com regras de calendário (`normalizarDataFalada`). |
| [`frontend/src/infrastructure/audio/alertas.ts`](./frontend/src/infrastructure/audio/alertas.ts) | Sintetizador de bipes Web Audio API e chamadas vocais via `tocarAlertaPedirCampo('lote' \| 'validade' \| 'fabricacao')`. Garante término da fala da assistente antes de liberar o microfone. |
| [`frontend/src/presentation/components/Recebimento/ModalDitadoLote.tsx`](./frontend/src/presentation/components/Recebimento/ModalDitadoLote.tsx) | Componente visual do modal com suporte aos tipos `'lote'`, `'validade'` e `'fabricacao'`. Trata atalhos `Enter`/`Esc` e máscara de digitação manual. |
| [`frontend/src/presentation/components/Recebimento/ModalDitadoLote.css`](./frontend/src/presentation/components/Recebimento/ModalDitadoLote.css) | Estilização exclusiva do modal, animações pulsantes do microfone (`@keyframes modalMicPulse`) e layout responsivo. |
| [`frontend/src/presentation/pages/ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) | Orquestrador do fluxo contínuo e individual na tela de entrada, gerenciamento de refs (`inputLoteRef`, `inputValidadeRef`, `inputFabricacaoRef`, `btnConferirRef`). |
| [`frontend/src/presentation/pages/ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css) | Estilos dos botões de microfone compactos nos labels (`.label-com-microfone-linha`, `.btn-microfone-label`). |
| [`frontend/src/presentation/components/Campo/Campo.tsx`](./frontend/src/presentation/components/Campo/Campo.tsx) | Suporte flexível a `ReactNode` no prop `label`, permitindo renderizar o botão 🎤 ao lado do asterisco. |
| [`frontend/src/presentation/components/Botao/Botao.tsx`](./frontend/src/presentation/components/Botao/Botao.tsx) | Refatorado para `forwardRef<HTMLButtonElement>`, permitindo transferência de foco para o botão Conferir ao final do fluxo de voz. |
| [`frontend/vite.config.ts`](./frontend/vite.config.ts) | Configuração de HTTPS com `@vitejs/plugin-basic-ssl` para liberar APIs de microfone e mídia em dispositivos Android na rede local. |

---

## 🔒 6. Permissões de Navegador e Certificado SSL no Android / Coletor

Para que o microfone funcione sem aviso de "site vulnerável" nos coletores e tablets:

### Método 1: Baixar e Instalar o Certificado Confiável (rootCA.crt)
1. No tablet, acesse a página de instalação:
   👉 `https://<IP_DO_SERVIDOR>:5173/instalar.html` (ou diretamente `https://<IP_DO_SERVIDOR>:5173/download-ca`)
2. Toque no botão **⬇️ Baixar rootCA.crt**.
3. No Android: **Configurações** ➔ **Segurança** ➔ **Mais configurações de segurança** ➔ **Instalar do armazenamento** (ou *Instalar certificado*).
4. Selecione **Certificado de CA** e escolha o arquivo `rootCA.crt` baixado.
5. Reinicie o Chrome: o cadeado ficará seguro e o aviso sumirá permanentemente.

### Método 2: Alternativa sem Instalar Certificado (Chrome Flag)
Se preferir não instalar arquivos de certificado no tablet:
1. No Chrome do tablet, abra: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Digite o endereço do servidor: `http://<IP_DO_SERVIDOR>:5173`
3. Mude para **Enabled** e toque em **Relaunch**.
4. O Chrome tratará o IP como seguro (igual a `localhost`), sem aviso nenhum.
   - Clique no ícone de configurações ao lado do cadeado na barra de endereços do Chrome.
   - Acesse **Permissões** ➔ **Microfone** ➔ selecione **Permitir**.
