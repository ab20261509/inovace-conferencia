# Registro de Progresso e Entregas - Conferência de Entrada & Gestão de Recebimento

## Atualização: Prevenção de Múltiplos Desmembramentos, Trava de Concorrência e Stepper Visual

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário relatou que em um item desmembrado para N3 (NF #60766), o botão de desmembrar não forneceu feedback de conclusão e voltou a ficar disponível. Pensando que o processo não havia sido concluído, o usuário clicou mais duas vezes (totalizando 3 desmembramentos no Sankhya ERP).
  - O usuário solicitou uma solução definitiva para blindar o sistema contra reexecuções, travamentos silenciosos e falta de feedback no desmembramento.

- **Implementações Realizadas:**
  1. **Trava de Concorrência e Idempotência no Backend ([`ExecutarDesmembramentoItemUseCase.ts`](./backend/src/application/use-cases/recebimento/ExecutarDesmembramentoItemUseCase.ts)):**
     - Adicionada trava de concorrência em memória `processandoPorItem = new Set<string>()` chaveada por `${nunota}-${sequencia}`. Requisições concorrentes ou repetidas para o mesmo item enquanto o processamento estiver ativo são rejeitadas imediatamente (`400 - Desmembramento já em andamento`).
     - Isolamento resiliente pós-ERP: chamada de listagem global de divergências protegida com `try/catch` para que qualquer lentidão ou timeout pós-desmembramento não anule nem reverta o retorno de sucesso do `CACSP.desmembrarItem`.
  2. **Stepper Visual de 3 Etapas e Barra de Progresso Animada ([`ModalDesmembrarItem.tsx`](./frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx)):**
     - Etapa 1: `1. Desmembrando item no Sankhya ERP...` (35%)
     - Etapa 2: `2. Atualizando locais de estoque e ocorrências...` (75%)
     - Etapa 3: `3. Desmembramento concluído com sucesso!` (100% verde com ícone de celebração)
  3. **Fechamento Automático e Bloqueio Contra Reenvios:**
     - Ao concluir a Etapa 3, o modal aguarda 1,5s e fecha automaticamente, oferecendo também o botão imediato `✅ Concluir Agora`.
     - Enquanto o desmembramento estiver em processamento, todos os campos (lote, quantidade, datas, locais) e ações (adicionar linha, copiar datas, remover linha, fechar modal, cancelar e backdrop) são rigorosamente desabilitados.
  4. **Feedback de Erro Inline no Modal:**
     - Se o Sankhya recusar o desmembramento, a mensagem de erro é exibida de forma destacada em vermelho dentro do próprio modal (não oculta atrás do backdrop), permitindo ao gestor ajustar e tentar novamente.
  5. **Desacoplamento de Fechamento Prematuro ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) e [`AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx)):**
     - O fechamento do modal é delegado ao próprio `ModalDesmembrarItem` através de `onClose()`, garantindo que o usuário visualize a etapa de conclusão com sucesso antes do fechamento.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Recriação de Certificado SSL sob Demanda por Mudança de IP na Página de Instalação

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O IP do servidor na rede local mudou (ex: de `192.168.0.92` para `192.168.0.94`).
  - O usuário perguntou se era necessário recriar o certificado e se essa recriação poderia ser feita diretamente pela página do certificado (`/instalar.html`).
  - **Diagnóstico:**
    - O certificado raiz da Autoridade Certificadora (`rootCA.crt`) instalado nos tablets **NÃO muda e não precisa ser reinstalado**.
    - Apenas o certificado do servidor (`cert.pem`) precisa conter o novo IP nos Subject Alternative Names (SANs) para que o Chrome não aponte `NET::ERR_CERT_COMMON_NAME_INVALID`.
    - Já regeneramos o certificado incluindo `192.168.0.94` e mantendo `192.168.0.92`, `localhost`, `127.0.0.1` e `::1`.

- **Implementações Realizadas:**
  1. **Endpoints de Informação e Recriação no Vite ([`frontend/vite.config.ts`](./frontend/vite.config.ts)):**
     - Criado endpoint `GET /info-cert`: retorna todos os IPs de rede ativos da máquina e compara com os SANs registrados no certificado, informando se o IP atual já é válido.
     - Criado endpoint `POST /recriar-cert`: executa `mkcert` dinamicamente unindo os IPs de rede atuais + anteriores (`192.168.0.94`, `192.168.0.92`, `localhost`, etc.), atualiza os arquivos em `frontend/certs/` e aciona `server.restart()` para carregar as novas credenciais TLS em memória sem derrubar a aplicação.
  2. **Painel de Diagnóstico e Botão de Ação em Tempo Real ([`frontend/public/instalar.html`](./frontend/public/instalar.html)):**
     - Adicionado painel que detecta o IP acessado e exibe o status de validação (`✅ Registrado e Válido` ou `⚠️ IP Não Registrado`).
     - Adicionado botão interativo `🔄 Recriar Certificado para este IP` com feedback visual imediato de sucesso ou erro.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---


## Atualização: Botão de Acesso ao Certificado HTTPS no Menu Lateral (Drawer)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário solicitou a inclusão de um botão direto no sistema para acessar a página de download e instruções do certificado HTTPS (`/instalar.html`).
  - **Decisões Alinhadas via `/grill-me`:**
    1. *Localização:* No Menu Lateral de Navegação ([`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx)).
    2. *Público-alvo:* Disponível para todos os usuários operacionais (abaixo da seção Administração).
    3. *Comportamento:* Abertura em nova aba (`target="_blank" rel="noopener noreferrer"`).
    4. *Identificação:* Item com ícone `🛡️` e texto `Certificado HTTPS` acompanhado de ícone sutil de link externo.

- **Implementações Realizadas:**
  - Em [`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx):
    - Adicionada a seção `Ajuda & Segurança` contendo o item `🛡️ Certificado HTTPS` apontando para `/instalar.html`.
    - Ao clicar, abre imediatamente a página responsiva de instalação e download do `rootCA.crt` em uma nova aba do navegador.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---


## Atualização: Correção de "0 de 3 Bipados", Falsas Faltas e Quebra FIFO entre Itens Duplicados na Mesma Nota

- **Demandas do Usuário & Diagnóstico (`/grill-me`):**
  1. *Falsa Indicação de "Itens com Bipagem: 0 de 3" e Itens Pendentes:* Na NF `22130` com 3 itens (sendo 2 sequências de 60 UN do produto `10541 - KIT OTOLOG` e 1 sequência de 90 UN de outro item), o modal de finalizar nível apontava erroneamente `Itens com Bipagem: 0 de 3`, mesmo com 120 unidades de KIT OTOLOG já bipadas.
  2. *Causa Raiz Identificada:*
     - No **Modo Cego**, os campos `qtdneg` são omitidos (`null`), resultando em `dados.esperado === 0`. No frontend ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)), a condição `else if (dados.conferido >= dados.esperado && dados.esperado > 0)` nunca entrava, caindo num `else` que marcava todos os itens com bipagem como falta/pendente e zerando `itensConferidosOk`.
     - No backend ([`FinalizarNivelEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/FinalizarNivelEntradaUseCase.ts) e [`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)), quando o mesmo produto existe em múltiplas sequências da `TGFITE`, comparar sequências isoladas gerava falsa sobra em uma linha e falsa falta com "Zero bipagens" na outra linha.
  3. *Requisito Mandatório do Usuário:* *"O erro está em informar que o item não foi bipado, mas ele deveria ser bipado, pois foi 120 unidades 60 de cada um dos itens. Internamente precisa alimentar que ele foi bipado. O ideal aí é somar o total na conferência e fazer a quebra da quantidade para o gerente, mas para o conferente o que importa é apenas conferir e enviar para a gestão atuar. Lembrando que a quebra precisa existir para enviar os dados para ERP corretamente."*

- **Implementações Realizadas:**
  1. **Correção de Contagem e Estatísticas no Modo Cego ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Em `estatisticas` e `notasMap`, no Modo Cego (`isModoCego || dados.esperado === 0`), qualquer produto com contagem física registrada (`dados.conferido > 0`) é computado imediatamente como item atendido/bipado (`itensExatos++`, `notasMap[nunota].itensOk++`).
     - Alerta de "Zero bipagens" e checkbox de ciência de falta só são ativados para itens cujo produto realmente possui **zero bipagens** na nota.
     - O modal agora exibe com fidelidade: `Itens com Bipagem: 2 de 3` (e não mais `0 de 3`), e o contador do topo reflete `Tot: 3 • Conf: 2 • Pend: 1`.
  2. **Quebra e Distribuição FIFO em Consultas e Reconciliação ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - Ao obter itens da conferência, se um produto possuir múltiplas sequências na `TGFITE` para a mesma nota, o backend redistribui as contagens apuradas (N1, N2, N3) em cascata (FIFO): a Sequência 1 é atendida até sua `QTDNEG` (60), e a Sequência 3 recebe o saldo remanescente (60).
     - Ambos os registros têm suas quantidades conferidas e metadados de lote/validade atribuídos, garantindo integridade interna e para envio correto ao Sankhya ERP.
  3. **Reconciliação e Desempate por Produto no Fechamento de Nível ([`FinalizarNivelEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/FinalizarNivelEntradaUseCase.ts)):**
     - No encerramento de nível (N1, N2 ou N3), o caso de uso agrupa o esperado e o conferido por produto (`codprod`) dentro de cada nota antes de validar divergências.
     - As quantidades são quebradas via FIFO entre as sequências da TGFITE, eliminando falsas divergências e falsos alertas de "Zero bipagens" quando o total do produto atende a soma das frações faturadas.
     - As bipagens e metadados de lote de todas as sequências do produto são considerados na checagem de integridade fiscal.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` na pasta `frontend` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` na pasta `backend` compilado com sucesso (**exit code 0**).

---


- **Demandas do Usuário & Diagnóstico (`/grill-me`):**
  1. *Bloqueio na Bipagem Repetida do Mesmo Lote:* Ao bipar novamente o produto com lote `123`, o sistema barrou com divergência de datas porque a data de fabricação foi digitada como `21/09/2026` ao invés de `21/07/2026` (mês 09 vs mês 07). O conferente não deveria precisar redigitar validade e fabricação para um lote que já foi registrado nesta conferência.
  2. *Produtos Repetidos na Mesma Nota (TGFITE):* Na nota fiscal `22130`, o produto `10541 (KIT OTOLOG)` possuía 2 linhas/sequências faturadas (ex: 120 UN e 120 UN). Na conferência do conferente, apareciam 2 cards separados, gerando confusão e falsos alertas de *"1 produto não recebeu bipagem e será apontado como FALTA física"*. Para o conferente, o ideal é somar o total conferido daquele produto na nota em um card único, enquanto o backend faz a quebra em cascata (FIFO) entre as sequências para o envio correto ao Sankhya ERP, e a tela do gestor mantém as linhas fiscais originais individualizadas para auditoria.

- **Implementações Realizadas:**
  1. **Remoção de Bloqueio de Divergência de Lote no Conferente e Envio à Gestão ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Removida a mensagem bloqueante vermelha de divergência de lote da tela do conferente, permitindo que a bipagem seja registrada normalmente sem travar a esteira operacional.
     - As discordâncias de lote e datas são encaminhadas diretamente para a tela de **Gestão do Recebimento** como divergência, permitindo ao gestor auditar, destinar para um local de estoque específico (`CODLOCALORIG`) e tratar posteriormente em ocorrência.
  2. **Auto-Preenchimento Robusto ao Falar/Confirmar Lote por Voz ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - O auto-preenchimento ao confirmar o lote por voz foi corrigido e aprimorado: agora busca em múltiplas fontes (bipagens ativas, frações de `lotesConferidos` em qualquer linha do produto e lotes originais da `TGFITE`), garantindo que assim que o lote for confirmado no ditado, as datas de Validade e Fabricação sejam carregadas imediatamente no leitor.
  3. **Destaque Azul no Card do Produto, Priorização no Topo e Botão de Ordenador ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) e [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css)):**
     - Ao detectar um lote repetido para o produto, o card mobile (`.item-card-lote-repetido`) e a linha desktop (`.row-lote-repetido`) recebem imediatamente uma **borda azul destacada** (`border: 2px solid #3b82f6` e `box-shadow`) com o selo `🏷️ Lote Repetido`, facilitando a busca visual imediata.
     - O produto com lote repetido é **automaticamente movido para o topo da lista** (`itensOrdenados`), garantindo que o conferente localize o item de imediato.
     - Adicionado botão permanente `🏷️ Lote Repetido` na barra de ordenação rápida: permanece visível e desabilitado em modo normal, e se torna ativo com destaque azul quando um lote repetido for detectado.
     - **Remoção automática dos artifícios:** assim que a bipagem é registrada com sucesso (ou ao fechar o aviso / destravar datas), a borda azul é removida, a lista retorna à ordem original e o botão do ordenador volta ao estado desabilitado.
  2. **Auto-Preenchimento, Destaque Visual em Azul e Trava de Lote Conhecido ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) e [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css)):**
     - Criada a rotina `checarLoteExistente`: ao digitar ou ditar por voz um lote já registrado para o produto na conferência, as datas de `Validade` e `Fabricação` são carregadas automaticamente a partir da primeira bipagem.
     - Removida a frase *"🔒 Fixado do lote"* dos labels de Validade e Fabricação, mantendo o botão do microfone (🎤) sempre visível e ativo para permitir regravação via voz se necessário.
     - Aplicado estilo azul destacado nos campos e dados de Validade e Fabricação (`.input-data-autopreenchida`): fundo azul suave (`#eff6ff`), borda azul vibrante (`#3b82f6`) e texto em azul escuro negrito (`#1d4ed8`), protegendo contra digitações acidentais.
     - Adicionado popup/banner informativo: `ℹ️ Lote "X" já registrado para este produto. Validade (D) e Fabricação (D) carregadas automaticamente`, com botão `🔓 Destravar Datas` caso o operador queira forçar edição manual.
     - No fluxo de ditado por voz contínuo, se o lote informado já for conhecido, o modal de voz encerra a captura de datas e foca diretamente no botão `Conferir Produto`.
  2. **Distribuição em Cascata (FIFO) no Backend ([`RegistrarBipagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.ts)):**
     - Quando um produto possui múltiplas sequências na `TGFITE` da mesma nota, as bipagens são distribuídas em cascata (FIFO): a 1ª sequência é preenchida até o seu limite faturado (`rowQtdNeg`), e qualquer excedente transborda automaticamente para a próxima sequência. Se todas as sequências forem atendidas, o excesso é acumulado como sobra na última linha.
  3. **Consolidação em Card Único para o Conferente ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Criado o hook `itensConsolidados` que agrupa as sequências do mesmo produto na mesma nota (`nunota|codprod`).
     - O conferente passa a ver **apenas 1 card por produto** na lista de conferência (Desktop e Mobile), com a contagem total física e a lista unificada de frações de lote.
  4. **Correção de Falsa Falta e Falso Zero Bipagens ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - O cálculo de `estatisticas` e `notasMap` agora avalia o atendimento consolidado do produto na nota: se a contagem do produto atingiu a quantidade necessária das sequências, todas as linhas são computadas como OK. O alerta de *"X produto(s) não receberam nenhuma bipagem"* só é disparado se a contagem total de um produto for estritamente zero.
  5. **Integridade da Visão do Gestor:**
     - A tela de Gestão do Recebimento (`GestaoRecebimento.tsx` / `AbaDivergenciasView.tsx`) continua exibindo as linhas fiscais originais individualmente por sequência, alimentadas com as quantidades e lotes distribuídos pelo FIFO.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Desativação do Auto-Preenchimento por Clique no Card no Modo Cego (Tablet e Mobile)

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - O usuário identificou que no layout tablet/mobile da Conferência de Entrada, ao tocar/clicar em qualquer card de produto da lista, o sistema inseria automaticamente o código de barras (`17898393751773`) no campo de entrada do leitor.
  - **Causa Raiz:** No componente [`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx), a `div.item-card-mobile` possuía um evento `onClick` irrestrito que atribuía `item.codbarra || referencia || codprod` ao estado `codigo` e focava o input.
  - **Decisão Alinhada via `/grill-me`:** Desabilitar o clique quando estiver em **Modo Cego** (`isModoCego`), preservando o comportamento apenas para usuários com permissão/supervisão e evitando bipagens simuladas ou toques acidentais durante o scroll de contagem cega.

- **Implementações Realizadas:**
  - Em [`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx):
    * Criada a flag condicional `const podeSelecionar = !isSomenteLeitura && !isModoCego;`.
    * No evento `onClick` do card mobile: bloqueia a execução caso `!podeSelecionar`.
    * No estilo e acessibilidade do card: cursor alterado para `pointer` apenas quando `podeSelecionar` (mantendo `default` no Modo Cego), e atributo `title` omitido no Modo Cego.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Inclusão de 'Sobra Física' no Filtro 'Fora da Nota' na Aba de Ocorrências

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário questionou quais tipos de ocorrência compõem o status/filtro `🔄 Fora da Nota`, notando que a ocorrência de `➕ Sobra Física` estava registrada como ativa na lista geral (`Todas 1`, `Pendentes 1`), mas o contador de `Fora da Nota` exibia `0`.
  - Alinhado com o usuário: agrupar **Sobra Física** dentro do filtro `🔄 Fora da Nota` (consolidando Sobras, Produtos Trocados e Itens Não Identificados).

- **Implementações Realizadas:**
  - Em [`AbaOcorrenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaOcorrenciasView.tsx):
    * No filtro `ocorrenciasFiltradas`: `filtroChip === 'fora_nota'` agora aceita `PRODUTO_TROCADO`, `NAO_IDENTIFICADO` e `SOBRA`.
    * No cálculo de KPIs: o contador `kpis.foraNota` agora contabiliza ocorrências do tipo `SOBRA`.
    * Adicionado tooltip descritivo no botão chip `Fora da Nota`: *"Sobras físicas, produtos trocados e itens não identificados fora da nota"*.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Priorização de Ocorrência de Sobra em Itens com Múltiplos Lotes e Bloqueio de Desmembramento com Excesso

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - O usuário apontou um caso onde o item `KIT OTOLOG...` teve 121 UN conferidas para uma nota de 120 UN (+1 de Sobra) distribuídas em 3 lotes físicos (1 UN, 60 UN, 60 UN), mas a coluna `Diferença` exibia apenas `⚠️ 3 Lotes` e o botão `✂️ Desmembrar`, ocultando o botão de gerar ocorrência de sobra.
  - Regra de negócio confirmada: a ocorrência de sobra precisa ser resolvida **primeiro**; se o gestor tentar desmembrar antes de abater a sobra, o sistema deve alertar e impedir, pois o modal de desmembramento não executa rotina de sobra física e o Sankhya não aceita desmembrar quantidade maior que a nota faturada.

- **Implementações Realizadas:**
  1. **Coluna Diferença com Sobra Prioritária ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - Tanto no Desktop quanto no Mobile, quando `diferenca > 0`, o sistema agora exibe **sempre** o pill `+X (Sobra)` e o botão `📦 Gerar Ocorrência de Sobra`, mesmo que o item possua múltiplos lotes físicos.
     - Caso o item possua múltiplos lotes E sobra física simultânea, o botão `✂️ Desmembrar` passa a emitir um alerta educativo bloqueante informando que a sobra (+X) deve ser registrada e deduzida primeiro para igualar a contagem à nota fiscal antes do desmembramento.
  2. **Bloqueio Informativo no Modal de Desmembramento ([`ModalDesmembrarItem.tsx`](./frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx)):**
     - Adicionado card de aviso em vermelho (`diferencaBalanco < 0`) alertando expressamente que o Sankhya rejeita desmembramento com excesso físico e orientando o gestor a fechar o modal e gerar a ocorrência de sobra.
  3. **Seleção Inteligente de Lote Excedente no Modal de Sobra ([`ModalOcorrenciaSobra.tsx`](./frontend/src/presentation/components/Recebimento/ModalOcorrenciaSobra.tsx)):**
     - Ao abrir o modal de sobra para um item com múltiplos lotes apurados, o modal verifica automaticamente se alguma fração tem quantidade exatamente igual à sobra (ex: fração de 1 UN do lote `741852963`) e já a pré-seleciona com seu lote, validade e fabricação.
     - Adicionado painel com botões rápidos dos lotes apurados para preenchimento com 1 clique.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Alinhamento Horizontal dos Badges de Status e Ação de Divergência na Coluna Produto

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário identificou que o badge de aviso (`⚠️ Pendente de Decisão` / `⚠️ Aguardando Desmembramento`) e o botão de ação (`⚖️ Decidir Divergência` / `⚖️ Revisar Desempate`) estavam empilhados verticalmente um sobre o outro, ocupando espaço desnecessário.
  - Alinhado: manter ambos os elementos preservados (por suporte a múltiplos lotes e clareza de pendência fiscal), porém organizá-los **lado a lado (horizontalmente)**.

- **Implementações Realizadas:**
  - Em [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx):
    * Tanto na visualização Desktop (tabela) quanto na visualização Mobile (cards):
    * Envolvidos os badges de status (`⚠️ Pendente de Decisão`, `⚠️ Aguardando Desmembramento`, `🔍 Aguardando N3`, `✓ Decisão: N2`) e os botões de ação (`⚖️ Decidir Divergência`, `⚖️ Revisar Desempate`) em um container flex horizontal (`display: flex; flexWrap: wrap; alignItems: center; gap: 6px; marginTop: 4px;`).
    * Removidas as margens verticais individuais (`marginTop: 6px`) que forçavam quebra de linha.
    * Layout agora exibe harmoniosamente o badge de alerta e o botão de ação na mesma linha, reduzindo a altura das linhas da tabela e melhorando a densidade visual.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Exclusão e Tratamento de Ocorrências Vinculadas no Reinício da Conferência

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - Ao reiniciar uma conferência de entrada, as ocorrências vinculadas à conferência/nota não eram apagadas do banco de dados, permanecendo visíveis e ativas.
  - Alinhado com o usuário: exibir no modal de reinício a lista expressa e detalhada das ocorrências que serão afetadas (Tipo, Produto, Quantidade, Lote, Local), acompanhada de um checkbox (marcado por padrão) para excluir definitivamente do banco de dados SQLite.

- **Implementações Realizadas:**
  1. **Backend - Limpeza e Exclusão no Use Case ([`ReiniciarConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ReiniciarConferenciaEntradaUseCase.ts)):**
     - Adicionado o parâmetro `excluirOcorrencias?: boolean` em `ReiniciarConferenciaInput`.
     - Implementado o método `processarOcorrenciasVinculadas`: busca ocorrências vinculadas por `conferenciaId` (inclusive com split/prefixo) e por lista de `nunotas`.
     - Se `excluirOcorrencias === true` (padrão): chama `this.ocorrenciaRepo.remover(oc.id)`, deletando os registros da tabela `ocorrencias_conferencia_entrada`.
     - Se `excluirOcorrencias === false`: atualiza o status para `CANCELADO` com histórico do reinício.
     - Processamento disparado com precisão tanto no Cenário A (desmembramento de nota específica da conjunta) quanto no Cenário B (reinício da sessão inteira).
  2. **Backend - Controller ([`ConferenciaEntradaController.ts`](./backend/src/presentation/http/controllers/ConferenciaEntradaController.ts)):**
     - Rota POST `/api/recebimento/conferencia/:id/reiniciar` extrai `excluirOcorrencias` do corpo da requisição e repassa ao caso de uso.
  3. **Frontend - Integração API ([`RecebimentoApiService.ts`](./frontend/src/infrastructure/api/RecebimentoApiService.ts)):**
     - Atualizado o método `reiniciarConferencia` para enviar `excluirOcorrencias` no payload.
  4. **Frontend - Modal de Reinício Rico e Informativo ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - Ajustado o filtro `ocorrenciasReiniciar` para identificar as ocorrências vinculadas por conferência base e por notas da sessão.
     - No modal de confirmação de reinício, adicionada uma caixa visual detalhada listando todas as ocorrências ativas com Badge de Tipo (Sobra, Avaria, Vencido), Código e Nome do Produto, Quantidade, Lote, Validade e Local ERP.
     - Adicionado o controle em checkbox: *"Apagar definitivamente estas ocorrências do sistema (remover do banco de dados)"*, selecionado por padrão.
     - Feedback e repasse do parâmetro para a API na confirmação da ação.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Rastreabilidade de Ocorrências nas Abas de Gestão, Preservação de Decisões e Cancelamento de Notas Excluídas

- **Demanda do Usuário & Diagnóstico:**
  1. Ao registrar uma ocorrência de sobra na tela de divergências, a tela sofria um recarregamento destrutivo (`setLoading(true)` unmount) que limpava as decisões gerenciais locais já tomadas pelo usuário para outros produtos da nota.
  2. Não havia nenhuma indicação visual no card da nota fiscal nem na linha dos produtos informando que a nota gerou ocorrência e qual ocorrência foi lançada (ex: sobra, avaria, local de destino).
  3. Quando uma nota fiscal era excluída no Sankhya e relançada com novo NUNOTA, a conferência antiga deixava de existir, mas a ocorrência antiga permanecia no banco local como `PENDENTE`, gerando registros órfãos.

- **Implementações Realizadas:**
  1. **Detecção e Cancelamento Automático de Ocorrências com Nota Excluída no Sankhya ([`ListarOcorrenciasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarOcorrenciasEntradaUseCase.ts)):**
     - O caso de uso agora cruza em lote todos os NUNOTAs das ocorrências com a `TGFCAB` no Sankhya ERP.
     - Quando um NUNOTA não é encontrado no ERP (nota foi excluída no Sankhya), a ocorrência pendente é automaticamente marcada como `CANCELADO` com o motivo `[Nota fiscal excluída no ERP (Sankhya)]`.
     - Na aba de ocorrências ([`AbaOcorrenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaOcorrenciasView.tsx)), ocorrências de notas excluídas recebem o badge de destaque: `⚠️ Nota Excluída no ERP`, e deixam de poluir a contagem de pendências operacionais ativas.
  2. **Preservação de Decisões Locais com Atualização Silenciosa ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - Criada a função `carregarDadosSilencioso`, que atualiza os estados de conferências, divergências e ocorrências em segundo plano sem chamar `setLoading(true)`.
     - Ao registrar ocorrência de sobra, a tela não é mais desmontada, preservando integralmente o estado `decisoesFiscaisPorGrupo` e as decisões já feitas pelo usuário.
  3. **Visualização de Ocorrências nas Abas Divergências e Conferências ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx), [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx) e [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx)):**
     - Passado o estado `ocorrencias` para ambas as abas.
     - No cabeçalho de cada card de nota: exibido o badge `⚠️ {total} Ocorrência(s)`.
     - Na linha de cada produto: exibido o badge elegante com o tipo da ocorrência, quantidade e local de estoque de destino (ex: `➕ Sobra Física: 1 UN (Local 210)`).

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Remoção de Tooltip Redundante no Campo Local ERP (Modal Desmembrar Item)

- **Demanda do Usuário:**
  - Remover a mensagem de dica/tooltip que aparecia ao passar o mouse sobre o campo e coluna `Local ERP` no modal de desmembramento.
- **Implementações Realizadas:**
  - Em [`ModalDesmembrarItem.tsx`](./frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx):
    * Removido o atributo `title` do `<input>` de Local ERP (que exibia a mensagem `"Local de estoque de destino no Sankhya (ex: 99 para Avaria...)"`).
    * Removido o atributo `title` do cabeçalho de coluna `<th>Local ERP</th>`.
    * A identificação do local selecionado continua sendo exibida de forma limpa abaixo do campo quando um código é informado.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Padronização e Blindagem do Modo Cego na Conferência de Entrada (Sigilo Fiscal)

- **Diagnóstico da Divergência de Visualização entre Notas (NF 60766 vs NF 22130):**
  - **Causa Raiz Identificada:**
    * Na tela de conferência de entrada ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)), a alternância entre aba única (*"Produtos da Conferência"*) e duas abas (*"Itens Pendentes"* e *"Itens Conferidos"*), bem como os contadores do topo (*"Bipados"* vs *"Conf/Pend"*), estava condicionada **apenas à variável local `ocultarStatus`**.
    * A variável `ocultarStatus` iniciava como `false` por padrão. Nas rotas de inicialização de nova conferência e avanço de nível, o código não atualizava `ocultarStatus` a partir do retorno da API. Como consequência, para certas notas (como a NF 60766), a tela renderizava incorretamente a visão de supervisor com abas separadas e contadores `Conf/Pend`.
    * Além disso, a regra mandatória da especificação oficial ([`docs/regras/modo-cego-entrada.md`](./docs/regras/modo-cego-entrada.md)) define que o modo cego é absoluto e unificado:
      `const isModoCego = !verCamposSensiveis || isCega || ocultarStatus;`
    * Para conferentes operacionais (`!verCamposSensiveis === true`), a interface **NUNCA** pode exibir abas de pendentes/conferidos, nem a coluna `Esperado` ou dicas de `Status`.

- **Implementações Realizadas:**
  1. **Unificação da Flag `isModoCego` ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Declarada a regra mandatória: `const isModoCego = !verCamposSensiveis || isCega || ocultarStatus;`.
     - Garantida a atualização de `setOcultarStatus` em todas as rotas de carregamento (`inicializar`).
  2. **Garantia de Aba Única e Sigilo das Métricas:**
     - Topo de métricas: para conferentes no modo cego (`isModoCego === true`), renderiza estritamente os contadores **`Total`** e **`Bipados`** (ocultando `Conf` e `Pend`).
     - Abas de produtos: renderiza **exclusivamente uma aba única**: **`Produtos da Conferência`**, impedindo a separação entre pendentes e conferidos.
     - Bloqueada a renderização da Aba 2 (*Itens Conferidos*) em modo cego.
  3. **Ocultação Mandatória da Coluna Esperado e Status (Desktop e Mobile):**
     - Desktop: Ocultados os cabeçalhos `<th>` e células `<td>` da coluna **`Esperado`** (eliminando traços como `— (Cega)`).
     - Desktop: A coluna de status no modo cego é renomeada para **`Ações`**, exibindo estritamente os botões operacionais (`⚠️ Ocorrência` e `↺ Bip`) quando houver contagem registrada, sem nenhum badge de completude (`Parcial` / `Pendente` / `Conferido`).
     - Mobile: Ocultado o card metric `Esperado`, o chip de ordenação `Esp` e a tag de status.
     - Linhas da tabela: removida a classe `row-parcial` no modo cego.
  4. **Blindagem do Modal de Finalização:**
     - No encerramento da contagem pelo conferente cego, o modal não exibe pistas de sobra nem percentuais de acerto fiscal (`100% OK` / `Com Sobra`), exibindo apenas `Unidades Bipadas: {totalConferido}` e alerta neutro caso existam produtos com zero bipagens.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção de Carregamento de Itens para Notas com Status "Em Aberto" na Gestão de Recebimento

- **Diagnóstico da NF #221593 (Royal Canin - Em Aberto):**
  - **Causa Raiz Identificada:**
    * Ao clicar em "Ver Itens" em um card de nota no status `Em Aberto` (nota que veio do ERP e ainda não possui contagens/sessão iniciada no banco local), o frontend enviava a requisição para obter os itens da nota.
    * No use case backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)), quando o item não possui contagens físicas prévias, o fallback `bip = mapBipsDetalhadas[key]` não continha o objeto `dadosPorNivel` nem os mapas de lotes por nível (`lotesMapN1`, `lotesMapN2`, `lotesMapN3`).
    * Ao tentar acessar `bip.dadosPorNivel[nivelAdotado]`, ocorria uma exceção de runtime: `TypeError: Cannot read properties of undefined (reading '1')`, gerando erro 500 no endpoint.
    * No frontend, a resposta falhava silenciosamente e, como `detalhes` permanecia vazio, a tabela de itens simplesmente não renderizava nada, deixando o card em branco abaixo da barra de progresso.
    * Além disso, o ID da conferência temporária (`aberto_${nunota}`) era tratado incorretamente na chamada de API.

- **Implementações Realizadas:**
  1. **Blindagem e Fallback Completo no Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - O fallback de `bip` agora inicializa com todos os atributos obrigatórios: `{ n1: 0, n2: 0, n3: 0, dadosPorNivel: {}, lotesMapN1: {}, lotesMapN2: {}, lotesMapN3: {} }`.
     - Aplicado encadeamento opcional defensivo (`bip.dadosPorNivel?.[nivel]`) para garantir que notas em aberto sem bipagens carreguem os itens da TGFITE normalmente.
     - Ajustado o controller ([`ConferenciaEntradaController.ts`](./backend/src/presentation/http/controllers/ConferenciaEntradaController.ts)) para tratar IDs `aberto` ou `aberto_*` como consulta direta por `nunotas`.
  2. **Tratamento de Rota e Fallback Visual no Frontend ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx) e [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - `carregarDetalhesConferencia` mapeia IDs prefixados com `aberto_` para `'novo'`, garantindo busca limpa por `nunotas`.
     - `AbaConferenciasView.tsx` adiciona card de feedback e botão de recarregar caso haja qualquer instabilidade na consulta.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Limpeza e Simplificação Visual dos Dados Fiscais na Conferência Concluída

- **Demanda do Usuário & Alinhamento:**
  - Remoção dos textos redundantes que causavam poluição e quebras de linha indesejadas na tabela de itens concluídos:
    1. Removido o rótulo redundante `(ERP)` que acompanhava os números das colunas de contagem física (N1, N2, N3).
    2. Removidos os textos de quantidade e sufixos de integração da pill de Lote (ex: `(120 un)`, `(N3 Integrado)` e `(N2 Integrado)`).
  - A pill da coluna Lote passa a exibir estritamente o código do lote: **`🏷️ {lote}`**.
  - A indicação de decisão gerencial e envio ao Sankhya permanece centralizada e legível na tag dedicada do produto: `🎯 Decisão: N{nivel} Adotado • Integrado ao ERP`.

- **Implementações Realizadas:**
  1. **Ajuste na Tabela Desktop e Mobile ([`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - Colunas N1, N2, N3 renderizam o valor com badge verde limpo: `✓ {qtd}` (sem `(ERP)`).
     - Coluna Lote renderiza a pill limpa padrão: `🏷️ {lote}` (sem quantidades nem menção a níveis).
     - Mantida a gaveta de múltiplos lotes expansível estritamente para itens desmembrados (ex: Micodine com 2 lotes em N2).
  2. **Refinamento do CSS ([`GestaoRecebimento.css`](./frontend/src/presentation/pages/GestaoRecebimento.css)):**
     - Classe `.badge-nivel-adotado-erp` compactada e centralizada.
  3. **Atualização da Especificação Oficial:**
     - [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md) atualizado na Seção 5 refletindo a formatação limpa aprovada.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Destaque Visual do Nível Integrado ao ERP e Eliminação de Mistura de Lotes N2/N3 na Tabela de Conferências

- **Contexto & Diagnóstico da Nota #22130:**
  - **Validação do Registro das Escolhas:**
    * Foi confirmado diretamente no banco de dados SQLite (`confercheck.db`, tabela `conferencias_entrada`, coluna `decisoes_fiscais_json`) que as escolhas do gestor estão perfeitamente registradas:
      * **Item 10541 (Kit Otolog):** Nível escolhido = `N3`, Lote = `N3` (Lote `456789`, 120 UN), Validade = `N3`, Fab = `N3`.
      * **Item 10544 (Micodine):** Nível escolhido = `N2`, Lote = `N2` (Lotes `987` e `123`, 45 UN cada), Validade = `N2`, Fab = `N2`.
    * No envio ao Sankhya ERP ([`EnviarConferenciaSankhyaUseCase.ts`](./backend/src/application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.ts)), o backend filtrou e transmitiu exclusivamente as bipagens do nível escolhido.
  - **Falha Visual Identificada na Tabela de Conferências ([`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
    * No use case [`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts), as bipagens eram agrupadas em um único `lotesMap` global sem separar por nível.
    * Isso fazia com que o Kit Otolog juntasse o lote de N2 (`123`, 120 UN) com o lote de N3 (`456789`, 120 UN), abrindo uma gaveta de falso desmembramento de `2 lotes` com soma incorreta de `Total conferido: 240 UN`, além de não evidenciar visualmente qual nível foi enviado ao ERP.

- **Implementações Realizadas:**
  1. **Separação Estrita de Lotes por Nível no Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - O processamento de bipagens agora mantém `lotesMapN1`, `lotesMapN2` e `lotesMapN3` rigorosamente isolados (conforme Regra Mandatória 5).
     - Para cada item retornado, o backend consulta a decisão fiscal (`sessao.decisoesFiscais`) e popula `lotesConferidos` **estritamente com os lotes do nível que foi adotado**.
     - Como o N3 do Kit Otolog possui apenas 1 lote (`456789`), ele não é considerado com múltiplos lotes, eliminando a gaveta indevida e a falsa duplicação de quantidades.
  2. **Destaque Visual das Escolhas e Dados Integrados ao ERP ([`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx) e [`GestaoRecebimento.css`](./frontend/src/presentation/pages/GestaoRecebimento.css)):**
     - **Coluna de Quantidade (N1, N2 ou N3):** O nível adotado recebe o badge verde destacado `.badge-nivel-adotado-erp` com o texto `✓ {qtd} (ERP)`.
     - **Coluna Lote:** Exibe pill verde destacada com menção `(N{nivel} Integrado)`.
     - **Identificação do Produto:** Tag `.tag-decisao-adotada` adicionada abaixo da descrição: `🎯 Decisão: N{nivel} Adotado • Integrado ao ERP`.
     - **Gaveta de Frações de Lote:** Quando há múltiplos lotes legítimos dentro do mesmo nível adotado (ex: Micodine em N2), o cabeçalho explicita: `Frações de Lote Desmembradas (Nível {X} Integrado ao ERP)`.
  3. **Atualização da Especificação Mandatória:**
     - [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md) atualizado com as diretrizes da Seção 5 para exibição de conferências concluídas e integradas.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção do Filtro de Sigilo de Divergentes e Eliminação de Falsa Reconferência N3 para o Conferente

- **Causa Raiz Identificada:**
  - A permissão `conferencia_entrada_divergente` (visão para divergentes na gestão de acessos) estava devidamente inativa para conferentes operacionais.
  - Contudo, tanto no backend ([`ListarNotasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarNotasEntradaUseCase.ts)) quanto no frontend ([`Recebimento.tsx`](./frontend/src/presentation/pages/Recebimento.tsx)), a verificação `ehN3Recontagem` continha a expressão `n.nivelAtual === 3`.
  - Como a nota 22130 já havia concluído a bipagem do Nível 3 e retornado para o status `Divergente` sob tutela do gestor, seu `nivelAtual` permaneceu registrado como `3`.
  - Essa condição isolada fazia com que o sistema burlasse a restrição de acesso a divergentes, exibisse a nota na tela do conferente operacional e ainda rotulasse indevidamente seu badge como `"Divergente - Reconferência N3"`, reabrindo o card para conferência.

- **Implementações Realizadas:**
  1. **Restrição Estrita de Reconferência Ativa no Backend ([`ListarNotasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarNotasEntradaUseCase.ts)):**
     - O bypass para quem tem permissão N3 agora exige estritamente status ativo de fila/andamento de reconferência (`['Aguardando N3', 'N3 em Andamento', 'Aguardando Recontagem N3', 'Recontagem N3 em Andamento'].includes(n.statusConferencia)`).
     - Notas com status `Divergente` são categoricamente ocultadas de qualquer usuário que não possua a permissão `conferencia_entrada_divergente`.
  2. **Alinhamento do Filtro e Remoção de Rótulo Falso no Frontend ([`Recebimento.tsx`](./frontend/src/presentation/pages/Recebimento.tsx)):**
     - Alinhada a condição `ehN3RecontagemAtiva` para que usuários sem permissão de divergente não vejam notas finalizadas em `Divergente`.
     - Removido o rótulo indevido `Divergente - Reconferência N3`. Para usuários autorizados (supervisores/gestores), a nota exibe seu status real de `Divergente`.
     - Atualizada a função auxiliar `classeStatusEntrada` removendo `nivel === 3` incondicional.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Diferenciação Visual Estrita (Pendente vs Decidido) e Modal de Decisão para Itens em N2 (`ModalDecidirDivergenciaN2`)

- **Contexto & Cenário Identificado:**
  - Em itens divergentes no Nível 2 (ex: Kit Otolog com Lote/Validade divergentes da NF), o dado conferido na tabela exibia um checkmark verde `✓` mesmo estando com o badge `⚠️ Pendente de Decisão`.
  - Além disso, para itens que ainda não foram para N3, a interface não oferecia um botão de ação rápida para decidir se acatava o N2 ou se enviava para N3.

- **Implementações Realizadas:**
  1. **Remoção do Checkmark `✓` Indevido nos Dados Pendentes ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - Enquanto o item estiver pendente de decisão gerencial (`isItemPendente`), os dados de Lote, Validade e Fabricação são exibidos no formato `Conf: {valor} (N2)` em **tom âmbar/alerta (`#b45309`) sem checkmark**.
     - O checkmark **`✓`** e a cor verde (`#047857`) são renderizados exclusivamente após a decisão ser formalmente tomada (`isItemDecidido`).
  2. **Criação do Modal de Decisão Gerencial N2 ([`ModalDecidirDivergenciaN2.tsx`](./frontend/src/presentation/components/Recebimento/ModalDecidirDivergenciaN2.tsx)):**
     - Botão **`⚖️ Decidir Divergência`** adicionado na linha de qualquer item pendente em N2 (na tabela desktop e no card mobile).
     - Ao clicar, exibe os dados faturados na NF (ERP) lado a lado com os dados apurados no coletor (N2) e oferece as duas opções estratégicas:
       * **`✓ Adotar Conferência N2`**: Acata os dados físicos do coletor, marca o item como decidido e conclui a pendência fiscal.
       * **`🔍 Enviar para Reconferência N3`**: Envia imediatamente o item selecionado para a contagem cega de desempate no coletor N3.
  3. **Atualização da Especificação Mandatória:**
     - [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md) atualizado com as regras de distinção visual e decisão em N2.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção de Marcação Indevida de "Aguardando N3" e Restauração da Soberania do Gestor

- **Causa Raiz Identificada:**
  - Após a conclusão da contagem física de N3 no coletor, a conferência voltava para `Divergente` e limpava a lista `itensRecontagem`.
  - No entanto, a função `verificarItemEmN3` em [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx) checava `sessaoOuGrupo.nivelAtual === 3` e aplicava um fallback automático (`temDivergenciaQtd = true`) caso ainda houvesse divergência de quantidade.
  - Isso fazia com que o produto continuasse marcado perpetuamente como `🔍 Aguardando N3`, desabilitava seu checkbox e exibia o box `Em N3: 1 item` no topo da nota mesmo após o N3 ter sido 100% finalizado.

- **Implementações Realizadas:**
  1. **Critério Estrito em [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx):**
     - O item só é considerado em N3 se **ambas as condições** forem atendidas:
       * A conferência deve estar ativamente em fila/andamento de reconferência (`['Aguardando N3', 'N3 em Andamento', 'Em Reconferência', 'Aguardando Recontagem N3', 'Recontagem N3 em Andamento'].includes(status)`). Se a conferência estiver em `Divergente`, `verificarItemEmN3` retorna `false`.
       * O produto deve constar expressamente na lista `itensRecontagem` enviada pelo gestor.
     - Eliminado o fallback que deduzia reconferência automática por divergência física de quantidade.
  2. **Ajuste no Resumo da Nota ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) e [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - O box métrico `Em N3` e a tag `({X} em N3)` só são exibidos enquanto a conferência estiver ativamente em andamento de reconferência N3, desaparecendo assim que o conferente finaliza a contagem no coletor.
  3. **Resultado Operacional:**
     - Ao concluir a conferência de N3 com divergência de quantidade, o produto exibe seu status real de decisão, seu checkbox fica liberado e o gestor retoma o controle pleno: pode adotar os dados, desmembrar, gerar ocorrência de sobra ou reenviar para uma nova contagem se desejar.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Simplificação das Colunas Fiscais na Tabela (Nota vs Conf), Modal de Revisão Físico (N1, N2, N3) e Grade de Desmembramento

- **Implementações Realizadas:**
  1. **Eliminação das Colunas N2/N3 Triplicadas em Lote, Validade e Fabricação ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - O cabeçalho da tabela desktop foi simplificado para 3 colunas padrão limpas: `LOTE`, `VALIDADE` e `FABRICAÇÃO`, reduzindo drasticamente o excesso de largura horizontal.
     - As colunas de Quantidade (`Qtd Nota`, `Qtd N1`, `Qtd N2`, `Qtd N3`) continuam visíveis dinamicamente conforme haja contagens registradas.
     - Cada coluna fiscal exibe a comparação direta **Nota vs Conferido**:
       * *Lote:* `Nota: {loteOriginal}` / `Conf: ✓ {loteAdotado} ({Nível})` (ou `✓ Múltiplos Lotes ({qtd}) ({Nível})`).
       * *Validade:* `Nota: {valOriginal}` / `Conf: ✓ {valAdotada} ({Nível})` (ou `✓ Múltiplas`).
       * *Fabricação:* `Nota: {fabOriginal}` / `Conf: ✓ {fabAdotada} ({Nível})` (ou `✓ Múltiplas`).
  2. **Revisão do Modal Comparativo ([`ModalRevisarDesempate.tsx`](./frontend/src/presentation/components/Recebimento/ModalRevisarDesempate.tsx)):**
     - **Faixa de Referência da Nota Fiscal (ERP):** Barra superior destacada informando os dados faturados na NF (`Quantidade`, `Lote`, `Validade` e `Fabricação`).
     - **3 Cards Comparativos Focados nas Contagens Físicas:**
       * **Card 1 - Conferência N1:** Ativo se houver contagem em N1; caso não haja, exibido em cinza com badge `Sem contagem N1` e desabilitado.
       * **Card 2 - Conferência N2:** Quantidade física, lote(s), validade, fabricação e conferente do N2.
       * **Card 3 - Reconferência N3:** Quantidade física, detalhamento de frações de lotes com datas e conferente do N3 (marcado como definitivo por padrão).
  3. **Grade de Desmembramento e Botão `✂️ Desmembrar` na Linha da Tabela:**
     - Quando o nível adotado tiver múltiplos lotes físicos (`lotesConferidos.length > 1`), a tabela aciona o badge `⚠️ Aguardando Desmembramento ({X} Lotes)`, habilita o botão `✂️ Desmembrar` e abre a grade com as frações e conferente.
     - Se o gestor adotar um nível com lote único, o desmembramento é dispensado automaticamente.
  4. **Suporte no Backend ([`EnviarConferenciaSankhyaUseCase.ts`](./backend/src/application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.ts)):**
     - Suporte a `nivelEscolhido: 1 | 2 | 3` e `'N1'` no envio ao ERP.
  5. **Atualização da Especificação Mandatória:**
     - [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md) atualizado com as novas diretrizes.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: N3 Definitivo por Padrão, Rótulo de Múltiplos Lotes na Tabela e Modal de Revisão do Desempate (`ModalRevisarDesempate`)

- **Contexto & Cenário Real:**
  - Em reconferências N3 onde o conferente apurou fisicamente múltiplos lotes para o mesmo produto (ex: Micodine Shampoo com 45 UN do Lote `789` e 45 UN do Lote `45678`), o sistema identificava corretamente a necessidade de desmembramento do N3.
  - No entanto, a célula desktop `LOTE N3` exibia apenas um dos lotes (ex: `✓ 45678`), gerando dúvidas sobre onde estava o outro lote e se o N3 deveria ser automático ou revisável via popup.

- **Implementações Realizadas:**
  1. **N3 Adotado por Padrão como Verdade Definitiva:**
     - Itens que passaram por reconferência N3 têm o pacote do N3 selecionado por padrão como desempate definitivo.
  2. **Exibição Inteligente de Múltiplos Lotes nas Células Comparativas Desktop:**
     - Quando o N3 (ou N2) possui mais de uma fração de lote apurada fisicamente:
       * Célula `LOTE`: exibe `✓ Múltiplos Lotes (X)` (onde X é o total de frações), em vez de truncar e exibir apenas um nome.
       * Células `VALIDADE` e `FABRICAÇÃO`: exibem `✓ Múltiplas`.
  3. **Criação do Modal de Revisão do Desempate ([`ModalRevisarDesempate.tsx`](./frontend/src/presentation/components/Recebimento/ModalRevisarDesempate.tsx)):**
     - Botão discreto e elegante **`⚖️ Revisar Desempate`** adicionado na linha de produtos que passaram por N3 (na tabela desktop e no card mobile).
     - Ao clicar, abre um popup comparativo estruturado com 3 cards lado a lado:
       * **Nota Fiscal (ERP):** Quantidade esperada, lote e datas originais da nota.
       * **Nível 2 (Conferência Inicial):** Quantidade física, nome do conferente e frações bipadas na 1ª contagem.
       * **Nível 3 (Reconferência / Desempate):** Quantidade física, conferente e todas as frações de lote/datas apuradas.
     - Permite ao gestor alternar entre N3, N2 ou ERP de forma assistida e clara, recalculando o desmembramento e gravando a decisão ao clicar em *"Confirmar Decisão"*.
  4. **Documentação e Atualização de Regras:**
     - Atualizada a especificação imutável em [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md) com as seções 3.1, 3.2 e 3.3.
     - Preservado o isolamento da Conferência de Saída e validação de build estrita.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Desempate de Conferência (N2 vs N3 vs ERP), Isolamento de Lotes e Eliminação do Falso Desmembramento

- **Diagnóstico & Causa Raiz:**
  1. **Fusão Indevida de Bipagens de Níveis Concorrentes:**
     - Ao finalizar a conferência N3 com dados diferentes do N2 (ex: Lote 123 no N3 vs Lote 1234 no N2 para o produto Micodine Shampoo), o backend agrupava todas as bipagens de N2 e N3 no mesmo mapa (`lotesMap`).
     - O sistema interpretava que o conferente havia bipado 2 lotes diferentes na mesma carga (90 + 90 = 180 UN), gerando um **falso aviso de "Aguardando Desmembramento (2 Lotes)"** e bloqueando a resolução da divergência.
  2. **Ausência de Mecanismo de Arbitragem/Desempate na Gestão:**
     - A interface oferecia apenas as opções `ERP` vs `BIP (Coletor)`, sem permitir que o gestor indicasse qual contagem física adotar: N2 ou N3.

- **Implementações Realizadas:**
  1. **Isolamento Estrito por Nível no Backend ([`ListarDivergenciasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarDivergenciasEntradaUseCase.ts)):**
     - Bipagens de N2 e N3 são armazenadas em mapas estritamente separados (`lotesMapN2` e `lotesMapN3`).
     - A propriedade `temMultiplosLotes` agora avalia exclusivamente se dentro do **mesmo nível ativo** o conferente bipou múltiplos lotes físicos.
     - Novos campos expostos na API: `loteN2`, `validadeN2`, `fabricacaoN2`, `lotesConferidosN2`, `loteN3`, `validadeN3`, `fabricacaoN3`, `lotesConferidosN3`.
  2. **Colunas Comparativas Dedicadas e Vinculação Integral ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - Quando houver N3 na nota (`grupo.totalN3 > 0`):
       - A tabela desktop exibe colunas comparativas dedicadas: `ERP` | `N2` | `N3` para Quantidade, Lote, Validade e Fabricação.
       - Cabeçalhos possuem botões rápidos em massa `⚡` para aplicar ERP, N2 ou N3 nos itens selecionados ou em todos.
       - O clique do gestor em qualquer célula do N3 adota integralmente o pacote daquele nível (Quantidade N3 + Lote N3 + Validade N3 + Fabricação N3), exibindo a badge `✓ {valor}`.
       - O falso aviso de desmembramento desaparece imediatamente ao adotar o nível com lote único.
       - Para itens não enviados para N3 (ex: Kit Otolog), a coluna N3 exibe traço `—` desabilitado e o N2 permanece ativo por padrão.
  3. **Envio Preciso ao Sankhya ERP ([`EnviarConferenciaSankhyaUseCase.ts`](./backend/src/application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.ts)):**
     - O backend respeita a decisão individual salva para cada produto (`nivelEscolhido === 3` -> bipagens do N3; `nivelEscolhido === 2` -> bipagens do N2; `lote === 'ERP'` -> mantém dados do ERP).
  4. **Documentação Oficial e Regra Mandatória:**
     - Especificação técnica completa criada em [`docs/regras/desempate-divergencias-n2-n3.md`](./docs/regras/desempate-divergencias-n2-n3.md).
     - Inclusão da Seção Mandatória Oficial 5 no [`GEMINI.md`](./GEMINI.md).
     - Atualização do checklist de regras críticas no [`AGENTS.md`](./AGENTS.md).

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Documentação Oficial e Regra Mandatória de Sigilo Fiscal (Modo Cego, Abas e Colunas)

- **Diagnóstico & Contexto:**
  1. **Exibição Indevida de Abas e Colunas para Usuários sem Permissão de Campos Sensíveis:**
     - Conferentes operacionais sem acesso a campos sensíveis (`!verCamposSensiveis` ou em contagem cega `isCega`) estavam visualizando as duas abas separadas (`Itens Pendentes` e `Itens Conferidos`) e os contadores `Conf` e `Pend`, além das colunas `Esperado` (`— (Cega)`) e `Status` (`—`).
     - A causa raiz no código foi o acoplamento exclusivo do chaveamento de abas à flag de banco `ocultarStatus`, sem considerar a condição combinada `isModoCego = !verCamposSensiveis || isCega || ocultarStatus`.
     - Isso feria o princípio fiscal da contagem cega: a migração de um item de pendente para conferido dava pistas da quantidade esperada da nota fiscal.

- **Entregas & Documentações Realizadas:**
  1. **Especificação Oficial Completa ([`docs/regras/modo-cego-entrada.md`](./docs/regras/modo-cego-entrada.md)):**
     - Princípio fundamental do sigilo fiscal e idoneidade da contagem cega.
     - Matriz de Papéis de Permissão (`podeVerCamposSensiveis`): Supervisor vs Conferente Operacional.
     - Regra condicional unificada do Modo Cego (`isModoCego = !verCamposSensiveis || isCega || ocultarStatus`).
     - Matriz visual comparativa: Modo Cego (Aba única `Produtos da Conferência`, 1 coluna de quantidade física `Conferido N{nivel}`, sem coluna Esperado e sem badges de Status) vs Modo Privilegiado.
     - Fluxo completo dos 3 Níveis (N1 Contagem Cega, N2 Lote/Validade e N3 Reconferência/Desempate) com diagrama de arquitetura em Mermaid.
     - Checklist de integridade arquitetural para aprovação de qualquer PR ou alteração futura.
  2. **Inclusão de Seção Mandatória Oficial no [`GEMINI.md`](./GEMINI.md):**
     - Seção `4. Regra Mandatória: Sigilo de Conferência de Entrada (Modo Cego, Abas e Colunas)` estabelecendo a imutabilidade da regra sem autorização explícita do operador humano.
  3. **Resumo Crítico em [`AGENTS.md`](./AGENTS.md):**
     - Item 4 adicionado ao checklist de regras críticas consultadas por todos os agentes.

---

## Atualização: Blindagem do Sigilo da Conferência Cega na Validação de Integridade de Lote/Validade

- **Diagnóstico & Causa Raiz:**
  1. **Quebra de Sigilo e Bloqueio Incorreto em Conferência Cega (N3):**
     - Na tela de conferência do coletor ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)), a validação de integridade de datas de lote (`bipagens.find`) não filtrava pelo nível ativo (`b.nivel === nivelAtual`).
     - Ao bipar um produto no Nível 3 (ex: Lote 123 do produto 8755), o sistema encontrou a bipagem realizada pelo conferente anterior no Nível 2 (que continha Fabricação 21/07/2026).
     - Quando o operador no N3 digitou a data do produto (21/07/2029), o sistema bloqueou a bipagem e exibiu a mensagem de erro expondo explicitamente o que o conferente do N2 havia digitado: `"⚠️ Divergência de Lote: O lote 123 já foi registrado para este produto com Validade 21/07/2029 e Fabricação 21/07/2026. No Sankhya, um mesmo lote não pode possuir datas diferentes..."`.
     - Isso violava o princípio do **sigilo absoluto da conferência cega**, além de impedir que o 3º conferente registrasse o que realmente constava na embalagem física quando o conferente anterior havia errado na digitação.

- **Implementações Realizadas:**
  1. **Isolamento Estrito por Nível no Frontend ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - A validação de integridade de lote agora pesquisa exclusivamente dentro do nível atual (`b.nivel === nivelAtual`).
     - O conferente de N2 ou N3 pode registrar livremente as datas vistas na caixa física sem ser barrado pelo que foi digitado em etapas anteriores.
     - A integridade continua garantida dentro do mesmo nível: se o mesmo conferente tentar registrar o lote "123" duas vezes com datas diferentes na mesma conferência N3, o aviso atuará corretamente.
  2. **Isolamento de Payload no Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - Quando a requisição parte do coletor (`input.origem === 'coletor'`), as bipagens retornadas no payload são estritamente filtradas para o nível ativo da sessão (`b.nivel === sessao.nivelAtual`), impedindo que dados e datas bipados por outros conferentes em níveis anteriores trafeguem para o dispositivo móvel.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Bloqueio de Recontagem/Reconferência "Em Andamento", Desabilitação de Itens já em Fila e Merge de Itens

- **Diagnóstico & Causa Raiz:**
  1. **Envio Permissivo Durante Recontagem em Andamento:**
     - Quando um conferente já estava ativamente bipando no coletor (status `N3 em Andamento`, `N2 em Andamento`, `Iniciado`, `Em Reconferência`), a gestão ainda permitia clicar nos botões `Reconferir (N3)` ou `Solicitar Recontagem` e submeter novas ações, anulando contagens e alterando status no banco de dados enquanto o coletor estava aberto.
  2. **Reenvio e Seleção Indevida de Itens que já estão em Recontagem:**
     - Itens que já haviam sido enviados para reconferência N3 continuavam com o checkbox habilitado para seleção, permitindo que o gestor marcasse e tentasse reenviar o mesmo produto que já estava na fila do coletor.
  3. **Sobrescrita da Fila de Recontagem ao Enviar Novos Itens:**
     - Ao enviar novos itens para uma conferência que já estava aguardando (ex: adicionar um 2º item enquanto a nota aguarda desempate), a lista de itens da recontagem era sobrescrita em vez de mesclada.

- **Implementações Realizadas:**
  1. **Bloqueio de Recontagem para Sessões "Em Andamento" ([`ResolverDivergenciaUseCase.ts`](./backend/src/application/use-cases/recebimento/ResolverDivergenciaUseCase.ts) & [`SolicitarRecontagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/SolicitarRecontagemEntradaUseCase.ts)):**
     - Tanto no backend quanto no frontend, apenas conferências com status **finalizado** (`Divergente`, `Conferido`) ou **aguardando** (`Aguardando Recontagem`, `Aguardando N2`, `Aguardando N3`, `Em Aberto`) podem receber solicitações de recontagem/desempate.
     - Se a conferência estiver "Em Andamento" (`N3 em Andamento`, `N2 em Andamento`, `Iniciado`, etc.), o backend rejeita com erro HTTP 400 informando o conferente ativo.
  2. **Feedback Visual com Modal de Bloqueio Amigável ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - O botão permanece clicável, mas ao clicar para recontar/reconferir uma nota que está em andamento, abre um modal de aviso informativo em destaque:
       `"⚠️ Ação bloqueada: o conferente [Nome] já iniciou a contagem desta conferência da Nota Fiscal #[numnota]. Só é permitido solicitar recontagem ou reconferência quando a conferência estiver finalizada ou aguardando."`
  3. **Desabilitação do Checkbox de Itens já em Recontagem ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) & [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - Nas tabelas desktop e cards mobile, o checkbox dos produtos que já estão em fila (`verificarItemEmN3`) fica desabilitado (`disabled={estaEmN3}`) com tooltip explicativo: `"Este produto já está em fila de recontagem/desempate."`
     - O checkbox "Selecionar Todos" do cabeçalho seleciona estritamente os produtos elegíveis (que ainda não foram enviados para recontagem).
  4. **Fusão (Merge) Inteligente de Novos Itens ([`ResolverDivergenciaUseCase.ts`](./backend/src/application/use-cases/recebimento/ResolverDivergenciaUseCase.ts) & [`SolicitarRecontagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/SolicitarRecontagemEntradaUseCase.ts)):**
     - Ao enviar produtos adicionais enquanto a conferência está no status `Aguardando`, o backend funde os novos itens com os já existentes na lista `itensRecontagem`, anulando as bipagens do nível correspondente exclusivamente para os novos produtos adicionados.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Padronização Visual das Cores de Status e Correção da Contagem e Marcação de Itens em N3

- **Diagnóstico & Causa Raiz:**
  1. **Divergência de Cores no Status "AGUARDANDO N3" entre Abas:**
     - Na aba Conferências, o helper `getStatusBadgeClass` gerava a classe `reconferencia` (âmbar/amarelo) ou a classe `n3-desempate` não estava estilizada no CSS. Na aba Divergências, havia um ternário inline que atribuía a classe `aguardando` (azul/índigo). Com isso, uma tela exibia o status em amarelo e a outra em azul.
  2. **Contagem e Marcação Incorreta de Itens em N3 na Gestão:**
     - Quando apenas 1 item era enviado para N3, a expressão `estaEmN3` nas abas Conferências e Divergências possuía um fallback permissivo `(!itensRecontagem || itensRecontagem.length === 0)` que marcava **todos os itens da conferência** com o badge `🔍 Aguardando N3`, inclusive produtos cuja quantidade já estava 100% batida e apenas divergiam por lote/validade fiscal (como o Kit Otolog).
     - No cabeçalho e métricas dos cards, a gestão exibia a totalidade dos itens divergentes da nota sem explicitar quantos itens realmente estavam em reconferência de desempate N3.

- **Implementações Realizadas:**
  1. **Padronização Visual da Paleta de Cores ([`GestaoRecebimento.css`](./frontend/src/presentation/pages/GestaoRecebimento.css) & [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx)):**
     - O status `AGUARDANDO N3`, `N3 em Andamento` e etapas de reconferência N3 foram padronizados de forma unificada na classe `.badge-status-rec.n3-desempate` / `.badge-status-rec.aguardando` em tom **Azul / Índigo** (`background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe;`), distinguindo claramente de divergências pendentes (vermelho) e recontagens N2 (amarelo âmbar).
     - Em `AbaDivergenciasView.tsx`, o ternário manual foi substituído por `getStatusBadgeClass(grupo.status)`, garantindo paridade total entre a aba Conferências e Divergências.
  2. **Função Centralizada `verificarItemEmN3` ([`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx)):**
     - Criada a função pura `verificarItemEmN3` que valida com precisão se o item específico faz parte de `itensRecontagem` (utilizando coerção numérica de `codprod`, `sequencia` e `nunota`).
     - Caso `itensRecontagem` não esteja definido, apenas produtos com divergência física real de quantidade (`diferenca !== 0`) recebem o status N3. Produtos com quantidade batida (como Kit Otolog com 120/120) preservam seu status fiscal real (`⚠️ Pendente de Decisão`).
  3. **Atualização das Tabelas e Métricas dos Cards ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) & [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - Na aba Divergências, adicionada a mini-métrica `Em N3: X item(ns)` no card indicando com precisão a quantidade enviada ao 3º conferente.
     - Na aba Conferências, o resumo de SKUs exibe o detalhamento: `SKUs: 2 produtos (1 em N3)`.
     - Tanto nas tabelas desktop quanto nos cards mobile de ambas as abas, apenas o item enviado (`Micodine Shampoo`) exibe o badge `🔍 Aguardando N3`.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Popup com Confirmação de Produtos para N3, Tag "Aguardando N3" e Sincronização de Status entre Abas

- **Diagnóstico & Causa Raiz:**
  1. **Inconsistência de Status entre Aba Conferências e Aba Divergências:**
     - Ao solicitar reconferência N3 através da aba Divergências (`ResolverDivergenciaUseCase.ts`), o sistema atualizava `sessao.statusPorNota[nunota] = 'Aguardando N3'`, mas mantinha `sessao.status = 'Divergente'` hardcoded. Na aba de Divergências o status era lido de `statusPorNota` exibindo `AGUARDANDO N3`, enquanto na aba Conferências para notas únicas era lido `sessao.status` exibindo `DIVERGENTE`.
  2. **Ausência de Confirmação Detalhada de Produtos para N3:**
     - Ao clicar no botão `🔍 Reconferir (N3)`, o popup abria sem exibir a lista dos produtos selecionados que seriam enviados ao coletor, e não exigia seleção explícita por checkbox.
  3. **Falta de Sinalização Visual dos Produtos em N3:**
     - Nas tabelas das abas Conferências e Divergências, os produtos enviados para N3 não possuíam sinalização indicando que estavam aguardando o 3º conferente, mantendo a tag genérica `⚠️ Pendente de Decisão`.

- **Implementações Realizadas:**
  1. **Sincronização Total do Status da Conferência ([`ResolverDivergenciaUseCase.ts`](./backend/src/application/use-cases/recebimento/ResolverDivergenciaUseCase.ts) & [`ListarTodasConferenciasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarTodasConferenciasEntradaUseCase.ts)):**
     - Em `ResolverDivergenciaUseCase`, ao acionar `RECONFERIR_N3`, `sessao.status` é devidamente atualizado para `'Aguardando N3'` (junto com `statusPorNota`).
     - Em `ListarTodasConferenciasEntradaUseCase`, o status do card é sincronizado com `statusPorNota` da nota fiscal, garantindo que ambas as abas (Conferências e Divergências) exibam o mesmo status **`AGUARDANDO N3`**.
  2. **Seleção Estrita e Popup com Tabela de Produtos no Envio ao N3 ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) & [`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - O botão `🔍 Reconferir (N3)` agora valida a seleção via checkbox: exige que o gestor marque os produtos que deseja enviar.
     - O popup exibe uma tabela completa contendo: Produto (código, descrição, referência), Quantidade Esperada, Quantidade Bipada N2 e Diferença (Falta/Sobra colorida), além de um aviso explicativo de que apenas estes itens ficarão disponíveis no coletor.
     - Suporte a envio parcial para N3 integrado à rota e use case backend (`anularBipagensPorItens` e `itensRecontagem`).
  3. **Badge "🔍 Aguardando N3" nos Itens ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) & [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - Na aba Divergências (Desktop e Mobile), os produtos enviados para N3 agora exibem em destaque o badge azul `🔍 Aguardando N3` no lugar de `⚠️ Pendente de Decisão`.
     - Na aba Conferências (Desktop e Mobile), o mesmo badge `🔍 Aguardando N3` é renderizado abaixo dos dados do produto para sinalizar visualmente que o item está em fila de desempate.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ajuste do Nível 3 no Modal de Recontagem e Blindagem do Filtro de Recontagem Seletiva no Coletor

- **Diagnóstico & Causa Raiz:**
  1. **Bloqueio Incondicional do Nível 3 no Modal de Recontagem:**
     - O rádio do Nível 3 (N3) estava desabilitado por `disabled={itensRecontagemModal.length > 0}` incondicionalmente no modal de recontagem ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)). Como a tela de conferências exigia a marcação prévia de itens da tabela para habilitar o botão de recontagem, o usuário ficava impossibilitado de escolher N3 mesmo que selecionasse todos os itens da conferência.
  2. **Exibição Incorreta de Itens no Coletor durante Recontagem Seletiva:**
     - Em [`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts), a condição `temRecontagemParcialNoColetor` comparava apenas os status `'Aguardando N2'` e `'N2 em Andamento'`. Ao solicitar recontagem seletiva pelo gestor, a sessão recebia os status `'Aguardando Recontagem N2'` ou `'Recontagem N2 em Andamento'`, fazendo com que o coletor não filtrasse os itens e exibisse toda a nota ao operador.
  3. **Ausência de Bloqueio de Bipagem de Itens Não Selecionados:**
     - Em [`RegistrarBipagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.ts), caso a conferência estivesse em recontagem seletiva (`sessao.itensRecontagem`), o backend não bloqueava se o operador bipasse um produto fora da seleção.

- **Implementações Realizadas:**
  1. **Liberação Inteligente do Nível 3 (N3) no Modal ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx) & [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
     - O botão de solicitação e o modal agora calculam `todosItensSelecionados`.
     - Se todos os itens da conferência estiverem selecionados (ou na recontagem geral da carga), o **Nível 3 (Desempate) é liberado**.
     - Se apenas uma parte dos itens for selecionada, o Nível 3 fica bloqueado e um **banner explicativo visual** é exibido no modal orientando o gestor de que o N3 só é permitido para desempate geral/todos os itens, devendo utilizar o Nível 2 para recontagens pontuais.
  2. **Filtro Estrito de Recontagem Seletiva no Coletor ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - O filtro de itens agora reconhece adequadamente os status de recontagem (`ehStatusRecontagemOuAndamento` contemplando `'Aguardando Recontagem N1/N2/N3'` e `'Recontagem N1/N2/N3 em Andamento'`).
     - Apenas os itens selecionados em `sessao.itensRecontagem` são retornados ao coletor.
     - As bipagens ativas exibidas na lista de conferidos também são filtradas para os itens selecionados.
  3. **Bloqueio de Bipagem no Backend ([`RegistrarBipagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.ts)):**
     - Caso o operador tente bipar um produto que não faz parte de `itensRecontagem`, o backend rejeita a bipagem com mensagem: `"O produto [...] não faz parte dos itens selecionados para esta recontagem seletiva."`
  4. **Identificação Visual no Coletor ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Quando em recontagem parcial, o cabeçalho do coletor exibe o badge em destaque: `🔁 RECONTAGEM SELETIVA N[X] (N ITENS)`.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Correção de Identificação de Código de Barras Alternativos e Remoção de Bloqueio por Campo Sensível (Entrada)

- **Diagnóstico & Causa Raiz:**
  - Ao bipar códigos de barras de itens da Nota Fiscal (ex: NF 22130), o sistema retornava o erro: `Código "..." não encontrado nos itens desta conferência`.
  - Foram identificadas duas causas raízes críticas:
    1. **Esvaziamento de Códigos pelo Backend (`ObterItensConferenciaEntradaUseCase.ts`):** O parâmetro de tela `ocultarCodBarra` (configurado como sensível no banco) estava zerando o array `codigosAlternativos = []` e `codbarra = ''` dos itens enviados ao coletor. Isso impedia que o leitor físico identificasse qualquer código bipado.
    2. **Busca Incompleta no Frontend (`ConferenciaEntradaPage.tsx`):** A busca local comparava apenas `it.codbarra === codLimpo`, ignorando o array `it.codigosAlternativos` (unidades alternativas, caixas, DUN-14, EANs adicionais), `it.refforn` e códigos com zeros à esquerda.
- **Implementações Realizadas:**
  1. **Preservação de Códigos de Barras para Bipagem no Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - O array `codigosAlternativos` e o `codbarra` não são mais esvaziados no backend, garantindo que o leitor no coletor sempre possua a base de códigos da carga para validação.
  2. **Validação Abrangente e Resiliente no Frontend ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Implementada a função helper `itemCorrespondeAoCodigo`, aplicada uniformemente em todos os pontos de validação da tela de entrada.
     - A comparação agora valida:
       - Código de barras principal (`codbarra`) e todos os códigos em `codigosAlternativos` (TGFVOA + TGFBAR).
       - Códigos com e sem zeros à esquerda (ex: GTIN-14 / DUN-14 com zero inicial).
       - `CODPROD`, `REFERENCIA` e `REFFORN` (referência do fornecedor).
  3. **Reforço de Matching no Backend ([`RegistrarBipagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.ts)):**
     - A consulta SQL de registro de bipagem foi aprimorada com `LTRIM(BAR.CODBARRA, '0')` e inclusão de `PRO.REFFORN`.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ocultação Estrita de Status nos Cards Mobile quando ocultarStatus for Ativo (Entrada)

- **Diagnóstico & Causa Raiz:**
  - Em conferências de entrada onde o usuário não possui permissão para visualizar o status dos itens (`ocultarStatus = true`), a tabela no Desktop ocultava corretamente o status exibindo o traço `—`. No entanto, na visualização mobile em cards (`item-card-mobile`), a tag amarela `Parcial` continuava sendo renderizada no cabeçalho do card devido à ausência da verificação `!ocultarStatus` no elemento `item-card-badge`.
- **Implementações Realizadas:**
  1. **Blindagem do Badge de Status Mobile ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - O container `.item-card-badge` agora é condicionado a `{!ocultarStatus && (...)}`.
     - Quando `ocultarStatus` estiver ativo, o card mobile oculta totalmente a tag de status (`Parcial` ou `Pendente`), garantindo consistência total com a tabela desktop e respeitando a política de conferência cega/permissão de status.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Rota de Download Forçado do Certificado SSL & Página de Instalação no Coletor

- **Diagnóstico & Contexto:**
  - Ao tentar acessar o arquivo do certificado raiz (`rootCA.crt`) pelo navegador no tablet ou desktop, o Chrome exibia o texto do certificado como texto puro (`-----BEGIN CERTIFICATE-----`) em vez de iniciar o download para a memória do dispositivo, impossibilitando a seleção do arquivo nas configurações de segurança do Android.
- **Implementações Realizadas:**
  1. **Serviço de Download com Headers de Anexo (`Content-Disposition: attachment`):**
     - Criado middleware no [`frontend/vite.config.ts`](./frontend/vite.config.ts) respondendo na rota `/download-ca` com cabeçalhos `Content-Type: application/x-x509-ca-cert` e `Content-Disposition: attachment; filename="rootCA.crt"`, forçando o Chrome a baixar o arquivo na hora.
     - Criada rota espelho no backend Express [`backend/src/presentation/http/routes/index.ts`](./backend/src/presentation/http/routes/index.ts) em `/api/download-ca` para servir o arquivo raiz diretamente aos dispositivos.
  2. **Página Visual de Instalação ([`frontend/public/instalar.html`](./frontend/public/instalar.html)):**
     - Página responsiva acessível em `https://192.168.0.92:5173/instalar.html` contendo botão de download direto e passo a passo ilustrado de como registrar a autoridade de certificação no Android.
  3. **Diagnóstico de Conexão por IP vs Localhost:**
     - Mapeada e documentada a razão pela qual o Chrome trata acessos por IP local (`192.168.0.92`) como não confiáveis e como a flag `chrome://flags/#unsafely-treat-insecure-origin-as-secure` pode ser utilizada como alternativa direta sem certificados.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Certificados SSL Confiáveis com mkcert (Eliminação do Aviso de Site Vulnerável)

- **Diagnóstico & Contexto:**
  - Após a ativação do HTTPS com o plugin `basicSsl`, os navegadores (Chrome no Android e Desktop) exibiam a tarja vermelha de *"Sua conexão não é particular"* / *"Site vulnerável"* (`NET::ERR_CERT_AUTHORITY_INVALID`) porque o certificado anterior era auto-assinado e não confiável.
- **Implementações Realizadas:**
  1. **Geração de Certificado Confiável via `mkcert`:**
     - Gerado certificado SSL oficial localmente para `localhost`, `127.0.0.1`, `192.168.0.92` e `::1` em [`frontend/certs/`](./frontend/certs/).
     - Configurado [`vite.config.ts`](./frontend/vite.config.ts) para carregar nativamente os certificados `cert.pem` e `key.pem` do `mkcert` em vez de chaves auto-assinadas descartáveis.
  2. **Disponibilização da Autoridade Certificadora (Root CA) para Android:**
     - O arquivo da Autoridade Certificadora foi disponibilizado em `frontend/public/rootCA.crt` para instalação rápida no coletor/tablet Android.
  3. **Segurança no Versionamento:**
     - Adicionada regra em [`.gitignore`](./.gitignore) para impedir que certificados e chaves privadas locais sejam versionados.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ditado por Voz para Validade e Fabricação com Fluxo Contínuo e Individual (Entrada)

- **Diagnóstico & Contexto:**
  - Estender o recurso de ditado por voz e transcrição fonética inteligente para os campos fiscais de **Validade** e **Fabricação** na tela de Conferência de Entrada.
  - Conforme alinhamento via `/grill-me`, o sistema agora suporta tanto a **sequência automática contínua** (Lote -> Validade -> Fabricação -> Foco em Conferir Produto) quanto o **acionamento individual sob demanda** clicando no microfone específico de qualquer campo.
- **Implementações Realizadas:**
  1. **Motor Fonético Especializado para Datas ([`reconhecimentoLote.ts`](./frontend/src/infrastructure/speech/reconhecimentoLote.ts)):**
     - Função `normalizarDataFalada` que transcreve datas faladas em português brasileiro:
       - Nomes de meses ("outubro", "dezembro", etc.) convertidos em numéricos.
       - Números falados ("quinze", "vinte e quatro", "dois mil e vinte e seis").
       - Exigência estrita de data completa (Dia, Mês e Ano), com alerta visual caso o dia não seja falado.
       - Validação de calendário real (limites de dias por mês, anos bissextos e faixas válidas).
  2. **Alertas Sonoros Customizados ([`alertas.ts`](./frontend/src/infrastructure/audio/alertas.ts)):**
     - Adicionada a função `tocarAlertaPedirCampo(campoNome, onProntoParaOuvir)` com bipes e vozes sintetizadas específicas:
       - *"Informe o lote"*
       - *"Informe a validade"*
       - *"Informe a fabricação"*
  3. **Modal Versátil Multi-Campo ([`ModalDitadoLote.tsx`](./frontend/src/presentation/components/Recebimento/ModalDitadoLote.tsx) e [`ModalDitadoLote.css`](./frontend/src/presentation/components/Recebimento/ModalDitadoLote.css)):**
     - Título dinâmico, instruções direcionadas e máscara `DD/MM/AAAA` no campo de ajuste manual para datas.
     - Validação na confirmação com feedback de erro em caso de datas incompletas ou inválidas.
  4. **Interface e Botões Compactos ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) e [`Botao.tsx`](./frontend/src/presentation/components/Botao/Botao.tsx)):**
     - Botões de microfone compactos redondos (`24px x 24px`, 🎤) nos labels de **`Validade *`** e **`Fabricação *`**, idênticos ao padrão aprovado de `Lote *`.
     - **Fluxo Sequencial:** Ao bipar produto com lote vazio no N2/N3, inicia a sequência contínua (Lote ➔ Validade ➔ Fabricação). Ao confirmar o último campo, o modal fecha, salva os 3 campos e foca o botão **Conferir Produto** para revisão antes do registro.
     - **Acionamento Individual:** Clicar no 🎤 de qualquer campo abre o modal daquele campo específico e avança o foco para o próximo.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Popup de Confirmação do Ditado de Lote & Redesenho do Botão de Microfone (Entrada)

- **Diagnóstico & Contexto:**
  - O operador necessitava de uma confirmação visual clara do lote ditado por voz, com oportunidade de revisar/ajustar manualmente ou refazer a fala antes de preencher o formulário.
  - O botão anterior de microfone estava posicionado sobre o campo de digitação de lote, dificultando a leitura e digitação do operador.
- **Implementações Realizadas:**
  1. **Modal de Confirmação de Ditado ([`ModalDitadoLote.tsx`](./frontend/src/presentation/components/Recebimento/ModalDitadoLote.tsx) e [`ModalDitadoLote.css`](./frontend/src/presentation/components/Recebimento/ModalDitadoLote.css)):**
     - Exibe feedback visual rico em tempo real com indicador pulsante de escuta (`🎙️ Ouvindo... Fale o lote agora`).
     - Transcrição do lote exibida em display monoespaçado de grande destaque.
     - Campo de ajuste fino manual em maiúsculas caso precise corrigir algum caractere.
     - Botão **"Falar Novamente"** (`Refazer`) para reiniciar a escuta de voz imediatamente.
     - Botão **"Confirmar"** com atalho no teclado (`Enter`) e **"Cancelar"** (`Esc`).
     - Ao confirmar, o lote é preenchido, o modal é fechado e o cursor avança automaticamente para o campo de **Validade**.
  2. **Redesenho do Botão de Microfone no Label ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx), [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css) e [`Campo.tsx`](./frontend/src/presentation/components/Campo/Campo.tsx)):**
     - O botão de microfone foi reposicionado no cabeçalho do campo, em formato circular compacto (`24px x 24px`), exatamente ao lado do asterisco de `Lote *`.
     - O campo de texto do lote agora tem largura e espaçamento normal, sem sobreposição de botões ou textos.
     - Animação pulsante vermelha (`.gravando`) ativa quando o microfone está escutando.
  3. **Avanço Automático de Foco:**
     - Adicionada referência `inputValidadeRef` para que, ao confirmar o lote ditado no popup, o foco seja transferido imediatamente para a data de **Validade**.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Suporte a HTTPS no Vite para Liberação de Microfone no Android

- **Diagnóstico & Contexto:**
  - O Google Chrome no Android bloqueia nativamente as APIs de mídia (`SpeechRecognition` e microfone) quando o acesso é feito por endereço IP em protocolo inseguro (`http://192.168.0.92:5173`).
  - Para permitir o funcionamento imediato do reconhecimento de voz em tablets e coletores na rede local, foi configurado HTTPS no servidor de desenvolvimento do Vite.
- **Implementações Realizadas:**
  1. **Plugin SSL do Vite ([`vite.config.ts`](./frontend/vite.config.ts) e [`package.json`](./frontend/package.json)):**
     - Instalado o pacote oficial `@vitejs/plugin-basic-ssl`.
     - Configurado `plugins: [react(), basicSsl()]`.
     - O frontend passa a ser servido em `https://192.168.0.92:5173/` com certificado SSL gerado automaticamente, mantendo o proxy reverso para a API em `http://localhost:3001`.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ditado de Lote por Voz com Transcrição Fonética Especializada (Entrada)

- **Diagnóstico & Contexto:**
  - No teclado nativo do Android / Google Speech, ao falar "um", o sistema escreve "UM" por extenso em vez do dígito `1`, além de criar espaços indesejados e não reconhecer sinais especiais de lote.
  - Conforme alinhamento via `/grill-me`, implementada solução nativa no Web App com processador fonético especializado para Lotes industriais:
    - Conversão automática de palavras numéricas em dígitos ("zero" -> 0, "um" -> 1, "dois" -> 2, "vinte e quatro" -> 24).
    - Conversão de pontuações e sinais falados ("ponto" -> `.`, "traço"/"hífen" -> `-`, "barra" -> `/`, "underline" -> `_`).
    - Letras em maiúsculas contínuas sem espaços (ex: "um dois três quatro cinco seis f k e f" -> `123456FKEF`).
    - Ao bipar o código de barras no N2 com lote em branco, o sistema emite som ("Informe o lote"), foca no campo Lote e ativa a escuta por voz automaticamente.
    - Mantém o foco no campo Lote após a transcrição para revisão visual do conferente.
- **Implementações Realizadas:**
  1. **Motor de Reconhecimento e Normalização ([`reconhecimentoLote.ts`](./frontend/src/infrastructure/speech/reconhecimentoLote.ts)):**
     - Função `normalizarLoteFalado` com tratamento de dezenas compostas ("vinte e quatro"), unidades, sinais falados ("ponto", "traço", etc.) e limpeza de ruídos.
     - Controlador `criarReconhecedorLote()` via Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) com `lang: 'pt-BR'`.
  2. **Alertas Sonoros ([`alertas.ts`](./frontend/src/infrastructure/audio/alertas.ts)):**
     - Adicionada a função `tocarAlertaPedirLote()` com sinal sonoro duplo e fala sintetizada *"Informe o lote"*.
  3. **Interface e Fluxo ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) e [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css)):**
     - Botão de microfone (🎤/🎙️) integrado no canto direito do input de Lote com animação pulsante (`.gravando`).
     - **Acionamento Manual e por Bipagem:** Tanto ao clicar manualmente no microfone quanto ao bipar o código com leitor físico (`Enter`), destrava o áudio do navegador, fala *"Informe o lote"* e, ao término da fala da assistente, aciona o microfone para escutar o conferente sem captar o eco do próprio dispositivo.
     - Callback de erro para exibir alertas visuais claros caso o navegador bloqueie o microfone por falta de permissão ou conexão HTTP/IP.
     - Foco mantido no Lote após o reconhecimento para validação do operador.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Correção ORA-01791 na Consulta de Unidades Alternativas (Entrada)

- **Diagnóstico & Causa Raiz:**
  - Ao carregar a tela de Conferência de Entrada, ocorria o erro: `ORA-01791: não é uma expressão de SELECT`.
  - No Oracle Database, ao utilizar `SELECT DISTINCT`, qualquer coluna informada no `ORDER BY` que contenha funções/apelidos (como `NVL(VOA.CODVOL, 'UN') AS CODVOL`) precisa ser referenciada por seu alias ou índice posicional (`ORDER BY 1, 2`), caso contrário o Oracle rejeita a execução.
  - Como a consulta falhou, a lista de itens não carregou (`0 TOTAL, 0 CONF, 0 PEND`).
  - Além disso, a sessão aberta no teste estava em **`N1: CONTAGEM CEGA`** (onde por regra fiscal de recebimento cego os campos de Lote, Validade e Fabricação não são exibidos, aparecendo exclusivamente a partir do **`N2: LOTE E VALIDADE`**).
- **Implementações Realizadas:**
  1. **Ajuste na Query SQL ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - Corrigida a cláusula de ordenação de `sqlVoa` para `ORDER BY 1, 2`, compatível com `SELECT DISTINCT` no Oracle.
     - Query testada e validada diretamente contra o banco Sankhya com retorno 100% íntegro.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Visualização de Unidades Alternativas e Multiplicadores no Volume (Entrada)

- **Diagnóstico & Contexto:**
  - Na tela de Conferência de Entrada (`ConferenciaEntradaPage.tsx`), na tabela de produtos, a coluna "VOLUME" exibia apenas a unidade padrão (ex: `SC`).
  - Conforme alinhamento via `/grill-me`, ao clicar sobre o volume de um produto que possui unidades alternativas cadastradas na `TGFVOA`, deve ser exibido um balão/popover flutuante contendo apenas a **Unidade** e o **Multiplicador** ativos (`ATIVO IS NULL OR ATIVO = 'S'`).
  - Itens sem unidades alternativas ativas permanecem sem interação e sem indicador para evitar poluição visual.
- **Implementações Realizadas:**
  1. **Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts) e [`ConferenciaEntrada.ts`](./backend/src/domain/entities/ConferenciaEntrada.ts)):**
     - Criada a interface `UnidadeAlternativaEntrada { codvol: string; quantidade: number }`.
     - Inclusa a query `sqlVoa` para buscar de forma paralela via `Promise.all` as unidades ativas da `TGFVOA` agrupadas por `CODPROD` e `CODVOL`.
     - Mapeado no objeto de retorno de cada item como `unidadesAlternativas: UnidadeAlternativaEntrada[]`.
  2. **Frontend ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) e [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css)):**
     - Atualizada a interface `ItemNotaEntrada` com `unidadesAlternativas?: UnidadeAlternativaEntrada[]`.
     - **Badge Clicável:** Para produtos com unidades alternativas, o volume é exibido como um botão estilizado com indicador `+N` (ex: `SC +1`), com hover e cursor pointer.
     - **Popover Flutuante:** Ao clicar no badge, abre um popover posicionado dinamicamente com título, código do produto, botão fechar (×), fechamento no backdrop/click outside e tecla `Esc`.
     - **Tabela de Dados Limpa:** Apresenta apenas as colunas solicitadas: `Unidade` (tag estilizada) e `Multiplicador` (`x N`).
     - Aplicado na tabela de itens pendentes, na tabela de itens conferidos e nos cards mobile responsivos.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Correção do Estado Ativo/Inativo do Botão Conferir na Saída

- **Diagnóstico & Contexto:**
  - O botão `Conferir` da barra de bipagem da Conferência de Saída permanecia com a cor acinzentada (`#7e8590`) mesmo após o operador digitar valores no campo de código de barras.
  - O comportamento correto e esperado:
    - **Inativo / Disabled (campo vazio):** Fundo cinza ardósia suave (`background: #7e8590`, `opacity: 0.65`).
    - **Ativo (com código digitado):** Fundo normal grafite/slate escuro (`background: #0f172a`), com hover (`#1e293b`).
- **Implementações Realizadas:**
  1. **Ajuste em [`ConferenciaProdutos.css`](./frontend/src/presentation/pages/ConferenciaProdutos.css):**
     - `.scanner-saida-btn-conferir`: Cor base configurada para a cor normal ativa (`#0f172a`), com hover `#1e293b`.
     - `.scanner-saida-btn-conferir:disabled`: Mantém a cor cinza ardósia suave (`#7e8590`) e `opacity: 0.65` quando o campo está vazio (`disabled={conferindo || !codBarra.trim()}`).
  2. **Atualização das Diretrizes ([`GEMINI.md`](./GEMINI.md) e [`AGENTS.md`](./AGENTS.md)):**
     - Especificação atualizada para detalhar os estados Ativo (`#0f172a`) e Inativo/Disabled (`#7e8590`).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Higienização de Mensagens de Erro do Sankhya para o Usuário Final

- **Diagnóstico & Contexto:**
  - Em erros de conferência ou validação de bipagem (ex: código não encontrado), as mensagens do sistema exibiam o prefixo técnico do serviço Sankhya entre colchetes, como:
    `[Sankhya ConferenciaSP.salvarItemConferido] Não foi encontrado produto com o código de barras: 11651`.
  - Essa notação técnica poluía a interface do operador e gerava confusão visual.
- **Implementações Realizadas:**
  1. **Utilitário de Limpeza no Frontend ([`erro.ts`](./frontend/src/presentation/utils/erro.ts)):**
     - Criada a função `limparMensagemErro(mensagem)` com regex `replace(/^\s*\[[^\]]*\]\s*/, '')`, que remove qualquer prefixo técnico entre colchetes do Sankhya.
     - Aplicado em [`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx) (no catch e na renderização do banner `error-message`).
     - Aplicado em [`useConferenciaAtiva.ts`](./frontend/src/application/hooks/useConferenciaAtiva.ts) para todos os disparos de erro de conferência, busca de produto, estorno e finalização.
  2. **Higienização Centralizada na Resposta da API do Backend ([`formatarErro.ts`](./backend/src/presentation/http/utils/formatarErro.ts)):**
     - Criado o helper `limparErroSankhya(error)` no backend.
     - Integrado em [`ConferenciasController.ts`](./backend/src/presentation/http/controllers/ConferenciasController.ts) e [`ConferenciaEntradaController.ts`](./backend/src/presentation/http/controllers/ConferenciaEntradaController.ts).
     - Todas as respostas de erro JSON retornadas para a interface já chegam sem o prefixo `[Sankhya NomeServico]`.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Correção de Bipagem por Referência na Conferência de Saída

- **Diagnóstico & Causa Raiz:**
  - Ao digitar o código `11596` na Conferência de Saída, a tela exibia o erro em banner vermelho: `Código "11596" não encontrado nos itens deste pedido.`.
  - O produto `11596` possui exatamente o valor `"11596"` cadastrado no campo `REFERENCIA` na `TGFPRO`.
  - A checagem que havia sido inserida no frontend (`ConferenciaProdutos.tsx`) avaliava localmente o array `itens`. Como o usuário logado estava com proteção de campos sensíveis ativa (`ocultarReferencia = true`), o backend omitia `item.referencia` como `null`.
  - Como resultado, o frontend não tinha acesso ao valor real da referência, julgava erroneamente que o código digitado era apenas `codProd` e bloqueava a requisição antes mesmo de consultar o Sankhya.
- **Implementações Realizadas:**
  1. **Remoção da Trava Prematura no Frontend ([`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx)):**
     - Eliminada a checagem local baseada em propriedades mascaradas/nulas do frontend. A validação de bipagem agora flui de forma segura para o backend.
  2. **Validação no Backend com Consulta Direta ao Banco ([`SalvarItemConferidoUseCase.ts`](./backend/src/application/use-cases/conferencias/operacao/SalvarItemConferidoUseCase.ts)):**
     - Injetado `IPermissoesRepository` no caso de uso e atualizado em [`container.ts`](./backend/src/container.ts).
     - Quando o usuário logado (`usuario: req.username` passado via [`ConferenciasController.ts`](./backend/src/presentation/http/controllers/ConferenciasController.ts)) não possui a permissão `bipar_por_codprod`:
       - O backend executa uma verificação SQL nos itens da nota (`TGFITE` + `TGFPRO` + `TGFBAR` / `TGFVOA`).
       - Se o código coincidir com `PRO.REFERENCIA` ou com qualquer código de barras (`BAR.CODBARRA`), ele é **liberado normalmente** (atendendo o caso do produto 11596 cuja referência é "11596").
       - Se o código for **exclusivamente `CODPROD`** (e não existir nem na referência e nem nos códigos de barras cadastrados), aí sim é bloqueado com mensagem clara: *"Permissão insuficiente: conferente não autorizado a conferir pelo código interno (CODPROD). Utilize o código de barras ou referência."*.
     - Usuários com a permissão `bipar_por_codprod` ativa (ou administradores) têm passe livre para bipar por qualquer campo.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Limpeza Automática dos Campos de Lote, Validade e Fabricação após Conferência

- **Diagnóstico & Contexto:**
  - Ao registrar a conferência física de um produto na tela de Conferência de Entrada (`handleBipar`), os campos `Lote`, `Validade` e `Fabricação` permaneciam preenchidos nos inputs, enquanto apenas o código de barras e a quantidade eram redefinidos.
  - Conforme alinhamento via `/grill-me`, os campos de Lote, Validade e Fabricação devem ser sempre limpos após cada conferência realizada com sucesso, evitando que o próximo produto bipado herde inadvertidamente os dados do lote anterior.
- **Implementações Realizadas:**
  1. **Reset Completo dos Inputs ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Em `handleBipar`, adicionadas as chamadas `setLote('')`, `setValidade('')` e `setFabricacao('')` junto com a limpeza de `setCodigo('')` e redefinição de quantidade `setQuantidade('1')`.
     - Foco é retornado automaticamente para o campo de código de barras para a próxima bipagem.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Bloqueio de Bipagem por CODPROD com Permissão Granular de Usuário (`bipar_por_codprod`)

- **Diagnóstico & Contexto:**
  - Identificada a necessidade de restringir a bipagem pelo código interno do produto (`CODPROD` da `TGFPRO`/`TGFITE`) para evitar que conferentes comuns digitem códigos manuais em vez de escanear a etiqueta física da embalagem.
  - Conforme alinhamento via `/grill-me`:
    - Permissão individual por usuário na tela de **Gestão de Acessos** (`bipar_por_codprod`).
    - Configurada como **Desativada (`false`) por padrão** para todos os usuários comuns (Opção 2).
    - Administradores nativos recebem a permissão ativada por padrão (`true`).
    - Quando desativada, a consulta na conferência **bloqueia estritamente a busca pelo `CODPROD`**, mantendo plenamente ativas as buscas por **Código de Barras (`TGFBAR`/`TGFVOA`)** e por **Referência (`TGFPRO.REFERENCIA`)**.
    - Se o conferente tentar digitar o código do produto sem permissão, o sistema segue o fluxo padrão de código não encontrado nos itens da carga.
- **Implementações Realizadas:**
  1. **Entidades e Repositório de Permissões ([`PermissaoUsuario.ts`](./backend/src/domain/entities/PermissaoUsuario.ts) e [`Auth.ts`](./frontend/src/domain/models/Auth.ts)):**
     - Adicionada a chave `bipar_por_codprod?: boolean` na interface `ModulosUsuario`.
     - `PERMISSOES_PADRAO_OPERADOR`: Definida como `bipar_por_codprod: false`.
     - `PERMISSOES_ADMINISTRADOR`: Definida como `bipar_por_codprod: true`.
  2. **Caso de Uso de Bipagem na Entrada ([`RegistrarBipagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.ts)):**
     - Injetado `IPermissoesRepository` no construtor e atualizado em [`container.ts`](./backend/src/container.ts).
     - Antes de montar a query SQL, verifica `permissoes.bipar_por_codprod` para o conferente da sessão (com fallback ativo `true` para administradores/supervisores).
     - Se `podeBiparPorCodprod === false`:
       - Condição da query busca em `(UPPER(PRO.REFERENCIA) = UPPER('${codigoLimpo}') OR UPPER(BAR.CODBARRA) = UPPER('${codigoLimpo}'))`.
       - Bloqueia exclusivamente a consulta em `PRO.CODPROD` na `TGFPRO`/`TGFITE`. Se digitado o código interno, o Sankhya retorna 0 linhas e dispara o erro padrão *"Código não encontrado nos itens desta carga"*.
     - Se `podeBiparPorCodprod === true`:
       - Executa a busca completa contemplando `BAR.CODBARRA`, `PRO.REFERENCIA` e `TO_CHAR(PRO.CODPROD) = '${codigoLimpo}'`.
  3. **Conferência de Saída ([`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx) e [`AuthContext.tsx`](./frontend/src/application/contexts/AuthContext.tsx)):**
     - No [`AuthContext.tsx`](./frontend/src/application/contexts/AuthContext.tsx), configurado que administradores nativos e usuários com permissão de gestão possuem `bipar_por_codprod` ativado por padrão (`true`), garantindo que o admin consiga bipar e conferir por `CODPROD` normalmente.
     - Operadores comuns têm a restrição ativa (`false` por padrão), sendo bloqueados apenas quando digitam o `CODPROD` sem que ele seja um código de barras ou referência cadastrada.
     - Exibição de mensagem clara de erro (`setError`) caso a validação local bloqueie a bipagem.
  4. **Tela de Gestão de Acessos ([`GestaoAcessos.tsx`](./frontend/src/presentation/pages/GestaoAcessos.tsx)):**
     - **Badge na Lista de Usuários:** Exibe a tag `🔢 CODPROD` para usuários autorizados a bipar por código interno.
     - **Toggle no Drawer do Usuário:** Switch dedicado *"Bipar por Código do Produto (CODPROD)"* com descrição detalhada sobre a restrição de leitor físico.
     - **Perfis Rápidos:** Integrado aos presets de Operador (`false`), Gestor (`false`) e Admin (`true`).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ordenação Interativa de Colunas na Conferência de Entrada (Desktop & Mobile)

- **Diagnóstico & Contexto:**
  - Na lista de produtos da conferência de entrada (exibida tanto na visualização padrão quanto na lista unificada de "Produtos da Conferência"), foi solicitada a inclusão de ordenação interativa nas colunas da tabela e nos cards mobile para facilitar a localização ágil de itens em cargas com muitos produtos.
  - Alinhamento realizado via `/grill-me`:
    - **Produto:** Alternância em ciclo: `Nome ▲ (A-Z)` ➔ `Nome ▼ (Z-A)` ➔ `Cód ▲ (1-9)` ➔ `Cód ▼ (9-1)` ➔ `Padrão`.
    - **Volume:** Alternância: `▲ (A-Z)` ➔ `▼ (Z-A)` ➔ `Padrão`.
    - **Esperado:** Alternância numérica: `▲ (Menor para Maior)` ➔ `▼ (Maior para Menor)` ➔ `Padrão`.
    - **Conferido N{nível}:** Alternância numérica: `▲ (Menor para Maior)` ➔ `▼ (Maior para Menor)` ➔ `Padrão`.
    - **Status:** Fixo (sem ordenação).
    - **Mobile / Tablet:** Cards mobile sincronizados com a ordenação ativa e barra compacta de chips de ordenação rápida no topo da lista.
- **Implementações Realizadas:**
  1. **Tipos e Estado de Ordenação ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Criado o tipo `TipoOrdenacaoEntrada` e estado `ordenacao` inicializado com `'padrao'` (ordem original da nota).
     - Implementados os handlers `handleAlternarOrdenacaoProduto`, `handleAlternarOrdenacaoVolume`, `handleAlternarOrdenacaoEsperado` e `handleAlternarOrdenacaoConferido`.
     - Criado `itensOrdenados` com `useMemo` implementando os comparadores para cada critério com desempate determinístico e `localeCompare` em `pt-BR`.
  2. **Cabeçalhos Interativos na Tabela Desktop ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Cabeçalhos `<th>` convertidos para interativos com `cursor: pointer`, classes de estado (`th-ordenavel`, `th-ordenado`), setas/badges informativos (`renderIndicadorProduto`, `renderIndicadorGeral`) e tooltips instrutivos.
  3. **Barra de Ordenação Rápida Mobile ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Adicionada barra com chips de ordenação rápida (`.mobile-sort-bar`) visível em telas menores (<= 1024px), permitindo ao operador em coletor/smartphone alternar os critérios ou limpar a ordenação (`✕ Limpar`) com 1 toque.
  4. **Estilização Dedicada ([`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css)):**
     - Estilos com feedback de hover, destaque azul sutil no cabeçalho ativo (`#0284c7`), badge e chips responsivos, mantendo isolamento total sem alterar seletores genéricos em `global.css`.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Restauração da Sub-Linha Gaveta de Lotes e Validades na Tabela de Conferência

- **Diagnóstico & Contexto:**
  - Com a unificação da lista de conferência para suporte a dados sensíveis (`status`), a visualização detalhada de lotes (implementada originalmente na aba de itens conferidos através do accordion `subrow-lotes-drawer`) não estava acessível na lista unificada / itens da conferência.
  - Conforme alinhamento via `/grill-me`, restauramos a sub-linha gaveta expansível de lotes para os itens com contagens físicas registradas.
- **Implementações Realizadas:**
  1. **Helper de Agrupamento de Lotes ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Criado `obterLotesDetalhesItem(item)` que agrupa dinamicamente as bipagens ativas por `Lote + Validade + Fabricação`, contabilizando frações, IDs de bipagens e o horário da última contagem.
  2. **Chip Interativo de Lotes (`🏷️ N Lotes ▲/▼`):**
     - Integrado na coluna de conferência (`Conferido N{nivel}`) sempre que o item possuir lotes registrados nas bipagens da sessão ativa.
  3. **Sub-Linha Gaveta Integrada (`.subrow-lotes-drawer`):**
     - Ao clicar no chip, abre a mini-tabela padronizada logo abaixo da linha principal do produto contendo colunas dedicadas:
       - 🏷️ **Lote:** Tag estilizada em fonte monoespaçada com identificação de avarias/vencidos.
       - 📦 **Quantidade:** Quantidade conferida daquele lote específico na unidade do produto.
       - 📅 **Data de Validade:** Data formatada no padrão brasileiro (`DD/MM/AAAA`).
       - 🏭 **Data de Fabricação:** Data formatada no padrão brasileiro (`DD/MM/AAAA`).
       - ✕ **Ação de Estorno Cirúrgico:** Botão `✕ Estornar` que anula exclusivamente os bips daquele lote específico sem perder as demais contagens.
  4. **Suporte Mobile:**
     - Cards mobile atualizados com o botão expansível de lotes registrados e visualização individual das frações com botão de estorno rápido.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Inclusão do "Status da Conferência" nos Dados Sensíveis e Visualização Cega Unificada

- **Diagnóstico & Contexto:**
  - Na tela de **Gestão de Acessos** (`Campos Sensíveis por Tela` $\rightarrow$ `Conferência de Entrada (Recebimento)`), haviam 5 campos configuráveis (`qtdNota`, `vlrUnit`, `codBarra`, `referencia`, `fornecedor`).
  - O status dos itens ("Parcial" ou "✓ Conferido") e a movimentação automática entre as abas "Itens Pendentes" e "Itens Conferidos" acabavam revelando indiretamente aos conferentes sem permissão especial a quantidade esperada da nota fiscal.
  - Foi solicitada e alinhada a inclusão do 6º card sensível (`status` / `Status da Conferência`), garantindo controle de confidencialidade institucional total durante a bipagem cega.
- **Implementações Realizadas:**
  1. **Catálogo de Campos Sensíveis ([`ConfiguracaoTela.ts`](./backend/src/domain/entities/ConfiguracaoTela.ts)):**
     - Adicionado o 6º campo para a tela `conferencia_entrada`:
       - `chave: 'status'`
       - `rotulo: 'Status da Conferência'`
       - `descricao: 'Status do item (Pendente, Parcial ou Conferido)'`
       - `sensivelPadrao: true`
     - Preenche o espaço vago na grade da tela de Gestão de Acessos, permitindo ao gestor ativar ou desativar a sensibilidade do status com persistência no banco SQLite/libSQL.
  2. **Caso de Uso Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - Consulta `deveOcultarCampo('conferencia_entrada', 'status', input.usuario)`.
     - Retorna a flag `ocultarStatus: boolean` e protege o booleano `conferidoCompleto` nos itens retornados caso o usuário não tenha permissão de ver dados sensíveis.
  3. **Interface e Model Frontend ([`ConferenciaEntrada.ts`](./frontend/src/domain/models/ConferenciaEntrada.ts)):**
     - Adicionada a propriedade opcional `ocultarStatus?: boolean` na interface `ObterItensConferenciaResponse`.
  4. **Comportamento Cego e Neutro no Coletor ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - **Coluna Status na Tabela:** Quando `ocultarStatus` estiver ativo, exibe sempre um traço neutro `—` (sem destacar se o item está parcial ou conferido).
     - **Cards do Topo (Métricas):** Quando `ocultarStatus` for ativo, substitui os contadores `CONF` e `PEND` pelo contador `BIPADOS` (unidades físicas contadas no nível) ao lado do `TOTAL` de itens, mantendo o botão de "Finalizar" ativo.
     - **Abas Unificadas:** Exibe uma aba única "Produtos da Conferência" com todos os itens, sem mover produtos prematuramente para abas separadas.
     - **Ações e Estorno Preservados:** Permite ao conferente estornar bipagens ou apontar ocorrências diretamente no item com contagem física registrada.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Evidenciação de Recontagem nos Status (Aguardando Recontagem N... e Recontagem N... em Andamento)

- **Diagnóstico & Contexto:**
  - Ao solicitar recontagem (seja N1, N2 ou N3) na Gestão de Recebimento, o status passava para "Aguardando N2" e, ao iniciar no coletor, ficava apenas como "N2 em Andamento".
  - Faltava evidenciar visualmente e por meio de status explícito que a conferência se tratava de uma recontagem, tanto para o gestor quanto para o conferente.
- **Implementações Realizadas:**
  1. **Novos Status Explícitos de Recontagem ([`ConferenciaEntrada.ts`](./backend/src/domain/entities/ConferenciaEntrada.ts) e [`ConferenciaEntrada.ts`](./frontend/src/domain/models/ConferenciaEntrada.ts)):**
     - Adicionados ao tipo `StatusConferenciaEntrada`:
       - `'Aguardando Recontagem N1'` / `'Recontagem N1 em Andamento'`
       - `'Aguardando Recontagem N2'` / `'Recontagem N2 em Andamento'`
       - `'Aguardando Recontagem N3'` / `'Recontagem N3 em Andamento'`
  2. **Transição Automática de Status no Backend:**
     - [`SolicitarRecontagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/SolicitarRecontagemEntradaUseCase.ts): Define o status como `'Aguardando Recontagem N1'`, `'Aguardando Recontagem N2'` ou `'Aguardando Recontagem N3'` conforme o nível selecionado pelo gestor.
     - [`IniciarConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/IniciarConferenciaEntradaUseCase.ts): Ao o conferente iniciar ou entrar na sessão aguardando recontagem, atualiza automaticamente para `'Recontagem N... em Andamento'`.
     - [`ListarNotasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarNotasEntradaUseCase.ts): Mapeia os novos status para os respectivos níveis e inclui os status de recontagem nos filtros de permissão e listagem de notas em andamento.
  3. **Evidenciação Visual na Lista de Notas ([`Recebimento.tsx`](./frontend/src/presentation/pages/Recebimento.tsx)):**
     - Badges de status agora exibem explicitamente `"Aguardando Recontagem N2"`, `"Recontagem N2 em Andamento"`, etc., com estilos e contadores perfeitamente integrados.
  4. **Evidenciação Visual no Coletor de Conferência ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - **Header da Conferência:** Badge destacado em âmbar vibrante: `🔁 RECONTAGEM N2: LOTE E VALIDADE` (ou N1/N3 correspondente).
     - **Topo Compacto (Scanner recolhido):** Tag de identificação `Recontagem N2`.
     - **Botão de Finalização:** Rótulo contextualizado `Finalizar Recontagem N2`.
  5. **Gestão de Recebimento ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx) e [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx)):**
     - Filtros rápidos de "Em Andamento" e "Recontagem" atualizados para contemplar os novos status de recontagem.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Remoção do Campo de Observação nos Modais de Ação da Gestão de Recebimento

- **Diagnóstico & Contexto:**
  - O campo de texto de observação opcional no modal de ações da tela de Gestão de Recebimento (utilizado em Solicitar Recontagem, Reconferência N3, Aprovação de Divergências, etc.) adicionava elementos visuais dispensáveis à operação do gestor.
  - Conforme alinhamento, o campo foi completamente removido dos modais de ação em favor de uma interface mais limpa e direta.
- **Implementações Realizadas:**
  1. **Remoção do Campo de Observação ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - O bloco contendo o rótulo e o `textarea` de observação foi removido do modal de ações.
     - As rotinas de confirmação de ação continuam funcionando perfeitamente, repassando valor vazio/padrão onde o backend espera o parâmetro opcionalmente.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ajuste do Modal de Reinício - Remoção do Campo Motivo e Alinhamento de Textos de Cancelamento

- **Diagnóstico & Contexto:**
  - No modal de reinício de conferência, a presença do campo de texto obrigatório de motivo trazia fricção desnecessária ao gestor em um fluxo já protegido pelo countdown de 3 segundos e pelo alerta visual.
  - Além disso, mensagens informavam que as contagens seriam "arquivadas em backup seguro" ou recuperáveis, o que gerava ambiguidade quanto à efetividade da exclusão/cancelamento dos dados da contagem física.
- **Implementações Realizadas:**
  1. **Remoção do Campo de Motivo ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - O campo `textarea` e o label de motivo foram condicionados para **não serem renderizados** quando `modalAcao.tipo === 'REINICIAR'`, mantendo o modal focado na confirmação protegida pelo contador regressivo de 3s.
     - Para outros fluxos (ex: solicitação de recontagem), o campo opcional de observação permanece disponível normalmente.
  2. **Remoção das Menções de Arquivamento/Backup para o Usuário:**
     - Descrições no modal e nas abas de Conferências e Divergências atualizadas: agora expressam com clareza que as contagens ativas serão canceladas e a conferência voltará para o Nível 2 / início.
     - Card vermelho de alerta crítico atualizado de *"Todas as contagens físicas registradas serão arquivadas..."* para *"Todas as contagens físicas registradas serão canceladas e a conferência voltará para o início"*.
     - Feedback pós-reinício ajustado para indicar o cancelamento das contagens sem menção a arquivamento.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Alerta de Exclusão de Ocorrências/Divergências e Contador de 3s no Reinício de Conferência

- **Diagnóstico & Contexto:**
  - O reinício de uma conferência é uma operação crítica que anula bipagens físicas e redefine a conferência para o início.
  - Para conferências com ocorrências ativas (avarias, vencidos, trocados) ou divergências pendentes, era necessário alertar expressamente o gestor sobre o cancelamento desses registros e prevenir cliques acidentais ou impulsivos.
- **Implementações Realizadas:**
  1. **Contador Regressivo de 3 Segundos ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - Ao abrir o modal de reinício (`modalAcao.tipo === 'REINICIAR'`), é disparada uma contagem decrescente de 3 segundos: `Confirmar Reinício (3s)` ➔ `(2s)` ➔ `(1s)` ➔ `Confirmar Reinício`.
     - O botão de confirmação permanece travado/desabilitado durante a contagem, impedindo confirmações precipitadas.
     - Botão estilizado em vermelho vibrante (`#dc2626`) indicando operação crítica de cancelamento.
  2. **Card Vermelho de Alerta Crítico no Modal:**
     - Identifica dinamicamente se a conferência/nota possui ocorrências ativas e/ou divergências fiscais pendentes.
     - Exibe card de destaque (`#fef2f2` com borda vermelha `#f87171` e ícone `⚠️`), detalhando:
       - Quantidade exata de ocorrências que serão marcadas como **CANCELADAS**.
       - Que as divergências fiscais pendentes serão desfeitas e zeradas.
       - Que todas as contagens ativas serão arquivadas em backup de segurança.
  3. **Cancelamento Auditado no Backend ([`ReiniciarConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ReiniciarConferenciaEntradaUseCase.ts)):**
     - O caso de uso agora injeta `IOcorrenciaConferenciaEntradaRepository` via [`container.ts`](./backend/src/container.ts).
     - Ao confirmar o reinício da conferência inteira ou desmembramento de nota, todas as ocorrências vinculadas são atualizadas para `status: 'CANCELADO'` com justificativa registrada para auditoria (`"Cancelada devido ao reinício da conferência pelo gestor"`).
     - Adicionado o status `'CANCELADO'` nos modelos de ocorrência do frontend e backend.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Textos Dinâmicos e Contextuais por Tipo de Ocorrência (Avaria, Vencido, Validade Próxima)

- **Diagnóstico & Contexto:**
  - Quando o conferente selecionava ocorrências como "Produto Vencido" ou "Validade Próxima", a pergunta de contabilização física e as mensagens de feedback ainda utilizavam termos fixos de avaria (*"Você já bipou esta unidade avariada?"*, *"apenas marcar avaria"*, *"A unidade foi marcada como avariada"*).
  - Além disso, os cards informativos superiores continham a frase fixa *"Esta quantidade será contabilizada na conferência física"*, entrando em conflito com a decisão do conferente ao selecionar *"Sim, já bipada"*.
- **Implementações Realizadas:**
  1. **Helper de Termos Dinâmicos ([`OcorrenciaRecebimento.ts`](./frontend/src/domain/models/OcorrenciaRecebimento.ts)):**
     - Criada a função `obterTermosOcorrencia` para fornecer os termos adaptados de cada tipo:
       - **AVARIA:** `nome: 'Avaria'`, `adjetivoUnidade: 'avariada'`, `termoAcao: 'avaria'`, `marcadaComo: 'avariada'`.
       - **VENCIDO:** `nome: 'Produto Vencido'`, `adjetivoUnidade: 'vencida'`, `termoAcao: 'produto vencido'`, `marcadaComo: 'vencida'`.
       - **VALIDADE_PROXIMA:** `nome: 'Validade Próxima'`, `adjetivoUnidade: 'com validade próxima'`, `termoAcao: 'validade próxima'`, `marcadaComo: 'com validade próxima'`.
  2. **Pergunta e Ações Dinâmicas no Modal ([`ModalRegistrarOcorrencia.tsx`](./frontend/src/presentation/components/Recebimento/ModalRegistrarOcorrencia.tsx)):**
     - A pergunta adapta o adjetivo do produto automaticamente: *"❓ Você já bipou esta unidade [vencida / com validade próxima / avariada] durante a conferência?"*.
     - O botão Sim reflete a ação exata: *"Já bipada (apenas marcar [produto vencido / validade próxima / avaria], não somar na contagem física)"*.
     - Removida a frase fixa sobre contabilização física dos cards superiores de Vencido, Validade Próxima e Avaria, mantendo essa definição exclusivamente na caixa da pergunta Sim/Não.
  3. **Feedback de Sucesso Preciso ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Feedback dinâmico após salvar: *"Ocorrência de PRODUTO VENCIDO registrada com sucesso! A unidade foi marcada como vencida sem alterar a contagem física."* (e similar para Validade Próxima e Avaria).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Detecção Inteligente de Lote e Pergunta de Contabilização na Inclusão de Ocorrências (Avaria / Vencido)

- **Diagnóstico & Contexto Operacional:**
  - No fluxo de recebimento físico, avarias frequentemente são percebidas apenas **após** a contagem/bipagem da peça na conferência.
  - Anteriormente, ao registrar uma ocorrência de Avaria, Vencido ou Validade Próxima a partir do coletor, o sistema somava automaticamente +1 (ou a quantidade informada) na conferência física via `bipar()`. Isso duplicava a contagem caso a unidade já tivesse sido bipada previamente, gerando falsas sobras.
- **Implementações Realizadas:**
  1. **Pergunta Direta com Opções [ Sim ] e [ Não ] ([`ModalRegistrarOcorrencia.tsx`](./frontend/src/presentation/components/Recebimento/ModalRegistrarOcorrencia.tsx)):**
     - Adicionado card interativo em destaque com a pergunta:
       *"❓ Você já bipou esta unidade avariada durante a conferência?"*
     - Opção **[ 🔘 Sim ]**: *"Já bipada (apenas marcar avaria, não somar na contagem física)"*.
     - Opção **[ 🔘 Não ]**: *"Ainda não bipada (adicionar +X un à contagem física)"*.
  2. **Detecção Inteligente de Lote, Validade e Fabricação:**
     - O modal analisa em tempo real as bipagens ativas daquele produto na conferência:
       - **Se o Lote/Validade/Fab já foi bipado anteriormente:** Exibe badge verde indicando lote já existente e sugere automaticamente marcado como **Sim** (evitando duplicidade).
       - **Se for um Lote/Validade novo ou diferente:** Exibe alerta âmbar indicando lote novo e sugere automaticamente marcado como **Não** (garantindo que o novo lote seja adicionado à contagem física).
       - O conferente mantém liberdade para alternar manualmente entre Sim e Não.
  3. **Tratamento da Ação na Conferência ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - Se `jaBipado === true`: Apenas registra a ocorrência no banco sem chamar `bipar()`, exibindo o feedback: *"Ocorrência registrada! A unidade foi marcada como avariada sem alterar a contagem física."*
     - Se `jaBipado === false`: Registra a ocorrência e executa `bipar()` com o lote e validade informados, somando à conferência e avisando: *"Ocorrência registrada e ADICIONADA à conferência física (+X un)!"*
  4. **Persistência e Suporte no Backend:**
     - Adicionado campo `jaBipado?: boolean` em [`RegistrarOcorrenciaEntradaInput`](./backend/src/application/use-cases/recebimento/RegistrarOcorrenciaEntradaUseCase.ts), [`OcorrenciaConferenciaEntrada`](./backend/src/domain/entities/OcorrenciaConferenciaEntrada.ts) e nos modelos do frontend.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Destaque Visual em Vermelho (Paleta Divergente) para Nível 3 (N3)

- **Diagnóstico & Contexto:**
  - O Nível 3 (Reconferência / Desempate) decorre de divergências não resolvidas entre contagens anteriores.
  - Para garantir clareza visual máxima e rápida identificação pelo conferente, definiu-se que o N3 deve adotar a **mesma identidade visual vermelha do status Divergente** (`badge-danger`), tanto na listagem de notas quanto na tela interna de bipagem.
- **Implementações Realizadas:**
  1. **Lista de Recebimento ([`Recebimento.tsx`](./frontend/src/presentation/pages/Recebimento.tsx)):**
     - A função `classeStatusEntrada` agora atribui expressamente a classe `badge-danger` (fundo `#fff1f2`, texto `var(--rose-500)` e borda `#fecdd3`) para qualquer conferência/nota no Nível 3 (`nivel === 3`, `"N3 em Andamento"`, `"Aguardando N3"` ou `"Divergente"` em N3).
     - Rótulo claro: `"Divergente - Reconferência N3"` ou `"N3 em Andamento"`, ambos com a cor vermelha de divergência.
  2. **Tela de Conferência ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - **Badge de Nível no Cabeçalho:** Ao operar no Nível 3, adota estilo em vermelho suave (`background: #fff1f2`, `color: var(--rose-500)`, `border: 1px solid #fecdd3`) com o texto `"N3: RECONFERÊNCIA (DESEMPATE)"`.
     - **Banner de Alerta Acima do Scanner:** Substituído o padrão amarelo por banner em tom vermelho/alerta (`background: #fff1f2`, `color: #9f1239`, `border: 1px solid #fecdd3`) com ícone `🚨` destacando que a reconferência N3 de desempate está ativa e apenas os itens divergentes foram carregados.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Retenção de Notas Divergentes no Nível 2 até Solicitação Manual de N3 pelo Gestor

- **Diagnóstico & Contexto:**
  - Anteriormente, ao finalizar a contagem do Nível 2 com divergência de quantidade, o caso de uso `FinalizarNivelEntradaUseCase` avançava automaticamente o `nivelAtual` para 3 no banco de dados.
  - Isso fazia com que a nota fosse disponibilizada imediatamente para os conferentes de N3 no coletor, sem passar pela triagem e autorização prévia do gestor na tela de Gestão de Recebimento.
- **Implementações Realizadas:**
  1. **Retenção no Nível 2 ao Finalizar ([`FinalizarNivelEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/FinalizarNivelEntradaUseCase.ts)):**
     - Em caso de divergência de quantidade no Nível 2, a conferência agora é retida no nível atual (`sessao.nivelAtual = input.nivel`, ex: 2) com status `"Divergente"`.
     - Não há mais avanço automático para o Nível 3 sem a intervenção gerencial.
  2. **Promoção Exclusiva para N3 pelo Gestor ([`ResolverDivergenciaUseCase.ts`](./backend/src/application/use-cases/recebimento/ResolverDivergenciaUseCase.ts) & [`SolicitarRecontagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/SolicitarRecontagemEntradaUseCase.ts)):**
     - A conferência avança para o Nível 3 (`sessao.nivelAtual = 3` e status individual `"Aguardando N3"`) **exclusivamente** quando o gestor aciona a ação `"Reconferir (N3)"` na aba de divergências da Gestão de Recebimento.
     - Limpa o campo `sessao.conferente = ''` e reseta `sessao.finalizadoEm = undefined`, permitindo que um conferente com permissão N3 assuma a recontagem de desempate.
  3. **Segurança de Acesso e Visualização:**
     - Conferentes com perfil N3 só visualizam a nota na lista de recebimento e só conseguem acessar a tela de conferência **após** a promoção do nível para 3 pelo gestor.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Liberação de Reconferência de Notas Divergentes no Nível 3 (N3) para Conferentes

- **Diagnóstico & Contexto:**
  - Quando uma conferência de entrada apresentava divergências e o gestor solicitava Reconferência Nível 3 (N3), a sessão ou nota mantinha o status `"Divergente"`.
  - Ao tentar acessar a conferência para efetuar a recontagem de desempate N3, conferentes sem permissão executiva de gestor (`conferencia_entrada_divergente`) eram barrados pela tela *"Acesso Restrito ao Status: Seu usuário não possui permissão para visualizar conferências com status 'Divergente'"*.
  - Além disso, a nota não era listada na tela de Recebimento (`/recebimento`) para conferentes com permissão de N3 (`conferencia_entrada_n3`), impedindo o fluxo operacional de recontagem.

- **Implementações Realizadas:**
  1. **Liberação de Acesso à Tela de Conferência ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - A verificação de `podeAcessarStatus` agora autoriza o acesso caso a sessão esteja no Nível 3 (`sessao.nivelAtual === 3`) e o usuário possua a permissão `conferencia_entrada_n3`, mesmo com status `"Divergente"` ou `"Em Reconferência"`.
     - Ao abrir a conferência em N3, o sistema aciona `iniciarConferencia`, transitando o status imediatamente para `"N3 em Andamento"` e vinculando o conferente atual.
  2. **Exibição e Badge na Lista de Recebimento ([`Recebimento.tsx`](./frontend/src/presentation/pages/Recebimento.tsx)):**
     - O filtro de notas visíveis (`notasPermitidas`) agora exibe notas com status `"Divergente"` que estejam no Nível 3 (`n.nivelAtual === 3` ou status de N3) para usuários com permissão N3 (`conferencia_entrada_n3`).
     - Badge visual atualizado para `"Divergente - Reconferência N3"` com estilo de atenção (`badge-warning`), deixando claro que se trata de uma nota divergente liberada para desempate.
  3. **Ajustes no Backend:**
     - [`ListarNotasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarNotasEntradaUseCase.ts): liberada a listagem de notas divergentes em N3 para usuários que possuem permissão `conferencia_entrada_n3`.
     - [`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts): habilitada a filtragem dos itens divergentes para sessões no Nível 3 mesmo com status `"Divergente"`.
     - [`RegistrarBipagemEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarBipagemEntradaUseCase.ts): atualiza o status individual da nota para `"N3 em Andamento"` ao bipar itens no Nível 3.

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Redesign e Otimização do Card de Conferência (Aba Conferências da Gestão de Recebimento - Proposta A)

- **Diagnóstico:**
  - O card de conferência em [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx) apresentava desbalanceamento visual e redundâncias:
    - O nome do conferente aparecia duplicado (em um badge no canto superior direito e repetido no texto abaixo do fornecedor).
    - Havia duplicidade de badges de status (`Nível Atual: N2` e `N2 EM ANDAMENTO` vizinhos).
    - O quadrante inferior direito ficava completamente vazio enquanto os textos do fornecedor e metadados ficavam amontoados em 4 a 5 linhas verticais à esquerda.
    - O badge de previsão de entrega exibia `🚫 Sem data entrega` em vermelho forte, passando a impressão de erro fiscal crítico.
- **Implementações Realizadas (Proposta A - Moderna & Equilibrada):**
  1. **Cabeçalho Balanceado em 2 Faixas:**
     - **Faixa Superior (`.gestao-rec-card-top-bar`):**
       - Lado esquerdo: Badge moderno da Nota Fiscal (`📄 NF #35801`), badge de sessão conjunta (se houver), previsão de entrega suave (`📅 Prev: Não informada` em cinza neutro `#64748b`), badges de integração e status por nota inline.
       - Lado direito: Status unificado da conferência (`badge-status-rec`) acompanhado do horário de início/conclusão de forma limpa e discreta (`⏱️ Iniciado às 19:18`).
     - **Faixa Central em 2 Colunas (`.gestao-rec-card-corpo-grid`):**
       - **Coluna 1 (Fornecedor):** Destaque tipográfico com label `FORNECEDOR` e nome completo da razão social em negrito (`text-slate-900`), com quebra fluida.
       - **Coluna 2 (Box do Responsável):** Card moderno com avatar circular contendo a inicial do conferente (ou ícone ⏳ se em aberto), label `CONFERENTE` e nome em destaque, ocupando o vão anteriormente vazio.
  2. **Eliminação de Redundâncias:**
     - Removida a exibição repetida do conferente no rodapé de metadados.
     - Removido o badge avulso `Nível Atual: N2`, centralizando a informação no badge oficial de status.
     - Suavizado o badge `badge-prev-sem-data` em [`GestaoRecebimento.css`](./frontend/src/presentation/pages/GestaoRecebimento.css) e [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Tratamento de Divergências de Recebimento — Desmembramento de Falta com Local Específico e Ação 'Gerar Ocorrência de Sobra'

- **Diagnóstico & Contexto Operacional:**
  - Em casos de divergência de **FALTA** (ex: Nota 60766 / Item 11376: 10 un faturadas vs 9 un bipadas, falta de -1 un): a quantidade faltante deve ser desmembrada no Sankhya para que a linha recebida atinja 100% de conformidade com a contagem física, enquanto a fração faltante é direcionada a um local de estoque específico do ERP.
  - O campo de Local de Estoque da fração de falta no modal de desmembramento precisava iniciar vazio para que o operador/gestor pesquise e selecione expressamente o local desejado.
  - Em casos de divergência de **SOBRA** (ex: Nota 60766 / Item 11379: 15 un faturadas vs 26 un bipadas, sobra de +11 un): o gestor precisava de uma ação direta para criar a ocorrência formal de SOBRA e, simultaneamente, deduzir a quantidade excedente da contagem física da conferência, eliminando a divergência sem necessidade de anular a nota inteira.

- **Implementações Realizadas:**
  1. **Falta — Desmembramento para Local Específico (`ModalDesmembrarItem.tsx`):**
     - O campo `codlocal` da fração de falta (`isFalta: true`) agora é iniciado estritamente como `undefined` (vazio).
     - Adicionada validação que bloqueia o desmembramento até que o gestor informe o local de estoque de destino da falta via digitação ou pesquisa com a rotina de busca `ModalPesquisaLocalEstoque`.
     - Exibição de aviso claro no rodapé orientando a seleção do local de estoque para a fração de falta.
  2. **Sobra — Ação 'Gerar Ocorrência de Sobra' (`AbaDivergenciasView.tsx` & `ModalOcorrenciaSobra.tsx`):**
     - Criado o componente dedicado [`ModalOcorrenciaSobra.tsx`](./frontend/src/presentation/components/Recebimento/ModalOcorrenciaSobra.tsx) que exibe o resumo comparativo (Faturado x Físico x Sobra), lote, validade, motivo e local de destino opcional.
     - Botão `📦 Gerar Ocorrência de Sobra` adicionado nas linhas com sobra (`diferenca > 0`) tanto na tabela Desktop quanto no card Mobile de [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx).
     - Novo caso de uso no backend [`RegistrarOcorrenciaSobraUseCase.ts`](./backend/src/application/use-cases/recebimento/RegistrarOcorrenciaSobraUseCase.ts) e rota `POST /api/recebimento/conferencia/:id/ocorrencia-sobra`:
       - Registra a ocorrência de SOBRA formalmente no banco.
       - Executa o método `abaterSobraBipagens` no repositório [`LibsqlConferenciaEntradaRepository.ts`](./backend/src/infrastructure/repositories/LibsqlConferenciaEntradaRepository.ts), deduzindo a quantidade excedente das bipagens ativas da conferência.
       - Reavalia as divergências e atualiza o status da nota e conferência para `Conferido` caso não restem mais pendências.
  3. **Integração no Controller e API:**
     - Adicionado método `registrarOcorrenciaSobra` em [`RecebimentoApiService.ts`](./frontend/src/infrastructure/api/RecebimentoApiService.ts) e handler `handleRegistrarOcorrenciaSobra` em [`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx).

- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Reposicionamento dos Chips de Validação Operacional no Card de Envio Sankhya

- **Diagnóstico:**
  - Na aba **Envio Sankhya** da Gestão de Recebimento ([`AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx)), os micro-chips de validação operacional (`Quantidades Físicas`, `Lotes & Validades`, `Locais no ERP` e `Desmembramentos`) ocupavam uma linha inteira dedicada (`.gestao-rec-status-strip`) abaixo das informações da nota fiscal.
  - Isso consumia espaço vertical desnecessário nos cards, enquanto a área ao lado do badge de status (`CONFERIDO`) no cabeçalho permanecia vazia.
- **Implementação Realizada:**
  - Alinhamento realizado conforme entrevista interativa `/grill-me`: os micro-chips foram movidos para dentro do container do cabeçalho ([`gestao-rec-card-badges`](./frontend/src/presentation/pages/GestaoRecebimento.css)), posicionados à esquerda do badge de status geral (`CONFERIDO` / `AGUARDANDO APROVAÇÃO` / `ENVIADO`).
  - A faixa intermediária `.gestao-rec-status-strip` foi completamente removida, reduzindo a altura do card e eliminando o vão em branco.
  - Em telas menores e mobile (`<= 1024px`), os badges passam a ocupar a largura total com quebra fluida (`flex-wrap: wrap`) e alinhamento à esquerda.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Ajuste de Layout na Conferência de Entrada - Eliminação de Espaço Vazio entre Scanner e Abas

- **Diagnóstico:**
  - O painel do scanner (`Painel` / `.ui-painel`) possuía margem inferior padrão de `20px` e o container fixo do cabeçalho (`.conferencia-top-fixo`) possuía `padding-bottom: 10px` e `margin-bottom: 8px`.
  - A combinação resultava em um espaçamento vazio residual de mais de 40px no fundo da página entre o card de bipagem e a barra de abas (`Itens Pendentes` / `Itens Conferidos`), consumindo espaço vertical valioso de visualização dos produtos.
- **Correção Aplicada:**
  - Adicionado escopo dedicado `.conferencia-entrada-page` na página [`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx).
  - Em [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css), ajustado para zerar a margem inferior do painel e o padding/margin do topo fixo exclusivamente no escopo da Conferência de Entrada, preservando 100% o isolamento com a Conferência de Saída e sem tocar em classes globais.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com sucesso (exit code 0).
  - Backend: `npm run build` compilado com sucesso (exit code 0).

---

## Atualização: Correção do Bloqueio de Reinício em Conferências Concluídas (`ReiniciarConferenciaEntradaUseCase.ts` & `LibsqlConferenciaEntradaRepository.ts`)

- **Causa do Bloqueio Identificada:**
  - Ao clicar em "Reiniciar Conferência" em notas que já estavam no status `Conferido` ou `Divergente`, o método `anularBipagem` lançava a exceção:
    `Esta conferência está no status "Conferido" e não permite estorno de bipagens.`
  - Essa trava havia sido desenhada para impedir estornos avulsos acidentais por operadores no coletor, mas acabava bloqueando o arquivamento das bipagens no fluxo legítimo de reinício pelo gestor.
- **Correção Aplicada:**
  - Adicionado o parâmetro `forcar: boolean` na interface e no repositório (`IConferenciaEntradaRepository.ts` e `LibsqlConferenciaEntradaRepository.ts`).
  - No fluxo de reinício da conferência (`ReiniciarConferenciaEntradaUseCase.ts`), o cancelamento/arquivamento das bipagens no backup seguro agora passa `forcar = true`.
  - A validação padrão continua ativa para estornos manuais avulsos via coletor.
  - Testado e validado com sucesso: reinício e restauração de contagem de notas no status `Conferido` agora operam de forma 100% fluida e segura.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Correção do Escopo de Validação do `AD_CONFERENCIA` para Não Afetar Notas Prontas para Envio

- **Causa Identificada:**
  - A checagem de reabertura automática baseada no campo `TGFCAB.AD_CONFERENCIA` estava sendo aplicada indevidamente a notas com status `Conferido` e `Aguardando Aprovação`.
  - Quando o gestor resolvia divergências e optava por "Não enviar agora para o ERP", a conferência ficava como `Conferido` para envio posterior na aba **Envio Sankhya**. Como ela ainda não tinha sido enviada ao ERP, o campo `AD_CONFERENCIA` na `TGFCAB` era naturalmente nulo, o que causava o reset incorreto da conferência de volta para `Em Aberto`.
- **Correção Aplicada (`ListarNotasEntradaUseCase.ts` & `ListarTodasConferenciasEntradaUseCase.ts`):**
  - A validação de `AD_CONFERENCIA !== 'CONFERIDO'` agora é restrita **exclusivamente** a conferências que já foram integradas no ERP (`sessao.status === 'Enviado ao Sankhya'` com data de integração `enviadoSankhyaEm`).
  - Notas finalizadas (`Conferido` / `Aguardando Aprovação`) permanecem intactas e agora aparecem perfeitamente na aba **Envio Sankhya** com o botão **"Aprovar & Enviar ao Sankhya"**.
  - A sessão da nota 22115 (`1349656`) foi devidamente restaurada para `Conferido` com todas as bipagens do N2 preservadas.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Correção do Mecanismo de Atualização de Lote na TGFEST via DatasetSP.save

- **Diagnóstico do UPDATE na TGFEST:**
  - Identificado que o comando `UPDATE` direto via `DbExplorerSP.executeQuery` é bloqueado nativamente pelo Sankhya com o erro:
    `[Sankhya DbExplorerSP.executeQuery] Permitido apenas a execução de consultas, a instrução possui 'UPDATE', 'DELETE' ou 'INSERT' e tais comandos não são permitidos.`
  - Por causa desse bloqueio, o comando de atualização falhava silenciosamente e o sistema caía no fallback de inserção (`DatasetSP.save` com novo registro), mantendo tanto o lote antigo quanto o novo na `TGFEST`.
- **Implementação do UPDATE com DatasetSP.save nativo do Sankhya:**
  - Atualizado [`EnviarConferenciaSankhyaUseCase.ts`](file:///c:/Users/inovace/Documents/Sankhya/backend/src/application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.ts) para realizar o `UPDATE` de lote na `TGFEST` através do serviço oficial `DatasetSP.save` (entidade `Estoque`), informando o lote antigo na `pk` e o novo lote conferido em `fields: ['CONTROLE', 'DTVAL', 'DTFABRICACAO']`.
  - Desta forma, quando o lote antigo na `TGFEST` estiver com estoque zerado (`ESTOQUE = 0` e `RESERVADO = 0`), ele é **atualizado diretamente para o novo lote**, sem duplicidade e sem deixar registros órfãos na base de dados.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Nova Permissão de Usuário para Rotina de Backup de Conferência (`gestao_recebimento_backup`)

- **Controle de Acesso à Rotina de Backup de Conferências:**
  - Adicionada a flag de permissão `gestao_recebimento_backup` em [`Auth.ts`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/domain/models/Auth.ts) e [`PermissaoUsuario.ts`](file:///c:/Users/inovace/Documents/Sankhya/backend/src/domain/entities/PermissaoUsuario.ts).
  - **Interface de Gestão de Acessos ([`GestaoAcessos.tsx`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/pages/GestaoAcessos.tsx)):**
    - Adicionado o novo switch toggle **"📦 Rotina de Backup"** na seção *"ABAS AUTORIZADAS NA GESTÃO DE RECEBIMENTO"*, logo abaixo de *Aba Ocorrências*, com o subtítulo *"Visualização de contagens arquivadas e restauração de backups de conferência"*.
    - Integração aos perfis rápidos: habilitado por padrão para perfis **Gestor** e **Administrador**, desabilitado para perfil **Operador / Conferente**.
    - Exibição de badge informativa `Bkp` no resumo dos módulos autorizados do usuário.
  - **Enforcement na Gestão de Recebimento ([`GestaoRecebimento.tsx`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/pages/GestaoRecebimento.tsx) e [`AbaConferenciasView.tsx`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx)):**
    - Quando o usuário não possui a permissão `gestao_recebimento_backup` (e não é administrador):
      1. O chip de filtro `💾 Com Backup` é completamente ocultado da interface.
      2. O ribbon/alerta de backup `Backup disponível` e o botão `Restaurar Contagem` nos cards são omitidos.
      3. O botão de restaurar backup também é desativado nas abas de Divergências e Envio Sankhya.
      4. Caso o usuário tente restaurar backup diretamente ou forçar o filtro, a ação é bloqueada no frontend com aviso explicativo.
  - **Proteção no Backend ([`conferenciaEntradaRoutes.ts`](file:///c:/Users/inovace/Documents/Sankhya/backend/src/presentation/http/routes/conferenciaEntradaRoutes.ts)):**
    - Endpoint `POST /conferencia/:id/recuperar` protegido com middleware de permissão exigindo `gestao_recebimento_backup` ou `gerenciar_acessos` (retornando HTTP 403 Forbidden caso não autorizado).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Ocultação da Tag de Filtro "Concluídas" por Permissão do Usuário

- **Visibilidade Condicional da Tag "Concluídas":**
  - Na tela de listagem de notas da Conferência de Entrada ([`Recebimento.tsx`](file:///c:/Users/inovace/Documents/Sankhya/frontend/src/presentation/pages/Recebimento.tsx)), a pill/tag de filtro `[ 0 CONCLUÍDAS ]` agora só é exibida se o usuário possuir a permissão `conferencia_entrada_conferido`.
  - Caso o usuário (ex: operadores como `VICTOR.D`) não tenha permissão para visualizar notas concluídas, a tag é totalmente ocultada da interface, mantendo apenas `Todas`, `Pendentes` e `Em Andamento`.
  - Se o usuário tentar filtrar por concluídas sem ter a permissão correspondente, o filtro é automaticamente redefinido para `'todos'`.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Sincronização Automática com `AD_CONFERENCIA` da `TGFCAB` no Sankhya

- **Disponibilização Automática para Nova Conferência:**
  - Adicionada a leitura do campo `TGFCAB.AD_CONFERENCIA` tanto na listagem de notas do recebimento (`ListarNotasEntradaUseCase.ts`) quanto na gestão de conferências (`ListarTodasConferenciasEntradaUseCase.ts`).
  - **Regra de Negócio Implementada:**
    - Se uma nota ou conferência constava localmente como integrada/concluída (`Enviado ao Sankhya`, `Conferido` ou `Aguardando Aprovação`), mas no Sankhya ERP o campo `AD_CONFERENCIA` estiver nulo, vazio ou diferente de `'CONFERIDO'` (indicando que a conferência foi desfeita, cancelada ou a nota foi reaberta/recriada no ERP):
      1. A conferência é resetada automaticamente para **`Em Aberto`**.
      2. O conferente anterior e os metadados de conclusão são limpos.
      3. Um backup seguro da contagem anterior é gerado (`backupContagem`), permitindo restauração via botão "Restaurar Contagem" se desejado.
      4. A nota volta a ficar imediatamente disponível para nova bipagem na tela do conferente (`Recebimento.tsx`) e como "Aguardando Início" na Gestão (`GestaoRecebimento.tsx`).
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Correção de Ordem de Migração SQLite no Backend (`schema.ts`)

- **Correção da Criação de Índice de `numnota`:**
  - O comando `CREATE INDEX idx_ocorr_numnota` estava inserido na lista inicial de statements do SQLite antes da execução do helper `garantirColuna`. Em bancos de dados existentes onde a coluna ainda não havia sido adicionada, o SQLite lançava erro de inicialização (`SQLITE_ERROR: no such column: numnota`), impedindo o backend de subir.
  - O índice foi reposicionado para ser executado imediatamente após o `garantirColuna(client, 'ocorrencias_conferencia_entrada', 'numnota', 'INTEGER')`.
  - Servidor backend testado e validado: todas as rotas (`/api/recebimento/conferencias`, `/api/recebimento/conferencia/divergencias`, `/api/recebimento/notas`, `/api/recebimento/ocorrencias`) estão ativas e respondendo com status 200 OK.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Reaproveitamento e Limpeza de Lote com Saldo Zero na TGFEST (`EnviarConferenciaSankhyaUseCase.ts`)

- **Verificação Prévia do Lote da TGFITE e Saldo na TGFEST:**
  - Adicionado o campo `ITE.CONTROLE` na busca de itens da nota fiscal para identificar o lote original que veio no XML/cadastro do ERP.
  - Ao integrar a conferência para o Sankhya, se o lote conferido for diferente do lote original da nota:
    1. O sistema consulta a `TGFEST` para verificar o `ESTOQUE` e `RESERVADO` do lote antigo.
    2. **Se o saldo for igual a zero (`ESTOQUE = 0` e `RESERVADO = 0`):**
       - Se o novo lote ainda não existir na `TGFEST`, é realizado o `UPDATE` direto reaproveitando o registro existente e evitando criar resíduo desnecessário de XML.
       - Se o novo lote já existir na `TGFEST`, o lote antigo zerado é removido da `TGFEST` para não deixar sujeira na base.
    3. **Se o saldo for diferente de zero (`ESTOQUE > 0` ou `RESERVADO > 0`):**
       - O lote antigo é ignorado (mantido intacto com seu saldo real no armazém) e o novo lote conferido é criado via `INSERT` ou atualizado.
  - Na `TGFITE`, o `CONTROLE` é sempre atualizado para o novo lote conferido.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Exibição do Número da Nota Fiscal (NF) nas Ocorrências (`AbaOcorrenciasView.tsx` & Backend)

- **Identificação Fiscal Principal por Número de NF:**
  - Alterada a exibição das ocorrências na Gestão e no Coletor para destacar como identificador primário o número fiscal da nota (`NF: {numnota}`), mantendo o código interno do Sankhya de forma discreta entre parênteses (ex: **`NF: 221595 (#1349633)`**).
  - Adicionada a coluna `numnota` na tabela `ocorrencias_conferencia_entrada` do SQLite com índice e migração estrutural automática em `schema.ts`.
  - Atualizado `ListarOcorrenciasEntradaUseCase` para consultar automaticamente em lote no Sankhya (`TGFCAB`) o `NUMNOTA` correspondente de qualquer ocorrência existente que possua apenas `nunota`, realizando o enriquecimento e persistência em cache transparente.
  - Atualizado `RegistrarOcorrenciaEntradaUseCase` para salvar o `numnota` no momento do apontamento da ocorrência (via item ou consulta direta na TGFCAB).
  - Atualizada a busca de ocorrências (`buscaTexto`) e os seletores do modal do Discord para filtrar e pesquisar tanto pelo número da NF quanto pelo NUNOTA.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Remoção da Quantidade Total de Unidades no Card do Conferente (`Recebimento.tsx`)

- **Ocultação da Quantidade de Unidades para Conferência Cega:**
  - Removida a exibição de unidades totais esperadas (ex: `(80 un.)`) no card da nota na lista de recebimento do conferente.
  - Agora é exibida apenas a quantidade de itens/SKUs cadastrados na nota (`Itens: X`), impedindo que o conferente saiba antecipadamente a soma total de volumes/unidades físicas e preservando a integridade da conferência cega.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Desacoplamento e Correção de Fechamento da Foto Ampliada (`ModalListaOcorrenciasSessao.tsx`)

- **Correção de Event Bubbling e Desacoplamento do Lightbox:**
  - O visualizador de foto ampliada (`fotoAmpliada`) estava aninhado dentro do container do overlay do modal de ocorrências. Ao clicar no `✕` ou no backdrop para fechar a foto, o evento de clique borbulhava (`bubble up`) e disparava o `onClose` do modal principal, fechando toda a lista de ocorrências.
  - O visualizador de foto ampliada foi desacoplado para ser um elemento irmão no DOM (via `React.Fragment`), com `e.stopPropagation()` no botão de fechar e na área da imagem.
  - Agora, ao fechar a visualização da foto ampliada, o usuário retorna suave e perfeitamente para a lista de ocorrências, exatamente como esperado.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Correção do Fundo do Modal de Ocorrências (`ModalListaOcorrenciasSessao.tsx`)

- **Eliminação da Transparência no Modal:**
  - Corrigido o container principal do modal para a classe `.modal-card` com fundo 100% sólido branco (`#ffffff`), cantos arredondados (`16px`) e sombra elevada suave (`boxShadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`).
  - Overlay escurecido com desfoque de fundo elegante (`backgroundColor: rgba(15, 23, 42, 0.65)`, `backdropFilter: blur(4px)`).
  - Corpo da listagem com fundo suave (`#f8fafc`) e cards individuais brancos para cada ocorrência, impedindo qualquer vazamento visual dos elementos da tela de fundo.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Remoção do Texto de Status Visível nas Tags de Ocorrência (`ConferenciaEntradaPage.tsx`)

- **Tag Limpa e Minimalista:**
  - Removido o sufixo visual `• Pendente` / `• Resolvido` de dentro das tags de ocorrência (ex: agora exibe puramente **`💥 Avaria (10 un)`**, **`⛔ Vencido (1 un)`**).
  - O status detalhado continua acessível discretamente via tooltip ao passar o mouse (`title`) e no modal completo ao clicar na tag.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Agrupamento Suave de Tags de Ocorrência no Coletor (`ConferenciaEntradaPage.tsx`)

- **Agrupamento e Contabilização por Tipo de Ocorrência:**
  - Ocorrências duplicadas do mesmo tipo não geram mais tags repetidas (ex: antes exibia `💥 Avaria (1 un) 💥 Avaria (1 un)`).
  - Agora as quantidades são automaticamente consolidadas e somadas por tag: **`💥 Avaria (2 un)`**, **`⛔ Vencido (1 un)`**, etc.
  - O mesmo agrupamento inteligente ocorre tanto no cabeçalho do produto quanto no detalhamento de cada lote expandido.
- **Layout Limpo e Suave Restaurado:**
  - Preservado o layout limpo e direto da métrica **QTD CONFERIDA** (número verde em destaque sem poluição visual).
  - Removidos blocos pesados do card, mantendo os cards mobile e a tabela desktop leves e agradáveis aos olhos.
  - Tags estilizadas com paleta suave/pastel, cantos arredondados e indicação sutil do status (`• Pendente` / `• Resolvido`).
  - Ao clicar em qualquer tag, abre o modal de consulta rápida com os detalhes completos da ocorrência.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Destaque e Separação de Ocorrências na Lista de Itens do Conferente (`ConferenciaEntradaPage.tsx`)

- **Separação de Quantidades Conforme vs Ocorrência no Card/Tabela:**
  - Quando um produto possui ocorrências cadastradas (ex: Avaria, Vencido), a métrica de quantidade não exibe apenas o valor bruto misturado, mas desmembra claramente:
    - **✓ Conforme:** Quantidade física sem defeito (ex: 10 un).
    - **⚠️ Ocorrência:** Quantidade separada com ocorrência (ex: 1 un).
    - **Total:** Quantidade total bipada (ex: 11 un).
- **Exibição do Status da Ocorrência e Contador no Item:**
  - Adicionado badge de status com cores semânticas e ícones para cada ocorrência:
    - `⏳ Pendente` (âmbar), `✓ Resolvido` (verde), `📦 Integrado ERP` (azul), `↩ Devolvido` (roxo).
  - Incluído contador explícito de ocorrências no item: `⚠️ X Ocorrência(s)`.
  - Adicionado bloco visual dedicado de ocorrências (`conferencia-entrada-card-ocorrencias`) dentro do card do produto conferido, listando tipo, quantidade, lote, motivo/observação e status.
- **Botão e Modal de Consulta Completa de Ocorrências (`ModalListaOcorrenciasSessao.tsx`):**
  - O botão superior `⚠️ X Ocorrência(s)` agora é interativo. Ao clicar, abre o modal de consulta detalhada da conferência.
  - Exibe cada ocorrência da carga com código, produto, lote, validade, fotos ampliáveis, motivo e opção de estornar a ocorrência em caso de erro de apontamento.
- **Isolamento de Estilos:**
  - Estilos criados exclusivamente em `ConferenciaEntradaPage.css` com prefixo `.conferencia-entrada-*`, preservando 100% de isolamento com a Conferência de Saída.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Correção do Percentual Bipado por Quantidade Física e Alinhamento do Cabeçalho

- **Correção da Métrica de Progresso por Unidades Físicas (`AbaConferenciasView.tsx` & Backend):**
  - Identificada distorção onde o cálculo dividia as **unidades físicas bipadas** (ex: 1 un.) pelo **número de SKUs** (18 produtos), resultando em 1/18 = 6%.
  - Atualizadas as consultas no ERP Sankhya (`ListarTodasConferenciasEntradaUseCase.ts` e `ListarNotasEntradaUseCase.ts`) para computar `SUM(NVL(QTDNEG, 0)) AS QTD_UNIDADES` além da contagem de produtos.
  - O percentual agora reflete a **quantidade física real esperada**: `(totalBipadoNivel / totalQtdEsperada) * 100`.
  - **Tratamento de Sobra/Excesso de Bipagem:**
    - Caso a contagem ultrapasse o total da nota (ex: conferente bipou a mais), o percentual real é sinalizado com alerta: `⚠️ X% Bipado (+Y un. Excedente)`.
    - No resumo de métricas é evidenciado `⚠️ Sobra: +Y un.` em vermelho.
    - A barra de progresso visual é contida em 100% com gradiente de alerta vermelho (`#ef4444` -> `#dc2626`) para indicar a sobcontagem sem quebrar o layout.
- **Fix no Alinhamento dos Badges no Cabeçalho do Card (`GestaoRecebimento.css`):**
  - Corrigido o `flex-wrap` do cabeçalho que causava quebra de linha quando a razão social do fornecedor era muito extensa (ex: notas conjuntas), empurrando os badges de status para baixo.
  - Badges agora ficam fixados firmemente no topo à direita (`flex-shrink: 0`), e o texto longo do fornecedor quebra linha internamente à esquerda.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

---

## Atualização: Sincronização de Status e Conferente entre Coletor e Gestão

- **Diagnóstico da Divergência entre Telas:**
  - Identificado que, ao iniciar ou bipar uma conferência, o status geral da sessão era atualizado para `'N2 em Andamento'`, mas o mapa JSON granular de notas (`status_por_nota_json`) retinha `'Em Aberto'` de um reinício anterior.
  - A tela de Gestão lia o status geral da sessão (`sessao.status`), exibindo corretamente `N2 em Andamento` e conferente `VICTOR.D`. Em contrapartida, a tela do Coletor (`Recebimento.tsx`) lia `obterMapaStatusNotas`, que priorizava `statusPorNota[nunota]`, mascarando falsamente a nota como `'Em Aberto'`.
- **Sincronização em Tempo Real (`IniciarConferenciaEntradaUseCase.ts` & `RegistrarBipagemEntradaUseCase.ts`):**
  - Ao iniciar ou retomar uma conferência, todas as notas não concluídas da sessão agora têm seu `statusPorNota` sincronizado imediatamente com o status ativo do nível (`N1 em Andamento`, `N2 em Andamento`, etc.).
  - Ao registrar uma bipagem, se a nota constava como `'Em Aberto'`, ela é imediatamente promovida para o status de andamento no mapa.
- **Prevalência do Status Ativo da Sessão (`LibsqlConferenciaEntradaRepository.ts`):**
  - Em `obterMapaStatusNotas`, caso uma sessão esteja com status ativo em andamento (`N1 em Andamento`, `N2 em Andamento`, etc.), esse status agora prevalece sobre eventuais valores obsoletos de `'Em Aberto'` em `statusPorNota`.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Reset Completo de Conferente ao Reiniciar Conferência de Entrada

- **Limpeza do Conferente e Metadados ao Reiniciar (`ReiniciarConferenciaEntradaUseCase.ts`):**
  - Ao reiniciar uma conferência de entrada (seja desmembrando uma nota individual ou reiniciando toda a sessão conjunta), o campo `conferente` é agora explicitamente resetado para vazio (`''`), desvinculando o usuário anterior que realizou a contagem.
  - O operador/gestor que solicitou o reinício é mantido estritamente no histórico de segurança (`backupContagem.reiniciadoPor` e auditoria), sem ser atribuído como conferente de contagem de uma nota em aberto.
  - Resetados metadados de conclusão, aprovação e recontagens (`finalizadoEm`, `aprovadoPor`, `aprovadoEm`, `enviadoSankhyaEm`, `itensRecontagem`, `decisoesFiscais`).
- **Prevenção de Conferente Fantasma em Notas 'Em Aberto' (`LibsqlConferenciaEntradaRepository.ts` & Backend Use Cases):**
  - Ajustado `salvarSessao` para persistir `''` (string vazia) em vez de `null` em sessões reiniciadas, respeitando estritamente a constraint `NOT NULL` da coluna `conferente` no SQLite (`conferencias_entrada.conferente`).
  - Corrigido `mapSessao` no repositório Libsql para não forçar `'Operador'` artificial como fallback quando o campo `conferente` for vazio.
  - `obterMapaStatusNotas`: Para qualquer nota cujo status seja `'Em Aberto'`, o `conferente` retornado é garantido como `undefined`, corrigindo imediatamente tanto novas reinicializações quanto sessões que já estavam salvas em aberto no banco.
  - `ListarNotasEntradaUseCase.ts`: Notas com status `'Em Aberto'` agora retornam explicitamente `conferente: null` e `nivelAtual: undefined`.
  - `ListarTodasConferenciasEntradaUseCase.ts`: Sessões e notas com status `'Em Aberto'` exibem `Aguardando Início` e limpam `conferenteN1`, `conferenteN2` e `conferenteN3`.
- **Blindagem Visual no Coletor (`Recebimento.tsx`):**
  - As tags `Nível Atual: N...` e `Conferente: [NOME]` agora só são renderizadas quando a nota estiver em andamento (`statusConferencia !== 'Em Aberto'`). Notas reiniciadas ou ainda não iniciadas ficam totalmente limpas aguardando o novo operador.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.


## Atualização: Correção do Fluxo de Itens Pendentes na Conferência Cega (`ConferenciaEntradaPage.tsx` & Backend)

- **Correção da Transição de Pendentes para Conferidos na Contagem Cega:**
  - Corrigido o comportamento onde bipar apenas 1 unidade de um item com quantidade maior (ex: 80 un) já o removia imediatamente da lista de "Itens Pendentes" e o marcava falsamente como concluído.
  - O backend (`ObterItensConferenciaEntradaUseCase.ts` e `RegistrarBipagemEntradaUseCase.ts`) agora calcula e sinaliza de forma segura `conferidoCompleto: boolean` comparando a contagem do nível contra a quantidade da NF sem expor os números reais ao usuário.
  - O item permanece visível na aba **Itens Pendentes** com status **`Parcial`** até que toda a quantidade esperada da carga seja bipada.
- **Blindagem Visual na Conferência Cega:**
  - Omitido qualquer aviso de "Sobra" ou destaque de divergência precoce durante a contagem no coletor para conferentes sem permissão de campos sensíveis, preservando o sigilo total da conferência cega até a finalização/gestão.
  - Ajustados os modais e estatísticas de conferência para exibir `Unidades Bipadas: X` em vez de expor a meta da nota.
- **Validação de Builds:**
  - Frontend: `npm run build` compilado com exit code 0.
  - Backend: `npm run build` compilado com exit code 0.

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


