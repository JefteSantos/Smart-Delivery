import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Package, Truck, CheckCircle, Clock, ChevronDown, ChevronUp, RefreshCw, RefreshCcw, MessageCircle } from 'lucide-react-native';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { showWebNotification } from '../../lib/notifications';

interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Order {
    id: string;
    created_at: string;
    total_price: number;
    status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
    items_count: number;
    admin_message?: string | null;
    observation?: string | null;
    delivery_mode?: 'delivery' | 'pickup';
    delivery_address?: string | null;
    items?: OrderItem[];
    expanded?: boolean;
    unread_messages?: number;
}

export default function MyOrdersScreen() {
    const { user } = useAuthStore();
    const { addItem } = useCartStore();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [reorderingId, setReorderingId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [])
    );

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('realtime_client_orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    fetchOrders();

                    // Notificação web quando o status do pedido mudar
                    if (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status) {
                        const statusMessages: Record<string, { title: string; body: string }> = {
                            preparing: {
                                title: '👨‍🍳 Pedido Confirmado!',
                                body: 'O restaurante aceitou e já está preparando tudo!',
                            },
                            delivering: {
                                title: '🚴 Pedido a Caminho!',
                                body: 'Seu pedido saiu para entrega. Já já chega!',
                            },
                            delivered: {
                                title: '✅ Pedido Entregue!',
                                body: 'Esperamos que tenha gostado!',
                            },
                            cancelled: {
                                title: '❌ Pedido Cancelado',
                                body: payload.new?.admin_message || 'Seu pedido foi cancelado.',
                            },
                        };
                        const notif = statusMessages[payload.new?.status];
                        if (notif) {
                            showWebNotification(notif.title, notif.body, {
                                orderId: payload.new?.id,
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchOrders = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const orderIds = ordersData?.map(o => o.id) || [];
            if (orderIds.length > 0) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select('*')
                    .in('order_id', orderIds);

                if (itemsError) throw itemsError;

                // Fetch unread messages para compôr o número no pedido local
                const { data: unreadData, error: unreadError } = await supabase
                    .from('messages')
                    .select('order_id')
                    .eq('is_read', false)
                    .eq('sender_role', 'master')
                    .in('order_id', orderIds);
                
                const unreadCounts: Record<string, number> = orderIds.reduce((acc: any, id) => { acc[id] = 0; return acc; }, {});
                if (!unreadError && unreadData) {
                    unreadData.forEach(msg => {
                        unreadCounts[msg.order_id]++;
                    });
                }

                const assembledOrders = ordersData.map(order => ({
                    ...order,
                    items: itemsData.filter(i => i.order_id === order.id),
                    expanded: false,
                    unread_messages: unreadCounts[order.id] || 0
                })) as Order[];

                setOrders(assembledOrders);
            } else {
                setOrders([]);
            }
        } catch (error: any) {
            console.error('Fetch Orders Error FULL DETAIL:', JSON.stringify(error, null, 2));
            Alert.alert("Erro de Sincronização", `Detalhes: ${error?.message} | ${error?.details} | ${error?.hint}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, expanded: !o.expanded } : o));
    };

    const handleReorder = async (order: Order) => {
        if (!order.items || order.items.length === 0) return;

        setReorderingId(order.id);

        try {
            const productIds = order.items.map(i => i.product_id);

            // Buscar os produtos atuais no banco para validar disponibilidade, preço novo, tela, etc
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);

            if (productsError) throw productsError;

            const today = new Date().getDay(); // 0 is Sunday, 1 is Monday...
            const availableProducts: any[] = [];
            const unavailableProductNames: string[] = [];

            // Os que não vieram no select, foram excluídos do cardápio
            const foundProductIds = productsData?.map(p => p.id) || [];
            order.items.forEach(item => {
                if (!foundProductIds.includes(item.product_id)) {
                    unavailableProductNames.push(item.product_name + ' (Removido do cardápio)');
                }
            });

            productsData?.forEach(prod => {
                // CORREÇÃO: campo correto do banco é 'is_offer', não 'isOfferOfTheDay'
                const isAvailableToday = prod.is_offer || !prod.available_days || prod.available_days.length === 0 || prod.available_days.includes(today);
                if (isAvailableToday) {
                    availableProducts.push(prod);
                } else {
                    unavailableProductNames.push(prod.name);
                }
            });

            if (availableProducts.length === 0) {
                Alert.alert("Aviso", "Infelizmente, nenhum dos itens deste pedido está disponível para venda hoje.");
                setReorderingId(null);
                return;
            }

            // Adiciona no carrinho
            availableProducts.forEach(prod => {
                const orderItem = order.items!.find(i => i.product_id === prod.id);
                const quantity = orderItem ? orderItem.quantity : 1;

                for (let i = 0; i < quantity; i++) {
                    addItem({
                        id: prod.id,
                        name: prod.name,
                        description: prod.description || '',
                        price: prod.price, // Usa o preço atual do cardápio e não do pedido antigo
                        imageUrl: prod.image_url || '',
                        isOfferOfTheDay: prod.is_offer || false  // CORREÇÃO: campo correto do banco
                    });
                }
            });

            if (unavailableProductNames.length > 0) {
                Alert.alert("Atenção", `Adicionamos os itens disponíveis no seu carrinho!\n\nAlguns itens não puderam ser adicionados pois não estão disponíveis hoje:\n• ${unavailableProductNames.join('\n• ')}`, [
                    { text: 'Ir para o Carrinho', onPress: () => router.push('/(client)/cart' as any) },
                    { text: 'OK', style: 'cancel' }
                ]);
            } else {
                Alert.alert("Sucesso!", "Todos os itens foram adicionados ao seu carrinho com sucesso.", [
                    { text: 'Ir para o Carrinho', onPress: () => router.push('/(client)/cart' as any) },
                    { text: 'OK', style: 'cancel' }
                ]);
            }

        } catch (error: any) {
            Alert.alert("Erro", "Não foi possível resgatar os itens do seu pedido antigo.");
        } finally {
            setReorderingId(null);
        }
    };

    const handleConfirmDelivery = (id: string) => {
        Alert.alert(
            "Confirmar Entrega",
            "Você já recebeu este pedido em mãos?",
            [
                { text: "Ainda não", style: "cancel" },
                {
                    text: "Sim, recebi!",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await supabase
                                .from('orders')
                                .update({ status: 'delivered' })
                                .eq('id', id)
                                .eq('user_id', user!.id); // CORREÇÃO: garante que só o dono confirma

                            if (error) throw error;

                            setOrders(orders.map(o => o.id === id ? { ...o, status: 'delivered' } : o));
                            Alert.alert("Bom apetite!", "Obrigado por confirmar a entrega.");
                        } catch (error: any) {
                            Alert.alert("Erro", "Não foi possível confirmar a entrega.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { text: 'Aguardando Confirmação', color: 'text-orange-500', bg: 'bg-orange-50', icon: <Clock size={16} color="#f97316" /> };
            case 'preparing': return { text: 'Preparando', color: 'text-violet-500', bg: 'bg-violet-50', icon: <Package size={16} color="#8b5cf6" /> };
            case 'delivering': return { text: 'Saiu para Entrega', color: 'text-blue-500', bg: 'bg-blue-50', icon: <Truck size={16} color="#3b82f6" /> };
            case 'delivered': return { text: 'Entregue', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: <CheckCircle size={16} color="#10b981" /> };
            default: return { text: 'Cancelado', color: 'text-red-500', bg: 'bg-red-50', icon: <Clock size={16} color="#ef4444" /> };
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center pt-16 px-5">
                <ActivityIndicator size="large" color="#EF4444" />
                <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">Buscando seu histórico de pedidos...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5" showsVerticalScrollIndicator={false}>
            <View className="mb-8 flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
                <View>
                    <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Meus Pedidos</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">Acompanhe seu histórico</Text>
                </View>
                <TouchableOpacity onPress={fetchOrders} className="bg-red-50 p-2 rounded-full">
                    <RefreshCcw size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
                <View className="items-center justify-center mt-20">
                    <Package size={64} color="#D1D5DB" />
                    <Text className="text-gray-800 dark:text-white font-bold text-lg mt-4">Nenhum pedido ainda</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-center mt-2 px-6">Quando você fizer seu primeiro pedido, ele aparecerá aqui.</Text>
                </View>
            ) : (
                <View className="mb-10">
                    {orders.map((order) => {
                        const statusObj = getStatusInfo(order.status);
                        const dataFormatada = new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        const horaFormatada = new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                        return (
                            <View key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-800">
                                <TouchableOpacity onPress={() => toggleExpand(order.id)} className="flex-row justify-between items-center mb-3">
                                    <View>
                                        <View className="flex-row items-center">
                                            <Text className="font-bold text-gray-800 dark:text-white text-base">Pedido #{order.id.slice(0, 6).toUpperCase()}</Text>
                                            {order.unread_messages && order.unread_messages > 0 ? (
                                                <View className="bg-red-500 rounded-full py-0.5 px-2 ml-3">
                                                    <Text className="text-white text-[10px] font-bold">{order.unread_messages} nova(s) msg</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text className="text-gray-400 dark:text-gray-400 text-xs mt-1">{dataFormatada} às {horaFormatada}</Text>
                                    </View>
                                    <View className="items-center justify-center p-2">
                                        {order.expanded ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
                                    </View>
                                </TouchableOpacity>

                                <View className="flex-row justify-between items-end mb-2">
                                    <View>
                                        <View className={`flex-row items-center px-2 py-1 rounded-md mb-2 ${statusObj.bg}`}>
                                            {statusObj.icon}
                                            <Text className={`text-xs font-bold ml-1 ${statusObj.color}`}>{statusObj.text}</Text>
                                        </View>
                                    </View>
                                    <View>
                                        <Text className="text-gray-800 dark:text-white font-black text-lg">R$ {Number(order.total_price).toFixed(2).replace('.', ',')}</Text>
                                    </View>
                                </View>

                                {order.expanded && (
                                    <View className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-3">
                                        <View className="flex-row justify-between items-center mb-2">
                                            <Text className="text-gray-600 dark:text-white font-bold text-xs uppercase tracking-wider">Itens do Pedido</Text>
                                            <Text className="text-gray-400 dark:text-gray-400 text-xs">{order.items_count} Itens</Text>
                                        </View>

                                        <View className="bg-blue-50 p-3 rounded-xl border border-blue-200 mb-3">
                                            <Text className="text-blue-800 font-bold text-xs mb-1">
                                                {order.delivery_mode === 'pickup' ? 'MODO: RETIRADA NO LOCAL' : 'ENDEREÇO DE ENTREGA:'}
                                            </Text>
                                            {order.delivery_mode !== 'pickup' && (
                                                <Text className="text-blue-700 font-medium">
                                                    {order.delivery_address || 'Endereço não informado'}
                                                </Text>
                                            )}
                                        </View>

                                        <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-3 border border-gray-100 dark:border-gray-800">
                                            {order.items?.map(item => (
                                                <View key={item.id} className="flex-row justify-between py-1">
                                                    <Text className="text-gray-700 dark:text-white flex-1"><Text className="font-bold">x{item.quantity}</Text> {item.product_name}</Text>
                                                    <Text className="text-gray-500 dark:text-gray-400 font-medium">R$ {Number(item.total_price).toFixed(2).replace('.', ',')}</Text>
                                                </View>
                                            ))}

                                            {order.observation && (
                                                <View className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <Text className="text-gray-400 dark:text-gray-400 text-xs mb-1 font-bold">OBSERVAÇÃO ENVIADA</Text>
                                                    <Text className="text-gray-600 dark:text-white text-xs italic">"{order.observation}"</Text>
                                                </View>
                                            )}
                                        </View>

                                        {order.admin_message && (
                                            <View className="mb-3 bg-red-50 p-3 rounded-xl border border-red-200">
                                                <Text className="text-red-800 font-bold text-xs mb-1">MENSAGEM DO RESTAURANTE</Text>
                                                <Text className="text-red-700 italic">"{order.admin_message}"</Text>
                                            </View>
                                        )}

                                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                            <TouchableOpacity
                                                onPress={() => handleConfirmDelivery(order.id)}
                                                className="bg-emerald-50 p-3 rounded-xl flex-row justify-center items-center border border-emerald-100 mb-3"
                                            >
                                                <CheckCircle size={16} color="#10B981" />
                                                <Text className="text-emerald-600 font-bold ml-2">Já Recebi meu Pedido</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Botão de Chat com o Restaurante */}
                                        {order.status !== 'cancelled' && (
                                            <TouchableOpacity
                                                onPress={() => router.push(`/chat/${order.id}` as any)}
                                                className="bg-violet-50 p-3 rounded-xl flex-row justify-center items-center border border-violet-100 mb-3"
                                            >
                                                <MessageCircle size={16} color="#8B5CF6" />
                                                <Text className="text-violet-600 font-bold ml-2">Falar com o Restaurante</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={() => handleReorder(order)}
                                            disabled={reorderingId === order.id}
                                            className="bg-red-50 p-3 rounded-xl flex-row justify-center items-center border border-red-100"
                                        >
                                            {reorderingId === order.id ? (
                                                <ActivityIndicator size="small" color="#EF4444" />
                                            ) : (
                                                <>
                                                    <RefreshCw size={16} color="#EF4444" />
                                                    <Text className="text-red-600 font-bold ml-2">Pedir Novamente</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}
