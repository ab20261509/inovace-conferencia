# Registro de Progresso e Entregas - Conferência de Entrada & Gestão de Recebimento

## Atualização: Fila de Cadastros em Lote (Carrinho) e Botões Compactos Anti-Transbordamento

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos incluir os itens na lista de cadastros e no final confirmar o cadastramento d alista, da uma olhada no botão concluir e fechar o texto está saindo da borda e pode deixar os botões menores"*
- **Implementações Técnicas e Arquiteturais:**
  1. **Fila Ágil de Cadastros (Acúmulo de Produtos):**
     - Criado o estado `listaItensPendentes` no [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx).
     - **Fase 2 (Adicionar Itens à Lista):**
       - Validação prévia no ato do bip: bloqueia produtos já incluídos na lista atual (`jaNaLista`) ou já ativos no mesmo endereço.
       - Tratamento de picking: produtos com picking ativo em outro endereço abrem o modal de confirmação e, se aceitos, são enfileirados com flag `confirmarSubstituicaoPicking: true`.
       - Ao confirmar a inclusão (`+ Incluir na Lista` ou double-scan), o produto é adicionado à fila temporária, um feedback sonoro e visual suave é emitido, e o campo é limpo instantaneamente com foco mantido para o conferente bipar o próximo item em sequência ininterrupta.
       - Banner superior suave na Fase 2 mostrando o total acumulado: `🛒 X produtos na lista` com atalho direto `[ Revisar Lista (X) ➔ ]`.
  2. **Fase 3 (Revisão e Confirmação da Lista):**
     - Apresenta o endereço de destino (`EnderecoChips`) e todos os itens enfileirados em cards compactos com miniatura de foto (`ProdutoImagem`), código, descrição, EAN, lote e botão de exclusão individual (`🗑️`).
     - Botão de gravação em lote: `[ ⚡ Gravar Lista (X) ]` que processa todos os itens da fila no Sankhya via `enderecamentoApiService.cadastrar`, alimentando o feed auditável da sessão.
     - Botão para continuar bipando: `[ + Adicionar Item ]`.
  3. **Ajuste de Botões Compactos e Anti-Transbordamento:**
     - No [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css), a altura dos botões foi reduzida de 50px/52px para **40px** (tanto no desktop quanto no mobile).
     - Tipografia ajustada para `13px` com `font-weight: 700` e padding de `0 12px`/`0 14px`.
     - Textos concisos e diretos (`+ Adicionar Item`, `Gravar Lista (X)`, `+ Nova Lista`, `Fechar`), com `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` e container flex com `flex-wrap: wrap; gap: 8px;` garantindo que os botões nunca estourem a borda em telas estreitas de smartphones e coletores Android.
- **Compilação e Deploy do APK:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Sincronização: `npx cap sync android` atualizou os assets web nativos (**exit code 0**).
  - APK Android: `gradlew.bat assembleDebug --rerun-tasks` finalizado com sucesso (**BUILD SUCCESSFUL in 1m 10s**).
  - Arquivo final: [`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/inovace/Documents/Sankhya/frontend/android/app/build/outputs/apk/debug/app-debug.apk) (gerado em `19/11/2026 16:49:52`).

---

## Atualização: Redesign Minimalista e Suave do Bottom Sheet de Endereçamento (3 Fases: Endereço ➔ Produto ➔ Verificação)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos ajustar esse design/layout do popup de cadastrar precisa ficar mais minimalista e suave, sem perder a identidade visual/cores. Veja o exemplo, podemos criar as fases endereço, registrou... vamos para segunda fase produto, e a terceira e verificação do que foi cadastrado."*
  - Imagem de referência fornecida pelo usuário: cards com cantos arredondados (18px), ícones em *squircle* com fundos coloridos suaves, tipografia limpa, drag handle no topo e fluxo por etapas sem rolagem vertical excessiva.
- **Implementações Técnicas e Arquitetura do Redesign:**
  1. **Barra de Progresso Superior (Stepper de 3 Segmentos):**
     - Barra horizontal elegante com 3 segmentos indicadores no topo da gaveta:
       - `1. Endereço` (ativo com preenchimento em azul `#2563eb`).
       - `2. Produto` (ativo com preenchimento em laranja vibrante `#ea580c`).
       - `3. Concluído` (ativo com preenchimento em verde sucesso `#16a34a`).
  2. **Fase 1 (Posição Física / Endereço):**
     - Card de entrada limpo com ícone em *squircle* azul (`📍`), campo de digitação/bipagem com leitor laser, botão de câmera (`📷`) e botão de ação rápida `OK`.
     - Card de endereço validado com `EnderecoChips`, descrição e badge `✓ Posição Válida no WMS`.
     - Toggle suave de trava de endereço (`🔒 Endereço Travado` vs `🔓 Troca a Cada Bip`), permitindo fixar a posição física para múltiplos produtos.
     - Botão de avanço em destaque: `[ Avançar para o Produto ➔ ]`.
  3. **Fase 2 (Identificação e Vínculo do Produto):**
     - Banner superior contextual mostrando a posição selecionada ativa com botão discreto `[ ↺ Trocar ]` para retornar à Fase 1 a qualquer momento.
     - Card de entrada com *squircle* laranja (`📦`), suporte a leitor de código de barras físico ou câmera (`📷`), e campo opcional de lote.
     - Card de conferência visual (`👁️ Conferência Visual`) com foto ampla do produto (toque para zoom), dados cadastrais (EAN, Ref, Unidade, Lote), saldos disponíveis e situação no WMS (Picking atual e Pulmões ativos).
     - Mecanismo de confirmação ágil e double-scan com botão primário `[ ⚡ Confirmar Vínculo (Enter) ]`.
  4. **Fase 3 (Verificação do que foi Cadastrado):**
     - Hero visual verde com círculo de sucesso (`✓`) confirmando a sincronização no Sankhya ERP.
     - Card do último registro com miniatura da foto, código, descrição, EAN e endereço vinculado (`EnderecoChips`).
     - Histórico resumido da sessão de trabalho em carrossel horizontal de chips.
     - Botões de desfecho:
       - `[ ➕ Cadastrar Próximo Produto ]`: se o endereço estiver travado, avança diretamente para a Fase 2 pronto para o próximo bip; se destravado, retorna à Fase 1.
       - `[ ✓ Concluir e Fechar ]`: encerra a gaveta e volta para a tela de endereçamento.
  5. **Estilização e Thumb-Zone Android:**
     - Classes dedicadas com prefixo `.enderecamento-*` em [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css), preservando isolamento total e sem tocar em `global.css`.
     - Drag handle visível (`#cbd5e1`), cantos arredondados de 24px no rodapé e botões com altura mínima de 52px para acionamento confortável com o polegar.
- **Compilação e Deploy do APK:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Sincronização: `npx cap sync android` atualizou os assets web nativos (**exit code 0**).
  - APK Android: `gradlew.bat assembleDebug --rerun-tasks` finalizado com sucesso (**BUILD SUCCESSFUL in 1m 37s**).
  - Arquivo final: [`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/inovace/Documents/Sankhya/frontend/android/app/build/outputs/apk/debug/app-debug.apk) (gerado em `19/11/2026 16:24:28`).

---

## Atualização: Tela Cheia para Câmera Scanner (React Portal em `document.body`, Z-Index Máximo 2147483647 e Ocultação Temporária da Gaveta)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"quando clico na camera continua aparcendo por tras do poup de cadastro"*
- **Solução Definitiva:**
  1. **React Portal (`createPortal`):**
     - O [`ModalCameraScanner.tsx`](./frontend/src/presentation/components/ModalCameraScanner/ModalCameraScanner.tsx) agora renderiza diretamente no `document.body` via `createPortal`, quebrando qualquer contexto de empilhamento (*stacking context*) ou limitações de container pai.
  2. **Z-Index Máximo do Navegador (2147483647):**
     - No [`ModalCameraScanner.css`](./frontend/src/presentation/components/ModalCameraScanner/ModalCameraScanner.css), a classe `.modal-camera-overlay` recebeu `z-index: 2147483647 !important;` e `width: 100vw; height: 100vh; position: fixed; inset: 0`, cobrindo 100% da viewport do Android.
  3. **Ocultação Temporária da Gaveta (Preservando Estado):**
     - No [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx), enquanto a câmera estiver ativa (`cameraAtiva !== null`), o Bottom Sheet de cadastro recebe `style={{ display: 'none' }}`. Todo o formulário, endereço travado e inputs permanecem intactos na memória React, e o Bottom Sheet reaparece instantaneamente assim que a câmera faz o bip ou é cancelada.
- **Compilação e Deploy do APK:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Sincronização: `npx cap sync android` atualizou os assets web nativos.
  - APK Android: `gradlew.bat assembleDebug --rerun-tasks` finalizado com sucesso (**BUILD SUCCESSFUL in 1m 10s**).
  - Arquivo final: [`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/inovace/Documents/Sankhya/frontend/android/app/build/outputs/apk/debug/app-debug.apk) (gerado em `19/11/2026 15:33:02`).

---

## Atualização: Correção de Sobreposição da Câmera (Z-Index 99999) e Permissões Nativas de Câmera no Android (AndroidManifest + Runtime Prompt)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"a camera está abrindo por traz do menu, e não teria que solicitar autorização para usar a camera?"*
- **Diagnóstico:**
  1. O modal da câmera (`ModalCameraScanner.css`) possuía `z-index: 9999` e não definia `position: fixed; inset: 0`, disputando com a sobreposição do Bottom Sheet (`enderecamento-coletor-overlay`), fazendo a tela da câmera renderizar por trás do menu.
  2. A permissão nativa `android.permission.CAMERA` e os recursos de hardware (`android.hardware.camera`) não estavam declarados no `AndroidManifest.xml`, e o `MainActivity.java` não solicitava a permissão de câmera em tempo de execução ao sistema operacional Android.
- **Implementações Técnicas:**
  1. [`ModalCameraScanner.css`](./frontend/src/presentation/components/ModalCameraScanner/ModalCameraScanner.css):
     - Atualizada a classe `.modal-camera-overlay` com `position: fixed; inset: 0; z-index: 99999;` garantindo prioridade absoluta sobre qualquer modal, gaveta ou menu da aplicação.
  2. [`AndroidManifest.xml`](./frontend/android/app/src/main/AndroidManifest.xml):
     - Adicionada a permissão `<uses-permission android:name="android.permission.CAMERA" />`.
     - Adicionados `<uses-feature android:name="android.hardware.camera" android:required="false" />` e autofocus.
  3. [`MainActivity.java`](./frontend/android/app/src/main/java/com/sankhya/confercheck/MainActivity.java):
     - No método `onStart()`, adicionada verificação e solicitação em tempo de execução de `Manifest.permission.CAMERA` e `RECORD_AUDIO`, disparando o diálogo nativo do Android ("Permitir que o app ConferCheck tire fotos e grave vídeos?").
  4. [`ModalCameraScanner.tsx`](./frontend/src/presentation/components/ModalCameraScanner/ModalCameraScanner.tsx):
     - Mensagens educativas amigáveis caso o usuário recuse a permissão no Android.
- **Compilação e Deploy do APK:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Sincronização: `npx cap sync android` atualizou os assets web nativos.
  - APK Android: `gradlew.bat assembleDebug --rerun-tasks` finalizado com sucesso (**BUILD SUCCESSFUL in 1m 20s**).
  - Arquivo final: [`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/inovace/Documents/Sankhya/frontend/android/app/build/outputs/apk/debug/app-debug.apk) (gerado em `19/11/2026 15:23:08`).

---

## Atualização: Sincronização e Compilação do APK Android com o Bottom Sheet de Endereçamento WMS

- **Demanda do Usuário:**
  - *"faltou builda o app para ele receber as melhorias do botão flutuante de cadastro de endereço"*
- **Ações Executadas & Validações:**
  1. **Frontend:** Build de produção gerado com sucesso via `npm --prefix frontend run build` (**exit code 0**).
  2. **Capacitor Sync:** Executado `npx cap sync android` dentro de `frontend/` sincronizando os novos assets, componentes e CSS para a pasta nativa `android/app/src/main/assets/public/` (**exit code 0**).
  3. **Gradle APK Rebuild:** Executado `.\gradlew.bat assembleDebug --rerun-tasks` dentro de `frontend/android/`, forçando o reempacotamento completo de todas as 82 tarefas de compilação (**BUILD SUCCESSFUL in 1m 8s**).
  4. **APK Atualizado:**
     - Arquivo: [`app-debug.apk`](file:///c:/Users/inovace/Documents/Sankhya/frontend/android/app/build/outputs/apk/debug/app-debug.apk)
     - Gerado em: `19/11/2026 15:13:04`
     - Tamanho: 5.2 MB
     - Conteúdo embutido: Novo Extended FAB `[ ⚡ Cadastrar ]`, Bottom Sheet Android (Material 3), Botões de Câmera `[ 📷 ]` nos inputs de Endereço e Produto, e ações diretas nos cards de endereço.

---

## Atualização: Build do Aplicativo Android (Vite + Capacitor + Gradle APK)

- **Demanda do Usuário & Alinhamento:**
  - *"roda o biuld do app android e instalado no dispositivo conectado"*
- **Ações Executadas & Validações:**
  1. **Frontend:** Build compilado via `npm --prefix frontend run build` com TypeScript e Vite gerando bundle em `frontend/dist/` (**exit code 0**).
  2. **Backend (BFF):** Compilação validada via `npm --prefix backend run build` (**exit code 0**).
  3. **Capacitor Android:** Assets web sincronizados com a pasta nativa Android via `npx cap sync android` (**exit code 0**).
  4. **Gradle APK:** Build nativo executado via `.\gradlew assembleDebug --no-daemon` com sucesso (**exit code 0**), gerando o APK final atualizado:
     - Caminho: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
     - Tamanho: 5.9 MB
  5. **Diagnóstico do Aparelho (ADB):**
     - O Windows detecta o dispositivo conectado via USB: **Galaxy Tab A (8.0", 2019)** em modo de transferência de arquivos (WPD).
     - Aguardando a habilitação da **Depuração USB** nas opções de desenvolvedor do tablet para envio e abertura automática do APK.

---

## Atualização: Módulo de Endereçamento WMS - Bottom Sheet Android para Cadastramento de Produtos no Endereço (Suporte Híbrido Câmera/Laser, Thumb-Zone e Ação Direta nos Cards)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"no modulo de endereçamento preciso disponibilizar um(popup) para iniciar o cadastramento endereço produtos, isso vai ser usado no android, então vamos trabalhar em um design foca na plataforma android"*
  - Decisões consolidadas:
    1. **Estrutura Visual Android (Material 3 Bottom Sheet):**
       - Modal deslizante da base inferior (*slide-up*) cobrindo até ~92% da tela com cantos superiores arredondados (`24px`) e *drag handle* central.
       - Ergonomia otimizada para operação com uma mão (área de toque *thumb-zone* com altura mínima de 48px nos botões e inputs).
    2. **Captura Híbrida de Código de Barras:**
       - **Coletores Industriais Android (Zebra, Honeywell):** Foco automático contínuo para leitura rápida a laser com suporte a Enter/teclado.
       - **Smartphones Android:** Botões de câmera dedicados (`📷`) integrados ao componente nativo `ModalCameraScanner` ao lado dos inputs de Endereço e Produto.
    3. **Fluxo Guiado em Duas Etapas:**
       - **Etapa 1 (Endereço):** Validação física do endereço com suporte a botão de trava (`[🔒 Endereço Travado]`) para bipagem contínua de múltiplos produtos.
       - **Etapa 2 (Produto):** Conferência visual com foto ampla (`120x120px` com toque para zoom), dados cadastrais, situação de Picking/Pulmão no WMS e saldo disponível, além de suporte a *double-scan* para confirmação sem tocar na tela.
    4. **Pontos de Acesso Integrados:**
       - **Extended FAB Flutuante Android:** Botão em pílula `[ ⚡ Cadastrar ]` fixado no canto inferior direito acima da barra de navegação móvel.
       - **Ação Rápida nos Cards de Endereço:** Botão `[ ⚡ Cadastrar ]` em cada card da lista analítica, abrindo diretamente o Bottom Sheet com o endereço já pré-preenchido e travado.
    5. **Feedback Sensorial & Regra de Picking:**
       - Vibração háptica nativa no Android (`navigator.vibrate`) e bips de áudio sintetizados para confirmação de leitura e alerta de divergência.
       - Modal assistido de confirmação para substituição de picking oficial com inativação automática do picking anterior no Sankhya ERP.
    6. **Histórico da Sessão em Carrossel Horizontal:**
       - Mini-feed horizontal deslizante exibindo os últimos produtos vinculados sem poluir ou empurrar os botões principais de ação.
- **Implementações Técnicas:**
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Importação e integração do `ModalCameraScanner` para leitura de endereço e produtos via câmera móvel.
    - Funções `handleAbrirCadastroNoEndereco` e `handleScanCamera`.
    - Suporte a parâmetros opcionais de valor em `handleLocalizarProduto` e `handleSubmeterConfirmacao` para fluidez com a câmera.
    - Adição de drag handle, botões de câmera `📷` nos inputs e ação `[ ⚡ Cadastrar ]` nos cards analíticos.
    - Extended FAB Android com ícone e rótulo.
  - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    - Classes de estilo dedicadas: `.enderecamento-bottom-sheet-drag-handle`, `.enderecamento-coletor-btn-camera`, `.enderecamento-btn-acao-mini.cadastrar`, `.enderecamento-fab-icone`, `.enderecamento-fab-label`.
    - Regras de mídia `@media (max-width: 900px)` transformando o container em Bottom Sheet com animação `enderecamentoSlideUpBottom` e carrossel horizontal de feed.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Controle Customizável de Tamanho de Fonte para Faixa Vertical de Nível (Letras e Número)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"coloca uma funação para que eu edite o tamanho da fonte antes de enviar o nivel para impressão"*
  - Decisões consolidadas:
    1. **Dois Controles Independentes com Steppers e Edição Direta:**
       - **Fonte Letras (N-I-V-E-L)**: Padrão `70px`, variação de `5px` nos botões `[-]` e `[+]`, permitindo digitação direta de valores entre 20px e 130px.
       - **Fonte Número**: Padrão `170px`, variação de `5px` nos botões `[-]` e `[+]`, permitindo digitação direta de valores entre 40px e 260px.
    2. **Ação Rápida de Restauração:**
       - Botão `↺ Restaurar` no cabeçalho do painel de ajustes para voltar instantaneamente aos padrões ideais (70px / 170px).
    3. **Atualização em Tempo Real (WYSIWYG):**
       - O preview na folha A4 no centro da tela escala proporcionalmente o texto das letras e o número à medida que o operador altera os valores.
    4. **Injeção Dinâmica na Impressão:**
       - A função `handleImprimir` injeta as variáveis `${tamanhoFonteLetrasFaixa}px` e `${tamanhoFonteNumeroFaixa}px` no CSS gerado para impressão física.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Estados `tamanhoFonteLetrasFaixa` (default 70) e `tamanhoFonteNumeroFaixa` (default 170).
    - Painel `.montante-config-box` expandido com linhas de ajuste, steppers `-` / `+`, inputs numéricos com sufixo `px` e botão `↺ Restaurar`.
    - Preview dinâmico com proporção relativa em tempo real.
    - Injeção das fontes selecionadas na folha de estilo de impressão A4.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Classes de estilo dedicadas: `.btn-restaurar-fonte`, `.config-linha-ajuste`, `.config-linha-label`, `.stepper-wrap`, `.btn-stepper`, `.input-stepper-val-wrap`, `.input-stepper-val`, `.input-stepper-copias` e `.unidade-px`.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Otimização de Espaço da Faixa Vertical de Nível (Espaçamentos Mínimos, Letras em 70px e Número Colossal em 170px)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"Na impressão preciso que as letras e o numeros ocupenas todos o espaço para melhorar a visibilidade o numero ainda mais."*
  - Decisões consolidadas via `ask_question`:
    1. **Eliminação de Espaçamentos Desperdiçados**:
       - Redução drástica das margens e paddings internos para o mínimo possível (`padding: 3mm 1mm`), deixando as letras e o número quase encostando na borda para aproveitamento de ~98% da folha A4.
       - Remoção completa da linha divisória intermediária para permitir fluxo vertical 100% contínuo e amplitude máxima.
    2. **Tipografia Colossal e Foco no Número**:
       - Letras `N - I - V - E - L` ampliadas de 48px para **70px** em negrito forte (`font-weight: 900`), ocupando a porção superior da faixa.
       - Número do nível ampliado de 85px para **170px** (número colossal, destaque absoluto e visibilidade cristalina em qualquer ponto do corredor logístico).
       - Borda espessada para 3.5px sólida, mantendo a regra de paridade de cores (Azul para Par e Laranja para Ímpar).
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Configurações de `@page` com margem reduzida para `4mm` e grid A4 com gap de `3mm`.
    - Classes `.faixa-nivel-card`, `.faixa-nivel-letras span` (70px) e `.faixa-nivel-numero span` (170px).
    - Remoção da tag `.faixa-nivel-divisor` no HTML impresso e no JSX do preview.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Simulador A4 do modal atualizado com letras em 38px e número gigante em 90px com padding mínimo.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Novo Modelo "Faixa Vertical de Nível (Poste/Montante)" com Letras N-I-V-E-L Empilhadas, Número Gigante e Paridade de Cores

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora preciso imprimir os niveis em colunas para colocar"*
  - Imagem de referência anexada pelo usuário (`media_1794943486471_6ae725a3.png`): letras `N - I - V - E - L` empilhadas verticalmente e o número do nível logo abaixo.
  - Decisões consolidadas via `ask_question`:
    1. **Novo Modelo Dedicado na Central de Impressão**: `🗼 Faixa Vertical de Nível (Poste/Montante)`.
    2. **Divisão de Página A4 em 3 Faixas Verticais**: Cada folha A4 Retrato acomoda exatamente 3 faixas contínuas (~65mm de largura cada, formato montante de poste porta-paletes).
    3. **Regra de Paridade de Cores Preservada**:
       - **Nível Par (2, 4, 6...)**: Borda sólida 3px Azul (`#2563eb`), divisor e número gigante em Azul (`#2563eb`).
       - **Nível Ímpar (1, 3, 5...)**: Borda sólida 3px Laranja (`#ea580c`), divisor e número gigante em Laranja (`#ea580c`).
    4. **Extração Automática dos Níveis & Controle de Cópias**:
       - Detecta automaticamente os níveis distintos presentes no filtro ou pré-seleção ativa.
       - Controle de cópias de cada nível (stepper `-` / `+`, padrão: 1 cópia de cada).
    5. **Tipografia Imponente**:
       - Letras `N - I - V - E - L` distribuídas verticalmente com tamanho de **48px** em negrito forte.
       - Número do nível gigante com **85px** em negrito forte na base da faixa.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Tipo `EstiloLayoutEtiqueta` ampliado com `'FAIXA_NIVEL_VERTICAL'`.
    - Estados `copiasFaixaNivel`, cálculo `niveisDistintos`, `faixasNivelQueue` e paginação para 3 faixas por folha A4.
    - Card de seleção no Estilo Visual e painel de ajuste de cópias com resumo analítico.
    - Script de impressão isolado `layout-faixa-nivel` renderizando `.faixa-nivel-card` com letras e números gigantes.
    - Pré-visualização em tela (`.preview-faixa-nivel-card`) com sincronização em tempo real das cópias e navegação de folhas.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Classes de estilo dedicadas: `.preview-folha-a4.layout-faixa-nivel`, `.preview-faixa-nivel-card`, `.preview-faixa-nivel-letras`, `.preview-faixa-nivel-divisor` e `.preview-faixa-nivel-numero`.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Destaque Verde Condicional na Posição (Exclusivo para Picking) e Estilo Padrão Azul/Branco para Pulmão

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora vamos deixar a cor verde na posição que for pick, pulmão vamos deixar a letra azul com o fundo branco assim como é rua e torre"*
  - Decisões consolidadas via `ask_question`:
    1. **Destaque Verde Condicional para Picking**:
       - Quando o endereço for **`PICKING`**, a linha/bloco da **`POSIÇÃO`** recebe o destaque verde aprovado: fundo verde suave (`#f0fdf4`), borda verde (`#16a34a`) e rótulo textual verde (`#16a34a`).
    2. **Padronização Visual para Pulmão**:
       - Quando o endereço for **`PULMAO`**, a **`POSIÇÃO`** é renderizada exatamente como **`RUA`** e **`TORRE`**: fundo claro/branco (`#f8fafc` / `#ffffff`), borda padrão cinza suave (`#cbd5e1`), rótulo em azul (`#0284c7`) e número escuro (`#0f172a`), eliminando o falso destaque verde em áreas aéreas de estocagem.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Estilos de impressão atualizados para `.coord-linha-posicao-picking` e `.coord-chip.pos-picking` com borda e textos verdes.
    - Renderização HTML e JSX condicionadas por `item.tipo?.toUpperCase() === 'PICKING'`: apenas itens de picking recebem as classes de destaque verde. Endereços de pulmão adotam a classe padrão `.coord-linha` / `.coord-chip`.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Atualização dos seletores de pré-visualização em tela (`.coord-linha-posicao-picking`, `.p-coord-linha.coord-linha-posicao-picking`, `.preview-coord-chip.pos-picking`).
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Bordas Sólidas Coloridas por Paridade de Nível (Azul / Laranja), Fundo do Nível Colorido e Coordenadas em 15px / 30px

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos colocar um borda no cards da impressão de endereçamento, par azul e impa laranja e vamos aumetar o tamanho dos letras e numeros do endereço rua, torre, nivel e posição"*
  - Decisões consolidadas via `ask_question`:
    1. **Critério de Paridade por Nível**:
       - **Nível Par** (2, 4, 6...): Borda sólida grossa de 3px em Azul (`#2563eb`).
       - **Nível Ímpar** (1, 3, 5...): Borda sólida grossa de 3px em Laranja (`#ea580c`).
       - Aplicado a **todos os cards** de impressão e pré-visualização (Tira de Montante Multi-Nível, Clássico Horizontal e QR Lateral).
    2. **Fundo do Nível na Cor Correspondente**:
       - Nível Par: fundo do bloco Nível em Azul (`#2563eb`) com texto e números em branco.
       - Nível Ímpar: fundo do bloco Nível em Laranja (`#ea580c`) com texto e números em branco.
    3. **Tipografia Ampliada das Coordenadas**:
       - Rótulos textuais (`RUA`, `TORRE`, `NÍVEL`, `POSIÇÃO`) aumentados de 9px para **15px**.
       - Números das coordenadas aumentados para **30px** (com proporções adaptativas seguras para montantes com 5 e 6 níveis).
       - Coluna de coordenadas expandida (`flex: 1.45`) em relação ao QR Code (`flex: 0.85`), garantindo respiração e visualização de longa distância no corredor.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Injeção das classes dinâmicas `nivel-par` e `nivel-impar` em todos os cards montante e etiquetas individuais.
    - Estilização de impressão com bordas de 3px (`border: 3px solid #2563eb` e `#ea580c`) e fundos contrastantes para `.coord-linha-nivel-invertido` e `.coord-chip.nivel-chip`.
    - Ajuste dos rótulos para 15px e valores para 30px nas coordenadas.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Regras para `.preview-etiqueta-card.nivel-par` e `.preview-etiqueta-card.nivel-impar`.
    - Fundos azul e laranja aplicados aos seletores de Nível na simulação A4 em tela.
    - Calibração de fontes e proporções do preview.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Seta Solta em Largura Total (100%) com Espessura Ampliada em +30% no Topo do Montante

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"essa seta criada, vamos aumetar a grossura uns 30% e vamos deixa ela largura total"*
  - Decisões consolidadas via `ask_question`:
    1. **Seta Solta em Largura Total (Sem Caixa)**: Remoção de qualquer borda pontilhada, caixa cinza ou container delimitador. A seta escura `#0f172a` agora fica solta e estica de ponta a ponta (`width: 100%`) em toda a largura do montante metálico (~60mm).
    2. **Espessura Ampliada em +30% & Altura de Destaque (~28px)**: A haste (`shaft`) e a ponta da seta foram espessadas proporcionalmente em +30% (haste de 14 unidades verticais em viewBox de 28px de altura), gerando impacto visual e clareza instantânea para os operadores no corredor logístico.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Geometria do polígono SVG redefinida para viewBox `0 0 100 28`:
      - Esquerda: `points="24,0 1,14 24,28 24,21 99,21 99,7 24,7"`.
      - Direita: `points="76,0 99,14 76,28 76,21 1,21 1,7 76,7"`.
    - Estilos de impressão (`.montante-topo-seta`): removidos `border`, `background` e `box-shadow`; definidos `width: 100%`, `height: 28px`, `padding: 0` e margem inferior calibrada (`1.5mm`).
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - `.preview-montante-topo-seta` e `.preview-montante-seta-svg` atualizados para ocupar `width: 100%` com altura de `22px` no simulador de tela, sem bordas nem fundo.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Seta Indicativa Direcional no Topo das Colunas de Montante com Regra de Paridade (Torre e Posição)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora vamos incluir uma seta no top de cada coluna baeada na seleção do usuário, torre impa posição impa -> seta para esquerda ou direta, isso fará com que o par seja o contrario"*
  - Imagem de referência anexada pelo usuário (`media_1794932444426_807741c0.png`): 3 colunas de montante impressas na folha A4.
  - Decisões consolidadas via `ask_question`:
    1. **Regra de Paridade Direcional Completa**:
       - O usuário seleciona a direção base para **Posição Ímpar** (`ESQUERDA` ou `DIREITA`).
       - Se a **Torre for Ímpar**:
         - Posição Ímpar $\rightarrow$ Direção selecionada.
         - Posição Par $\rightarrow$ Direção oposta (inversão automática).
       - Se a **Torre for Par**:
         - Inverte todo o espelhamento da torre (Posição Ímpar fica oposta, Posição Par fica a direção base).
       - Fórmula:
         $$\text{dir} = \text{isPosImpar} ? \text{dirBase} : \text{oposta}(\text{dirBase})$$
         $$\text{if (!isTorreImpar)} \implies \text{dir} = \text{oposta}(\text{dir})$$
    2. **Estilo Visual da Seta**:
       - Card dedicado no topo de cada coluna com design limpo e nítido: "Apenas uma seta grande" em vetor SVG poligonal (`polygon`), com bordas tracejadas elegantes (`border: 1.5px dashed #94a3b8`) idênticas aos cards de nível, sem textos redundantes, garantindo máximo contraste e legibilidade física no topo do montante metálico.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Estados `direcaoPosicaoImpar` (`'ESQUERDA' | 'DIREITA'`) e `mostrarSetaTopo` (`boolean`, ativo por padrão).
    - Funções utilitárias: `calcularDirecaoSeta` e gerador de SVG poligonal `renderSetaSvgString` / `SetaMontantePreview`.
    - Painel esquerdo de configurações: sub-bloco contextual `.montante-config-box` com botões de alternância `[ ⬅ Esquerda ]` e `[ Direita ➡ ]`, checkbox para ligar/desligar a seta e nota explicativa da paridade em tempo real.
    - Resumo de quantidades enriquecido com o status da seta e direção configurada.
    - Pré-visualização na folha A4 do modal (`.preview-montante-topo-seta`) exibindo a seta renderizada dinamicamente com base nas coordenadas de cada coluna.
    - Script de impressão real gerando o container `.montante-topo-seta` no topo de cada coluna física da folha A4 com proporções e alturas milimétricas para não transbordar a página única.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Estilização completa das classes `.preview-montante-topo-seta`, `.preview-montante-seta-svg`, `.montante-config-box`, `.montante-config-header`, `.montante-direcao-grid`, `.btn-direcao-opcao` e `.montante-regra-nota`.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Compressão Horizontal em 35% da Tira de Montante (3 Colunas por Folha A4 • Largura ~60mm)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"ainda nessa layout da vertical, vamos diminuir em 35% na horizontal o card comprimindo o endereço"*
  - Decisões consolidadas via `ask_question`:
    1. **Adequação ao Montante Físico (~60mm)**: Redução da largura total da tira em 35%, convertendo o layout da folha A4 de 2 para **3 colunas verticais** contínuas (~60mm de largura útil por montante), ideal para aplicação direta na face metálica estreita dos postes porta-paletes do armazém.
    2. **Organização Interna do Card**: Preservação da disposição horizontal compacta (QR Code à esquerda e Coordenadas à direita), com espaçamentos otimizados (gap de 4px) e tipografia ajustada (números em 20px/22px e rótulos em 9px) para encaixe milimétrico sem transbordo.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Grade da folha A4 de impressão atualizada para 3 colunas: `grid-template-columns: 1fr 1fr 1fr; gap: 3.5mm;`.
    - Paginação física e lógica do componente ajustadas para processar 3 tiras por página A4 (`Math.ceil(colunasMontante.length / 3)`).
    - Redução proporcional de padding e paddings internos dos cards `.montante-nivel-card` (`padding: 3px 4px`).
    - Ajuste dos números das coordenadas para 20px (22px no Nível invertido) com adaptações dinâmicas para 4 e 5 níveis.
    - Textos de cabeçalho (`PULMAO`, `DEPÓSITO 01`, `CÓD: {codend}`) e rodapé calibrados para não sofrerem quebra de linha.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Simulador A4 do modal atualizado para `.preview-folha-a4.layout-montante` com `grid-template-columns: 1fr 1fr 1fr; gap: 8px;` e escala reduzida proporcional.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Ampliação de Rótulos e Números das Coordenadas no Modelo Montante Vertical

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora vamos aumentar o tamanho do texto e o numero nessa modelo da vertical"*
  - Imagem de referência (`media_1794931434093_a0b8aa10.png`): card da Tira de Montante Vertical com área interna das coordenadas na coluna da direita.
  - Decisões consolidadas via `ask_question`:
    1. **Foco Exclusivo nas Coordenadas**: Aumento focado exclusivamente na coluna de coordenadas à direita (`RUA`, `TORRE`, `NÍVEL`, `POSIÇÃO` e seus números correspondentes), preservando cabeçalho (`PULMAO`/`DEPÓSITO 01`/`CÓD`) e rodapé.
    2. **Escala Visual Ampliada**:
       - Rótulos textuais (`RUA`, `TORRE`, `NÍVEL`, `POSIÇÃO`) aumentados de 8px para **11px** em negrito forte.
       - Números das coordenadas aumentados de 15px para **26px** (com o **Nível** em **28px** em branco sobre o bloco escuro invertido `#0f172a`).
       - Proporcionalidade automática preservada para colunas com 4 a 5 níveis para evitar quebras de página.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Reestruturação das classes `.montante-nivel-card .coord-linha-label` (11px) e `.montante-nivel-card .coord-linha-val` (26px / 28px no Nível invertido).
    - Escala adaptativa por densidade de níveis: `col-niveis-2` (28px/30px), `col-niveis-3` (26px/28px), `col-niveis-4` (21px/23px) e `col-niveis-5` (18px/20px).
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Ampliação sincronizada dos tamanhos de fontes e rótulos no container de pré-visualização A4 `.preview-montante-nivel-card`.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Endereçamento WMS - Filtros Flexíveis de Coordenadas com Múltiplos Valores (Vírgulas e Intervalos)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"gostaria de conseguir filtrar colocando os numero dessa forma"*
  - Imagem de referência (`media_1794928625804_ca9eedf4.png`): usuário informando múltiplos valores separados por vírgula no campo de coordenada (ex.: `POSIÇÃO = 1,2`).
  - Decisões consolidadas via `ask_question`:
    1. **Formatos Suportados**: Suporte completo tanto para listas separadas por vírgula (ex.: `1,2` ou `1, 3, 5`) quanto para intervalos com hífen (ex.: `1-5` ou `1 - 4`).
    2. **Abrangência**: Aplicado a todos os 5 campos de coordenadas físicas da tela principal de Endereçamento (`DEP`, `RUA`, `TORRE`, `NÍVEL`, `POSIÇÃO`).
- **Implementações Técnicas:**
  - [`ListarEnderecosAnaliticoUseCase.ts`](./backend/src/application/use-cases/enderecamento/ListarEnderecosAnaliticoUseCase.ts):
    - Nova função utilitária `parseFiltroNumericoFlexivel(raw)` que interpreta strings livres, dividindo por vírgulas e expandindo intervalos hifenizados para um `Set<number>` otimizado.
    - Filtragem analítica aplicando verificação em tempo `O(1)` (`set.has(valor)`) para cada coordenada informada.
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Conversão dos 5 campos de entrada de `type="number"` para `type="text"`, permitindo digitação natural de vírgulas, hifens e espaços.
    - Adicionado atributo `title="Informe o número, lista (1,2) ou intervalo (1-5)"` para orientação contextual ao usuário.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Endereçamento WMS & Central de Etiquetas - Inclusão de Depósito no Filtro Analítico e no Cabeçalho das Etiquetas

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"preciso que o filtro olhe para o deposito, e incluir o deposito na impressão"*
  - Imagem de referência (`media_1794927668350_dd221ed2.png`): retângulo vermelho apontando para a área central do cabeçalho da etiqueta, entre o badge de tipo (`PULMAO`/`PICKING`) e o `CÓD: {codend}`.
  - Decisões consolidadas via `ask_question`:
    1. **Formato Visual no Card**: Exibição central no cabeçalho como `"DEPÓSITO 01"` (nome por extenso com 2 dígitos correspondentes ao segmento do armazém WMS, ex.: `01`, `02`).
    2. **Filtro na Tela de Endereçamento**: Campo numérico `[ DEP ]` adicionado antes de Rua na linha de filtros analíticos: `[ DEP ] [ RUA ] [ TORRE ] [ NÍVEL ] [ POSIÇÃO ] [ ✕ ] [ Filtrar ]`.
    3. **Opções do Modal de Impressão**: Adicionado checkbox `Depósito` nas opções visuais (marcado por padrão) e campo de filtro por Depósito no modo intervalo.
- **Implementações Técnicas:**
  - [`EnderecoChips.tsx`](./frontend/src/presentation/components/common/EnderecoChips.tsx):
    - Extração do segmento de depósito (`partes[0]`) no `parseEndereco` e inclusão do campo `deposito: string` em `EnderecoDetalhado`.
  - [`ListarEnderecosAnaliticoUseCase.ts`](./backend/src/application/use-cases/enderecamento/ListarEnderecosAnaliticoUseCase.ts):
    - Parâmetro `deposito?: string` adicionado ao input e à função `parseEnderecoCoords`.
    - Filtro analítico comparando valor numérico exato do depósito com fallback e integridade.
  - [`EnderecamentoController.ts`](./backend/src/presentation/http/controllers/EnderecamentoController.ts):
    - Repasse do parâmetro `deposito` de `req.query` para o caso de uso.
  - [`EnderecamentoApiService.ts`](./frontend/src/infrastructure/api/EnderecamentoApiService.ts):
    - Parâmetro `deposito?: string` repassado na chamada de listagem analítica.
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Estado `filtroDeposito` integrado à busca com botão de limpeza rápida `✕`.
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx) e [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Checkbox `mostrarDeposito` incluído na interface e no estado de informações da etiqueta.
    - Renderização de `<span class="etiqueta-deposito-tag">DEPÓSITO {niv.deposito}</span>` no cabeçalho do cartão físico impresso e no painel de pré-visualização A4.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Correção de Paginação da Tira de Montante (Auto-Fit em Página Única A4 sem Quebra)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"na impressão ficou assim, precisamos ajutar para ficar em uma unica pagina"*
  - Problema identificado na foto da impressão física (`media_1794927269148_c6811e6a.png`): na impressão da Tira de Montante Multi-Nível, o 3º card (`NÍVEL 1`) era cortado ao meio pela quebra de página, transbordando o QR Code e as coordenadas para a página 2.
  - Alinhamento realizado via `ask_question`: **Ajuste proporcional automático**: compactar suavemente paddings, alturas e dimensões do QR Code (com `min-height: 0` e `break-inside: avoid`), garantindo que todos os níveis da coluna caibam perfeitamente em 1 única folha A4 sem cortes nem divisão entre páginas.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Configuração da página de impressão `@page { size: A4 portrait; margin: 6mm; }` para maximizar a área útil (285mm de altura vertical).
    - Regras de quebra e contenção: `break-inside: avoid; page-break-inside: avoid;` adicionadas a `.montante-coluna-container` e `.montante-nivel-card`, eliminando cortes no meio de cartões.
    - Suporte flexível total: `min-height: 0` aplicado a `.montante-nivel-card`, `.etiqueta-corpo-lateral`, `.etiqueta-lateral-qr-box`, `.etiqueta-qrcode-lateral` e `.coord-linha`, permitindo que os elementos encolham elasticamente conforme a quantidade de níveis.
    - Proporcionalidade dinâmica: classes `.col-niveis-${col.niveis.length}` atribuídas a cada coluna com regras CSS de escala gradual de tipografia e espaçamentos (fontes maiores para 2 níveis, intermediárias para 3 níveis e compactas para 4+ níveis).
    - Altura e transbordo protegidos: `.folha-a4` com `max-height: calc(297mm - 12mm); overflow: hidden;` evitando qualquer geração de folha fantasma ou extra.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Estilização espelhada no container de pré-visualização `.preview-montante-coluna-container` e `.preview-montante-nivel-card`, aplicando `overflow: hidden; min-height: 0` e escalonamento por classe de quantidade de níveis.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Refinamento da "Tira de Montante" (Cards Laterais com QR à Esquerda e Coordenadas à Direita por Nível)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"preciso que o layout da tira de montante siga esse design da coluna e no card, o exemplo é apenas visual"*
  - *"vamos reverter a decisão anterior e colocar QRCode na esquerda e endereçamento da direita, e opção 1"*
  - Decisões consolidadas via `/grill-me` com base na imagem do operador (`media_1794926449152_fbf6e916.png`):
    1. **Fidelidade Visual ao Design "Coluna"**: Dentro da tira de montante vertical (2 colunas A4), cada nível é renderizado como um card completo individual com borda pontilhada arredondada (`.montante-nivel-card`).
    2. **Disposição dos Elementos**:
       - **Cabeçalho**: Badge do tipo (`PICKING` em verde ou `PULMÃO` em azul) no topo esquerdo e `CÓD: {codend}` no topo direito.
       - **Corpo Lateral**: Box com QR Code amplo em destaque à esquerda (sem margens mortas) e código de endereço abaixo; e coluna com as 4 coordenadas empilhadas à direita (`RUA`, `TORRE`, `NÍVEL` em bloco escuro invertido `#0f172a`, `POSIÇÃO`).
       - **Rodapé**: `WMS ConferCheck` e `Galpão Logístico` no rodapé de cada card.
    3. **Impressão e Pré-visualização**: A folha A4 organiza os cards em 2 colunas verticais contínuas, distribuindo proporcionalmente a altura disponível entre os níveis de cada torre/posição.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - No `handleImprimir` (caso `isMontante`), substituição da estrutura anterior por cards individuais `.montante-nivel-card` contendo header, corpo lateral (`.etiqueta-corpo-lateral`, `.etiqueta-lateral-qr-box`, `.etiqueta-lateral-coords-col`) e footer completo.
    - No painel direito de pré-visualização, renderização de `.preview-montante-coluna-container` e `.preview-montante-nivel-card` com estilos idênticos.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Classes de preview `.preview-montante-coluna-container`, `.preview-montante-nivel-card`, ajustes de proporção de fonte e canvas QR para escala correta na simulação da folha A4.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Endereçamento WMS - Filtro de Busca Quebrado em 4 Campos de Coordenadas (Rua, Torre, Nível, Posição)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos quebra os campos no filtro de endereçamento, pelo tipo (rua, torre, nivel, posição) podendo informar algumas dela vazio."*
  - Decisões estruturadas via `/grill-me`:
    1. **Local de Aplicação**: Tela principal de Endereçamento WMS (Aba 1 - Endereços).
    2. **Busca Exclusiva por Coordenadas**: Removida a dependência do `CODEND`, focando exclusivamente nos 4 eixos de localização física do armazém.
    3. **Layout dos Campos**: Linha única compacta contendo os 4 campos dedicados lado a lado (`[ RUA ] [ TORRE ] [ NÍVEL ] [ POSIÇÃO ]`), acompanhados do botão de ação `[ Filtrar ]` e botão `[ ✕ ]` de limpeza rápida.
    4. **Permissividade de Campos Vazios**: Qualquer um dos 4 campos pode ser informado ou deixado em branco (ex.: informar apenas `RUA = 1` busca todas as torres, níveis e posições daquela rua; informar apenas `NÍVEL = 1` busca o piso térreo de todo o armazém).
- **Implementações Técnicas:**
  - [`ListarEnderecosAnaliticoUseCase.ts`](./backend/src/application/use-cases/enderecamento/ListarEnderecosAnaliticoUseCase.ts):
    - Parâmetros `rua`, `torre`, `nivel` e `pos` adicionados à interface `ListarEnderecosAnaliticoInput`.
    - Função utilitária `parseEnderecoCoords` adicionada para decompor máscaras em regex e fallbacks numéricos com precisão.
    - Filtro exato em memória comparando valores numéricos inteiros para evitar qualquer falso positivo (ex.: Rua 1 não traz Rua 10 ou Torre 1).
  - [`EnderecamentoController.ts`](./backend/src/presentation/http/controllers/EnderecamentoController.ts):
    - Extração de `rua`, `torre`, `nivel` e `pos` de `req.query` e repasse ao caso de uso.
  - [`EnderecamentoApiService.ts`](./frontend/src/infrastructure/api/EnderecamentoApiService.ts):
    - Parâmetros `rua`, `torre`, `nivel` e `pos` adicionados à chamada `listarAnalitico`.
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx) e [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    - Estados `filtroRua`, `filtroTorre`, `filtroNivel` e `filtroPosicao`.
    - Novo formulário `.enderecamento-coords-search-row` com 4 campos estilizados em linha única, rótulos compactos azuis superiores e foco em laranja institucional.
    - Botão `✕` para limpar os 4 campos de uma só vez e botão `[ Filtrar ]` compacto ao lado.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Novo Layout "🪜 Tira de Montante Multi-Nível" (2 Colunas A4 com Níveis Empilhados por Posição)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos fazer mais um layout na impressão de etiquetas, para agruparmos nível por posição tipo TORRE 1 - NVEL 1 POSIÇÃO 1, TORRE 1 - NVEL 2 POSIÇÃO 1, TORRE 1 - NVEL 3 POSIÇÃO 1, e usarmos a seguinte logica, dividir a pagina 2 duas colunas, com endereço encima horizontal ou vertial e QRCODE embaixo."*
  - Decisões estruturadas via `/grill-me`:
    1. **Estrutura de Agrupamento**: Etiqueta de Montante Multi-Nível (Tira Vertical), dividindo a folha A4 em 2 colunas verticais (2 montantes/baías por folha).
    2. **Disposição dos Elementos por Nível**: Cabeçalho individual compacto no topo do bloco (`TORRE X` • `NÍVEL X` em bloco escuro de destaque • `POS X`), seguido pelo QR Code amplo centralizado e o código de barras/endereço logo abaixo.
    3. **Ordem Física de Elevação**: Os níveis dentro de cada coluna são empilhados em ordem decrescente (o nível mais alto no topo e o Nível 1 na base), espelhando fielmente a elevação física real do porta-paletes.
    4. **Seletor de Estilo**: Integrado na seção **`3. Estilo Visual da Etiqueta`** como `🪜 Tira de Montante Multi-Nível (2 Colunas por Folha)`.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Novo tipo `MONTANTE_VERTICAL_2_COL` adicionado a `EstiloLayoutEtiqueta`.
    - Agrupamento inteligente `colunasMontante`: agrupa os endereços selecionados/filtrados pela chave `rua_torre_pos` e ordena os níveis internamente de forma decrescente por `nivelNum` (`b.nivelNum - a.nivelNum`).
    - Paginação proporcional de 2 colunas por folha A4 (`totalPaginas = Math.ceil(colunasMontante.length / 2)`).
    - Motor de impressão dedicada no `handleImprimir` gerando HTML/CSS para `@page { size: A4 portrait; margin: 8mm; }`, com grid de 2 colunas (`.layout-montante`), blocos de níveis proporcionais (`.montante-nivel-bloco`) e QR Codes de alta densidade (`240px`).
    - Painel de pré-visualização em tempo real exibindo a folha A4 em 2 colunas com todos os níveis empilhados para a página atual (`preview-montante-coluna-card`).
    - Atualização do card de resumo e do botão de impressão para detalhar a quantidade de tiras de montante e níveis contidos.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Estilos de preview `.preview-folha-a4.layout-montante`, `.preview-montante-coluna-card`, `.preview-montante-nivel-bloco`, `.preview-montante-nivel-header`, `.p-montante-tag-coord`, `.p-montante-tag-nivel-destaque` e `.preview-montante-qr-area`.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Maximização do QR Code no Estilo "QR Lateral + Coordenadas Verticais"

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"será que da para aumentar o QRCODE?"*
  - Com base na imagem com anotação em vermelho (`media_1794920475734_8171d845.png`), o usuário solicitou que o QR Code ocupasse quase todo o espaço disponível na caixa da esquerda.
  - Alinhamento confirmado via `/grill-me`:
    - Maximizar o QR Code para ocupar quase toda a caixa interna (conforme o retângulo vermelho da foto), mantendo o código numérico compacto embaixo.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Parâmetro `margin: 0` adicionado ao gerador de QR Code (`QRCode.toCanvas` e `QRCode.toDataURL`), removendo a zona morta (margem branca padrão) e expandindo a matriz útil do QR Code em até 20%.
    - Resolução do QR Code aumentada substancialmente no motor de impressão (`qrSize = 320` para 2/folha, `240` para 4/folha e `150` para 8/folha).
    - No preview, `size` do `QRCodeItem` ajustado para `260` (2/folha), `140` (4/folha) e `76` (8/folha) com `margin={0}`.
    - Proporção da caixa esquerda ajustada para `flex: 1.05`, padding reduzido para `4px` e texto do endereço reduzido para `11px` compacto com entrelinha de `1.1`.
    - No HTML de impressão, `.etiqueta-qrcode-lateral` agora utiliza `flex: 1; width: 100%; max-height: calc(100% - 18px); object-fit: contain` para expansão máxima com preenchimento quase total da caixa.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Ajustado `.preview-lateral-qr-box` com padding compacto de `4px` e `flex: 1.05`.
    - Adicionado `.preview-lateral-qr-box .etiqueta-qrcode-canvas` com `flex: 1; max-width: 100%; max-height: calc(100% - 16px); width: auto; height: auto; aspect-ratio: 1/1; object-fit: contain` permitindo que o canvas escale até os limites da caixa.
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Central de Impressão de Etiquetas WMS - Novo Estilo "QR Lateral + Coordenadas Verticais" (Longarina com Nível Invertido e Remoção de Zeros à Esquerda)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"na central de impressão de etiquetas, vamos da opção de layout onde o endereço fique na vertical do lado direito, e o QR Code com destaque do lado direto. Veja exemplo na imagem, seria interessante retirar o zero no incio como está na imagem"*
  - Alinhamento interativo de 3 decisões via `/grill-me`:
    1. **Posicionamento**: QR Code amplo em destaque à esquerda e coordenadas verticais à direita (fiel à foto da longarina física).
    2. **Configuração**: Disponibilizado como seletor de "Estilo Visual da Etiqueta" (`PADRAO_HORIZONTAL` vs `QR_LATERAL_VERTICAL`), totalmente compatível com os modelos de folha A4 (2, 4 e 8 por folha).
    3. **Tipografia & Contraste**: Remoção automática de zeros à esquerda (ex: `04` ➔ `4`, `01` ➔ `1`) via helper `removerZerosEsquerda` e destaque em alto contraste com bloco escuro invertido (`background: #0f172a; color: #ffffff`) no Nível.
- **Implementações Técnicas:**
  - [`ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx):
    - Exportação do tipo `EstiloLayoutEtiqueta = 'PADRAO_HORIZONTAL' | 'QR_LATERAL_VERTICAL'`.
    - Helper utilitário `removerZerosEsquerda(val)` com tratamento robusto para zeros iniciais numéricos e alfanuméricos.
    - Novo seletor no painel de configurações: **`3. Estilo Visual da Etiqueta`** (`🏷️ Clássico Horizontal` vs `🏁 QR Lateral + Vertical` com badge `Novo`), reordenando `4. Tipo de Código` e `5. Informações na Etiqueta`.
    - Ao selecionar `QR_LATERAL_VERTICAL`, se o tipo de código estivesse em `BARRAS`, o sistema promove automaticamente para `QRCODE`.
    - Geração em memória do QR Code otimizada para alta resolução (até 190px no layout 2 por folha, 140px no 4 por folha e 90px no 8 por folha).
    - Renderização da folha de impressão HTML (`window.open`) e preview dinâmico no modal com classes `.estilo-lateral`, `.etiqueta-corpo-lateral`, `.etiqueta-lateral-qr-box`, `.etiqueta-lateral-coords-col`, `.coord-linha`, `.coord-linha-nivel-invertido` e `.coord-linha-posicao`.
    - Adicionado indicador do Estilo Visual selecionado no card de resumo da impressão.
  - [`ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css):
    - Estilos do seletor `.grid-estilos-layout`, `.card-estilo-layout` e badge `.modelo-tag-novo`.
    - Estilos responsivos do preview `.preview-corpo-lateral`, `.preview-lateral-qr-box`, `.preview-lateral-coords-col`, `.p-coord-linha`, `.p-coord-linha-nivel-invertido` (bloco preto e texto branco), `.p-coord-linha-posicao` para cada folha A4 (2, 4 e 8 por folha).
- **Validações de Build:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Endereçamento WMS Mobile - Cards Minimalistas (Endereços, Produtos e Histórico em Cards)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos ajusta a lista dos produtos, e deixar a lista do endereçamento mais minimaslista e organizada. No historia vamos agrupar melhor esses dados no card minimalista."*
  - Com base nas anotações em vermelho nas imagens do operador (`media_1794861549136_9ce3cf6e.png`, `media_1794861593911_f93c6674.png` e `media_1794861712677_736dbca6.png`):
  - Implementação completa em [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx) e [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    1. **Aba 1 (Endereços) - Linha Analítica Minimalista em 2 Linhas**:
       - Removido o layout alto e estufado que causava desperdício de espaço vertical.
       - Estruturado em 2 linhas limpas e objetivas:
         - **Linha 1 (Topo)**: `[ ] Checkbox` • Badge Tipo (`PICKING` / `PULMÃO`) • `EnderecoChips` compacto • Badge de Ocupação (`🟢 Livre` / `📦 X prods`).
         - **Linha 2 (Base)**: `Cód: {codend} • {descrend}` à esquerda • Botão `[ 🖨️ ]` e botão `[ 👁️ Produtos ]` compactos alinhados à direita.
    2. **Aba 2 (Produtos) - Contexto no Cabeçalho e Limpeza de Avisos Redundantes**:
       - O banner estático de contexto do endereço (`.enderecamento-banner-contexto`) foi removido do corpo da lista e migrado para a barra de cabeçalho, posicionado ao lado de `Produtos (X)` com chip compacto de endereço e botão `[ ✕ ]` para desfiltrar.
       - No card do produto, removido o aviso estático "Nenhum pulmão adicional vinculado a este produto" e o botão redundante "+ Vincular Novo Pulmão" quando o produto não possui pulmões, deixando o card limpo e focado no essencial (o vínculo é feito via FAB flutuante `(+)`).
    3. **Aba 3 (Histórico) - Substituição de Tabela Desktop por Cards Minimalistas**:
       - A tabela HTML tradicional (que exigia rolagem horizontal e quebrava no mobile) foi substituída por uma lista vertical fluida de cards minimalistas (`.enderecamento-historico-cards-list`):
         - **Topo**: Badge de Ação (`DEFINIR_PICKING`, `MOVER`, `RETIRAR`) + Data/Hora + Operador `👤 {usuario}`.
         - **Centro**: Código e descrição do produto + Lote (se houver).
         - **Rota Visual**: Linha intuitiva `Origem: {chip} ➔ Destino: {chip}`.
         - **Rodapé do Card**: Motivo / Observação do operador em itálico sutil.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**exit code 0**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Endereçamento WMS Mobile - Abas no Rodapé com Ícones, Busca no Cabeçalho com Dropdowns e Botão Flutuante (+) para Cadastrar

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora vamos ajusta a pagina do endereçamento,joga os menus para o rodapé com icones. Leva o busca para o cabeçalho com opção de ocultar, os filtros em dropdown, botão filtrar menor ao lado o campo de busca. Botão cadastrar no endereço um botão flutuante redondo (+) no canto inferior direto para ambas as abas de (endereço, produtos e historico)"*
  - Implementação completa em [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx) e [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    1. **Navegação de Abas no Rodapé com Ícones (`.enderecamento-bottom-nav`)**:
       - O menu superior de abas foi completamente removido do topo e migrado para uma barra de navegação fixa no rodapé (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 90`).
       - 3 abas estruturadas verticalmente com ícone no topo e texto abaixo:
         - `[ 📍 Endereços ]` (Aba 1)
         - `[ 📦 Produtos ]` (Aba 2)
         - `[ 🕒 Histórico ]` (Aba 3)
       - Container principal ajustado com `padding-bottom: 84px` para evitar sobreposição de elementos na tela.
    2. **Cabeçalho Sticky com Busca e Filtros Recolhíveis (`.enderecamento-header-sticky`)**:
       - Fixado no topo (`position: sticky; top: 0; z-index: 80`).
       - Cabeçalho com título, crachá de contagem de itens livres/ocupados, botão `[ 🖨️ Etiquetas ]` e alternador `[ ▲ Recolher / 🔍 Buscar ▾ ]` permitindo ao operador expandir ou ocultar a busca a qualquer momento para maximizar a área útil dos cards no celular.
       - **Linha 1 da Busca**: Campo de texto com ícone e botão `✕` para limpar + botão `[ Filtrar ]` compacto posicionado lado a lado na mesma linha.
       - **Linha 2 de Filtros**: Seletores dropdown (`<select>`) compactos para **Tipo** (`Todos`, `Picking`, `Pulmão`) e **Ocupação** (`Todos`, `🟢 Livres / Vazios`, `🔴 Ocupados`), eliminando o card gigante e os chips com rolagem lateral.
       - Na aba de Produtos, o formulário de busca adapta-se para pesquisa direta por código de barras ou nome com botão `[ Buscar ]` em linha única.
    3. **Botão Flutuante Redondo (+) para Cadastrar no Endereço (FAB)**:
       - O banner largo estático anterior (`Cadastrar no Endereço F2`) foi substituído por um Floating Action Button (FAB) redondo moderno:
         - `position: fixed; bottom: 70px; right: 18px; z-index: 95; width: 56px; height: 56px; border-radius: 50%; background: #f97316`.
         - Acessível e visível em todas as 3 abas (`Endereço`, `Produto`, `Histórico`) para usuários com a permissão `podeCadastrar`.
         - Ao clicar, abre imediatamente o modal coletor double-scan para vincular produtos aos endereços.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**exit code 0**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: KPIs e Rodapé Sem Rolagem Lateral, Botão (i) com Solicitante à Esquerda e Foto Centralizada no Modo Card

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos colocar os icones dos kips acima, para eles ficarem menor, fazer isso também para os botões do rodapé, precisamos evitar a rolagem lateral para esses dois objetos no design. outro ponto colocar o (i) dos cards dos produtos no lado do solicitado(no modo lista não está aparecendo quem solicitou) do lado esquerdo no modo lista. No modo card vamos vamos incluir a imagem do produto centralizado acima do nome em destaque, ganhamos espaço no cards."*
  - Implementação completa em [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx) e [`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css):
    1. **KPIs Ultra-Compactos com Ícone no Topo (Zero Rolagem Lateral)**:
       - Cada pílula (`.reabastecimento-kpi-pill`) configurada com layout vertical (`flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 2px`).
       - Ícone no topo e bloco com número em negrito + rótulo compacto abaixo (`Total`, `Aguard.`, `S/ Pulm`, `Hoje`, `Faltas`).
       - Distribuição uniforme ocupando 100% da largura da tela sem nenhuma rolagem horizontal.
    2. **Rodapé Fixo Ultra-Compacto com Ícone no Topo (Zero Rolagem Lateral)**:
       - Cada chip (`.reabastecimento-chip-btn`) estruturado verticalmente com ícone no topo e texto conciso + contagem abaixo (`Todas (X)`, `Aguard. (X)`, `S/ Pulm (X)`, `Hoje (X)`, `Faltas (X)`).
       - Ocupam 100% da barra do rodapé, eliminando completamente a rolagem horizontal no mobile.
    3. **Modo Lista: Botão `(i)` e Solicitante Posicionados à Esquerda**:
       - O botão de informações `[ ℹ️ ]` foi movido para o lado esquerdo da linha inferior, posicionado imediatamente antes dos metadados da solicitação.
       - Corrigida a renderização do operador solicitante no modo lista (`Solicitado: {data} • {solicitadoPor}`), que anteriormente não exibia o nome do usuário.
       - A linha de botões de ação à direita agora fica desobstruída e perfeitamente legível sem compressão.
    4. **Modo Card: Imagem do Produto Centralizada em Destaque**:
       - Adicionado componente `<ProdutoImagem>` com altura otimizada (~110px a 120px) e `object-fit: contain` posicionado centralizado acima da descrição do produto.
       - Ao clicar na foto, é aberto modal lightbox de zoom em tela cheia com overlay escuro.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**exit code 0**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Reabastecimento Mobile - Cabeçalho Sticky com KPIs em Linha Única, Busca com Alternador de Modo (Cards/Lista), Rodapé Fixo e Snap Scroll Vertical

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora vamos para reabastecimento, fixa esses kips em uma unica linha, com o campo busca abaixo e vamos fixar eles no cabeçalho. Os filtros colocar no rodapé e vamos colocar o card para rolar completo na vertical, mudando entre cards e incluir um modo lista (botão ao lado do botão de busca, para mudar para o modo card ou lista)"*
  - Implementação completa em [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx) e [`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css):
    1. **Cabeçalho Fixo no Topo (`.reabastecimento-header-sticky`)**:
       - `position: sticky; top: 0; z-index: 80`: fixado no topo da tela com background consistente e borda inferior.
       - **Linha 1**: `AppHeader` contendo título, menu drawer, crachá do usuário e atalhos.
       - **Linha 2**: **KPIs em Linha Única** (`.reabastecimento-kpis-row`): pílulas compactas com rolagem horizontal contendo `[🚜 {total} Total]`, `[⏳ {pendentes} Aguardando]`, `[⚠️ {semPulmao} Sem Pulmão]`, `[✓ {hoje} Hoje]` e `[⚠️ {faltas} Faltas]`. Tocar em qualquer pílula também ativa o filtro correspondente.
       - **Linha 3**: **Busca + Botão Alternador de Modo** (`.reabastecimento-search-row`): campo de texto com ícone e botão `✕` para limpar busca + botão `[ 📋 Lista ]` / `[ 🗂️ Cards ]` alternando visualmente a listagem.
    2. **Rodapé Fixo com Filtros de Status (`.reabastecimento-footer-fixed`)**:
       - Fixado na parte inferior da tela (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 90`) com efeito glassmorphism suave.
       - Botões em chips deslizantes horizontalmente: `Todas ({total})`, `⏳ Aguardando ({pendentes})`, `⚠️ Sem Pulmão ({semPulmao})`, `✓ Concluídas ({hoje})` e `⚠️ Faltas ({faltas})`.
       - Container com `padding-bottom: 84px` prevenindo sobreposição de conteúdo.
    3. **Modo Cards com Snap Scroll Vertical (`.modo-cards` e `.snap-item`)**:
       - No mobile, utiliza `scroll-snap-type: y mandatory; overflow-y: auto;` e `scroll-snap-align: start; scroll-snap-stop: always;`.
       - Cada card ocupa a área visível entre o topo e o rodapé fixos, rolando completo na vertical e mudando com precisão de card em card (feed/carrossel vertical).
    4. **Modo Lista Compacta (`.reabastecimento-lista-tarefas`)**:
       - Visualização condensada e rápida para o operador da empilhadeira:
         - Topo com Carga #, Empresa, badges de status e quantidade em destaque.
         - Linha do produto com código, descrição, referência e código de barras.
         - Rota rápida `📦 {pulmão} ➔ 📍 {picking}` e saldo disponível em estoque.
         - Ações operacionais compactas (`[ 🚜 Abastecer ]`, `[ ✂️ Corte ]`, `[ ⚠️ Falta ]`, `[ ✕ Recusar ]` e `[ ℹ️ ]` observações).
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**exit code 0**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Cabeçalho Sticky/Fixo no Topo, Ocultação da Lupa e Remoção do Card Redundante da Carga

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos remover o que está marcado com o X e mover a descrição, e fixa o cabeçalho."*
  - Análise da imagem (`media_1794856284780_8989216c.png`):
    1. **Remoção da Lupa `🔍` (Consultar Produto)**:
       - Omitido `onAbrirConsultaProduto` em `AppHeader` na tela de separação (`SeparacaoPage.tsx`), eliminando o botão `🔍` do topo conforme solicitado com o X.
    2. **Remoção do Card Superior e Realocação da Carga**:
       - O card `🚚 Separação de Cargas (Vendas)` (marcado com X) foi completamente ocultado no mobile durante a conferência ativa (`.separacao-page-header.sessao-ativa { display: none !important }`).
       - As informações essenciais da carga (`🚚 #41205 • Emp 2`) foram transferidas para a linha de progresso (`.separacao-mobile-stats-row`), ocupando o espaço central vazio entre a porcentagem e os itens concluídos.
    3. **Cabeçalho Fixo no Topo (`position: sticky`)**:
       - O bloco superior completo (`AppHeader` + linha de progresso com número da carga + abas de visão `[🧭 Rota Guiada] [📦 Consolidado] [📄 Por Pedido] [⚠️ Faltas]` + barra fina) foi envelopado em `.separacao-header-sticky-wrapper.sessao-ativa`.
       - Permanece 100% fixo no topo da tela do celular/coletor enquanto os produtos rolam livremente abaixo, entre o topo fixo e o leitor fixado no rodapé.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso.
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Alinhamento Horizontal no Topo (Linha Única), Reorganização da Tela Principal e Ordenador de Cargas

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"coloca consultar produtos e o usuário logado e o botão sair alinhado com o nome separação de carga e ai libera o espaço. Na tela principal organiza os campos e vamos colocar ordenador dos cards das cargas."*
  - Análise das imagens (`media_1794855221808_441eb3e0.png` e `media_1794855263382_c4679799.png`):
    1. **Cabeçalho Global do Topo (`AppHeader.tsx` e `AppDrawer.css`)**:
       - No celular, os botões `[ Consultar Produto ]`, `[ SUPERVISOR ]` e `[ Sair ]` quebravam para uma segunda linha inteira, ocupando espaço vertical precioso.
       - Solução aprovada: alinhamento na mesma linha horizontal única (`flex-wrap: nowrap`), com o botão de consulta reduzido para ícone `🔍` compacto, crachá pill do usuário e botão `Sair` compacto, eliminando 100% da segunda linha.
    2. **Card "Separação de Cargas (Vendas)" (`SeparacaoPage.tsx` e `SeparacaoPage.css`)**:
       - O botão `[ 🔄 Atualizar Cargas ]` foi movido para a direita do título na mesma linha horizontal, liberando a linha inteira que ocupava abaixo.
    3. **Card de Busca de Cargas**:
       - O campo de número de carga e o botão `[ Iniciar Separação ]` foram colocados lado a lado em linha horizontal única (`flex-direction: row; gap: 8px`).
    4. **Ordenador dos Cards de Cargas**:
       - Adicionado um campo seletor dropdown (`<select>`) compacto alinhado à direita do título "Ordens de Carga Pendentes":
         - `⚡ Prioridade (Reabastecidas / Em Andamento)` (default inteligente WMS)
         - `🔢 Carga # (Mais recente - decrescente)`
         - `🔢 Carga # (Menor número - crescente)`
         - `📦 Volume Total (Maior primeiro)`
         - `📦 Volume Total (Menor primeiro)`
         - `🏷️ Mais Itens Distintos`
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso.
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Gaveta Retrátil de Ações (Bottom Sheet com Ícone ^), Remoção de Barra na Lista de Cargas e Enquadramento Mobile

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"você colocou o menu na tela de lista de carga, deixa ela visivel apenas quando abri a separação."*
  - *"vamos colocar os botões que estão dentro do card separação de cargas(Vendas), ocultor encima do codigo de barras, e ao clicar no icone ^ ai eles aparecem sobrepondo a tela. E ai o card fica no dentro da tela do Android."*
  - Alinhamento `/grill-me`:
    1. **Tela 1 (Seleção / Lista de Ordens de Carga)**:
       - O campo de busca de carga volta a ser um card no fluxo normal (`.separacao-busca-carga-card`), no topo da lista.
       - A barra fixa do rodapé NÃO é mais renderizada na lista de cargas (visível estritamente quando a separação estiver aberta / sessão ativa).
    2. **Aba / Alça Retrátil com Ícone `^` (Acima do Leitor)**:
       - Uma aba centralizada discreta com o ícone `▲ Ações da Carga` foi posicionada logo acima do campo de código de barras no rodapé.
    3. **Gaveta de Ações Sobrepondo a Tela (Bottom Sheet Retrátil)**:
       - Ao clicar no ícone `^`, uma gaveta retrátil suave sobe com fundo escurecido semitransparente (backdrop com blur).
       - Apresenta os 5 botões de ação em formato de lista touch-friendly (altura 48-50px): `[🚜 Solicitar Reabastecimento]`, `[🔄 Sincronizar ERP]`, `[📋 Histórico de Bipagens]`, `[✓ Concluir Carga]` e `[← Voltar às Cargas]`.
       - Fecha com toque fora no backdrop ou no botão `✕`.
    4. **Enquadramento Perfeito do Card no Android**:
       - Com os 5 botões grandes removidos do cabeçalho superior no mobile (`.separacao-header-actions-sessao { display: none !important }`) e o título ultra-compacto, o card central do produto e rota subiu cerca de 160px, encaixando-se perfeitamente no viewport da tela do coletor/celular Android sem necessidade de rolagem vertical.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**BUILD SUCCESSFUL in 34s**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Otimização Mobile da Separação de Cargas (Eliminação de Rolagem Vertical e Barra Fixa Inferior)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"No modulo separação de cargas no android, ficou um rolamento muito vertical o que podemos fazer para esse design fica mais mobile?"*
  - Análise da tela no Android:
    1. A barra de bipagem ficava empilhada verticalmente (código, quantidade, lote, conferir), ocupando grande altura de tela.
    2. Os cards de progresso e métricas (Concluído %, Itens, Volumes, Faltas) formavam blocos verticais extensos antes do conteúdo principal.
    3. O usuário solicitou explicitamente manter a estrutura do card central (`separacao-rota-card`) 100% inalterada ("não modifique esse card") e ocultar o campo de Lote no mobile ("opção 1, vamos ocultar o lote.").
- **Implementações Realizadas:**
  - **1. Rodapé Fixo / Bottom Docked Scanner Bar ([`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
    - Em telas mobile (`max-width: 768px`), o card de bipagem foi convertido em uma barra fixa no rodapé da tela (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;`).
    - Design compacto com cantos arredondados superiores (`border-radius: 20px 20px 0 0`), sombra superior suave e respeito à área de segurança (`padding-bottom: calc(10px + env(safe-area-inset-bottom))`).
    - Layout horizontal em linha única: `[ Código de Barras ]` (`flex: 1`), `[ Qtd ]` (compacto `64px`, número em negrito centralizado) e `[ Conferir ]` (`border-radius: 10px`, altura `44px`).
    - O campo de `Lote` é ocultado no mobile via CSS (`display: none !important`), conforme diretriz aprovada.
    - O container da página recebeu espaçamento inferior (`padding-bottom: 96px`) para que o conteúdo não fique escondido sob a barra fixa.
  - **2. Topo Compacto & Navegação Deslizante ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) e [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
    - Criada a linha resumida mobile `.separacao-mobile-stats-row`: exibe progresso percentual, totalizador de unidades e contagem de itens em linha única com barra de progresso fina (6px).
    - As estatísticas desktop em caixas grandes foram encapsuladas em `.separacao-desktop-stats` e ocultadas no mobile (`display: none`).
    - As abas de navegação (`[🧭 Rota Guiada] [📦 Consolidado] [📄 Por Pedido] [⚠️ Faltas]`) foram adaptadas para deslizamento horizontal suave (`overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none;`).
  - **3. Integridade do Card Central:**
    - O card central de rota e produto (`.separacao-rota-card`), com seu banner de endereço, foto, dados de lote/validade, indicador de quantidade (`0 / 24 UN`) e botões (`Reabastecer`, `Falta`), permaneceu estritamente preservado.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**BUILD SUCCESSFUL in 31s**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Adaptação das Novas Telas para Design Nativo Android Mobile e Recompilação do APK

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"foram encremetados algumas telas novas para adaptar o desing para APP android e recopilar no aparelho"*
  - Alinhamento `/grill-me`:
    1. **Sensação Nativa de App Mobile (Eliminar Web Smells)**:
       - Adicionado `user-scalable=no, viewport-fit=cover` na viewport do `index.html` para evitar zoom acidental de duplo toque.
       - Remoção de seleção acidental de texto (`user-select: none`), remoção do highlight de clique azul do navegador (`-webkit-tap-highlight-color: transparent`) e física de rolagem inercial mobile com scrollbars limpas/invisíveis.
       - Micro-feedback tátil visual ao pressionar botões e cards (`:active { transform: scale(0.98); }`).
       - Respeito às safe areas do Android (notch e barra inferior de navegação).
    2. **Hub Inicial de Módulos ([`HubPage.css`](./frontend/src/presentation/pages/Hub/HubPage.css))**:
       - Grid adaptado para 2 colunas simétricas em celulares (`repeat(2, 1fr)`) com cards compactos e ícones amplos para toque de polegar.
    3. **Reabastecimento de Pulmão ([`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css))**:
       - Grade de métricas do topo reorganizada em 2 colunas no celular.
       - Barra de filtros com rolagem horizontal suave em chips deslizantes.
       - Botões de ação rápida (`Abastecer`, `Não Encontrado`) com altura mínima de 44px e largura total no card para operação confortável com uma mão/luvas.
    4. **Endereçamento WMS ([`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css))**:
       - Abas superiores deslizantes estilo pílulas horizontais nativas (`overflow-x: auto`).
       - Linhas analíticas de endereços transformadas em **Cards Verticais Mobile** com visual limpo de dados, status e botões de ação touch-friendly.
       - Formulário de busca e scanner com altura de 48px e botões em largura total.
    5. **Menu Lateral Drawer ([`AppDrawer.css`](./frontend/src/presentation/components/AppLayout/AppDrawer.css))**:
       - Altura de toque de 46-48px por item e micro-animação de pressão ao tocar.
- **Validações & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Capacitor: Sincronização via `npx cap sync android`.
  - Android APK: `gradlew assembleDebug` compilado com sucesso (**BUILD SUCCESSFUL in 41s**).
  - Deploy via ADB: Instalado e iniciado com sucesso no aparelho conectado (`R9XN701XGAE`).

---

## Atualização: Desmascaramento da Quantidade da Nota Fiscal na Tela de Gestão de Recebimento (`origem='gestao'`)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"pq na tela do supervisor não aparece a quantidade nota?"*
  - Análise das Imagens (`media_1794851674176_aa15f0f7.png` e `media_1794851703650_9b2ad1df.png`):
    - Usuário `ANTONY` (Administrador): visualizava os números faturados da nota (ex: `40`, `70`, `20`).
    - Usuário `SUPERVISOR`: visualizava traços (`—`) na coluna `Nota`.
  - Diagnóstico da Causa Raiz:
    1. O usuário `SUPERVISOR` possuía `"ver_campos_sensiveis": false` cadastrado na tabela `usuarios_acessos` do banco de dados local.
    2. No backend (`ObterItensConferenciaEntradaUseCase.ts`), o método `deveOcultarCampo('conferencia_entrada', 'qtdNota', usuario)` era executado cegamente para mascarar `qtdneg: null`, mesmo quando a requisição vinha da tela de **Gestão de Recebimento** (`input.origem === 'gestao'`).
    3. A tela de Gestão de Recebimento é um módulo gerencial de conciliação fiscal e envio ao ERP, onde a quantidade faturada da nota nunca deve ser mascarada como contagem cega.
    4. Adicionalmente, duas chamadas de detalhamento em `GestaoRecebimento.tsx` omitiam o parâmetro `'gestao'`.
- **Implementações Realizadas:**
  - **1. Backend ([`backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
    - Quando a requisição for proveniente da Gestão de Recebimento (`input.origem === 'gestao'`), os campos fiscais e gerenciais (`qtdNota`, `status`, `referencia`, `codBarra`) são liberados diretamente (`ocultarQtdNota = false`), garantindo que o supervisor e qualquer usuário com acesso ao módulo de gestão visualizem os valores faturados da nota (`rawQtd`).
    - A conferência cega permanece 100% restrita e protegida na tela operacional do conferente no coletor de dados (`origem !== 'gestao'`).
  - **2. Frontend ([`frontend/src/presentation/pages/GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
    - Padronização de todas as chamadas de `obterItensConferencia` para enviar explicitamente o parâmetro de origem `'gestao'`.
- **Validação de Builds Obrigatória:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Pré-Verificação de Idempotência na TGFITE (Prevenção de Duplicidades e Recuperação de Timeouts no Desmembramento)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"o desmembrar está seguindo que fluxo de requisição ao ERP? Percebi que em alguns momento ele envia a requisição de desmembrar mas o retorno demora ai o sistema está informando que demorou, ai o usuário vai e aperta em concluir novamente novo desmembrar é enviado. Deveriamos verificar se já houve o demembrar para aquele item agendado, evitando incosistencias nesses casos de erro ou sempre ao tentar executar o desmembrar. A verificação usaria o lote, quantidade, fabricação e validade para validar que já foi criado o item."*
  - Diagnóstico e Causa Raiz:
    1. O serviço `CACSP.desmembrarItem` no Sankhya pode levar de 20 a 40 segundos devido ao recálculo síncrono de impostos, PIS/COFINS e validações comerciais no Oracle.
    2. Quando ocorria timeout no transporte HTTP, a requisição era dada como falha no frontend, mas no banco Oracle ela prosseguia e criava as frações em background.
    3. Ao clicar novamente em "Concluir", uma nova requisição `CACSP.desmembrarItem` era enviada, podendo duplicar itens ou gerar falha por tentar desmembrar sequências já inexistentes ou alteradas.
- **Implementações Realizadas:**
  - **1. Pré-Verificação de Idempotência Exata na TGFITE ([`backend/src/application/use-cases/recebimento/ExecutarDesmembramentoItemUseCase.ts`](./backend/src/application/use-cases/recebimento/ExecutarDesmembramentoItemUseCase.ts)):**
    - Antes de invocar o serviço `CACSP.desmembrarItem`, o caso de uso consulta a tabela `TGFITE` para a nota e produto:
      ```sql
      SELECT ITE.SEQUENCIA, ITE.CODPROD, NVL(ITE.QTDNEG, 0) AS QTDNEG,
             ITE.CONTROLE, ITE.DTVAL, ITE.DTFABRICACAO
      FROM TGFITE ITE
      WHERE ITE.NUNOTA = :nunota AND ITE.CODPROD = :codprod
      ORDER BY ITE.SEQUENCIA
      ```
    - **Validação Exata dos 4 Campos:**
      Para cada fração solicitada em `input.lotes`, verifica uma linha exclusiva correspondente na `TGFITE` com:
      1. **Lote:** `it.controle.trim().toUpperCase() === fracao.lote.trim().toUpperCase()`
      2. **Quantidade:** `Math.abs(it.qtdneg - qtdSankhyaEsperada) < 0.0001` (com conversão de fator `TGFVOA`)
      3. **Data de Validade:** Comparação de data normalizada em `DD/MM/YYYY`
      4. **Data de Fabricação:** Comparação de data normalizada em `DD/MM/YYYY`
    - **Ação em Caso Positivo (`jaDesmembradoNoSankhya === true`):**
      - Pula completamente a chamada do serviço `CACSP.desmembrarItem`.
      - Executa imediatamente o pós-processamento: reatribuição de sequências de bipagens locais no SQLite (`reatribuirSequenciasBipagens`), atualização de `CODLOCALORIG`, sincronização de ocorrências pendentes (Avaria, Vencidos) e recálculo das divergências.
      - Retorna sucesso de imediato informando que o desmembramento já existia no ERP e foi validado com sucesso.
    - **Ação em Caso Negativo (`jaDesmembradoNoSankhya === false`):**
      - Segue o fluxo normal de envio do `CACSP.desmembrarItem`. Caso ocorra timeout, o erro é acusado e, na próxima tentativa do usuário, a checagem prévia encontrará as frações já salvas e concluirá imediatamente com sucesso.
- **Validação de Builds Obrigatória:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Tratamento Inteligente de Sequências Desmembradas por Falta no ERP (Falta Isolada)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"Veja essa linha dessa conferencia de entrada, ela foi um desmebramento por falta, o numero do lote foi informando o numero da nota, o item quando for demenbrado por falta deveria ignorar os contagem e ficar com a tag (OK) Falta Isalada ERP. Eu percebi que não estamos linkando os dados contados com e a falta desmebrados com o lote e validade informado."*
  - Diagnóstico:
    1. Quando uma linha é desmembrada no ERP para registrar falta (ex: Sequência 7 da NF 35802 com 8 UN), o Sankhya cadastra o lote (`CONTROLE`) com o número da Nota Fiscal (`NUMNOTA` / `NUNOTA`).
    2. O backend realizava um rebalanceamento FIFO agrupando todas as sequências do mesmo produto (`CODPROD`) e distribuía cegamente as bipagens físicas em todas as sequências, injetando contagens físicas de N2 (22 UN) na sequência da falta e gerando falso alerta de sobra `+14` com sobrescrita indevida do lote da linha pelo lote bipado (`010/26A`).
    3. Na reatribuição de bipagens locais (`LibsqlConferenciaEntradaRepository.ts`), o algoritmo alocava bipagens na sequência da falta por encontrar saldo faturado livre.
- **Implementações Realizadas:**
  - **1. Backend - Identificação e Isolamento da Falta Isolada:**
    - [`backend/src/domain/entities/ConferenciaEntrada.ts`](./backend/src/domain/entities/ConferenciaEntrada.ts): Adicionado `isFaltaIsolada?: boolean` na interface `ItemNotaEntrada`.
    - [`backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts):
      - Detecção de sequências de Falta Isolada (`controleOriginal === numnota || controleOriginal === nunota`).
      - Exclusão absoluta das sequências de falta do loop de rateio FIFO das bipagens físicas (`N1 = 0, N2 = 0, N3 = 0`).
      - Preservação estrita dos dados cadastrados no ERP (`lote = controleOriginal`, `validade = dtvalOriginal`, `fabricacao = dtfabricacaoOriginal`).
      - Tratamento da diferença como resolvida (`diferenca = 0, divergente = false, conferidoCompleto = true, isFaltaIsolada = true`).
    - [`backend/src/infrastructure/repositories/LibsqlConferenciaEntradaRepository.ts`](./backend/src/infrastructure/repositories/LibsqlConferenciaEntradaRepository.ts):
      - Em `reatribuirSequenciasBipagens`: Sequências de falta isolada têm `saldoRestante = 0` e são excluídas da busca de candidatos, garantindo que o banco de dados NUNCA atribua bipagens físicas a sequências de falta.
    - [`backend/src/application/use-cases/recebimento/ListarDivergenciasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarDivergenciasEntradaUseCase.ts):
      - Adicionado `isFaltaIsolada?: boolean` em `ItemDivergenciaResumo`.
      - Itens identificados como Falta Isolada no ERP são desconsiderados de divergências fiscais, pendências e sobras falsas.
  - **2. Frontend - Apresentação Visual e Tag `(OK) Falta Isolada ERP`:**
    - [`frontend/src/domain/models/ConferenciaEntrada.ts`](./frontend/src/domain/models/ConferenciaEntrada.ts): Campo `isFaltaIsolada?: boolean` em `ItemNotaEntrada` e `ItemDivergenciaResumo`.
    - [`frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx):
      - Na grade principal (desktop) e nos cards mobile: exibição da pill `✓ OK` com subtítulo `Falta Isolada ERP` em verde suave neutro (`#047857`, fundo `#ecfdf5`).
      - Coluna Lote exibe o lote original da nota com tag `Falta Isolada`.
    - [`frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx):
      - Coluna Diferença exibe a pill estilizada `✓ OK` / `Falta Isolada ERP`.
      - Coluna Lote exibe o lote do ERP (`35802`) com a tag `Falta Isolada`.
    - [`frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx):
      - Sequências de Falta Isolada não pontuam como divergências pendentes no topo e renderizam com a tag `✓ OK (Falta Isolada ERP)`.
- **Validação de Builds Obrigatória:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Inversão Global da Posição das Colunas (Fabricação antes de Validade) em Todas as Grades da Gestão de Recebimento

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos inverter a posição das colunas de validade e fabricação na tela de gestão de recebimento, para todas as grades nela presente."* (Imagens: `media_1794846543907_42f12267.png`, `media_1794846559670_114466cd.png`, `media_1794846571137_bcb9ea25.png` destacando as colunas nas Abas 1, 2 e 3).
  - Alinhamento de Design acordado:
    1. **Ordem Cronológica Intuitiva:** Colocar **Fabricação** (data mais antiga/passada) antes de **Validade** (data futura/vencimento) em todas as tabelas e grades da tela de Gestão de Recebimento.
    2. **Abrangência Completa:**
       - **Aba 1 (Conferências):** Colunas `Fabricação` | `Validade` na grade principal e `Data de Fabricação` | `Data de Validade` na gaveta analítica de lotes.
       - **Aba 2 (Divergências):** Colunas `FABRICAÇÃO` | `VALIDADE` na grade comparativa principal e `Data de Fabricação` | `Data de Validade` na gaveta analítica.
       - **Aba 3 (Envio ao Sankhya):** Colunas `Fabricação` | `Validade` na grade principal e `Data de Fabricação` | `Data de Validade` na gaveta de frações de lote.
       - **Modais:** Grade de frações em [`ModalDesmembrarItem.tsx`](./frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx), histórico de itens em [`ModalRestaurarBackup.tsx`](./frontend/src/presentation/components/Recebimento/ModalRestaurarBackup.tsx) e prévia em [`ModalImportarLotesExcel.tsx`](./frontend/src/presentation/components/Recebimento/ModalImportarLotesExcel.tsx).
       - **Assistente de Divergências:** Exibição comparativa com `Fab: ...` antes de `Val: ...` nos cards de decisão e seletores rápidos de [`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx).
       - **Mobile / Cards Compactos:** Exibição padronizada com `Fab:` antes de `Val:`.
- **Implementações Realizadas:**
  - [`frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx): Inversão das colunas de cabeçalho, células `<td>`, gaveta de lotes e cards mobile.
  - [`frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx): Inversão das colunas de cabeçalho `FABRICAÇÃO` / `VALIDADE`, células `<td>` comparativas empilhadas, gaveta de lotes e blocos de decisão mobile.
  - [`frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx): Inversão das colunas de cabeçalho, células `<td>`, gaveta de lotes e visualizações mobile.
  - [`frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx`](./frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx): Inversão das colunas `Fabricação` e `Validade` na tabela de edição de frações.
  - [`frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx): Ordenação de `Fab` antes de `Val` nos cards comparativos do assistente.
  - [`frontend/src/presentation/components/Recebimento/ModalRestaurarBackup.tsx`](./frontend/src/presentation/components/Recebimento/ModalRestaurarBackup.tsx) e [`frontend/src/presentation/components/Recebimento/ModalImportarLotesExcel.tsx`](./frontend/src/presentation/components/Recebimento/ModalImportarLotesExcel.tsx): Inversão nas colunas e células de visualização.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Alinhamento dos Dados do Endereço à Esquerda com o Checkbox na Lista Analítica

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"vamos colocar ele alinhado a esqueda com o checkbox"*
  - Diagnóstico da Imagem (`media_1794846414265_05ba9c6b.png`): Havia um espaçamento vazio excessivo entre o checkbox isolado na ponta esquerda e o badge `[ PICKING ]` + chips de endereço devido à regra `justify-content: space-between` com três filhos diretos.
  - Alinhamento de Design acordado:
    1. **Estrutura Agrupada à Esquerda (`.enderecamento-analitico-lado-esq`):** O checkbox de largura compacta (24px) e a coluna de endereço (`.enderecamento-analitico-col-end` com badge `[ PICKING / PULMÃO ]`, chips `[ RUA 01 ] ...` e descrição do código) foram unificados em um container flex alinhado à esquerda com gap natural de 14px.
    2. **Eliminação do Espaço Vazio:** O badge e os chips ficam imediatamente após o checkbox, perfeitamente alinhados verticalmente com a toolbar de *"Selecionar Todos"* do topo.
    3. **Preservação das Ações na Direita:** O status de ocupação (`[ 📦 X produtos ]` / `[ 🟢 Livre ]`), o botão `🖨️` e o botão `👁️ Ver Produtos` permanecem fixos na extremidade direita do card.
- **Implementações Realizadas:**
  - [`frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx): Criação do wrapper `.enderecamento-analitico-lado-esq` contendo o checkbox e a coluna de endereço.
  - [`frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css): Estilos `.enderecamento-analitico-lado-esq` e `.enderecamento-item-checkbox-wrapper`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Destaque Ampliado de Endereçamento com Nome "POSIÇÃO" por Extenso e Escala Dinâmica

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"faz esse ajuste no tamanho, e vamos colocar o nome posição. O nome e o numero do endereçamento precisa ter destaque/maior para visualmente ser enxergado, pois pode ficar em local alto ou distante."*
  - Contexto da Imagem (`media_1794842788747_a1899dad.png`): No modelo de 2 por folha com apenas Posição selecionada, o card e o número apareciam tímidos e pequenos em relação à área útil da folha.
  - Alinhamento de Design acordado:
    1. **Nome "POSIÇÃO" por Extenso:** Substituição do termo abreviado `POS` por `POSIÇÃO` tanto nos chips da etiqueta quanto nos checkboxes de configuração, garantindo clareza total.
    2. **Escala Dinâmica Responsiva:** A área de coordenadas se expande automaticamente de acordo com o número de campos marcados (`campos-1`, `campos-2`, `campos-3`, `campos-4`):
       - **1 Campo Marcado (ex: apenas POSIÇÃO):** O número é renderizado em tamanho gigante (até 100px no layout de 2 por folha e 76px no de 4 por folha) e o rótulo com 26px em negrito 900, permitindo leitura visual nítida por empilhadeiristas a longa distância ou em posições aéreas elevadas.
       - **2 Campos Marcados (ex: RUA + POSIÇÃO):** Número com 74px (layout 2) e 54px (layout 4).
       - **3 ou 4 Campos Marcados:** Proporção harmoniosa otimizada (50px / 38px).
    3. **Sincronização Total:** O dimensionamento ultra-legível reflete em tempo real na pré-visualização da folha A4 e no documento impresso gerado via `window.print()`.
- **Implementações Realizadas:**
  - [`frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx): Adição da propriedade `totalCamposCoords` com classes dinâmicas `campos-${totalCamposCoords}`, troca do texto para `POSIÇÃO` e regras CSS inline dinâmicas no HTML de impressão.
  - [`frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css): Novas classes `.preview-coords-grid.campos-*` ajustando altura mínima, padding, tamanho de fonte de rótulos e números.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Central de Impressão de Etiquetas WMS para Longarinas e Prateleiras (Folha A4, Code 128 / QR Code e Seleção Flexível)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"agora precisamos imprimir esse endereços para gerar as identificações dentro do galpão logistico."*
  - Alinhamento de Requisitos acordado via `/grill-me`:
    1. **Papel e Destino:** Folha A4 comum / sulfite para identificação de gôndola/longarina.
    2. **3 Modelos de Layout A4 Selecionáveis:**
       - **4 por folha (A4 Paisagem ~14x10cm):** Formato padrão para longarinas médias com alta visibilidade.
       - **2 por folha (A4 Retrato ~20x14cm):** Meia folha grande para visualização aérea/empilhadeiras.
       - **8 por folha (A4 Retrato ~9x7cm):** Grade compacta 2x4 para prateleiras e gaveteiros.
    3. **Tipos de Códigos Disponíveis:** Código de Barras linear (Code 128), QR Code ou ambos simultâneos.
    4. **Campos Visuais Flexíveis:** Checkboxes para habilitar/desabilitar Rua, Torre, Nível, Pos (destaque verde/azul), Tipo (Picking/Pulmão), CODEND e Descrição, com botão "Marcar/Desmarcar Todos".
    5. **Seleção de Endereços:**
       - Checkboxes individuais em cada linha da lista analítica.
       - Barra de ações em lote no topo com "Selecionar Todos ({N})".
       - Botão individual rápido `🖨️` por linha.
       - Aba "Intervalo / Filtro" no modal para filtrar por Rua De/Até, Torre De/Até, Nível De/Até e Tipo.
    6. **Pré-visualização e Impressão:** Painel com simulação real da folha A4 e botão `[ 🖨️ Imprimir ]` que abre janela de impressão isolada com CSS `@page` sob medida.
- **Implementações Realizadas:**
  - [`frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.tsx): Componente completo com renderização vetorial de Code 128 (`jsbarcode`) e QR Code (`qrcode`), paginação de preview e gerador de folha de impressão HTML/CSS.
  - [`frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css`](./frontend/src/presentation/components/enderecamento/ModalImpressaoEtiquetas.css): Estilos do modal, painel de controles, preview em escala A4 e regras de quebra de página.
  - [`frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx): Botão no cabeçalho `🖨️ Central de Etiquetas`, toolbar de seleção em lote, checkboxes por linha e botão `🖨️` rápido.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Ajuste Ergonômico de Layout Vertical no Popup de Mudança de Picking (DE ➔ PARA)

- **Demanda do Usuário & Alinhamento via `/grill-me`:**
  - *"precisamos ajustar a para caber no popup"*
  - Diagnóstico da Imagem (`media_1794841027536_6c2129c5.png`): O card `NOVO PICKING (PARA)` à direita estava cortando o último chip de endereço (`[ POS 01 ]`) devido ao layout horizontal em 2 colunas estreitas.
  - Alinhamento de Design acordado:
    1. **Empilhamento Vertical (DE em cima ⬇️ PARA embaixo):** Ambos os cards passam a ocupar 100% da largura útil interna (~450px), permitindo que os 4 chips (`[ RUA 01 ]` `[ TORRE 01 ]` `[ NÍVEL 01 ]` `[ POS 01 ]`) fiquem perfeitamente acomodados em linha única e centralizados.
    2. **Cabeçalho em Linha com Tags de Status:**
       - Card DE: Título `📍 PICKING ANTERIOR (DE)` à esquerda e badge estilizado `(Será Inativado)` à direita.
       - Card PARA: Título `🎯 NOVO PICKING (PARA)` à esquerda e badge de sucesso `(✓ Novo Picking Oficial)` à direita.
    3. **Conector Central Elegante:** Divisor suave com botão circular centralizado `⬇️`.
- **Implementações Realizadas:**
  - [`frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx): Reestruturação do container comparativo DE ➔ PARA com `tamanho="normal"`.
  - [`frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css): Estilos `.enderecamento-depara-box-header`, `.enderecamento-depara-status-tag`, `.enderecamento-depara-chips-wrap` e `.enderecamento-depara-conector`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Padronização Visual Universal de Endereços WMS em Chips/Pílulas (RUA, TORRE, NÍVEL, POS) em Todas as Telas e Modais

- **Demanda do Usuário & Alinhamento de Design (`/grill-me`):**
  - *"vamos adotar esse design para os endereços em todas as telas de endereçamentos"*
  - Contexto da Imagem (`media_1794839849753_a0689d84.png`): 4 blocos/chips visuais elegantes separados: `[ RUA 01 ]` `[ TORRE 01 ]` `[ NÍVEL 01 ]` `[ POS 01 ]` com a `POS` em destaque (fundo suave `#f0fdf4` e borda azul `#3b82f6`).
  - Alinhamento de UX acordado via `/grill-me`:
    1. **Omissão da Máscara Numérica Crua:** Exibição exclusiva dos chips coordenados limpos, sem poluir a interface com a sequência crua `01.01.01.01.01`.
    2. **Chip Sem Endereço Padronizado:** Caso o item ou picking não possua endereço ativo cadastrado, renderiza o chip tracejado elegante: `[ ⚠️ Sem Endereço Cadastrado ]`.
    3. **Escopo Global de Aplicação:** Aplicado uniformemente em todas as visões do módulo de Endereçamento WMS:
       - **Aba 1 (`📍 Por Endereço`):** Lista analítica de endereços e ocupação.
       - **Aba 2 (`📦 Por Produto`):** Banner de contexto do endereço selecionado, linhas de Picking oficial e linhas de Pulmões ativos.
       - **Aba 3 (`🕒 Histórico`):** Colunas de endereço de Origem e Destino na tabela de auditoria.
       - **Modal do Coletor (`⚡ Cadastrar no Endereço`):** Bloco 1 (Endereço Resolvido Ativo), Card de Prévia Visual (Picking Oficial e Pulmões Ativos), Feed da Sessão de Itens Cadastrados e Instrução do 2º Bip.
       - **Modal Popup Centralizado DE ➔ PARA:** Quadros comparativos de Picking Anterior (DE) e Novo Picking (PARA).
       - **Modais Operacionais:** Origem e Destino nos modais de Mover e Retirar/Desendereçar.
- **Implementações Realizadas:**
  - [`frontend/src/presentation/components/common/EnderecoChips.tsx`](./frontend/src/presentation/components/common/EnderecoChips.tsx): Componente comum desacoplado, com parser automático de formato máscara (`01.01.01.01.01`) e textual (`R 01 T 01 N 01 P 01`), suportando tamanhos `normal`, `destaque` e `compacto`.
  - [`frontend/src/presentation/components/common/EnderecoChips.css`](./frontend/src/presentation/components/common/EnderecoChips.css): Estilização fiel aprovada pelo usuário com rótulos `RUA`, `TORRE`, `NÍVEL`, `POS`, valores em negrito monoespaçado e chip `⚠️ Sem Endereço Cadastrado`.
  - [`frontend/src/presentation/pages/separacao/EnderecoChips.tsx`](./frontend/src/presentation/pages/separacao/EnderecoChips.tsx): Reexportação do componente comum para reaproveitamento total sem duplicação no módulo de Separação.
  - [`frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx): Substituição integral das strings brutas de endereço pelos componentes `<EnderecoChips />`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Modal Popup Centralizado de Mudança de Picking (DE ➔ PARA) no 1º Bip do Coletor

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"no caso do produto já está cadastrado em um outro endereço(picking) vamos lançar um popup perguntando se ele quer mudar para o atual."*
  - Contexto da Imagem (`media_1794838861663_55bca48d.png`): O usuário cadastrou um item e quando o produto já tem picking, a confirmação precisa ser evidente e imediata.
  - Alinhamento de UX via `/grill-me`:
    1. **Disparo Imediato no 1º Bip:** Ao localizar o produto, se o endereço de destino for de Picking e o item já possuir outro Picking ativo no ERP Sankhya, o sistema abre imediatamente o popup de mudança.
    2. **Modal Centralizado com Quadro DE ➔ PARA:** Exibe foto do produto, endereço anterior (DE - que será inativado) e novo endereço (PARA - novo picking oficial), com botões `[ ⚡ Sim, Mudar para o Atual (Enter) ]` e `[ ✕ Manter no Anterior (Esc) ]`.
    3. **Diferenciação do Mesmo Endereço:** Se o produto já estiver cadastrado no MESMO endereço atual (ex: `01.01.01.01.01`), não abre popup de mudança; apenas emite aviso suave *"⚠️ Produto já cadastrado e ativo neste endereço"*, mantendo o foco no próximo bip.
    4. **Inativação e Ativação Automática:** Ao confirmar, inativa o picking anterior (`ATIVO = 'N'`, `DTFIM = hoje`) e ativa o novo vínculo (`ATIVO = 'S'`) via `DatasetSP.save` na entidade `ProdutoEndereco` (`TGWEXP`), registrando auditoria local `DEFINIR_PICKING`.
- **Implementações Realizadas:**
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Detecção no `handleLocalizarProduto` de picking anterior em outro endereço versus mesmo endereço.
    - Modal popup centralizado `.enderecamento-modal-picking-overlay` e `.enderecamento-modal-picking-card` com atalhos de teclado `Enter` (confirmar mudança) e `Escape` (cancelar/manter anterior).
  - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    - Estilos `.enderecamento-modal-picking-*` com layout DE ➔ PARA em destaque.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---


## Atualização: Exibição da Foto do Produto com Banner Amplo (120x120px) e Lightbox na Pré-visualização do Coletor

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"a foto do produto não apareceu"*
  - Diagnóstico: O card de pré-visualização no coletor e os cards de produtos na aba de Endereçamento WMS não estavam utilizando o componente padrão `ProdutoImagem`, exibindo apenas um placeholder de emoji estático.
  - Alinhamento de UX via `/grill-me`:
    1. **Banner Visual Amplo (120x120px):** Imagem nítida e ampla posicionada em destaque no topo do card de pré-visualização do coletor para conferência imediata da embalagem.
    2. **Lightbox de Foto Ampliada:** Clique na foto abre modal em tela cheia com alta resolução (fechando com `Escape` ou clique fora).
    3. **Miniaturas na Aba Geral de Produtos:** Miniaturas de 64x64px com cantos arredondados e suporte a zoom incorporadas na listagem da aba `📦 Por Produto`.
- **Implementações Realizadas:**
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Importação de `ProdutoImagem` conectada à rota nativa `/api/crud/produto/:codprod/imagem`.
    - Inclusão do container de foto ampla de 120x120px com dica visual *"🔍 Toque na foto para ampliar"*.
    - Inclusão de `ProdutoImagem` na lista analítica de produtos (`📦 Por Produto`).
    - Lightbox modal `imagemAmpliada` com fechamento automático no `Escape`.
  - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    - Estilos `.enderecamento-coletor-previa-foto-container`, `.enderecamento-coletor-previa-foto-ampla`, `.enderecamento-produto-thumb` e `.enderecamento-modal-foto-*`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---


## Atualização: Pré-visualização do Produto antes do Cadastro com Double-Scan e Situação WMS

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"na rotina de cadastrar no endereço, ao ler o codigo de barra do produto ou o codigo do produto vamos mostrar o produto antes de cadastrar efetivamente no endereço."*
  - Alinhamento de UX e segurança operacional via `/grill-me`:
    1. **Double-Scan de Confirmação:** O 1º bip do código de barras ou CODPROD localiza e exibe o produto na tela; o 2º bip (do mesmo código de barras ou tecla Enter) confirma e grava o cadastro no endereço.
    2. **Card Completo com Situação WMS Atual:** Exibe foto/ícone, código, descrição, referência, código de barras EAN, unidade (`CODVOL`), lote (se preenchido), e o panorama atual no armazém (Picking oficial atual, Pulmões ativos e Saldo disponível em estoque).
    3. **Bloqueio de Divergência no 2º Bip:** Se o operador estiver com um produto em tela e bipar um código de barras diferente, emite alerta sonoro de erro (`tocarSom('erro')`) e exibe mensagem de advertência em destaque vermelho, sem substituir o produto acidentalmente e exigindo o cancelamento explícito via botão `[ ✕ Trocar Produto ]` ou tecla `Escape`.
- **Implementações Realizadas:**
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Estados `produtoPrevia`, `codigoBipadoPrimeiro`, `coletorDivergenciaMsg` e ref `coletorConfirmarRef`.
    - `handleLocalizarProduto`: Executado no 1º bip, consulta o item no Sankhya via `buscarPorProduto(termo, 1)` e abre a pré-visualização.
    - `handleSubmeterConfirmacao`: Executado no 2º bip ou Enter, valida se o código confere com o produto selecionado antes de chamar a API de gravação.
    - Atalho `Escape`: Cancela o produto em exibição e volta o foco para o 1º bip.
  - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css):
    - Estilos `.enderecamento-coletor-previa-*`: card azul destacado, metadados, situação WMS, banner instrucional e alerta de divergência animado (`shake`).
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---


## Atualização: Rotina de Cadastro Rápido de Produtos no Endereço (Modo Coletor WMS)

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"vamos da continuidade ao endereçamento, precisamos criar a rotina para cadastrar os produtos no endereço, qual o melhor mecanica para essa rotina?"*
  - Alinhamento de mecânica operacional e UX via `/grill-me`:
    1. **Mecânica Híbrida e Flexível:** Modal de alta velocidade no coletor (`F2`), com suporte a fixar a posição física com toggle `[ 🔒 Travar Endereço ]` para bipar múltiplos produtos em série sem rebipar a rua/nível, ou alternar livremente.
    2. **Cadastro Puramente Locacional:** Vinculação física SKU x Endereço em `TGWEXP` (sem exigir digitação de quantidade física, com campo de lote/controle opcional).
    3. **Regra de Ouro do Picking Único:** Se o endereço for de Picking e o produto já possuir outro picking ativo no Sankhya ERP, exibe confirmação rápida com o picking anterior e inativa o antigo automaticamente via `DatasetSP.save` ao confirmar.
    4. **Bipagem Repetida no Mesmo Endereço:** Emite alerta suave e feed visual sem travar o operador ou interromper o ritmo de bipagem.
    5. **Feed da Sessão Atual:** Rodapé em tempo real exibindo os últimos itens cadastrados na sessão com hora, código, descrição e endereço.
    6. **Permissão Dedicada:** Criada a permissão `enderecamento_cadastrar` gerenciável na Gestão de Acessos para liberar o coletor aos operadores autorizados.
- **Implementações Realizadas:**
  - **Permissões de Acesso:**
    - [`PermissaoUsuario.ts`](./backend/src/domain/entities/PermissaoUsuario.ts) & [`Auth.ts`](./frontend/src/domain/models/Auth.ts): Adicionado `enderecamento_cadastrar`.
    - [`GestaoAcessos.tsx`](./frontend/src/presentation/pages/GestaoAcessos.tsx): Adicionado subtoggle *"⚡ Cadastrar no Endereço (Modo Coletor)"* e integração com perfis.
  - **Backend (Regra de Negócio & API):**
    - [`CadastrarProdutoEnderecoUseCase.ts`](./backend/src/application/use-cases/enderecamento/CadastrarProdutoEnderecoUseCase.ts): Validação de endereço em `TGWEND`, resolução de produto por `CODPROD` ou `CODBARRA` em `TGFBAR`, checagem de duplicidade ativa, substituição automática de picking anterior e gravação em `DatasetSP.save` (`ProdutoEndereco`) e auditoria em `historico_enderecamento`.
    - [`EnderecamentoController.ts`](./backend/src/presentation/http/controllers/EnderecamentoController.ts) & [`enderecamentoRoutes.ts`](./backend/src/presentation/http/routes/enderecamentoRoutes.ts): Rota `POST /api/enderecamento/cadastrar` com middleware de permissão `enderecamento_cadastrar`.
    - [`container.ts`](./backend/src/container.ts): Registro da injeção de dependência no Composition Root.
  - **Frontend (Interface do Coletor):**
    - [`EnderecamentoApiService.ts`](./frontend/src/infrastructure/api/EnderecamentoApiService.ts): Método `cadastrar` tipado.
    - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx): Botão de destaque no topo `[ ⚡ Cadastrar no Endereço ]` com atalho `F2`, modal de alta velocidade com auto-foco, trava de endereço, confirmação de substituição de picking e feed em tempo real da sessão.
    - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css): Estilos dedicados com animações, feedback sonoro e layout otimizado para coletores HoneyWell/Zebra e telas touch.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---


## Atualização: Ordenação Vertical e Apresentação Comparativa Empilhada (NF -> N1 -> N2 -> N3) em LOTE, VALIDADE e FABRICAÇÃO

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"vamos ordenar os dados lote/validade e fabricação, para NF, N1(se existir), N2(Se existir) e N3(se existir)"* (Imagem: `media_1794600653992_3147d860.png` mostrando células de Lote, Validade e Fabricação com N2 em cima e NF embaixo).
  - Alinhamento de design via `/grill-me`:
    1. Lista empilhada completa na exata ordem cronológica/fiscal: 1ª linha **NF**, 2ª linha **N1** (se existir), 3ª linha **N2** (se existir) e 4ª linha **N3** (se existir).
    2. Identificação com tags compactas coloridas (cinza para `NF`, azul para `N1`/`N2`, roxo para `N3`).
    3. Destaque no nível adotado/ativo: exibe `✓` verde e texto em negrito no nível selecionado (ERP, N1, N2 ou N3).
    4. Múltiplos lotes no nível: botão compacto `2 Lotes ▼` mantido na respectiva linha para expandir a gaveta analítica.
    5. Apenas exibição comparativa estática (decisão de nível continua pelas colunas de quantidade e pelo assistente).
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Isolamento de Dados por Nível:**
     - Extração rigorosa e segura de dados faturados (`controleOriginal`, `validadeOriginal`, `fabricacaoOriginal`) e conferidos em cada etapa (`loteN1`/`valN1`/`fabN1`, `loteN2`/`valN2`/`fabN2`, `loteN3`/`valN3`/`fabN3`).
  2. **Estrutura Empilhada Padronizada:**
     - Aplicada simultaneamente nas 3 colunas de conferência: **`LOTE`**, **`VALIDADE`** e **`FABRICAÇÃO`**.
     - Cada linha exibe sua tag colorida e o valor correspondente formatado.
     - Preservado o container com borda vermelha (`border: 1.5px solid #ef4444; background: #fef2f2`) enquanto houver pendência e borda verde (`border: 1px solid #bbf7d0; background: #f0fdf4`) após a resolução.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Remoção de Lote NF sob Ref e Destaque com Borda Vermelha em Divergências de Lote, Validade e Fabricação

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"esse lote NF embaixo de ref vamos remover, e caso tenha divergencia de lote/validade/fabricação vamos colocar uma borda vermelha, para o destacar que existe a divergencia."* (Imagem: `media_1794600056662_7abf9dd3.png` destacando a linha `• Lote NF:` na coluna Produto e os retângulos nas células de Lote, Validade e Fabricação).
  - Alinhamento de design via `/grill-me`:
    1. Borda vermelha ativa apenas enquanto a divergência daquela propriedade estiver pendente (fica com borda verde discreta/resolvida após a decisão).
    2. Estilo visual: Box/Card arredondado (`border: 1.5px solid #ef4444`, `background: #fef2f2`, `border-radius: 6px`, `padding: 3px 6px`).
    3. Aplicado tanto na tabela desktop com N3 quanto na visualização mobile/sem N3.
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Remoção de `• Lote NF:` da Coluna Produto:**
     - Eliminada a linha de texto redundante `• Lote NF: {item.controleOriginal}` localizada abaixo da referência do produto em todas as visualizações (desktop e mobile).
  2. **Destaque Visual com Borda Vermelha nas Células de Divergência:**
     - Criada a função de estilização `getEstiloBoxDivergencia(isPendente, isDecidido)`:
       - **Pendente:** Container arredondado com borda vermelha vibrante (`#ef4444`), fundo suave avermelhado (`#fef2f2`) e texto do valor da conferência e da NF em vermelho escuro legível (`#b91c1c`).
       - **Decidido / Resolvido:** Container arredondado com borda verde suave (`#bbf7d0`), fundo esmeralda claro (`#f0fdf4`) e texto verde (`#047857`) com prefixo `✓`.
       - **Sem Divergência:** Container limpo sem borda.
     - Aplicado individualmente nas 3 colunas comparativas:
       - **LOTE:** Destaca quando `isPendenteLote` estiver ativo.
       - **VALIDADE:** Destaca quando `isPendenteValidade` estiver ativo.
       - **FABRICAÇÃO:** Destaca quando `isPendenteFabricacao` estiver ativo.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Trava de Segurança Definitiva para Aprovação de Divergências e Prevenção de Status CONFERIDO Prematuro

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"Veja o motivo pq essa nota está conferido e ainda está ativo o desmembranemto, não foi feito no assitente? E se não foi feito, pq feoi para status conferido."*
  - Resposta do usuário: *"Sim, e vamos colocar um checagem para as divergencias antes de liberar para o status CONFERIDO."*
  - **Diagnóstico da Causa Raiz:**
    1. **Botão de Aprovação Prematuro no Frontend ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):** A condição `podeResolverDivergencia` avaliava apenas `totalFiscaisPendentes === 0`. Quando um item possuía múltiplos lotes (ex: 36 UN faturadas bipadas em 2 frações de 18 UN), não havia diferença de quantidade (`diferenca === 0`), permitindo que o supervisor clicasse em `✓ Resolver Divergência` e a conferência fosse aprovada para o status `Conferido` sem que o desmembramento fosse realizado.
    2. **Ausência de Validação Impeditiva no Backend ([`ResolverDivergenciaUseCase.ts`](./backend/src/application/use-cases/recebimento/ResolverDivergenciaUseCase.ts)):** O backend atualizava diretamente o status da conferência para `'Conferido'` sem auditar se ainda persistiam desmembramentos pendentes, sobras físicas sem ocorrência gerada ou faltas não justificadas.
    3. **Bloqueio Posterior na Aba 3 (Envio ao Sankhya):** Ao chegar na Aba 3 com status `Conferido`, a tela bloqueava o envio exibindo `⚠️ 1 produto(s) requerem desmembramento Sankhya` e o botão `✂️ Desmembrar`, gerando a inconsistência de uma nota já finalizada com desmembramento ativo.
- **Implementações Realizadas:**
  1. **Backend - Validação Prévia Obrigatória no Use Case ([`ResolverDivergenciaUseCase.ts`](./backend/src/application/use-cases/recebimento/ResolverDivergenciaUseCase.ts)):**
     - Injeção de `ListarDivergenciasEntradaUseCase` no serviço.
     - Antes de alterar o status para `Conferido`, executa varredura profunda dos itens da conferência:
       - **Múltiplos Lotes:** Impede aprovação se houver itens com `lotesConferidos.length > 1` e `statusSankhya === 'PENDENTE'`.
       - **Sobras Físicas Reais:** Impede aprovação se houver quantidade física maior que a faturada sem ocorrência resolvida.
       - **Faltas Físicas:** Impede aprovação se houver falta de mercadoria não isolada ou não justificada.
       - **Divergências Cadastrais:** Impede aprovação se houver discordâncias de lote, validade ou fabricação sem decisão de nível ou fiscal.
       - Caso haja pendências, lança exceção impeditiva `AppError(400, "Não é possível concluir a conferência como 'Conferido'. Existem X pendência(s)...")`.
  2. **Frontend - Trava Visual no Botão de Resolução ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - O botão `✓ Resolver Divergência` agora exige estritamente:
       `totalPendentesAssistente === 0 && totalFiscaisPendentes === 0 && !estaAguardandoOuEmN3`.
     - Enquanto houver itens com múltiplos lotes pendentes de desmembramento ou qualquer pendência no assistente, o botão permanece desabilitado com tooltip orientativo.
  3. **Assistente de Divergências ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - A função `verificarItemResolvido` agora valida itens com múltiplos lotes: se o item possui mais de 1 lote físico e não adotou ERP, exige que a configuração de desmembramento seja realizada antes de marcar o item como resolvido `(✓)`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



## Atualização: Desduplicação de Badge de Liberação no Cabeçalho do Card (Aba Envio ao Sankhya)

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"veja que está duplicado, vamos deixar o que está com data e hora"* (Imagem: `media_1794598607977_e5f32679.png` mostrando badge repetido na barra de status da direita ao lado de CONFERIDO).
  - **Diagnóstico Técnico:** O card da conferência na Aba 3 (Envio ao Sankhya) exibia o badge de liberação em dois locais: no bloco da NF à esquerda (`✓ Liberado por supervisor (13/11/2026 15:56)`) e à direita na barra de chips ao lado do status `CONFERIDO` (`✓ Liberado por supervisor`).
- **Implementação Realizada ([`AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx)):**
  - Remoção do chip duplicado da direita ao lado de `CONFERIDO`.
  - Preservado com destaque o badge oficial à esquerda abaixo do número da nota contendo o responsável e a data/hora completas da aprovação (`✓ Liberado por {conf.aprovadoPor} ({data/hora})`).
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"vamos analisar o by stop do assitente de divergencia, ele não está atualizando os numeros das pendentes, da uma checada... e vamos colocar borda laranja nas opçoes ERP e azul nas opções da bipagem... e ao selecionar não vamos passar automaticamente, para a proxima divergencia dentro do pop up deixa o usuário avançar manualmente."*
  - **Diagnóstico Técnico:**
    1. **Instabilidade do Stepper ("by stop" / step by step):** Quando o usuário selecionava uma opção, o item era considerado resolvido e sumia de `itensPendentes`. Isso recalculava o array de steps, reindexando e encolhendo as bolinhas subitamente, gerando a percepção de que a contagem e os números das pendências não atualizavam de forma estável.
    2. **Avanço Automático Prematuro:** As funções `handleDecisaoRapidaFiscal` e `handleAdotarNivelRapido` possuíam um `setTimeout(..., 280)` que saltava para a próxima pendência automaticamente, impedindo que o operador revisasse visualmente a opção escolhida.
    3. **Identidade Visual das Opções:** Necessidade de diferenciar claramente as opções fiscais do ERP (laranja) e as apuradas na bipagem física do coletor (azul).
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  - **Stepper Fixo com Status em Tempo Real:** As bolinhas (steps) agora mantêm todos os itens da nota com numeração fixa (1, 2, 3...), transformando o número em `✓` verde com fundo suave imediatamente ao ser resolvido, sem encolher a lista nem sumir da tela.
  - **Remoção do Avanço Automático:** O usuário permanece no item após selecionar a decisão, podendo verificar o estado selecionado com calma e avançar no seu ritmo pelo botão "Próximo Item →".
  - **Bordas Padronizadas por Origem:**
    - **Opções ERP (Nota Fiscal):** Borda suave `#fed7aa` em repouso e borda laranja `#f97316` com fundo `#fff7ed` e badge `#ffedd5` / `#c2410c` quando selecionado.
    - **Opções da Bipagem (Coletor / N2 / N3):** Borda suave `#bfdbfe` em repouso e borda azul `#2563eb` com fundo `#eff6ff` e badge `#dbeafe` / `#1d4ed8` quando selecionado.
  - **Contador e Status no Cabeçalho:** Exibe `Item X de Y` acompanhado de badge dinâmico `✓ Resolvido` ou `⚠️ Pendente`, com atualização em tempo real dos contadores nas pílulas superiores.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"veja que essa nota chegou na ultima fase e contua aparecendo que existe demembramento de lotes, sendo que ele já foi liberado pelo supervisor.(essa nota não está mais nesses estado ele foi reiniciado). Precisamos incluir a informação no cabeçalho quem liberou as divergencias."*
  - **Diagnóstico Técnico:**
    1. **Falso Desmembramento por Mescla N2/N3:** Na Aba 3 (Envio ao Sankhya), a função `obterLotesItem` filtrava o array global de `bipagens` sem restringir pelo nível adotado (`b.nivel`). Quando uma conferência passava por N2 e depois N3, bipagens de ambos os níveis eram agrupadas, gerando múltiplos lotes artificiais e disparando a trava `⚠️ X produto(s) requerem desmembramento Sankhya` e o botão `✂️ Desmembrar`, mesmo com o supervisor tendo liberado a conferência com nível único ou ERP.
    2. **Desconexão com `lotesConferidos` do Backend:** O backend já sanitiza e isola as frações de lote estritamente do nível adotado em `item.lotesConferidos`, porém `obterLotesItem` tentava agrupar o array bruto de bipagens antes de consultar `item.lotesConferidos`.
    3. **Identificação do Supervisor no Cabeçalho:** O cabeçalho dos cards da conferência não exibia de forma explícita o usuário e data/hora em que as divergências foram liberadas (`aprovadoPor` / `aprovadoEm`), apenas exibindo esses dados se a nota já estivesse integrada ao Sankhya (`jaEnviado`).
- **Implementações Realizadas:**
  - [`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx):
    - Refatoração de `obterLotesItem`:
      - Detecção de decisão de ERP (`adotouErp`): retorna diretamente o lote da Nota Fiscal (`item.controle || item.lote`), sem criar desmembramentos.
      - Prioridade absoluta para `item.lotesConferidos` saneado pelo backend (que já respeita a decisão do supervisor e o isolamento N2 vs N3).
      - Filtragem estrita de bipagens pelo nível adotado (`b.nivel === nivelAdotado`), eliminando em definitivo a junção acidental de bipagens de N2 e N3.
  - [`AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx):
    - Cabeçalho das Notas Fiscais: inclusão de badge verde `✓ Liberado por {conf.aprovadoPor} ({data/hora})` visível imediatamente ao aprovar as divergências, antes mesmo da sincronização final no Sankhya.
    - Barra de Status do Card: chip discreto `✓ Liberado por {conf.aprovadoPor}` renderizado junto aos badges de conferência ao lado do status `CONFERIDO`.
  - [`AbaConferenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaConferenciasView.tsx):
    - Inclusão do badge `✓ Liberado por {conf.aprovadoPor} ({data/hora})` para conferências com status `Conferido` na lista geral.
  - [`ListarTodasConferenciasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarTodasConferenciasEntradaUseCase.ts), [`ConferenciaEntrada.ts`](./backend/src/domain/entities/ConferenciaEntrada.ts) e [`ConferenciaEntrada.ts`](./frontend/src/domain/models/ConferenciaEntrada.ts):
    - Adicionado campo `aprovadoEm` na entidade e resumo da conferência, garantindo a rastreabilidade completa com carimbo de data e hora da aprovação no frontend.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"pq o produto 79 esta na lista desse endereço, se não há vinculo"*
  - **Diagnóstico Técnico Exato:**
    1. O endereço selecionado possui vinculados no Sankhya os produtos **`1`** (`MINI ADULT 1KG`) e **`240`** (`WET CANINE/FELINE RECOVERY`).
    2. O frontend anteriormente iterava chamando a busca textual aberta `buscarPorProduto("1", limite: 1)`.
    3. A query continha `(PRO.CODPROD = 1 OR PRO.REFERENCIA LIKE '%1%') AND ROWNUM <= 1`.
    4. No Oracle, a cláusula `ROWNUM <= 1` é avaliada antes da ordenação final; como a referência do **Produto 79** (`SHIH TZU`) é `7896181212362` (contém o dígito `1`), o Oracle retornou arbitrariamente o Produto 79 como sendo a correspondência do termo "1", causando o falso positivo visual.
- **Implementações Realizadas:**
  - [`BuscarEnderecosProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/BuscarEnderecosProdutoUseCase.ts):
    - Suporte nativo a lista explícita `codprods: number[]` com query estrita `WHERE PRO.CODPROD IN (...)`.
    - Quando o termo de pesquisa for numérico, a query restringe estritamente a `PRO.CODPROD = {termo} OR BAR.CODBARRA = '{termo}'`, eliminando varreduras de substring (`LIKE '%N%'`) em referências.
  - [`EnderecamentoController.ts`](./backend/src/presentation/http/controllers/EnderecamentoController.ts):
    - Aceita o parâmetro `query.codprods` para consultas em lote exatas por código de produto.
  - [`EnderecamentoApiService.ts`](./frontend/src/infrastructure/api/EnderecamentoApiService.ts) & [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Transição de endereço agora utiliza `buscarPorCodprods(cods)` em lote, obtendo de uma só vez estritamente os produtos alocados no endereço (Produto 1 e Produto 240), com picking oficial `01.01.01.01.01` devidamente associado.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Correção de Campo Inexistente na TGFPRO (ORA-00904: "PRO"."TIPCONREST")

- **Demanda do Usuário & Diagnóstico:**
  - *"[Sankhya DbExplorerSP.executeQuery] ORA-00904: 'PRO'.'TIPCONREST': identificador inválido"*
  - **Diagnóstico:** A coluna `TIPCONREST` não existe na tabela `TGFPRO` no Sankhya ERP. O controle de lote e rastreabilidade no WMS do Sankhya é registrado na coluna `CONTROLE` da tabela `TGWEXP`.
- **Implementações Realizadas:**
  - [`BuscarEnderecosProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/BuscarEnderecosProdutoUseCase.ts):
    - Remoção do campo `PRO.TIPCONREST` da query SQL de produtos, garantindo compatibilidade nativa com o Oracle e dicionário Sankhya.
  - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
    - Campo de lote tornado flexível como `Lote / Controle (Opcional)` no modal de vinculação de endereços, permitindo amarrar o lote desejado sem dependência de flags restritivas de catálogo.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Correção de Consulta Oracle no Sankhya ERP (ORA-00904: "PRO"."CODBARRA")

- **Demanda do Usuário & Diagnóstico:**
  - *"[Sankhya DbExplorerSP.executeQuery] ORA-00904: 'PRO'.'CODBARRA': identificador inválido quando clico em ver produtos"*
  - **Diagnóstico:** No dicionário de dados nativo do Sankhya ERP (banco de dados Oracle), a tabela de produtos `TGFPRO` não possui a coluna `CODBARRA` diretamente; o código de barras é armazenado na tabela satélite `TGFBAR` vinculada por `TGFBAR.CODPROD = TGFPRO.CODPROD`.
- **Implementações Realizadas:**
  - [`BuscarEnderecosProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/BuscarEnderecosProdutoUseCase.ts):
    - Substituição da seleção de `PRO.CODBARRA` pela subconsulta `(SELECT MAX(BAR.CODBARRA) FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD) AS CODBARRA`.
    - Ajuste no filtro por número para utilizar `EXISTS (SELECT 1 FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD AND BAR.CODBARRA = '{termo}')`.
  - [`BuscarProdutosPorEnderecoUseCase.ts`](./backend/src/application/use-cases/enderecamento/BuscarProdutosPorEnderecoUseCase.ts):
    - Substituição de `PRO.CODBARRA` pela subconsulta `(SELECT MAX(BAR.CODBARRA) FROM TGFBAR BAR WHERE BAR.CODPROD = PRO.CODPROD) AS CODBARRA`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Lista Analítica de Endereços com Filtros Rápidos, Transição de Produtos e Inversão de Abas

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"No endereçamento WMS seria interessante mostrar a lista dos endereços(analitico), e ao clicar no endereço ir para aba produtos, mostrar os produtos que estão no endereço. E inverter a posição das abas endereço e produto."*
  - **Decisões Alinhadas:**
    1. **Inversão da Ordem das Abas:**
       - 1ª Aba: `📍 Por Endereço` (aba padrão inicial).
       - 2ª Aba: `📦 Por Produto`.
       - 3ª Aba: `🕒 Histórico de Movimentações`.
    2. **Lista Analítica de Endereços:**
       - Exibição em lista analítica dos endereços cadastrados em `TGWEND` com contagem dinâmica de produtos vinculados em `TGWEXP`.
       - Filtros rápidos por chips: Tipo (`Todos`, `Picking`, `Pulmão`) e Ocupação (`Todos`, `🟢 Livres/Vazios`, `🔴 Ocupados`).
       - Contador de métricas no topo com total de endereços, ocupados e livres.
       - Ação rápida ao clicar no endereço da lista ou no botão `👁️ Ver Produtos`: navega para a aba `📦 Por Produto` e filtra automaticamente os itens daquela posição física.
    3. **Banner de Contexto Ativo na Aba Produto:**
       - Ao transicionar de um endereço, exibe banner informativo: `📍 Exibindo produtos do endereço {ENDERECO} (N produtos)` com botão `✕ Limpar Filtro de Endereço`.
- **Implementações Realizadas:**
  - **Backend:**
    - [`ListarEnderecosAnaliticoUseCase.ts`](./backend/src/application/use-cases/enderecamento/ListarEnderecosAnaliticoUseCase.ts): Caso de uso para consulta analítica de posições WMS com contagem de SKUs ativos.
    - [`EnderecamentoController.ts`](./backend/src/presentation/http/controllers/EnderecamentoController.ts) & [`enderecamentoRoutes.ts`](./backend/src/presentation/http/routes/enderecamentoRoutes.ts): Adicionado endpoint `GET /api/enderecamento/analitico`.
    - [`container.ts`](./backend/src/container.ts): Registro e injeção do caso de uso analítico.
  - **Frontend:**
    - [`EnderecamentoApiService.ts`](./frontend/src/infrastructure/api/EnderecamentoApiService.ts): Método `listarAnalitico` com tipagem `EnderecoAnaliticoItem`.
    - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx):
      - Ordem invertida das abas com `ENDERECO` como aba padrão.
      - Grid analítico com chips de filtro rápido e transição contextual para a aba `PRODUTO`.
      - Banner de contexto integrado e botão de limpeza de filtro.
    - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css): Estilos dos chips de filtro, linhas analíticas interativas e banner de contexto.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Implementação do Módulo de Endereçamento WMS (Produto x Endereço & Movimentações)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"agora precisa de um modulo que gerencie os endereçamentos, e faça a gestão produto x endereços para que o pessoal consigo manipular os itens, retirando movimentando os produtos entre os endereços. Pesquisa as boas praticas desse contexto de armazenamento para usarmos a melhores praticas e a rotinas necessarias."*
  - **Diretrizes Aprovadas:**
    1. **Fase 1 (Cadastral & Operacional Ágil):** Gestão completa de amarrações no ERP Sankhya (`TGWEXP` / `ProdutoEndereco` e validação em `TGWEND`), com suporte a transferências internas, retiradas e novos vínculos.
    2. **Regra de Negócio de Endereçamento:** 1 Picking único por produto (ao vincular novo picking, o anterior é inativado automaticamente no Sankhya) + Múltiplos Pulmões simultâneos com suporte a controle por lote.
    3. **Navegação Híbrida em 3 Abas:**
       - Aba 1: **Por Produto** (busca por código, descrição ou EAN; visualização clara de picking, pulmões e saldo total no estoque; botões de ação rápida `[ ↔️ Mover ]`, `[ 🗑️ Retirar ]`, `[ 📍 Tornar Picking ]`, `[ ➕ Novo Pulmão ]`).
       - Aba 2: **Por Endereço** (busca ou bipagem do endereço físico; exibição de ocupação com todos os produtos alocados e status da posição).
       - Aba 3: **Histórico de Movimentações** (auditoria com rastreabilidade completa de quem movimentou, quando, de onde para onde e motivo).
    4. **Permissões Granulares no Hub de Acessos:** `enderecamento_visualizar` (consulta) e `enderecamento_manipular` (movimentar/retirar/vincular).
- **Implementações Realizadas:**
  - **Backend:**
    - [`schema.ts`](./backend/src/infrastructure/database/schema.ts): Criação da tabela `historico_enderecamento` com índices para rastreabilidade de ações.
    - [`Enderecamento.ts`](./backend/src/domain/entities/Enderecamento.ts) & [`IEnderecamentoRepository.ts`](./backend/src/domain/ports/IEnderecamentoRepository.ts): Modelagem de entidades e contratos.
    - [`LibsqlEnderecamentoRepository.ts`](./backend/src/infrastructure/repositories/LibsqlEnderecamentoRepository.ts): Persistência e consulta do histórico de auditoria local.
    - Casos de Uso:
      - [`BuscarEnderecosProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/BuscarEnderecosProdutoUseCase.ts): Busca em `TGFPRO`, `TGWEXP`, `TGWEND` e saldo disponível em `TGFEST`.
      - [`BuscarProdutosPorEnderecoUseCase.ts`](./backend/src/application/use-cases/enderecamento/BuscarProdutosPorEnderecoUseCase.ts): Consulta ocupação do endereço em `TGWEND` e produtos em `TGWEXP`.
      - [`VincularEnderecoProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/VincularEnderecoProdutoUseCase.ts): Vinculação via `DatasetSP.save` no Sankhya com regra de picking único e auditoria.
      - [`MovimentarEnderecoProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/MovimentarEnderecoProdutoUseCase.ts): Transferência com inativação da origem e ativação do destino no ERP com auditoria.
      - [`DesenderecarProdutoUseCase.ts`](./backend/src/application/use-cases/enderecamento/DesenderecarProdutoUseCase.ts): Liberação física e inativação no Sankhya com auditoria.
      - [`ListarHistoricoEnderecamentoUseCase.ts`](./backend/src/application/use-cases/enderecamento/ListarHistoricoEnderecamentoUseCase.ts): Consulta do log de movimentações.
    - [`EnderecamentoController.ts`](./backend/src/presentation/http/controllers/EnderecamentoController.ts) & [`enderecamentoRoutes.ts`](./backend/src/presentation/http/routes/enderecamentoRoutes.ts): Rotas protegidas por permissões.
    - [`container.ts`](./backend/src/container.ts): Registro da injeção de dependências no Composition Root.
  - **Frontend:**
    - [`EnderecamentoApiService.ts`](./frontend/src/infrastructure/api/EnderecamentoApiService.ts): Cliente HTTP para comunicação com o backend.
    - [`EnderecamentoPage.tsx`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.tsx): Interface completa com as 3 abas, barra de bipagem rápida para coletor móvel, cards de produto/endereço, feedback sonoro e modais de confirmação.
    - [`EnderecamentoPage.css`](./frontend/src/presentation/pages/enderecamento/EnderecamentoPage.css): Estilos dedicados e isolados com prefixo exclusivo `.enderecamento-*`.
    - [`AppRoutes.tsx`](./frontend/src/presentation/routes/AppRoutes.tsx): Rota protegida `/enderecamento`.
    - [`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx): Item `📍 Endereçamento WMS` no menu lateral.
    - [`HubPage.tsx`](./frontend/src/presentation/pages/Hub/HubPage.tsx): Card `📍 Endereçamento WMS` no Hub inicial de módulos.
    - [`GestaoAcessos.tsx`](./frontend/src/presentation/pages/GestaoAcessos.tsx): Gestão de permissões no Hub de Acessos com permissão mestre e subtoggles para visualização e manipulação.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Modal de Abastecimento Minimalista (Botão [ℹ️] Flutuante e Remoção de Observações)

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"vamos usar o i para o texto o produto havia sido marcado... remove o observações operacionais"*
  - **Diagnóstico:** O modal de confirmação de abastecimento continha uma caixa azul estática com aviso de correção de falta e um campo de texto secundário de observações operacionais que ocupavam espaço vertical excessivo e poluíam visualmente a ação rápida do operador.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Tooltip Flutuante Informativo [ℹ️] no Título:** Quando a tarefa for uma correção de falta (`status === 'FALTA_PULMAO'`), o título `Confirmar Abastecimento no Picking` exibe o botão discreto `ℹ️`. Ao passar o mouse ou clicar, exibe tooltip flutuante explicando: *"O produto havia sido marcado como não encontrado. Ao abastecer agora, a ocorrência de falta será encerrada e a separação da carga será liberada!"*.
  2. **Remoção da Caixa Azul Estática:** Eliminado o bloco estático de aviso que empurrava os campos do modal.
  3. **Remoção do Campo de Observações Operacionais:** Retirado o input `obsInput` e o rótulo de observações, mantendo o modal focado estritamente na confirmação da quantidade física abastecida.
- **Implementações Realizadas:**
  - [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx):
    - Cabeçalho do modal ajustado com flexbox contendo o botão `ℹ️` e tooltip flutuante integrado com suporte a hover e clique.
    - Excluída a caixa azul de aviso.
    - Removido o campo `Observações Operacionais (Opcional)` e limpos os estados sem uso.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Padronização da Rota em 2 Colunas com Rótulo e Endereço [Pulmão ➔ Picking]

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"quando não tiver endereço picking -> Pincking (e em baixo) sem endereço / quando não tiver endereço pulmão -> Pulmão (e em baixo) sem endereço"*
  - **Diagnóstico:** O formato horizontal anterior mesclava título e status na mesma linha com tamanhos e alinhamentos variáveis.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Estrutura Simétrica em 2 Colunas:** A caixa de rota foi dividida em duas colunas alinhadas separadas pela seta central `➔`:
     - **Origem (Pulmão):** Rótulo `📦 Pulmão` na linha superior (cinza discreto); endereço real ou `Sem endereço` (em vermelho) na linha inferior.
     - **Destino (Picking):** Rótulo `📍 Picking` na linha superior (cinza discreto); endereço real ou `Sem endereço` (em vermelho) na linha inferior.
  2. **Harmonia Visual:** Rótulos em `font-size: 11px`, endereços reais em negrito escuro `13px` e indicação `Sem endereço` em `12px` vermelho suave.
- **Implementações Realizadas:**
  - [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx):
    - Reestruturação do container `.reabastecimento-rota-compacta` com `.rota-coluna.origem` e `.rota-coluna.destino`.
    - Renderização padronizada de rótulos e fallback para `Sem endereço`.
  - [`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css):
    - Layout flex em duas colunas (`justify-content: space-between`), alinhamento à esquerda para origem e à direita para destino.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"aqui vamos colocar o estoque flutante igual a rotina anterior, ao clicar mas vamos clicar em saldo da empresa(troca esse nome para Saldo Estoque)"*
  - **Diagnóstico:** A lista expandida de locais/lotes ocupava espaço vertical empurrando todo o card e seus botões para baixo quando aberta.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Nomenclatura Atualizada:** Alterado de `Saldo na empresa:` para **`Saldo Estoque:`**.
  2. **Popover Escuro Flutuante:** O detalhamento de estoque por local e lote agora é exibido em um balão escuro sobreposto ao card (`position: absolute; z-index: 250;`), sem empurrar o layout.
  3. **Acionamento Intuitivo e Híbrido:** O clique ou hover diretamente no texto/trigger `📦 Saldo Estoque: {QTD} UN` abre e fecha o popover de locais.
- **Implementações Realizadas:**
  - [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx):
    - Remoção do bloco estático expandido `.reabastecimento-saldo-detalhes`.
    - Criação de trigger interativo `.reabastecimento-saldo-trigger` com badge discreto `locais (N) ▾`.
    - Popover escuro `.reabastecimento-saldo-popover` exibindo locais, lotes e quantidades em verde esmeralda (`#4ade80`).
    - Suporte a hover no desktop e toque/clique no mobile.
  - [`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css):
    - Estilização do popover escuro flutuante com sombra elevada, seta indicadora e animação sutil `fadeInPopover`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"esse texto solicitado pela separação... pode colocar em um botão i e o usuario colocar o mouse encima apresneta o texto fluante"*
  - **Diagnóstico:** A caixa amarela fixa de observações ocupava espaço vertical expressivo no card de reabastecimento.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Remoção da Caixa Fixa:** Eliminado o bloco amarelo estático de todos os cards de reabastecimento.
  2. **Botão Informativo [ ℹ️ ] no Rodapé:** Adicionado botão discreto circular `[ ℹ️ ]` imediatamente ao lado das informações de solicitação (`Solicitado: 12/11, 22:25 • SUPERVISOR ℹ️`).
  3. **Comportamento Híbrido (Desktop & Mobile):**
     - **Desktop:** Ao passar o mouse (`hover`), exibe popover/tooltip flutuante com sombra suave e seta direcional.
     - **Mobile / Touch:** Ao tocar no botão `ℹ️`, alterna a exibição do balão de texto flutuante sem quebrar o layout.
- **Implementações Realizadas:**
  - [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx):
    - Remoção do container estático de texto de observações.
    - Criação de `reabastecimento-tooltip-wrapper` com botão `ℹ️` e caixa `reabastecimento-tooltip-box`.
    - Estados `tooltipHoverId` e `tooltipAberto` para controle de hover e toque.
  - [`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css):
    - Estilos minimalistas para `.reabastecimento-btn-info`, `.reabastecimento-tooltip-box` e setinha direcional com `z-index: 200`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"a falta pode ser encontrada, ele pode corrigir o erro e colocar o produto no picking, mas não colocamos a opção confirmar(inclusive vamos trocar para abastecer)"*
  - **Diagnóstico:** No card de `Falta de Pulmão`, apenas o botão `✂️ Confirmar Corte Definitivo` era exibido. Se o empilhadeirista ou supervisor localizasse o produto posteriormente no armazém e corrigisse a falha física, não havia como confirmar o abastecimento direto pela tarefa em falta. Além disso, o botão anteriormente rotulado como `✓ Confirmar` precisava ser padronizado para `🚜 Abastecer`.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Ação Dupla no Card de Falta:** O card de tarefa com falta de pulmão agora oferece duas saídas operacionais claras lado a lado:
     - `[ 🚜 Abastecer ]`: Para quem possui `reabastecimento_confirmar`, permitindo registrar a entrada física do produto no picking mesmo após uma falta prévia.
     - `[ ✂️ Confirmar Corte Definitivo ]`: Para quem possui `reabastecimento_finalizar_falta`, confirmando o corte definitivo do saldo.
  2. **Padronização de Nomenclatura:**
     - Botão dos cards (pendentes e faltas): alterado para **`🚜 Abastecer`**.
     - Botão interno do modal de quantidade/observações: mantido como **`✓ Confirmar Abastecimento`**.
  3. **Rastreabilidade no Backend:** Ao abastecer uma tarefa que estava em `FALTA_PULMAO`, o caso de uso [`ConcluirTarefaReabastecimentoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/ConcluirTarefaReabastecimentoUseCase.ts) anexa automaticamente ao log da observação: `✓ Produto localizado e abastecido no picking por {usuario} em {hora}`, mantendo histórico auditável de resolução.
- **Implementações Realizadas:**
  - [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx):
    - No bloco de ações de `isFaltaPulmao`, renderização de `[🚜 Abastecer]` e `[✂️ Confirmar Corte Definitivo]` em container flex horizontal.
    - Troca de `✓ Confirmar` por `🚜 Abastecer` nos cards de tarefas pendentes.
    - Alerta explicativo em azul no modal de abastecimento quando acionado a partir de uma falta.
  - [`ConcluirTarefaReabastecimentoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/ConcluirTarefaReabastecimentoUseCase.ts):
    - Conclusão com sucesso de tarefas em status `FALTA_PULMAO` com auditoria na observação.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"em reabastecimento, vamos incluir um botão(Não encontrado) caso exista estoque e o usuário não encontre ele no estoque fisico, criando uma ocorrencia de falta no modulo pois estamos falando de pulmão. Lá na falta, vamos possibilitar finalizar. Ao tentar finalizar(Reabastecer) em ambos os casos(pulmão ou Falta), vamos precisar deixar a carga pendente aguardando esse abastecimento/confirmação de falta. Para liberar a separação, como podemos fazer essa integração, lembrando que a separação de saida está aguardando esses produtos."*
- **Decisões Alinhadas no `/grill-me`:**
  1. **Botão "Não Encontrado" no Reabastecimento:** Quando o operador de empilhadeira buscar um produto e não o encontrar fisicamente no pulmão/endereço, aciona o botão `⚠️ Não Encontrado` para gerar uma ocorrência de falta (`status = 'FALTA_PULMAO'`).
  2. **Aba/Filtro Dedicado de Faltas no Pulmão:** Tarefas com falta de pulmão são agrupadas na aba `⚠️ Faltas de Pulmão ({total})` e ganham card com borda e badge âmbar de destaque.
  3. **Permissão de Finalização de Falta:** Criada a permissão granular `reabastecimento_finalizar_falta` (configurável no painel de Acessos). Apenas usuários autorizados podem finalizar a falta e confirmar o corte definitivo no pedido (`status = 'FALTA_CONFIRMADA'`).
  4. **Carga em Espera (`AGUARDANDO_REABASTECIMENTO`):** Quando a separação solicita o pulmão, a carga recebe status `AGUARDANDO_REABASTECIMENTO` e exibe o badge `⏳ Aguardando Reabastecimento`, travando a conclusão precipitada.
  5. **Prioridade Máxima para Cargas Reabastecidas (`REABASTECIDO`):** Quando o empilhadeirista confirma o reabastecimento (`ConcluirTarefaReabastecimentoUseCase`), a carga vai para `status = 'REABASTECIDO'` com badge `⚡ Pick Reabastecido` e passa a ocupar o topo absoluto da fila de cargas. Na rota guiada, o item reabastecido ganha badge `⚡ Pick Reabastecido` e prioridade máxima para bipagem.
  6. **Desbloqueio com Corte Definitivo:** Caso a falta seja confirmada (`FinalizarFaltaPulmaoUseCase`), os itens da carga são marcados como `CORTADO_DEFINITIVO` e a carga é liberada para conclusão pelo separador.
- **Implementações Realizadas:**
  1. **Entidades & Permissões:**
     - [`backend/src/domain/entities/Reabastecimento.ts`](./backend/src/domain/entities/Reabastecimento.ts) & [`frontend/src/domain/models/Reabastecimento.ts`](./frontend/src/domain/models/Reabastecimento.ts): adicionados status `'FALTA_PULMAO' | 'FALTA_CONFIRMADA'`.
     - [`backend/src/domain/entities/Separacao.ts`](./backend/src/domain/entities/Separacao.ts) & [`frontend/src/domain/models/Separacao.ts`](./frontend/src/domain/models/Separacao.ts): adicionados status de carga `'AGUARDANDO_REABASTECIMENTO' | 'REABASTECIDO'` e item `'REABASTECIDO'`.
     - [`PermissaoUsuario.ts`](./backend/src/domain/entities/PermissaoUsuario.ts) & [`Auth.ts`](./frontend/src/domain/models/Auth.ts): adicionada permissão `reabastecimento_finalizar_falta`.
  2. **Casos de Uso no Backend:**
     - [`SolicitarReabastecimentoSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SolicitarReabastecimentoSeparacaoUseCase.ts): cria tarefas de pulmão agrupadas por produto e coloca a separação em `AGUARDANDO_REABASTECIMENTO`.
     - [`RegistrarFaltaPulmaoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/RegistrarFaltaPulmaoUseCase.ts): registra produto não encontrado no estoque físico (`FALTA_PULMAO`).
     - [`FinalizarFaltaPulmaoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/FinalizarFaltaPulmaoUseCase.ts): confirma corte definitivo (`FALTA_CONFIRMADA`), atualiza itens na separação para `CORTADO_DEFINITIVO` e libera a carga.
     - [`ConcluirTarefaReabastecimentoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/ConcluirTarefaReabastecimentoUseCase.ts): atualiza itens da separação para `REABASTECIDO` e move status da carga para `REABASTECIDO`.
     - [`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts) & [`ObterSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/ObterSeparacaoUseCase.ts): ordenam cargas com `REABASTECIDO` no topo absoluto da fila e itens reabastecidos no início da rota guiada.
  3. **Controllers, Rotas & Container:**
     - [`SeparacaoController.ts`](./backend/src/presentation/http/controllers/SeparacaoController.ts) & [`separacaoRoutes.ts`](./backend/src/presentation/http/routes/separacaoRoutes.ts): rota `POST /:id/solicitar-reabastecimento`.
     - [`ReabastecimentoController.ts`](./backend/src/presentation/http/controllers/ReabastecimentoController.ts) & [`reabastecimentoRoutes.ts`](./backend/src/presentation/http/routes/reabastecimentoRoutes.ts): rotas `POST /:id/falta` e `POST /:id/finalizar-falta` (guardada por `reabastecimento_finalizar_falta`).
     - [`backend/src/container.ts`](./backend/src/container.ts): injeção de dependências completa.
  4. **Frontend & Interfaces:**
     - [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx): métrica e chip de filtro `⚠️ Faltas de Pulmão`, botão `⚠️ Não Encontrado` nos cards pendentes, modal de confirmação de falta, e botão/modal `✂️ Confirmar Corte Definitivo` para supervisores autorizados.
     - [`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx): botão `🚜 Solicitar Reabastecimento` no cabeçalho e no modal de conclusão da carga, badges `⚡ Pick Reabastecido` e `⏳ Aguardando Reabastecimento` na listagem e na rota guiada.
     - [`GestaoAcessos.tsx`](./frontend/src/presentation/pages/GestaoAcessos.tsx): toggle `⚠️ Finalizar Falta / Corte Definitivo` no painel de permissões de Reabastecimento.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---



- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"vamos organizar os campos deixar mais minimalista e remover informações duplicadas"*
  - **Diagnóstico:** O card de reabastecimento de picking apresentava duplicidade de informação com o badge `⚠️ Sem Pulmão (Geral)` no cabeçalho competindo com o texto `Sem Pulmão Mapeado` na origem da rota. Além disso, a rota ocupava um bloco tracejado vertical alto, a consulta de estoque disponível ficava dentro de uma caixa cinza pesada e o badge de quantidade ficava com cor vermelha no rodapé parecendo falso erro.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Remoção de Duplicidade:** Eliminado o badge `⚠️ Sem Pulmão (Geral)` do cabeçalho direito.
  2. **Quantidade no Topo:** A quantidade a abastecer foi movida para o topo direito em badge elegante e limpo (`1 UN a Abastecer` ou `✓ Abastecido`).
  3. **Rota Compacta em Linha Única:** Bloco de movimentação Origem ➔ Destino unificado em linha horizontal enxuta (`[ 📦 Sem Pulmão Mapeado ] ➔ [ 📍 Picking Padrão ]`).
  4. **Estoque na Empresa Integrado:** Removida a caixa cinza grossa; o saldo disponível agora aparece como linha sutil abaixo da rota com link expansível para detalhar locais e lotes.
  5. **Rodapé e Ações Otimizados:** Dados da solicitação (`Solicitado: 12/11, 14:52 • SUPERVISOR`) à esquerda e botões `[ ✕ Recusar ]` e `[ ✓ Confirmar ]` com alturas e espaçamentos compactos à direita.
- **Implementações Realizadas:**
  1. **Estrutura do Card ([`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx)):**
     - Cabeçalho reformulado: `reabastecimento-header-origem` com carga e empresa à esquerda; badge `reabastecimento-header-qtd-badge` à direita.
     - Nova rota compacta: container `reabastecimento-rota-compacta` com `rota-origem`, `rota-seta` e `rota-destino`.
     - Novo saldo integrado: `reabastecimento-saldo-linha` com botão sutil de expansão de locais/lotes.
     - Rodapé enxuto: `reabastecimento-meta-info` e grupo de botões `reabastecimento-acoes-botoes`.
  2. **Estilização Dedicada ([`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css)):**
     - Removidas classes obsoletas (`.reabastecimento-rota-box`, `.reabastecimento-qtd-badge`).
     - Adicionados estilos minimalistas para rota compacta, linha de saldo e botões compactos.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Correção de Loop no Login de Supervisor e Criação do Hub Inicial de Módulos

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"Estou tentando fazer o login com o usuário supervisor e ele volta para a tela inicial."*
  - **Diagnóstico:** O usuário `SUPERVISOR` possui acesso à `gestao_recebimento`, `separacao` e `reabastecimento`, porém tem `conferencia_saida: false` e `conferencia_entrada: false`. No login anterior, o [`LoginPage.tsx`](./frontend/src/presentation/pages/Login.tsx) fazia fallback para `/recebimento` (que exige `conferencia_entrada`). Como o usuário não possuía essa permissão, o [`PrivateRoute.tsx`](./frontend/src/presentation/routes/PrivateRoute.tsx) não encontrava rotas de escape válidas e expulsava o usuário deslogando-o de volta para `/login`.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Hub Inicial de Boas-Vindas (`/hub` / `/`):** Tela inicial moderna com grade de cards compactos estilo aplicativo (ícone, título e badge), ideal para coletores e mobile.
  2. **Regra de Direcionamento Inteligente:** Se o usuário tiver acesso a apenas 1 módulo, o sistema entra direto nele sem cliques adicionais. Se tiver múltiplos módulos (como o `SUPERVISOR`), exibe o Hub Inicial para escolha.
  3. **Segurança de Rota Privada:** [`PrivateRoute.tsx`](./frontend/src/presentation/routes/PrivateRoute.tsx) redireciona usuários autenticados sem permissão para a raiz (`/` ➔ Hub) em vez de expulsá-los para `/login`.
  4. **Atalho no Menu:** Adicionado link `🏠 Início / Módulos` no topo do menu lateral ([`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx)).
- **Implementações Realizadas:**
  1. **Criação do Hub ([`HubPage.tsx`](./frontend/src/presentation/pages/Hub/HubPage.tsx) & [`HubPage.css`](./frontend/src/presentation/pages/Hub/HubPage.css)):**
     - Banner com saudação personalizada (`Olá, {nome}!`) e `CODUSU`.
     - Grade responsiva de cards compactos (Saída, Separação, Reabastecimento, Entrada, Gestão de Recebimento, Consulta de Produtos, Gestão de Acessos e Banco de Dados) exibindo apenas os módulos autorizados para aquele usuário.
  2. **Roteamento & Resolução de Acesso ([`AppRoutes.tsx`](./frontend/src/presentation/routes/AppRoutes.tsx)):**
     - Criada rota `/hub` protegida.
     - `RotaInicialRedirect` conta os módulos liberados do usuário: redireciona direto se for 1 único, ou renderiza `<HubPage />` se forem 2 ou mais.
  3. **Ajuste no Fluxo de Login ([`Login.tsx`](./frontend/src/presentation/pages/Login.tsx)):**
     - Login com sucesso agora navega diretamente para `/`, permitindo que o roteador decida entre acesso direto ou Hub.
     - Detecção de sessão ativa redireciona direto para o Hub.
  4. **Correção de Redirecionamento ([`PrivateRoute.tsx`](./frontend/src/presentation/routes/PrivateRoute.tsx)):**
     - Bloqueio de rota sem permissão agora envia para `/` (Hub), eliminando o loop de logout do Supervisor.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Expansão da Gestão de Acessos para Telas e Rotinas (Separação e Reabastecimento)

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"o sistema está crescendo precisamos adaptar ele para conseguir gerir os acessos as telas e as rotinas dela."*
  - Requisitos específicos do usuário:
    - Adicionar gerenciamento granular para **Separação de Cargas** (iniciar separação de carga, bipar itens, confirmar separação, registrar corte/falta).
    - Adicionar gerenciamento granular para **Reabastecimento de Pulmão (Empilhadeira)** (visualizar fila de tarefas, confirmar movimentação pulmão->picking, cancelar/recusar tarefa).
    - Regra estrita: *"Cuidado para não desfazer a gestão de acesso que já existe, vamos apenas adicionar essas a mais."*
    - Modelo: Permissões diretas por usuário (como hoje, mas expandido), dupla proteção (Frontend + Backend), sub-painéis expansíveis no drawer e botão de perfil rápido `🚜 Empilhadeirista`. Política de bloqueio seguro para novas rotinas em operadores.
- **Implementações Realizadas:**
  1. **Modelo de Permissões & Entidades ([`PermissaoUsuario.ts`](./backend/src/domain/entities/PermissaoUsuario.ts) & [`Auth.ts`](./frontend/src/domain/models/Auth.ts)):**
     - Adicionadas as novas chaves em `ModulosUsuario`:
       - `separacao_iniciar`, `separacao_bipar`, `separacao_finalizar`, `separacao_cortar`.
       - `reabastecimento`, `reabastecimento_confirmar`, `reabastecimento_cancelar`.
     - Atualizadas as constantes `PERMISSOES_ADMINISTRADOR` (todas `true`) e `PERMISSOES_PADRAO_OPERADOR` (bloqueio seguro com padrão `false`).
     - Atualizado [`AuthContext.tsx`](./frontend/src/application/contexts/AuthContext.tsx) garantindo acesso total a admins/gestores e respeito às flags diretas.
  2. **Proteção de Rotinas no Backend (BFF) ([`separacaoRoutes.ts`](./backend/src/presentation/http/routes/separacaoRoutes.ts), [`reabastecimentoRoutes.ts`](./backend/src/presentation/http/routes/reabastecimentoRoutes.ts) & [`index.ts`](./backend/src/presentation/http/routes/index.ts)):**
     - Rota base `/api/reabastecimento` protegida com `reabastecimento`.
     - Rotas de Separação protegidas granularmente via `createPermissionMiddleware`:
       - `POST /iniciar` ➔ `separacao_iniciar`
       - `POST /:id/bipar`, `POST /:id/endereco`, `POST /bipagem/:bipId/anular` ➔ `separacao_bipar`
       - `POST /:id/falta`, `POST /:id/resolver-falta` ➔ `separacao_cortar`
       - `POST /:id/finalizar` ➔ `separacao_finalizar`
     - Rotas de Reabastecimento protegidas granularmente:
       - `POST /:id/concluir` ➔ `reabastecimento_confirmar`
       - `POST /:id/cancelar` ➔ `reabastecimento_cancelar`
     - Criado caso de uso [`CancelarTarefaReabastecimentoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/CancelarTarefaReabastecimentoUseCase.ts) e método `cancelar` no [`ReabastecimentoController.ts`](./backend/src/presentation/http/controllers/ReabastecimentoController.ts).
  3. **Rotas e Navegação Frontend ([`AppRoutes.tsx`](./frontend/src/presentation/routes/AppRoutes.tsx) & [`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx)):**
     - Rotas `/reabastecimento` e `/reabastecimento/*` protegidas estritamente com `<PrivateRoute modulo="reabastecimento">`.
     - Redirecionamento inicial inteligente inclui `/reabastecimento` quando o usuário tiver a permissão.
     - Item de menu "Reabastecimento" no drawer lateral agora exige `temPermissao('reabastecimento')`.
  4. **Proteção Operacional nas Telas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) & [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx)):**
     - **Separação:** Botão de iniciar desativado se `!podeIniciar`; campo de bipagem e botão desativados se `!podeBipar`; botões de falta e corte ocultos/bloqueados se `!podeCortar`; botão de concluir desativado se `!podeFinalizar`.
     - **Reabastecimento:** Botão de confirmar reabastecimento condicionado a `podeConfirmar`; adicionado botão "✕ Recusar" e modal de justificativa condicionado a `podeCancelar` integrando com `reabastecimentoApiService.cancelar`.
  5. **Interface de Gestão de Acessos ([`GestaoAcessos.tsx`](./frontend/src/presentation/pages/GestaoAcessos.tsx) & [`GestaoAcessos.css`](./frontend/src/presentation/pages/GestaoAcessos.css)):**
     - Adicionado botão de perfil rápido `🚜 Empilhadeirista` no topo da gaveta do usuário.
     - Implementados **sub-painéis expansíveis** para Separação de Cargas e Reabastecimento de Pulmão (idênticos ao padrão visual da Gestão de Recebimento).
     - Atualizado `renderBadgesUsuario` com badges temáticos `🚚 Separação` e `🚜 Pulmão`.
     - Preservada 100% da integridade de todas as telas, campos sensíveis e parâmetros existentes.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Empresa na Ordem de Carga e Consulta de Estoque Disponível em Reabastecimento

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"vamos trazer para a ordem de carga a empresa que está cadastrado no sankhya. Pois vamos usar ele para puxar o estoque(estoque-reservado) do produto enviado para reabastecimento."*
  - **Diagnóstico:** A Ordem de Carga não carregava o código e nome da empresa (`CODEMP` da `TSIEMP`), impedindo que as tarefas de reabastecimento de picking soubessem em qual filial/empresa consultar o saldo disponível (`ESTOQUE - RESERVADO`) na tabela `TGFEST` do Sankhya.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Exibição da Empresa:** Exibir `Empresa: {codemp} - {nomeEmpresa}` no card da Ordem de Carga, no topo da sessão de Separação e nas tarefas de Reabastecimento.
  2. **Exibição do Saldo Disponível:** Exibir o total disponível no card de Reabastecimento (`📦 Disponível na Empresa: X UN`), com botão expansível para visualizar o detalhamento por local e lote caso o empilhadeirista precise saber onde o produto está localizado no armazém.
  3. **Consulta em Tempo Real:** Consulta em tempo real na tabela `TGFEST` do Sankhya ao carregar a fila de reabastecimento, filtrando por `CODPROD` e `CODEMP` das cargas.
- **Implementações Realizadas:**
  1. **Evolução de Schema e Repositórios ([`schema.ts`](./backend/src/infrastructure/database/schema.ts)):**
     - Adicionadas colunas `codemp` e `nome_empresa` nas tabelas `separacoes` e `tarefas_reabastecimento` com migração automática via `garantirColuna`.
     - Atualizados repositórios [`LibsqlSeparacaoRepository.ts`](./backend/src/infrastructure/repositories/LibsqlSeparacaoRepository.ts) e [`LibsqlReabastecimentoRepository.ts`](./backend/src/infrastructure/repositories/LibsqlReabastecimentoRepository.ts).
  2. **Vínculo da Empresa na Separação ([`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts) & [`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts)):**
     - Integrado `LEFT JOIN TSIEMP EMP ON EMP.CODEMP = CAB.CODEMP` trazendo `CODEMP` e `NOME_EMPRESA` na listagem de cargas e na criação da sessão.
     - Persistência da empresa nas tarefas de reabastecimento geradas em [`FinalizarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/FinalizarSeparacaoUseCase.ts).
  3. **Consulta de Estoque em Tempo Real ([`ListarTarefasReabastecimentoUseCase.ts`](./backend/src/application/use-cases/reabastecimento/ListarTarefasReabastecimentoUseCase.ts)):**
     - Consulta integrada via `DbExplorerSP.executeQuery` na `TGFEST` calculando `DISPONIVEL = (EST.ESTOQUE - NVL(EST.RESERVADO, 0))` para o `CODPROD` e `CODEMP` de cada carga.
     - Retorno de `saldoDisponivel` e lista estruturada `detalhesEstoque` (local, lote, saldo).
  4. **Interface Visual ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) & [`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx)):**
     - Card de Ordem de Carga exibe linha de `Empresa: 2 - INOVACE PE`.
     - Topo da Separação exibe `Ordem de Carga: #41032 — Empresa: 2 - INOVACE PE`.
     - Card de Reabastecimento exibe badge `🏢 2 - INOVACE PE` no cabeçalho.
     - Card de Reabastecimento exibe seção `📦 Disponível na Empresa: X UN` com link expansível `▼ Ver locais/lotes` detalhando os endereços físicos com saldo.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Alinhamento de Status 'Aguardando' na Separação e 'Aguardando Separação' na Conferência de Saída

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"aqui seria o status aguardando, na ordem de carga. E o pedido está com o status em separação, mas a separação não foi iniciada ainda. Vamos sincronizar."*
  - **Diagnóstico:**
    1. Na tela de **Separação de Cargas**, a ordem não iniciada exibia o texto `'ABERTA NO ERP'`. O usuário alinhou para exibir `'Aguardando'`.
    2. Na tela de **Conferências de Saída**, o Pedido 1141 exibia o badge `⏳ Em Separação` mesmo sem haver sessão em andamento no aplicativo, porque a entidade `TGFORD.AD_STATUSSEP` no Sankhya ainda continha o valor `'E'` (gravação de teste prévio), e a query considerava `erpStatusSep === 'E'` como `EM_ANDAMENTO`.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Badge na Separação de Cargas:** Substituído `'ABERTA NO ERP'` por `'Aguardando'`.
  2. **Priorização da Sessão Ativa Local:** Na conferência de saída, o status `EM_ANDAMENTO` agora depende estritamente de haver uma sessão de separação ativa no sistema (`localStatus === 'EM_ANDAMENTO'`). Se a carga ainda não iniciou, o status passa a ser `PENDENTE`.
  3. **Badge 'Aguardando Separação' no Pedido:** No card de Conferências de Saída, pedidos com ordem de carga pendente de início agora exibem o badge `⏳ Aguardando Separação`.
  4. **Redefinição no Sankhya ERP:** Atualizado o campo `AD_STATUSSEP` da Carga `#41032` no Sankhya para `'P'` (Pendente).
- **Implementações Realizadas:**
  1. **Separação de Cargas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Alterado o texto do badge de estado não iniciado para `'Aguardando'`.
  2. **Lógica de Status de Separação ([`GetConferenciaSaidaUseCase.ts`](./backend/src/application/use-cases/conferencias/consulta/GetConferenciaSaidaUseCase.ts)):**
     - O status `statusSeparacao = 'EM_ANDAMENTO'` agora exige `localStatus === 'EM_ANDAMENTO'`. Se não iniciado, retorna `'PENDENTE'`.
  3. **Badge na Conferência de Saída ([`ListaConferencias.tsx`](./frontend/src/presentation/pages/ListaConferencias.tsx)):**
     - Adicionado badge discreto `⏳ Aguardando Separação` para pedidos com carga pendente de separação.
  4. **Atualização no Sankhya:**
     - `TGFORD.AD_STATUSSEP` da Carga 41032 redefinido para `'P'` via API nativa do Sankhya (`CRUDServiceProvider.saveRecord`).
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Limpeza de Dados Legados, Ocultação de Itens Removidos e Notificação de Novos Itens/Pedidos

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"precisamos revitar as consultas de pedidos, para todo o modulo de reabastecimento, pois está com divergencias, inclusive na notificação de itens inseridos após inicio da separação."*
  - **Diagnóstico:** Ao entrar na separação da Carga #41032, a tela exibia 32 itens (com itens mostrando `0 / 0 UN CONCLUÍDO`), enquanto o card externo mostrava 10 itens (1 pedido). Isso decorria de a sessão anterior ter sido gravada no SQLite local antes do alinhamento das queries com a Conferência de Saída. Além disso:
    1. Itens cortados/removidos do ERP (`REMOVIDO_ERP`) com 0 UN esperadas e 0 UN separadas continuavam sendo renderizados na Rota Lógica (como o Item 1 fantasma `0 / 0 UN`).
    2. Itens inseridos em novos pedidos vinculados à carga após o início da separação eram descartados silenciosamente pelo verificador `pedidosSessao.has`.
- **Decisões Alinhadas no `/grill-me`:**
  1. **Limpeza Completa das Tabelas Locais:** Executada limpeza das tabelas `separacoes`, `separacoes_itens`, `separacoes_bipagens` e `tarefas_reabastecimento` no SQLite local para zerar sessões em andamento legadas e desatualizadas.
  2. **Notificação e Incorporação de Novos Itens e Pedidos:** Qualquer item retornado pela query elegível do ERP que não exista na sessão ativa é incorporado automaticamente à separação (seja novo item de pedido existente ou novo pedido adicionado à carga), alertando o operador com som e banner detalhado.
  3. **Ocultação de Produtos Fantasmas da Rota Lógica:** Produtos com `qtdEsperadaTotal === 0` e `qtdSeparadaTotal === 0` são removidos da rota consolidada, impedindo a exibição de cards `0 / 0 UN`.
- **Implementações Realizadas:**
  1. **Expurgo de Dados Locais:** Script executado com sucesso zerando todas as tabelas operacionais locais no `confercheck.db`.
  2. **Consulta e Notificação Robusta ([`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
     - Remoção do bloqueio que ignorava pedidos novos adicionados à carga durante a separação.
     - Notificação explícita diferenciando novos itens em pedidos existentes e novos pedidos completos agregados à carga no ERP.
     - Atualização atômica de `totalPedidos`, `totalItens`, `totalUnidades` e `dadosCargaJson` na entidade `separacoes`.
  3. **Rota Lógica Limpa ([`ObterSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/ObterSeparacaoUseCase.ts)):**
     - Filtro nos consolidados (`qtdEsperadaTotal > 0 || qtdSeparadaTotal > 0`) para não renderizar produtos com zero unidade.
  4. **Frontend Sincronizado ao Retomar Sessão ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Ao retomar uma carga existente (`res.recuperada === true`), executa checagem imediata de sincronização com o Sankhya, alertando com som e banner qualquer alteração ocorrida enquanto a carga estava em pausa.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Alinhamento de Filtros e Regras SQL de Ordens de Carga com Conferência de Saída

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - *"as ordem de cargas não estão batendo com os pedidos pendentes da conferencia de saida, vamos analisar esse contexto. Olha a quantidade de ordem de carga, vamos alinhar para que a ordem de carga fique com os mesmos filtros de pedidos da conferencia de saida."*
  - **Diagnóstico:** A tela de Separação de Cargas listava 13 ordens de carga acumuladas porque a query SQL buscava apenas `TIPMOV = 'P'`, `STATUSNOTA = 'L'` e `ORDEMCARGA > 0`, sem checar se os pedidos da carga já haviam sido faturados, se a TOP possuía conferência, ou se a conferência já havia sido concluída. Em contrapartida, a Conferência de Saída aplica filtros rigorosos (`NOT EXISTS TGFVAR`, `TOP.NUCCO > 0`, `CODVEND NOT IN (43)`, `PENDENTE = 'S'`, e `CON.STATUS IN ('A','R','S')`).
- **Decisões Alinhadas no `/grill-me`:**
  1. **Alinhamento 100% das regras SQL de pedidos:** A Separação agora aplica exatamente as mesmas regras de pedidos da Conferência de Saída.
  2. **Status de Conferência (TGFCON2):** Considerar apenas pedidos com conferência pendente/em andamento (`NVL(CON.STATUS, 'S') IN ('A','R','S')`), descartando pedidos cuja conferência já foi concluída (`'F'`).
  3. **Ocultação de Finalizadas na Grade Principal:** Cargas cuja separação já foi finalizada (`AD_STATUSSEP = 'F'` no ERP ou `FINALIZADA` no sistema local) são omitidas da listagem principal de pendentes (permanecendo acessíveis via busca específica por número de carga).
  4. **Escopo Focado:** Alinhamento estrito das regras SQL no backend nos casos de uso do fluxo de separação.
- **Implementações Realizadas:**
  1. **Listagem de Cargas ([`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts)):**
     - Integrados joins com `TGFTOP`, `TGFCON2` e `TGFORD`.
     - Aplicadas restrições: `NOT EXISTS TGFVAR`, `NVL(TOP.NUCCO, 0) > 0`, `CAB.CODVEND NOT IN (43)`, `CAB.PENDENTE = 'S'` e `NVL(CON.STATUS, 'S') IN ('A','R','S')`.
     - Ocultação de cargas com `AD_STATUSSEP = 'F'` no Sankhya ou `statusLocal === 'FINALIZADA'` na visualização geral.
  2. **Início de Separação ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts)):**
     - Query dos itens da carga agora filtra exclusivamente os pedidos elegíveis ativos da conferência, impedindo inclusão de pedidos faturados ou de TOPs desconsideradas.
  3. **Sincronização de Itens ERP ([`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
     - Alinhada com os mesmos filtros rigorosos na sincronização de alterações durante a separação.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Correção de Roteamento e Navegação do Módulo de Reabastecimento

- **Demanda do Usuário & Diagnóstico:**
  - *"estou clicando em reabastecimento e está indo para a tela de conferencia de saida"*
  - *"Continua abrindo na conferencia de saida. Quando clico em reabastecimento ele está selecionando o conferencia de saida na menu lateral."*
  - **Causa Raiz:** O roteamento de fallback (`*` em [`AppRoutes.tsx`](./frontend/src/presentation/routes/AppRoutes.tsx)) redirecionava automaticamente para `/conferencias` se houvesse qualquer dessincronia no carregamento da árvore SPA do React Router. Além disso, cliques no drawer com fechamento simultâneo (`onClick={onClose}`) podiam interromper a navegação em memória do `<Link>`.
- **Ações Realizadas:**
  1. **Roteamento Explicito e Resiliente ([`AppRoutes.tsx`](./frontend/src/presentation/routes/AppRoutes.tsx)):**
     - Registradas rotas explícitas para `/reabastecimento` e `/reabastecimento/*` renderizando diretamente [`ReabastecimentoPage`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx).
     - Rota raiz `/` mapeada explicitamente para `RotaInicialRedirect`.
     - Tratamento defensivo em `RotaInicialRedirect`: caso a URL contenha `/reabastecimento`, renderiza a tela de reabastecimento imediatamente em vez de redirecionar para `/conferencias`.
  2. **Navegação Programática Robusta no Menu Lateral ([`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx)):**
     - Criada função `handleNavegar(rota)` que fecha o drawer e aciona `navigate(rota)` programaticamente de forma atômica e confiável.
  3. **Purga de Cache do Service Worker ([`sw.js`](./frontend/public/sw.js)):**
     - Incrementada versão do cache para `conferencia-v2` com purga automática de versões legadas de cache em `activate`.
  4. **Servidor Vite Reiniciado e Validado:**
     - Servidor de desenvolvimento Vite reiniciado limpo na porta 5173.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Fluxo de Pós-Separação e Fila de Reabastecimento de Picking (Equipe de Empilhadeira)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"quando finalizarmos uma ordem com falta, criamos qual fluxo para pós? retirar do pumão? verificar estoque do produto? uma sub aba da separação para tratar essas pendencias?"*
  - Validações via `ask_question`:
    1. **Onde e por quem:** Criação de um fluxo dedicado para o supervisor e a equipe de empilhadeira buscar do pulmão e alimentar o picking.
    2. **Integração Sankhya:** Gerenciado internamente pelo nosso sistema (fila operacional ágil para empilhadeirista via app), sem gerar notas fiscais desnecessárias no Sankhya.
    3. **Geração Automática:** Ao finalizar a carga com falta, o sistema gera automaticamente as tarefas de reabastecimento para todos os itens faltantes.
    4. **Produtos sem Pulmão:** Itens sem pulmão mapeado recebem o status `VERIFICAR_ESTOQUE` (*"Verificar Estoque Geral / Outros Endereços"*).
    5. **Efeito da Conclusão:** O empilhadeirista confirma o abastecimento físico no picking, sinalizando a conclusão para a conferência/separação.
    6. **Interface:** Página dedicada no menu lateral: **`🚜 Reabastecimento de Picking`** (`/reabastecimento`).
- **Implementações Realizadas:**
  1. **Tabela e Persistência Local ([`schema.ts`](./backend/src/infrastructure/database/schema.ts) & [`LibsqlReabastecimentoRepository.ts`](./backend/src/infrastructure/repositories/LibsqlReabastecimentoRepository.ts)):**
     - Criada a tabela `tarefas_reabastecimento` com índices em `status`, `ordem_carga` e `codprod`.
     - Entidade de domínio `TarefaReabastecimento` e interface `IReabastecimentoRepository`.
  2. **Gatilho Automático na Finalização ([`FinalizarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/FinalizarSeparacaoUseCase.ts)):**
     - Ao concluir a separação com itens pendentes, agrupa as faltas por produto e gera automaticamente tarefas de reabastecimento.
     - Se o produto possuir pulmão, define status como `PENDENTE`; caso contrário, define como `VERIFICAR_ESTOQUE`.
  3. **Backend API ([`ReabastecimentoController.ts`](./backend/src/presentation/http/controllers/ReabastecimentoController.ts) & [`reabastecimentoRoutes.ts`](./backend/src/presentation/http/routes/reabastecimentoRoutes.ts)):**
     - Endpoint `GET /api/reabastecimento` com filtros por status, carga e produto + métricas de resumo.
     - Endpoint `POST /api/reabastecimento/:id/concluir` para confirmação do reabastecimento pelo empilhadeirista.
  4. **Frontend - Tela Dedicada de Reabastecimento ([`ReabastecimentoPage.tsx`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.tsx) & [`ReabastecimentoPage.css`](./frontend/src/presentation/pages/reabastecimento/ReabastecimentoPage.css)):**
     - Cards de métricas no topo: Total, Aguardando Pulmão, Sem Pulmão (Geral) e Abastecidas Hoje.
     - Filtros rápidos por chips de status e campo de busca inteligente.
     - Cards responsivos com rotas visuais claras: **Origem (Pulmão)** ➜ **Destino (Picking)**, quantidade a abastecer e dados da carga.
     - Modal ágil para o empilhadeirista confirmar o reabastecimento físico no picking com 1 clique.
  5. **Navegação e Rota ([`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx) & [`AppRoutes.tsx`](./frontend/src/presentation/routes/AppRoutes.tsx)):**
     - Adicionado item `🚜 Reabastecimento` no menu lateral com badge `Pulmão`.
     - Rota `/reabastecimento` protegida e integrada ao fluxo do sistema.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Finalização Ágil de Carga com Faltas e Integração Visual do Status "Separado" na Conferência de Saída

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"não vamos solicitar uma justificativa ao finalizar em caso de carga parcial ou com faltas pendentes, pois os itens já possuem a justificativa. E vamos integrar o status de separação do pedido a conferencia de saida, no momento apenas visual(Status separado na cor verde)."*
  - Validações via `ask_question`:
    1. **Identificação de "Separado":** Considerar quando a Ordem de Carga vinculada ao pedido estiver finalizada (`TGFORD.AD_STATUSSEP = 'F'` no ERP ou carga `'FINALIZADA'` no banco local).
    2. **Exibição Visual:** Exibir o badge verde `✓ Separado` tanto no card da lista de conferências (`ListaConferencias`) quanto no cabeçalho da conferência aberta (`ConferenciaProdutos`). Exibir `⏳ Em Separação` se a carga estiver em andamento.
    3. **Finalização com Faltas:** No modal de finalização (`SeparacaoPage`), exibir o aviso informativo de itens pendentes/com falta (com justificativas previamente registradas) e liberar o botão `Confirmar Finalização` diretamente com 1 clique (sem campo de texto obrigatório).
- **Implementações Realizadas:**
  1. **Finalização Descomplicada de Cargas com Faltas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Removido o campo obrigatório `<textarea>` de justificativa do modal de finalização.
     - O botão `Confirmar Finalização` permanece ativo de imediato (`disabled={carregando}`), enviando `permitirParcial: true` quando houver faltas.
     - O texto informativo esclarece que os motivos de falta ou corte já estão devidamente auditados nos itens.
  2. **Consulta Cruzada de Separação no Backend ([`GetConferenciaSaidaUseCase.ts`](./backend/src/application/use-cases/conferencias/consulta/GetConferenciaSaidaUseCase.ts) & [`IniciarConferenciaUseCase.ts`](./backend/src/application/use-cases/conferencias/ciclo-vida/IniciarConferenciaUseCase.ts)):**
     - Consulta `TGFORD.AD_STATUSSEP` diretamente na query principal via `LEFT JOIN TGFORD ORD ON ORD.ORDEMCARGA = CAB.ORDEMCARGA AND ORD.CODEMP = CAB.CODEMP`.
     - Integração com `ISeparacaoRepository` no container para validação cruzada com o banco de dados local.
     - Retorno de `statusSeparacao` padronizado (`'SEPARADO' | 'EM_ANDAMENTO' | 'PENDENTE' | null`).
  3. **Badges Visuais na Conferência de Saída ([`ListaConferencias.tsx`](./frontend/src/presentation/pages/ListaConferencias.tsx) & [`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx)):**
     - **Cards da Lista (`ListaConferencias`):** Renderiza badge verde `✓ Separado` quando a separação da carga estiver concluída, e badge âmbar `⏳ Em Separação` quando estiver em andamento.
     - **Cabeçalho da Conferência (`ConferenciaProdutos`):** Exibe o badge verde `✓ Separado` logo ao lado dos dados do Pedido e Parceiro.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Otimização das Tabelas (Consolidado e Por Pedido), Fusão de Endereço na Célula de Produto e Dropdown Flutuante de Códigos de Barras

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"vamos melhorar essa tabela, removendo a coluna endereço e aumentando do produto. Inserir os dados do endereço ao lado do codigo de barras, e a expansão do codigo de barras coloca para sobrepor na tabela. Aplica o mesmo layout para a aba POR Pedido."*
  - Validação via `ask_question`: **(Recomendado) Chips compactos na mesma linha do código de barras (com LADO, RUA, TORRE, NÍVEL, POS e Pulmão se houver)**.
- **Implementações Realizadas:**
  1. **Remoção da Coluna "Endereço Picking" ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Excluída a coluna separada `<th>Endereço Picking</th>` tanto na tabela da aba **Consolidado** quanto na tabela da aba **Por Pedido**.
     - A coluna de produto agora ocupa todo o espaço horizontal livre com maior legibilidade para descrições longas.
  2. **Fusão dos Dados de Endereço ao Lado do Código de Barras ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Na célula do produto, logo abaixo da descrição, foi criado um container flex horizontal contendo o botão do código de barras e os chips de endereço físico (`EnderecoChips` em modo compacto).
     - Se o produto tiver pulmão cadastrado, a indicação `📦 Pulmão` é exibida inline ao lado.
     - Se o produto não tiver endereço, exibe o botão discreto `📍 + Vincular` no Consolidado ou `📍 Sem endereço` no Por Pedido.
  3. **Expansão de Códigos de Barras em Camada Sobreposta (Floating Overlay) ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) & [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - O painel expandido de códigos de barras (`.separacao-barras-painel-expandido`) agora utiliza `position: absolute; top: calc(100% + 5px); left: 0; z-index: 100;` com sombra profunda (`box-shadow`) e borda destacada.
     - Ao clicar para expandir os códigos disponíveis, o dropdown flutua **sobre** a tabela sem empurrar as linhas para baixo nem deformar a altura da grade.
     - Adicionado listener de clique fora (`handleClickOutside`) e fechamento automático ao selecionar qualquer código/referência.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Diagnóstico e Resolução de Divergência entre Progresso (100%) e Itens Pendentes (Rebalanceamento Automático e Métricas Consolidadas)

- **Dúvida / Diagnóstico do Usuário:**
  - *"qual o motivo ainda existem 17 produtos pendentes? sendo que o progresso está 100%?"*
- **Causa Raiz Identificada:**
  1. **Contagem por Linha de Pedido vs Produtos Consolidados:** Na carga 40795 existem **28 produtos distintos** (208 UN no total), distribuídos em **55 linhas de pedidos** (`itens`). O contador do cabeçalho estava somando linhas individuais de pedidos (`itensPendentes`) em vez de produtos consolidados da rota guiada (`itensConsolidados`).
  2. **Acúmulo no Primeiro Pedido:** Pela regra antiga de bipagem (já corrigida), produtos presentes em mais de um pedido tinham toda a contagem somada na linha do primeiro pedido. Exemplo: um item de 12 UN esperadas (6 do pedido A + 6 do pedido B) ficava com 12/6 no pedido A (`SEPARADO`) e 0/6 no pedido B (`PENDENTE`). O total de unidades atingia 208/208 (100%), mas exatamente 17 linhas de pedidos permaneciam marcadas como `PENDENTE`.
- **Implementações Realizadas ([`ObterSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/ObterSeparacaoUseCase.ts)):**
  1. **Rebalanceamento Automático (Self-Healing):** Ao carregar a separação, o backend detecta se algum produto possui pedidos com contagem excedente e redistribui o saldo automaticamente para os pedidos pendentes da mesma carga, atualizando o banco de dados. Todas as 17 linhas foram regularizadas para `SEPARADO`.
  2. **Métricas Consistentes com a Rota:** Os contadores de progresso (`itensSeparados` e `itensPendentes`) foram alinhados aos produtos da Rota Lógica (Consolidados). Com isso, para 208/208 UN (100%), o cabeçalho agora reflete:
     - **Itens Separados:** `28 concluídos` (100% dos 28 produtos da carga).
     - **Itens Pendentes:** `0 pendentes`.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Bloqueio Rigoroso de Quantidade Excedente, Estorno de Bipagens por Produto e Interceptação de Avanço Incompleto com Falta

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"não pode separa a quantidade maior, e vamos permitir excluir o que foi separado. E caso tenta avançar incompleto já chame a função finalizar produto com falta."*
  - Validações via `ask_question`:
    1. **Estorno de Bipagens:** Botão `🗑️ Estornar Bipagem` diretamente no card do produto, abrindo modal com listagem dos bipes deste item para excluir individualmente ou pelo atalho `↺ Desfazer Último Bipe`.
    2. **Interceptação de Avanço Incompleto:** Ao tentar avançar (`Próximo →`, `⏭️ Pular Pendente` ou arraste lateral para esquerda no mobile) com o item incompleto, abrir automaticamente o modal de falta para selecionar o motivo e confirmar (ao confirmar, registra a falta e avança automaticamente).
- **Implementações Realizadas:**
  1. **Bloqueio de Quantidade Excedente e Distribuição Correta ([`RegistrarBipagemSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.ts)):**
     - Corrigido o cálculo de saldo pendente total do produto na carga:
       `saldoPendenteTotal = Math.max(0, qtdEsperadaTotal - qtdSeparadaTotalAtual)`.
     - Se `qtdEfetiva > saldoPendenteTotal`, a operação é imediatamente bloqueada com erro descritivo.
     - A quantidade bipada é distribuída estritamente respeitando o teto de cada pedido da carga (`Math.min(saldoItem, qtdRestanteParaDistribuir)`), impedindo que qualquer item ou consolidado ultrapasse 100% da quantidade esperada (`qtdSeparada > qtdEsperada`).
  2. **Estorno e Exclusão de Bipagens por Produto ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) & [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - Adicionado o botão `🗑️ Estornar Bipagem` no placar do card sempre que `itemAtualRota.qtdSeparadaTotal > 0`.
     - Modal dedicado `modalEstornoProduto`:
       - Exibe o resumo do produto e a contagem atual.
       - Botão de ação rápida `↺ Desfazer Último Bipe (+X UN)`.
       - Tabela com histórico dos bipes deste produto (horário, quantidade, código lido e pedido).
       - Botão individual `🗑️ Excluir` em cada bipagem, acionando o estorno via `separacaoApiService.anularBipagem`.
       - Ao estornar, recalcula a contagem em tempo real e fecha o modal automaticamente se não houver mais bipes ativos.
  3. **Interceptação de Avanço Incompleto ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Função `tentarAvancarItem` intercepta tentativas de avanço (`Próximo →`, `⏭️ Pular Pendente` e swipe para esquerda no mobile).
     - Se o item atual estiver incompleto (`qtdSeparadaTotal < qtdEsperadaTotal` e sem falta registrada):
       - O avanço é pausado e o modal de falta (`modalFalta`) é aberto automaticamente com o motivo padrão pré-selecionado.
       - Ao clicar em `Confirmar Falta ➔`, o sistema registra a falta no backend e avança imediatamente para o próximo item planejado.
       - Se o operador cancelar o modal, a visualização permanece no item incompleto sem avançar.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Remoção da Barra Horizontal de Chips/Trilha de Produtos

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - Print com a barra horizontal de chips destacada em vermelho e solicitação: *"remove isso aqui"*.
  - Validação via `ask_question`: **(Recomendado) Sim, remover totalmente a barra horizontal de chips e deixar a navegação exclusivamente pelo swipe lateral no card e pelos botões Anterior/Próximo**.
- **Implementações Realizadas:**
  1. **Remoção da Trilha Horizontal ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Removido o bloco JSX `.separacao-rota-trilha-itens`, a referência `trilhaRef` e o efeito de auto-scroll.
     - A interface da Rota Guiada mantém o layout limpo e minimalista diretamente com o card principal.
  2. **Limpeza de Estilos CSS ([`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - Excluídas as classes `.separacao-rota-trilha-itens` e `.separacao-rota-trilha-chip` (e seus estados `ativo`, `concluido`, `parcial`).
  3. **Navegação Mantida:**
     - Arraste lateral no mobile (swipe touch horizontal no próprio card).
     - Botões manuais `← Anterior`, `Próximo →` e `⏭️ Pular Pendente` no cabeçalho do card.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Remoção do Salto Automático ao Bipar, Gestos de Toque Lateral (Swipe) e Trilha de Seleção Rápida de Produtos na Rota Guiada

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"ao bipar um item do produto 87 ele já pulou para o produto 228, vamos remover essa passagem automatica, possibilitar clicar ou mover o card lateralmente(isso para o mobile)"*
  - Validação via `ask_question`: **(Recomendado) Remover salto automático + habilitar gesto de arraste lateral (swipe touch) no card + manter botões Anterior/Próximo acessíveis**.
- **Implementações Realizadas:**
  1. **Remoção do Salto Automático Pós-Bipagem ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Em `handleConferirBipagem`, foi removida a chamada automática que buscava `proxIdx` e pulava de produto ao atingir a quantidade esperada (`res.concluidoProduto`).
     - O card permanece estritamente fixado no produto recém-concluído, permitindo que o separador veja o feedback visual (`✓ CONCLUÍDO` em verde) e decida quando e para onde navegar.
  2. **Gesto de Arraste Lateral / Swipe Touch no Mobile ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Criados manipuladores de toque `handleCardTouchStart`, `handleCardTouchMove` e `handleCardTouchEnd` com detecção de deslocamento predominantemente horizontal (> 45px e `touchAction: 'pan-y'`).
     - Deslizar o card para a **esquerda** (swipe left) ➔ avança para o **Próximo Item**.
     - Deslizar o card para a **direita** (swipe right) ➔ retorna para o **Item Anterior**.
     - Feedback elástico suave durante o arraste (`transform: translateX(${touchDeltaX}px)` limitado a 60px com transição suave ao soltar).
  3. **Trilha Rápida de Seleção por Clique de Produtos ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) & [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - Criada a barra horizontal de navegação rápida com chips compactos (`.separacao-rota-trilha-itens`) logo acima do card.
     - Cada chip exibe a ordem (`#1`), o código do produto (`Cód 87`) e o status da contagem (`✓` em verde se concluído, ou `X/Y` pendente).
     - Clicar em qualquer chip posiciona imediatamente a rota naquele produto, com auto-scroll horizontal suave centralizando o chip ativo.
  4. **Estilização e Dica Mobile ([`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - Indicador `.separacao-rota-swipe-hint` ("↔️ Deslize o card para mudar") ativado em telas mobile (<= 768px).
     - Botões `← Anterior`, `Próximo →` e `⏭️ Pular Pendente` preservados para controle manual adicional.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Ocultação do Botão "Finalizar com Falta" em Itens Totalmente Concluídos

- **Problema Diagnosticado:**
  - *"pq o botão finalizar com falta ainda está ativo?"*
  - Em produtos com contagem 100% atingida (`24 / 24 UN ✓ CONCLUÍDO`), o botão `⚠️ Finalizar com Falta` continuava sendo renderizado na barra de ações da rota guiada, permitindo o acionamento indevido de falta com 0 UN restantes.
- **Implementações Realizadas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
  - Adicionada condição de guarda para renderizar o botão `⚠️ Finalizar com Falta` exclusivamente enquanto o item tiver unidades pendentes (`qtdSeparadaTotal < qtdEsperadaTotal`) e não possuir falta já registrada (`statusConsolidado !== 'FALTA'`).
  - Ao atingir 100% da quantidade (`CONCLUÍDO`), o botão de falta desaparece automaticamente, mantendo o placar limpo e evitando registros inconsistentes.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Bloqueio da Ordem de Carga no Sankhya ERP (`AD_STATUSSEP`), Regra de Sincronização por Nível e Resolução de Falso Positivo

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - *"nesse contexto existem duas atualizações do pedido(inclusão/exclusão do item, aumento ou diminuição de qtd) e a propria ordem de carga que pode receber um no pedido, acho que deveriamos incluir um campo no cadastro da ordem de carga(ERP) para informando que a conferencia está em adamento e o ERP bloquear a inserção de pedidos nela. E os pedidos tem possuir ordem de carga e statusnota = 'L'"*
  - Decisões consolidadas via `/grill-me`:
    1. **Bloqueio da Carga no ERP via Campo Customizado**: Utilizar `AD_STATUSSEP` na tabela `TGFORD` ('P' - Pendente, 'E' - Em Separação, 'F' - Finalizada) atualizado nativamente pelo aplicativo via `CRUDServiceProvider.saveRecord`.
    2. **Isolamento de Novos Pedidos na Carga**: Novos pedidos anexados à carga durante a separação ativa não invadem nem poluem a sessão atual; a separação atual foca nos pedidos iniciais e, ao finalizar, a carga retorna para a fila com prioridade para rodada complementar.
    3. **Atualizações a Nível de Item**: Alterações nos pedidos existentes da sessão (novo item no pedido, corte/exclusão de item ou aumento/redução de quantidade) continuam sendo detectadas e alertadas em tempo real.
    4. **Filtro Oficial**: Apenas pedidos com `CAB.STATUSNOTA = 'L'` e `CAB.ORDEMCARGA = :ordemCarga` entram na separação.
    5. **Reset do Snapshot 40795**: Sessão de teste da carga `40795` foi limpa no banco local para carregar limpa na próxima abertura.
- **Implementações Realizadas:**
  1. **Atualização Automática de `AD_STATUSSEP` em `TGFORD` ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts) & [`FinalizarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/FinalizarSeparacaoUseCase.ts)):**
     - Ao iniciar a separação: backend atualiza `TGFORD.AD_STATUSSEP = 'E'` (com `CODEMP` e `ORDEMCARGA`).
     - Ao finalizar a separação: backend atualiza `TGFORD.AD_STATUSSEP = 'F'`.
  2. **Filtro de Sessão na Sincronização ([`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
     - Sincronizador restringe detecção de novos itens exclusivamente aos pedidos que já pertencem à sessão ativa (`pedidosSessao.has(itemErp.nunota)`), eliminando falsos positivos de pedidos recém-inseridos na carga.
  3. **Retorno Automático de Cargas à Fila ([`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts)):**
     - Se uma carga foi finalizada anteriormente mas o Sankhya possui mais pedidos ou unidades pendentes (`qtdPedidosErp > sepLocal.totalPedidos`), ela retorna à fila como `SEM_INICIAR` para separação da rodada complementar.
  4. **Reset da Carga 40795**:
     - Registros anteriores da carga 40795 removidos do banco local para abertura limpa e oficial.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Organização do Endereçamento de Picking para Mobile em Duas Linhas com Grid de 4 Colunas

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "vamos organizar esse endereçamento para o mobile, veja que ele está passando" (com print mostrando os chips de endereço estourando a lateral direita do card no mobile).
  - Alinhamento `/grill-me`:
    1. **Estrutura em 2 Linhas**:
       - **Linha 1 (Topo)**: `📍 PICKING:` + badge de lado (`[⬅️ ESQUERDA]` ou `[DIREITA ➡️]`) alinhados à esquerda e botão `📍 Alterar Endereço` alinhado à direita.
       - **Linha 2 (Coordenadas)**: Grid de 4 colunas proporcionais (`repeat(4, 1fr)`) distribuindo simetricamente `RUA`, `TORRE`, `NÍVEL` e `POS` com 100% de aproveitamento da largura do card sem nenhum overflow lateral.
       - **Linha 3 (Rodapé)**: Subtítulo orientativo e endereço de pulmão quando existente.
- **Implementações Realizadas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) & [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
  1. **Refatoração do Banner de Endereçamento**:
     - Cabeçalho flex com `justify-content: space-between` e `flex-wrap: wrap` contendo `📍 PICKING:`, badge de lado e botão de alteração de endereço.
     - Grid de coordenadas `.separacao-rota-coords-grid` (`grid-template-columns: repeat(4, 1fr)`) com cards individuais `.separacao-coord-card` (destaque verde suave na posição física `POS`).
     - Tratamento para endereços não decompostos (fallback) e endereços não mapeados.
  2. **Validações & Deploy**:
     - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
     - Backend: `npm run build` compilado com sucesso (**exit code 0**).
     - Android: `gradlew assembleDebug` compilado com sucesso (**BUILD SUCCESSFUL in 33s**).
     - Deploy realizado via ADB no dispositivo conectado (`ZF523R6Q5Q`) e iniciado.

---

## Atualização: Compilação e Deploy do Módulo de Separação de Cargas no App Android

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "o menu separação já está copilado no app android?"
  - Verificação técnica: O módulo de Separação de Cargas (`/separacao`, `SeparacaoPage.tsx`, `AppDrawer.tsx` com `🚚 Separação`) já estava implementado no código-fonte, porém o APK anterior (gerado em 09/11) ainda não continha os assets atualizados.
  - Alinhamento `/grill-me`: Compilar o bundle de produção, sincronizar via Capacitor, gerar novo APK Android e instalar diretamente no tablet/celular conectado.
- **Implementações & Deploy Realizados:**
  1. **Builds:**
     - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
     - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  2. **Sincronização & Compilação Android:**
     - Capacitor: `npx cap sync android` executado com cópia de todos os novos módulos e rotas de separação para `android/app/src/main/assets/public`.
     - Gradle: `gradlew assembleDebug` compilado com sucesso (**BUILD SUCCESSFUL in 31s**).
  3. **Deploy no Dispositivo:**
     - APK atualizado instalado via ADB no dispositivo conectado (`ZF523R6Q5Q`) e iniciado.
     - O menu lateral (Drawer) agora exibe a opção **`🚚 Separação (Cargas)`** para usuários com a permissão habilitada (`separacao`).

---

## Atualização: Remoção do Código Numérico e Redução de Escala dos Chips de Endereçamento

- **Solicitação do Usuário:**
  - *"remove o codigo, e diminui o tamanho em 70% os chips"*
  - Opção validada: Redução de escala para ~70% do tamanho atual (~30% menor) com remoção completa do código numérico `(01.01.01.01.01)` para exibir os chips alinhados em uma linha única e elegante.
- **Implementações Realizadas:**
  1. **Remoção do Código Numérico ([`EnderecoChips.tsx`](./frontend/src/presentation/pages/separacao/EnderecoChips.tsx)):**
     - O código hierárquico `(01.01.01.01.01)` foi totalmente removido da exibição visual padrão (`mostrarMascara = false`), permanecendo acessível apenas via tooltip (`title`) ao passar o mouse.
  2. **Redução Proporcional da Escala ([`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - Reduzidos os paddings, tamanhos de fonte e espaçamentos (gap reduzido para `5px`).
     - Inclusão de `flex-wrap: nowrap` e `flex-shrink: 0` nos chips e no container do banner de picking em [`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx), garantindo que `[⬅️ ESQUERDA] [RUA 01] [TORRE 01] [NÍVEL 01] [POS 01]` fiquem dispostos em uma linha contínua e sem quebras de linha indesejadas.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Endereçamento WMS Modular e Minimalista em Pílulas (Chips: Rua, Torre, Nível, Pos e Lado Esquerdo/Direito)

- **Solicitação do Usuário:**
  - *"vamos deixar esse endereçamento mais legivel e minimalista, com os nomes rua, torre, nivel e pos sempre que for impa é do lado esquerdo, me apresenta algumas modelos de design para validação"*
  - Usuário escolheu a **Opção A: Pílulas Modulares em Chips**.
  - Confirmação de regra de negócio: *"no cadastro do endereçamento tem o lado"* (coluna `PAR` da tabela `TGWEND`, onde `'N'` = Ímpar = Lado Esquerdo ⬅️, e `'S'` = Par = Lado Direito ➡️).
- **Implementações Realizadas:**
  1. **Componente Modular [`EnderecoChips.tsx`](./frontend/src/presentation/pages/separacao/EnderecoChips.tsx):**
     - Parser inteligente (`parseEndereco`): decompõe tanto o `DESCREND` (`R 01  T 01  N 01  P 01`) quanto a máscara numérica `ENDERECO` (`01.01.01.01.01`).
     - Identificação de Lado: avalia a coluna cadastral `PAR` (`TGWEND.PAR`) com fallback automático para paridade da posição física (`numPos % 2 !== 0`).
     - Renderização de chips modulares:
       - Badge direcional: `[⬅️ ESQUERDA]` (destaque azul) para ímpares ou `[DIREITA ➡️]` (destaque âmbar) para pares.
       - Pílulas coordenadas: `[Rua XX]`, `[Torre XX]`, `[Nível XX]`, `[Pos XX]` (com destaque na posição).
       - Máscara hierárquica sutil em sublinha: `(01.01.01.01.01)`.
  2. **Estilização Dedicada ([`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
     - Prefixada sob `.separacao-endereco-chips-container` e `.separacao-chip-*`.
     - Suporte a variações visuais: `destaque` (Banner do Item da Vez na rota), `normal` (Tabelas de Picking e Pulmão) e `compacto` (Cards Mobile).
  3. **Integração nas Telas de Separação ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Banner de Rota Guiada (Item da Vez) com chips em tamanho destaque.
     - Tabela do Modo Consolidado (coluna Endereço de Picking e tag de Pulmão).
     - Cards Mobile do Modo Consolidado.
     - Tabela e Cards Mobile do Modo Pedido.
     - Modal de Re-separação do Pulmão.
  4. **Persistência e Suporte no Backend ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts), [`schema.ts`](./backend/src/infrastructure/database/schema.ts)):**
     - Inclusão do campo `END.PAR AS LADO` e `PULM.PAR AS LADO_PULMAO` nas consultas SQL do WMS.
     - Adição das colunas `lado` e `lado_pulmao` em `separacoes_itens` e mapeamento nos repositórios Libsql.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Inativação Automática do Endereço Anterior ao Alterar Posição WMS (`TGWEXP`)

- **Problema Diagnosticado:**
  - *"alterei o endereço e produto 77 do 01.01.01.01.01 para 01.01.01.01.02 e o mesmo se manteve no 01.01.01.01.01"*
  - Ao alterar o endereço de picking de um produto, o Sankhya criava o novo registro (`CODEND = 6`), mas mantinha o registro anterior (`CODEND = 5`) também ativo (`ATIVO = 'S'`) com a mesma data de início (`11/11/2026`).
  - Como a consulta de ordenação e sincronização não possuía critério de desempate além de `DTINICIO DESC`, o Oracle selecionava o `CODEND = 5` arbitrariamente, revertendo o endereço na tela.
- **Implementações Realizadas:**
  1. **Inativação do Endereço Anterior no Sankhya ([`AtualizarEnderecoProdutoUseCase.ts`](./backend/src/application/use-cases/separacao/AtualizarEnderecoProdutoUseCase.ts)):**
     - Ao alterar o endereço físico de um produto, o sistema localiza os endereços anteriores ativos do mesmo tipo (Picking ou Pulmão) em `TGWEXP` e envia `DatasetSP.save` definindo `ATIVO = 'N'` e `DTFIM = dd/MM/yyyy`.
     - Em seguida, grava/ativa o novo endereço com `ATIVO = 'S'`, `DTINICIO = dd/MM/yyyy` e `DTFIM = ''`.
     - Inativação já executada e confirmada no Sankhya para o produto `77` (posição `01.01.01.01.01` inativada e posição `01.01.01.01.02` ativa).
  2. **Critério de Desempate Ordenado ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
     - Adicionado `EXP.CODEND DESC` no `ROW_NUMBER() OVER (... ORDER BY EXP.DTINICIO DESC, EXP.CODEND DESC)` das subconsultas `PICK` e `PULM`, garantindo que o endereço mais recente sempre tenha precedência absoluta caso compartilhem a mesma data.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Correção: Persistência de Endereço Físico no WMS Sankhya (`DatasetSP.save` na Entidade `ProdutoEndereco` / `TGWEXP`)

- **Problema Diagnosticado:**
  - *"estou lançando um endereço para esse item e ele não está inserindo no local"*
  - Ao vincular o endereço físico de picking para um produto (ex: `01.01.01.01.01` para o produto `77`), a mensagem de sucesso era exibida, mas o endereço não era gravado no Sankhya ERP e continuava como não mapeado na tela ou era revertido pela sincronização periódica de 30 segundos.
  - **Causa Raiz Técnica:**
    1. No arquivo [`AtualizarEnderecoProdutoUseCase.ts`](./backend/src/application/use-cases/separacao/AtualizarEnderecoProdutoUseCase.ts), o backend tentava executar um comando `MERGE INTO TGWEXP` utilizando o serviço `DbExplorerSP.executeQuery`. O serviço `DbExplorerSP` do Sankhya é **estritamente somente-leitura** e rejeita comandos de DML com o erro `Permitido apenas a execução de consultas, a instrução possui 'UPDATE', 'DELETE' ou 'INSERT'`.
    2. Como o bloco estava envolvido em um `try/catch` que apenas registrava `console.warn`, a falha não era propagada e o endereço nunca era inserido na tabela `TGWEXP` do Sankhya.
    3. Quando o sincronizador em segundo plano executava o polling periódico de 30 segundos contra o Sankhya, ele encontrava o produto sem endereço no ERP (`TGWEXP` vazio) e revertia o snapshot local.
    4. Adicionalmente, quando o produto recebia o endereço no frontend, a ordenação da rota reposicionava o item no início da fila, fazendo o índice da rota exibir outro produto não mapeado.
- **Correções Realizadas:**
  1. **Gravação via Serviço Oficial Nativo (`DatasetSP.save`):**
     - Substituído o comando `DbExplorerSP` pelo serviço nativo do Sankhya: `DatasetSP.save` na entidade de dicionário `ProdutoEndereco` (tabela física `TGWEXP`).
     - Passagem correta dos campos de chave primária (`CODEND`, `CODPROD`, `CONTROLE`) e campos de dados (`ATIVO = 'S'`, `DTINICIO = dd/MM/yyyy`, `CODVOL` oficial do produto obtido da `TGFPRO`).
     - Testado e validado diretamente no Oracle do Sankhya: o produto `77` com endereço `5` (`01.01.01.01.01`) e unidade `PC` foi gravado com sucesso com retorno de status `1`.
  2. **Tratamento Rigoroso de Erros:**
     - Eliminado o `try/catch` silencioso; se o Sankhya rejeitar a gravação, um erro explícito é retornado para a interface.
  3. **Manutenção de Foco na Rota Guiada ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
     - Ao salvar o endereço, o frontend recalcula o índice da rota para manter a visualização focada no produto recém-endereçado, exibindo seu novo banner de endereço vinculado.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (**exit code 0**).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Correção e Otimização: Timeout de 30s na Consulta de Cargas Pendentes (`/api/separacao/cargas`)

- **Problema Diagnosticado:**
  - A requisição `GET /api/separacao/cargas` estourou o limite de tempo no frontend (`timeout of 30000ms exceeded`).
  - Causa raiz: A consulta SQL no Sankhya (`ListarCargasPendentesUseCase.ts`) consultava `TGFCAB` agrupando com `TGFITE` sem o filtro de pedidos pendentes (`CAB.PENDENTE = 'S'`). Com isso, o Oracle do ERP tentava agregar e calcular totais sobre o histórico de pedidos e cargas de anos inteiros da empresa, gerando full scan e ultrapassando 30 segundos.
  - Além disso, para cada linha retornada era disparada uma consulta individual no repositório local SQLite dentro de um loop (`buscarPorOrdemCarga`).
- **Correções Realizadas ([`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts)):**
  - Adicionado o filtro mandatória `AND CAB.PENDENTE = 'S'` quando não houver busca por uma ordem de carga específica (`filtroOrdemCarga`).
  - Resultado no Sankhya Oracle: tempo de resposta da consulta caiu de **> 30.000ms (timeout)** para apenas **2.577ms**, retornando pontualmente as cargas pendentes ativas.
  - Otimizada a verificação local: pré-carregadas as sessões ativas do SQLite com `listarAtivas()` e mapeamento em `Map`, eliminando N consultas síncronas no loop.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (exit code 0).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (exit code 0).

---

## Correção: Ordem de Execução de Migração DDL e Índice em `separacoes_itens` (`codend`)

- **Problema Diagnosticado:**
  - Ao iniciar o backend (`node dist/main.js` ou `ts-node src/main.ts`), o banco de dados libSQL/SQLite local falhava com o erro:
    `LibsqlError: SQLITE_ERROR: no such column: codend` na função `initDatabaseSchema` (`schema.ts`).
  - Causa raiz: A criação do índice `CREATE INDEX IF NOT EXISTS idx_sep_itens_end ON separacoes_itens(codend);` havia sido inserida no bloco estático inicial de `statements` (executado antes da evolução idempotente de colunas). Como tabelas existentes criadas anteriormente ainda não possuíam a coluna `codend` (que é inserida via `garantirColuna` mais abaixo), o SQLite impedia a inicialização do sistema.
- **Correções Realizadas ([`schema.ts`](./backend/src/infrastructure/database/schema.ts)):**
  - Removida a declaração prematura do índice `idx_sep_itens_end` do array de `statements` estáticos.
  - A criação do índice já é executada de forma segura logo após a execução de `garantirColuna(client, 'separacoes_itens', 'codend', 'INTEGER')`, garantindo que a coluna exista antes de criar o índice.
- **Validação de Builds:**
  - Backend: `npm --prefix backend run build` compilou com sucesso (exit code 0).
  - Frontend: `npm --prefix frontend run build` compilou com sucesso (exit code 0).
  - Banco de dados inicializa com sucesso.

---

## Atualização: Rota Lógica de Separação (Picking / Pulmão TGWEXP + TGWEND) e Gestão de Faltas & Avarias

- **Demanda do Usuário:**
  - *"estamos trabalhando a separação de itens dentro de um galpão logistico, então ele vai seguir uma logica(endereçamento), que vai precisar iniciar a contagem do item, não encontrou finaliza e gera uma falta, caso não encontre a quantidade total. Pensando nisso, seria interessante algo fosse liberando o item da lista e guiar o usuário no processo. Outro ponto é o endereçamento, vamos criar algo para inserir e atualizar o endereçamento durante a separação, minha ideia é ler um codigo de barras fisico com essa logica da imagem."*
  - *"nesse plano está levando em consideração o lote(controle) para inserir o endereço, mas temos um desafio que é diferenciar picking e pulmão com o mesmo controle onde vamos fazer essa persistencia? Acredito que não podemos usar a tgfest para isso."*
  - *"vamos executar o planejado"*
- **Implementações Realizadas:**
  1. **Persistência de Endereçamento em WMS Sankhya (`TGWEXP` + `TGWEND`):**
     - O sistema agora consome diretamente a hierarquia de endereçamento de armazém do Sankhya: `TGWEND` (`CODEND`, `ENDERECO`, `DESCREND`, `PICKING = 'S' | 'N'`).
     - A persistência física de endereços de produto/lote durante a operação é gravada na tabela `TGWEXP` via `MERGE INTO TGWEXP` no Sankhya Oracle, sem poluir ou limitar a `TGFEST`.
     - Diferenciação precisa de **Picking** (`PICKING = 'S'`) para direcionar a fila/rota de separação e **Pulmão** (`PICKING = 'N'`) como localização de reserva.
  2. **Ordenação Lógica da Rota de Separação:**
     - A lista de separação é automaticamente ordenada por `TGWEND.ENDERECO ASC` (Rua ➔ Torre ➔ Nível ➔ Posição), otimizando o deslocamento físico do operador pelo armazém.
  3. **Modo `ROTA_GUIADA` (Item da Vez):**
     - Interface passo a passo orientando o conferente item por item (`Passo X de Y`).
     - Banner em destaque com a posição de picking formatada (`📍 PICKING: R 01 T 01 N 01 P 01 (01.01.01.01.01)`).
     - Indicação clara da posição de reserva/pulmão (`📦 Pulmão: R 02 T 03 N 04 (02.03.04.01)`).
     - Botão `📍 Alterar / Vincular Endereço` abrindo leitor para escanear a etiqueta física da gôndola e registrar no Sankhya na hora.
     - Botão `⚠️ Finalizar com Falta` que encaminha o saldo não encontrado para a supervisão e avança a rota.
     - Ao concluir 100% das unidades do produto, o sistema avança automaticamente para o próximo item pendente da rota.
  4. **Aba Dedicada `⚠️ Faltas & Avarias`:**
     - Painel centralizando todos os produtos com falta física registrada.
     - Exibe a localização de Pulmão cadastrada no Sankhya para reposição imediata.
     - Botão `🔄 Re-separar do Pulmão`: permite ao operador de apoio/corredor buscar as unidades do pulmão, informar a quantidade reposta e o lote, restabelecendo a separação.
     - Botão `✂️ Confirmar Corte`: permite à supervisão confirmar o corte definitivo da quantidade faltante (`CORTADO_DEFINITIVO`), liberando o fechamento da carga no sistema sem travar o faturamento.
  5. **Endpoints e Casos de Uso Criados no Backend:**
     - `AtualizarEnderecoProdutoUseCase.ts` (`POST /api/separacao/:id/endereco`).
     - `RegistrarFaltaItemUseCase.ts` (`POST /api/separacao/:id/falta`).
     - `ResolverFaltaSeparacaoUseCase.ts` (`POST /api/separacao/:id/resolver-falta`).
     - Atualização no `FinalizarSeparacaoUseCase.ts` para permitir conclusão da carga com cortes definitivos autorizados.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Regra absoluta: Nenhum `git commit` ou `git push` executado.

---

## Atualização: Campo Expansível com Dropdown para Códigos de Barras na Separação

- **Demanda do Usuário:**
  - *"Vamos juntar os codigo de barras em um campo e ao clicar expandir a lista"*
- **Implementações Realizadas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx), [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
  1. **Componente `CampoBarrasExpansivel`:**
     - Criado componente dedicado para encapsular os códigos de barras de cada produto em um único botão/campo interativo:
       - Estado recolhido: Exibe `🏷️ N códigos de barras ▾` de forma extremamente compacta (ocupando apenas 1 linha).
       - Estado expandido: Abre um painel animado com sombra e borda delicada (`.separacao-barras-painel-expandido`) listando a Referência e todos os códigos de barras com seus multiplicadores (`📦 FD x20`, `📦 CX x5`, `(PC x1)`).
     - Quando o produto possui apenas 1 código único (e sem referência distinta), o chip é exibido diretamente de forma limpa.
  2. **Interação com 1 Toque para Bipar:**
     - Cada chip dentro da lista expandida continua com interação por toque/clique direto, preenchendo o leitor imediatamente no desktop e no coletor Android.
  3. **Otimização de Espaço em Telas Móveis / Android:**
     - Redução drástica da altura dos cards verticais no Android, eliminando o empilhamento vertical excessivo de chips quando o produto possui múltiplos códigos alternativos.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Exibição Explícita de Multiplicadores em Todos os Códigos de Barras e Unificação TGFBAR + TGFVOA

- **Demanda do Usuário:**
  - *"Vamos incluir os mutiplicadores ao lado dos codigos de barra"*
  - *"pq estou usando codigo de barras do fardo e ele não está multiplcando?"*
- **Diagnóstico no Banco do Sankhya:**
  1. Identificado que na tabela `TGFBAR` os códigos de barras de caixas/fardos (como `17908248300992` CX e `17897190284323` FD) se vinculavam às regras da `TGFVOA` pelo par `(CODPROD, CODVOL)` e não apenas por `CODBARRA` idêntico.
  2. Identificado que o produto `9170` possui no Sankhya apenas o código `7898586935839` cadastrado na `TGFBAR` com unidade `PC` (fator 1), enquanto o `FD` (fator 20) estava sem código de barras (`CODBARRA = NULL`) na `TGFVOA`.
- **Implementações Realizadas ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts), [`RegistrarBipagemSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.ts), [`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx)):**
  1. **Junção Inteligente `TGFBAR` + `TGFVOA`:** A consulta de códigos agora une `TGFBAR` com `TGFVOA` via `CODPROD` e `CODVOL`, herdando automaticamente os fatores multiplicadores para códigos cadastrados tanto na `TGFBAR` quanto na `TGFVOA`.
  2. **Exibição Obrigatória do Multiplicador em Cada Chip:**
     - Todos os códigos de barras passam a exibir seu multiplicador e unidade ao lado.
     - Unidades múltiplas: `📦 CX x5`, `📦 FD x20`, `📦 CX x10` em badge destacada âmbar.
     - Unidades singulares: `(PC x1)`, `(UN x1)` em badge neutra.
  3. **Auto-atualização do Snapshot:** Itens com códigos alterados ou enriquecidos no ERP são atualizados automaticamente na sincronização.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Regra de Multiplicação de Unidade Alternativa (TGFVOA) na Separação

- **Demanda do Usuário:**
  - *"os codigo de barras estão com a regra de multiplicação da unidade alternativa?"*
- **Implementações Realizadas ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts), [`RegistrarBipagemSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.ts), [`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx), [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
  1. **Extração de Fator e Regra de Conversão da `TGFVOA`:**
     - Ao carregar ou sincronizar a separação, a consulta agora extrai da `TGFVOA` as colunas `CODVOL`, `QUANTIDADE` e `DIVIDEMULTIPLICA` ('M' para multiplicação ou 'D' para divisão).
     - Quando `QUANTIDADE > 1`, armazena o metadado no formato padronizado (ex: `7891234567890 (CX x12)` ou `(FD /2)`).
  2. **Aplicação do Fator na Bipagem (`RegistrarBipagemSeparacaoUseCase`):**
     - O caso de uso avalia o código lido contra o metadado local e/ou via consulta em tempo real à `TGFVOA`.
     - Calcula o fator: `fator = divideMultiplica === 'D' ? (1 / quantidadeVoa) : quantidadeVoa`.
     - Multiplica a quantidade informada pelo operador: `qtdEfetiva = quantidadeBipada * fator`.
     - Salva a quantidade efetiva nas unidades base do pedido e bloqueia se a soma ultrapassar o saldo pendente da carga.
     - Mensagem de sucesso informa claramente o fator aplicado: `Bipagem registrada: +12 UN via 1 CX x12`.
  3. **Identificação Visual de Embalagens nos Chips e Preenchimento com 1 Clique:**
     - No frontend, os códigos com embalagem alternativa ganham badge destacada `📦 CX x12`.
     - Clicar em qualquer chip de código ou referência preenche automaticamente o campo do leitor no desktop e no Android.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Inclusão de Fotos de Produtos e Modal de Zoom na Separação

- **Demanda do Usuário:**
  - "Foto do produto vamos incluir"
- **Implementações Realizadas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx), [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
  1. **Miniaturas de Produtos (`ProdutoImagem`):**
     - Integrado o componente nativo [`ProdutoImagem`](./frontend/src/presentation/components/common/ProdutoImagem.tsx) com cache de Blob URL, evitando requisições repetidas e contornando bloqueios de Mixed Content no WebView Android.
     - Miniaturas inseridas na tabela do desktop (`.separacao-produto-thumb`, 48x48px) e nos cards móveis do Android (52x52px).
  2. **Modal de Zoom / Foto Ampliada:**
     - Ao clicar na foto do produto, abre-se uma visualização ampliada centralizada sobreposta (`.separacao-img-modal-overlay`), permitindo ao operador inspecionar detalhes do produto/embalagem.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Exibição e Reconhecimento de Múltiplos Códigos de Barras por Produto na Separação

- **Demanda do Usuário:**
  - "Na lista vamos apresentar os codigo de barras disponivel para os produtos"
- **Implementações Realizadas ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts), [`RegistrarBipagemSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.ts), [`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx), [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
  1. **Consulta Completa de Códigos de Barras no Sankhya:**
     - Ao abrir ou sincronizar a carga, o sistema consulta todos os códigos de barras cadastrados para os produtos em `TGFBAR` e `TGFVOA` (unidades/embalagens alternativas ativas).
     - Agrupa os códigos por produto e armazena na linha do snapshot.
  2. **Bipagem Inteligente de Qualquer Código do Produto:**
     - O validador do leitor de código de barras reconhece instantaneamente a leitura de **qualquer um** dos códigos de barras vinculados ao produto.
  3. **Apresentação Visual na Lista (Desktop e Android):**
     - Criado o componente de chips [`renderBarrasChips`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx) com estilos em `.separacao-barcode-chip`.
     - Todos os códigos de barras disponíveis são exibidos em tags monoespaçadas destacadas (`🏷️ 789...`) junto com a referência comercial do produto, tanto na tabela desktop quanto nos cards verticais do coletor Android.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Ajuste de Filtro de Pedidos de Venda na Separação (STATUSNOTA = 'L')

- **Demanda do Usuário:**
  - "altera statusnota = 'L'"
- **Implementações Realizadas ([`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts), [`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
  - Atualizada a cláusula SQL em todas as rotas de separação para filtrar expressamente pedidos liberados/confirmados no Sankhya:
    ```sql
    WHERE CAB.TIPMOV = 'P'
      AND CAB.STATUSNOTA = 'L'
      AND NVL(CAB.ORDEMCARGA, 0) > 0
    ```
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção de Consulta Oracle (Eliminação de PRO.CODBARRA inexistente em TGFPRO)

- **Problema Relatado:**
  - `ORA-00904: "PRO"."CODBARRA": identificador inválido` ao iniciar ou sincronizar a separação.
- **Causa Raiz & Inspeção no Código de Conferência:**
  - Verificado em [`ListarItensPedidoUseCase.ts`](./backend/src/application/use-cases/conferencias/consulta/ListarItensPedidoUseCase.ts) (Conferência de Saída): na tabela de produtos do Sankhya (`TGFPRO`), não existe a coluna `CODBARRA`. Os códigos de barras residem exclusivamente na tabela associada `TGFBAR`.
- **Solução Aplicada ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
  - Removido o fallback inválido `PRO.CODBARRA`, mantendo a apuração direta via `TGFBAR`:
    ```sql
    NVL(BAR.CODBARRA, '') AS CODBARRA,
    ```
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção de Consulta Oracle no Sankhya (Eliminação de BAR.PADRAO inexistente em TGFBAR)

- **Problema Relatado:**
  - `ORA-00904: "BAR"."PADRAO": identificador inválido` ao consultar itens no Sankhya.
- **Causa Raiz:**
  - Na tabela nativa do Sankhya `TGFBAR` (códigos de barras alternativos), não existe a coluna `PADRAO`.
- **Solução Aplicada ([`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts), [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts)):**
  - Substituído `LEFT JOIN TGFBAR BAR ON BAR.CODPROD = ITE.CODPROD AND BAR.PADRAO = 'S'` pela subquery padrão do sistema:
    ```sql
    LEFT JOIN (
        SELECT CODPROD, MIN(CODBARRA) AS CODBARRA
        FROM TGFBAR
        GROUP BY CODPROD
    ) BAR ON BAR.CODPROD = ITE.CODPROD
    ```
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Alinhamento de Layout da Separação ao Padrão do Sistema (1024px) e Otimização para Android

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "o layout da tela separação está no padrão das outras? Ajusta apenas as posição e largura, lembrando que essa rotina vai para o APP ANDROID"
  - Acordado via `/grill-me`:
    1. Adotar a largura padrão do sistema (`max-width: 1024px`, `.page-container`) integrada ao `AppLayout`.
    2. Manter o card interno de cabeçalho (`🚚 Separação de Cargas (Vendas)`) perfeitamente alinhado em largura 100%.
    3. No Android (`<= 768px`), empilhar inputs e botões verticalmente em 100% de largura para facilitar o toque e evitar quebra visual.
    4. Apresentar a lista de produtos em cards compactos verticais no Android (com código, descrição, contagem X/Y e status destacados) e tabela completa no desktop.
- **Implementações Realizadas ([`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx), [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css)):**
  1. **Largura Padrão e Layout Centralizado:**
     - Envolvida a página no componente global [`AppLayout`](./frontend/src/presentation/components/AppLayout/AppLayout.tsx) com a classe padrão `.page-container` (`max-width: 1024px; margin: 0 auto; padding: 24px 20px`).
     - Alinhada a largura do card extra interno e da barra de busca de carga para preencher harmonicamente os 1024px.
  2. **Responsividade Especializada para Android (Coletores e Celulares <= 768px):**
     - O formulário de scanner e o seletor de carga se adaptam para `flex-direction: column` com inputs e botões em 100% de largura e altura tátil confortável (`min-height: 48px`).
     - Ações do cabeçalho se expandem em 100% com distribuição flexível no mobile.
  3. **Visualização Dupla (Tabela Desktop vs Cards Android):**
     - Criados os cards verticais `.separacao-mobile-cards` exibidos automaticamente em telas móveis (`display: block` em `<= 768px` e `display: none` em desktop).
     - Cards exibem código, descrição, código de barras/lote e contagem `X / Y UN` em fonte grande de fácil leitura no armazém.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Nova Fase — Módulo de Separação de Cargas por ORDEMCARGA com Snapshot e Detecção de Alterações no ERP

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "cria uma conferencia Separação (vamos chamar de separação, onde vamos buscar as itens das notas de vendas que estão pendente, por ORDEMCARGA(tgfcab), vamos ter que criar uma tabela com manter a estrutura de produtos por nunota/pedido para que se caso um item seja removido ou inserido durante a separação consigamos sinalizar dentro do sistema e agir."
- **Implementações Realizadas:**
  1. **Modelagem de Banco de Dados (`schema.ts` - LibSQL / Turso / SQLite):**
     - Criada a tabela `separacoes`: gerencia as sessões de separação por `ordem_carga`, `status` ('EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'), `usuario`, métricas de pedidos, itens e unidades.
     - Criada a tabela `separacoes_itens`: snapshot estrutural de produtos por pedido (`nunota`, `sequencia`, `codprod`, `controle`, `qtd_esperada`, `qtd_separada`, `status_item`, `qtd_erp_atual`, `observacao_alteracao`).
     - Criada a tabela `separacoes_bipagens`: rastreabilidade de bipagens individuais de separação com suporte a estorno.
     - Adicionado parâmetro operacional em `configuracoes_sistema`: `separacao_exigir_lote` (`'false'`).
     - Atualizado o dicionário de dados vivo `SCHEMA_DOCUMENTATION`.
  2. **Camada de Domínio e Casos de Uso (`application/use-cases/separacao`):**
     - [`ListarCargasPendentesUseCase.ts`](./backend/src/application/use-cases/separacao/ListarCargasPendentesUseCase.ts): busca no Sankhya via `DbExplorerSP.executeQuery` todas as ordens de carga (`TGFCAB.ORDEMCARGA`) com pedidos de venda pendentes (`TIPMOV = 'P'`, `STATUSNOTA <> 'L'`).
     - [`IniciarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/IniciarSeparacaoUseCase.ts): cria a sessão e o snapshot inicial completo dos itens dos pedidos da carga (`TGFITE`).
     - [`ObterSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/ObterSeparacaoUseCase.ts): agrupa e consolida a contagem por produto na carga inteira, detalhando o desmembramento por pedido.
     - [`SincronizarItensSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/SincronizarItensSeparacaoUseCase.ts): monitoramento inteligente que compara os itens do snapshot com a `TGFITE` no Sankhya em tempo real, detectando e sinalizando:
       - **Item Removido/Cortado no ERP:** sinaliza corte e exige devolução física caso já houvesse bipagem.
       - **Quantidade Alterada no ERP:** reajusta saldos e alerta se a quantidade bipada excedeu o novo valor.
       - **Novo Item Inserido no ERP:** adiciona a nova linha ao snapshot dinamicamente com badge `NOVO_ERP`.
     - [`RegistrarBipagemSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/RegistrarBipagemSeparacaoUseCase.ts): valida código de barras/referência/código, lote reservado (se exigido por configuração), incrementa quantidade e impede excedente além da carga.
     - [`AnularBipagemSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/AnularBipagemSeparacaoUseCase.ts): estorno seguro de leituras no coletor/leitor com reajuste de saldos.
     - [`FinalizarSeparacaoUseCase.ts`](./backend/src/application/use-cases/separacao/FinalizarSeparacaoUseCase.ts): validação obrigatória com o Sankhya antes de finalizar e suporte a justificativa operacional em caso de divergência.
  3. **Controladores e Rotas REST (`backend`):**
     - Criado [`SeparacaoController.ts`](./backend/src/presentation/http/controllers/SeparacaoController.ts) e [`separacaoRoutes.ts`](./backend/src/presentation/http/routes/separacaoRoutes.ts) registrados em `/api/separacao/*`.
     - Protegido por middleware de autenticação e permissão `separacao`.
  4. **Interface e Telas Operacionais (`frontend`):**
     - [`SeparacaoPage.tsx`](./frontend/src/presentation/pages/separacao/SeparacaoPage.tsx):
       - **Tela 1 (Seleção de Cargas):** leitor rápido para bipar o número da carga ou cards com métricas dos pedidos/clientes para iniciar com 1 clique.
       - **Tela 2 (Painel Operacional):** barra de bipagem com campo de código de barras em destaque, quantidade compacta, campo de lote, feedback sonoro nativo (`Web Audio API`) e tátil (`vibrate`).
       - **Alternância de Visão:** botão instantâneo para alternar entre **"Consolidado por Produto"** (soma de toda a carga) e **"Por Pedido de Venda"** (navegação pedido a pedido).
       - **Polling Automático de Sincronização:** checagem automática a cada 30 segundos no Sankhya + botão para verificação manual imediata.
       - **Banner de Alerta Visual e Sonoro:** banner vibrante no topo destacando quaisquer alterações de cortes ou adições ocorridas no ERP durante o trabalho do operador.
       - **Histórico e Estorno:** modal para visualizar bipagens recentes e efetuar estornos imediatos.
       - **Modal de Conclusão:** confirmação e registro de justificativa caso haja saldo pendente autorizado.
     - Estilos 100% isolados em [`SeparacaoPage.css`](./frontend/src/presentation/pages/separacao/SeparacaoPage.css) com prefixo `.separacao-*`.
     - Integração no menu lateral [`AppDrawer.tsx`](./frontend/src/presentation/components/AppLayout/AppDrawer.tsx) (`🚚 Separação de Cargas`) e na matriz de permissões de [`GestaoAcessos.tsx`](./frontend/src/presentation/pages/GestaoAcessos.tsx).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Unificação Geral de Todas as Legendas para o Tamanho Padrão (0.70rem)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "Vamos ajustar o tamanho da fonte de todas as legendas para o tamanho padrão, o mesmo tamanho atribuido ao lote"
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx), [`GestaoRecebimento.css`](./frontend/src/presentation/pages/GestaoRecebimento.css), [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx)):**
  1. **Pílula de Contagem de Diferença (`.pill-contagem-status`):** Reduzida de `0.78rem` para `0.70rem` com padding compacto de `2px 6px;` e cantos arredondados de `4px`.
  2. **Badges de Decisão e Status Fiscal (`.badge-pendente-aviso`, `.badge-decidido-ok`, `.badge-falta-isolada-erp`):** Alinhados uniformemente para `0.70rem`.
  3. **Badge de Reconferência N3 (`.badge-n3-solicitado`):** Reduzido de `0.72rem` para `0.70rem`.
  4. **Badges de Ocorrências Físicas (`renderBadgesOcorrenciasItem`):** Padronizados para `0.70rem` para Sobra Física, Avaria, Vencido e Falta.
  5. **Subtexto do Produto (`Cód: ... • Seq: ... • Ref: ...`):** Reduzido de `0.72rem` para `0.70rem`.
  6. **Botão de Local (`CODLOCALORIG`):** Reduzido de `0.80rem` para `0.70rem`.
  7. **Coluna Conferentes:** Reduzida de `0.75rem` para `0.70rem`.
  8. **Harmonia Completa no Mobile:** Todos os elementos correspondentes no card mobile foram alinhados para `0.70rem`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Redução Tipográfica para Micro-Legendas (0.58rem) e Botão Horizontal de Lotes

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "diminui o tamanho da fonte das legendas, qual o tamanho atual?"
  - Acordo via `/grill-me`: Opção 2 — Diminuição mais compacta (micro-legenda), com Subtexto NF reduzido para `0.58rem` (~9.2px) e dado conferido/botão para `0.70rem` (~11.2px).
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Micro-Legendas da Nota Fiscal (`NF: ...`):** Reduzidas de `0.70rem` para `0.58rem` com margem compacta (`1px`), conferindo aspecto sutil e discreto sem poluir a célula.
  2. **Dados Conferidos Principais (`Lote`, `Validade`, `Fabricação`):** Reduzidos harmoniosamente de `0.80rem` para `0.70rem`, com a tag do nível (ex: `N2`) reduzida para `0.60rem`.
  3. **Botão de Lotes Horizontal (`2 Lotes ▼`):** Inserido `whiteSpace: 'nowrap'` e tamanho `0.70rem` para eliminar quebras de linha indesejadas, mantendo o botão em uma única linha enxuta.
  4. **Padronização em Fabricação:** Removido o sufixo `(N2)` que persistia na coluna Fabricação, deixando apenas `Múltiplas` idêntico à Validade.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Desduplicação da Legenda de Lotes, Remoção da Palavra 'Múltiplos' e Limpeza da Coluna Local

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "Da para melhorar ainda legenda 2 lotes esta triplicado(remove da diferenca, e do produto e coloca ele na coluan lote), o local ainda está com os icones do lapis e point, e quero que a legenta MULTIPLOS da coluna lote seja removida."
  - Imagem enviada mostrando a triplicação do chip de lotes (no produto, na diferença e no lote), os ícones desnecessários `📍` e `✏️` na coluna Local e a palavra `Múltiplos (2)` no lote.
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Desduplicação e Centralização na Coluna LOTE:**
     - Removido o chip/botão de lotes da coluna **Produto** (deixando a identificação do código, sequência e referência limpa).
     - Removido o chip/botão de lotes da coluna **Diferença** (mantendo exclusivamente a pílula de contagem: `✓ OK`, `⚠️ -X (Falta)` ou `+X (Sobra)`).
     - Concentrado o controle exclusivamente na **coluna LOTE**: removida a palavra `Múltiplos` e o número redundante entre parênteses `(2)`. Exibe diretamente o botão ultra enxuto `2 Lotes ▼` (ou `2 Lotes ▲` quando aberto), sem emojis e sem tag de nível.
  2. **Limpeza da Coluna LOCAL:**
     - Removidos os ícones de pin (`📍`) e lápis (`✏️`).
     - A célula agora renderiza apenas o número do local em um botão clean com borda suave (`211` ou `Sem Local`), que destaca suavemente ao hover para indicar que é clicável para edição, sem ruído visual.
  3. **Visualização Mobile Sincronizada:**
     - Removida a contagem duplicada de lotes na pílula de contagem mobile.
     - Removidos os ícones de pin e lápis no botão de local mobile.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Visualização Minimalista da Tabela de Divergências e Gaveta de Lotes Sob Demanda

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "vamos melhorar a visão dessa lista de divergentes, vamos remover essa frade de frações de lote e deixa a lista de lotes menos(minimalista) sem retira as colunas e oculta com a opção de expandir, e vamos tratar a legendas para deixar a linha dos produtos minimalistas mas sem remover as colunas."
  - Imagens de referência enviadas destacando o excesso visual: banner longo de frações de lote com texto gigante em caixa alta, gaveta aberta permanentemente empurrando a tabela, badges empilhados na coluna Produto e repetição vertical pesada de "Nota: ..." e "Conf: ... (N2)" nas colunas LOTE, VALIDADE e FABRICAÇÃO.
- **Decisões de Design Alinhadas via `/grill-me`:**
  1. **Legendas de Lote, Validade e Fabricação:** Destaque no valor conferido com tag sutil do nível adotado (ex: `123456 (N2)`) e valor da Nota Fiscal em subtexto cinza discreto abaixo (`NF: Sem Lote`), reduzindo expressivamente a altura das linhas sem remover nenhuma coluna.
  2. **Gaveta de Frações de Lote Sob Demanda:** Oculta por padrão; acionada via botão de seta discreto `📦 2 Lotes ▼ / ▲` ao lado do Cód / Seq na coluna Produto e pelo chip interativo na coluna Diferença.
  3. **Remoção do Banner Longo:** Eliminado o texto gigante `📦 FRAÇÕES DE LOTE CONFERIDAS NO COLETOR... TOTAL CONFERIDO...`. A gaveta abre diretamente a mini-tabela com as 5 colunas completas (`LOTE`, `QUANTIDADE`, `DATA DE VALIDADE`, `DATA DE FABRICAÇÃO`, `CONFERENTE`) em estilo clean e slim.
  4. **Coluna Produto Minimalista:** Removido o badge grandão `⚠️ Aguardando Desmembramento` que inflava a primeira coluna, concentrando a sinalização de múltiplos lotes de forma horizontal no botão de expansão e na coluna Diferença.
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  - Inserido botão expansor compacto `📦 {lotesConferidos.length} Lotes ▼` logo após o Cód/Seq do produto.
  - Transformado o chip de contagem de lotes na coluna Diferença em botão interativo de expansão/recolhimento com alternância `▲ / ▼`.
  - Redesenhadas as células de LOTE, VALIDADE e FABRICAÇÃO com destaque tipográfico limpo no dado apurado e linha sutil `NF: ...` em cinza claro.
  - Sub-linha gaveta condicionada estritamente a `temMultiplosLotes && isLotesAberto` (fechada por padrão).
  - Removido o container de cabeçalho extenso da gaveta; renderização direta da tabela de frações com borda suave e padding compacto.
  - Tratamento idêntico aplicado na visualização mobile (`isLotesAberto` fechada por padrão e remoção de badges empilhados).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção de Lotes e Bloqueio de Desmembramento Indevido na Aba Envio Sankhya (Falta Isolada)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "verifica pq após liberara das divergencias ainda continua mostrando os lotes e o botão desmebrar na aba envio para o sankhya"
  - Imagem de referência enviada mostrando que na Aba 3 - Envio ao Sankhya, para a nota já aprovada como `CONFERIDO`, a Seq 5 (fração de falta de 15 UN com contagem física 0) exibia `2 Lotes ▲`, o botão `✂️ Desmembrar` e uma gaveta expandida com lotes herdados de outras sequências (`543216` com 45 un e `123456` com 60 un, totalizando 105 UN!).
- **Diagnóstico e Causa Raiz:**
  1. **Herança Cega de Lotes no Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):** Ao agrupar dados por produto e distribuir entre sequências, quando uma sequência recebia alocação 0 (como a Seq 5, falta isolada), o código verificava se `lotesMapN2` estava vazio e copiava o mapa completo de lotes do produto de outras sequências.
  2. **Fallback Indevido de Bipagens no Frontend ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):** Na função `obterLotesItem`, caso a sequência não tivesse bipagens próprias, realizava fallback para todas as bipagens do produto, associando frações de outras sequências à Seq 5.
  3. **Gaveta e Botão Desmembrar na Aba Envio Sankhya ([`AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx)):** Por receber frações de terceiros, a Seq 5 ativava `temMultiplosLotes`, renderizava a gaveta e exibia o botão `✂️ Desmembrar`.
- **Implementações Realizadas:**
  1. **Isolamento Estrito por Sequência e Busca do Lote da NF no Backend ([`ObterItensConferenciaEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ObterItensConferenciaEntradaUseCase.ts)):**
     - O SQL de itens agora busca `ITE.CONTROLE`, `EST.DTVAL` e `EST.DTFABRICACAO` da nota fiscal no Sankhya ERP.
     - As variáveis `lotesMapN1`, `lotesMapN2`, `lotesMapN3` e `dadosPorNivel` só são copiadas para uma sequência se houver alocação física nela (`alocN > 0`).
     - Se o item tem contagem física zero (`contagemFinal === 0`), `lotesConferidos = []`, e os dados de lote, validade e fabricação assumem os valores originais faturados na TGFITE (`controleOriginal`, `dtvalOriginal`, `dtfabricacaoOriginal`).
  2. **Tratamento Rigoroso de Falta Isolada em `obterLotesItem` ([`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - Se a contagem física do item for 0 (`qtdFisica === 0`), a função retorna imediatamente `[]`.
     - Itens com sequência definida filtram suas bipagens estritamente por sequência, sem fallback para outras sequências do mesmo `codprod`.
  3. **Visualização Limpa de Falta Isolada na Aba Envio ao Sankhya ([`AbaEnvioSankhyaView.tsx`](./frontend/src/presentation/components/Recebimento/AbaEnvioSankhyaView.tsx)):**
     - Tanto no Desktop quanto no Mobile, itens com contagem física zero e quantidade esperada > 0 são categorizados como `isFaltaIsolada`.
     - O botão `✂️ Desmembrar`, o chip de gaveta e o dropdown de múltiplos lotes são completamente desativados para faltas isoladas.
     - Na coluna Lote, exibe o ícone `📄`, o lote original faturado da nota fiscal (`item.controle || item.lote`) e uma tag vermelha discreta `Falta Isolada`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Visibilidade Total de Todos os Itens e Desmembramentos no Assistente e Sincronização de Pendências

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "pq no resumo tem apenas as correções do item 10541 e não aparece a do item 10544, que foi o demembramento? Estamos estamos registrando essas correções em alguma tabela? para que elimine essas divergencias de informações."
- **Diagnóstico e Causa Raiz:**
  1. **Filtro Restritivo no Assistente:** O assistente carregava exclusivamente a lista `grupo.itensDivergentes` (que continha apenas as 3 sequências do Kit Otolog 10541). O produto Micodine Shampoo 10544, por já ter sido desmembrado no Sankhya (50 un na Seq 2 e 40 un na Seq 3) e batido 100% sem divergências, estava em `grupo.todosItens` (5 sequências), mas não em `itensDivergentes`. Por isso, o desmembramento do 10544 não aparecia no resumo do assistente.
  2. **Contador Estático no Botão da Tela Principal:** O botão da tela principal exibia hardcoded `grupo.itensDivergentes.length` (`3 pendentes`), mesmo quando os itens já estavam 100% resolvidos ou isolados no ERP.
  3. **Persistência de Dados e Ciclo de Vida:**
     - Desmembramentos são gravados diretamente na tabela **`TGFITE`** do Sankhya ERP.
     - Ocorrências físicas de sobra são gravadas na tabela local **`ocorrencias_conferencia_entrada`**.
     - Bipagens reatribuídas FIFO são gravadas na tabela **`bipagens_conferencia_entrada`**.
     - Ao clicar em `✓ Executar Decisões e Concluir Nota`, o backend grava na tabela **`conferencias_entrada`** (`status = 'Conferido'`, `decisoes_fiscais_json`), removendo em definitivo a nota da fila de divergências.
- **Implementações Realizadas:**
  1. **Base Total de Itens no Assistente ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - O assistente agora carrega `baseTodosItens` (todas as 5 sequências da nota).
     - O desmembramento do item 10544 agora aparece no resumo na aba `Já Resolvidos` e na aba `Todos (5 itens)`, eliminando divergências de informação entre a tela principal e o assistente.
  2. **Contador Dinâmico de Pendências Reais ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - O botão `Iniciar Assistente` agora calcula com precisão matemática os itens que ainda possuem ação pendente.
     - Quando tudo já estiver resolvido, exibe: `🧙 Assistente (Pronto p/ Concluir)`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Separação de Pendentes vs Já Resolvidos no Assistente e Decisão de Lote com Sobra Física

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "pq após resolver continuou aqui pendente de decisão?" (Imagem enviada da tabela de divergências mostrando produto com sobra resolvida, quantidade batendo 90/90, mas com tag `⚠️ Pendente de Decisão` devido a lote/validade divergente do saldo restante sem decisão cadastral).
  - "deu certo, agora vamos seprar na tela do assitente, o que está pendente do que já foi feito... para fica mais claro para o usuário." (Acordado via `/grill-me`: Opção 1, design minimalista com pílulas e abas compactas tanto no Resumo quanto no Passo a Passo).
- **Implementações Realizadas:**
  1. **Decisão Cadastral Integrada no Saldo com Sobra Física ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Quando um item possui sobra física agendada e os dados fiscais do saldo restante (Lote/Validade/Fabricação) divergem da nota fiscal (ex: Micodine Shampoo com 90 UN restantes no lote bipado `123356` vs lote da NF `2605001.032/26`), o assistente exibe imediatamente abaixo da sobra agendada o seletor para adotar `📱 Coletor (Bipado)` ou `📄 Nota Fiscal (ERP)`.
     - O validador `verificarItemResolvido` exige tanto a regularização física da sobra quanto a decisão cadastral do saldo restante para considerar o item 100% resolvido, eliminando falsas pendências ao retornar à tela principal.
  2. **Abas Minimalistas na Tela de Resumo ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Adicionadas abas compactas no topo da tabela de visão geral: `⚠️ Pendentes (X)`, `✓ Já Resolvidos (Y)` e `Todos (Z)`.
     - Por padrão, se houver pendências, abre na aba `Pendentes`; caso contrário, foca em `Já Resolvidos`.
     - Se todos os pendentes forem concluídos, renderiza um banner minimalista de sucesso convidando o usuário a revisar na aba de resolvidos ou clicar em `Executar Decisões e Concluir Nota`.
     - Ações por linha customizadas: itens pendentes exibem botão `Resolver →` (fundo escuro `#0f172a`), enquanto itens resolvidos exibem `Revisar ✎` (fundo suave `#f1f5f9`).
  3. **Pílulas Minimalistas no Passo a Passo ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Inseridas pílulas minimalistas integradas ao cabeçalho/stepper: `⚠️ Pendentes (X)` e `✓ Já Resolvidos (Y)`.
     - O stepper e a navegação "Anterior" / "Próximo" focam diretamente na lista filtrada, permitindo que o gestor resolva sequencialmente apenas os itens pendentes sem precisar passar pelos já resolvidos.
     - Ao resolver a última pendência, o assistente abre automaticamente a Tela de Resumo com foco na aba `Já Resolvidos` para revisão final e execução no Sankhya.
     - Botão `← Voltar ao Passo a Passo` adicionado no rodapé da tela de resumo para fácil alternância.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Marcação de Sobra Agendada Resolvida e Preservação de Locais na Revalidação

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "Registrei ocorrencia de sobra e não marcou V no numero 1, e ao clicar em revalidar demembramento os locais informados foram removidos tive que informar novamente. E eu não consigo finalizar no assistente."
- **Diagnóstico dos Bugs Identificados:**
  1. **Trava no Status de Sobra Agendada:** A função `verificarItemResolvido` não possuía a condição `if (sobrasAgendadas[k]) return true;` (ao contrário de `desmembramentosAgendados` e `itensRecontarN3`). Se o item com sobra agendada possuía lote divergente, o validador exigia decisão cadastral e retornava `false`, impedindo o check verde `(✓)`, mantendo `Status: —` no resumo e bloqueando o botão de conclusão final da nota.
  2. **Perda de Locais e Frações na Revalidação:** O `ModalDesmembrarItem` e o `ModalOcorrenciaSobra` reinicializavam seus estados sempre a partir do zero ou do item bruto, sem receber os dados já salvos em `desmembramentosAgendados` ou `sobrasAgendadas`. Com isso, ao clicar em "Revalidar", os locais de estoque analíticos (`codlocal`) escolhidos pelo gestor eram apagados.
- **Implementações Realizadas:**
  1. **Marcação Imediata de Item Resolvido com Sobra ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Adicionada a checagem imediata `if (sobrasAgendadas[k]) return true;` em `verificarItemResolvido`.
     - O item 1 agora exibe o check verde `(✓)` no stepper imediatamente após agendar a sobra, exibe `✓ Resolvido` na tabela de resumo e desbloqueia o botão `✓ Executar Decisões e Concluir Nota`.
  2. **Preservação de Dados Prévios no Desmembramento ([`ModalDesmembrarItem.tsx`](./frontend/src/presentation/components/Recebimento/ModalDesmembrarItem.tsx)):**
     - Adicionada a prop `dadosPrevios`.
     - Ao clicar em `Revalidar Desmembramento`, o modal restaura exatamente as frações, quantidades, lotes e **especialmente os locais de estoque (`codlocal`)** previamente definidos, eliminando a necessidade de redigitação.
  3. **Preservação de Dados Prévios na Ocorrência de Sobra ([`ModalOcorrenciaSobra.tsx`](./frontend/src/presentation/components/Recebimento/ModalOcorrenciaSobra.tsx)):**
     - Adicionada a prop `dadosPrevios`.
     - Ao clicar em `Revalidar Sobra`, o modal restaura a quantidade da sobra, lote, datas, motivo e o local de estoque de destino (`codlocalDestino`) configurados anteriormente.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Reatribuição Inteligente FIFO de Sequências com Limite de Saldo (`QTDNEG`)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "acho que não ficou correto, consegue acompanhar a execução novamente desse pedido para entender o erro e ajustarmos está muito confuso o resultado, não foi o que executamos?"
- **Diagnóstico do Bug de Amontoamento de Bipagens:**
  - O produto **Micodine Shampoo (10544)** desmembrou com sucesso (Seq 2 com 10 un, Seq 4 com 70 un e Seq 5 com 10 un de falta isolada).
  - Porém, no **Kit Otolog (10541)**, a rotina anterior de `reatribuirSequenciasBipagens` usava um `.find()` simples sem verificar o teto (`QTDNEG`) de cada sequência da TGFITE.
  - Com isso, todas as bipagens do lote `654321` (45 un + 60 un = 105 un) foram amontoadas na Seq 1 (que só faturou 45 un), gerando um falso alerta de sobra de +60 un, enquanto a Seq 3 ficava com falta de 45 un e a Seq 6 ficava zerada com falta de 15 un, apesar do volume total do produto bater perfeitamente em 120 un.
- **Implementações Realizadas:**
  1. **Algoritmo FIFO com Limite de Saldo ([`LibsqlConferenciaEntradaRepository.ts`](./backend/src/infrastructure/repositories/LibsqlConferenciaEntradaRepository.ts)):**
     - O método `reatribuirSequenciasBipagens` agora mantém o mapa de `saldoRestante` por sequência respeitando rigorosamente a quantidade faturada (`QTDNEG`) de cada uma.
     - Prioriza o casamento por lote faturado com saldo disponível; quando o teto da sequência é atingido, o saldo restante é alocado nas sequências subsequentes do mesmo `codprod`.
     - Suporte nativo a split de bipagem: se uma bipagem exceder o saldo da sequência, aloca a fatia exata que cabe nela e cria uma nova fração de bipagem para alocação na próxima sequência com saldo.
     - Resultado verificado: Kit Otolog perfeitamente equilibrado em **Seq 1: 45 / 45**, **Seq 3: 60 / 60** e **Seq 6: 15 / 15** (Diferença 0 em todas!).
  2. **Sincronização Defensiva Automática ([`ListarDivergenciasEntradaUseCase.ts`](./backend/src/application/use-cases/recebimento/ListarDivergenciasEntradaUseCase.ts)):**
     - Ao listar divergências de conferências com itens desmembrados (múltiplas sequências para o mesmo produto na TGFITE), o use case reatribui preventivamente as bipagens locais com a nova regra FIFO, garantindo que a tabela e o assistente nunca exibam resquícios de sequências desbalanceadas.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Compensação de Saldo Multi-Item e Reconhecimento de Falta Isolada no ERP

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "Vamos analisar o que ocorre aqui na tela de assistente após finalizar os ajuste e entra nela novamente para reconferencia."
  - Alinhamento aprovado: 1) Compensar o saldo de produtos multi-item (eliminando falso positivo de sobra quando o total do produto bate na nota); 2) Considerar 'Falta Isolada no ERP' como 100% resolvida no assistente e no resumo; 3) Corrigir visibilidade do botão de ocorrência de sobra.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Compensação Inteligente de Saldo Multi-Item:**
     - Criado o mapa consolidado `saldoConsolidadoPorProd` que totaliza a quantidade esperada e conferida de todas as sequências do mesmo `codprod` na nota fiscal.
     - Um item multi-item só é tratado como **Sobra Física Real** se o saldo global do produto na nota for estritamente positivo (`saldoGlobal > 0 && diferenca > 0`).
     - Se o total do produto na nota bater (`saldoGlobal <= 0`), a linha individual não gera falso alerta de sobra física; em vez disso, é reconhecida como **`📑 Produto Multi-Item Compensado na NF`**, regularizando as sequências complementares sem induzir à geração incorreta de ocorrência de sobra.
  2. **Persistência e Reconhecimento de 'Falta Isolada no ERP':**
     - Itens com falta física que já foram desmembrados no Sankhya e isolados com o lote da Nota Fiscal (`loteOriginal === numnotaStr || loteOriginal === nunotaStr`) são imediatamente reconhecidos como resolvidos na função `verificarItemResolvido`.
     - No passo a passo, exibe o card verde informativo: `✓ Falta Isolada no ERP ({qtd} UN) - Esta falta já foi desmembrada no Sankhya e isolada com o lote da Nota Fiscal ({loteOriginal}). O item está 100% resolvido.`
     - Na tabela do Resumo, as colunas "Saldo / Lotes", "Decisão Adotada" e "Status" exibem as badges e status de conclusão verdes correspondentes (`✓ Falta Isolada no ERP` e `✓ Resolvido`).
  3. **Correção Visual no Botão de Ocorrência de Sobra:**
     - Envolvido o texto com tag `<span>` estilizada com `color: #ffffff` e `font-weight: 700`, garantindo legibilidade absoluta sobre o fundo `#0f172a`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Diagnóstico Duplo (Múltiplos Lotes + Falta) e Remoção de Ação Alternativa Redundante

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "veja que não tela inicial não está motrando que o desmembrar vai resolver a falta também. Vamos incluir essa informação."
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Diagnóstico Duplo de Múltiplos Lotes com Falta:**
     - Quando o produto possui simultaneamente múltiplos lotes e saldo faltante (`temMultiplosLotes && temFalta`), o texto da ação recomendada agora explicita claramente ambas as resoluções:
       `O produto possui X lotes conferidos e saldo faltante de Y UN. Configure o desmembramento das frações e o isolamento da falta no Sankhya:`
     - Ao agendar o desmembramento, o badge e cabeçalho indicam expressamente:
       `✓ Desmembramento Agendado: X frações (incluindo isolamento da falta)`.
  2. **Eliminação de Redundância Visual:**
     - Ocultado o botão secundário `Ações alternativas: 🔍 Recontar em N3` quando o item já possui o botão principal `🔍 Solicitar Reconferência N3` no grid de ações recomendadas de falta.
     - A barra de ações alternativas é renderizada somente quando houver ações secundárias de fato disponíveis.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Ordenação Sequencial de Divergências e Limpeza Minimalista da Tela Principal

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "vamos analisar o assitente e finalizar as trativas das divergencias por completo e sequencial. Qual o fluxo estamos enviando para divergencia?"
- **Fluxo de Envio para Divergência Esclarecido:**
  - O sistema envia notas para Divergência quando há:
    1. Quantidade N1 ≠ N2 (`FinalizarNivelEntradaUseCase.ts`).
    2. Falta Física (`diferenca < 0`) ou Sobra Física (`diferenca > 0`) em relação ao faturado.
    3. Divergências Cadastrais em Lote, Validade ou Fabricação (`ListarDivergenciasEntradaUseCase.ts`).
- **Implementações Realizadas:**
  1. **Ordenação por Severidade Sequencial no Assistente ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Ordem estrita de resolução por gravidade operacional:
       * **Nível 1 (Crítico):** Sobra Física (`dif > 0`, bloqueante para qualquer desmembramento no Sankhya).
       * **Nível 2 (Grave):** Falta Física (`dif < 0`, opções de Reconferência N3 ou Desmembramento/Isolamento de Falta).
       * **Nível 3 (Operacional):** Múltiplos Lotes (`lotes > 1`).
       * **Nível 4 (Desempate):** Desempate N3 Apurado (`temN3Item`).
       * **Nível 5 (Cadastral):** Divergências puras de Lote / Validade / Fabricação.
       * **Desempate secundário:** Por número de `sequencia`.
  2. **Tratamento de Falta Física Equilibrado no Assistente ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Diagnóstico claro de falta e renderização em grid das duas ações manuais de mesmo peso:
       * `🔍 Solicitar Reconferência N3`
       * `✂️ Desmembrar no ERP (Isolar Falta)`
  3. **Limpeza Minimalista da Tela Principal ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - Removidos todos os botões operacionais dispersos nas linhas das tabelas Desktop e Mobile (`✂️ Desmembrar`, `📦 Gerar Ocorrência de Sobra`, `Decidir Divergência`, `⚖️ Revisar Desempate`).
     - Tabela principal convertida em painel de consulta visual limpo com pills e badges minimalistas (`+{diferenca} (Sobra)`, `⚠️ {diferenca} (Falta)`, `✓ OK`, `📦 X Lotes`, `✓ Falta Isolada no ERP`).
     - Ações operacionais centralizadas no fluxo guiado do assistente (`🧙 Iniciar Assistente`) e nas ações globais de rodapé.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Bloqueio do Botão Concluir sem Decisões e Correção de Status no Resumo

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "O botão do assitente para executar decisões está ficando ativo, sem ter efetivamente decidido. Apenas apertei no botão ver resumo."
- **Diagnóstico do Bug Identificado:**
  1. **Botão Ativo Prematuramente:** No rodapé do modo Resumo (`ModalAssistenteDivergencias.tsx`), o botão `✓ Executar Decisões e Concluir Nota` verificava apenas se o lote já estava em execução (`disabled={executandoLoteFinal}`), ignorando completamente se todos os itens haviam sido resolvidos (`todosResolvidos`). Com isso, ao abrir o resumo com 0% resolvido, o botão já ficava com estilo escuro ativo e clicável.
  2. **Decisão Adotada Incorreta na Tabela do Resumo:** Quando um produto apresentava divergência fiscal cadastral (Lote/Validade/Fabricação) e ainda não havia decisão tomada, o fluxo caía no `else` exibindo `✓ Conforme Nota` em verde, mesmo com o status da linha indicando pendência (`—`).
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Trava no Botão de Execução Final:**
     - Adicionada a condição `disabled={executandoLoteFinal || !todosResolvidos}`.
     - Quando houver itens pendentes (`!todosResolvidos`), o botão é renderizado desabilitado com fundo cinza (`#94a3b8`), opacidade reduzida, cursor `not-allowed` e tooltip explicativo indicando quantos itens faltam resolver.
     - Validação defensiva em `handleExecutarTudoEFinalizar` impedindo a submissão para o Sankhya caso existam itens pendentes.
  2. **Correção da Coluna "Decisão Adotada":**
     - Adicionadas verificações explícitas para `dif < 0` (`⚠️ Falta Pendente`) e `(pL || pV || pF)` (`⚠️ Decisão Pendente` em tom âmbar `#b45309`).
     - A indicação `✓ Conforme Nota` só é exibida quando o produto de fato não possui pendência cadastral.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Unificação do Destaque de Multi-Item na Tag "Seq: X" do Produto

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "vamos remover esse mult-item e colocar o destaque que está nela na informação Seq dos itens."
  - Alinhamento `/grill-me`: Destacar 'Seq: X' como tag visual em todos os produtos, usando a cor azul de destaque para os que forem Multi-Item (`contagemSeqsPorCodprod > 1`).
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Remoção da Linha Separada `📑 Multi-Item na NF`:**
     - A tag redundante que ocupava uma linha inteira abaixo da descrição foi removida das visualizações Desktop e Mobile.
  2. **Tag Visual Unificada `Seq: X`:**
     - Todas as sequências agora são renderizadas como tags visuais compactas na linha de identificação do produto.
     - **Itens Multi-Item (`contagemSeqsPorCodprod > 1`):** Tag em destaque com ícone `📑 Seq: X`, fundo azul suave (`#eff6ff`), borda azul (`#bfdbfe`), texto azul escuro (`#1d4ed8`) em negrito e tooltip detalhado `Item com múltiplas sequências na nota fiscal (Linha de Sequência X de Y)`.
     - **Itens de Sequência Única:** Tag neutra `Seq: X`, fundo cinza suave (`#f1f5f9`), borda (`#e2e8f0`) e texto (`#334155`).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Ocultação do Botão "✂️ Desmembrar" para Produtos em Reconferência N3

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "está em N3 e o demembrar está habilitado."
  - Decisão alinhada: Ocultar o botão `✂️ Desmembrar` enquanto o item estiver em N3, pois a contagem física ainda está sendo apurada no coletor.
- **Implementações Realizadas ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Coluna Diferença (Desktop e Mobile):**
     - Nas situações de falta física (`diferenca < 0`) e múltiplos lotes (`temMultiplosLotes`), adicionada a trava `!estaEmN3` na renderização do botão `✂️ Desmembrar`.
     - Enquanto o produto estiver aguardando contagem ou em andamento no coletor (`estaEmN3`), a linha exibe exclusivamente a contagem apurada até o momento e o badge `🔍 Aguardando N3` na coluna do produto, sem permitir desmembramento prematuro no Sankhya ERP.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Bloqueio e Sinalização de Ação Executada para Notas Enviadas a N3 no Assistente

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "o assistente mandou para n3 porém ficou em divergente."
  - "a questão é que ao enviar para reconferencia o botão de assitencia continua habilitado, como se não tivesse atuado."
  - "Manter o contador de divergentes ativo para sinalizar que o item originalmente divergiu entre N1/N2 e ERP."
- **Diagnóstico do Problema:**
  - Após o assistente disparar a Reconferência N3 (`acao: 'RECONFERIR_N3'`), a conferência atualizava com sucesso para o status `Aguardando N3` no banco.
  - Contudo, na tela de Divergências (`AbaDivergenciasView.tsx`), os botões de ação continuavam habilitados como se o gestor ainda não tivesse atuado:
    1. O botão `🧙 Iniciar Assistente` no topo e no rodapé do card continuava ativo em preto com indicação de pendências (`1 pendentes`).
    2. O botão `⚠️ Resolver Divergência` continuava exibindo pendência fiscal, pois `totalFiscaisPendentes` não desconsiderava itens que foram enviados para recontagem N3.
    3. Na tabela expandida de itens, o botão `Decidir Divergência` continuava visível ao lado do badge `🔍 Aguardando N3`.
    4. A dica gerencial inteligente exibia texto desatualizado sugerindo "Solicitar Reconferência N3" para uma nota que já estava aguardando o coletor.
    5. A função `verificarItemEmN3` retornava `false` quando a conferência inteira estava em N3 sem array de `itensRecontagem`.
- **Implementações Realizadas:**
  1. **Ajuste em [`recebimentoHelpers.tsx`](./frontend/src/presentation/components/Recebimento/recebimentoHelpers.tsx):**
     - Em `verificarItemEmN3`: caso o status da conferência seja N3 e `itensRecontagem` seja vazio/indefinido (envio da nota integral para N3), todos os itens da nota são considerados em N3 (`return true`).
  2. **Card e Botões em [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx):**
     - Identificação unificada de status em N3: `estaAguardandoOuEmN3`.
     - `totalFiscaisPendentes`: itens sob recontagem N3 (`verificarItemEmN3`) não são cobrados como pendência de decisão fiscal no momento da conferência.
     - `podeResolverDivergencia`: bloqueado enquanto `estaAguardandoOuEmN3` for verdadeiro.
     - **Botão `Iniciar Assistente` (topo e rodapé):** Quando a nota está em N3, exibe estado desabilitado: `⏳ Enviado para N3 (Aguardando Coletor)` / `⏳ Aguardando Coletor N3` com tooltip explicativo e estilo neutro cinza, sinalizando com clareza que o gestor já agiu.
     - **Botão `Resolver Divergência`:** Desabilitado durante o N3 com label `⏳ Aguardando N3`.
     - **Botão `Reconferir (N3)`:** Desabilitado com label `✓ Em N3 (Coletor)`.
     - **Tabela de Itens (Desktop e Mobile):** Remoção do botão `Decidir Divergência` para produtos sob recontagem N3 (`!estaEmN3`), exibindo exclusivamente o badge `🔍 Aguardando N3`.
     - **Dica Gerencial (Decision Assist):** Quando a nota está em N3, exibe banner informativo neutro: `Reconferência N3 em Andamento no Coletor: Esta conferência foi enviada para reconferência cega (Nível 3). Aguarde os conferentes realizarem a bipagem no coletor para avaliar o desempate ou aprovar.`
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção do Status Resolvido ("✓") e Barra 100% para Itens com Desmembramento Agendado

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "qual o motivo para não ficar 100% na barra e os itens 1,2 e 3 não estarem com o V?"
  - "opção 1, porém precisamos criar um fluxo para tratar as divergências com inteligência"
- **Diagnóstico do Bug Identificado:**
  - Na função de apuração `verificarItemResolvido`, os itens com desmembramento agendado continuavam sendo travados pela verificação `cadastralOk = !(pL || pV || pF)`.
  - Como os produtos em falta/desmembramento possuíam lote faturado diferente do bipado, o sistema cobrava a decisão de Lote/Validade antes do desmembramento ocorrer. Além disso, a tabela de resumo recalculava `resolvido` com uma fórmula inline antiga em vez de usar a função unificada.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Resolução Imediata por Desmembramento Agendado:**
     - Em `verificarItemResolvido`, adicionada a regra expressa: `if (desmembramentosAgendados[k]) return true;`.
     - Ao agendar o desmembramento (definindo lotes, quantidades e locais de destino na 1ª fase), o item é considerado 100% resolvido na etapa atual do assistente.
  2. **Unificação da Tabela do Resumo:**
     - A tabela do resumo agora consome diretamente `const resolvido = verificarItemResolvido(it);`, eliminando divergências entre o stepper, a barra de progresso e as linhas da tabela.
  3. **Resultado:**
     - Os itens 1, 2 e 3 ganham `✓` em verde esmeralda no stepper e na coluna *Status* do Resumo.
     - A barra de progresso atinge 100% (`7 de 7 resolvidos`).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Fluxo de Falta Física com Desmembramento/Locais de Estoque e Ocultação de Decisão Cadastral Prematura

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "aqui temos uma situação de falta, primeira fase ou recontagem ou demembrar o item. Ai posteriormente pode gerar outra divergencia após o demembramento(Divergencia de lote/fabricação/validade). Se marcar desmembrar vamos abrir o modal abaixo para informar os dados do local no demembramento e persistir antes de desmenbrar no sankhya."
  - Alinhamento `/grill-me`:
    1. **Ocultação da Decisão Cadastral na Falta**: Enquanto persistir saldo faltante (`diferenca < 0`), a decisão cadastral de Lote/Validade ("A quantidade confere com a nota...") é omitida, pois a quantidade ainda não foi sanada e eventuais divergências cadastrais só serão apuradas após o desmembramento das sequências no ERP.
    2. **Foco Operacional na Falta**: O card exibe exclusivamente as ações válidas para a 1ª fase: `✂️ Configurar Desmembramento no Sankhya ERP` (com indicação do saldo faltante) e `🔍 Recontar em N3`.
    3. **Preenchimento e Persistência do Local de Estoque**: Ao acionar o desmembramento, o modal `ModalDesmembrarItem` permite preencher e validar os locais de estoque analíticos da `TGFLOC` para cada fração de lote antes de persistir o agendamento no assistente.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Ajuste nas Condições de Renderização:**
     - Cenário 4 (Decisão Cadastral): Adicionada trava `!temFalta`, impedindo exibição quando houver saldo em aberto.
     - Cenário 5 (Tudo OK): Adicionada trava `!temFalta`.
     - Cenário 2 (Falta/Desmembramento): Suporte a feedback quando agendado para N3 (`Item Agendado para Reconferência N3`), evitando duplicação de decisões.
  2. **Apuração Unificada de Resolução (`verificarItemResolvido`):**
     - Adicionada regra `faltaOk = dif >= 0 || Boolean(desmembramentosAgendados[k])`. Um item com saldo faltante só é considerado resolvido se for configurado o desmembramento ou enviado para N3.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Remoção de Informação Redundante Central e Correção do Stepper no Assistente de Divergências

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "vamos remover essa informação central, e veja que o circulo está sendo cortado."
  - Imagem enviada destacando:
    1. Retângulo superior: os círculos numéricos do stepper de itens `(1) (2) (3)` tinham a borda cortada verticalmente por overflow.
    2. Retângulo inferior: o card intermediário prolixo "Divergência Cadastral de Lote / Validade" ocupava espaço desnecessário entre o resumo de quantidades e as ações recomendadas.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Remoção da Informação Central:**
     - Removido o bloco intermediário de texto redundante ("Card de Diagnóstico Inteligente").
     - O layout agora conecta diretamente os dados faturados/conferidos do produto ao card objetivo "⚡ AÇÃO RECOMENDADA PARA ESTE ITEM", tornando a navegação ágil, objetiva e sem rolagem desnecessária.
  2. **Correção do Corte nos Círculos do Stepper:**
     - Adicionado espaçamento vertical confortável (`padding: 6px 4px`, `minHeight: 36px`, `gap: 8px`) no container flex com `overflowX: auto`.
     - Substituído o efeito de `scale(1.12)` por dimensões dimensionadas confortavelmente (`width: isAtual ? 26px : 24px`, `height: isAtual ? 26px : 24px`), eliminando qualquer corte no topo ou na base do círculo e de sua sombra.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Execução Correta de N3 sem Fechamento Prematuro da Nota Fiscal no Assistente de Divergências

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "no assitente de divergencia quando marco para agendar recontagem, o botão executar decisão na tela de resumo vai enviar o item para recontagem? Percebi que ele marcar a nota com concluida e liberar para integrar a sankhya. Lembro ter planejado que ele enviaria para recontagem, assim como executar caso haja desmembramento e geração de ocorrencia. Revisita o processo da ocorrencia."
  - Alinhamento `/grill-me`:
    1. Se houver itens para N3: executa as sobras agendadas, executa os desmembramentos agendados, envia diretamente os itens para Reconferência N3 (via API) e fecha o assistente deixando a nota aberta em N3 (**SEM aprovar/concluir a nota nem liberá-la prematuramente para o Sankhya**).
    2. O botão de execução no Resumo ajusta seu rótulo dinamicamente: `✓ Executar Ações e Enviar p/ Reconferência N3`.
    3. Revisão do ciclo de vida de ocorrências de sobra: confirmada a dedução física via `conferenciaRepo.abaterSobraBipagens(...)` e criação formal com `conferenciaId`, garantindo conformidade fiscal absoluta.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx), [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) & [`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
  1. **Envio Direto à API de N3 (`handleExecutarEnvioN3Api`):**
     - Criada função assíncrona dedicada em `GestaoRecebimento.tsx` que invoca `recebimentoService.resolverDivergencia(conferenciaId, { acao: 'RECONFERIR_N3', itens })` e recarrega silenciosamente os dados, repassando-a via prop `onExecutarN3Api` até o assistente.
  2. **Bloqueio de Conclusão Indevida da Nota:**
     - Em `handleExecutarTudoEFinalizar`, quando `temItensN3 === true`:
       - Executa as ocorrências de sobras agendadas (`onExecutarSobraApi`).
       - Executa os desmembramentos agendados no ERP (`onExecutarDesmembramentoApi`).
       - Dispara a reconferência N3 na API (`onExecutarN3Api`).
       - **Fecha o modal sem chamar `onFinalizarResolucao`**, garantindo que a conferência permaneça com status de Reconferência N3 e aberta para nova contagem dos conferentes no coletor.
     - Apenas quando `temItensN3 === false` (todas as divergências resolvidas definitivamente) o assistente chama `onFinalizarResolucao` para concluir e liberar a nota para o Sankhya.
  3. **Identidade Visual e Rótulo Dinâmico:**
     - Botão do rodapé no modo Resumo:
       - Se houver N3: `✓ Executar Ações e Enviar p/ Reconferência N3`.
       - Se não houver N3: `✓ Executar Decisões e Concluir Nota`.
     - Banner superior do Resumo explica claramente que a conferência permanecerá aberta para nova contagem.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Busca em Tempo Real, Mover Item Ativo ao Topo e Destaque Borda Verde no App Android

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "no app android quando eu digito um codigo de barras, é feito a pesquisa se ele está presente na lista de de itens? Seria possivel marcar o item da lista com a borda verde, facilitando para o usuário visualizar o item que ele está bipando?"
  - Alinhamento `/grill-me`:
    1. **Pesquisa em Tempo Real**: Conforme digita ou bipa, localiza instantaneamente o produto por `codbarra`, `codigosAlternativos`, `codprod`, `referencia` ou `refforn`.
    2. **Mover ao Topo da Lista**: O item localizado é reordenado dinamicamente para o topo da lista (1ª posição) para visibilidade instantânea.
    3. **Destaque Visual Borda Verde**:
       - Enquanto o produto estiver ativo/digitado no leitor: borda verde viva (2.5px solid `#16a34a`), fundo esverdeado sutil (`#f0fdf4`) e etiqueta `🎯 Bipando...`.
       - Ao confirmar o registro do bip: transita para efeito pulso verde (`pulsoCardVerde`) com etiqueta `✓ Conferido agora` por 3.5 segundos antes de retornar ao estado normal.
    4. **Alternância Automática de Abas (Modo Supervisor)**: Se o produto digitado já tiver sido 100% conferido (aba "Itens Conferidos"), a interface transita automaticamente para essa aba para mostrar o card destacado no topo. No Modo Cego, a aba única imutável é estritamente preservada.
- **Implementações Realizadas ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx) & [`ConferenciaEntradaPage.css`](./frontend/src/presentation/pages/ConferenciaEntradaPage.css)):**
  1. **Memoização de Item Ativo & Estado de Recém-Bipado:**
     - `itemAtivoCodigo`: detecta em tempo real a correspondência com a lista de itens da conferência.
     - `codprodRecenteBipado` com timer de 3.5s ativado no sucesso de `handleBipar`.
  2. **Reordenação Dinâmica:**
     - Priorização no topo de `itensOrdenados` e `itensConferidosVisiveis`: Item Ativo (`itemAtivoCodigo`) > Recém-bipado (`codprodRecenteBipado`) > Lote Repetido > Ordem padrão/selecionada.
  3. **Estilos e Badges CSS:**
     - Classes `.item-card-ativo-bipando`, `.item-card-recente-bipado`, `tr.row-ativo-bipando`, `tr.row-recente-bipado`.
     - Animação `@keyframes pulsoCardVerde` e `@keyframes pulsoLinhaVerde`.
     - Badges `.badge-ativo-bipando-card` (`🎯 Bipando...`) e `.badge-recente-bipado-card` (`✓ Conferido agora`).
- **Validação de Builds & Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - Android: `gradlew assembleDebug` compilado com sucesso (**BUILD SUCCESSFUL in 53s**).
  - Deploy via ADB no dispositivo conectado (`ZF523R6Q5Q`) com inicialização da aplicação.

---

## Atualização: Exclusividade Mútua entre Recontagem N3 e Decisão Fiscal + Correção da Bolinha do Stepper no Assistente

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "pq no assitente ao selecionar recontagem N3, não está marcando que tomei a decisão, e não deveria poder selecionar a decisão e recontagem."
  - Alinhamento `/grill-me`:
    1. Aplicar exclusividade mútua entre Recontagem N3 e Tomar Decisão Fiscal (não permitir selecionar ambas simultaneamente).
    2. Ao agendar para N3, limpar qualquer decisão fiscal cadastrada anteriormente para o item e marcar `✓` de resolvido na bolinha do stepper.
    3. Remover o botão `Modal Decisão Fiscal N2` da linha de ações alternativas.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx) & [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Exclusividade Mútua:**
     - Ao clicar em `🔍 Recontar em N3`, limpa qualquer decisão fiscal já cadastrada para o item (`onLimparDecisaoItem`), evitando estado concorrente ambíguo.
     - O bloco de decisão cadastral é substituído por um card verde informativo: `✓ Item Agendado para Reconferência N3 (Este item aguardará a nova contagem cega N3 ao concluir)` com botão `✕ Cancelar N3`.
     - Caso o usuário tome uma decisão fiscal (Coletor, ERP ou nível N2/N3), o agendamento de N3 é cancelado automaticamente.
  2. **Unificação do Cálculo de Resolução (`verificarItemResolvido`):**
     - O cálculo de resolvido das bolinhas do stepper agora considera `itensRecontarN3.has(k)` e ações agendadas em lote.
     - Quando o item é agendado para N3, a bolinha do stepper muda imediatamente para `✓` em verde, e o item atual resolvido ganha fundo verde sólido com `✓` branco.
  3. **Remoção do Botão Redundante:**
     - Removido o botão `⚖️ Modal Decisão Fiscal N2` da barra de ações alternativas do assistente, mantendo o visual limpo e focado no fluxo direto.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Agendamento e Execução em Lote no Assistente de Divergências (Sobras, Desmembramento e N3) com Revalidação

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - "Quando eu clicar em recontar, demembrar, ocorrencia no assitente de divergencia, vamos executar essa decisão para o final ao clicar em concluir. Vamos incluir o botão para o usuário revalidar no caso de demembrar e ocorrencia."
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx) & [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
  1. **Configuração sem Bloqueio e Agendamento em Memória:**
     - As ações de **Ocorrência de Sobra** e **Desmembramento** são configuradas nos submodais correspondentes (`ModalOcorrenciaSobra` e `ModalDesmembrarItem`) diretamente integrados ao assistente, sem chamar a API do Sankhya de imediato nem forçar o fechamento do modal.
     - As configurações são salvas em memória nos estados `sobrasAgendadas`, `desmembramentosAgendados` e `itensRecontarN3`.
  2. **Destaque Verde e Botão de Revalidação / Alteração:**
     - **Cenário 1 (Sobra):** Se já configurada, o botão principal ganha destaque em verde esmeralda (`✓ Sobra Agendada: +X UN [Lote]`) e exibe o botão **`🔄 Revalidar Sobra`** para abrir o modal com os dados atuais e permitir ajustes finos antes do disparo final, além de botão `✕ Limpar` para desfazer.
     - **Cenário 2 (Desmembramento):** Se já configurado, o botão exibe **`✓ Desmembramento Agendado: X lotes definidos`** com destaque verde e o botão **`🔄 Revalidar Desmembramento`**, além de botão `✕ Limpar`.
     - **Ações Alternativas (Recontar N3):** Botão toggle **`🔍 Recontar em N3`** / **`✓ Agendado p/ N3 (Remover)`** com destaque verde sem execução prematura.
  3. **Resumo Geral e Execução Sequencial em Lote:**
     - A tela de resumo exibe card com o balanço de todas as ações agendadas (`📦 X Sobra(s)`, `✂️ Y Desmembramento(s)`, `🔍 Z Item(ns) N3`).
     - A tabela de resumo exibe tags dedicadas: `📦 Sobra (+X)`, `✂️ Desmembramento (X lotes)`, `🔍 N3 Agendado`.
     - Ao clicar em **`✓ Executar Decisões e Concluir Nota`**, a função `handleExecutarTudoEFinalizar` orquestra a sequência fiscal mandatória:
       1. Sobras físicas primeiro (abate de excedentes);
       2. Desmembramentos de itens no Sankhya ERP;
       3. Envio para recontagem N3;
       4. Aplicação das decisões fiscais restantes e conclusão da conferência.
     - Exibe barra de progresso em tempo real com descrição detalhada de cada etapa executada.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Inversão da Ordem dos Campos Fabricação e Validade no App Android

- **Demanda do Usuário:**
  - Inverter a posição dos campos `Validade` e `Fabricação` na barra de bipagem da Conferência de Entrada para a sequência natural: `Lote` -> `Fabricação` -> `Validade`.
- **Implementações Realizadas:**
  1. **Layout e DOM ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):**
     - O campo `Fabricação *` foi posicionado antes de `Validade *`, resultando na ordem visual: `Lote *` | `Fabricação *` | `Validade *`.
     - Ajustado o fluxo de foco e ditado por voz (`handleConfirmarDitadoCampo`): após confirmação do `Lote`, o foco/voz avança para `Fabricação`, e após `Fabricação` avança para `Validade`, finalizando no botão `Conferir`.
     - Atualizada a ordem de preenchimento automático após leitura de código de barras.
  2. **Modal de Ocorrências ([`ModalRegistrarOcorrencia.tsx`](./frontend/src/presentation/components/Recebimento/ModalRegistrarOcorrencia.tsx)):**
     - Alinhada a ordem dos inputs de data para `Fabricação *` antes de `Validade` mantendo total coerência com o fluxo operacional do conferente.
  3. **Builds e Deploy:**
     - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
     - Backend: `npm run build` compilado com sucesso (**exit code 0**).
     - Android: Sincronização via Capacitor (`npx cap sync android`) e compilação do APK de depuração (`gradlew assembleDebug` - BUILD SUCCESSFUL).
     - Deploy realizado via ADB no dispositivo conectado (`ZF523R6Q5Q`) com inicialização da aplicação.

---

## Atualização: Limpeza Visual no Resumo do Assistente (Remoção de "Adotado/Mantido" e Status com "✓")

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário enviou print da tela de resumo do assistente solicitando:
    - Remover os prefixos redundantes "ADOTADO" e "MANTIDO" na coluna *Decisão Adotada*.
    - Na coluna *Status*, remover o texto "Resolvido", deixando estritamente o símbolo `✓` em verde.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Coluna Decisão Adotada Simplificada:**
     - Exibição limpa e direta: `📱 Coletor`, `📄 ERP`, `⚖️ N3` e `⚖️ N2`.
     - Botões de seleção no passo a passo também simplificados: `📱 Coletor (Bipado)`, `📄 Nota Fiscal (ERP)`, `Reconferência (N3)`, `Coletor (N2)` e `Nota Fiscal (ERP)`.
  2. **Coluna Status Minimalista:**
     - Substituído o badge anterior com texto por apenas `✓` em verde esmeralda (`#15803d`) para itens concluídos, e `—` neutro para pendentes.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Destaque Verde de Decisões e Coluna no Resumo do Assistente

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário solicitou que, caso volte a um item já avaliado, o assistente destaque em verde a opção que foi selecionada para rápida conferência visual.
  - Solicitou também que a tela de resumo liste claramente a decisão adotada para cada item da nota fiscal.
- **Implementações Realizadas ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
  1. **Destaque Verde na Opção Selecionada:**
     - Quando o supervisor revisita um item (pelo botão anterior ou bolinha do stepper), a opção escolhida ganha:
       - Contorno em verde esmeralda: `border: 2px solid #16a34a`.
       - Fundo verde sutil e elegante: `background: #f0fdf4`.
       - Título em verde: `color: #15803d`.
       - Badge em destaque no canto superior: `✓ SELECIONADO` (`background: #dcfce7, color: #15803d`).
     - Aplicado tanto nos desempates N3 (`Adotar N3`, `Adotar N2`, `Manter ERP`) quanto nas divergências cadastrais (`Adotar Coletor (Bipado)` vs `Manter Nota Fiscal (ERP)`).
  2. **Coluna "Decisão Adotada" no Resumo Final:**
     - Adicionada coluna dedicada no balanço final da conferência antes de salvar:
       - Reconferência N3: `⚖️ Adotado N3`, `⚖️ Adotado N2` ou `📄 Mantido ERP`.
       - Divergência Cadastral: `📱 Adotado Coletor` ou `📄 Mantido ERP`.
       - Sobras: `📦 Sobra Deduzida (+X)` ou `📦 Sobra Pendente`.
       - Múltiplos Lotes: `✂️ Desmembrado` ou `✂️ Desmembramento Pendente`.
       - Conformes: `✓ Conforme Nota`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Correção de Exibição das Fotos dos Produtos no App Android (Mixed Content & Blob URL)

- **Demanda do Usuário:**
  - O operador reportou que no App Android a foto dos produtos não estava aparecendo na lista de produtos.
- **Diagnóstico com Chrome DevTools Remoto no Celular (`ZF523R6Q5Q`):**
  - Conectamos diretamente ao WebView do app Android via DevTools (`@webview_devtools_remote` na porta 9222).
  - O log do Blink/Chromium revelou o bloqueio exato:
    `[EVENT] Network.loadingFailed: {"blockedReason": "mixed-content"}`
  - **Causa Raiz:** O app mobile é carregado pelo Capacitor sob a origem segura `https://localhost`, enquanto o backend local roda em HTTP (`http://192.168.0.x:3001`). O motor Blink do WebView bloqueava ativamente as tags `<img>` convencionais apontando para HTTP, disparando `onError` e ocultando a imagem (`display: none`).
  - Em contrapartida, chamadas `fetch()` via JavaScript com CORS não eram bloqueadas pelo Mixed Content.
- **Solução Arquitetural Implementada:**
  1. **Configuração Nativa no Android ([`MainActivity.java`](./frontend/android/app/src/main/java/com/sankhya/confercheck/MainActivity.java)):**
     - Habilitado `settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW)` no `onCreate()` e no `onStart()`.
     - Habilitados `domStorageEnabled`, `databaseEnabled` e acessos de conteúdo local.
  2. **Componente Reativo com Cache e Blob URL ([`ProdutoImagem.tsx`](./frontend/src/presentation/components/common/ProdutoImagem.tsx)):**
     - Criado componente inteligente `ProdutoImagem` que busca os bytes da imagem via `fetch()` autenticado e gera um `Blob URL` seguro em memória (`blob:https://localhost/...`).
     - URLs blob originadas no app são 100% livres de restrições de Mixed Content.
     - Cache em memória (`blobUrlCache`) implementado por código de produto, evitando requisições duplicadas quando o produto aparece em múltiplos locais (tabela, cards, feedback popup, ocorrências).
     - Se o produto não tiver foto no Sankhya (404), oculta-se silenciosamente sem quebrar o layout.
  3. **Adoção nas Telas de Entrada e Saída:**
     - [`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx): Tabela desktop, cards mobile, conferidos e popup de feedback.
     - [`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx): Pendentes, conferidos e popup de feedback com preservação integral do CSS isolado da Saída.
     - [`ModalRegistrarOcorrencia.tsx`](./frontend/src/presentation/components/Recebimento/ModalRegistrarOcorrencia.tsx): Pré-visualização do produto na ocorrência.
  4. **Build e Instalação no Dispositivo:**
     - Compilação do frontend (`npm run build`) e sincronização Capacitor (`npx cap sync android`).
     - Compilação Gradle (`assembleDebug`) com sucesso.
     - Instalação remota (`adb install -r`) efetuada com sucesso no celular conectado (`ZF523R6Q5Q`).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Redesign Slate Corporativo e Mapeamento de Regras do Assistente

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário solicitou esclarecimento sobre o funcionamento das regras de resolução e o ciclo de persistência do Assistente de Divergências.
  - Apontou que a interface continha excesso de cores primárias saturadas ("parece um arco-íris") e escolheu a **Paleta Slate Corporativa** (tons neutros, elegantes e profissionais).
- **Mapeamento de Regras & Persistência do Assistente:**
  1. **Precedência Fiscal Sankhya:**
     - `1º Sobras Físicas (+X)`: Ocorrência gerada imediatamente via API com dedução do saldo excedente. Bloqueia o desmembramento até a regularização da sobra para não travar o Sankhya.
     - `2º Múltiplos Lotes / Faltas`: Executa o desmembramento da `TGFITE` diretamente no ERP Sankhya.
     - `3º Desempates N3 (Reconferência)`: Adoção em bloco de 1 clique do pacote integral do nível (`N3`, `N2` ou `ERP`) sem misturar frações de conferências concorrentes.
     - `4º Divergências Cadastrais (Lote/Validade)`: Escolha rápida (`📱 Coletor` vs `📄 ERP`).
  2. **Persistência das Decisões:**
     - Ações físicas (sobra e desmembramento) gravam em tempo real no banco do Sankhya.
     - Decisões fiscais (lote/validade/nível) são armazenadas no estado da conferência e persistem definitivamente com protocolo e justificativa gerencial ao clicar em `✓ Salvar e Concluir Decisões da Nota` (ou `Resolver Divergência`).
- **Implementações Visuais (Paleta Slate Corporativa):**
  1. **Remoção de Fundos Saturados ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Substituição dos blocos coloridos (amarelos, azuis e vermelhos) por cards limpos em branco e cinza suave (`#ffffff`, `#f8fafc`, `#e2e8f0`).
     - Tipografia sóbria em ardósia escuro (`#0f172a`) e cinza médio (`#475569`, `#64748b`).
  2. **Stepper Monocromático Elegante:**
     - Bolinhas dos passos simplificadas: `#0f172a` para o item atual, `#f8fafc` com contorno suave e check discreto `#15803d` para itens resolvidos, e `#ffffff` com borda cinza para pendentes.
     - Barra de progresso discreta em ardósia escuro sobre trilho `#e2e8f0`.
  3. **Botões de Ação Padronizados:**
     - Botões principais no tom escuro corporativo (`#0f172a`), botões secundários neutros com borda sutil `#cbd5e1`.
     - Botão `🧙 Iniciar Assistente` na [`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx) alinhado ao padrão escuro corporativo.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Identificação Visual de Multi-Sequências e Desmembramentos em Divergências

- **Demanda do Usuário & Diagnóstico (`/grill-me`):**
  - O supervisor relatou que na Nota Fiscal `22130` o produto `10541` apareceu duas vezes na lista de divergências e suspeitou de um bug de duplicação.
  - O diagnóstico no banco de dados Sankhya (`TGFITE`) comprovou que a nota continha 2 sequências faturadas distintas para o mesmo código de produto:
    - `Sequência 1`: 60 UN com Lote `231564897`
    - `Sequência 3`: 60 UN com Lote `123456`
  - A impressão de bug ocorria porque a coluna de produto não exibia a sequência faturada (`TGFITE.SEQUENCIA`) nem o lote de origem, gerando duas linhas visualmente idênticas para o usuário.
- **Implementações Realizadas:**
  1. **Tabela Desktop e Cards Mobile ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - Exibição explícita da sequência (`Seq: X`) e do lote faturado na nota fiscal (`• Lote NF: ...`).
     - Badge inteligente em destaque: `📑 Multi-Item na NF (Seq. X)` renderizado automaticamente quando o mesmo produto possuir mais de uma sequência faturada na nota.
  2. **Assistente Passo a Passo ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - Cabeçalho do produto exibe o badge `📑 Multi-Item na NF (Seq. X)`, sequência e lote original faturado.
     - Bloco de faturado explicita a sequência sendo analisada (`Faturado (Seq. X)`).
     - Card de diagnóstico inteligente adiciona aviso educativo esclarecendo que o produto possui múltiplas sequências na nota fiscal (ex: frações de lote faturados pelo fornecedor ou desmembramentos) e qual sequência e lote estão sendo decididos.
     - Tabela do resumo final também identifica a sequência e sinaliza `(Multi-Item)`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Resolução Dinâmica de Fotos de Produtos no Aplicativo Mobile (Capacitor)

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário relatou que na lista de produtos do aplicativo mobile (.APK) as fotos dos produtos não estavam aparecendo, enquanto na versão web desktop eram exibidas normalmente.
  - Alinhado com o usuário:
    - Aplicar a correção em todas as telas operacionais (Conferência de Entrada, Conferência de Saída, Feedback de Bipagem e Ocorrências).
    - Preservar o fallback de ocultar a foto (`onError -> display: none`) quando o produto não tiver imagem cadastrada no ERP Sankhya.
- **Diagnóstico:**
  - O aplicativo mobile roda dentro de um WebView do Capacitor com origem local (`https://localhost`).
  - As tags `<img src="/api/crud/produto/${codProd}/imagem" />` usavam caminhos relativos ao host atual. No navegador desktop, o Vite realizava o proxy transparente para o backend na porta 3001; já no aplicativo mobile, o WebView tentava buscar o arquivo no pacote local do app (`https://localhost/api/...`), resultando em erro 404 e acionando o `onError` que ocultava a imagem.
- **Implementações Realizadas:**
  1. **Helper Universal de URL de Imagem ([`httpClient.ts`](./frontend/src/infrastructure/api/httpClient.ts)):**
     - Criada a função `getProdutoImagemUrl(codProd)` que anexa automaticamente a URL dinâmica do backend (`getServerBaseUrl()`, ex: `http://192.168.0.94:3001`) quando executado no app mobile, ou mantém caminho relativo quando no navegador desktop sem URL customizada.
  2. **Atualização nas Telas Operacionais:**
     - **Conferência de Saída ([`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx)):** Tabela desktop, cards mobile, tabs pendentes/conferidos, feedback visual de bipagem e modal de zoom.
     - **Conferência de Entrada ([`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)):** Tabela desktop, cards mobile, itens conferidos, feedback visual e modal de zoom.
     - **Registro de Ocorrências ([`ModalRegistrarOcorrencia.tsx`](./frontend/src/presentation/components/Recebimento/ModalRegistrarOcorrencia.tsx)):** Miniaturas de itens e popup de catálogo.
- **Validação de Builds e Deploy:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - APK: Gerado com sucesso via Gradle (`BUILD SUCCESSFUL in 44s`) e instalado no celular conectado (`ZF523R6Q5Q`).

---

## Atualização: Assistente Passo a Passo (Wizard) de Resolução de Divergências

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O supervisor relatou alta sobrecarga cognitiva ao analisar divergências em tabelas extensas (com 12 colunas e múltiplos problemas misturados: sobras, faltas, múltiplos lotes, divergências cadastrais e desempates N3).
  - Foi alinhada a criação de um **Assistente Passo a Passo (Wizard)** focado e intuitivo para resolver divergências item a item.
- **Implementações Realizadas:**
  1. **Componente do Assistente ([`ModalAssistenteDivergencias.tsx`](./frontend/src/presentation/components/Recebimento/ModalAssistenteDivergencias.tsx)):**
     - **Priorização inteligente dos itens**: Sobras físicas (`diferenca > 0`) aparecem primeiro (precedência obrigatória para não travar o Sankhya), seguidas de múltiplos lotes/faltas, desempates N3 e divergências cadastrais (lote/validade).
     - **Diagnóstico automático em destaque**: Card explicativo do que gerou a divergência em linguagem operacional clara.
     - **Ação recomendada em destaque**:
       - *Sobra Física*: Botão direto `📦 Gerar Ocorrência de Sobra` com bloqueio educativo do desmembramento até abater o excedente.
       - *Múltiplos Lotes / Faltas*: Botão direto `✂️ Desmembrar Item no Sankhya`.
       - *Desempate N3*: 3 blocos comparativos de 1 clique (`Adotar Reconferência N3`, `Adotar Coletor N2`, `Manter Nota Fiscal ERP`).
       - *Divergência Cadastral*: Botões rápidos (`📱 Adotar Coletor` vs `📄 Manter Nota ERP`) com avanço automático.
     - **Navegação e Flexibilidade**:
       - Stepper com bolinhas coloridas numeradas e barra de progresso em tempo real.
       - Botão `↷ Pular Item (Revisar depois)` e navegação `← Anterior` / `Próximo →`.
       - Tela de **Resumo Final** com checklist de todos os itens e botão de conclusão da conferência.
  2. **Integração na Tela de Gestão ([`AbaDivergenciasView.tsx`](./frontend/src/presentation/components/Recebimento/AbaDivergenciasView.tsx)):**
     - Botão `🧙 Iniciar Assistente` adicionado no topo da barra de itens de cada nota fiscal divergente e também na barra inferior de ações.
     - Submodais existentes (`ModalOcorrenciaSobra`, `ModalDesmembrarItem`, etc.) abrem suavemente sobre o assistente sem conflito de `z-index`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Restrição do Botão de Configuração de Servidor Exclusivamente para Android

- **Demanda do Usuário:**
  - O botão de engrenagem para configuração de URL do backend deve aparecer estritamente no aplicativo Android (Capacitor), ficando oculto no navegador web desktop.
- **Implementações Realizadas:**
  1. **Restrição por Plataforma Nativa ([`Login.tsx`](./frontend/src/presentation/pages/Login.tsx)):**
     - Integrado `Capacitor.isNativePlatform()` de `@capacitor/core`.
     - O botão de engrenagem e o modal de configuração agora só são renderizados quando `isNative` for verdadeiro.
     - No navegador web desktop convencional, a interface permanece 100% limpa, sem o ícone da engrenagem.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

---

## Atualização: Novo Ícone do Conferente e Nova Splash Screen do Aplicativo Android

- **Demanda do Usuário:**
  - Substituição do ícone padrão do Capacitor (azul) na tela inicial do dispositivo e no splash screen pela ilustração oficial de conferência (conferente com prancheta e carrinho com caixas).
- **Implementações Realizadas:**
  1. **Geração de Ícones Adaptativos e Padrão (Android `mipmap-*`):**
     - Atualizado `ic_launcher_background.xml` para a cor de fundo oficial `#0f172a` (azul ardósia da marca ConferCheck).
     - Gerados os ícones de primeiro plano adaptativos (`ic_launcher_foreground.png`) com a ilustração centralizada e dimensionada na *safe zone* circular (sem cortes de borda).
     - Gerados ícones legados quadrados (`ic_launcher.png`) e redondos com antialiasing (`ic_launcher_round.png`) em todas as densidades:
       - `mdpi` (48x48 / 108x108)
       - `hdpi` (72x72 / 162x162)
       - `xhdpi` (96x96 / 216x216)
       - `xxhdpi` (144x144 / 324x324)
       - `xxxhdpi` (192x192 / 432x432)
  2. **Geração da Nova Splash Screen (Android `drawable-*`):**
     - Substituído o splash screen padrão do Capacitor em todas as orientações e densidades (`drawable`, `drawable-port-*`, `drawable-land-*` de `mdpi` a `xxxhdpi`) com fundo `#0f172a` e a ilustração oficial centralizada.
  3. **Otimização de Build Gradle & Deploy Multi-Dispositivo:**
     - Ajustado `org.gradle.jvmargs=-Xmx1024m -XX:+UseG1GC` para estabilidade de memória física no ambiente Windows.
     - Compilação via Gradle (`assembleDebug` - BUILD SUCCESSFUL in 28s).
     - Instalação e deploy direto tanto no smartphone (`ZF523R6Q5Q`) quanto no tablet (`R9XN701XGAE`).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - APK: Instalado e executado com sucesso no tablet (`R9XN701XGAE`) e no smartphone (`ZF523R6Q5Q`).

---

## Atualização: Limpeza do Modal de Configuração de Servidor e Deploy Final

- **Demanda do Usuário:**
  - Remoção dos botões de atalho temporários ("Backend Direto" e "Vite HTTPS") do modal de configuração de servidor, mantendo a interface limpa e o placeholder indicativo da porta 3001.
- **Implementações Realizadas:**
  1. **Interface Limpa no Modal ([`Login.tsx`](./frontend/src/presentation/pages/Login.tsx)):**
     - Removidos os botões temporários de seleção.
     - Campo de texto mantido com placeholder ilustrativo `http://192.168.0.94:3001`.
  2. **Build e Deploy:**
     - Sincronização dos assets via `mobile:build`.
     - Compilação via Gradle e instalação da versão final atualizada no celular conectado (`ZF523R6Q5Q`).
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - APK: Instalado com sucesso no celular.

---

## Atualização: Diagnóstico Visual de Rede, Atalhos de Conexão Rápida e Suporte a Backend Direto HTTP/HTTPS no App Mobile

- **Demanda do Usuário:**
  - O aplicativo no celular continuava informando "Servidor indisponível" na tentativa de login.
- **Diagnóstico:**
  - Quando a URL de servidor não era salva ou falhava na camada de rede (ex: tentar porta incorreta ou certificado SSL não sincronizado no domínio exato), a mensagem de erro genérica não informava qual URL nem o código de erro retornado.
  - O proxy do Vite (`vite.config.ts`) não incluía a rota `/health`, causando respostas inconsistentes nos testes de conexão pela porta 5173.
  - Para ambientes móveis em rede Wi-Fi local, a comunicação direta com o backend Node.js (`http://192.168.0.94:3001`) é mais estável e rápida por não depender de túneis HTTPS nem Vite dev server.
- **Implementações Realizadas:**
  1. **Diagnóstico Técnico de Erro na Tela ([`httpClient.ts`](./frontend/src/infrastructure/api/httpClient.ts) e [`erros.ts`](./frontend/src/domain/erros.ts)):**
     - O interceptor agora anexa o código de erro exato (`ERR_CONNECTION_REFUSED`, `ERR_CERT_AUTHORITY_INVALID`, etc.) e a URL de destino tentada na mensagem de erro.
     - Logs completos adicionados no console com prefixo `[httpClient] [REQ]`, `[RES]` e `[ERR]`.
  2. **Atalhos Rápidos de Conexão no Modal ([`Login.tsx`](./frontend/src/presentation/pages/Login.tsx)):**
     - Adicionados botões de 1 clique no modal de configuração de servidor:
       - `⚡ Backend Direto (3001)`: aponta para `http://192.168.0.94:3001`.
       - `🔒 Vite HTTPS (5173)`: aponta para `https://192.168.0.94:5173`.
  3. **Configuração de Domínios e Debug Overrides no Android ([`network_security_config.xml`](./frontend/android/app/src/main/res/xml/network_security_config.xml)):**
     - Incluídos `<domain-config>` e `<debug-overrides>` mapeando explicitamente os IPs da rede (`192.168.0.94`, `192.168.0.92`, `localhost`) com `@raw/rootca` e `cleartextTrafficPermitted="true"`.
  4. **Suporte a `/health` no Vite Proxy ([`vite.config.ts`](./frontend/vite.config.ts)):**
     - Rota `/health` mapeada para o backend Express na porta 3001.
  5. **Depuração e Logs de Console do WebView no Logcat ([`MainActivity.java`](./frontend/android/app/src/main/java/com/sankhya/confercheck/MainActivity.java)):**
     - Ativado `setWebContentsDebuggingEnabled(true)` e interceptor de mensagens JavaScript com `onConsoleMessage -> ConferCheckJS`.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - APK: Compilado via Gradle (`BUILD SUCCESSFUL in 28s`), instalado e iniciado no celular `ZF523R6Q5Q`.

---

## Atualização: Certificado Raiz Local Integrado no APK e Instalação no Celular Android

- **Demanda do Usuário:**
  - Ao tentar efetuar login no aplicativo no celular conectado, o sistema informava "servidor indisponível" mesmo após o teste de conexão.
- **Diagnóstico:**
  - O celular não possuía a autoridade certificadora raiz interna (`mkcert`) instalada na lista de credenciais do usuário Android (diferente do tablet).
  - Como as chamadas XHR/fetch do Chromium WebView utilizam sockets BoringSSL diretos no Android, ocorria `net_error -202 (CertPathValidatorException: Trust anchor for certification path not found)`.
  - Além disso, o interceptor de requisições do Axios no frontend possuía condicional que mantinha a URL padrão se `config.baseURL` já existisse.
- **Implementações Realizadas:**
  1. **Certificado CA Embutido no App ([`network_security_config.xml`](./frontend/android/app/src/main/res/xml/network_security_config.xml) e [`rootca.crt`](./frontend/android/app/src/main/res/raw/rootca.crt)):**
     - O certificado raiz da autoridade de desenvolvimento local foi exportado e copiado diretamente para `frontend/android/app/src/main/res/raw/rootca.crt`.
     - O arquivo `network_security_config.xml` foi configurado com `<certificates src="@raw/rootca" />`, fazendo com que qualquer dispositivo Android (celular, tablet ou coletor) confie nativamente nas conexões HTTPS internas do servidor, sem necessidade de intervenção manual do usuário no Android.
  2. **Garantia de URL Dinâmica no Axios ([`httpClient.ts`](./frontend/src/infrastructure/api/httpClient.ts)):**
     - Ajustado o interceptor de requisição para garantir que qualquer chamada utilize dinamicamente o servidor configurado pelo usuário na engrenagem da tela de login.
  3. **Build e Deploy no Celular:**
     - Sincronização dos assets web (`npm run mobile:build`).
     - Compilação do APK nativo via Gradle (`assembleDebug` - BUILD SUCCESSFUL).
     - Instalação e execução com sucesso no celular conectado (`ZF523R6Q5Q`) via ADB.
- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - APK: Instalado e iniciado com sucesso no dispositivo `ZF523R6Q5Q`.

---

## Atualização: Correção de Tela em Branco no Android, Suporte HTTPS e Ativação do Microfone/Ditado de Lote por Voz

- **Demanda do Usuário:**
  - O aplicativo abriu com tela em branco no tablet.
  - O usuário relatou que a conexão do ambiente é HTTPS, o backend estava no ar, mas o app apresentava "Servidor indisponível".
  - A função de falar lote, validade e fabricação (reconhecimento e síntese de voz) não estava funcionando.

- **Diagnóstico:**
  1. **Tela em Branco:** Exceção não tratada capturada via `adb logcat`: `SyntaxError: "undefined" is not valid JSON` no `AuthContext.tsx` devido a valores residuais `"undefined"` salvos como string no `localStorage`.
  2. **Servidor Indisponível em HTTPS:** O WebView do Android bloqueia certificados autoassinados da rede local (`mkcert`) e o backend BFF Express tinha CORS restrito apenas para `http://localhost:5173`, rejeitando o `Origin: https://localhost` do app Capacitor.
  3. **Microfone e Ditado por Voz Bloqueados:** Logcat apontava `bind to recognition service failed` e `not-allowed`. No Android 11+, apps precisam declarar explicitamente a visibilidade de pacotes (`<queries>` para `android.speech.RecognitionService`) e o WebView precisa de `WebChromeClient.onPermissionRequest` para conceder a captura de áudio da Web Speech API.

- **Implementações Realizadas:**
  1. **Blindagem contra `JSON.parse` Corrompido ([`AuthContext.tsx`](./frontend/src/application/contexts/AuthContext.tsx), [`AuthApiService.ts`](./frontend/src/infrastructure/api/AuthApiService.ts), [`ListaConferencias.tsx`](./frontend/src/presentation/pages/ListaConferencias.tsx), [`useConferenciaAtiva.ts`](./frontend/src/application/hooks/useConferenciaAtiva.ts), [`GestaoRecebimento.tsx`](./frontend/src/presentation/pages/GestaoRecebimento.tsx)):**
     - Todas as leituras de `localStorage` e `sessionStorage` agora validam valores nulos, `"undefined"` e `"null"` com blocos `try/catch`, impedindo que exceções quebrem a montagem inicial do React.
  2. **Conexão HTTPS Local Desimpedida ([`MainActivity.java`](./frontend/android/app/src/main/java/com/sankhya/confercheck/MainActivity.java) e [`network_security_config.xml`](./frontend/android/app/src/main/res/xml/network_security_config.xml)):**
     - Implementado `BridgeWebViewClient` com `onReceivedSslError -> handler.proceed()` para aceitar certificados locais `mkcert`.
     - Criado `network_security_config.xml` com `<certificates src="user" />` e `cleartextTrafficPermitted="true"`.
  3. **CORS Aberto para Dispositivos Móveis ([`server.ts`](./backend/src/presentation/server.ts)):**
     - Express CORS atualizado para `app.use(cors({ origin: true, credentials: true }))`.
  4. **Ativação Completa de Microfone, Ditado e Síntese de Voz ([`AndroidManifest.xml`](./frontend/android/app/src/main/AndroidManifest.xml), [`MainActivity.java`](./frontend/android/app/src/main/java/com/sankhya/confercheck/MainActivity.java) e [`alertas.ts`](./frontend/src/infrastructure/audio/alertas.ts)):**
     - Inseridas permissões `android.permission.RECORD_AUDIO` e `android.permission.MODIFY_AUDIO_SETTINGS` no manifesto.
     - Adicionada cláusula `<queries>` no manifesto declarando visibilidade para `android.speech.RecognitionService` e pacote do Google App (`com.google.android.googlequicksearchbox`), eliminando a falha `bind to recognition service failed`.
     - Implementado `BridgeWebChromeClient` com `onPermissionRequest -> request.grant(request.getResources())` em `MainActivity.java` para que o Chromium WebView conceda o microfone à Web Speech API.
     - `MainActivity.java` configurado para solicitar permissão em tempo de execução no Android (`RECORD_AUDIO: granted=true`).
     - Adicionado `sintese.resume()` em `alertas.ts` para evitar que a síntese de voz trave no Android WebView.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).
  - APK: Compilado (`BUILD SUCCESSFUL`) e instalado com sucesso via ADB tanto no tablet (`R9XN701XGAE`) quanto no smartphone (`ZF523R6Q5Q`), com permissões ativas.

---

## Atualização: Transformação Mobile Nativa (Android/APK via Capacitor), Laser-First e Ergonomia para Coletores

- **Demanda do Usuário & Alinhamento (`/grill-me`):**
  - O usuário relatou que a usabilidade em celulares e tablets estava prejudicada com layout desktop tradicional e questionou como transformar o sistema em algo mobile dedicado.
  - Através do processo de alinhamento `/grill-me`, definimos:
    - **Público e Telas:** Foco prioritário nos conferentes em chão de fábrica/doca ([`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx) e [`ConferenciaEntradaPage.tsx`](./frontend/src/presentation/pages/ConferenciaEntradaPage.tsx)).
    - **Dispositivos:** Coletores de dados industriais (Zebra/Honeywell com leitor laser) e tablets/smartphones touch.
    - **Formato:** Aplicativo nativo Android (.APK instalado) gerado via **Capacitor**.
    - **Ergonomia & Bipagem:** Prioridade 100% no leitor laser físico (câmera desativada/oculta no fluxo mobile), supressão inteligente do teclado virtual do Android para não cobrir a tela, barra de bipagem fixa inferior (*thumb-zone*), sons distintos de confirmação/erro e vibração háptica.
    - **Resiliência:** Buffer offline de bipagens para tolerância a áreas de sombra de Wi-Fi no depósito.
    - **Flexibilidade de Rede:** Configuração interativa do IP/porta do servidor backend diretamente pela tela de login do app.

- **Implementações Realizadas:**
  1. **Configuração Dinâmica de Servidor Backend ([`httpClient.ts`](./frontend/src/infrastructure/api/httpClient.ts) e [`Login.tsx`](./frontend/src/presentation/pages/Login.tsx)):**
     - Adicionado suporte a `getServerBaseUrl()` e `setServerBaseUrl()`, permitindo definir e persistir dinamicamente a URL do backend no app instalado via `localStorage.getItem('CONFERCHECK_SERVER_URL')`.
     - Inserido botão de engrenagem na tela de login que abre modal amigável para configurar o IP do servidor (ex: `http://192.168.1.50:3000`) com botão "Testar Conexão" que consulta o endpoint `/health` e salva a configuração.
  2. **Buffer Offline para Tolerância a Quedas de Wi-Fi ([`offlineQueue.ts`](./frontend/src/infrastructure/offline/offlineQueue.ts)):**
     - Criado serviço de fila local em `localStorage` com detecção de conectividade (`navigator.onLine`, eventos `online`/`offline`).
     - Badge visual compacto (`📶 X bips offline`) inserido nos cabeçalhos de conferência para tranquilizar o conferente durante oscilações de sinal.
  3. **Ergonomia Laser-First & Supressão do Teclado Virtual no Coletor ([`ConferenciaProdutos.tsx`](./frontend/src/presentation/pages/ConferenciaProdutos.tsx)):**
     - Integrado estado `isDispositivoMovel` e `tecladoVirtualAtivo` com `inputMode={isDispositivoMovel ? (tecladoVirtualAtivo ? 'text' : 'none') : undefined}`.
     - Quando o operador bipar com o leitor laser do coletor, o teclado virtual do Android não sobe cobrindo os itens da tela.
     - Botão ergonômico com ícone de teclado (`⌨️`) inserido na barra de bipagem para alternar para modo digitação manual quando necessário.
  4. **Barra de Bipagem Inferior (*Thumb-Zone*) na Saída ([`ConferenciaProdutos.css`](./frontend/src/presentation/pages/ConferenciaProdutos.css)):**
     - Em telas móveis (`@media (max-width: 768px)`), a barra `.scanner-saida-card` é fixada no rodapé da viewport, ao alcance direto dos polegares, com compensação de padding no container principal (`padding-bottom: 95px`) para não sobrepor o último item da lista.
     - Mantido 100% o isolamento CSS com prefixo `.scanner-saida-*` sem alterar regras da entrada ou globais.
  5. **Setup do Projeto Android Nativo com Capacitor:**
     - Instalado `@capacitor/android@^6.1.0`.
     - Plataforma Android inicializada (`npx cap add android`) gerando a pasta nativa [`frontend/android`](./frontend/android).
     - Configurado [`AndroidManifest.xml`](./frontend/android/app/src/main/AndroidManifest.xml) com `android:usesCleartextTraffic="true"` (essencial para comunicação HTTP com o servidor local da rede), permissão `android.permission.VIBRATE` para feedback háptico e `android:windowSoftInputMode="adjustResize"`.
     - Sincronização e empacotamento validados via script `npm run mobile:build`.

- **Validação de Builds Obrigatória:**
  - Frontend: `npm run build` compilado com sucesso (**exit code 0**).
  - Backend: `npm run build` compilado com sucesso (**exit code 0**).

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


