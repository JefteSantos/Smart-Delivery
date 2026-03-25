import { Tabs, useRouter } from 'expo-router';
import { Home, Utensils, Settings, ClipboardList } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

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

    useEffect(() => {
        if (!user || user.role !== 'master') return;

        const checkBadges = async () => {
            const { count: ordersCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            
            // Busca mensagens que o cliente mandou e o restaurante não viu
            const { count: unreadCount, error: unreadErr } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .eq('sender_role', 'client');

            const totalUnread = unreadErr ? 0 : (unreadCount || 0);

            setPendingOrders((ordersCount || 0) + totalUnread);
        };

        checkBadges();

        const channelOrders = supabase
            .channel('master_layout_orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    checkBadges();
                }
            )
            .subscribe();

        const channelMessages = supabase
            .channel('layout_unread_messages_master')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                () => {
                    checkBadges();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channelOrders);
            supabase.removeChannel(channelMessages);
        };
    }, []);

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
