import { Tabs } from 'expo-router';
import { Home, ShoppingCart, User, ClipboardList } from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';

export default function ClientLayout() {
    const cartItems = useCartStore((state) => state.items);
    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

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
