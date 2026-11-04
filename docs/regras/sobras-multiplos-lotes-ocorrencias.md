# Especificação Oficial: Tratamento de Sobras Físicas, Múltiplos Lotes e Ciclo de Vida de Ocorrências

> [!CAUTION]
> **REGRA DE BLOQUEIO ARQUITETURAL (IMUTÁVEL):**
> Esta especificação define o comportamento mandatório para a **resolução de sobras físicas**, **desmembramento de múltiplos lotes** e o **ciclo de vida de ocorrências** no módulo de Conferência de Entrada & Gestão de Recebimento.
> **NENHUM AGENTE DE IA OU DESENVOLVEDOR ESTÁ AUTORIZADO A MODIFICAR ESTE FLUXO SEM APROVAÇÃO EXPRESSA DO OPERADOR HUMANO.**

---

## 1. Princípio de Precedência: Sobra Física vs Desmembramento de Lotes

### 1.1 Incompatibilidade Fiscal e Sistêmica
No ERP Sankhya, a rotina de desmembramento de itens de nota fiscal (`TGFCAB` / `TGFITE`) exige estritamente que a soma de todas as frações de lote geradas seja **idêntica à quantidade faturada da linha original da nota fiscal**:
$$\sum \text{Quantidade das Frações} = \text{Quantidade Faturada Original}$$

Se um conferente registrar fisicamente múltiplos lotes que, somados, resultem em uma quantidade superior à faturada (ex: 120 UN faturadas vs 121 UN conferidas distribuídas em 3 lotes):
* **O Sankhya rejeita qualquer desmembramento com quantidade excedente.**
* Tentar desmembrar com sobra física trava o fluxo fiscal ou gera lançamentos tributários indevidos.

### 1.2 Regra de Ouro: "Resolver a Sobra Primeiro"
1. **Prioridade Visual da Sobra:** Na coluna `Diferença` da tela de divergências (`AbaDivergenciasView.tsx`), sempre que houver sobra física ($\text{Diferença} > 0$), o sistema deve **obrigatoriamente renderizar** o pill de sobra `+X (Sobra)` e o botão em destaque **`📦 Gerar Ocorrência de Sobra`**, mesmo que o item possua múltiplos lotes conferidos.
2. **Bloqueio Educativo do Desmembramento:**
   - O botão `✂️ Desmembrar` não deve abrir a rotina de fatiamento no Sankhya enquanto a sobra persistir.
   - Ao ser clicado com sobra ativa, emite alerta impeditivo informando que a sobra física (+X) deve ser formalizada e abatida primeiro.
3. **Trava no Modal de Desmembramento (`ModalDesmembrarItem.tsx`):**
   - Caso o modal de desmembramento seja aberto em estado de excesso ($\text{Soma Atual} > \text{Total Faturado}$), um card de alerta em vermelho bloqueia o botão de confirmação e instrui o usuário a retornar e gerar a ocorrência de sobra.
4. **Abatimento e Cura Automática da Quantidade:**
   - Ao registrar a ocorrência de sobra (`RegistrarOcorrenciaSobraUseCase.ts`), o sistema cria a ocorrência formal no banco local e aciona `conferenciaRepo.abaterSobraBipagens(...)`.
   - A quantidade excedente é abatida das bipagens ativas.
   - A contagem física é igualada à quantidade faturada, sanando a divergência quantitativa e liberando o desmembramento limpo dos lotes restantes no Sankhya.

### 1.3 Seleção Inteligente do Lote Excedente (`ModalOcorrenciaSobra.tsx`)
Quando o item possui múltiplos lotes apurados:
* O modal analisa as frações registradas pelo coletor. Se alguma fração possuir quantidade exatamente igual à sobra calculada (ex: lote de 1 UN onde a sobra apurada é de 1 UN), essa fração é **automaticamente pré-selecionada** como padrão (Lote, Validade e Fabricação).
* É disponibilizado um painel de atalhos rápidos com badges clicáveis de todas as frações conferidas, permitindo que o gestor aponte o lote exato da sobra com 1 clique.

---

## 2. Ciclo de Vida e Exclusão de Ocorrências no Reinício da Conferência

### 2.1 Transparência e Aviso Expresso ao Gestor
Ao reiniciar uma conferência de entrada (seja a nota desmembrada ou a conferência conjunta inteira):
1. O sistema localiza todas as ocorrências ativas vinculadas à conferência ou às notas fiscais da sessão.
2. No modal de confirmação de reinício (`GestaoRecebimento.tsx`), é apresentada uma **caixa detalhada de auditoria visual** listando individualmente cada ocorrência encontrada:
   * Tipo da ocorrência (`SOBRA`, `AVARIA`, `VENCIDO`, etc.);
   * Código e descrição do produto;
   * Quantidade registrada;
   * Lote, data de validade, data de fabricação e local de estoque de destino;
   * Observação ou justificativa original.

### 2.2 Opção de Exclusão Definitiva (Checkbox)
O modal disponibiliza um checkbox de alta visibilidade (marcado por padrão):
> **☑️ Apagar definitivamente estas ocorrências do sistema (remover do banco de dados)**

* **Se Marcado (`excluirOcorrencias: true`):** O backend executa `this.ocorrenciaRepo.remover(oc.id)`, deletando os registros da tabela `ocorrencias_conferencia_entrada` e expurgando-os do banco SQLite.
* **Se Desmarcado (`excluirOcorrencias: false`):** As ocorrências são preservadas no histórico de auditoria e atualizadas com `status = 'CANCELADO'` e motivo contendo o registro do reinício gerencial.

### 2.3 Resolução Robusta de Chaves no Backend (`ReiniciarConferenciaEntradaUseCase.ts`)
Para evitar que ocorrências fiquem órfãs por divergência de identificador (como prefixos de sessão ou conferências desmembradas):
* O método `processarOcorrenciasVinculadas` cruza simultaneamente buscas por `conferenciaId` (extraindo a raiz antes do caractere `_`) e por lista de `nunotas`.
* No Cenário A (desmembramento de uma nota específica de conferência conjunta), apenas as ocorrências da nota reiniciada são tratadas, preservando as demais notas da sessão conjunta.
* No Cenário B (sessão inteira), todas as ocorrências da sessão são processadas.

---

## 3. Detecção e Cancelamento de Ocorrências com Nota Excluída no ERP

Quando uma nota fiscal é excluída no Sankhya pelo setor fiscal/compras e relançada com um novo `NUNOTA`:
1. O caso de uso `ListarOcorrenciasEntradaUseCase.ts` consulta em lote na tabela `TGFCAB` do Sankhya ERP os `NUNOTA` de todas as ocorrências locais.
2. As ocorrências cujo `NUNOTA` não existir mais no ERP são **automaticamente canceladas** no banco de dados (`status = 'CANCELADO'`) com a justificativa `[Nota fiscal excluída no ERP (Sankhya)]`.
3. Na visualização de ocorrências (`AbaOcorrenciasView.tsx`), essas ocorrências recebem o badge de aviso `⚠️ Nota Excluída no ERP` e são excluídas dos contadores de pendências operacionais ativas.

---

## 4. Preservação de Decisões Locais (Atualização Silenciosa)

Para evitar perda de trabalho gerencial durante a resolução de divergências:
1. O registro de ocorrências (como Sobra ou Avaria) não deve causar recarregamento destrutivo da tela (`setLoading(true)` com unmount de componentes).
2. Foi implementada a função `carregarDadosSilencioso` em `GestaoRecebimento.tsx`, que atualiza os dados em segundo plano mantendo montado o estado `decisoesFiscaisPorGrupo`.
3. Decisões gerenciais já tomadas para outros produtos da nota são 100% preservadas.

---

## 5. Rastreabilidade Visual nas Abas de Gestão

1. **Card da Nota Fiscal:** Sempre que houver ocorrências vinculadas à nota, o cabeçalho do card em `AbaDivergenciasView` e `AbaConferenciasView` exibe o badge de destaque `⚠️ {X} Ocorrência(s)`.
2. **Linha do Produto:** O produto que originou a ocorrência exibe badge informativo com tipo, quantidade e local (ex: `➕ Sobra Física: 1 UN (Local 211)`).
3. **Alinhamento Horizontal na Coluna Produto:**
   - O badge de pendência/desmembramento (`⚠️ Pendente de Decisão` / `⚠️ Aguardando Desmembramento`) e os botões de ação (`⚖️ Decidir Divergência` / `⚖️ Revisar Desempate`) compartilham um container flexível horizontal (`display: flex; flex-wrap: wrap; gap: 6px;`).
   - Ficam posicionados **lado a lado**, eliminando quebras de linha verticais desnecessárias e otimizando a altura das linhas da tabela.
4. **Agrupamento de Ocorrências no Filtro "Fora da Nota" (`AbaOcorrenciasView.tsx`):**
   - O filtro `🔄 Fora da Nota` consolida todos os desvios físicos que representam mercadorias excedentes ou não previstas na nota fiscal original:
     * `SOBRA` (Sobra Física de quantidade);
     * `PRODUTO_TROCADO` (Produto divergente recebido no lugar do faturado);
     * `NAO_IDENTIFICADO` (Item avulso / sem código de barras correspondente).
