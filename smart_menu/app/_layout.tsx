import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { mapSessionToUser } from '@/lib/utils';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, requestWebNotificationPermission } from '@/lib/notifications';

// "Monkey Patch" no Alert para funcionar lindamente na Web/Expo Browser
const originalAlert = Alert.alert;
Alert.alert = (title, message, buttons, options) => {
  if (Platform.OS === 'web') {
    const fullMessage = `${title ? title + '\n' : ''}${message || ''}`;
    if (buttons && buttons.length > 0) {
      const hasCancel = buttons.some(b => b.style === 'cancel');
      if (hasCancel || buttons.length > 1) {
        const confirmed = window.confirm(fullMessage);
        if (confirmed) {
          const confirmBtn = buttons.find(b => b.style === 'destructive' || b.style === 'default' || b.text === 'Apagar' || b.text === 'OK' || b.text === 'Sair') || buttons.find(b => b.style !== 'cancel') || buttons[1] || buttons[0];
          if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        } else {
          const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
          if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      } else {
        window.alert(fullMessage);
        if (buttons[0] && buttons[0].onPress) buttons[0].onPress();
      }
    } else {
      window.alert(fullMessage);
    }
  } else {
    // Aparelhos reais (iOS/Android)
    originalAlert(title, message, buttons, options);
  }
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const loginStore = useAuthStore((state) => state.login);
  const logoutStore = useAuthStore((state) => state.logout);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const router = useRouter();

  useEffect(() => {
    // Tenta pegar a sessão na inicialização do app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const userObj = mapSessionToUser(session);
        loginStore(userObj);
        // Mobile: registra Expo Push Token
        // Web: solicita permissão de notificação do browser
        if (Platform.OS === 'web') {
          requestWebNotificationPermission();
        } else {
          registerForPushNotificationsAsync(userObj.id, userObj.role);
        }
      } else {
        logoutStore();
      }
      setHydrated();
    });

    // Escuta mudanças de sessão em tempo real (ex: deslogou, ou cadastrou)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const userObj = mapSessionToUser(session);
        loginStore(userObj);
        // Registra ou atualiza o token sempre que a sessão mudar
        registerForPushNotificationsAsync(userObj.id, userObj.role);
      } else {
        logoutStore();
      }
    });

    // Abre a tela correta quando o usuário toca na notificação (mobile only)
    let notifSub: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      notifSub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.orderId) {
          router.push(`/chat/${data.orderId}` as any);
        } else if (data?.screen) {
          router.push(data.screen as any);
        }
      });
    }

    return () => {
      subscription.unsubscribe();
      notifSub?.remove();
    };
  }, []);

  return (
    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost />
    </ThemeProvider>
  );
}
