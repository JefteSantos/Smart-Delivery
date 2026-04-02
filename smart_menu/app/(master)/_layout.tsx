import { Tabs, useRouter } from 'expo-router';
import { Home, Utensils, Settings, ClipboardList } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Audio } from 'expo-av';

export default function MasterLayout() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();

    // CORREÇÃO: Proteção de rota — se o usuário não for master, redireciona para login.
    // Impede que clientes acessem o painel de admin digitando a URL diretamente.
    useEffect(() => {
        if (user === null) {
            // Não logado
            router.replace('/(auth)/login');
        } else if (user.role !== 'master') {
            // Logado mas sem permissão de master
            router.replace('/(client)/home');
        }
    }, [user]);

    const [pendingOrders, setPendingOrders] = useState(0);
    const initialLoadDone = useRef(false);
    const prevCountRef = useRef(0);

    async function playNotificationSound() {
        // Delay minúsculo para garantir que o áudio não brigue com o processamento do Realtime
        setTimeout(async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: 'https://github.com/AnestisG/Fetch-Beep/raw/master/beep.mp3' },
                    { shouldPlay: true }
                );
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync();
                    }
                });
            } catch (error) {
                console.error('[MasterLayout] Erro ao tocar som:', error);
            }
        }, 100);
    }

    useEffect(() => {
        if (!user || user.role !== 'master') return;

        const checkBadges = async (shouldPlaySound = false) => {
            try {
                const { count: ordersCount } = await supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                const { count: unreadCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_read', false)
                    .eq('sender_role', 'client');

                const newTotal = (ordersCount || 0) + (unreadCount || 0);

                // Só toca som se for um evento Realtime (shouldPlaySound=true) 
                // E o total de pendências aumentou em relação ao que temos na Ref
                if (shouldPlaySound && newTotal > prevCountRef.current && initialLoadDone.current) {
                    playNotificationSound();
                }

                prevCountRef.current = newTotal;
                setPendingOrders(newTotal);
                initialLoadDone.current = true;
            } catch (err) {
                console.error('[MasterLayout] Erro na contagem:', err);
            }
        };

        // Carga inicial
        checkBadges(false);

        // Ouvinte de Pedidos
        const channelOrders = supabase
            .channel('master_realtime_orders')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
                checkBadges(true);
            })
            .subscribe();

        // Ouvinte de Mensagens
        const channelMessages = supabase
            .channel('master_realtime_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
                checkBadges(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelOrders);
            supabase.removeChannel(channelMessages);
        };
    }, [user]);

    if (!user || user.role !== 'master') {
        return null;
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#8B5CF6', // Roxo como cor de Admin
                headerShown: false,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: '#e5e5e5',
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    title: 'Cardápio',
                    tabBarIcon: ({ color }) => <Utensils color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Pedidos',
                    tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
                    tabBarBadge: pendingOrders > 0 ? pendingOrders : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#EF4444' },
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Configuração',
                    tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
