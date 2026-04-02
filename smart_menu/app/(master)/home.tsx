import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LogOut, LayoutDashboard, Utensils, Settings, TrendingUp, ShoppingBag, DollarSign, Clock } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView } from 'react-native';

interface DashboardStats {
    ordersToday: number;
    revenueToday: number;
    pendingOrders: number;
    isOpen: boolean;
    topProducts: Array<{ name: string; quantity: number }>;
    weeklyRevenue: number;
}

const StatCard = ({
    icon,
    label,
    value,
    color,
    bgColor,
    loading
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    bgColor: string;
    loading: boolean;
}) => (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-1 mx-1 shadow-sm border border-gray-100 dark:border-gray-700">
        <View className={`${bgColor} p-2 rounded-xl self-start mb-2`}>
            {icon}
        </View>
        <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">{label}</Text>
        {loading ? (
            <ActivityIndicator size="small" color={color} />
        ) : (
            <Text className="text-gray-900 dark:text-white font-extrabold text-xl">{value}</Text>
        )}
    </View>
);

export default function MasterHomeScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        ordersToday: 0,
        revenueToday: 0,
        pendingOrders: 0,
        isOpen: true,
        topProducts: [],
        weeklyRevenue: 0,
    });
    const [loadingStats, setLoadingStats] = useState(true);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);

            // 1. Pedidos de hoje e da semana
            const { data: weekOrders, error: weekErr } = await supabase
                .from('orders')
                .select('id, total_price, status, created_at')
                .gte('created_at', weekStart.toISOString())
                .neq('status', 'cancelled');

            // 2. Pedidos pendentes (qualquer data)
            const { count: pendingCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // 3. Status da loja
            const { data: settingsData } = await supabase
                .from('settings')
                .select('is_open')
                .single();

            // 4. Itens mais vendidos (Top 3 da semana)
            const { data: orderItems, error: itemsErr } = await supabase
                .from('order_items')
                .select('product_id, quantity, products(name)')
                .in('order_id', (weekOrders || []).map(o => o.id));

            if (!weekErr && weekOrders) {
                const todayOrders = weekOrders.filter(o => new Date(o.created_at) >= todayStart);
                const revenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
                const weeklyRevenue = weekOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

                // Processar top produtos
                const productCounts: Record<string, number> = {};
                orderItems?.forEach(item => {
                    const name = (item.products as any)?.name || 'Produto Removido';
                    productCounts[name] = (productCounts[name] || 0) + item.quantity;
                });

                const topProducts = Object.entries(productCounts)
                    .map(([name, quantity]) => ({ name, quantity }))
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 3);

                setStats({
                    ordersToday: todayOrders.length,
                    revenueToday,
                    pendingOrders: pendingCount || 0,
                    isOpen: settingsData?.is_open ?? true,
                    topProducts,
                    weeklyRevenue,
                });
            }
        } catch (e) {
            console.error('Erro ao buscar métricas detalhadas:', e);
        } finally {
            setLoadingStats(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Erro no logout da API:", error);
        }
        logout();
        router.replace('/(auth)/login');
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900" showsVerticalScrollIndicator={false}>
            <View className="pt-16 px-5">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Painel Geral</Text>
                        <Text className="text-gray-500 dark:text-gray-400">Olá, {user?.name}!</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogout}
                        className="p-2 bg-red-50 rounded-full"
                    >
                        <LogOut size={24} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* Status da loja */}
                <TouchableOpacity
                    onPress={() => router.push('/(master)/settings')}
                    className={`flex-row items-center justify-between p-4 rounded-2xl mb-6 border ${
                        stats.isOpen
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                    }`}
                >
                    <View className="flex-row items-center">
                        <View className={`w-3 h-3 rounded-full mr-3 ${stats.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <View>
                            <Text className={`font-bold text-base ${stats.isOpen ? 'text-emerald-800' : 'text-red-800'}`}>
                                Loja {stats.isOpen ? 'Aberta' : 'Fechada'}
                            </Text>
                            <Text className={`text-xs ${stats.isOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                                Toque para alterar nas Configurações
                            </Text>
                        </View>
                    </View>
                    <Settings size={18} color={stats.isOpen ? '#059669' : '#DC2626'} />
                </TouchableOpacity>

                {/* Métricas do dia */}
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                    Resumo de Hoje
                </Text>
                <View className="flex-row mb-3">
                    <StatCard
                        icon={<ShoppingBag size={18} color="#8B5CF6" />}
                        label="Pedidos Hoje"
                        value={String(stats.ordersToday)}
                        color="#8B5CF6"
                        bgColor="bg-violet-100"
                        loading={loadingStats}
                    />
                    <StatCard
                        icon={<DollarSign size={18} color="#10B981" />}
                        label="Faturamento"
                        value={`R$ ${stats.revenueToday.toFixed(2).replace('.', ',')}`}
                        color="#10B981"
                        bgColor="bg-emerald-100"
                        loading={loadingStats}
                    />
                </View>
                <View className="flex-row mb-6">
                    <StatCard
                        icon={<Clock size={18} color="#F97316" />}
                        label="Aguardando"
                        value={stats.pendingOrders > 0 ? `${stats.pendingOrders} pedido(s)` : 'Nenhum'}
                        color="#F97316"
                        bgColor="bg-orange-100"
                        loading={loadingStats}
                    />
                    <StatCard
                        icon={<TrendingUp size={18} color="#3B82F6" />}
                        label="Ticket Médio"
                        value={
                            stats.ordersToday > 0
                                ? `R$ ${(stats.revenueToday / stats.ordersToday).toFixed(2).replace('.', ',')}`
                                : '-'
                        }
                        color="#3B82F6"
                        bgColor="bg-blue-100"
                        loading={loadingStats}
                    />
                </View>

                {/* Seção de Relatórios Gerenciais */}
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 mt-4">
                    Relatórios e Desempenho
                </Text>
                
                <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Itens Mais Vendidos (Semana)</Text>
                        <TrendingUp size={20} color="#8B5CF6" />
                    </View>

                    {loadingStats ? (
                        <ActivityIndicator color="#8B5CF6" />
                    ) : stats.topProducts.length > 0 ? (
                        stats.topProducts.map((prod, idx) => (
                            <View key={idx} className="flex-row items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                <View className="flex-row items-center">
                                    <View className="w-6 h-6 rounded-full bg-violet-100 items-center justify-center mr-3">
                                        <Text className="text-violet-600 text-xs font-bold">{idx + 1}</Text>
                                    </View>
                                    <Text className="text-gray-700 dark:text-gray-300 font-medium">{prod.name}</Text>
                                </View>
                                <Text className="text-gray-900 dark:text-white font-bold">{prod.quantity}x</Text>
                            </View>
                        ))
                    ) : (
                        <Text className="text-gray-400 text-center py-4">Nenhum dado de venda ainda</Text>
                    )}

                    <View className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-500 dark:text-gray-400">Total da Semana:</Text>
                            <Text className="text-emerald-600 font-extrabold text-lg">
                                R$ {stats.weeklyRevenue.toFixed(2).replace('.', ',')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Cards de Ação */}
                <Text className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                    Ações Rápidas
                </Text>
                <View className="flex-row flex-wrap justify-between">
                    <TouchableOpacity
                        onPress={() => router.push('/(master)/menu')}
                        className="bg-white dark:bg-gray-800 w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 items-center justify-center py-8"
                    >
                        <View className="bg-violet-100 p-3 rounded-full mb-3">
                            <Utensils size={32} color="#8B5CF6" />
                        </View>
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Meu Cardápio</Text>
                        <Text className="text-gray-400 dark:text-gray-400 text-xs mt-1 text-center">Adicionar Itens</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/(master)/orders')}
                        className="bg-white dark:bg-gray-800 w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 items-center justify-center py-8"
                    >
                        <View className={`p-3 rounded-full mb-3 ${stats.pendingOrders > 0 ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                            <LayoutDashboard size={32} color={stats.pendingOrders > 0 ? '#F97316' : '#10B981'} />
                        </View>
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Pedidos</Text>
                        <Text className={`text-xs mt-1 text-center font-bold ${stats.pendingOrders > 0 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-400'}`}>
                            {stats.pendingOrders > 0 ? `${stats.pendingOrders} pendente(s)` : 'Ver e Aceitar'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/(master)/settings')}
                        className="bg-white dark:bg-gray-800 w-[48%] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 items-center justify-center py-8"
                    >
                        <View className="bg-orange-100 p-3 rounded-full mb-3">
                            <Settings size={32} color="#F97316" />
                        </View>
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Configurações</Text>
                        <Text className="text-gray-400 dark:text-gray-400 text-xs mt-1 text-center">Horários e Loja</Text>
                    </TouchableOpacity>
                </View>

                {/* Banner Modo Mestre */}
                <View className="mt-2 mb-8 bg-violet-600 p-5 rounded-2xl flex-row items-center relative overflow-hidden">
                    <View className="flex-1 z-10">
                        <Text className="text-white font-extrabold text-xl mb-1">Modo Mestre</Text>
                        <Text className="text-violet-200">Você tem controle total sobre o restaurante.</Text>
                    </View>
                    <View className="absolute right-[-20px] top-[-10px] opacity-20">
                        <LayoutDashboard size={100} color="white" />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
