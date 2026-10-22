# Registro de Progresso e Entregas - Conferência de Entrada & Gestão de Recebimento

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


