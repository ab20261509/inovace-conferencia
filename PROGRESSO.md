# Progresso do Projeto — Conferência de Saída Sankhya

## O que foi construído

### Backend (Clean Architecture)
- **Stack:** Node.js + Express + TypeScript
- **Arquitetura:** Domain → Application → Infrastructure → Presentation
- **Gateway:** Integração completa com API Sankhya (mge + mgecom)
- **Hot reload:** `npm run dev` com `node --watch`

### Frontend (React)
- **Stack:** React 19 + Vite + TypeScript
- **Arquitetura:** domain/application/infrastructure/presentation
- **Visual:** Estilo premium (paleta slate/orange, rounded, sombras)
- **Capacitor:** Configurado para gerar app Android

---

## Funcionalidades Implementadas

### Login
- Login via `MobileLoginSP.login` (credenciais Sankhya)
- JWT gerado pelo backend com codUsu do conferente
- Proteção de rotas no frontend

### Lista de Conferências
- Consulta SQL complexa com JOINs (DbExplorerSP)
- Filtros dinâmicos (auto-detecta campos, dropdown para poucos valores)
- Tags de filtro ativo com remoção individual
- **Persistência de filtros** no localStorage (mantêm ao navegar entre páginas)
- **Reaplicação automática de filtros** ao atualizar a lista ou retornar de uma conferência
- **Limpeza automática de filtros** no logout
- Cards compactos com status colorido (azul=pendente, amarelo=andamento, vermelho=recontagem)
- Duplo clique para abrir conferência

### Tela de Conferência
- Iniciar conferência via `ConferenciaSP.salvarCabecalhoConferencia`
- Scanner: Enter confere direto (sem precisar clicar botão)
- **Header compacto** com espaçamentos reduzidos para maximizar área útil
- **Cards de resumo integrados** no header (Total, Conferidos, Pendentes)
- **Sistema de abas** para alternar entre itens pendentes e conferidos
- **Coluna de lote** em ambas as tabelas (pendentes e conferidos)
- Lista separada: Pendentes (parciais primeiro) + Conferidos (OK primeiro)
- **Centralização das colunas**: Lote, Pedido, Conferido, Status
- Itens com imagem do produto (via .dbimage do Sankhya)
- Ampliar imagem ao clicar
- Modal de finalização com campo de volumes
- **Campo quantidade inteligente**: inicia com 1, envia 1 se vazio, reseta para 1 após conferência
- Suporte a itens duplicados (mesmo CODPROD, lotes diferentes) via SEQUENCIA
- Itens conferidos nunca somem (merge inteligente com dados do Sankhya)

### Melhorias de Interface e UX
- **Header compacto da conferência**: espaçamentos reduzidos para maximizar área útil
- **Cards de resumo integrados**: Total, Conferidos e Pendentes no header (não em Painel separado)
- **Sistema de abas**: alternância rápida entre itens pendentes e conferidos
- **Coluna de lote**: exibição do campo CONTROLE em ambas as tabelas
- **Centralização de colunas**: Lote, Pedido, Conferido e Status centralizados
- **Campo quantidade inteligente**: inicia com 1, envia 1 se vazio, reseta para 1 após conferência
- **Persistência de filtros**: filtros dinâmicos e status selecionado salvos no localStorage
- **Limpeza de filtros**: botão "Limpar tudo" e remoção automática no logout

### Permissões / Conferência cega
- `backend/src/domain/permissions.ts` com `podeVerCamposSensiveis()` (regra do servidor)
- `frontend/src/domain/permissions.ts` espelha a lista (controle visual adicional)
- Lista de privilegiados: `['SUP', 'ANTONY', 'ANTONY.B']` (comparação **exata**, sem prefixo)
- Para usuários comuns, os campos sensíveis são **removidos na origem** (backend), não apenas escondidos na tela:
  - `qtdPed`, `codBarra` e `referencia` vêm `null` no JSON
  - impedem DevTools e bundle em cache de exibi-los
- O **status** do item (`pendente` / `parcial` / `completo`) é **calculado no backend**, permitindo que o frontend organize as listas sem precisar da quantidade pedida
- **Regra de exibição para itens pesados em conferência cega**: caso o produto tenha peso $\ge$ 7.5 kg (`PESOLIQ >= 7.5` ou `PESOBRUTO >= 7.5`) e a quantidade do item no pedido for maior que 10 (`qtdPed > 10`), a quantidade pedida é enviada e exibida na coluna "Pedido" para auxiliar o operador na conferência e manuseio de carga pesada.

### Estorno de Itens Conferidos
- **Aba Itens Conferidos com dados reais**: consulta detalhada em `TGFCOI2` (`DetalhesConferencia`) unida com `TGFPRO`.
- Exibe lote (`CONTROLE`), quantidade conferida (`QTDCONF`), data/hora da alteração (`DHALTER`) e botão de ação.
- **Botão Estornar**: presente em cada registro conferido.
- **Modal de confirmação**: solicita confirmação (*"Deseja estornar este item?"*) apresentando o produto, lote e quantidade a estornar.
- **Integração Sankhya**: executa `DatasetSP.removeRecord` com listener `DetalhesConferenciaCRUDListener`, atualizando automaticamente saldos, divergências e listas na tela.

### Consulta de Produtos
- Botão **"Consultar Produto"** ao lado do nome do usuário na lista de conferências
- Modal responsivo (ocupa a tela toda, adaptando largura/altura)
- Busca por código ou descrição (TGFPRO via DbExplorerSP), aceita 1+ caractere
- Botão **"Buscar"** ao lado do campo (ou Enter) — não busca mais a cada tecla digitada
- Cada produto tem um botão **"Estoque"** que expande uma tabela inline com:
  - Empresa, Local, Lote (CONTROLE), Saldo
  - **Data de fabricação** (DTFABRICACAO) e **validade** (DTVAL) da TGFEST
  - Linha de total somando todos os saldos
- Backend: `GET /api/produtos?q={termo}&limite={n}` e `GET /api/produtos/estoque/{codProd}`

### Alertas sonoros e visuais
- `frontend/src/infrastructure/audio/alertas.ts` com `tocarAlertaErro()` e `tocarAlertaSucesso()`
- Som sintetizado pela Web Audio API (sem arquivo de áudio): não pesa no
  bundle, dispensa request de rede e funciona offline no coletor
- **Erro:** dois bipes descendentes (660 Hz → 440 Hz, ~0,5 s) + `navigator.vibrate` no Android
- **Sucesso:** dois bipes ascendentes curtos (880 → 1175 Hz, ~0,19 s) + vibração leve de 60ms
- **Feedback visual de sucesso:** overlay central com imagem do produto (240x240) + borda verde
  + selo de check, exibido por 1,2s. `pointer-events: none` para não roubar o foco do scanner
- Disparado nos `catch`/`try` de `executarConferencia`, e não num
  `useEffect` sobre `error`: se o operador repetir a mesma leitura recusada, a
  string de erro não muda e o efeito não voltaria a disparar
- Falha em silêncio se a API não existir no dispositivo

### Escrita no Sankhya
- `DatasetSP.save` para atualizar campos (AD_USUARIOCONF no CabecalhoNota)
- `DatasetSP.removeRecord` para estornar itens conferidos (`DetalhesConferencia`)
- `ConferenciaSP.salvarItemConferido` para conferir itens
- `ConferenciaSP.finalizarConferencia` para finalizar
- `ConferenciaSP.excluirConferencia` para cancelar

---

## Serviços Sankhya Mapeados

### Endpoint `/mge/` (CRUDServiceProvider, DbExplorerSP, DatasetSP)
| Serviço | Uso |
|---|---|
| CRUDServiceProvider.loadRecords | Consultas com JOIN |
| CRUDServiceProvider.loadRecord | Registro único |
| DbExplorerSP.executeQuery | SQL complexo (SELECT) |
| DatasetSP.save | Atualizar campos (UPDATE) |
| DatasetSP.removeRecord | Excluir registros / estornar itens conferidos |
| MobileLoginSP.login | Autenticação de usuário |

### Endpoint `/mgecom/` (ConferenciaSP)
| Serviço | Uso |
|---|---|
| salvarCabecalhoConferencia | Iniciar conferência |
| listarItensPedido | Itens com divergência |
| getProduto | Buscar por código de barras |
| salvarItemConferido | Conferir item |
| getProdutosDivergentes | Divergências |
| finalizarConferencia | Finalizar |
| excluirConferencia | Cancelar |
| salvarVolumeSimplificado | Registrar volume |
| cortar | Cortar nota |
| getApenasExcluidosConferencia | Verificar excluídos |
| buscaIdentificador | Lote/serial |
| listarItensConferidos | Itens já conferidos |

---

## Descobertas Técnicas Importantes

1. **UPDATE:** Usar `DatasetSP.save` (não CRUDServiceProvider.saveRecord)
2. **Imagens:** `GET /gateway/v1/mge/Produto@IMAGEM@CODPROD={id}.dbimage`
3. **ConferenciaSP:** Usa `/mgecom/` (não `/mge/`)
4. **listarItensPedido:** Retorna apenas divergentes (itens conferidos somem)
5. **DbExplorerSP:** Apenas SELECT (não aceita UPDATE/INSERT)
6. **Sandbox:** Não permite escrita em TGFCON2, TGFCAB via CRUDServiceProvider
7. **Persistência de estado:** localStorage ideal para filtros e preferências de usuário
8. **Abas vs Scroll:** Interface com abas mais eficiente que scroll longo em coletores

---

## Otimizações de Performance

### Cache de token OAuth com mutex
- **Problema:** O token era re-autenticado em **todas** as chamadas ao Sankhya. A margem de
  expiração (5 min no `Token.isExpired()`) somada à subtração dupla no `authenticate()` fazia
  o token parecer sempre expirado. Cada bipagem fazia **3 autenticações** desnecessárias.
- **Correção:** Removida a subtração dupla; a margem do `isExpired()` foi zerada (o retry em
  401 já é o safety net). Adicionado mutex (`authPromise`) para que chamadas concorrentes
  reutilizem a mesma autenticação.
- **Impacto:** De 3 auths por bipagem para 1 auth a cada ~30 min.

### Bipagem com delta em 1 request
- **Problema:** Cada bipagem fazia 2 requests HTTP ao backend: `POST /conferir-item` + `POST /itens-pedido`.
- **Correção:** O endpoint `/conferir-item` agora retorna `{ resultado, itens }` — salva o item
  e busca a lista atualizada internamente. O hook aplica o patch local sem um segundo request.
- **Impacto:** 50% menos round-trips por bipagem.

### Paralelização no ListarItensPedidoUseCase
- **Problema:** Dentro do `/conferir-item` (e `/itens-pedido`), as duas consultas ao Sankhya
  (`DbExplorerSP.executeQuery` para os itens + `ConferenciaSP.listarItensPedido` para divergências)
  rodavam em série.
- **Correção:** Substituído por `Promise.all` — as duas chamadas independentes rodam em paralelo.
- **Impacto:** ~40% menos tempo no uso de caso de listagem (de 2 saltos para 1 salto paralelo).

### Query SQL sem subqueries correlacionadas
- **Problema:** A query da fila de conferência tinha `SELECT COUNT(DISTINCT CODPROD)` como
  subquery correlacionada (rodava uma vez por linha do TGFCAB) e `EXISTS` separado em TGFITE.
- **Correção:** Mergeado em `INNER JOIN` com subquery agrupada — roda uma vez só. Removidos
  JOINs não utilizados (`TSIUSU`, `TGFORD`). O JOIN de rota foi agrupado com `GROUP BY` para
  evitar duplicação de linhas.
- **Impacto:** A ser confirmado pelo `timeQuery` do Sankhya.

---

## Pendências / Próximos Passos

- [x] Deploy em Docker no servidor Linux — ver **[DEPLOY.md](DEPLOY.md)**
- [x] Som/vibração no **erro** de conferência
- [x] Som/vibração + feedback visual no **sucesso** da conferência
- [x] Ocultação de campos sensíveis no backend (não só visual)
- [x] Consulta de produtos com saldo de estoque por empresa/local/lote
- [x] Interface otimizada da tela de conferência (compactação, abas, lote, filtros persistentes)
- [x] Otimização de performance da bipagem (cache de token, delta em 1 request, paralelização)
- [ ] Testar em ambiente de produção (escrita na TGFCON2)
- [ ] Leitor de código de barras via câmera (Capacitor plugin)
- [ ] Tratamento de divergências (tela de recontagem)
- [ ] Histórico de conferências
- [ ] Relatório de conferência finalizada
- [ ] Empacotar frontend como APK (Capacitor)
- [ ] TLS / proxy reverso por hostname (Zabbix ocupa 80 e 443 no servidor)

---

## Como Rodar

### Desenvolvimento (local)

```bash
# Backend
cd backend
npm install
npm run dev          # Hot reload na porta 3001

# Frontend
cd frontend
npm install
npm run dev          # Vite na porta 5173 (proxy para 3001)
```

Antes de commitar mudanças no frontend, validar a tipagem — o build da imagem
Docker roda `tsc -b` e falha se houver erro de tipo:

```bash
cd frontend && npx tsc -b
```

### Produção (Docker no servidor Linux)

```bash
cd /opt/conferencia
git pull
docker-compose up -d --build
```

Aplicação em `http://IP_DO_SERVIDOR:8080`. Detalhes de ambiente, variáveis,
verificação e problemas já resolvidos em **[DEPLOY.md](DEPLOY.md)**.

## Documentação do projeto

| Documento | Conteúdo |
|---|---|
| [SANKHYA_API_GUIDE.md](SANKHYA_API_GUIDE.md) | Conexão, consulta e escrita na API Sankhya |
| [DEPLOY.md](DEPLOY.md) | Deploy Docker no servidor, operação e troubleshooting |
| [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) | Clean Architecture do backend |
| [backend/AUTH_API.md](backend/AUTH_API.md) | Endpoints de autenticação |
| [backend/CONFERENCIA_API.md](backend/CONFERENCIA_API.md) | Endpoints de conferência |
| [backend/PRODUTO_API.md](backend/PRODUTO_API.md) | Endpoints de consulta de produtos e estoque |
| [backend/CRUD_API.md](backend/CRUD_API.md) | Endpoints CRUD genéricos |
| [frontend/LOTTIE.md](frontend/LOTTIE.md) | Padrão de uso das animações Lottie |
| [frontend/MOBILE.md](frontend/MOBILE.md) | Build mobile com Capacitor |

## Git
Repositório: `https://github.com/Antonybarbosa/inovace-conferencia.git` (privado)
Branch: `master`
