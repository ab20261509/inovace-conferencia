# Padrão de Relatórios e Folhas de Impressão (PDF / Impressora)
**Sistema ConferCheck • Ecossistema Sankhya OM**

Este documento estabelece as diretrizes de arquitetura, design visual, leitura ótica e segurança para a criação e manutenção de relatórios impressos e exportações em PDF no sistema.

---

## 1. Arquitetura e Tecnologia

Para garantir máxima fidelidade, performance instantânea e compatibilidade tanto em desktops quanto em coletores móveis, os relatórios utilizam a estratégia de **HTML/CSS Nativo com `@media print` + SVGs Vetoriais**:

- **Motor de Renderização**: Navegador nativo (`window.print()`), dispensando bibliotecas pesadas de geração de PDF no backend (como Puppeteer ou Chromium headless).
- **Códigos de Barras**: Renderizados como elementos vetoriais `<svg>` via **`JsBarcode`** (padrão Code 128). Isso garante barras 100% nítidas em qualquer DPI de impressão (térmica, laser ou jato de tinta), sem serrilhamento ou pixelização.
- **Interação**: Padrão com **Modal de Pré-visualização** antes da impressão, permitindo ao usuário conferir as informações na tela antes de disparar a impressão física ou salvar como PDF.

---

## 2. Estrutura Padrão de um Relatório / Folha

Todos os relatórios e folhas de conferência devem seguir a seguinte estrutura otimizada para economia de papel em **2 colunas**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CABEÇALHO ULTRA COMPACTO (2 Linhas)                                  │
│    • Linha 1: Título do Módulo + Badge fino da Nota Fiscal/Documento   │
│    • Linha 2: Faixa de Metadados (NUNOTA, Razão Social, Emissão, Total Qtd) │
├────────────────────────────────────────────────────────────────────────┤
│ 2. GRID EM 2 COLUNAS (Apresentação sequencial item a item)              │
│    ┌───────────────────────────────┬────────────────────────────────┐  │
│    │ ITEM 1 (Coluna Esquerda)      │ ITEM 2 (Coluna Direita)        │  │
│    │ • L1: #Seq [Cód] NF:... Qtd:..│ • L1: #Seq [Cód] NF:... Qtd:.. │  │
│    │ • L2: Descrição do Produto    │ • L2: Descrição do Produto     │  │
│    │ • Lote (ERP/Bip) + Val + Fab  │ • Lote (ERP/Bip) + Val + Fab   │  │
│    │ ┌──────────────┬────────────┐ │ ┌──────────────┬─────────────┐ │  │
│    │ │ Barcode Prod │Barcode Lote│ │ │ Barcode Prod │Barcode Lote │ │  │
│    │ └──────────────┴────────────┘ │ └──────────────┴─────────────┘ │  │
│    ├───────────────────────────────┼────────────────────────────────┤  │
│    │ ITEM 3 (Coluna Esquerda)      │ ITEM 4 (Coluna Direita)        │  │
│    │ ...                           │ ...                            │  │
│    └───────────────────────────────┴────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. RODAPÉ COMPACTO                                                     │
│    • Assinatura do Sistema • Timestamp • Finalidade                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificações dos Códigos de Barras para Leitura por Pistola

Para assegurar leitura imediata pelas pistolas óticas em layout compacto:

| Propriedade | Padrão Recomendado | Motivo / Benefício |
| :--- | :--- | :--- |
| **Simbologia** | `CODE128` | Padrão universal alfanumérico aceito por 100% dos coletores e pistolas. |
| **Disposição** | **Lado a Lado** | Código do Produto e Código do Lote dispostos horizontalmente no mesmo card. |
| **Altura da Barra** | `32px` | Redução que economiza até 40% de espaço vertical mantendo leitura rápida. |
| **Largura da Barra** | `1.25` | Proporção ideal para caber 2 códigos lado a lado na largura de uma meia folha. |
| **Texto Inferior** | `displayValue: true` | Texto legível abaixo das barras (`monospace`, `10px`). |
| **Prioridade do Código de Barras** | 1º Referência (`referencia`)<br>2º Demais Códigos (`codBarra`/EAN)<br>3º Código do Produto (`codProd`) | Prioriza a referência do fabricante/produto; se não houver, utiliza o EAN/código de barras alternativo; se nenhum existir, utiliza o código interno do Sankhya. |
| **Rótulo do Código de Produto** | `CÓDIGO DE BARRAS` | Rótulo padronizado e limpo exibido acima das barras do produto. |
| **Código do Lote** | Individual quando houver (rótulo `LOTE`) | Exibido ao lado do produto. Se não houver lote, o espaço fica livre. |

---

## 4. Regras de Estilização `@media print` (2 Colunas A4)

Para que a impressão em formato A4 funcione com acabamento profissional e sem desperdício de papel:

```css
@media print {
  /* 1. Ocultar todos os elementos da interface do sistema */
  body * {
    visibility: hidden;
  }

  /* 2. Exibir exclusivamente o container da folha */
  .folha-bipagem-documento,
  .folha-bipagem-documento * {
    visibility: visible !important;
  }

  .folha-bipagem-documento {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    padding: 6mm 8mm !important;
    background: #ffffff !important;
    color: #000000 !important;
  }

  /* 3. Forçar 2 colunas na impressão e impedir quebra no meio do item */
  .folha-itens-grid-2col {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 6px !important;
  }

  .folha-item-card-compact {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    border: 1px solid #475569 !important;
    padding: 5px 6px !important;
  }

  /* 4. Forçar contraste e cores para impressão */
  .folha-cabecalho-linha2,
  .folha-lote-info-compact,
  .barcode-svg-wrapper-compact svg {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  /* 5. Quebra de página automática entre notas fiscais em conferências conjuntas */
  .folha-secao-nota + .folha-secao-nota {
    page-break-before: always !important;
    break-before: page !important;
    margin-top: 0 !important;
    border-top: none !important;
    padding-top: 0 !important;
  }
}
```

### 4.1 Conferências Conjuntas com Múltiplas Notas Fiscais
Quando uma conferência abranger duas ou mais notas fiscais simultaneamente (podendo ser inclusive de fornecedores distintos):
- **Agrupamento Automático**: Os itens são separados por nota fiscal (`numnota` / `nunota`).
- **Cabeçalho Dedicado por Nota**: Cada nota fiscal ganha seu próprio cabeçalho contendo o número da nota, número único (`NUNOTA`), razão social do parceiro (`NOMEPARC`), data de emissão e quantidade de produtos daquela nota.
- **Quebra de Página (`page-break-before: always`)**: Cada nota fiscal é impressa em folhas distintas, permitindo que a equipe de conferência manuseie a folha de bipagem separadamente por nota física ou palete.
- **Reinício da Sequência (#1, #2...)**: A numeração dos itens reinicia em `#1` a cada bloco de nota fiscal, facilitando a identificação imediata dos itens daquela NF.
- **IDs Únicos de Código de Barras**: O identificador do elemento SVG de cada código de barras incorpora o índice do grupo e do item (`barcode-prod-${gIdx}-${itemIdx}`), eliminando colisões de ID no DOM causadas por sequências idênticas entre notas fiscais.

---

## 5. Diretrizes de Segurança & Conferência Cega

1. **Visibilidade do Botão de Geração**:
   - A emissão de folhas de separação/bipagem com códigos de barras e lotes deve ser restrita a **usuários administradores** (`ehAdmin`):
     ```typescript
     const ehAdmin =
       ['SUP', 'ANTONY', 'ANTONY.B'].includes((user?.nomeUsu || '').toUpperCase()) ||
       temPermissao('gerenciar_acessos');
     ```
2. **Respeito à Conferência Cega**:
   - O campo **Quantidade Pedida** (`qtdPed`) só deve ser impresso no relatório caso o usuário possua permissão de acesso a campos sensíveis (`verCamposSensiveis`).
   - Para conferentes em regime cego, o campo não deve exibir a quantidade faturada para evitar viés na contagem física.

---

## 6. Origem dos Dados de Lote no Sankhya

- **Lote**: Armazenado na coluna `CONTROLE` da tabela `TGFITE`.
- **Validade e Fabricação**: Obtidos na tabela `TGFEST`, cruzando com a empresa da nota e o controle:
  ```sql
  LEFT JOIN TGFEST EST ON EST.CODPROD = ITE.CODPROD
                      AND EST.CONTROLE = ITE.CONTROLE
                      AND EST.CODEMP = CAB.CODEMP
                      AND EST.TIPO = 'P'
                      AND EST.CODPARC = 0
  ```
- **Formatação de Datas**: `TO_CHAR(EST.DTVAL, 'DD/MM/YYYY')` e `TO_CHAR(EST.DTFABRICACAO, 'DD/MM/YYYY')`.

### 6.1 Regra de Origem e Supressão de Lotes no Recebimento (Entrada)

No módulo de Conferência de Entrada (Recebimento de Mercadorias), os lotes podem ter duas naturezas distintas:
1. **`[🏢 ERP Sankhya]`**: Quando o lote já veio cadastrado/faturado previamente na nota fiscal de compra (`TGFITE.CONTROLE`).
2. **`[📱 Bipagem Coletor]`**: Quando o lote foi identificado e bipado pelo operador durante a conferência física (`lotesConferidos`).

**Regra de Supressão**: Se um item não possuir lote informado no ERP e ainda não tiver sido bipado no coletor, o bloco de lote é **automaticamente removido/suprimido** do card do produto. O produto será impresso apenas com seus dados de identificação e código de barras, evitando blocos vazios ou impressões desnecessárias.

---

## 7. Checklist para Criação de Novos Relatórios

Ao implementar um novo relatório no sistema, certifique-se de:
- [ ] Criar o componente de modal de pré-visualização antes da impressão.
- [ ] Incluir cabeçalho com identificação do documento, parceiro e data/hora de emissão.
- [ ] Aplicar `page-break-inside: avoid` nos blocos repetitivos.
- [ ] Usar `JsBarcode` com `format: 'CODE128'` e altura mínima de 40px para qualquer código escaneável.
- [ ] Fornecer fallback seguro para itens sem código de barras cadastrado.
- [ ] Testar a saída no diálogo "Salvar como PDF" do Chrome/Edge para validar a paginação A4.
