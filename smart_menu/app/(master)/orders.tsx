import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle, Clock, Package, Truck, XCircle, Search, MessageSquare, ChevronDown, ChevronUp, RefreshCcw, MessageCircle } from 'lucide-react-native';
import { getTokenForUser, sendPushNotification, showWebNotification } from '../../lib/notifications';

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Order {
    id: string;
    client_name: string;
    total_price: number;
    status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
    items_count: number;
    created_at: string;
    observation: string | null;
    delivery_mode?: 'delivery' | 'pickup';
    delivery_address?: string | null;
    items?: OrderItem[];
    expanded?: boolean;
    unread_messages?: number;
}

export default function MasterOrdersScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ativos' | 'concluidos'>('ativos');

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [adminMessage, setAdminMessage] = useState('');
    const [updateStatusTo, setUpdateStatusTo] = useState<Order['status'] | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [])
    );

    useEffect(() => {
        if (!user) return;

        // Escuta qualquer mudança que aconteça na tabela 'orders' em tempo real!
        const channel = supabase
            .channel('realtime_master_orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    fetchOrders();

                    // Notificação web quando um novo pedido é inserido
                    // (complementa o push mobile que já é enviado pelo cart.tsx)
                    if (payload.eventType === 'INSERT') {
                        const order = payload.new as any;
                        showWebNotification(
                            '🛎️ Novo Pedido Recebido!',
                            `${order.client_name || 'Cliente'} · R$ ${Number(order.total_price).toFixed(2).replace('.', ',')}`,
                            { orderId: order.id, requireInteraction: true }
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // First we fetch the orders
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            // Then we fetch items for those orders if we want to display everything.
            // For a robust system we can do this in joined queries if configured, or fetch items individually upon expand.
            // Let's fetch all items at once for simplicity right now.
            const orderIds = ordersData?.map(o => o.id) || [];
            if (orderIds.length > 0) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select('*')
                    .in('order_id', orderIds);

                if (itemsError) throw itemsError;

                // Fetch unread messages
                const { data: unreadData, error: unreadError } = await supabase
                    .from('messages')
                    .select('order_id')
                    .eq('is_read', false)
                    .eq('sender_role', 'client')
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
                    expanded: order.status === 'pending', // Only auto-expand new ones
                    unread_messages: unreadCounts[order.id] || 0
                })) as Order[];

                setOrders(assembledOrders);
            } else {
                setOrders([]);
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível buscar os pedidos. ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, expanded: !o.expanded } : o));
    };

    const confirmStatusUpdate = (id: string, newStatus: Order['status'], requireMessage = false) => {
        if (requireMessage) {
            setSelectedOrderId(id);
            setUpdateStatusTo(newStatus);
            setAdminMessage('');
            setModalVisible(true);
        } else {
            executeStatusUpdate(id, newStatus, null);
        }
    };

    const executeStatusUpdate = async (id: string, newStatus: string, message: string | null) => {
        try {
            const updatePayload: any = { status: newStatus };
            if (message !== null) {
                updatePayload.admin_message = message;
            }

            const { data: updatedOrder, error } = await supabase
                .from('orders')
                .update(updatePayload)
                .eq('id', id)
                .select('user_id, client_name')
                .single();

            if (error) throw error;

            // Notifica o cliente sobre a mudança de status
            if (updatedOrder?.user_id) {
                const clientToken = await getTokenForUser(updatedOrder.user_id);
                if (clientToken) {
                    const statusMessages: Record<string, { title: string; body: string }> = {
                        preparing: {
                            title: '👨‍🍳 Pedido Confirmado!',
                            body: 'O restaurante aceitou seu pedido e já está preparando tudo!',
                        },
                        delivering: {
                            title: '🚴 Pedido a Caminho!',
                            body: 'Seu pedido saiu para entrega. Já já chega!',
                        },
                        delivered: {
                            title: '✅ Pedido Entregue!',
                            body: 'Esperamos que tenha gostado! Avalie seu pedido.',
                        },
                        cancelled: {
                            title: '❌ Pedido Cancelado',
                            body: message || 'Infelizmente seu pedido foi cancelado. Entre em contato.',
                        },
                    };
                    const notif = statusMessages[newStatus];
                    if (notif) {
                        sendPushNotification(clientToken, notif.title, notif.body, {
                            screen: '/(client)/my-orders',
                        });
                    }
                }
            }

            setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus as any, expanded: newStatus === 'delivered' || newStatus === 'cancelled' ? false : o.expanded } : o));
            setModalVisible(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return { text: 'Aguardando', color: 'bg-orange-100 text-orange-600 border-orange-200' };
            case 'preparing': return { text: 'Na Cozinha', color: 'bg-violet-100 text-violet-600 border-violet-200' };
            case 'delivering': return { text: 'Em Rota', color: 'bg-blue-100 text-blue-600 border-blue-200' };
            case 'delivered': return { text: 'Finalizado', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
            default: return { text: 'Cancelado', color: 'bg-red-100 text-red-600 border-red-200' };
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
                <ActivityIndicator size="large" color="#EF4444" />
                <Text className="text-gray-500 dark:text-gray-400 mt-4">Puxando pedidos...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16">
            <View className="px-5 mb-4 flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Text className="text-red-500 font-bold text-lg">{'< Voltar'}</Text>
                    </TouchableOpacity>
                    <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Pedidos Recebidos</Text>
                </View>
                <TouchableOpacity onPress={fetchOrders} className="bg-red-50 p-2 rounded-full">
                    <RefreshCcw size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {/* Abas */}
            <View className="px-5 mb-4 flex-row">
                <TouchableOpacity 
                    onPress={() => setActiveTab('ativos')}
                    className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'ativos' ? 'border-red-500' : 'border-transparent'}`}
                >
                    <Text className={`font-bold ${activeTab === 'ativos' ? 'text-red-500' : 'text-gray-400'}`}>Em Andamento</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setActiveTab('concluidos')}
                    className={`flex-1 py-3 items-center border-b-2 ${activeTab === 'concluidos' ? 'border-red-500' : 'border-transparent'}`}
                >
                    <Text className={`font-bold ${activeTab === 'concluidos' ? 'text-red-500' : 'text-gray-400'}`}>Histórico</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="px-5 flex-1 pb-10" showsVerticalScrollIndicator={false}>
                {orders.filter(o => activeTab === 'ativos' ? !['delivered', 'cancelled'].includes(o.status) : ['delivered', 'cancelled'].includes(o.status)).length === 0 ? (
                    <View className="items-center justify-center mt-20">
                        <Package size={64} color="#D1D5DB" />
                        <Text className="text-gray-500 dark:text-gray-400 font-bold mt-4">Ainda não há nenhum pedido.</Text>
                    </View>
                ) : (
                    orders.filter(o => activeTab === 'ativos' ? !['delivered', 'cancelled'].includes(o.status) : ['delivered', 'cancelled'].includes(o.status)).map(order => {
                        const badge = getStatusBadge(order.status);
                        const isFinished = order.status === 'delivered' || order.status === 'cancelled';

                        return (
                            <View key={order.id} className={`bg-white dark:bg-gray-800 rounded-3xl p-5 mb-4 shadow-md border border-gray-100 dark:border-gray-700 ${isFinished ? 'opacity-60' : ''}`}>
                                {/* Cabecalho do Pedido */}
                                <TouchableOpacity onPress={() => toggleExpand(order.id)} className="flex-row justify-between">
                                    <View className="flex-1 mr-2">
                                        <View className="flex-row items-center mb-1">
                                            <Text className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mr-2">#{order.id.slice(0, 6).toUpperCase()}</Text>
                                            {order.unread_messages && order.unread_messages > 0 ? (
                                                <View className="bg-red-500 rounded-full h-2 w-2 mr-2" />
                                            ) : null}
                                        </View>
                                        
                                        <Text className="font-extrabold text-gray-900 dark:text-white text-lg leading-tight mb-2" numberOfLines={1}>
                                            {order.client_name}
                                        </Text>

                                        <View className="flex-row items-center">
                                            <Clock size={12} color="#9CA3AF" />
                                            <Text className="text-gray-400 dark:text-gray-500 text-xs ml-1 mr-3">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                                            <Package size={12} color="#9CA3AF" />
                                            <Text className="text-gray-400 dark:text-gray-500 text-xs ml-1">{order.items_count} {order.items_count === 1 ? 'item' : 'itens'}</Text>
                                        </View>
                                    </View>

                                    <View className="items-end justify-between">
                                        <View className={`px-3 py-1.5 rounded-full border border-transparent shadow-sm ${badge.color}`}>
                                            <Text className="text-[10px] font-black uppercase tracking-tighter">{badge.text}</Text>
                                        </View>
                                        
                                        <View className="mt-4">
                                            {order.unread_messages && order.unread_messages > 0 ? (
                                                <TouchableOpacity 
                                                    onPress={() => router.push(`/chat/${order.id}` as any)}
                                                    className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg flex-row items-center mb-2"
                                                >
                                                    <MessageCircle size={12} color="#EF4444" />
                                                    <Text className="text-red-500 text-[10px] font-bold ml-1">{order.unread_messages} msg</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                            <View className="items-end">
                                                {order.expanded ? <ChevronUp size={20} color="#D1D5DB" /> : <ChevronDown size={20} color="#D1D5DB" />}
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* Expansao de Detalhes */}
                                {order.expanded && (
                                    <View className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                                        {/* Endereço / Retirada */}
                                        <View className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 mb-3">
                                            <Text className="text-blue-800 dark:text-blue-400 font-bold text-xs mb-1">
                                                {order.delivery_mode === 'pickup' ? 'MODO: RETIRADA' : 'ENDEREÇO:'}
                                            </Text>
                                            {order.delivery_mode !== 'pickup' && (
                                                <Text className="text-blue-700 dark:text-blue-300 font-medium text-sm">
                                                    {order.delivery_address || 'Não informado'}
                                                </Text>
                                            )}
                                        </View>

                                        {/* Observações */}
                                        {order.observation && (
                                            <View className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 mb-3">
                                                <Text className="text-amber-800 dark:text-amber-400 font-bold text-xs mb-1">OBSERVAÇÕES:</Text>
                                                <Text className="text-amber-700 dark:text-amber-300 italic text-sm">"{order.observation}"</Text>
                                            </View>
                                        )}

                                        {/* Lista de Itens */}
                                        <View className="mb-4">
                                            {order.items?.map(item => (
                                                <View key={item.id} className="flex-row justify-between py-1">
                                                    <Text className="text-gray-700 dark:text-white font-medium">x{item.quantity} {item.product_name}</Text>
                                                    <Text className="text-gray-500 dark:text-gray-400">R$ {Number(item.total_price).toFixed(2).replace('.', ',')}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View className="flex-row justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mb-4">
                                            <Text className="font-bold text-gray-600 dark:text-white">TOTAL</Text>
                                            <Text className="font-extrabold text-red-500 text-xl">R$ {Number(order.total_price).toFixed(2).replace('.', ',')}</Text>
                                        </View>

                                        {/* Ações */}
                                        {!isFinished && (
                                            <View className="flex-row justify-between space-x-2">
                                                {order.status === 'pending' && (
                                                    <>
                                                        <TouchableOpacity onPress={() => confirmStatusUpdate(order.id, 'cancelled', true)} className="flex-1 border border-red-100 bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl items-center flex-row justify-center">
                                                            <XCircle size={18} color="#EF4444" />
                                                            <Text className="text-red-500 font-bold ml-2">Recusar</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => confirmStatusUpdate(order.id, 'preparing')} className="flex-1 bg-violet-600 shadow-lg shadow-violet-600/30 p-4 rounded-2xl items-center flex-row justify-center">
                                                            <CheckCircle size={18} color="#FFF" />
                                                            <Text className="text-white font-bold ml-2">Aceitar</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                                {order.status === 'preparing' && (
                                                    <TouchableOpacity onPress={() => confirmStatusUpdate(order.id, 'delivering')} className="w-full bg-blue-600 shadow-lg shadow-blue-600/30 p-4 rounded-2xl items-center flex-row justify-center">
                                                        <Truck size={18} color="#FFF" />
                                                        <Text className="text-white font-bold ml-2">Enviar para Entrega</Text>
                                                    </TouchableOpacity>
                                                )}
                                                {order.status === 'delivering' && (
                                                    <TouchableOpacity onPress={() => confirmStatusUpdate(order.id, 'delivered')} className="w-full bg-emerald-600 shadow-lg shadow-emerald-600/30 p-4 rounded-2xl items-center flex-row justify-center">
                                                        <CheckCircle size={18} color="#FFF" />
                                                        <Text className="text-white font-bold ml-2">Confirmar Entrega</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}

                                        {/* Botão de Chat (Sempre visível se não cancelado) */}
                                        {order.status !== 'cancelled' && (
                                            <TouchableOpacity
                                                onPress={() => router.push(`/chat/${order.id}` as any)}
                                                className="mt-3 bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-900/50 p-4 rounded-2xl flex-row justify-center items-center shadow-sm"
                                            >
                                                <MessageCircle size={18} color="#8B5CF6" />
                                                <Text className="text-violet-700 dark:text-violet-400 font-bold ml-2 text-base">Abrir Chat</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Modal de Mensagem para o Cliente (Recusar) */}
            <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-center bg-black/50 p-5">
                    <View className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-2xl">
                        <View className="flex-row items-center mb-6">
                            <View className="bg-red-50 p-3 rounded-2xl mr-4">
                                <MessageSquare size={24} color="#EF4444" />
                            </View>
                            <Text className="text-2xl font-black text-gray-900 dark:text-white">Mensagem</Text>
                        </View>
                        
                        <Text className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-5">
                            Por que você está cancelando este pedido? O cliente receberá esta mensagem instantaneamente.
                        </Text>

                        <TextInput
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white rounded-3xl px-5 py-4 min-h-[120px] mb-8 text-base"
                            placeholder="Ex: Tivemos um problema com o motoboy..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            textAlignVertical="top"
                            value={adminMessage}
                            onChangeText={setAdminMessage}
                        />

                        <View className="flex-row justify-between space-x-3">
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="flex-1 py-4 items-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                                <Text className="text-gray-600 dark:text-white font-bold">Voltar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => executeStatusUpdate(selectedOrderId!, updateStatusTo!, adminMessage)}
                                className="flex-2 py-4 px-6 items-center rounded-2xl bg-red-500 shadow-xl shadow-red-500/20"
                            >
                                <Text className="text-white font-extrabold">Confirmar Cancelamento</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
