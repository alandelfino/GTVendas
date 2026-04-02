# 🔔 Guia: Ativação de Push Notifications (FCM) no App GT Vendas

Este documento descreve como integrar o **Firebase Cloud Messaging (FCM)** do Google com o ecossistema **Expo** para o **Grupo Titanium Jeans**. O app usará o serviço nativo do Expo para rotear as mensagens do Firebase para as mãos dos representantes.

---

## 1. Configuração Inicial no Firebase (Google Console)

1. Acesse o **[Firebase Console](https://console.firebase.google.com/)**.
2. Crie ou selecione o projeto **GT Vendas**.
3. **Adicionar App Android**:
   - Pacote (Package Name): `com.alandelfino.gtvendas` (ou o que estiver no seu `app.json`).
   - Baixe o arquivo `google-services.json`.
4. **Adicionar App iOS**:
   - ID do Pacote (Bundle ID): `com.alandelfino.gtvendas`.
   - Baixe o arquivo `GoogleService-Info.plist`.

---

## 2. Configuração no Projeto Expo (`app.json`)

Você deve colocar os arquivos baixados na raiz do seu projeto e apontá-los no seu manifesto `app.json` (ou `app.config.ts`):

```json
{
  "expo": {
    "name": "GT Vendas",
    "slug": "gt-vendas",
    "version": "1.0.0",
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.alandelfino.gtvendas"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.alandelfino.gtvendas"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#007AFF"
        }
      ]
    ]
  }
}
```

---

## 3. Instalação de Dependências

Para capturar e gerenciar as notificações no frontend, o **Grupo Titanium** deve usar a biblioteca oficial:

```bash
npx expo install expo-notifications expo-device expo-constants
```

---

## 4. Captura do Token (Código Frontend)

Crie um novo hook ou serviço (ex: `services/NotificationService.ts`) para solicitar permissão e pegar o token do representante comercial.

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Falha ao obter permissão para notificações push!');
      return;
    }

    // Pega o token do Expo (que roteia para o FCM)
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    console.log("Seu Token de Push:", token);
  } else {
    alert('Notificações físicas exigem um dispositivo real (Android/iOS).');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
```

**Uso Recomendado**: Chame esta função logo após o login no app e envie o `token` resultante para o seu endpoint: `POST /api/mobile/save-push-token`.

---

## 5. Vinculando sua Chave do Firebase ao Expo (EAS)

O Expo precisa da sua "FCM Server Key" (ou arquivo JSON de conta de serviço) para poder enviar mensagens ao Google em seu nome.

1. No painel do Firebase, vá em **Configurações do Projeto > Cloud Messaging**.
2. Ative a **API Cloud Messaging (Legada)** ou gere uma **Conta de Serviço (Recomendado)**.
3. No terminal do seu projeto GT Vendas, rode:
   ```bash
   eas credentials
   ```
4. Siga as instruções para configurar as "Push Notifications" e faça o upload do seu arquivo JSON de Conta de Serviço do Google Cloud.

---

## 6. Como Disparar do Backend (Exemplo Node.js)

Para notificar o representante sobre uma nova venda ou mensagem do assistente, o seu backend deve fazer um POST para o serviço de push do Expo:

```javascript
// Exemplo usando axios no backend
const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
};
```

---

## 7. Checklist de Produção 🚀

- [ ] Firebase Project criado e configurado.
- [ ] `google-services.json` e `GoogleService-Info.plist` baixados e linkados no `app.json`.
- [ ] Credenciais enviadas para o Expo via `eas credentials`.
- [ ] Token de push sendo salvo no banco de dados do representante ao logar.
- [ ] Backend preparado para disparar para a URL `https://exp.host/--/api/v2/push/send`.
- [ ] Testar em **dispositivo físico** (o simulador de iOS não recebe notificações, e o de Android exige o Google Play Services atualizado).

O **Grupo Titanium** agora está pronto para manter a comunicação em tempo real! 🔔🚀💎
