# Guia Completo de Integração com a API Sankhya

Documentação técnica de como conectar, consultar, inserir, atualizar e executar serviços na API do ERP Sankhya via Gateway.

---

## 1. Autenticação (OAuth 2.0)

### Credenciais necessárias

| Variável | Descrição |
|---|---|
| `GATEWAY_URL` | URL do Gateway (sandbox ou produção) |
| `GATEWAY_CLIENT_ID` | App Key da aplicação |
| `GATEWAY_CLIENT_SECRET` | Secret da aplicação |
| `GATEWAY_X_TOKEN` | Token da instância/ambiente |

### URLs de ambiente

| Ambiente | URL |
|---|---|
| Sandbox | `https://api.sandbox.sankhya.com.br` |
| Produção | `https://api.sankhya.com.br` |

### Obter token OAuth

```http
POST {GATEWAY_URL}/authenticate
Content-Type: application/x-www-form-urlencoded
X-Token: {GATEWAY_X_TOKEN}

grant_type=client_credentials&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 1800
}
```

### Exemplo em código (Node.js/Axios):
```typescript
const params = new URLSearchParams();
params.append('grant_type', 'client_credentials');
params.append('client_id', config.clientId);
params.append('client_secret', config.clientSecret);

const response = await axios.post(`${config.url}/authenticate`, params, {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Token': config.xToken,
  },
});

const token = response.data.access_token;
// Usar em todas as chamadas: Authorization: Bearer {token}
```

### Renovação de token
- Token expira em ~30 minutos (`expires_in`)
- Aplicar margem de renovação **uma única vez** (ver seção 15.1)
- Em caso de 401, renovar e tentar novamente
- Usar mutex para evitar autenticações concorrentes (ver seção 15.2)

---

## 2. Endpoints do Gateway

O Gateway Sankhya tem dois módulos principais:

| Módulo | Endpoint | Serviços |
|---|---|---|
| **MGE** (gestão) | `/gateway/v1/mge/service.sbr` | CRUDServiceProvider, DbExplorerSP, DatasetSP, MobileLoginSP |
| **MGECOM** (comercial) | `/gateway/v1/mgecom/service.sbr` | ConferenciaSP |

### Formato padrão de chamada

```http
POST {GATEWAY_URL}/gateway/v1/{modulo}/service.sbr?serviceName={servico}&outputType=json
Authorization: Bearer {token}
Content-Type: application/json

{
  "serviceName": "{servico}",
  "requestBody": { ... }
}
```

### Formato padrão de resposta

```json
{
  "serviceName": "NomeDoServico",
  "status": "1",           // "1" = sucesso, "0" = erro
  "pendingPrinting": "false",
  "transactionId": "ABC123...",
  "statusMessage": "mensagem de erro (quando status=0)",
  "responseBody": { ... }  // dados da resposta
}
```

---

## 3. CONSULTAS — CRUDServiceProvider.loadRecords

Consulta múltiplos registros de qualquer entidade com suporte a JOIN, filtros e paginação.

### Endpoint
```
POST /gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
```

### Body completo:
```json
{
  "serviceName": "CRUDServiceProvider.loadRecords",
  "requestBody": {
    "dataSet": {
      "rootEntity": "CabecalhoNota",
      "includePresentationFields": "N",
      "offsetPage": "0",
      "criteria": {
        "expression": { "$": "CODPARC = ? AND DTNEG >= ?" },
        "parameter": [
          { "$": "720", "type": "I" },
          { "$": "01/01/2026", "type": "S" }
        ]
      },
      "entity": [
        { "path": "", "fieldset": { "list": "NUNOTA, NUMNOTA, DTNEG, VLRNOTA" } },
        { "path": "Parceiro", "fieldset": { "list": "NOMEPARC, CGC_CPF" } },
        { "path": "Parceiro.Cidade", "fieldset": { "list": "NOMECID, UF" } }
      ]
    }
  }
}
```

### Campos do body:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `rootEntity` | Sim | Nome da entidade (não da tabela) |
| `offsetPage` | Sim | Página (começa em 0) |
| `includePresentationFields` | Não | `S` ou `N` |
| `entity[].path` | Sim | `""` para entidade raiz, ou nome do JOIN |
| `entity[].fieldset.list` | Sim | Campos separados por vírgula |
| `criteria.expression.$` | Não | WHERE com `?` para parâmetros |
| `criteria.parameter[].$` | Não | Valor do parâmetro |
| `criteria.parameter[].type` | Não | `I`=inteiro, `S`=string, `F`=float, `H`=data |

### Resposta (campos vêm como f0, f1, f2...):
```json
{
  "responseBody": {
    "entities": {
      "total": "50",
      "hasMoreResult": "true",
      "offsetPage": "0",
      "metadata": {
        "fields": {
          "field": [
            { "name": "NUNOTA" },
            { "name": "NUMNOTA" },
            { "name": "Parceiro_NOMEPARC" }
          ]
        }
      },
      "entity": [
        { "f0": { "$": "2346" }, "f1": { "$": "168" }, "f2": { "$": "SHOP RURAL" } }
      ]
    }
  }
}
```

> `metadata.fields.field[]` mapeia `f0` → primeiro campo, `f1` → segundo, etc.
> Campos de JOIN vêm com prefixo: `Parceiro_NOMEPARC`

### Paginação:
- Se `hasMoreResult: "true"`, incrementar `offsetPage` e chamar novamente
- Cada página retorna ~50 registros

---

## 4. CONSULTA ÚNICA — CRUDServiceProvider.loadRecord

Busca um único registro pela chave primária.

### Endpoint
```
POST /gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecord&outputType=json
```

### Body:
```json
{
  "serviceName": "CRUDServiceProvider.loadRecord",
  "requestBody": {
    "dataSet": {
      "rootEntity": "Produto",
      "entity": [
        { "path": "", "fieldset": { "list": "CODPROD, DESCRPROD, REFERENCIA" } },
        { "path": "GrupoProduto", "fieldset": { "list": "DESCRGRUPOPROD" } }
      ],
      "rows": {
        "row": {
          "CODPROD": { "$": "71" }
        }
      }
    }
  }
}
```

### Resposta (campos vêm com nome real):
```json
{
  "responseBody": {
    "entities": {
      "entity": {
        "CODPROD": { "$": "71" },
        "DESCRPROD": { "$": "PUG ADULT 25...7,5KG" },
        "REFERENCIA": { "$": "7896181214908" }
      }
    }
  }
}
```

---

## 5. SQL DIRETO — DbExplorerSP.executeQuery

Executa SQL SELECT complexo (JOINs, subqueries, CASE, etc). **Apenas leitura.**

### Endpoint
```
POST /gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json
```

### Body:
```json
{
  "serviceName": "DbExplorerSP.executeQuery",
  "requestBody": {
    "sql": "SELECT CAB.NUNOTA, CAB.NUMNOTA, PAR.RAZAOSOCIAL FROM TGFCAB CAB INNER JOIN TGFPAR PAR ON PAR.CODPARC = CAB.CODPARC WHERE CAB.TIPMOV = 'P' AND ROWNUM <= 10"
  }
}
```

### Resposta:
```json
{
  "responseBody": {
    "fieldsMetadata": [
      { "name": "NUNOTA", "order": 1, "userType": "I" },
      { "name": "NUMNOTA", "order": 2, "userType": "I" },
      { "name": "RAZAOSOCIAL", "order": 3, "userType": "S" }
    ],
    "rows": [
      [1349562, 2626, "HOBBY BICHOS COMERCIO"],
      [1349529, 1141, "JOSIVAN DE SOUZA"]
    ],
    "timeQuery": "31ms"
  }
}
```

> **IMPORTANTE:** Só aceita SELECT. UPDATE/INSERT/DELETE são bloqueados.
> Banco é Oracle — usar `ROWNUM` (não `TOP` ou `LIMIT`)

---

## 6. ATUALIZAR CAMPOS — DatasetSP.save (RECOMENDADO)

Serviço correto para UPDATE de campos em registros existentes.

### Endpoint
```
POST /gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json
```

### Body:
```json
{
  "serviceName": "DatasetSP.save",
  "requestBody": {
    "entityName": "CabecalhoNota",
    "standAlone": false,
    "fields": ["AD_USUARIOCONF", "OBSERVACAO"],
    "records": [
      {
        "pk": { "NUNOTA": 1339393 },
        "values": {
          "0": "VICTOR.D",
          "1": "Conferido via app"
        }
      }
    ]
  }
}
```

### Regras:

| Campo | Descrição |
|---|---|
| `entityName` | Nome da **entidade** (CabecalhoNota, ItemNota, Parceiro, Produto) |
| `standAlone` | `false` para operações normais |
| `fields` | Array de campos a atualizar (na ordem) |
| `records[].pk` | Chave primária (campo: valor numérico) |
| `records[].values` | Índices string mapeando para `fields`: `"0"` → fields[0], `"1"` → fields[1] |

### Resposta (sucesso):
```json
{
  "status": "1",
  "responseBody": {
    "total": "1",
    "result": [["VICTOR.D", "Conferido via app"]]
  }
}
```

### Chaves primárias comuns:

| Entidade | PK |
|---|---|
| `CabecalhoNota` | `NUNOTA` |
| `ItemNota` | `NUNOTA` + `SEQUENCIA` |
| `Parceiro` | `CODPARC` |
| `Produto` | `CODPROD` |

### Múltiplos registros:
```json
{
  "records": [
    { "pk": { "NUNOTA": 1001 }, "values": { "0": "VALOR_A" } },
    { "pk": { "NUNOTA": 1002 }, "values": { "0": "VALOR_B" } }
  ]
}
```

### PK composta (ItemNota):
```json
{
  "pk": { "NUNOTA": 1349562, "SEQUENCIA": 1 },
  "values": { "0": "LOTE-2026-A" }
}
```

---

## 6.1 EXCLUIR REGISTROS — DatasetSP.removeRecord

Remove registros de uma entidade via DatasetSP (por exemplo, estorno de conferência na entidade `DetalhesConferencia` / `TGFCOI2`).
Permite especificar `crudListener` para disparar as regras de negócio automáticas do Sankhya após a exclusão.

### Endpoint
```
POST /gateway/v1/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json
```

### Body:
```json
{
  "serviceName": "DatasetSP.removeRecord",
  "requestBody": {
    "entityName": "DetalhesConferencia",
    "dataSetID": "007",
    "pks": [
      {
        "NUCONF": 24040,
        "SEQCONF": 1
      }
    ],
    "crudListener": "br.com.sankhya.modelcore.crudlisteners.DetalhesConferenciaCRUDListener",
    "clientEventList": {
      "clientEvent": [
        { "$": "fila.conferencia.client.event.produtos.divergentes" },
        { "$": "client.event.produtos.escolha.unidade.mov.armazenamento" },
        { "$": "client.event.escolha.empresa.local.destino" },
        { "$": "client.event.produtos.excluidos.conferencia" },
        { "$": "client.event.volumes.produto.recontado" },
        { "$": "br.com.sankhya.mgecom.busca.identificador.produto" },
        { "$": "conferencia.lista.produtos.divergentes" },
        { "$": "client.event.escolha.etiqueta.peso" }
      ]
    }
  }
}
```

---

## 7. LOGIN DE USUÁRIO — MobileLoginSP.login

Autentica um usuário do ERP Sankhya e retorna seu código (CODUSU).

### Endpoint
```
POST /gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.login&outputType=json
```

### Body:
```json
{
  "serviceName": "MobileLoginSP.login",
  "requestBody": {
    "NOMUSU": { "$": "VICTOR.D" },
    "INTERNO": { "$": "123456" }
  }
}
```

### Resposta:
```json
{
  "responseBody": {
    "callID": { "$": "072EEBFB0EC8AB90..." },
    "jsessionid": { "$": "GggGuS5jwvxsyZa9..." },
    "idusu": { "$": "MzI1\n" }
  }
}
```

> `idusu` está em **Base64**. Decodificar: `Buffer.from("MzI1", "base64").toString()` → `"325"` (CODUSU)

---

## 8. IMAGEM DE PRODUTO — .dbimage

Retorna a imagem cadastrada de um produto como binário JPEG.

### Endpoint (GET)
```
GET /gateway/v1/mge/Produto@IMAGEM@CODPROD={codProd}.dbimage
Authorization: Bearer {token}
Content-Type: image/jpeg
```

### Exemplo:
```
GET /gateway/v1/mge/Produto@IMAGEM@CODPROD=71.dbimage
```

### Resposta:
- Content-Type: `image/jpeg`
- Body: binário da imagem (JPEG)
- Se não tem imagem: resposta vazia

### Padrão da URL:
```
/gateway/v1/mge/{Entidade}@{CampoImagem}@{CampoPK}={ValorPK}.dbimage
```

---

## 9. SERVIÇOS COMERCIAIS — ConferenciaSP (módulo /mgecom/)

Serviços nativos de conferência de saída. **Usam endpoint `/mgecom/` (não `/mge/`).**

### Endpoint
```
POST /gateway/v1/mgecom/service.sbr?serviceName=ConferenciaSP.{operacao}&outputType=json
```

### clientEventList padrão (incluir em todas as chamadas):
```json
"clientEventList": {
  "clientEvent": [
    { "$": "fila.conferencia.client.event.produtos.divergentes" },
    { "$": "client.event.produtos.escolha.unidade.mov.armazenamento" },
    { "$": "client.event.escolha.empresa.local.destino" },
    { "$": "client.event.produtos.excluidos.conferencia" },
    { "$": "client.event.volumes.produto.recontado" },
    { "$": "br.com.sankhya.mgecom.busca.identificador.produto" },
    { "$": "conferencia.lista.produtos.divergentes" },
    { "$": "client.event.escolha.etiqueta.peso" }
  ]
}
```

### 9.1 Iniciar conferência
```json
{
  "serviceName": "ConferenciaSP.salvarCabecalhoConferencia",
  "requestBody": {
    "params": { "nuNota": 1349562, "iniciarRecontagem": false },
    "clientEventList": { ... }
  }
}
```
**Retorna:** `numConf` (ID da conferência criada)

### 9.2 Listar itens do pedido (divergências)
```json
{
  "serviceName": "ConferenciaSP.listarItensPedido",
  "requestBody": {
    "params": { "nuNota": 1349562 },
    "clientEventList": { ... }
  }
}
```
**Retorna:** Array de `PRODUTO` com `CODPROD`, `QTDPED`, `QTDCONF`

> **ATENÇÃO:** Retorna apenas itens com divergência. Itens totalmente conferidos SOMEM da resposta.

### 9.3 Buscar produto por código de barras
```json
{
  "serviceName": "ConferenciaSP.getProduto",
  "requestBody": {
    "params": { "nuNota": 1349562, "codBarra": "7896181214908", "controle": " " },
    "clientEventList": { ... }
  }
}
```
**Retorna:** `codProd`, `descrProd`, `tipoContagem`, `decQtd`

### 9.4 Conferir item
```json
{
  "serviceName": "ConferenciaSP.salvarItemConferido",
  "requestBody": {
    "params": {
      "numConf": "74420",
      "nuNota": 1349562,
      "codBarra": "7896181214908",
      "controle": "",
      "qtdConf": "1.000000000",
      "substituirProduto": false,
      "volume": "",
      "exigeIdentificadores": "N",
      "codUMA": ""
    },
    "clientEventList": { ... }
  }
}
```

### 9.5 Finalizar conferência
```json
{
  "serviceName": "ConferenciaSP.finalizarConferencia",
  "requestBody": {
    "params": { "nuConf": "74420", "peso": 0, "qtdVol": 1 },
    "clientEventList": { ... }
  }
}
```

### 9.6 Cortar nota (divergência)
```json
{
  "serviceName": "ConferenciaSP.cortar",
  "requestBody": {
    "params": { "nuNota": 1349562, "peso": 0, "qtdVol": 0 },
    "clientEventList": { ... }
  }
}
```

### 9.7 Excluir/cancelar conferência
```json
{
  "serviceName": "ConferenciaSP.excluirConferencia",
  "requestBody": {
    "notas": { "nota": [{ "$": 1349562 }] },
    "clientEventList": { ... }
  }
}
```

### 9.8 Verificar apenas excluídos
```json
{
  "serviceName": "ConferenciaSP.getApenasExcluidosConferencia",
  "requestBody": { "params": { "nuNota": 1349562 } }
}
```

### 9.9 Listar itens conferidos
```json
{
  "serviceName": "ConferenciaSP.listarItensConferidos",
  "requestBody": {
    "params": { "nuNota": 1349562, "nuConf": 74420 },
    "clientEventList": { ... }
  }
}
```

### 9.10 Produtos divergentes
```json
{
  "serviceName": "ConferenciaSP.getProdutosDivergentes",
  "requestBody": {
    "params": { "nuNota": 1349562 },
    "clientEventList": { ... }
  }
}
```

### 9.11 Salvar volume
```json
{
  "serviceName": "ConferenciaSP.salvarVolumeSimplificado",
  "requestBody": {
    "params": { "numConf": "74420", "nuNota": 1349562, "volume": 1 },
    "clientEventList": { ... }
  }
}
```

---

## 10. Entidades vs Tabelas

| Entidade (usar na API) | Tabela (banco) | PK |
|---|---|---|
| CabecalhoNota | TGFCAB | NUNOTA |
| ItemNota | TGFITE | NUNOTA + SEQUENCIA |
| Parceiro | TGFPAR | CODPARC |
| Produto | TGFPRO | CODPROD |
| DetalhesConferencia | TGFCON2 | NUCONF |

---

## 11. Quando usar cada serviço

| Necessidade | Serviço | Endpoint |
|---|---|---|
| Consulta com JOIN/filtro | `CRUDServiceProvider.loadRecords` | /mge/ |
| Busca por PK | `CRUDServiceProvider.loadRecord` | /mge/ |
| SQL complexo (SELECT) | `DbExplorerSP.executeQuery` | /mge/ |
| **Atualizar campos** | **`DatasetSP.save`** | /mge/ |
| Inserir registro | `CRUDServiceProvider.saveRecord` | /mge/ |
| Deletar registro | `CRUDServiceProvider.removeRecord` | /mge/ |
| Login de usuário | `MobileLoginSP.login` | /mge/ |
| Imagem de produto | `.dbimage` (GET) | /mge/ |
| Conferência (todos) | `ConferenciaSP.*` | **/mgecom/** |

---

## 12. Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| "Nenhum provedor encontrado" | Serviço não existe ou módulo errado | Verificar /mge/ vs /mgecom/ |
| "offsetPage é obrigatório" | Faltou offsetPage no loadRecords | Adicionar `"offsetPage": "0"` |
| "Não foi encontrado objeto de acesso BMP" | Entidade não liberada para API | Liberar na tela "Autorização de API" do Sankhya Om |
| "Sem mensagem de erro" (status 0) | saveRecord falhou silenciosamente | Usar DatasetSP.save em vez de saveRecord |
| "Permitido apenas consultas" | Tentou UPDATE via DbExplorerSP | Usar DatasetSP.save para escrita |
| 401 Unauthorized | Token expirado | Renovar token OAuth |
| "Campo não existe" | Campo não exposto na entidade | Verificar dicionário de dados |
| NPE (NullPointerException) | Formato do body incorreto | Verificar formato conforme documentação |

---

## 13. Exemplo completo de implementação (Node.js)

```typescript
import axios from 'axios';

class SankhyaGateway {
  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(
    private url: string,
    private clientId: string,
    private clientSecret: string,
    private xToken: string,
  ) {}

  private async authenticate(): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    const response = await axios.post(`${this.url}/authenticate`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Token': this.xToken },
    });

    this.token = response.data.access_token;
    // Ver seção 15.1: margem no isExpired(), não aqui
    this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
    return this.token!;
  }

  private async getToken(): Promise<string> {
    // Margem de 5 min aplicada apenas aqui
    if (!this.token || Date.now() >= this.tokenExpiry - 300_000) {
      return this.authenticate();
    }
    return this.token;
  }

  async serviceCall(serviceName: string, body: any, module: 'mge' | 'mgecom' = 'mge') {
    const token = await this.getToken();
    const endpoint = module === 'mgecom'
      ? `${this.url}/gateway/v1/mgecom/service.sbr`
      : `${this.url}/gateway/v1/mge/service.sbr`;

    const response = await axios.post(
      `${endpoint}?serviceName=${serviceName}&outputType=json`,
      body,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );

    if (response.data.status === '0') {
      throw new Error(response.data.statusMessage || 'Erro Sankhya');
    }

    return response.data;
  }
}

// Uso:
const gw = new SankhyaGateway(
  'https://api.sandbox.sankhya.com.br',
  'seu-client-id',
  'seu-client-secret',
  'seu-x-token',
);

// Consultar
const result = await gw.serviceCall('CRUDServiceProvider.loadRecords', {
  serviceName: 'CRUDServiceProvider.loadRecords',
  requestBody: {
    dataSet: {
      rootEntity: 'Parceiro',
      offsetPage: '0',
      entity: [{ path: '', fieldset: { list: 'CODPARC, NOMEPARC' } }],
    },
  },
});

// Atualizar
await gw.serviceCall('DatasetSP.save', {
  serviceName: 'DatasetSP.save',
  requestBody: {
    entityName: 'CabecalhoNota',
    standAlone: false,
    fields: ['OBSERVACAO'],
    records: [{ pk: { NUNOTA: 1349562 }, values: { '0': 'Atualizado via API' } }],
  },
});

// Conferência (módulo comercial)
await gw.serviceCall('ConferenciaSP.salvarCabecalhoConferencia', {
  serviceName: 'ConferenciaSP.salvarCabecalhoConferencia',
  requestBody: {
    params: { nuNota: 1349562, iniciarRecontagem: false },
    clientEventList: { clientEvent: [
      { $: 'fila.conferencia.client.event.produtos.divergentes' },
      // ... demais eventos
    ]},
  },
}, 'mgecom'); // <-- módulo mgecom!
```

---

## 14. Dicas importantes

1. **Sempre use `entityName`** (não nome da tabela) no DatasetSP.save e loadRecords
2. **DbExplorerSP** é só para SELECT — use `DatasetSP.save` para escrita
3. **ConferenciaSP** usa `/mgecom/` — todos os outros usam `/mge/`
4. **Quantidades** no conferir item: formato decimal com 9 casas (`"1.000000000"`)
5. **Imagens** via GET `.dbimage` (não via loadRecords — campo BLOB vem vazio)
6. **Token OAuth** é do usuário de integração — conferente é identificado por `CODUSU` separado
7. **listarItensPedido** retorna apenas divergentes — itens OK somem da resposta
8. **Paginação** começa em `offsetPage: "0"` — incrementar enquanto `hasMoreResult: "true"`

---

## 15. Performance — Lições aprendidas

### 15.1 Cache de token: margem única, nunca dupla

O `expires_in` retornado pelo Sankhya (ex: `1800` = 30 min) define a vida útil do token.
Ao implementar o cache, aplique a margem de renovação antecipada **uma única vez**.

```typescript
// ✅ CORRETO — margem só no isExpired()
isExpired(): boolean {
  return Date.now() >= this.expiresAt.getTime() - 300_000; // 5 min
}
// expiresAt = Date.now() + expires_in * 1000 (sem subtrair)

// ❌ ERRADO — margem duplicada
authenticate(): {
  expiresAt = Date.now() + (expires_in - 300) * 1000; // já descontou 5 min
}
isExpired(): {
  return Date.now() >= this.expiresAt.getTime() - 300_000; // desconta de novo
}
// Resultado: token sempre expirado → re-autentica a cada chamada
```

Se `expires_in` for curto (ex: 600s = 10 min), a margem dupla faz o token expirar
**imediatamente**. Cada chamada ao Sankhya re-autentica do zero — ~500ms desperdiçados por chamada.

### 15.2 Mutex na autenticação

Quando múltiplas chamadas concorrentes detectam token expirado, todas disparam
`authenticate()` em paralelo. Use um mutex (Promise compartilhada) para que só uma
autentique e as demais reutilizem o resultado:

```typescript
private authPromise: Promise<string> | null = null;

private async getValidToken(): Promise<string> {
  if (this.token && !this.token.isExpired()) return this.token.value;
  if (this.authPromise) return this.authPromise; // já autenticando — aguarda

  this.authPromise = this.authenticate();
  try {
    return await this.authPromise;
  } finally {
    this.authPromise = null;
  }
}
```

### 15.3 Evitar subqueries correlacionadas no DbExplorerSP

O Sankhya roda Oracle. Subqueries correlacionadas (que referenciam a tabela externa)
executam **uma vez por linha**. Em tabelas grandes como TGFCAB, isso é devastador.

```sql
-- ❌ LENTO — subquery roda uma vez por linha do TGFCAB
SELECT CAB.NUNOTA,
       (SELECT COUNT(DISTINCT CODPROD) FROM TGFITE WHERE NUNOTA = CAB.NUNOTA) AS QTD
FROM TGFCAB CAB

-- ✅ RÁPIDO — subquery agrupada roda uma vez e faz JOIN
SELECT CAB.NUNOTA, ITE.QTD
FROM TGFCAB CAB
INNER JOIN (
    SELECT NUNOTA, COUNT(DISTINCT CODPROD) AS QTD
    FROM TGFITE
    GROUP BY NUNOTA
) ITE ON ITE.NUNOTA = CAB.NUNOTA
```

Também vale para `EXISTS`: se o `EXISTS` é para confirmar que há itens E contar quantos,
mergeie num só `INNER JOIN` com a subquery agrupada.

### 15.4 Remover JOINs não utilizados

Cada JOIN adicional tem custo. Se a tabela entra no `FROM`/`JOIN` mas nenhum campo
aparece no `SELECT` nem no `WHERE`, remova-a. No nosso caso, `TSIUSU` e `TGFORD`
eram JOINs mortos.

### 15.5 Agrupar JOINs que podem duplicar linhas

Se um `LEFT JOIN` pode produzir múltiplas linhas para a mesma chave (ex: parceiro
com múltiplas rotas em `TGFRTP`), agrupe numa subquery com `GROUP BY` + `MIN()`/`MAX()`
antes de fazer o JOIN. Isso evita duplicação silenciosa de linhas no resultado.

```sql
-- Pode duplicar linhas se o parceiro tem 2+ rotas
LEFT JOIN TGFRTP RTP ON RTP.CODPARC = CAB.CODPARC
LEFT JOIN TGFROT ROT ON ROT.CODROTA = RTP.CODROTA

-- Sempre 1 linha por parceiro
LEFT JOIN (
    SELECT RTP.CODPARC, MIN(ROT.DESCRROTA) AS DESCRROTA
    FROM TGFRTP RTP
    INNER JOIN TGFROT ROT ON ROT.CODROTA = RTP.CODROTA
    GROUP BY RTP.CODPARC
) ROT ON ROT.CODPARC = CAB.CODPARC
```

### 15.6 Paralelizar chamadas independentes ao Sankhya

Se um fluxo precisa de 2+ serviços independentes do Sankhya (ex: SQL dos itens +
divergências do ConferenciaSP), faça em paralelo com `Promise.all` em vez de
sequencial. Cada chamada ao gateway tem latência própria (~500ms–1s).

```typescript
// ❌ Sequencial — 2x a latência
const itens = await this.buscarItens(nuNota);
const divergencias = await this.buscarDivergencias(nuNota);

// ✅ Paralelo — latência do mais lento
const [itens, divergencias] = await Promise.all([
  this.buscarItens(nuNota),
  this.buscarDivergencias(nuNota),
]);
```

### 15.7 Reduzir round-trips HTTP no frontend

Se cada ação do usuário (ex: bipagem) dispara 2 requests ao backend em série
(save + re-fetch da lista), considere fundir num único endpoint que retorna o
resultado + os dados atualizados. O frontend aplica o patch localmente.

```
-- Antes: 2 round-trips por bipagem
POST /conferir-item → espera → POST /itens-pedido → merge

-- Depois: 1 round-trip por bipagem
POST /conferir-item → { resultado + itens } → merge local
```

### 15.8 Monitorar o timeQuery do Sankhya

A resposta do `DbExplorerSP.executeQuery` inclui `timeQuery` — o tempo que o banco
levou. Se o tempo total do request for muito maior que o `timeQuery`, o gargalo é
rede/autenticação. Se o `timeQuery` for alto, o gargalo é a query SQL.

```typescript
const timeQuery = response.responseBody?.timeQuery;
console.log(`[GetConferenciaSaida] Query Sankhya: ${timeQuery}`);
```
