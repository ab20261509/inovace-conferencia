# Deploy — Conferência de Saída Sankhya (Docker)

Registro do deploy em produção interna, incluindo os problemas encontrados no
caminho e como foram resolvidos. Serve tanto para refazer o ambiente do zero
quanto para diagnosticar quando algo parar.

---

## 1. Ambiente

| Item | Valor |
|---|---|
| Servidor | HP ProLiant MicroServer Gen8 (`integrador-ProLiant-MicroServer-Gen8`) |
| SO | Linux (Ubuntu) |
| Diretório do projeto | `/opt/conferencia` |
| Orquestração | `docker-compose` v1 (schema máximo suportado: **3.3**) |
| Repositório | `https://github.com/Antonybarbosa/inovace-conferencia.git` (branch `master`) |
| URL da aplicação | `http://IP_DO_SERVIDOR:8080` |

O servidor **não é dedicado** a esta aplicação: já roda um container
`some-zabbix-appliance` ocupando as portas 80, 443 e 10051. Isso determinou a
escolha da porta 8080, detalhada na seção de problemas.

---

## 2. Arquitetura do deploy

Dois containers na rede default criada pelo Compose:

```
Navegador / Coletor Mobile
   │
   │  http://IP:8080 (ou FRONTEND_PORT)
   ▼
┌─────────────────────────────┐
│ conferencia-frontend        │   nginx:alpine
│  - serve a SPA (build Vite) │
│  - proxy /api/  → backend   │
│  - proxy /auth/ → backend   │
└──────────────┬──────────────┘
               │  http://backend:3001   (DNS interno do Compose)
               ▼
┌─────────────────────────────┐
│ conferencia-backend         │   node:22-alpine
│  - BFF Express (porta 3001) │
└──────────────┬──────────────┘
               │  HTTPS
               ▼
      Gateway Sankhya
```

Detalhe relevante: o frontend publica diretamente na porta `8080` (configurável via `FRONTEND_PORT`), sem conflitar com o Zabbix nas portas 80/443.

---

## 3. Arquivos que compõem o deploy

Todos versionados no repositório:

| Arquivo | Papel |
|---|---|
| `docker-compose.yml` | Define os dois serviços (backend e frontend) |
| `backend/Dockerfile` | Build multi-stage: compila TS, roda só com deps de produção |
| `frontend/Dockerfile` | Build multi-stage: `vite build`, resultado servido por nginx |
| `frontend/nginx.conf` | Fallback da SPA + proxy para o backend |
| `backend/.dockerignore` | Exclui `node_modules`, `dist`, `.git` |
| `frontend/.dockerignore` | Idem — **essencial**, ver seção de problemas |
| `.env.example` (raiz) | Documenta `FRONTEND_PORT` |
| `backend/.env.example` | Documenta as variáveis do backend |

`docker-compose.yml` atual:

```yaml
version: '3.3'

services:
  backend:
    build: ./backend
    container_name: conferencia-backend
    ports:
      - "3001:3001"
    env_file:
      - ./backend/.env
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: conferencia-frontend
    ports:
      - "${FRONTEND_PORT:-8080}:80"
    depends_on:
      - backend
    restart: unless-stopped
```

---

## 4. Deploy do zero

### 4.1 Pré-requisitos

```bash
docker --version
docker compose version || docker-compose --version
git --version
```

Se só `docker-compose` (com hífen) responder, você está no Compose v1 — use
`docker-compose` em todos os comandos.

### 4.2 Clonar

```bash
cd /opt
sudo git clone https://github.com/Antonybarbosa/inovace-conferencia.git conferencia
cd conferencia
```

Repositório privado: senha de conta do GitHub não funciona. Use um Personal
Access Token no lugar da senha, ou cadastre uma deploy key SSH do servidor.

### 4.3 Criar os arquivos de ambiente

Dois arquivos distintos, **ambos no `.gitignore`** (não vêm no clone e
sobrevivem a `git pull`):

```bash
# Credenciais do backend — obrigatório, o compose falha sem ele
cp backend/.env.example backend/.env
nano backend/.env
```

O `.env` da raiz (porta do frontend) é opcional: o default de 8080 já atende
este servidor. Só crie se quiser outra porta.

### 4.4 Subir

```bash
docker-compose up -d --build
```

O primeiro build baixa `node:22-alpine` e `nginx:alpine` e compila os dois
estágios. Leva alguns minutos no Gen8.

---

## 5. Variáveis de ambiente

### `backend/.env`

Lidas em `backend/src/infrastructure/config/env.ts`.

| Variável | Observação |
|---|---|
| `PORT` | Padrão 3001. Se mudar, ajuste `nginx.conf` e o compose |
| `NODE_ENV` | `production` no servidor |
| `GATEWAY_URL` | **Atenção:** o `.env.example` traz `gateway-homolog`; o ambiente em uso é `https://api.sandbox.sankhya.com.br` |
| `GATEWAY_CLIENT_ID` | Credencial do Gateway |
| `GATEWAY_CLIENT_SECRET` | Credencial do Gateway |
| `GATEWAY_X_TOKEN` | Credencial do Gateway |
| `SESSION_SECRET` | Chave de assinatura do JWT, mínimo 32 caracteres |
| `CORS_ORIGIN` | `http://IP_DO_SERVIDOR:8080` |
| `LOG_LEVEL` | `info` em produção |

`GATEWAY_URL`, as três credenciais e `SESSION_SECRET` são validadas no boot.
Se faltarem, o backend **sobe mesmo assim** e apenas loga
`⚠️ Variáveis de ambiente não configuradas: ...`. O sintoma aparece depois,
como falha nas chamadas ao Sankhya. Vale conferir o log após o primeiro `up`.

### `.env` da raiz

| Variável | Padrão | Uso |
|---|---|---|
| `FRONTEND_PORT` | `8080` | Porta do host que publica a SPA |

Consumida por substituição de variável do Compose, não entra em nenhum
container. O arquivo é **opcional**: o default de 8080 já é a porta que
funciona neste servidor, justamente para o deploy não depender dele.

---

## 6. Verificação

```bash
docker-compose ps
docker-compose logs backend | tail -30
curl -I http://localhost:8080/          # SPA  → 200
curl http://localhost:3001/health       # backend → JSON de status
```

Esperado: os dois containers em `Up` e, no log do backend, o banner
`Backend BFF iniciado com sucesso / Porta: 3001`.

**Cuidado com o caminho do health check.** A rota é `/health`, registrada na
raiz em `backend/src/presentation/http/routes/index.ts`. Ela **não** é alcançável
pela porta 8080, porque o `nginx.conf` só encaminha `/api/` e `/auth/`:
`http://localhost:8080/health` cai no fallback da SPA e devolve o
`index.html`, e `http://localhost:8080/api/health` chega ao Express como
`/api/health` e resulta em 404. Para validar o backend, use a porta 3001
direto, como acima.

Para validar o caminho completo navegador → nginx → backend, o teste prático é
fazer login pela interface: a chamada sai em `/auth/...` e atravessa o proxy.

Firewall, se ativo:

```bash
sudo ufw allow 8080/tcp
```

---

## 7. Operação

### Atualizar para a versão mais recente

```bash
cd /opt/conferencia
git pull
docker-compose down
docker-compose up -d --build
```

O `down` antes do `up` é recomendado: sem ele o Compose v1 pode reaproveitar um
container antigo com configuração obsoleta, como aconteceu no caso 8.2.1. São
poucos segundos de indisponibilidade e evita diagnóstico desnecessário.

Os arquivos `.env` não são tocados pelo `git pull`.

### Comandos do dia a dia

```bash
docker-compose logs -f              # logs dos dois serviços
docker-compose logs -f backend      # só o backend
docker-compose restart backend      # aplicar mudança no backend/.env
docker-compose ps                   # status
docker-compose down                 # derrubar
```

Ambos os serviços usam `restart: unless-stopped`, então voltam sozinhos após
reboot do servidor ou restart do daemon do Docker.

---

## 8. Problemas encontrados e como foram resolvidos

Esta seção é o principal motivo deste documento existir.

### 8.1 `Version in "./docker-compose.yml" is unsupported`

**Sintoma**

```
ERROR: Version in "./docker-compose.yml" is unsupported.
... Either specify a supported version (e.g "2.2" or "3.3") ...
```

**Causa** O arquivo declarava `version: '3.8'`, mas o servidor tem o
`docker-compose` v1 (script Python descontinuado desde 2023), que entende o
schema apenas até 3.3.

**Solução** Baixado para `version: '3.3'` (commit `027c2ad`). Nenhum recurso
foi perdido: os serviços usam só `build`, `container_name`, `ports`,
`env_file`, `depends_on` e `restart`, todos presentes no 3.3. O valor também é
aceito pelo Compose v2, que apenas emite aviso de chave obsoleta.

**Recomendado** Migrar para o plugin v2, mais robusto — o v1 combinado com
engines Docker recentes produz erros obscuros como
`KeyError: 'ContainerConfig'` em rebuilds:

```bash
sudo apt update && sudo apt install docker-compose-plugin
docker compose version
```

### 8.2 Frontend com `Exit 128` e log vazio

**Sintoma** `docker-compose ps` mostrava o backend `Up` e o frontend
`Exit 128`. `docker logs conferencia-frontend` não retornava nenhuma linha.

**Diagnóstico** O log vazio foi a pista: se fosse erro de sintaxe no
`nginx.conf`, o nginx imprimiria `[emerg]`. E como o backend, também Alpine,
rodava normalmente, o ambiente do host estava descartado. A mensagem real veio
de:

```bash
docker inspect conferencia-frontend --format '{{.State.ExitCode}} {{.State.Error}}'
```

```
128 failed to set up container networking: driver failed programming external
connectivity on endpoint conferencia-frontend: Bind for 0.0.0.0:80 failed:
port is already allocated
```

**Causa** O container nunca chegou a iniciar. A porta 80 do host já estava
tomada pelo `some-zabbix-appliance`:

```bash
docker ps --format '{{.Names}}\t{{.Ports}}'
# some-zabbix-appliance   0.0.0.0:80->80/tcp, 0.0.0.0:10051->10051/tcp, 443/tcp
```

**Solução** Como o Zabbix é monitoramento ativo e não deveria ser desligado, a
porta publicada passou a ser configurável (commit `f559357`):

```yaml
ports:
  - "${FRONTEND_PORT:-80}:80"
```

No servidor:

```bash
echo "FRONTEND_PORT=8080" > .env
docker-compose up -d
```

O padrão segue 80, então nada muda para quem não define a variável. A sintaxe
com valor default exige Compose 1.11+; se a substituição falhar, basta definir
a variável explicitamente, que aí o default não é usado.

**Aprendizado** `Exit 128` no Compose costuma indicar falha ao **criar** o
container, não erro da aplicação. Nesses casos `docker logs` vem vazio e o
diagnóstico está em `docker inspect ... .State.Error`.

### 8.2.1 Reincidência: `Cannot restart container ... Bind for 0.0.0.0:80 failed`

**Sintoma** Depois de um `git pull`, o frontend voltou a falhar tentando a
porta 80, mesmo com `FRONTEND_PORT=8080` já configurado antes:

```
ERROR: for conferencia-frontend  Cannot restart container 70e55fc7...:
Bind for 0.0.0.0:80 failed: port is already allocated
```

**Causa** A palavra **restart** na mensagem é a pista. O Compose não recriou o
container, tentou reaproveitar o existente, que tinha `80:80` gravado desde a
primeira tentativa. Isso acontece quando a substituição de `FRONTEND_PORT` não
resolve: o Compose calcula 80, esse valor coincide com a configuração do
container antigo, ele conclui que nada mudou e apenas dá restart no container
velho. Ou seja, o `.env` da raiz deixou de ser lido — arquivo ausente, ou
comando rodado fora de `/opt/conferencia`.

**Diagnóstico**

```bash
cd /opt/conferencia
cat .env                # o arquivo existe? tem FRONTEND_PORT?
docker-compose config   # mostra o YAML com as variáveis já substituídas
```

Se `docker-compose config` exibir `- 80:80`, a variável não está chegando.

**Solução** Duas mudanças, uma imediata e uma definitiva.

Imediata: forçar a remoção do container velho, para o Compose criar um novo com
a configuração atual em vez de reciclar o antigo.

```bash
docker-compose down
docker-compose up -d --build
```

Definitiva: o default do compose passou a ser **8080** em vez de 80. Como neste
servidor a 80 é permanentemente do Zabbix, defaultar para 80 só criava
armadilha. Agora o deploy funciona mesmo que o `.env` da raiz não exista.

**Aprendizado** `docker-compose down` antes do `up` resolve toda a classe de
problemas de container reciclado com configuração obsoleta. E `docker-compose
config` é a forma mais rápida de ver o que o Compose realmente entendeu, em vez
de deduzir pelo erro.

### 8.3 Build do frontend quebrado por erro de tipo

**Sintoma** Não se manifestou no servidor porque foi corrigido antes, mas o
`frontend/Dockerfile` roda `npm run build`, que é `tsc -b && vite build`.
Havia dois erros de tipagem em `ListaConferencias.tsx` que faziam o `tsc -b`
falhar — e portanto **derrubariam o build da imagem**.

**Causa** `FiltrosDinamicos` declarava `T extends Record<string, unknown>`, e
`PedidoConferencia` é uma interface sem index signature, logo não satisfazia a
restrição.

**Solução** Restrição relaxada para `T extends object`, com cast interno nos
dois pontos que indexam por chave dinâmica (commit `f13eafd`).

**Aprendizado** Erro de tipo local vira falha de build de imagem. Rodar
`npx tsc -b` no frontend antes de subir evita descobrir isso no servidor.

### 8.4 `backend/.env` ausente após o clone

**Causa** `.env` está no `.gitignore`, e o `docker-compose.yml` declara
`env_file: ./backend/.env`. Sem o arquivo, o `up` falha.

**Solução** Criar a partir do `.env.example` antes do primeiro `up`, com os
valores reais do Gateway. Documentado na seção 4.3.

### 8.5 Ponto de atenção: `node_modules` do host no build

Não causou problema porque `frontend/.dockerignore` e `backend/.dockerignore`
já existem e excluem `node_modules`. Mas vale saber por que são essenciais: o
`frontend/Dockerfile` faz `npm ci` e depois `COPY . .`. Sem o `.dockerignore`,
o `node_modules` da máquina Windows sobrescreveria o instalado no container, e
binários nativos como o do esbuild/rollup — compilados para Windows —
quebrariam o `vite build` dentro do Linux.

### 8.6 Ponto de atenção: memória no build

O `vite build` pode ser morto por falta de memória em servidor com 1 GB ou
menos. Sintoma: `Killed` ou exit 137 durante o build. Solução:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

---

## 9. Pontos abertos

Nenhum destes bloqueia o uso atual, todos valem avaliação antes de ampliar o
acesso.

**Sem TLS.** A aplicação responde em HTTP puro. O login envia usuário e senha
do Sankhya no corpo da requisição, que trafega legível. Aceitável em rede
interna controlada; se for exposto para fora, precisa de certificado.

**Porta na URL.** O Zabbix ocupa 80 e 443, então não há como servir a
conferência em `https://host/` sem porta enquanto os dois convivem. A saída
seria um proxy reverso na frente de ambos, roteando por hostname
(`zabbix.dominio` e `conferencia.dominio`). O appliance do Zabbix não foi feito
para ser proxy de terceiros, então o proxy teria de ser um container novo
assumindo 80/443.

**Backend exposto na 3001.** Útil para diagnóstico, mas desnecessário para o
funcionamento, já que o nginx alcança o backend pela rede interna do Compose.
Para reduzir superfície, trocar `ports` por `expose` no serviço backend, ou
limitar o bind a `127.0.0.1:3001:3001`.

**Sem healthcheck declarado.** `depends_on` no Compose v1 só espera o container
iniciar, não ficar pronto. Na prática não deu problema porque o nginx resolve
`backend` por DNS a cada requisição de proxy, mas um `healthcheck` no serviço
backend deixaria o estado mais explícito no `docker-compose ps`.

**Logs sem rotação.** Sem `logging` configurado, o driver `json-file` cresce
indefinidamente. Em servidor que também roda Zabbix, vale limitar:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 10. Histórico de commits do deploy

| Commit | Conteúdo |
|---|---|
| `f13eafd` | Ocultação de campos sensíveis + correção do `tsc -b` que travaria o build |
| `027c2ad` | Schema do Compose para 3.3 (compatibilidade com v1) |
| `f559357` | Porta do frontend configurável via `FRONTEND_PORT` |
| `47f3a89` | Alerta sonoro e vibração na recusa de item |
