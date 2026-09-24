# API de Conferência — ConferenciaSP (Sankhya)

Documentação dos serviços nativos de conferência do Sankhya, capturados do módulo "Fila de Conferência".

**Endpoint base:** `POST /gateway/v1/mgecom/service.sbr?serviceName={serviço}&outputType=json`

> Diferente do CRUD que usa `/mge/`, os serviços de conferência usam `/mgecom/` (módulo comercial).

---

## Fluxo Completo de Conferência

```
1. getApenasExcluidosConferencia  → Verifica se nota tem apenas produtos excluídos
2. salvarCabecalhoConferencia     → INICIA a conferência (cria registro TGFCON2)
2b. listarItensPedido             → Lista itens do pedido (qtd pedida vs conferida)
2c. listarItensConferidos         → Lista itens já conferidos na conferência
3. getProduto                     → Busca produto por código de barras
4. salvarItemConferido            → Confere item (registra quantidade)
5. getProdutosDivergentes         → Lista produtos com divergência
6. buscaIdentificador             → Busca identificador do produto (lote, serial)
7. salvarVolumeSimplificado       → Registra volume
8. finalizarConferencia           → FINALIZA a conferência
9. cortar                         → Corta nota (quando há divergência)
```

---

## clientEventList (padrão em todas as chamadas)

Todas as chamadas após `salvarCabecalhoConferencia` incluem esse bloco:

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

---

## 1. getApenasExcluidosConferencia

Verifica se a nota possui apenas produtos excluídos (antes de iniciar conferência).

**Request:**
```json
{
  "serviceName": "ConferenciaSP.getApenasExcluidosConferencia",
  "requestBody": {
    "params": {
      "nuNota": 1349528
    }
  }
}
```

**Response (sucesso):**
```json
{
  "responseBody": {
    "possuiApenasProdutosExcluidos": "false"
  }
}
```

---

## 2. salvarCabecalhoConferencia (INICIAR)

Cria o registro de conferência (TGFCON2) e retorna configurações da tela.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.salvarCabecalhoConferencia",
  "requestBody": {
    "params": {
      "nuNota": 1349528,
      "iniciarRecontagem": false
    },
    "clientEventList": {
      "clientEvent": [
        { "$": "fila.conferencia.client.event.produtos.divergentes" },
        { "$": "client.event.produtos.escolha.unidade.mov.armazenamento" },
        { "$": "client.event.escolha.empresa.local.destino" },
        { "$": "client.event.produtos.excluidos.conferencia" },
        { "$": "client.event.volumes.produto.recontado" },
        { "$": "br.com.sankhya.mgecom.busca.identificador.produto" }
      ]
    }
  }
}
```

**Response (sucesso):**
```json
{
  "responseBody": {
    "isRecontagem": "false",
    "numNota": "86965",
    "tipMov": "P",
    "numConf": "74420",
    "tipoContagem": "C",
    "mostrarProdPed": "S",
    "autoFeedback": "S",
    "mostrarProdConf": "S",
    "mostrarQtdPed": "S",
    "mostrarQtdConf": "S",
    "mostrarProdDiver": "S",
    "mostrarAlertaSonoroDivergencia": "S",
    "formacaoVolumes": "S",
    "ignorarComponenteKit": "N",
    "fatAoConcluir": "N",
    "mostrarCodBarrasPed": "A",
    "registrarPeso": "N",
    "exigeIdentif": "N",
    "inibeMsgConf": "N",
    "exibirImagemProduto": "N",
    "abrirNotaAoConcluir": "N",
    "obtemConferenciaPeso": "N",
    "produtosForaPedido": "C",
    "abrirFilaConferencia": "N",
    "apresFilaSempre": "N",
    "podeAltQtdConfContagemComulativa": "N",
    "vendedor": { "$": "41 - ERANDI SILVA" },
    "parceiro": { "$": "37835 - JOSIVAN DE SOUZA & CIA LTDA" }
  }
}
```

> O campo `numConf` é o ID da conferência criada. Usar em todas as chamadas seguintes.

---

## 2b. listarItensPedido

Lista todos os itens do pedido com quantidades pedidas e conferidas.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.listarItensPedido",
  "requestBody": {
    "params": {
      "nuNota": 1349529
    },
    "clientEventList": { ... }
  }
}
```

**Response (sucesso):**
```json
{
  "paginacao": "true",
  "itensPedido": {},
  "DIVERGENCIAS": {
    "CONFERENCIA_INICIADA": "true",
    "PRODUTO": [
      {
        "CONTROLE": {},
        "QTDPED": { "$": "20" },
        "QTDCONF": { "$": "0" },
        "CODPROD": { "$": "4566" }
      },
      {
        "CONTROLE": {},
        "QTDPED": { "$": "20" },
        "QTDCONF": { "$": "0" },
        "CODPROD": { "$": "6733" }
      }
    ]
  }
}
```

**Campos por produto:**
| Campo | Descrição |
|---|---|
| CODPROD.$ | Código do produto |
| QTDPED.$ | Quantidade pedida |
| QTDCONF.$ | Quantidade conferida |
| CONTROLE | Controle de estoque (lote/serial) |

> `CONFERENCIA_INICIADA: "true"` indica que já existe conferência aberta.

---

## 2c. listarItensConferidos

Lista itens já conferidos na conferência atual.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.listarItensConferidos",
  "requestBody": {
    "params": {
      "nuNota": 1349529,
      "nuConf": 74423
    },
    "clientEventList": { ... }
  }
}
```

**Campos obrigatórios:**
| Campo | Tipo | Descrição |
|---|---|---|
| nuNota | number | Nro único da nota |
| nuConf | number | ID da conferência |

**Response (vazio — nada conferido ainda):**
```json
{
  "list": [],
  "paginacao": false
}
```

**Response (com itens conferidos):** Retorna lista de itens já escaneados/conferidos.

---

## 3. getProduto (buscar por código de barras)

Busca informações de um produto na nota pelo código de barras.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.getProduto",
  "requestBody": {
    "params": {
      "nuNota": 1349528,
      "codBarra": "7896181214717",
      "controle": " "
    },
    "clientEventList": { ... }
  }
}
```

**Response (sucesso):** Retorna dados do produto encontrado na nota.

**Response (erro - produto não encontrado):**
```json
{
  "status": "0",
  "statusMessage": "Não foi encontrado produto com o código de barras: 7896181214717",
  "tsError": {
    "tsErrorCode": "COM_E00030",
    "tsErrorLevel": "ERROR"
  }
}
```

---

## 4. salvarItemConferido (conferir item)

Registra a conferência de um item (quantidade conferida).

**Request:**
```json
{
  "serviceName": "ConferenciaSP.salvarItemConferido",
  "requestBody": {
    "params": {
      "numConf": "74420",
      "nuNota": 1349528,
      "codBarra": "7896181214717",
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

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| numConf | string | ID da conferência (retornado por salvarCabecalhoConferencia) |
| nuNota | number | Nro único da nota |
| codBarra | string | Código de barras do produto |
| controle | string | Controle de estoque (lote, serial). Vazio se não usa |
| qtdConf | string | Quantidade conferida (decimal com 9 casas) |
| substituirProduto | boolean | Se deve substituir produto já conferido |
| volume | string | Número do volume (vazio se não usa formação de volumes) |
| exigeIdentificadores | string | "S" ou "N" |
| codUMA | string | Código UMA (vazio se não usa) |

---

## 5. getProdutosDivergentes

Lista produtos com divergência entre quantidade pedida e conferida.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.getProdutosDivergentes",
  "requestBody": {
    "params": {
      "nuNota": 1349528
    },
    "clientEventList": { ... }
  }
}
```

---

## 6. buscaIdentificador

Busca identificadores (lote, serial) de um item conferido.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.buscaIdentificador",
  "requestBody": {
    "conf": {
      "nuConf": 74420,
      "seqConf": 2
    },
    "clientEventList": { ... }
  }
}
```

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| nuConf | number | ID da conferência |
| seqConf | number | Sequência do item na conferência |

---

## 7. salvarVolumeSimplificado

Registra um volume na conferência.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.salvarVolumeSimplificado",
  "requestBody": {
    "params": {
      "numConf": "74420",
      "nuNota": 1349528,
      "volume": 1
    },
    "clientEventList": { ... }
  }
}
```

---

## 8. finalizarConferencia

Finaliza a conferência (conclui o processo).

**Request:**
```json
{
  "serviceName": "ConferenciaSP.finalizarConferencia",
  "requestBody": {
    "params": {
      "nuConf": "74420",
      "peso": 0,
      "qtdVol": 0
    },
    "clientEventList": { ... }
  }
}
```

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| nuConf | string | ID da conferência |
| peso | number | Peso total (0 se não registra peso) |
| qtdVol | number | Quantidade de volumes (0 se não usa) |

---

## 8b. excluirConferencia

Exclui/cancela uma conferência aberta de uma nota.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.excluirConferencia",
  "requestBody": {
    "notas": {
      "nota": [{ "$": 1349529 }]
    },
    "clientEventList": { ... }
  }
}
```

> O formato usa `notas.nota[]` com `{ "$": nuNota }` — padrão XML-like do Sankhya.

**Response:**
```json
{
  "qtdConferenciasExcluidas": "1"
}
```

| Retorno | Significado |
|---|---|
| `"0"` | Não havia conferência ativa para excluir |
| `"1"` | Conferência excluída com sucesso |

---

## 9. cortar (cortar nota por divergência)

Corta a nota quando existem produtos divergentes.

**Request:**
```json
{
  "serviceName": "ConferenciaSP.cortar",
  "requestBody": {
    "params": {
      "nuNota": 1349528,
      "peso": 0,
      "qtdVol": 0
    },
    "clientEventList": { ... }
  }
}
```

---

## 10. DatasetSP.removeRecord (ESTORNO / EXCLUSÃO DE ITEM CONFERIDO)

Exclui um registro de item conferido da tabela `TGFCOI2` (`DetalhesConferencia`).
Importante: O serviço deve ser chamado no módulo `/mge/` passando o listener `DetalhesConferenciaCRUDListener` para acionar a recomposição automática de saldos e divergências no Sankhya.

**Endpoint:**
```
POST /gateway/v1/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json
```

**Request:**
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

**Response (sucesso):**
```json
{
  "serviceName": "DatasetSP.removeRecord",
  "status": "1",
  "pendingPrinting": "false",
  "transactionId": "...",
  "responseBody": {}
}
```

---

## Fluxo típico no frontend

```typescript
// 1. Verificar se pode conferir
const check = await conferenciaSP.getApenasExcluidosConferencia(nuNota);
if (check.possuiApenasProdutosExcluidos === 'true') return;

// 2. Iniciar conferência
const cab = await conferenciaSP.salvarCabecalhoConferencia(nuNota);
const numConf = cab.numConf;

// 3. Loop de conferência (para cada produto escaneado)
const produto = await conferenciaSP.getProduto(nuNota, codBarra);
await conferenciaSP.salvarItemConferido(numConf, nuNota, codBarra, qtd);

// 4. Verificar divergências
const divergentes = await conferenciaSP.getProdutosDivergentes(nuNota);

// 5. Se tiver divergência: cortar ou re-conferir
if (divergentes.length > 0) {
  await conferenciaSP.cortar(nuNota, peso, qtdVol);
}

// 6. Finalizar
await conferenciaSP.finalizarConferencia(numConf, peso, qtdVol);
```

---

## Códigos de Erro conhecidos

| Código | Mensagem |
|---|---|
| COM_E00030 | Não foi encontrado produto com o código de barras |
| COM_E00025 | Não foi encontrado produto com o código de barras (salvarItemConferido) |
| - | Conferência não existe: PK[xxxxx] |

---

## Notas técnicas

- O endpoint é `/gateway/v1/mgecom/service.sbr` (não `/mge/`)
- Todos os serviços aceitam `clientEventList` — lista de eventos que o cliente suporta
- O `numConf` retornado por `salvarCabecalhoConferencia` é a PK da conferência em TGFCON2
- Quantidades usam formato decimal com 9 casas: `"1.000000000"`
- Campos booleanos são strings `"S"` ou `"N"` (padrão Sankhya)
