# Registro de Progresso e Entregas - Conferência de Entrada & Gestão de Recebimento

## Atualização: Ocultação Dinâmica de Níveis Inativos (N1/N2) e Inteligência Gerencial da Aba Divergências

### 1. Ocultação Dinâmica de N1 e N2 (Configurações do Sistema)
- **Backend** (`ListarDivergenciasEntradaUseCase.ts`, `container.ts`):
  - Injetado `configSistemaRepo` no caso de uso para consultar os parâmetros `conferencia_entrada_nivel1_ativo` e `conferencia_entrada_nivel2_ativo`.
  - Retorna `nivel1Ativo` e `nivel2Ativo` em cada grupo de incidentes fiscais/divergências.
- **Frontend** (`ConferenciaEntrada.ts`, `AbaDivergenciasView.tsx`):
  - Modelos tipados com `nivel1Ativo` e `nivel2Ativo`.
  - Mini-cards de contagem no topo (`N1` e `N2`) são ocultados dinamicamente quando o nível estiver inativo e sem contagens históricas.
  - Linha de rastreabilidade (`👤 Conferentes`) oculta os níveis inativos não operados.
  - Colunas `N1` e `N2` da Tabela Desktop e linhas do Grid Mobile são ocultadas de forma limpa e dinâmica.

### 2. Dica Gerencial Inteligente (Decision Assist)
- **Frontend** (`AbaDivergenciasView.tsx`):
  - **Eliminação de Falso Positivo N1 ≠ N2:** A regra de discordância de contagem cega agora exige expressamente que ambos os níveis tenham sido operados (`houveN1 && houveN2`). Nunca mais acusa divergência entre níveis quando apenas N2 (ou N1) estiver ativo.
  - **Dica de Lote/Validade Divergente:** Quando as contagens físicas atingem 100% dos itens da nota e divergem apenas no Lote ou Validade (dados fiscais), o assistente exibe recomendação direta de *Aprovar Divergência* para atualização da TGFITE/TGFEST.
  - **Dicas de Falta/Sobra em Nível Único:** Orientações adaptadas para contagem simples direta ou desempate em N3.

---

## Atualização: Tabela Padronizada de Conferência e Sub-Linha Gaveta com Lotes e Datas em Colunas Separadas

### 1. Padronização das Colunas da Tabela de Itens Conferidos
- **Frontend** (`ConferenciaEntradaPage.tsx`, `global.css`):
  - **Estrutura de Colunas Unificada:**
    - `PRODUTO`: Imagem, descrição do item, identificador de NF e código/referência.
    - `VOLUME`: Unidade de medida (`codvol`, ex: `UN`, `FR`, `CX`).
    - `ESPERADO`: Quantidade faturada na nota fiscal (`qtdneg` ou indicação de contagem cega).
    - `CONFERIDO N{nível}`: Quantidade total física consolidada com destaque numérico verde e indicador de sobra se houver.
    - `STATUS`: Badges padronizados (`✓ Conferido`, `Sobra (+X)` ou `Parcial`) integrados com ações rápidas de estorno (`↺ Bip`, `✕ Zerar`).

### 2. Sub-Linha Gaveta (Accordion Drawer) para Múltiplos Lotes Bipados
- **Frontend** (`ConferenciaEntradaPage.tsx`, `global.css`):
  - **Fim da Deformação da Linha:** A linha principal permanece com altura fixa e padrão (~60px), sem esticar verticalmente.
  - **Chip Expansível de Lotes:** Exibido abaixo da quantidade conferida (`🏷️ N Lotes ▲/▼`).
  - **Colunas Separadas no Dropdown:** Ao abrir a gaveta (`subrow-lotes-drawer`), uma mini-tabela exibe cada informação em sua coluna própria:
    - 🏷️ **Lote:** Tag estilizada em fonte mono.
    - 📦 **Quantidade:** Quantidade conferida daquele lote específico com a unidade.
    - 📅 **Data de Validade:** Data formatada (`DD/MM/AAAA`).
    - 🏭 **Data de Fabricação:** Data formatada (`DD/MM/AAAA`).
    - ✕ **Ação:** Botão de estorno cirúrgico por lote individual, permitindo anular apenas bips de um lote específico sem perder os outros.

---

## Atualização: Cockpit de KPIs, Envio em Lote ao ERP e Redesign Minimalista da Gestão de Recebimento

### 1. Cockpit Executivo de KPIs no Topo da Tela
- **Frontend** (`GestaoRecebimento.tsx`, `GestaoRecebimento.css`):
  - **4 KPIs Operacionais Compactos:**
    - 🚚 **Em Conferência:** Quantidade de notas em contagem e monitoramento de tempo de pátio.
    - ⚠️ **Divergências:** Cargas bloqueadas aguardando decisão gerencial (N3 ou aceite).
    - 📦 **Prontas p/ Envio:** Conferências 100% finalizadas e aptas para envio ao Sankhya ERP.
    - ⚡ **Integradas ERP:** Total de notas sincronizadas com sucesso no dia.
  - **Navegação Reativa:** Clicar em qualquer KPI alterna automaticamente para a aba correspondente com filtros pertinentes.

### 2. Ações em Lote e Envio Consolidado ao Sankhya ERP (Bulk Actions)
- **Frontend** (`GestaoRecebimento.tsx`, `AbaEnvioSankhyaView.tsx`, `GestaoRecebimento.css`):
  - Checkboxes discretos em cada card de envio para seleção individual de conferências aptas.
  - Barra de ações em lote flutuante/fixa com contagem dinâmica de notas selecionadas.
  - Botão de seleção rápida *"Selecionar todas as aptas"*.
  - Disparo de envio em lote sequencial resiliente em `handleConfirmarAcaoModal`, com feedback em tempo real e tratamento de erros por nota.

### 3. Assistente de Decisão Inteligente e Badges de Severidade em Divergências
- **Frontend** (`AbaDivergenciasView.tsx`, `GestaoRecebimento.css`):
  - **Decision Assist (Sugestão de Decisão):**
    - $N1 = N2 \neq \text{Nota}$: Alerta que os conferentes concordaram na contagem física e sugere falta/sobra de origem do fornecedor.
    - $N1 \neq N2$: Identifica conflito entre conferentes e recomenda abertura de reconferência Nível 3 (N3).
  - **Badges de Severidade Visual:** Indicadores padronizados de severidade em vermelho (`⚠️ -X Falta`) e verde/azul (`+X Sobra`) tanto no desktop quanto nos cards mobile.

### 4. Checklist Pré-Envio Visual e Mini-Filtros em Envio Sankhya
- **Frontend** (`AbaEnvioSankhyaView.tsx`, `GestaoRecebimento.css`):
  - Validador visual de 3 etapas pré-envio nos cards:
    1. Conferência Concluída / Fechada
    2. Lotes e Validades (100% informados vs pendentes)
    3. Nota Fiscal Ativa no ERP Sankhya
  - Mini-filtros rápidos por card ao expandir itens: `Todos`, `⚠️ Sem Lote`, `📊 Excel`, `📱 Coletor`.

### 5. Redesign Minimalista dos Cards e Itens da Lista de Conferência
- **Frontend** (`AbaConferenciasView.tsx`, `GestaoRecebimento.css`):
  - **Eliminação da Quádrupla Redundância de Backup:** Remoção do badge do header, banner amarelo gigante, caixa de métrica e botão roxo isolado. Substituído por um **Ribbon Minimalista no Topo** (`gestao-card-backup-ribbon`) com texto discreto e botão acoplado *"Restaurar Contagem"*.
  - **Status por Nota Integrado:** Eliminada a faixa cinza separada. Status de notas agrupadas exibidos como micro-pills leves ao lado da numeração das NFs no cabeçalho.
  - **Métricas & Progresso Unificados:**
    - Fim da ambiguidade textual *"212 de 5 unidades"*.
    - Separação clara entre mix de produtos e volume físico: `SKUs: 5 produtos • Bipado (N1): 212 un. • ✓ 100% Batendo`.
    - Barra de progresso horizontal fina de 6px com cantos arredondados e transição suave.
  - **Hierarquia de Ações (Regra 1 + N):**
    - Ação primária evidente à esquerda: `🔍 Ver Itens (X) ▼` / `▲ Ocultar Itens`.
    - Grupo de ações secundárias operacionais limpas à direita: `🔁 Recontar`, `📱 Coletor`, `↺ Reiniciar`.
  - **Micro-pills de Rastreabilidade nos Itens:**
    - Células de Lote com badges `🏷️ Lote: XXX` ou `⚠️ Sem Lote`.
    - Validade e fabricação com tipografia mono compacta de alta leitura.
  - **Densidade em Tela:** Redução de ~62% na altura do card, permitindo visualizar até 8 conferências simultâneas sem rolagem excessiva.

### 6. Protótipos Interativos e Verificação Técnica
- **Artefatos Generative UI Criados:**
  - `gestao_recebimento_melhorias_ui.html`: Protótipo visual completo das 5 melhorias da gestão de recebimento.
  - `ver_itens_minimalista_ondas.html`: Estratégia de ondas de implementação para inspeção de itens.
  - `sugestao_minimalista_itens_lista.html`: Comparativo interativo antes vs depois do card e das linhas de produtos.
- **Validação de Build:** `npm run build` (`tsc -b && vite build`) compilado com código de saída 0 e zero erros de tipagem.
- **Diretriz Git:** Preservado sem commits/pushes automáticos.

---

## Atualização Anterior: Integração de Divergências por NF, Rastreabilidade de Conferentes e Comprovante de Envio ERP

### 1. Desmembramento e Tratamento Individual de Incidentes / Divergências por NF
- **Backend**:
  - `FinalizarNivelEntradaUseCase.ts`: Implementou retorno com `resumoPorNota: ResumoNotaFinalizacao[]`, atualizando `statusPorNota` independentemente para cada NF (ex: Nota A finalizada e aprovada vai para `Conferido`, enquanto Nota B com divergência vai para `Aguardando N2` ou `Aguardando N3`).
  - `ListarDivergenciasEntradaUseCase.ts`: Agora agrupa e desmembra incidentes individualmente por nota (`id: ${sessaoId}_${nunota}`). Retorna `conferentesN1`, `conferentesN2` e `conferentesN3` identificados por nota fiscal.
  - `ResolverDivergenciaUseCase.ts`: Aceita `nunota?: number`. Ao resolver ou encaminhar para N3, atua exclusivamente sobre a nota selecionada, mantendo as demais notas conferidas intactas.
  - `ObterItensConferenciaEntradaUseCase.ts`: No Nível N3, oculta automaticamente produtos pertencentes a notas que já foram aprovadas ou enviadas ao Sankhya.
  - `EnviarConferenciaSankhyaUseCase.ts`: Valida status individualmente via `sessao.statusPorNota[nunota]`, permitindo o envio ao ERP de notas aprovadas mesmo que outras notas da carga ainda estejam em processo de reconferência N3.

### 2. Rastreabilidade Completa de Conferentes na Gestão de Recebimento
- **Frontend**:
  - `AbaDivergenciasView.tsx`:
    - Cabeçalho dos cards com destaque de conferentes: `👤 Conferentes: N1: [João] | N2: [Maria] | N3: [Carlos]`.
    - Cada produto detalha na listagem os conferentes responsáveis por cada nível de contagem.
  - `GestaoRecebimento.tsx`:
    - Modais de resolução (`APROVAR_DIVERGENCIA`, `RECONFERIR_N3`, `REINICIAR`) agora recebem e repassam o `nunota` e o número da NF no contexto, exibindo títulos dinâmicos e isolando os impactos à nota selecionada.

### 3. Comprovante de Envio ao Sankhya (CSV Excel e Impressão / PDF)
- **Modal de Comprovante de Integração ERP**:
  - Exibido automaticamente ao concluir a integração com o Sankhya BFF.
  - Exibe:
    - Protocolo gerado no ERP (`protocolo`).
    - Número da Nota Fiscal integrada.
    - Data e hora do envio.
    - Responsável pelo envio.
    - Total de itens e registros de estoque atualizados (`TGFITE` / `TGFLOT` / `TGFEST`).
    - Tabela comparativa com código, descrição, quantidade esperada (faturada), quantidade conferida física, lote/validade vinculados e situação final (`Conferido OK` ou `Divergência Aceita`).
  - **Ações**:
    - **📥 Baixar Planilha CSV (Excel)**: Gera arquivo `.csv` codificado com UTF-8 BOM (`\uFEFF`) para abertura nativa e sem distorção de caracteres no Excel em português.
    - **🖨️ Imprimir / Salvar PDF**: Estilos específicos via `@media print` que isolam o comprovante para emissão limpa via diálogo do navegador.

### 4. Visualização de Lotes Linha a Linha na Gestão de Recebimento (Modelo 1 - Gaveta Integrada)
- **Eliminação de Textos Condensados**:
  - Eliminado o antigo formato condensado onde múltiplos lotes eram espremidos em uma única célula separados por vírgula (`LOTE1 (60), LOTE2 (40)`).
- **Implementação em Todas as Abas da Gestão de Recebimento**:
  - `AbaConferenciasView.tsx`: Quando um item possui múltiplos lotes conferidos, a linha principal exibe o chip interativo `🏷️ N Lotes (Expandir/Recolher)`. Ao clicar, uma sub-linha gaveta (`.subrow-lotes-drawer`) abre logo abaixo exibindo uma tabela dedicada onde cada lote possui sua linha individual com: `Lote`, `Quantidade Conferida`, `Data de Validade`, `Data de Fabricação` e `Conferente / Horário`.
  - `AbaEnvioSankhyaView.tsx`: Aplicado o mesmo padrão para as frações de lote destinadas à escrituração no Sankhya, integrando a origem (`📱 Coletor` vs `📊 Excel`) e botão para gerenciar/dividir frações diretamente por lote.
  - `AbaDivergenciasView.tsx`: Aplicado o suporte a gaveta expansível para itens divergentes com múltiplos lotes registrados.
- **Responsividade Mobile**:
  - Em telas menores (cards), o resumo compacto de cada produto permite expandir a lista de lotes, exibindo cada fração como um mini-bloco com lote, quantidade e datas formatadas.
- **Estilização**:
  - Classes `.subrow-lotes-drawer`, `.drawer-lotes-wrapper`, `.mini-tabela-lotes` e `.chip-dropdown-lote` adicionadas em `GestaoRecebimento.css`.

### 5. Unificação Minimalista dos Status Operacionais e Botões (Envio ao Sankhya)
- **Preservação Integral dos 4 Pilares de Validação Operacional**:
  - **1. Quantidades Físicas**: `✓ Quantidades Físicas OK` (100% conferidas vs faturadas) ou `⚠️ Aguardando Aprovação Gerencial`.
  - **2. Lotes e Validades**: `✓ Lotes & Validades OK` ou `⚠️ X sem Lote`.
  - **3. Locais de Estoque TGFITE**: `✓ Locais TGFITE OK` ou `⚠️ X sem Local TGFITE` (`TGFITE.CODLOCALORIG`).
  - **4. Status ERP Sankhya**: `✓ Integrado no Sankhya` (lilás) ou `🟢 Pronto p/ Envio` / `Aguardando Aprovação`.
- **Faixa de Status Minimalista (Inline Status Strip)**:
  - Substituição da antiga grade volumosa de 3 colunas e dos badges duplicados no cabeçalho por uma **Linha Única de Micro-Chips** (`.gestao-rec-status-strip` e `.gestao-micro-chip-status`).
  - Eliminação de alertas contraditórios: notas já integradas (`jaEnviado === true`) agora apresentam todos os micro-chips validados em estado positivo sem falsos alarmes de "⚠️ 4 sem lote".
- **Alinhamento e Hierarquia dos Botões**:
  - `Ver Itens e Lotes (N) ▼`: Botão limpo com contador e seta indicativa de estado.
  - `📥 Importar Excel`: Botão discreto e secundário, exibido apenas quando a nota ainda não foi integrada.
  - `🚀 Aprovar & Enviar ao Sankhya`: Ação primária posicionada na extremidade direita do card.
  - Eliminação de repetições desnecessárias no rodapé para notas já sincronizadas.

### 6. Correção de Status Residual ao Desmembrar/Reiniciar Notas
- **Diagnóstico da NF 221593**:
  - A NF 221593 (nunota `1349632`) foi conferida conjuntamente com a nota `1349482`.
  - A nota `1349482` apresentou divergência e foi reiniciada pelo gestor, sendo desmembrada para uma nova sessão.
  - A NF 221593 permaneceu na sessão original com contagem 100% batendo (`statusPorNota = 'Conferido'`), porém a sessão herdou o status global `'Divergente'` porque o backend não recalculava o status das notas restantes.
- **Correção Implementada**:
  - `ReiniciarConferenciaEntradaUseCase.ts`: Adicionada etapa de recálculo dinâmico do `sessao.status` após a remoção da nota desmembrada. Se todas as notas restantes estiverem `'Conferido'`, a sessão é promovida automaticamente a `'Conferido'` com `finalizadoEm` preenchido.
  - SQLite (`confercheck.db`): Atualizado o registro da NF 221593 (`735fe6bd-5cd2-451e-8b1a-87e1aa80c8fe`) para `status = 'Conferido'`, movendo-a imediatamente para a aba de Envio ao Sankhya.

### 7. Build e Verificação
- **Backend**: `tsc` executado com sucesso (exit code 0).
- **Frontend**: `tsc -b && vite build` executado com sucesso (exit code 0).
- **Git**: Alterações mantidas no working tree local (sem commits nem pushes).


