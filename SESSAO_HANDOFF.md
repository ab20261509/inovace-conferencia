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
