# Registro de Progresso e Entregas - Conferência de Entrada & Gestão de Recebimento

## Atualização: Busca por Chave da NF-e no Recebimento (`Recebimento.tsx` & Backend)

- **Consulta da Chave de Acesso no Sankhya (`ListarNotasEntradaUseCase.ts`):**
  - Adicionado `CAB.CHAVENFE` na consulta SQL de notas de compra no Sankhya ERP (`TGFCAB`).
  - Mapeado campo `chavenfe` nas entidades e modelos de `NotaEntrada` no backend e frontend.
- **Filtro Integrado de Busca:**
  - O campo de pesquisa (`Filtrar por NF, fornecedor, NUNOTA ou chave NF-e...`) aceita a bipagem direta via leitor óptico (44 dígitos), digitação manual ou busca parcial (últimos dígitos).
  - Normalização inteligente: remove espaços e caracteres especiais para casar tanto chaves puras quanto formatadas.
- **Badge Visual Discreto no Card:**
  - Exibido badge limpo e padronizado `🔑 NF-e` no cabeçalho do card da nota (sem poluição de dígitos numéricos).
  - No hover (tooltip), exibe a chave de acesso completa de 44 dígitos (`Chave de Acesso NF-e (44 dígitos):\n[chave]`).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

## Atualização: Ordenador por Previsão de Entrega no Recebimento (`Recebimento.tsx`)

- **Botão Toggle de Ordenação Rápida por Previsão:**
  - Posicionado no canto superior direito do painel de notas (`Notas de Entrada (Recebimento)`), no slot de ações do `Painel`.
  - **Design neutro e compacto:** Estilizado em cinza slate neutro (`#f8fafc`, borda `#cbd5e1`), sem poluição de tags coloridas.
  - **Dois modos de alternância com clique único:**
    - `📅 Previsão ↑` (Padrão ao abrir a tela): Lista primeiro as notas atrasadas, em seguida as de hoje, amanhã e futuras por ordem cronológica crescente de entrega.
    - `📅 Previsão ↓`: Ordena as notas por datas mais distantes primeiro, decrescendo cronologicamente.
  - **Tratamento de Notas Sem Data:**
    - Notas sem data de previsão (`🚫 Sem data entrega`) permanecem sempre posicionadas no final da lista em ambos os modos, mantendo o foco total nas entregas programadas.
    - Desempate natural por `NUNOTA` decrescente.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

## Atualização: Otimização do Cabeçalho dos Cards de Entrada (`Recebimento.tsx`)

- **Remoção de Badge Duplicado do Conferente:**
  - Removido o badge `<span className="badge-conferente-coletor">` do cabeçalho do card de notas em `Recebimento.tsx`, eliminando a duplicidade com a indicação `Conferente: [NOME]` já presente de forma limpa na linha de métricas.
  - Liberação de espaço horizontal para visualização ampla do nome da empresa/fornecedor e destaque do badge de **Previsão de Entrega** (`BadgePrevisaoEntrega`), evitando quebras de linha e compressão visual em telas menores e coletores.

## Atualização: Separação de Notas de Conferências Conjuntas na Gestão de Recebimento

- **Cards Individuais por Nota Fiscal (`ListarTodasConferenciasEntradaUseCase.ts`):**
  - Conferências conjuntas agrupadas (ex: NFs 35802 e 221593) agora são apresentadas com um **card exclusivo e independente para cada Nota Fiscal**.
  - Cada card exibe:
    - O número exato da sua Nota Fiscal (`📄 NF: 35802` e `📄 NF: 221593`).
    - O seu respectivo fornecedor (`WORLD VETERINARIA...` e `ROYAL CANIN...`).
    - O quantitativo individual de SKUs daquela nota (`SKUs: 4 produtos` vs `SKUs: 3 produtos`).
    - As quantidades conferidas e progresso de bipagem segmentados exclusivamente para os produtos daquela nota.
    - Tag indicativa `📦 Sessão Conjunta` para rastreabilidade de cargas compartilhadas.
    - Previsão de entrega (`adPreventrega`) e conferentes dedicados àquela nota.
- **Contabilização Real nos Contadores do Topo (`GestaoRecebimento.tsx`):**
  - Os contadores de resumo do topo (`Em Aberto`, `Em Conferência`, `Divergências`, etc.) agora contabilizam nota por nota (ex: 2 notas conjuntas em andamento somam 2 em "Em Conferência").
- **Visualização Isolada de Itens ao Expandir (`ObterItensConferenciaEntradaUseCase.ts`):**
  - Ao clicar em `🔍 Ver Itens` no card de uma nota, a tabela expandida carrega e lista **exclusivamente os produtos daquela nota fiscal**, sem misturar itens da outra nota.
- **Ações Gerenciais Segmentadas:**
  - Ações como `Recontar`, `Reiniciar` e `Abrir Coletor` operam com foco exato na nota do card. Ao reiniciar uma nota de uma conferência conjunta, ela é desmembrada com segurança para uma conferência exclusiva sem afetar as demais.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

- **Badge de Conferente em Gestão de Recebimento (`AbaConferenciasView.tsx` & `GestaoRecebimento.css`):**
  - Implementado o componente reutilizável `BadgeConferente` com estilo visual próprio (`.badge-conferente-rec`, fundo `#eff6ff`, texto `#1d4ed8`, borda suave `#bfdbfe` e ícone `👤`).
  - Posicionado em destaque imediato na área de badges do cabeçalho do card, ao lado de `Nível Atual: N2` e do status de andamento (`N2 EM ANDAMENTO`).
  - Identifica claramente os operadores por nível (`👤 Conferente: N1: JOÃO • N2: ANTONY` ou `👤 Conferente: ANTONY (N1/N2)` ou `👤 Conferente: ANTONY` em maiúsculas).
- **Badge e Destaque no Coletor de Recebimento (`Recebimento.tsx` & `global.css`):**
  - Adicionado badge correspondente (`.badge-conferente-coletor`) no cabeçalho do card de cada nota, além do destaque em negrito e azul na linha de métricas.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

- **Separação Visual e Foco por Nota Fiscal (`ConferenciaEntradaPage.tsx`):**
  - Ao clicar no card de uma nota específica na lista de Recebimento (`Recebimento.tsx`), mesmo que ela pertença a uma conferência conjunta agrupada (ex: NFs 35802 e 221593), a tela de conferência abre exibindo **exclusivamente os itens e contadores da nota selecionada**, sem botões ou seletores adicionais de outras notas na tela de contagem.
  - **Métricas e Abas Filtradas Dinamicamente:**
    - Cards de resumo do cabeçalho (`Total`, `Conf`, `Pend`), contagens das abas e tabelas/cards de "Itens Pendentes" e "Itens Conferidos" recalculados em tempo real com base na nota em foco.
    - No cabeçalho, exibição do número exato da nota em conferência (`Nota Fiscal 35802 — Recebimento`) acompanhado da tag indicativa `📦 Conferência Conjunta (X Notas)`.
- **Segurança e Validação de Bipagem por Nota (`RegistrarBipagemEntradaUseCase.ts` e Frontend):**
  - Se o operador estiver com a NF 35802 selecionada e bipar um código que pertença exclusivamente à NF 221593 da mesma carga conjunta, o sistema bloqueia o registro indevido e alerta com clareza:
    `"⚠️ O produto [X] pertence à NF 221593 desta conferência conjunta. Alterne para essa nota no seletor para conferi-lo."`
  - Bipagens registradas são vinculadas com precisão à nota selecionada no backend.
- **Folha de Bipagem Otimizada por Nota:**
  - A geração da Folha de Bipagem acompanha a nota em foco, listando apenas os produtos da nota ativa (ou todas, caso selecionado "Ver Todas").
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

- **Previsão de Entrega (`TGFCAB.AD_PREVENTREGA`):**
  - Adicionado campo `AD_PREVENTREGA` nas consultas SQL de notas e conferências de compra no Sankhya (`ListarNotasEntradaUseCase.ts` e `ListarTodasConferenciasEntradaUseCase.ts`).
  - **Componente e Badges Inteligentes (`BadgePrevisaoEntrega`):**
    - `📅 Prev: DD/MM/YYYY (em X dias)` quando no prazo.
    - `📅 Prev: DD/MM/YYYY (Hoje)` quando a entrega for prevista para o dia atual.
    - `⚠️ Atrasado há X dias (DD/MM/YYYY)` destacado em vermelho quando a data já expirou.
    - `🚫 Sem data entrega` destacado em vermelho caso o campo esteja vazio no ERP.
  - **Regra de Borda de Card Atrasado (`.card-atrasado`):**
    - Cards com previsão atrasada ganham borda vermelha (`2px solid #ef4444`).
    - Caso a nota já esteja com conferência em andamento, a cor e o estilo de andamento têm prioridade sobre o atraso.
  - **Exibição nas Telas:**
    - **Gestão de Recebimento (`AbaConferenciasView.tsx`):** Badge posicionado no topo do card ao lado do número da NF.
    - **Lista da Conferência de Entrada (`Recebimento.tsx`):** Badge posicionado no cabeçalho do card ao lado do número da NF e parceiro.
- **Detalhamento do Usuário Conferente:**
  - **Gestão de Recebimento:** Exibição detalhada por nível quando houver operadores diferentes (`N1: [usuário] • N2: [usuário]`), ou identificação unificada `[usuário] (N1/N2)` quando o mesmo conferente operou ambos os níveis.
  - **Lista da Conferência de Entrada:** Exibição do conferente ativo nos cards das notas em andamento ou conferidas.
- **Validação de Builds:** Frontend e Backend compilados com código de saída 0.

---

## Atualização: Folha de Bipagem Minimalista (2 Colunas A4) para Saída e Entrada

- **Componente Reutilizável (`ModalFolhaBipagem`):**
  - Implementado modal e documento para impressão direta (`window.print()`) e exportação em PDF otimizado para economia de papel em formato 2 colunas.
  - **Sequência Estrita de Prioridade do Código de Barras do Produto:**
    1. **1º Referência** (`referencia` do produto/fabricante).
    2. **2º Demais Códigos de Barras** (`codBarra` / EAN cadastrado no Sankhya).
    3. **3º Código do Produto** (`codProd` como fallback final).
  - **Rótulos Padronizados:**
    - Acima do código de barras do produto: `CÓDIGO DE BARRAS`.
    - Acima do código de barras do lote: `LOTE` (exibido lado a lado com o produto).
  - **Limpeza Visual e Otimização de Espaço:**
    - Reorganização do topo do card em 2 linhas funcionais: **Linha 1** com metadados compactos (`#Seq`, `[Cód]`, `NF: ...`, `Qtd: ...`) e **Linha 2** com a descrição do produto preenchendo 100% da largura, eliminando o espaço vazio superior.
    - Removida a exibição textual de "Ref: [código]" do cabeçalho de cada produto no card, preservando seu uso como prioridade máxima na geração do código de barras.
    - Removidos textos explicativos desnecessários do cabeçalho do modal e do rodapé da folha de impressão.
  - **Acesso Restrito:**
    - Botão "📄 Folha de Bipagem" disponível exclusivamente para usuários administradores (`ehAdmin`) nas telas de Conferência de Saída ([`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx)) e Conferência de Entrada ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)).
  - **Conferência Conjunta com Múltiplas Notas Fiscais:**
    - Agrupamento automático dos itens por nota fiscal (`numnota` / `nunota`) e fornecedor (`nomeparc`).
    - Cada nota fiscal recebe seu cabeçalho dedicado com seu Nº da NF, Nº Único, Razão Social/Fornecedor, Emissão e Total de itens.
    - Quebra de página automática na impressão (`page-break-before: always`), gerando folhas físicas separadas por nota fiscal para o conferente.
    - Numeração dos itens (#1, #2, #3...) reiniciada a cada bloco de nota fiscal.
    - Resolução de colisão de IDs de códigos de barras no DOM: cada SVG recebe identificador único `barcode-prod-${gIdx}-${itemIdx}` e `barcode-lote-${gIdx}-${itemIdx}-${lIdx}`, garantindo renderização de 100% dos códigos de barras de todas as notas fiscais.
- **Documentação de Padrão:** Criado e atualizado [`PADRAO_RELATORIOS.md`](./PADRAO_RELATORIOS.md).
- **Validação de Builds:** Frontend e Backend compilados com código de saída 0.

---

## Atualização: Limpeza de Dados de Conferências de Entrada no Banco de Dados

- **Limpeza no SQLite (`confercheck.db`):**
  - Removidos todos os registros da tabela `conferencias_entrada` (0 registros restantes).
  - Removidos todos os registros da tabela `bipagens_entrada` (0 registros restantes).
  - Removidos todos os registros da tabela `ocorrencias_conferencia_entrada` (0 registros restantes).
  - Removidos os logs de auditoria vinculados a conferências e bipagens na tabela `logs_auditoria` (0 registros restantes de conferências).
  - Preservadas as tabelas de cadastros, permissões de usuários (`usuarios_acessos`), configurações de telas (`configuracoes_telas`) e parâmetros do sistema (`configuracoes_sistema`).
- **Validação de Builds:** Frontend e Backend compilados com código de saída 0.

---

### 1. Novo Design da Barra de Bipagem da Conferência de Saída
- **Fidelidade Visual:** A barra de bipagem da Conferência de Saída ([`ConferenciaProdutos.tsx`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/pages/ConferenciaProdutos.tsx)) foi atualizada para ficar idêntica ao modelo fornecido:
  - **Card Container:** Moldura branca com cantos arredondados (`border-radius: 20px`), borda suave (`2px solid #e2e8f0`) e sombra sutil.
  - **Campo de Código de Barras:** Input com destaque em borda laranja (`border: 2px solid #f97316`), cantos arredondados (`border-radius: 12px`), fonte JetBrains Mono e largura flexível (`flex: 1`).
  - **Campo de Quantidade:** Input compacto de largura fixa (`72px`), centralizado, com borda arredondada e fonte bold.
  - **Botão Conferir:** Estilo minimalista com fundo cinza ardósia (`#7e8590`), texto bold branco e cantos arredondados (`border-radius: 12px`), perfeitamente alinhado em altura com os inputs.
  - **Botão Câmera:** Oculto em telas desktop (> 1024px) e preservado de forma elegante exclusivamente em tablets e smartphones (<= 1024px).

### 2. Isolamento 100% de Estilos (Sem Impacto na Conferência de Entrada)
- **CSS Exclusivo:** Criado arquivo dedicado [`ConferenciaProdutos.css`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/pages/ConferenciaProdutos.css) com seletores de escopo específico (`.scanner-saida-card`, `.scanner-saida-form`, `.scanner-saida-input-codigo-wrapper`, `.scanner-saida-btn-conferir`, etc.).
- **Zero Efeito Colateral:** Nenhuma classe genérica de `global.css` ou da Conferência de Entrada ([`ConferenciaEntradaPage.tsx`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)) foi modificada.
- **Validação de Builds:** Frontend (`npm run build`) e Backend (`npm run build`) compilados com código 0.

---

## Atualização: Ocultação Dinâmica de Níveis Inativos (N1/N2) e Inteligência Gerencial da Aba Divergências

### 1. Ocultação Dinâmica de N1 e N2 nas Três Abas (Divergências, Conferências e Envio ERP)
- **Backend** (`ListarDivergenciasEntradaUseCase.ts`, `container.ts`):
  - Injetado `configSistemaRepo` no caso de uso para consultar os parâmetros `conferencia_entrada_nivel1_ativo` e `conferencia_entrada_nivel2_ativo`.
  - Retorna `nivel1Ativo` e `nivel2Ativo` em cada grupo de incidentes fiscais/divergências.
- **Frontend** (`GestaoRecebimento.tsx`, `AbaDivergenciasView.tsx`, `AbaConferenciasView.tsx`, `AbaEnvioSankhyaView.tsx`):
  - `GestaoRecebimento.tsx` consulta os parâmetros do sistema na inicialização e propaga `nivel1Ativo` e `nivel2Ativo` para todas as visões.
  - **Aba Divergências:** Mini-cards minimalistas de contagem (`N1`/`N2`), indicação de conferentes e colunas da tabela/mobile ocultadas dinamicamente.
  - **Aba Conferências:** Resumo de progresso (`N1: ... • N2: ...`) só lista os níveis ativos ou bipados; colunas `N1` e `N2` da tabela desktop e do grid mobile ocultadas dinamicamente.
  - **Aba Envio ERP:** Colunas `N1` e `N2` da tabela desktop e grid mobile ocultadas dinamicamente, mantendo foco nos lotes e locais a integrar no Sankhya.

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


