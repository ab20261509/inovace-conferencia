# Módulo de Endereçamento WMS (Produto x Endereço & Movimentações)

Este documento estabelece as diretrizes arquiteturais, regras de negócio e integrações técnicas do módulo de **Endereçamento WMS** no ConferCheck, integrado ao ERP Sankhya e ao banco local de auditoria.

---

## 🏛️ 1. Princípios e Tabelas do Sankhya ERP

1. **`TGWEND` (Cadastro Físico de Endereços WMS):**
   - Chave primária: `CODEND`.
   - Colunas essenciais: `ENDERECO` (máscara formatada, ex: `01.01.01.01.01`), `DESCREND`, `PICKING` (`'S'` ou `'N'`), `ATIVO` (`'S'` ou `'N'`).
   - Qualquer validação de endereço exige `ATIVO = 'S'`.
2. **`TGWEXP` (Amarração Produto x Endereço - Entidade `ProdutoEndereco`):**
   - Chave primária composta: `(CODEND, CODPROD, CONTROLE)`.
   - Colunas de auditoria: `ATIVO` (`'S'` ou `'N'`), `DTINICIO`, `DTFIM`, `CODVOL`.
   - Vínculos ativos são identificados estritamente por `ATIVO = 'S'`.
3. **`TGFPRO` & `TGFBAR` (Catálogo de Produtos e Códigos de Barras):**
   - O código de barras **NÃO** reside na coluna direta de `TGFPRO`. A busca de códigos de barras é realizada via subconsulta ou join na tabela `TGFBAR`:
     ```sql
     (SELECT MAX(BAR.CODBARRA) FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD) AS CODBARRA
     ```
   - A coluna `TIPCONREST` não existe na `TGFPRO`; o controle de lote do WMS é registrado no campo `CONTROLE` de `TGWEXP`.
4. **`TGFEST` (Saldo de Estoque):**
   - Consulta de saldo disponível: `SUM(ESTOQUE - RESERVADO)` agrupado por `CODPROD`.

---

## ⚖️ 2. Regras de Negócio Mandatórias

1. **Regra de Ouro do Picking Único:**
   - Cada produto possui **no máximo 1 endereço de Picking ativo**.
   - Ao vincular um novo endereço de picking ou promover um pulmão para picking (`tipo = 'PICKING'`), qualquer outro picking ativo anterior daquele produto é inativado automaticamente no Sankhya ERP (`ATIVO = 'N'`, `DTFIM = hoje`).
2. **Múltiplos Pulmões Simultâneos:**
   - Um produto pode ter múltiplos endereços de pulmão ativos simultaneamente, refletindo a capacidade de reserva em diferentes corredores ou níveis aéreos.
3. **Busca Estrita por Código de Produto (`CODPROD`):**
   - Consultas com termos puramente numéricos priorizam estritamente a igualdade `PRO.CODPROD = {termo} OR BAR.CODBARRA = '{termo}'`, proibindo buscas por substring (`LIKE '%N%'`) que geram falsos positivos.
   - A transição do mapa analítico para a aba de produtos consulta os itens em lote via `codprods: number[]` com cláusula `IN (...)`.
4. **Auditoria e Rastreabilidade Completa:**
   - Todas as movimentações (`MOVER`), desendereçamentos (`RETIRAR`), novos vínculos (`VINCULAR`) e promoções (`DEFINIR_PICKING`) são registradas na tabela local `historico_enderecamento` com usuário, data/hora, produto, origem e destino.

---

## 🖥️ 3. Interface do Usuário e Abas Operacionais

1. **Ordem das Abas de Navegação:**
   - **1ª Aba (Padrão):** `📍 Por Endereço` (Visão analítica de posições físicas).
   - **2ª Aba:** `📦 Por Produto` (Visão detalhada por item, com picking, pulmões e saldo).
   - **3ª Aba:** `🕒 Histórico de Movimentações` (Log auditável de ações).
2. **Lista Analítica de Endereços:**
   - Filtros rápidos por chips: Tipo (`Todos`, `Picking`, `Pulmão`) e Ocupação (`Todos`, `🟢 Livres/Vazios`, `🔴 Ocupados`).
   - Métricas no topo: Total de endereços, quantidade de ocupados e livres.
   - Clique na linha ou no botão `👁️ Ver Produtos` transiciona diretamente para a aba **Por Produto** exibindo o **Banner de Contexto**:
     `📍 Exibindo produtos do endereço: {ENDERECO} (N produtos encontrados) [✕ Limpar Filtro de Endereço]`.
3. **Modais Rápidos e Objetivos:**
   - **Mover:** Troca a posição física (inativa origem e ativa destino no Sankhya).
   - **Retirar:** Desvincula o produto e libera o endereço.
   - **Vincular / Definir Picking:** Associa novo pulmão ou define picking oficial, com suporte a lote opcional.
4. **Rotina de Cadastro Rápido de Produtos (Modo Coletor WMS - Atalho F2):**
   - **Acesso:** Botão de destaque `[ ⚡ Cadastrar no Endereço ]` no cabeçalho ou atalho `F2`.
   - **Mecânica Híbrida:** Toggle `[ 🔒 Travar Endereço ]` para fixar a posição e bipar N produtos em sequência contínua sem rebipar a rua/nível.
   - **Pré-visualização & Double-Scan de Confirmação:**
     - **1º Bip:** Localiza o produto no Sankhya e abre o card completo com conferência visual (foto/ícone, código, descrição, referência, EAN, unidade, picking atual, pulmões atuais e saldo em estoque).
     - **2º Bip:** Bipar o mesmo código de barras novamente (ou teclar Enter / clicar em Confirmar) efetiva o vínculo em `TGWEXP`.
     - **Bloqueio de Divergência:** Se o 2º bip for de um código diferente, emite alerta sonoro de erro e bloqueia a gravação para evitar troca acidental de itens.
   - **Controle de Lote:** Campo opcional de lote sem travar a contagem física (cadastro puramente locacional).
   - **Picking Único Automático:** Confirmação rápida caso o produto já possua outro picking, inativando o anterior no Sankhya ERP após o aceite.
   - **Feed da Sessão:** Histórico dos últimos itens cadastrados em tempo real no rodapé do modal.

---

## 🔐 4. Matriz de Permissões no Hub de Acessos

- `enderecamento`: Permissão mestre que habilita o módulo no menu lateral e no Hub.
- `enderecamento_visualizar`: Permite consultar mapa analítico de endereços e catálogo de produtos.
- `enderecamento_manipular`: Permite realizar movimentações, desendereçamentos e vínculos manuais.
- `enderecamento_cadastrar`: Permite acessar o botão de destaque e o Modo Coletor de Cadastro Rápido (`F2`).

---

## 🎨 5. Padrão Visual Universal de Endereços em Chips WMS (`EnderecoChips`)

1. **Estrutura de 4 Pílulas Visuais Coordenadas:**
   - Todo endereço físico WMS é decomposto e renderizado exclusivamente em 4 chips:
     `[ RUA 01 ]` `[ TORRE 01 ]` `[ NÍVEL 01 ]` `[ POS 01 ]`
   - **Rótulo:** Azul suave `#0284c7`, tamanho `10px`, negrito (`font-weight: 700`).
   - **Valor:** Escuro `#0f172a`, negrito (`font-weight: 900`), fonte monoespaçada (`JetBrains Mono`).
   - **Posição em Destaque:** O chip `POS` recebe borda azul `#3b82f6` e fundo verde suave `#f0fdf4` com rótulo verde `#16a34a`.
2. **Omissão da Máscara Numérica Crua:**
   - Proibido exibir a sequência numérica bruta (ex: `01.01.01.01.01`) ao lado dos chips, garantindo limpeza visual e foco ergonômico para os operadores.
3. **Chip de Ausência de Endereço:**
   - Produtos ou registros sem endereço ativo cadastrado no ERP exibem o chip estilizado:
     `[ ⚠️ Sem Endereço Cadastrado ]` com borda tracejada e cor de alerta suave.
4. **Escopo Obrigatório:**
   - Aplicado uniformemente em todas as telas, modais e relatórios de auditoria do módulo de Endereçamento WMS.

---

## 🖨️ 6. Central de Impressão de Etiquetas de Endereçamento WMS

1. **Formatos de Folha A4 Disponíveis:**
   - **4 por folha (A4 Paisagem ~14x10cm):** Formato padrão para longarinas médias com leitura nítida de leitor laser/câmera à distância.
   - **2 por folha (A4 Retrato ~20x14cm):** Meia folha grande para placas aéreas e visualização de empilhadeiras.
   - **8 por folha (A4 Retrato ~9x7cm):** Grade compacta 2x4 para prateleiras, gaveteiros e pequenos escaninhos.
2. **Códigos Suportados:**
   - Código de Barras linear (Code 128) formatado com a máscara do endereço.
   - QR Code com alta densidade de leitura.
   - Exibição simultânea de ambos os formatos na mesma etiqueta.
3. **Parametrização Visual:**
   - Seleção individual dos campos por checkboxes: Rua, Torre, Nível, Pos, Tipo (Picking/Pulmão), CODEND e Descrição.
4. **Mecânica de Seleção de Endereços:**
   - Checkboxes de seleção múltipla na lista analítica com toolbar de ações em lote.
   - Botão rápido individual `🖨️` por linha.
   - Seleção por Intervalo (De/Até de Rua, Torre e Nível) diretamente no modal.
   - Pré-visualização real da folha A4 com paginação antes do disparo para impressão.
