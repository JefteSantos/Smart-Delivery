import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { Minus, Plus, Trash2, CheckCircle, MapPin } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Truck, Store } from 'lucide-react-native';
import { getDistance } from 'geolib';
import { useAddressFromCep } from '../../lib/useAddressFromCep';
import { getMasterPushToken, sendPushNotification } from '../../lib/notifications';

export default function CartScreen() {
    const { items, addItem, removeItem, getTotalPrice, clearCart } = useCartStore();
    const { user } = useAuthStore();
    const router = useRouter();
    const { loadingCep, fetchAddressFromCep, formatCep } = useAddressFromCep();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [observation, setObservation] = useState('');
    const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
    const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
    const [clientCep, setClientCep] = useState(user?.cep || '');

    const [settings, setSettings] = useState<any>(null);

    // CORREÇÃO: Ref para evitar race condition de duplo clique no checkout
    const isSubmitting = useRef(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('settings').select('*').single();
            if (data) setSettings(data);
        };
        fetchSettings();
    }, []);

    const handleCepChange = async (text: string) => {
        const formatted = formatCep(text);
        setClientCep(formatted);
        const raw = text.replace(/\D/g, '');
        await fetchAddressFromCep(raw, setDeliveryAddress);
    };

    const total = getTotalPrice();
    const deliveryFee = deliveryMode === 'delivery' ? (settings?.delivery_fee || 5.00) : 0.00;
    const finalTotal = total + deliveryFee;

    // Busca Latitude e Longitude do ViaCEP para cálculo via Nominatim (OpenStreetMap)
    const getCoordinatesFromCep = async (cepStr: string) => {
        try {
            const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepStr}/json/`);
            const viaCepData = await viaCepRes.json();
            if (viaCepData.erro) return null;

            const addressQuery = `${viaCepData.logradouro}, ${viaCepData.localidade}, ${viaCepData.uf}, Brazil`;
            const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
            const nomData = await nomRes.json();

            if (nomData && nomData.length > 0) {
                return {
                    latitude: parseFloat(nomData[0].lat),
                    longitude: parseFloat(nomData[0].lon)
                };
            }
            return null;
        } catch {
            return null;
        }
    };

    const handleCheckout = async () => {
        // CORREÇÃO: Guarda contra race condition de duplo clique
        if (isSubmitting.current) return;

        if (!user) {
            Alert.alert("Erro", "Você precisa estar logado para fazer um pedido.");
            router.push('/(auth)/login');
            return;
        }

        if (items.length === 0) return;

        if (deliveryMode === 'delivery' && deliveryAddress.trim().length < 5) {
            Alert.alert("Endereço Incompleto", "Por favor, digite seu endereço completo (Rua, Número, Bairro).");
            return;
        }

        // CORREÇÃO: Verificar se a loja está aberta antes de processar o pedido
        if (settings && !settings.is_open) {
            Alert.alert(
                "Loja Fechada",
                "O restaurante não está aceitando pedidos no momento. Tente novamente mais tarde."
            );
            return;
        }

        isSubmitting.current = true;
        setLoading(true);

        if (deliveryMode === 'delivery' && settings?.store_cep && clientCep) {
            try {
                const storeCoords = await getCoordinatesFromCep(settings.store_cep.replace(/\D/g, ''));
                const clientCoords = await getCoordinatesFromCep(clientCep.replace(/\D/g, ''));

                if (storeCoords && clientCoords) {
                    // CORREÇÃO: getDistance agora vem do import estático no topo
                    const distanceMeters = getDistance(storeCoords, clientCoords);
                    const distanceKm = distanceMeters / 1000;

                    const maxDist = settings.max_delivery_distance || 10;
                    if (distanceKm > maxDist) {
                        setLoading(false);
                        isSubmitting.current = false;
                        Alert.alert(
                            "Fora da Área de Entrega",
                            `Você está a ${distanceKm.toFixed(1)}km de nós. O limite de entrega do restaurante no momento é de ${maxDist}km.\n\nPor favor, escolha a opção Retirar no Local.`
                        );
                        return;
                    }
                }
            } catch {
                // Falha silenciosa ao calcular distância — não bloqueia o pedido
            }
        }

        try {
            // 1. Cria o Pedido (Order) Master
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    client_name: user.name || 'Cliente Sem Nome',
                    total_price: finalTotal,
                    items_count: items.reduce((acc, item) => acc + item.quantity, 0),
                    delivery_fee: deliveryFee,
                    status: settings?.auto_acceptance ? 'preparing' : 'pending',
                    observation: observation.trim() || null,
                    delivery_mode: deliveryMode,
                    delivery_address: deliveryMode === 'delivery' ? deliveryAddress.trim() : null
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            const orderId = orderData.id;

            // 2. Prepara os itens do carrinho para o BD
            const orderItemsPayload = items.map(item => ({
                order_id: orderId,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                total_price: item.price * item.quantity
            }));

            // 3. Insere os Itens vinculados àquele Order Master
            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsPayload);

            if (itemsError) throw itemsError;

            // 4. Sucesso total! Notifica o restaurante
            const masterToken = await getMasterPushToken();
            if (masterToken) {
                const modeLabel = deliveryMode === 'delivery' ? 'Entrega' : 'Retirada';
                sendPushNotification(
                    masterToken,
                    '🛎️ Novo Pedido Recebido!',
                    `${user.name || 'Cliente'} fez um pedido · R$ ${finalTotal.toFixed(2).replace('.', ',')} · ${modeLabel}`,
                    { screen: '/(master)/orders' }
                );
            }
            setSuccess(true);
            setObservation('');
            setTimeout(() => {
                clearCart();
                setSuccess(false);
                router.push('/(client)/my-orders');
            }, 2500);

        } catch (error: any) {
            Alert.alert("Erro no Pedido", "Não foi possível finalizar seu pedido. " + error.message);
        } finally {
            setLoading(false);
            isSubmitting.current = false;
        }
    };

    if (success) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 pt-12 px-5">
                <View className="bg-emerald-100 p-6 rounded-full mb-6">
                    <CheckCircle size={64} color="#10B981" />
                </View>
                <Text className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2 text-center">
                    Pedido Confirmado!
                </Text>
                <Text className="text-gray-500 dark:text-gray-400 text-center text-base px-6">
                    O restaurante já recebeu seu pedido e em breve ele será enviado.
                </Text>
            </View>
        );
    }

    if (items.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 pt-12 px-5">
                <Text className="text-xl font-bold text-gray-400 dark:text-gray-400 mb-2">
                    Carrinho vazio
                </Text>
                <Text className="text-gray-400 dark:text-gray-400 text-center">
                    Adicione pratos no cardápio para começar seu pedido.
                </Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-gray-50 dark:bg-gray-900"
        >
            <ScrollView 
                className="flex-1 pt-12" 
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-5 mb-4 flex-row justify-between items-center">
                    <Text className="text-2xl font-extrabold text-gray-800 dark:text-white">Seu Pedido</Text>
                    <TouchableOpacity onPress={clearCart}>
                        <Text className="text-red-500 font-bold">Limpar</Text>
                    </TouchableOpacity>
                </View>

                <View className="px-5 flex-1">
                    {items.map(item => (
                        <View key={item.id} className="flex-row items-center bg-white dark:bg-gray-800 p-3 rounded-xl mb-3 shadow-sm border border-gray-100 dark:border-gray-800">
                            <Image
                                source={
                                    item.imageUrl
                                        ? { uri: item.imageUrl }
                                        : require('../../assets/images/placeholder-meal.webp')
                                }
                                className="rounded-lg bg-gray-200 dark:bg-gray-700"
                                style={{ width: 64, height: 64 }}
                                resizeMode="cover"
                            />
                            <View className="flex-1 ml-3">
                                <Text className="font-bold text-gray-800 dark:text-white" numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text className="text-red-600 font-medium mt-1">
                                    R$ {item.price.toFixed(2).replace('.', ',')}
                                </Text>
                            </View>

                            <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
                                <TouchableOpacity
                                    onPress={() => removeItem(item.id)}
                                    className="p-1"
                                >
                                    {item.quantity === 1 ? (
                                        <Trash2 size={16} color="#666" />
                                    ) : (
                                        <Minus size={16} color="#666" />
                                    )}
                                </TouchableOpacity>
                                <Text className="mx-3 font-bold">{item.quantity}</Text>
                                <TouchableOpacity onPress={() => addItem(item)} className="p-1">
                                    <Plus size={16} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                <View className="bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 rounded-t-3xl shadow-lg mt-4">
                    <View className="flex-row space-x-2 mb-4">
                        <TouchableOpacity
                            className={`flex-1 py-3 items-center rounded-xl flex-row justify-center border ${deliveryMode === 'delivery' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}
                            onPress={() => setDeliveryMode('delivery')}
                        >
                            <Truck size={16} color={deliveryMode === 'delivery' ? '#3B82F6' : '#9CA3AF'} />
                            <Text className={`font-bold ml-2 ${deliveryMode === 'delivery' ? 'text-blue-600' : 'text-gray-400 dark:text-gray-400'}`}>Entrega</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`flex-1 py-3 mx-2 items-center rounded-xl flex-row justify-center border ${deliveryMode === 'pickup' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}
                            onPress={() => setDeliveryMode('pickup')}
                        >
                            <Store size={16} color={deliveryMode === 'pickup' ? '#F97316' : '#9CA3AF'} />
                            <Text className={`font-bold ml-2 ${deliveryMode === 'pickup' ? 'text-orange-600' : 'text-gray-400 dark:text-gray-400'}`}>Retirar</Text>
                        </TouchableOpacity>
                    </View>

                    {deliveryMode === 'delivery' && (
                        <View className="mb-4">
                            <View className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-2 border border-blue-200 mb-2">
                                <Text className="text-blue-600 font-bold mb-1 ml-1 text-xs uppercase tracking-widest flex-row items-center">
                                    <MapPin size={12} color="#3B82F6" /> CEP de Entrega {loadingCep && <ActivityIndicator size="small" color="#3B82F6" className="ml-2" />}
                                </Text>
                                <TextInput
                                    placeholder="00000-000"
                                    placeholderTextColor="#9ca3af"
                                    value={clientCep}
                                    keyboardType="numeric"
                                    maxLength={9}
                                    onChangeText={handleCepChange}
                                    className="text-gray-800 dark:text-white pb-2"
                                />
                            </View>
                            <View className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-2 border border-blue-200">
                                <Text className="text-blue-600 font-bold mb-1 ml-1 text-xs uppercase tracking-widest">Endereço (Rua, Número, Bairro)</Text>
                                <TextInput
                                    placeholder="Ex: Rua das Flores, 123 - Centro"
                                    placeholderTextColor="#9ca3af"
                                    value={deliveryAddress}
                                    onChangeText={setDeliveryAddress}
                                    className="text-gray-800 dark:text-white pb-2"
                                    multiline
                                />
                            </View>
                        </View>
                    )}

                    <View className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-700">
                        <Text className="text-gray-500 dark:text-gray-400 font-bold mb-1 ml-1 text-xs">Observações do pedido</Text>
                        <TextInput
                            placeholder="Ex: Sem cebola, troco pra 50..."
                            placeholderTextColor="#9ca3af"
                            value={observation}
                            onChangeText={setObservation}
                            className="text-gray-800 dark:text-white pb-2"
                            multiline
                        />
                    </View>

                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-400 dark:text-gray-400 font-medium">Subtotal</Text>
                        <Text className="text-gray-600 dark:text-white font-medium">R$ {total.toFixed(2).replace('.', ',')}</Text>
                    </View>
                    <View className="flex-row justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <Text className="text-gray-400 dark:text-gray-400 font-medium">Taxa de Entrega</Text>
                        <Text className="text-gray-600 dark:text-white font-medium">R$ {deliveryFee.toFixed(2).replace('.', ',')}</Text>
                    </View>

                    <View className="flex-row justify-between mb-6">
                        <Text className="text-gray-800 dark:text-white font-bold text-lg">Total do Pedido</Text>
                        <Text className="text-2xl font-extrabold text-red-500">
                            R$ {finalTotal.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>

                    <TouchableOpacity
                        className={`py-4 rounded-xl items-center flex-row justify-center shadow-md ${loading ? 'bg-red-400 shadow-red-400/30' : 'bg-red-500 shadow-red-500/30'}`}
                        disabled={loading}
                        onPress={handleCheckout}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Confirmar Pedido</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
