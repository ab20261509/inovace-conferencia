# Handoff — Sessão 2026-10-08

## Funcionalidades e Ajustes Implementados

### 1. Camada de Permissões e Gestão de Acessos (RBAC Desacoplado)
- **Domínio & Port:**
  - Criada entidade `ModulosUsuario` (`conferencia_saida`, `conferencia_entrada`, `consulta_produtos`, `ver_campos_sensiveis`, `gerenciar_acessos`).
  - Definida porta `IPermissoesRepository` para total desacoplamento da camada de persistência.
  - Implementado `JsonPermissoesRepository` gravando em `backend/data/acessos.json` com cache em memória e fallback automático para superusuários (`SUP`, `ANTONY`, `ANTONY.B`).
  - Preparado para migração futura para banco de dados ou tabela do Sankhya simplesmente trocando a implementação da porta.
- **Use Cases & Rotas Backend:**
  - `ObterMeusAcessosUseCase` (`GET /api/acessos/me`): retorna as permissões do usuário logado.
  - `ListarUsuariosAcessosUseCase` (`GET /api/acessos/usuarios`): busca usuários ativos do Sankhya via `TSIUSU` (`SELECT CODUSU, NOMEUSU, CODGRUPO, ATIVO FROM TSIUSU WHERE ATIVO = 'S'`) e combina com suas permissões.
  - `SalvarAcessosUsuarioUseCase` (`PUT /api/acessos/usuarios/:codUsu`): salva permissões atualizadas, com proteção para administradores.
  - Injetado `permissoesRepo` em `ListarItensPedidoUseCase` para avaliação dinâmica do toggle `ver_campos_sensiveis`.
- **Docker Compose:**
  - Adicionado volume persistente `./backend/data:/app/data` para garantir que o arquivo `acessos.json` e `campos_telas.json` não sejam perdidos ao reiniciar os contêineres.

### 2. Arquitetura Raiz de Campos Sensíveis por Tela
- **Objetivo**: Permitir que cada tela do sistema defina seu catálogo de campos e se cada um é ou não sensível, ao invés de fixar regras no código.
- **Domínio & Port:**
  - `ConfiguracaoTela.ts`: Entidade contendo o catálogo de telas (`CATALOGO_TELAS_SISTEMA`), com `conferencia_saida`, `conferencia_entrada`, `consulta_produtos` e respectivos campos configuráveis (`qtdPed`, `codBarra`, `referencia`, `controle`, etc.).
  - `IConfiguracaoTelasRepository.ts`: Porta com método centralizador `deveOcultarCampo(idTela, chaveCampo, usuario)`.
  - `JsonConfiguracaoTelasRepository.ts`: Persistência em `backend/data/campos_telas.json`.
- **Use Cases & Rotas:**
  - `GET /api/configuracoes/telas`: Retorna catálogo e configuração ativa.
  - `PUT /api/configuracoes/telas/:idTela`: Atualiza status dos campos da tela.
- **Integração no Backend:**
  - `ListarItensPedidoUseCase` agora consulta `configTelasRepo.deveOcultarCampo('conferencia_saida', 'qtdPed', usuario)` e para os demais campos configurados, ocultando-os na origem caso o usuário não tenha a permissão `ver_campos_sensiveis`.
- **Frontend com Duas Abas na Gestão de Acessos (`/configuracoes/acessos`):**
  - **Aba 1 (👥 Usuários & Módulos)**: Gerenciamento dos operadores, status de 1º e último acesso, permissões de módulos, flag `ver_campos_sensiveis` e admin.
  - **Aba 2 (🛡️ Campos Sensíveis por Tela)**: Seletor de telas com pills/chips informando quantidade de campos, banner informativo sobre proteção de dados, e grid de cards responsivos de campos com switches e feedback em tempo real.

### 3. Navegação Global com Menu Gaveta (Drawer — ConferCheck)
- Criados componentes `AppDrawer`, `AppHeader` e `AppLayout`:
  - Botão hambúrguer (`☰`) no cabeçalho.
  - Menu lateral deslizante (*drawer*) com a marca oficial **ConferCheck**, avatar do usuário, identificador `CODUSU`, links para módulos autorizados (`📦 Conferência de Saída`, `📥 Conferência de Entrada`, `🔍 Consultar Produto`, `⚙️ Gestão de Acessos`) e botão de saída.
  - Apenas módulos liberados nas permissões do usuário são renderizados na navegação.

### 4. Auto-Registro de Usuários no 1º Login & Carimbo de Acessos
- Todo usuário que realiza login é automaticamente registrado no repositório com `primeiroAcessoEm` e `ultimoAcessoEm`.
- Lista exibe data e hora do primeiro e último acesso com formatação amigável (*Hoje às HH:MM* ou data completa).

### 5. Estrutura Base da Conferência de Entrada (Recebimento) (`/recebimento`)
- Nova rota `/recebimento` com `RecebimentoPage`.
- Layout integrado ao design system (hero informativo, toolbar de busca por nota fiscal/fornecedor, contadores de status e lista de cartões).

### 6. Diretriz Obrigatória: Disposição em Cards no Mobile e Tablet (≤ 1024px)
- **Regra Institucional:** Todas as telas e listagens de dados em dispositivos móveis, coletores de dados e tablets DEVEM obrigatoriamente dispor as informações em **formato de CARDS**, assim como na Conferência de Saída e Gestão de Acessos.
- Tabelas horizontais (`<table>`) com scroll lateral excessivo são permitidas exclusivamente no Desktop (`> 1024px`).
- No Mobile/Tablet (`≤ 1024px`), as tabelas são ocultadas via CSS e substituídas por cards verticais limpos, com badges de status/métricas bem visíveis e controles/botões com área ampla de toque para dedos e leitores coletores.

---

# Handoff — Sessão 2026-10-07

## Funcionalidades e Ajustes Implementados

### 1. Bloqueio de Colagem (Ctrl+V) no Campo de Código de Barras
- **Objetivo**: Evitar que operadores copiem e colem códigos de barras para burlar a conferência física, garantindo a utilização do leitor de código de barras ou digitação.
- **Frontend**:
  - `frontend/src/presentation/components/Campo/Campo.tsx`:
    - Adicionadas as propriedades `bloquearColar?: boolean` (ativada automaticamente se `variant="scanner"`) e `onTentativaColar?: () => void`.
    - Bloqueio de `onPaste`, `onDrop`, `onContextMenu` (botão direito desativado) e atalhos via `onKeyDown` (`Ctrl+V`, `Cmd+V`, `Shift+Insert`).
  - `frontend/src/presentation/pages/ConferenciaProdutos.tsx`:
    - Campo de código de barras configurado com proteção anti-colagem.
    - Disparo de som de erro (`tocarAlertaErro()`) e mensagem explicativa ao operador caso haja tentativa de colar.
- **Compatibilidade com Leitores Físicos**: Leitores de código de barras (coletores/pistolas USB) funcionam via emulação de teclado (HID) e não disparam eventos de colagem, mantendo a operação normal.

### 2. Leitor de Código de Barras via Câmera (Mobile/Tablet) e PWA
- **Leitor de Câmera Fluido:**
  - Biblioteca `html5-qrcode` com suporte a EAN-13, EAN-8, Code 128, Code 39, QR Code.
  - Aceleração nativa por GPU do Chrome Android (Barcode Detection API).
  - Componente `ModalCameraScanner` com mira visual, animação laser e botão de lanterna (flash).
  - Regra de responsividade: botão de acionamento exibido apenas em Tablet/Mobile ($\le$ 1024px) e oculto em desktop.
  - Ao ler: aciona feedback tátil (vibração), atualiza o campo e submete a conferência automaticamente.
- **PWA (Instalação via Chrome):**
  - Criação de `manifest.webmanifest`, meta tags mobile e Service Worker (`sw.js`).
  - Permite adicionar o app à tela inicial do celular com execução em tela cheia (*standalone*).

### 3. Cards Responsivos para Mobile e Tablet na Conferência de Produtos
- **Objetivo**: Garantir legibilidade e usabilidade das listas de itens pendentes e conferidos em dispositivos móveis e tablets, substituindo a tabela horizontal por cards compactos e informativos.
- **Frontend**:
  - `frontend/src/styles/global.css`:
    - Adicionada classe `.itens-tabela-wrapper`: visível em desktops (`> 1024px`) e oculta via `@media (max-width: 1024px)`.
    - Adicionada classe `.itens-cards-mobile`: oculta em desktops e exibida em layout de cards flexíveis em tablets e celulares ($\le$ 1024px).
    - Estilização completa de `.item-card-mobile`, `.item-card-header`, `.item-card-foto`, `.item-card-info`, `.item-card-metrics`, `.item-card-metric` e `.item-card-actions`.
  - `frontend/src/presentation/pages/ConferenciaProdutos.tsx`:
    - Aba de Pendentes: tabela original preservada em desktop; em mobile exibe cards com foto ampliada ao toque, descrição, código do produto, badge de status (Pendente/Parcial), lote, quantidade pedida e conferida.
    - Aba de Conferidos: tabela original preservada em desktop; em mobile exibe cards com foto, descrição, data/hora da conferência, lote, unidade, quantidade conferida em destaque verde e botão de estorno integrado.

---

# Handoff — Sessão 2026-09-28

## Funcionalidades e Ajustes Implementados

### 1. Quantidade Conferida no Volume Padrão (`QTDCONFVOLPAD`)
- **Backend:** Em `backend/src/application/use-cases/conferencias/consulta/ListarItensConferidosUseCase.ts`, a consulta direta na tabela `TGFCOI2` foi alterada para selecionar estritamente o campo `COI.QTDCONFVOLPAD` no lugar de `COI.QTDCONF`.
- **Objetivo:** Refletir a quantidade conferida na unidade/volume padrão cadastrado no Sankhya.

### 2. Coluna Unidade (`CODVOL`) na Tabela de Itens Conferidos
- **Frontend:**
  - `frontend/src/presentation/pages/ConferenciaProdutos.tsx`:
    - Adicionado cabeçalho `<th>Unidade</th>` e célula `<td className="num-cell">{item.codVol || '-'}</td>` posicionada após a coluna `Lote`.
    - No modal de confirmação de estorno de item, incluída a exibição do campo `Unidade` quando preenchido.
- **Backend:** Aplicado `trim()` no campo `CODVOL` retornado da consulta `TGFCOI2` para remover espaços em branco de tipos CHAR do Oracle.

---

# Handoff — Sessão 2026-09-25

## Funcionalidades Implementadas

### Notificação via Webhook Discord (Pendência de Estoque)
- **Objetivo**: Permitir que conferentes notifiquem a equipe via Discord quando um pedido em andamento possui itens pendentes e sem estoque suficiente.
- **Formato da Mensagem**:
  ```text
  Usuário SNK: {usuario}
  Razão Social: {razaoSocial}
  Pedido : {pedido}
  OC : {ordemCarga}
  Itens Pendentes:
  {qtd} UN > {descrProd} / COD: {codProd}
  Estoque: NÃO ENCONTRADO
  AGUARDANDO RESPOSTA PARA SEGUIR O PROCESSO DE FINALIZAÇÃO !!!
  ```
- **Fluxo do Usuário**:
  1. Na lista de conferências, cards com status "Em andamento" exibem um botão de ação com ícone do Discord.
  2. Ao clicar, abre o modal de confirmação com a prévia dos dados consultados no Sankhya (cabeçalho da nota em `TGFCAB` + `TGFPAR`, e cálculo de pendentes baseado em `QTDNEG - QTDCONF`).
  3. O operador pode revisar a mensagem e confirmar o disparo ou cancelar.
- **Tratamento de Configuração**:
  - `DISCORD_WEBHOOK_URL` adicionado a `backend/.env.example` e `backend/src/infrastructure/config/env.ts`.
  - Caso a URL não esteja preenchida, o sistema informa amigavelmente no modal sem interromper a execução do backend.
- **Backend**:
  - `backend/src/infrastructure/discord/DiscordWebhookAdapter.ts`: Adapter para envio de mensagens e embeds via axios.
  - `backend/src/application/use-cases/conferencias/operacao/NotificarDiscordUseCase.ts`: Consulta dados, formata texto e despacha para o webhook.
  - `backend/src/presentation/http/controllers/ConferenciasController.ts` & rotas: `POST /api/conferencias/previa-discord` e `POST /api/conferencias/notificar-discord`.
- **Frontend**:
  - `ModalNotificarDiscord` exibindo prévia estilizada no padrão de cards do Discord.
  - Botão integrado no card de conferências em andamento (`ListaConferencias.tsx`).

---

# Handoff — Sessão 2026-09-24

## Funcionalidades Implementadas

### 1. Estorno / Exclusão de Itens Conferidos
- **Serviço Sankhya:** Integração com `DatasetSP.removeRecord` em `/mge/` para a entidade `DetalhesConferencia` (`TGFCOI2`), passando o listener `br.com.sankhya.modelcore.crudlisteners.DetalhesConferenciaCRUDListener` para recomposição de saldos no Sankhya.
- **Backend:**
  - `backend/src/application/use-cases/conferencias/operacao/ExcluirItemConferidoUseCase.ts`: Use case com payload `DatasetSP.removeRecord`.
  - `backend/src/application/use-cases/conferencias/consulta/ListarItensConferidosUseCase.ts`: Consulta de `TGFCOI2` com join em `TGFPRO`.
  - `backend/src/presentation/http/controllers/ConferenciasController.ts` e `backend/src/presentation/http/routes/conferenciasRoutes.ts`: Endpoint `POST /api/conferencias/excluir-item-conferido` e inclusão de `itensConferidos` em `conferirItem`.
  - `backend/src/container.ts`: Injeção de dependência atualizada.
- **Frontend:**
  - `frontend/src/domain/models/Conferencia.ts`: Interface `ItemConferidoDetalhe` e tipos de resposta.
  - `frontend/src/domain/ports/IConferenciaService.ts` e `frontend/src/infrastructure/api/ConferenciaApiService.ts`: Métodos `listarItensConferidos` e `excluirItemConferido`.
  - `frontend/src/application/hooks/useConferenciaAtiva.ts`: Estado reativo `itensConferidos`, recarregamento automático e método `excluirItemConferido`.
  - `frontend/src/presentation/pages/ConferenciaProdutos.tsx`: Aba "Itens Conferidos" renderizando os registros individuais de bip com horário, botão "Estornar" e modal de confirmação com a pergunta: *"Deseja estornar este item?"*.
  - `frontend/src/styles/global.css`: Estilização do botão `.btn-estornar-item`.
- **Fix no carregamento ao reabrir pedido:** Ajustado endpoint `POST /api/conferencias/itens-conferidos` para exigir apenas `nuConf` (consulta direta em `TGFCOI2`), garantindo que a lista de itens conferidos carregue corretamente ao reabrir pedidos em andamento.

### 2. Regra de Exibição de Quantidades na Conferência Cega
- `backend/src/application/use-cases/conferencias/consulta/ListarItensPedidoUseCase.ts`:
  - A quantidade pedida (`qtdPed`) é exibida ao conferente na coluna "Pedido" se:
    1. `(PESOLIQ >= 7.5 || PESOBRUTO >= 7.5) && qtdPed > 10` (itens pesados de alta quantidade); OU
    2. `USOPROD = 'V'` (produtos configurados com uso 'V').

---

# Handoff — Sessão 2026-08-12

## Commit enviado

`07de7b0` → `origin/master` (push OK)

```
feat: fluxo de recontagem com reconferencia total por item
```

### Arquivos no commit (8)
- `PROGRESSO.md` (+50) — atualiza pendências, adiciona seção de otimizações
- `SANKHYA_API_GUIDE.md` (+153) — nova seção 15 "Performance — Lições aprendidas"
- `backend/src/application/use-cases/conferencias/consulta/GetConferenciaSaidaUseCase.ts` (+3)
  - mapeia status `'RR'` além de `'R'`
  - remove filtro hardcoded `CODPARC NOT IN (32698, 1502, 37104, 791)`
- `backend/src/application/use-cases/conferencias/consulta/ListarItensPedidoUseCase.ts` (+59)
  - distribuição de qtdConf troca de proporcional (`Math.round`) para **fill-first** por SEQUENCIA
  - bug anterior: bipar 1 und com 2 sequencias iguais atribuía qtdConf=1 a ambas
- `frontend/src/domain/models/Conferencia.ts` (+4) — campos `isRecontagem`, `tipoContagem`
- `frontend/src/presentation/pages/ConferenciaProdutos.tsx` (+123) — fluxo de recontagem no front
- `frontend/src/presentation/pages/ListaConferencias.tsx` (+8) — passa `statusConferencia` via navigate state
- `frontend/src/styles/global.css` (+52) — estilos de recontagem (badge, alerta, destaque de linha)

## Lógica do fluxo de recontagem (resumo)

1. Lista passa `statusConferencia` para a tela de conferência via `navigate(..., { state })`.
2. Tela captura **uma vez** ao carregar se é recontagem:
   - status repassado pela lista, OU
   - `isRecontagem === 'true'` retornado pelo Sankhya ao iniciar.
3. Snapshot do `qtdConf` de cada item é tirado no primeiro render (apenas em recontagem).
4. Itens com qtdConf inicial > 0 recebem:
   - badge "Reconferir total" na coluna de status
   - destaque rose na linha (`.row-recontagem`)
   - sobem no topo da lista de pendentes
5. Na **primeira bipagem** de um item "reconferir total":
   - subtrai o snapshot: `qtdFinal = qtdInformada - snapshotDoItem`
   - marca a sequência como zerada em `itensZerados` (Set)
6. Bips seguintes ao mesmo item somam normalmente.
7. Sem recontagem: comportamento idêntico ao de antes (só "Parcial" sobe).

## Deploy no servidor — problema e solução

### Sintoma
`git pull` no server não trouxe o `07de7b0`. HEAD ficou em `95af746`.

### Causa
Servidor tinha modificação local não commitada em
`backend/src/application/use-cases/conferencias/consulta/GetConferenciaSaidaUseCase.ts`.
Isso bloqueou o fast-forward do pull (git avisa: "behind by 1, can be fast-forwarded"
mas working tree suja).

### Resolução aplicada
```bash
cd /opt/conferencia
git stash
git pull --ff-only origin master     # HEAD → 07de7b0
git stash drop                       # descartado (já estava no commit)
docker-compose up -d --build --force-recreate frontend
```

Front rebuildado, alterações no ar.

## Pendências / Próximos passos

- [ ] **Testar recontagem em produção** — validar que o snapshot + subtração zera corretamente
      o qtdConf no Sankhya e o badge "Reconferir total" aparece só para itens que tinham saldo.
- [ ] Confirmar se status `'RR'` existe de fato no Sankhya ou se foi só especulação
      (adicionado defensivamente no DECODE do SQL).
- [ ] Avaliar impacto da remoção do filtro `CODPARC NOT IN (32698, 1502, 37104, 791)`
      — pode ter feito esses parceiros reaparecerem na fila. Verificar com o usuário.
- [ ] Monitorar `timeQuery` da query de fila de conferência após otimizações anteriores.
- [ ] Leitor de código de barras via câmera (Capacitor plugin).
- [ ] Tratamento de divergências (tela de recontagem dedicada, fora o fluxo inline atual).

## Notas operacionais

- Deploy requer `--build` no `docker-compose up` para o Vite recompilar a SPA.
  Sem `--build`, o Compose reutiliza a imagem antiga e as mudanças não aparecem.
- Servidor tem working tree suja fácil (alguém edita arquivos lá direto?). Vale
  considerar `git config pull.ff only` no server para evitar merge acidental,
  ou documentar o stash-pull como procedimento padrão de atualização.
- Browser cache pode mascarar o deploy: hard refresh (`Ctrl+Shift+R`) ou aba
  anônima para validar.
