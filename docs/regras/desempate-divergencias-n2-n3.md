# Especificação Oficial: Desempate de Divergências de Recebimento (N2 vs N3 vs ERP) e Isolamento de Lotes

> [!CAUTION]
> **REGRA DE BLOQUEIO ARQUITETURAL (IMUTÁVEL):**
> Esta especificação define o comportamento mandatório da **Resolução de Divergências e Desempate Fiscal** (Recebimento de Mercadorias).
> **NENHUM AGENTE DE IA OU DESENVOLVEDOR ESTÁ AUTORIZADO A MODIFICAR A LÓGICA DE ESCOLHA DE NÍVEIS (N2/N3/ERP), AGRUPAMENTO DE LOTES OU CRITÉRIOS DE DESMEMBRAMENTO SEM APROVAÇÃO EXPLÍCITA DO OPERADOR HUMANO.**

---

## 1. Princípio Fundamental do Desempate e Isolamento de Níveis

Quando uma conferência de entrada atinge o **Nível 3 (Reconferência / Desempate)**:
1. **Bipagens de Níveis Diferentes NUNCA Devem Ser Somadas ou Fundidas:**
   - O conferente de N2 registra sua contagem física e lotes (ex: Lote `1234` com `90 UN`).
   - O conferente de N3 realiza uma contagem cega independente para desempate (ex: Lote `123` com `90 UN`).
   - O sistema **NUNCA** deve juntar essas bipagens em uma lista única tratando-as como "múltiplos lotes da mesma nota fiscal" (o que geraria um falso desmembramento de 180 UN).
2. **O Gestor é o Árbitro do Desempate:**
   - Na tela de Divergências, o gestor escolhe qual apuração física e fiscal está correta: **N2**, **N3** ou os dados originais da **Nota Fiscal (ERP)**.
3. **Vinculação Integral do Pacote por Nível:**
   - Ao selecionar um nível para um produto (ex: clicar na coluna **N3**), o sistema vincula **integralmente** o pacote apurado naquele nível:
     * **Quantidade** adotada = Quantidade apurada pelo nível.
     * **Lote** adotado = Lote apurado pelo nível.
     * **Validade** adotada = Validade apurada pelo nível.
     * **Fabricação** adotada = Fabricação apurada pelo nível.

---

## 2. Critérios Estritos para Exigência de "Desmembramento"

O alerta e botão **`✂️ Desmembrar`** / **`⚠️ Aguardando Desmembramento`** só podem ser acionados quando:
* **Dentro do MESMO nível adotado**, o conferente tiver registrado fisicamente mais de um lote diferente para a mesma linha da nota (ex: 50 UN do lote A e 40 UN do lote B na mesma contagem de N3).
* Se a multiplicidade de lotes for decorrente apenas de discordância entre o que o N2 bipou e o que o N3 bipou, **NÃO HÁ DESMEMBRAMENTO**. Trata-se de uma divergência de desempate resolvida pela escolha do gestor.

---

## 3. Estrutura Visual da Tabela de Gestão de Divergências

Para manter a interface limpa, compacta e de fácil leitura, eliminou-se a triplicação de colunas fiscais:

1. **Colunas de Quantidade:**
   - Mantêm-se visíveis conforme a existência de contagens: `Qtd Nota`, `Qtd N1` (se houver N1), `Qtd N2` (se houver N2) e `Qtd N3` (se houver N3 na nota).
2. **Colunas Fiscais Padrão (LOTE, VALIDADE, FABRICAÇÃO):**
   - Não se subdividem mais em `ERP | N2 | N3`. São 3 colunas padrão limpas.
   - Cada coluna exibe a comparação direta **Nota vs Conferido**:
     * *Lote:* `Nota: {loteOriginal}` / `Conf: {loteAdotado} ({Nível})`.
     * *Validade:* `Nota: {valOriginal}` / `Conf: {valAdotada} ({Nível})`.
     * *Fabricação:* `Nota: {fabOriginal}` / `Conf: {fabAdotada} ({Nível})`.
   - **Regra do Checkmark `✓` (Pendente vs Decidido):**
     * Enquanto o item estiver pendente de decisão (`⚠️ Pendente de Decisão`), o dado conferido é exibido em **tom âmbar/alerta (`#b45309`) SEM o checkmark `✓`**.
     * O checkmark **`✓`** e a cor verde (`#047857`) são renderizados **estritamente após a decisão gerencial ser confirmada**.
3. **Decisão Gerencial de Itens em N2 (`ModalDecidirDivergenciaN2.tsx`):**
   - Na linha de qualquer item com divergência fiscal em N2 (que ainda não foi para N3), é disponibilizado o botão **`⚖️ Decidir Divergência`**.
   - O modal apresenta os dados da Nota Fiscal (ERP) e da Conferência N2, oferecendo as duas ações diretas:
     * **`✓ Adotar Conferência N2`**: Acata os dados bipados e marca a decisão como concluída.
     * **`🔍 Enviar para Reconferência N3`**: Envia imediatamente o item para contagem cega de desempate no coletor N3.
4. **N3 Definitivo por Padrão e Revisão de Desempate (`ModalRevisarDesempate.tsx`):**
   - Todo item que passou por reconferência N3 adota o **N3** por padrão como a verdade definitiva para resolução do desempate.
   - O botão **`⚖️ Revisar Desempate`** abre o comparativo dos 3 níveis físicos (**N1**, **N2**, **N3**) com a régua da Nota Fiscal no topo.
   - Acionado pelo botão `⚖️ Revisar Desempate` na linha do item (e no card mobile).
   - **Faixa Superior de Referência:** Exibe no topo os dados originais faturados na Nota Fiscal (Qtd, Lote, Validade, Fabricação).
   - **3 Cards Comparativos Físicos:**
     * **Card 1 - Conferência N1:** Ativo se houver contagem em N1; caso contrário, desabilitado em cinza com badge `Sem contagem N1`.
     * **Card 2 - Conferência N2:** Exibe contagem, lote(s), validade, fabricação e conferente do N2.
     * **Card 3 - Reconferência N3:** Exibe contagem, todas as frações de lote/datas apuradas e conferente do N3 (marcado como definitivo por padrão).
5. **Grade de Desmembramento e Botão `✂️ Desmembrar` na Tabela Principal:**
   - Se o nível adotado possuir múltiplos lotes físicos (`lotesConferidos.length > 1`), a linha exibe o alerta `⚠️ Aguardando Desmembramento ({X} Lotes)`, ativa o botão `✂️ Desmembrar` e renderiza a grade expansível com o detalhamento das frações a serem desmembradas no Sankhya.
   - Caso o gestor adote um nível com lote único (ex: N2 com lote único), o desmembramento é dispensado automaticamente.

---

## 4. Persistência e Envio ao Sankhya ERP

1. **Estrutura de Decisão Salva (`decisoesFiscais`):**
   ```typescript
   export interface DecisaoFiscalItem {
     nunota: number;
     codprod: number;
     sequencia: number;
     nivelEscolhido?: 1 | 2 | 3;
     lote?: 'ERP' | 'BIP' | 'N1' | 'N2' | 'N3';
     validade?: 'ERP' | 'BIP' | 'N1' | 'N2' | 'N3';
     fabricacao?: 'ERP' | 'BIP' | 'N1' | 'N2' | 'N3';
     quantidade?: 'ERP' | 'N1' | 'N2' | 'N3';
   }
   ```
2. **Regra de Envio ao Sankhya ([`EnviarConferenciaSankhyaUseCase.ts`](../../backend/src/application/use-cases/recebimento/EnviarConferenciaSankhyaUseCase.ts)):**
   - O backend filtra e utiliza exclusivamente as bipagens do nível adotado pelo gestor para aquele produto específico (`nivelEscolhido === 3` -> bipagens do N3; `nivelEscolhido === 2` -> bipagens do N2; `nivelEscolhido === 1` -> bipagens do N1).
   - Se `decisao.lote === 'ERP'`, o sistema mantém intactos os dados fiscais originais da nota fiscal.

---

## 5. Exibição e Destaque Visual na Conferência Concluída e Integrada ao ERP

Após a conferência ser finalizada e integrada ao Sankhya (`Enviado ao Sankhya`):
1. **Destaque Limpo do Nível e Dados Fiscais na Tabela de Conferências:**
   - **Coluna de Quantidade (N1, N2 ou N3):** A coluna correspondente ao nível adotado é destacada com o badge verde `✓ {Qtd}` (`.badge-nivel-adotado-erp`), evidenciando a contagem física integrada sem poluição visual (eliminado o sufixo redundante `(ERP)`).
   - **Coluna de Lote:** Exibe estritamente o código do lote em pill padronizada: `🏷️ {Lote}` (sem exibir quantidades redundantes ou sufixos de nível como `(N3 Integrado)`).
   - **Identificação Centralizada da Decisão:** Logo abaixo dos dados do SKU é renderizada a tag oficial: `🎯 Decisão: N{Nivel} Adotado • Integrado ao ERP`.
2. **Isolamento de Lotes na Gaveta de Frações:**
   - A gaveta de frações de lote de uma conferência concluída (`lotesConferidos`) exibe **exclusivamente os lotes apurados no nível que foi adotado**.
   - É **terminantemente proibido** exibir na mesma gaveta lotes descartados de outras etapas (ex: juntar lote de N2 com lote de N3), impedindo que produtos com lote único adotado apareçam como falsamente desmembrados ou com soma duplicada de quantidades.

---

## 6. Checklist de Verificação Arquitetural

Antes de aprovar qualquer alteração na resolução de divergências ou envio ao Sankhya:
- [ ] Bipagens de N2 e N3 continuam estritamente isoladas no backend `mapBips.lotesMapN2` e `mapBips.lotesMapN3`?
- [ ] Na conferência concluída, `ObterItensConferenciaEntradaUseCase` filtra `lotesConferidos` pelo nível adotado?
- [ ] O nível adotado exibe badge verde `✓ {Qtd}` e a pill de lote exibe apenas `🏷️ {Lote}`?
- [ ] O falso desmembramento de lotes entre conferências diferentes está bloqueado na tabela de conferências?
- [ ] Os builds do backend e frontend compilam sem erros (`exit code 0`)?
