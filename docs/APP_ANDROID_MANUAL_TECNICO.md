# Manual Técnico e Arquitetura - Aplicativo Android (ConferCheck)

Este documento registra a arquitetura, configurações nativas, fluxo de conectividade, carregamento de imagens e procedimentos de compilação/instalação do aplicativo Android do **ConferCheck**.

---

## 📱 1. Visão Geral da Arquitetura Mobile

O aplicativo Android do ConferCheck é construído com **Capacitor**, integrando o frontend React (Vite + TypeScript) com a camada nativa do Android (Java / Android SDK):

- **App ID:** `com.sankhya.confercheck`
- **Nome do App:** `ConferCheck`
- **Plataforma:** Android 8.0+ (API Level 26+)
- **Ambiente de Execução:** WebView Chromium com WebContentsDebugging habilitado.

---

## 🌐 2. Conectividade e Configuração Dinâmica de Servidor

### 2.1. Descoberta e Apontamento do Backend
Coletores de dados móveis e tablets operam em rede Wi-Fi local e precisam apontar dinamicamente para o servidor backend da intranet sem necessidade de recompilar o APK:

1. **Restrição de Plataforma (`Capacitor.isNativePlatform()`):**
   - Na tela de login ([`Login.tsx`](../frontend/src/presentation/pages/Login.tsx)), o botão de configuração de URL do backend (`⚙️`) é renderizado **estritamente em dispositivos móveis nativos**.
   - No navegador web desktop, o botão fica oculto, utilizando o proxy padrão do Vite/Nginx.

2. **Armazenamento e Injeção Dinâmica:**
   - A URL configurada é salva no `localStorage` sob a chave `CONFERCHECK_SERVER_URL` (ex: `http://192.168.0.94:3001`).
   - O interceptor do Axios em [`httpClient.ts`](../frontend/src/infrastructure/api/httpClient.ts) injeta automaticamente essa base URL em todas as chamadas HTTP/REST.

3. **Validação de Conexão em Tempo Real:**
   - O modal de configuração possui botão "Testar Conexão", que dispara um `fetch()` para o endpoint `/health` com timeout de 6 segundos, alertando visualmente se o servidor está alcançável antes do conferente tentar o login.

---

## 🖼️ 3. Solução de Imagens e Fotos de Produtos (Mixed Content & Blob URLs)

### 3.1. Causa do Bloqueio de Imagens
- Por padrão de segurança do Capacitor, o aplicativo roda sob a origem segura `https://localhost`.
- O backend na rede local roda sob HTTP (`http://192.168.0.x:3001`).
- O motor Chromium do Android aplica a política de segurança **Mixed Content**:
  `[EVENT] Network.loadingFailed: { "blockedReason": "mixed-content" }`
  Isso bloqueava imediatamente tags `<img>` comuns que apontavam para URLs HTTP absolutas, disparando `onError` e ocultando a imagem.

### 3.2. Solução Implementada em 2 Níveis

#### Nível 1: Ajuste Nativo no WebView ([`MainActivity.java`](../frontend/android/app/src/main/java/com/sankhya/confercheck/MainActivity.java))
No ciclo de vida da Activity (`onCreate` e `onStart`):
```java
WebView webView = bridge.getWebView();
WebSettings settings = webView.getSettings();

// Permite carregar recursos HTTP locais a partir da origem HTTPS do app
settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
settings.setDomStorageEnabled(true);
settings.setDatabaseEnabled(true);
settings.setAllowFileAccess(true);
settings.setAllowContentAccess(true);
```

#### Nível 2: Componente Reativo com Cache e Blob URL ([`ProdutoImagem.tsx`](../frontend/src/presentation/components/common/ProdutoImagem.tsx))
Para contornar o bloqueio de forma 100% resiliente:
1. Em vez de injetar a URL HTTP diretamente no `src` da tag `<img>`, a função `carregarBlobImagemProduto()` faz uma requisição `fetch()` com CORS.
2. Os bytes binários recebidos são transformados em um **Blob URL seguro em memória**:
   `blob:https://localhost/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. Como a URL `blob:` pertence à mesma origem HTTPS do app, o Chromium a renderiza instantaneamente sem nenhuma restrição de Mixed Content.
4. **Cache em Memória (`blobUrlCache`):** Armazena o blob URL por código de produto. Quando o mesmo produto aparece em múltiplos locais (lista, cards, modal de ampliação ou feedback popup), o download ocorre apenas uma única vez.
5. Se o produto não possuir imagem cadastrada no Sankhya (retorno 404), o componente não renderiza nada, mantendo o layout limpo.

---

## 🔍 4. Expansão de Foto (Zoom / Modal de Imagem)

Ao tocar na miniatura da foto na Conferência de Entrada ou de Saída:
- A foto em alta resolução é exibida em um modal responsivo centralizado.
- Contém limite de altura (`max-height: 70vh`) e proporção preservada (`object-fit: contain`).
- Pode ser fechado pelo botão **Fechar** ou tocando em qualquer parte do fundo escurecido (backdrop).

---

## 🎨 5. Identidade Visual e Recursos Nativos

- **Ícone do Aplicativo:**
  - Ícone corporativo do conferente com palete slate/laranja configurado em todas as densidades: `mipmap-mdpi`, `hdpi`, `xhdpi`, `xxhdpi` e `xxxhdpi`.
- **Splash Screen:**
  - Tela de inicialização personalizada com o logo oficial da aplicação.
- **Permissões Nativas:**
  - Câmera para leitura de código de barras: `android.permission.CAMERA`.
  - Áudio para ditado de voz: `android.permission.RECORD_AUDIO`.
  - Tráfego HTTP local liberado via [`network_security_config.xml`](../frontend/android/app/src/main/res/xml/network_security_config.xml).

---

## 🚀 6. Comandos de Compilação e Deploy

> [!IMPORTANT]
> **Regra Mandatória:** Nunca fazer `git commit` ou `git push`. Apenas compilar e instalar nos dispositivos.

### 6.1. Build do Frontend e Sincronização
```powershell
npm run build --prefix frontend
cd frontend
npx cap sync android
```

### 6.2. Compilação do APK Android
```powershell
cd frontend/android
./gradlew assembleDebug
```
*O APK gerado fica localizado em: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`*

### 6.3. Instalação no Dispositivo via ADB
```powershell
# Listar dispositivos conectados
adb devices

# Instalar no dispositivo (substitua o serial se houver mais de um)
adb -s <DEVICE_ID> install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk

# Iniciar o aplicativo diretamente
adb -s <DEVICE_ID> shell am start -n com.sankhya.confercheck/.MainActivity
```
