import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react-native';
import { getMasterPushToken, getTokenForUser, sendPushNotification, showWebNotification } from '@/lib/notifications';

interface Message {
    id: string;
    order_id: string;
    sender_id: string;
    sender_role: 'client' | 'master';
    content: string;
    created_at: string;
}

interface OrderInfo {
    id: string;
    client_name: string;
    client_phone?: string;
    status: string;
}

export default function ChatScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { user } = useAuthStore();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);

    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);

    // Cor de destaque conforme o papel do usuário logado
    const accentColor = user?.role === 'master' ? '#8B5CF6' : '#EF4444';
    const accentBg = user?.role === 'master' ? 'bg-violet-600' : 'bg-red-500';

    async function playNotificationSound() {
        setTimeout(async () => {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    require('../../assets/sounds/beep.mp3'),
                    { shouldPlay: true }
                );
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync();
                    }
                });
            } catch (error) {
                console.error('[ChatScreen] Erro ao tocar som:', error);
            }
        }, 100);
    }

    const fetchMessages = useCallback(async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });

        if (data) setMessages(data as Message[]);
        setLoading(false);
    }, [orderId]);

    useEffect(() => {
        // Busca informações do pedido (nome do cliente, status)
        supabase
            .from('orders')
            .select('id, client_name, client_phone, status')
            .eq('id', orderId)
            .single()
            .then(({ data }) => { if (data) setOrderInfo(data); });

        // Marca as mensagens preexistentes como lidas
        const markAsRead = async () => {
            if (!user) return;
            const oppositeRole = user.role === 'master' ? 'client' : 'master';
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('order_id', orderId)
                .eq('sender_role', oppositeRole)
                .eq('is_read', false);
        };
        markAsRead();

        fetchMessages();

        // Escuta novas mensagens em tempo real
        const channel = supabase
            .channel(`chat:${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `order_id=eq.${orderId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === newMsg.id);
                        if (exists) return prev;
                        return [...prev, newMsg];
                    });
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

                    // Se a mensagem veio de outra pessoa
                    if (newMsg.sender_id !== user?.id) {
                        playNotificationSound();
                        
                        // Marca como lida instantaneamente porque o usuário está com o chat aberto!
                        supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then();

                        const senderLabel = newMsg.sender_role === 'master' ? '🍴 Restaurante' : '👤 Cliente';
                        showWebNotification(
                            `💬 ${senderLabel}`,
                            newMsg.content,
                            { orderId }
                        );
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [orderId, fetchMessages]);

    const handleSend = async () => {
        const content = text.trim();
        if (!content || !user || sending) return;

        setSending(true);
        setText(''); // Limpa imediatamente para UX fluida

        const { data: newDbMsg, error } = await supabase.from('messages').insert([{
            order_id: orderId,
            sender_id: user.id,
            sender_role: user.role,
            content,
        }]).select().single();

        if (error) {
            // Restaura o texto se falhou
            setText(content);
        } else {
            // Adiciona localmente na mesma hora sem depender do Realtime!
            if (newDbMsg) {
                setMessages(prev => {
                    const exists = prev.some(m => m.id === newDbMsg.id);
                    if (exists) return prev;
                    return [...prev, newDbMsg as Message];
                });
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
            }

            // Notifica o destinatário da mensagem
            try {
                let recipientToken: string | null = null;
                const senderName = user.role === 'master' ? 'Restaurante' : (orderInfo?.client_name || 'Cliente');

                if (user.role === 'master') {
                    const { data: ord } = await supabase
                        .from('orders').select('user_id').eq('id', orderId).single();
                    if (ord?.user_id) recipientToken = await getTokenForUser(ord.user_id);
                } else {
                    recipientToken = await getMasterPushToken();
                }

                if (recipientToken) {
                    sendPushNotification(
                        recipientToken,
                        `💬 ${senderName}`,
                        content,
                        { orderId, screen: `/chat/${orderId}` }
                    );
                }
            } catch {
                // Falha na notificação não bloqueia o chat
            }
            // Dá foco de volta no input após enviar
            setTimeout(() => inputRef.current?.focus(), 100);
        }

        setSending(false);
    };

    const formatTime = (dateStr: string) =>
        new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const getStatusLabel = (status?: string) => {
        const map: Record<string, string> = {
            pending: 'Aguardando',
            preparing: 'Na Cozinha',
            delivering: 'Em Rota',
            delivered: 'Entregue',
            cancelled: 'Cancelado',
        };
        return status ? (map[status] || status) : '';
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
            className="flex-1 bg-gray-50 dark:bg-gray-900"
        >
            {/* ── Header ── */}
            <View className="bg-white dark:bg-gray-800 pt-14 pb-4 px-4 flex-row items-center border-b border-gray-100 dark:border-gray-700 shadow-sm">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2 mr-2 bg-gray-50 dark:bg-gray-900 rounded-full"
                >
                    <ArrowLeft size={22} color="#374151" />
                </TouchableOpacity>

                <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: accentColor + '20' }}
                >
                    <MessageCircle size={20} color={accentColor} />
                </View>

                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white text-base font-bold" numberOfLines={1}>
                        {user?.role === 'master'
                            ? (orderInfo?.client_name || 'Cliente')
                            : '🍴 Restaurante'}
                    </Text>
                    <Text className="text-xs text-gray-400">
                        {user?.role === 'master' && orderInfo?.client_phone ? `${orderInfo.client_phone} · ` : ''}
                        Pedido #{orderId?.slice(0, 6).toUpperCase()}
                        {orderInfo?.status ? ` · ${getStatusLabel(orderInfo.status)}` : ''}
                    </Text>
                </View>
            </View>

            {/* ── Lista de Mensagens ── */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 12, flexGrow: 1 }}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-24">
                            <View
                                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                                style={{ backgroundColor: accentColor + '15' }}
                            >
                                <MessageCircle size={32} color={accentColor} />
                            </View>
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-base mb-1">
                                Nenhuma mensagem ainda
                            </Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-sm text-center px-8">
                                Inicie a conversa abaixo!
                            </Text>
                        </View>
                    }
                    renderItem={({ item, index }) => {
                        const isOwn = item.sender_id === user?.id;
                        const isMasterMsg = item.sender_role === 'master';

                        // Verifica se deve mostrar separador de data
                        const prevMsg = messages[index - 1];
                        const showDate = !prevMsg ||
                            new Date(item.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                        return (
                            <View>
                                {showDate && (
                                    <View className="items-center my-3">
                                        <View className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full">
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                                {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit', month: 'long'
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View className={`mb-2 max-w-[82%] ${isOwn ? 'self-end' : 'self-start'}`}>
                                    {/* Rótulo do remetente (somente nas mensagens de outros) */}
                                    {!isOwn && (
                                        <Text
                                            className="text-xs font-bold mb-1 ml-1"
                                            style={{ color: isMasterMsg ? '#8B5CF6' : '#EF4444' }}
                                        >
                                            {isMasterMsg ? '🍴 Restaurante' : '👤 Cliente'}
                                        </Text>
                                    )}

                                    {/* Bolha da mensagem */}
                                    <View
                                        className={`px-4 py-3 shadow-sm ${
                                            isOwn
                                                ? `${isMasterMsg ? 'bg-violet-600' : 'bg-red-500'} rounded-2xl rounded-tr-sm`
                                                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm'
                                        }`}
                                    >
                                        <Text
                                            className={`text-sm leading-5 ${
                                                isOwn
                                                    ? 'text-white'
                                                    : 'text-gray-800 dark:text-white'
                                            }`}
                                        >
                                            {item.content}
                                        </Text>
                                    </View>

                                    {/* Horário */}
                                    <Text
                                        className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}
                                    >
                                        {formatTime(item.created_at)}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* ── Barra de Input ── */}
            <View className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-row items-end">
                <TextInput
                    ref={inputRef}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-white mr-3 max-h-28 text-sm"
                    placeholder="Digite uma mensagem..."
                    placeholderTextColor="#9ca3af"
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={500}
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!text.trim() || sending}
                    className={`p-3 rounded-full ${
                        text.trim()
                            ? accentBg
                            : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    style={{ opacity: !text.trim() ? 0.5 : 1 }}
                >
                    {sending
                        ? <ActivityIndicator size="small" color="white" />
                        : <Send size={18} color="white" />
                    }
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
