import { View, Text, Switch, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Settings, Lock, Store, Clock, Bell, CheckCircle2, LogOut } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAddressFromCep } from '../../lib/useAddressFromCep';

export default function MasterSettingsScreen() {
    const [storeOpen, setStoreOpen] = useState(true);
    const [autoAcceptance, setAutoAcceptance] = useState(false);
    const [storeName, setStoreName] = useState('Smart Delivery Menu');
    const [deliveryFee, setDeliveryFee] = useState('5.00');
    const [storeCep, setStoreCep] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [maxDeliveryDistance, setMaxDeliveryDistance] = useState('10');
    const [loading, setLoading] = useState(false);

    const { loadingCep, fetchAddressFromCep, formatCep } = useAddressFromCep();

    const { logout } = useAuthStore();
    const router = useRouter();

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('settings').select('*').single();
            if (data) {
                setStoreOpen(data.is_open);
                setAutoAcceptance(data.auto_acceptance);
                setStoreName(data.store_name);
                setDeliveryFee(data.delivery_fee.toString());
                setStoreCep(data.store_cep || '');
                setStoreAddress(data.store_address || '');
                setMaxDeliveryDistance(data.max_delivery_distance?.toString() || '10');
            }
        } catch (err: any) {
            console.log("Erro ao puxar settings:", err.message);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSettings();
        }, [])
    );

    const handleCepChange = async (text: string) => {
        const formatted = formatCep(text);
        setStoreCep(formatted);
        const raw = text.replace(/\D/g, '');
        await fetchAddressFromCep(raw, setStoreAddress);
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            // Verifica/insere (Upsert simplificado, assumindo id=1)
            const { error } = await supabase.from('settings').upsert({
                id: 1,
                is_open: storeOpen,
                auto_acceptance: autoAcceptance,
                store_name: storeName,
                delivery_fee: parseFloat(deliveryFee.replace(',', '.')),
                store_cep: storeCep.replace(/\D/g, ''),
                store_address: storeAddress,
                max_delivery_distance: parseInt(maxDeliveryDistance) || 10
            });

            if (error) throw error;
            Alert.alert("Sucesso", "Configurações atualizadas!");
        } catch (err: any) {
            Alert.alert("Erro ao salvar", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        // Alertas com múltiplos botões e callbacks costumam falhar silenciosamente no ambiente Web/Expo
        const { error } = await supabase.auth.signOut();
        if (error) {
            Alert.alert("Erro", error.message);
        } else {
            logout();
            router.replace('/(auth)/login');
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 pt-16 px-5" showsVerticalScrollIndicator={false}>
            <View className="mb-8">
                <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Configurações</Text>
                <Text className="text-gray-500 dark:text-gray-400">Ajustes operacionais da loja.</Text>
            </View>

            {/* STATUS DA LOJA */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
                <View className="flex-row items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <Store size={20} color="#8B5CF6" />
                    <Text className="font-bold text-gray-800 dark:text-white ml-2 text-lg">Status do Restaurante</Text>
                </View>

                <View className="flex-row items-center justify-between mb-2">
                    <View>
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Aceitar Pedidos</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs">Abre e fecha a loja para o cliente final.</Text>
                    </View>
                    <Switch
                        value={storeOpen}
                        onValueChange={setStoreOpen}
                        trackColor={{ false: "#d1d5db", true: "#8B5CF6" }}
                    />
                </View>

                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-900">
                    <View>
                        <Text className="font-bold text-gray-800 dark:text-white text-base">Aceite Automático</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs">Os pedidos entram com status "Preparando".</Text>
                    </View>
                    <Switch
                        value={autoAcceptance}
                        onValueChange={setAutoAcceptance}
                        trackColor={{ false: "#d1d5db", true: "#10B981" }}
                    />
                </View>
            </View>

            {/* AJUSTES GERAIS */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
                <View className="flex-row items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <Settings size={20} color="#6B7280" />
                    <Text className="font-bold text-gray-800 dark:text-white ml-2 text-lg">Ajustes Gerais</Text>
                </View>

                <Text className="font-bold text-gray-700 dark:text-white text-xs mb-1 uppercase tracking-wider">Nome do App / Loja</Text>
                <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white mb-4 font-medium"
                    value={storeName} onChangeText={setStoreName}
                />

                <Text className="font-bold text-gray-700 dark:text-white text-xs mb-1 uppercase tracking-wider">Taxa de Entrega Padrão (R$)</Text>
                <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white font-medium"
                    value={deliveryFee} keyboardType="numeric" onChangeText={setDeliveryFee}
                />
                <Text className="font-bold text-gray-700 dark:text-white text-xs mb-1 uppercase tracking-wider">
                    CEP Sede do Restaurante {loadingCep && <Text className="text-blue-500 capitalize text-[10px]">(Buscando...)</Text>}
                </Text>
                <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white mb-4 font-medium"
                    value={storeCep} keyboardType="numeric" maxLength={9} onChangeText={handleCepChange}
                    placeholder="00000-000"
                />

                <Text className="font-bold text-gray-700 dark:text-white text-xs mb-1 uppercase tracking-wider">Endereço do Restaurante (Rua, Número, Bairro)</Text>
                <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white mb-4 font-medium"
                    value={storeAddress} onChangeText={setStoreAddress}
                    placeholder="Ex: Rua das Flores, 123 - Centro"
                    multiline
                />

                <Text className="font-bold text-gray-700 dark:text-white text-xs mb-1 uppercase tracking-wider">Raio Máx. de Entrega (KM)</Text>
                <TextInput
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white font-medium"
                    value={maxDeliveryDistance} keyboardType="numeric" onChangeText={setMaxDeliveryDistance}
                />
            </View>

            <TouchableOpacity
                onPress={handleSaveSettings}
                disabled={loading}
                className={`rounded-2xl p-5 mb-8 flex-row items-center justify-center space-x-2 ${loading ? 'bg-red-300' : 'bg-red-500'}`}
            >
                <CheckCircle2 size={20} color="#fff" />
                <Text className="font-bold text-white text-lg">Salvar Configurações</Text>
            </TouchableOpacity>

            {/* CONTA (Fake link) */}
            <TouchableOpacity className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-8 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <View className="bg-gray-50 dark:bg-gray-900 p-2 rounded-full mr-3 border border-gray-100 dark:border-gray-800">
                        <Lock size={20} color="#4B5563" />
                    </View>
                    <View>
                        <Text className="font-bold text-gray-800 dark:text-white">Senha e Acesso</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs">Alterar senha do administrador</Text>
                    </View>
                </View>
                <CheckCircle2 size={20} color="#10B981" />
            </TouchableOpacity>

            {/* BOTÃO DE SAIR */}
            <TouchableOpacity
                onPress={handleLogout}
                className="bg-red-50 rounded-2xl border border-red-100 p-5 mt-2 mb-8 flex-row items-center justify-center space-x-2"
            >
                <LogOut size={20} color="#ef4444" />
                <Text className="font-bold text-red-500 text-lg">Sair do Modo Mestre</Text>
            </TouchableOpacity>

            <View className="h-10" />
        </ScrollView>
    );
}
