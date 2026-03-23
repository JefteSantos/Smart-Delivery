import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ── Configuração de comportamento das notificações (mobile) ──────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ── Web (Browser) Notification API ───────────────────────────────────────────

/**
 * Solicita permissão para notificações nativas do browser.
 * Deve ser chamado em resposta a um gesto do usuário (ex: clique).
 * Retorna true se a permissão foi concedida.
 */
export async function requestWebNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'web') return false;
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

/**
 * Exibe uma notificação nativa do SO via browser Notification API.
 * Aparece mesmo com a aba em background (mas browser aberto).
 * Em mobile, esta função não faz nada (usa Expo Push em vez disso).
 */
export function showWebNotification(
    title: string,
    body: string,
    data: Record<string, any> = {}
): void {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notif = new Notification(title, {
        body,
        icon: '/favicon.png',
        // tag agrupa notificações do mesmo pedido — evita múltiplos alertas
        tag: data.orderId ? `order-${data.orderId}` : 'smart-delivery',
        requireInteraction: !!data.requireInteraction,
    });

    // Click na notificação: foca a aba do appfocada
    notif.onclick = () => {
        window.focus();
        notif.close();
    };
}

/**
 * Solicita permissão ao usuário, obtém o Expo Push Token e
 * salva na tabela `push_tokens` do Supabase.
 *
 * Para master: também salva em `settings.master_push_token`.
 *
 * ATENÇÃO: Expo Push Token só funciona em dispositivos físicos.
 * Em emuladores/simuladores a função retorna null silenciosamente.
 */
export async function registerForPushNotificationsAsync(
    userId: string,
    role: 'client' | 'master'
): Promise<string | null> {
    // Web e simuladores não suportam push notifications
    if (Platform.OS === 'web') return null;
    if (!Device.isDevice) {
        console.info('[Notifications] Push não disponível em simuladores.');
        return null;
    }

    // Pede permissão
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.info('[Notifications] Permissão de push negada pelo usuário.');
        return null;
    }

    // Configuração extra para Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Pedidos',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#EF4444',
        });
    }

    try {
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        const token = tokenData.data;

        // Salva token na tabela push_tokens (clientes e master)
        await supabase.from('push_tokens').upsert({
            user_id: userId,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
        });

        // Master também salva em settings para que clientes possam notificá-lo
        if (role === 'master') {
            await supabase
                .from('settings')
                .update({ master_push_token: token, master_user_id: userId })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // atualiza qualquer linha
        }

        return token;
    } catch (err) {
        // Acontece quando não há projectId configurado no EAS
        console.info('[Notifications] Não foi possível obter push token:', err);
        return null;
    }
}

// ── Envio de notificações ────────────────────────────────────────────────────

/**
 * Envia uma push notification via API do Expo para um ou mais tokens.
 * Esta chamada é feita CLIENT-SIDE — os tokens são validados pelo servidor Expo.
 */
export async function sendPushNotification(
    toTokens: string | string[],
    title: string,
    body: string,
    data: Record<string, any> = {}
): Promise<void> {
    const tokens = (Array.isArray(toTokens) ? toTokens : [toTokens])
        .filter(t => t?.startsWith('ExponentPushToken['));

    if (tokens.length === 0) return;

    const messages = tokens.map(token => ({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
    }));

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
        });
    } catch {
        // Falha silenciosa — não bloqueia o fluxo do app
    }
}

// ── Helpers para buscar tokens ───────────────────────────────────────────────

/** Busca o token de push de um usuário específico (para notificar clientes). */
export async function getTokenForUser(userId: string): Promise<string | null> {
    const { data } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();
    return data?.token ?? null;
}

/** Busca o token de push do master (salvo em settings). */
export async function getMasterPushToken(): Promise<string | null> {
    const { data } = await supabase
        .from('settings')
        .select('master_push_token')
        .not('master_push_token', 'is', null)
        .single();
    return data?.master_push_token ?? null;
}
