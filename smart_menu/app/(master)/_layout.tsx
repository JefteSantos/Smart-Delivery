import { Tabs, useRouter } from 'expo-router';
import { Home, Utensils, Settings, ClipboardList } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';

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

    // Enquanto valida, não renderiza as tabs para evitar flash de conteúdo
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
