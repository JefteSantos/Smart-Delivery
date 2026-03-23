import { Tabs } from 'expo-router';
import { Home, ShoppingCart, User, ClipboardList } from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function ClientLayout() {
    const { user } = useAuthStore();
    const cartItems = useCartStore((state) => state.items);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    const [activeOrders, setActiveOrders] = useState(0);

    useEffect(() => {
        if (!user) return;

        const checkBadges = async () => {
            const { count: ordersCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .in('status', ['pending', 'preparing', 'delivering']);
            
            // Busca mensagens que o restaurante mandou e o cliente não viu
            const { count: unreadCount, error: unreadErr } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .eq('sender_role', 'master');
            
            const totalUnread = unreadErr ? 0 : (unreadCount || 0);

            setActiveOrders((ordersCount || 0) + totalUnread);
        };

        checkBadges();

        const channelOrders = supabase
            .channel('layout_active_orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
                () => {
                    checkBadges();
                }
            )
            .subscribe();

        const channelMessages = supabase
            .channel('layout_unread_messages_client')
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
    }, [user]);

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#FF6B6B',
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
                    title: 'Cardápio',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Carrinho',
                    tabBarIcon: ({ color }) => <ShoppingCart color={color} size={24} />,
                    tabBarBadge: totalItems > 0 ? totalItems : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#FF6B6B' },
                }}
            />
            <Tabs.Screen
                name="my-orders"
                options={{
                    title: 'Pedidos',
                    tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />,
                    tabBarBadge: activeOrders > 0 ? activeOrders : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#FF6B6B' },
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ color }) => <User color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="my-data"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="privacy"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="terms"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
